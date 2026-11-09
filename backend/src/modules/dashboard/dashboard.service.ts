import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class DashboardService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 15 * 1000; // 15 seconds cache

  constructor(private readonly prisma: PrismaService) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  async getBusinessDashboard(
    businessId: string,
    branchId?: string,
    isAllBranchAdmin = false,
    canViewProfit = false,
  ) {
    const effectiveBranchId =
      typeof branchId === 'string'
        ? branchId
        : (branchId as any)?.branchId || undefined;

    const cacheKey = `dash:${businessId}:${isAllBranchAdmin ? 'all' : effectiveBranchId}:${canViewProfit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const baseWhereSale: any = {
      business_id: businessId,
      status: { not: 'VOIDED' },
    };
    if (!isAllBranchAdmin && effectiveBranchId) {
      baseWhereSale.branch_id = effectiveBranchId;
    }

    // 1. Sales aggregates (Today, Week, Month, All-Time)
    const [salesToday, salesWeek, salesMonth, salesTotal] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { ...baseWhereSale, sale_date: { gte: startOfToday } },
        _sum: { total_amount: true, total_cost: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { ...baseWhereSale, sale_date: { gte: startOfWeek } },
        _sum: { total_amount: true, total_cost: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { ...baseWhereSale, sale_date: { gte: startOfMonth } },
        _sum: { total_amount: true, total_cost: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: baseWhereSale,
        _sum: { total_amount: true, total_cost: true },
        _count: { id: true },
      }),
    ]);

    // 2. Expenses today, this week, this month
    const baseWhereExpense: any = { business_id: businessId };
    if (!isAllBranchAdmin && effectiveBranchId) {
      baseWhereExpense.branch_id = effectiveBranchId;
    }

    const [expToday, expWeek, expMonth] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { ...baseWhereExpense, expense_date: { gte: startOfToday } },
        _sum: { total_amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...baseWhereExpense, expense_date: { gte: startOfWeek } },
        _sum: { total_amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...baseWhereExpense, expense_date: { gte: startOfMonth } },
        _sum: { total_amount: true },
      }),
    ]);

    // 3. Receivables & Payables & Customer Counts
    const [receivables, payables, totalCustomers] = await Promise.all([
      this.prisma.customer.aggregate({
        where: { business_id: businessId, deleted_at: null },
        _sum: { current_due: true },
      }),
      this.prisma.supplier.aggregate({
        where: { business_id: businessId, deleted_at: null },
        _sum: { current_balance: true },
      }),
      this.prisma.customer.count({
        where: { business_id: businessId, deleted_at: null },
      }),
    ]);

    // 4. Stock value & low stock count (fixed relation name: variant)
    const stockWhere: any = { business_id: businessId };
    if (!isAllBranchAdmin && effectiveBranchId) {
      stockWhere.branch_id = effectiveBranchId;
    }

    const [stockVal, lowStockItems, totalStockRows, inStockItems, outOfStockItems, totalProducts] =
      await Promise.all([
        this.prisma.stockBalance.aggregate({
          where: stockWhere,
          _sum: { total_cost_value: true },
        }),
        this.prisma.stockBalance.count({
          where: {
            ...stockWhere,
            variant: {
              reorder_level: { gt: 0 },
            },
            quantity: { lte: 5 },
          },
        }),
        this.prisma.stockBalance.count({
          where: stockWhere,
        }),
        this.prisma.stockBalance.count({
          where: {
            ...stockWhere,
            quantity: { gt: 5 },
          },
        }),
        this.prisma.stockBalance.count({
          where: {
            ...stockWhere,
            quantity: { lte: 0 },
          },
        }),
        this.prisma.product.count({
          where: { business_id: businessId, deleted_at: null },
        }),
      ]);

    // 5. 30-Day daily sales trend from live Sale records
    const recentSales = await this.prisma.sale.findMany({
      where: { ...baseWhereSale, sale_date: { gte: thirtyDaysAgo } },
      select: { sale_date: true, total_amount: true },
      orderBy: { sale_date: 'asc' },
    });

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const s of recentSales) {
      const dateKey = s.sale_date.toISOString().slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + Number(s.total_amount));
    }
    const salesTrend = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));

    // 6. Top selling products with real names, SKUs, category and stock
    const topSaleItems = await this.prisma.saleItem.groupBy({
      by: ['product_variant_id'],
      where: { sale: baseWhereSale },
      _sum: { quantity: true, total_amount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 6,
    });

    const topVariantIds = topSaleItems.map((ti) => ti.product_variant_id);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: topVariantIds } },
      include: {
        product: {
          include: { category: true },
        },
        stock_balances: {
          where: stockWhere,
        },
      },
    });

    const topProducts = topSaleItems.map((ti) => {
      const v = variants.find((v) => v.id === ti.product_variant_id);
      const totalQty = (v?.stock_balances || []).reduce(
        (acc, sb) => acc + Number(sb.quantity || 0),
        0,
      );
      const stockStatus =
        totalQty <= 0 ? 'Out of Stock' : totalQty <= 5 ? 'Low Stock' : 'In Stock';

      return {
        variantId: ti.product_variant_id,
        sku: v?.sku || '',
        productName: v?.product.name || 'Unnamed Product',
        category: v?.product.category?.name || 'Retail',
        quantitySold: Number(ti._sum.quantity || 0),
        revenue: Number(ti._sum.total_amount || 0),
        currentStock: totalQty,
        status: stockStatus,
      };
    });

    // 7. Monthly Performance 12-Month Curve (Current Year Jan..Dec from real sales)
    const yearlySales = await this.prisma.sale.findMany({
      where: { ...baseWhereSale, sale_date: { gte: startOfYear } },
      select: { sale_date: true, total_amount: true, total_cost: true },
    });

    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sept',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthlyPerformance = monthLabels.map((monthName, mIdx) => {
      const salesInMonth = yearlySales.filter((s) => s.sale_date.getMonth() === mIdx);
      const rev = salesInMonth.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
      const cost = salesInMonth.reduce((acc, s) => acc + Number(s.total_cost || 0), 0);
      const orders = salesInMonth.length;
      return {
        month: monthName,
        sales: rev,
        revenue: rev,
        profit: rev - cost,
        orders,
      };
    });

    // 8. Sales Distribution by Category from live sales
    const categories = await this.prisma.category.findMany({
      where: { business_id: businessId, deleted_at: null },
      select: { id: true, name: true },
      take: 6,
    });

    const categoryDistribution = await Promise.all(
      categories.map(async (cat) => {
        const catSales = await this.prisma.saleItem.aggregate({
          where: {
            sale: baseWhereSale,
            variant: {
              product: { category_id: cat.id },
            },
          },
          _sum: { quantity: true, total_amount: true },
        });
        return {
          name: cat.name,
          sales: Number(catSales._sum.quantity || 0),
          revenue: Number(catSales._sum.total_amount || 0),
        };
      }),
    );

    // 9. Payment Channels breakdown from live sale_payments
    const paymentRows = await this.prisma.salePayment.groupBy({
      by: ['payment_method'],
      where: {
        business_id: businessId,
        ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
      },
      _sum: { amount: true },
    });

    const paymentChannels = paymentRows.map((p) => ({
      label: p.payment_method,
      amount: Number(p._sum.amount || 0),
    }));

    // 10. Orders overview breakdown
    const [completedCount, refundedCount] = await Promise.all([
      this.prisma.sale.count({
        where: { ...baseWhereSale, status: 'COMPLETED' },
      }),
      this.prisma.salesReturn.count({
        where: {
          business_id: businessId,
          ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
        },
      }),
    ]);

    // 11. Per branch comparison (for all-branch admin)
    let branchComparison: any[] = [];
    if (isAllBranchAdmin) {
      const branches = await this.prisma.branch.findMany({
        where: { business_id: businessId, deleted_at: null },
      });
      for (const b of branches) {
        const bSales = await this.prisma.sale.aggregate({
          where: {
            business_id: businessId,
            branch_id: b.id,
            status: { not: 'VOIDED' },
            sale_date: { gte: startOfMonth },
          },
          _sum: { total_amount: true },
        });
        branchComparison.push({
          branchId: b.id,
          branchName: b.name,
          monthRevenue: bSales._sum.total_amount ? Number(bSales._sum.total_amount) : 0,
        });
      }
    }

    const todayRev = Number(salesToday._sum.total_amount || 0);
    const weekRev = Number(salesWeek._sum.total_amount || 0);
    const monthRev = Number(salesMonth._sum.total_amount || 0);
    const allTimeRev = Number(salesTotal._sum.total_amount || 0);

    const todayCost = Number(salesToday._sum.total_cost || 0);
    const weekCost = Number(salesWeek._sum.total_cost || 0);
    const monthCost = Number(salesMonth._sum.total_cost || 0);
    const allTimeCost = Number(salesTotal._sum.total_cost || 0);

    const todayExp = Number(expToday._sum.total_amount || 0);
    const weekExp = Number(expWeek._sum.total_amount || 0);
    const monthExp = Number(expMonth._sum.total_amount || 0);

    const result: any = {
      sales: {
        today: { revenue: todayRev, count: salesToday._count.id },
        thisWeek: { revenue: weekRev, count: salesWeek._count.id },
        thisMonth: { revenue: monthRev, count: salesMonth._count.id },
        allTime: { revenue: allTimeRev, count: salesTotal._count.id },
      },
      expenses: {
        today: todayExp,
        thisWeek: weekExp,
        thisMonth: monthExp,
      },
      receivables: Number(receivables._sum.current_due || 0),
      payables: Number(payables._sum.current_balance || 0),
      stockValue: Number(stockVal._sum.total_cost_value || 0),
      lowStockCount: lowStockItems,
      totalProducts,
      totalCustomers,
      totalOrders: salesTotal._count.id,
      stockOverview: {
        total: totalStockRows,
        inStock: inStockItems,
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
      },
      ordersOverview: {
        total: salesTotal._count.id,
        completed: completedCount,
        refunded: refundedCount,
      },
      paymentChannels,
      monthlyPerformance,
      categoryDistribution,
      topProducts,
      salesTrend,
      branchComparison,
    };

    // Include cost and profit only if permission allows
    if (canViewProfit) {
      result.profit = {
        today: { gross: todayRev - todayCost, net: todayRev - todayCost - todayExp },
        thisWeek: { gross: weekRev - weekCost, net: weekRev - weekCost - weekExp },
        thisMonth: { gross: monthRev - monthCost, net: monthRev - monthCost - monthExp },
        allTime: { gross: allTimeRev - allTimeCost, net: allTimeRev - allTimeCost },
      };
      result.cogs = {
        today: todayCost,
        thisWeek: weekCost,
        thisMonth: monthCost,
        allTime: allTimeCost,
      };
    }

    this.setCached(cacheKey, result);
    return result;
  }

  async getCashierDashboard(businessId: string, branchId: string | undefined, userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const effectiveBranchId =
      typeof branchId === 'string'
        ? branchId
        : (branchId as any)?.branchId || undefined;

    const sessionWhere: any = {
      business_id: businessId,
      user_id: userId,
      status: 'OPEN',
    };
    if (effectiveBranchId) {
      sessionWhere.branch_id = effectiveBranchId;
    }

    const salesWhere: any = {
      business_id: businessId,
      created_by: userId,
      sale_date: { gte: startOfToday },
      status: { not: 'VOIDED' },
    };
    if (effectiveBranchId) {
      salesWhere.branch_id = effectiveBranchId;
    }

    const [activeSession, todaySales] = await Promise.all([
      this.prisma.registerSession.findFirst({
        where: sessionWhere,
        include: { cash_register: true },
      }),
      this.prisma.sale.aggregate({
        where: salesWhere,
        _sum: { total_amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      activeSession: activeSession
        ? {
            id: activeSession.id,
            registerName: activeSession.cash_register.name,
            openedAt: activeSession.opened_at,
            openingBalance: activeSession.opening_balance,
          }
        : null,
      today: {
        salesCount: todaySales._count.id,
        salesAmount: todaySales._sum.total_amount ? Number(todaySales._sum.total_amount) : 0,
      },
    };
  }

  async getAuditLogs(
    businessId: string,
    branchId?: string,
    isOwner?: boolean,
    query: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: any;
      entityTable?: string;
    } = {},
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const effectiveBranchId =
      typeof branchId === 'string'
        ? branchId
        : (branchId as any)?.branchId || undefined;

    const where: any = { business_id: businessId };
    if (!isOwner && effectiveBranchId) {
      where.branch_id = effectiveBranchId;
    }
    if (query.userId) where.user_id = query.userId;
    if (query.action) where.action = query.action;
    if (query.entityTable) where.entity_table = query.entityTable;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
