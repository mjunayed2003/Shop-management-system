import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PlatformInvoiceStatus, SyncStatus } from '../../../generated/prisma/client.js';

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformMetrics() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      businessesByStatus,
      subscriptionsByStatus,
      trialsExpiringSoon,
      overdueInvoices,
      revenueCollected,
      smsVolume,
      syncErrors,
      totalUsers,
      activeSessions,
      totalAuditLogs,
      recentAuditLogs,
      recentSessions,
    ] = await Promise.all([
      this.prisma.business.groupBy({
        by: ['status'],
        where: { deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'TRIAL',
          trial_ends_at: { lte: sevenDaysFromNow, gte: now },
        },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: PlatformInvoiceStatus.OVERDUE },
        _count: { id: true },
        _sum: { net_amount: true },
      }),
      this.prisma.platformPayment.aggregate({
        where: { status: PlatformInvoiceStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.smsLog.count(),
      this.prisma.syncQueue.count({
        where: { status: { in: [SyncStatus.CONFLICT, SyncStatus.FAILED] } },
      }),
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.userSession.count({
        where: { is_revoked: false, expires_at: { gt: now } },
      }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        where: { created_at: { gte: sevenDaysAgo } },
        select: { created_at: true, user_id: true },
      }),
      this.prisma.userSession.findMany({
        where: { created_at: { gte: sevenDaysAgo } },
        select: { created_at: true, user_id: true },
      }),
    ]);

    // Compute actual 7-day frequency trends strictly from server database records
    const frequencyTrends = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - (6 - i));
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const logsOnDay = recentAuditLogs.filter(
        (l) => l.created_at >= dayStart && l.created_at <= dayEnd,
      );
      const sessionsOnDay = recentSessions.filter(
        (s) => s.created_at >= dayStart && s.created_at <= dayEnd,
      );

      const uniqueUserIds = new Set<string>();
      logsOnDay.forEach((l) => l.user_id && uniqueUserIds.add(l.user_id));
      sessionsOnDay.forEach((s) => s.user_id && uniqueUserIds.add(s.user_id));

      const dayLabel = dayStart.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const shortDay = dayStart.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        date: dayLabel,
        shortDay,
        views: logsOnDay.length,
        users: uniqueUserIds.size,
        frequency: logsOnDay.length + sessionsOnDay.length,
      };
    });

    // Compute actual 24-hour frequency trends (2-hour buckets) strictly from server database records
    const hourlyTrends = Array.from({ length: 12 }, (_, i) => {
      const bucketStart = new Date(now.getTime() - (12 - i) * 2 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 2 * 60 * 60 * 1000);

      const logsInBucket = recentAuditLogs.filter(
        (l) => l.created_at >= bucketStart && l.created_at < bucketEnd,
      );
      const sessionsInBucket = recentSessions.filter(
        (s) => s.created_at >= bucketStart && s.created_at < bucketEnd,
      );

      const uniqueUsers = new Set<string>();
      logsInBucket.forEach((l) => l.user_id && uniqueUsers.add(l.user_id));
      sessionsInBucket.forEach((s) => s.user_id && uniqueUsers.add(s.user_id));

      const hourStr = bucketStart.getHours().toString().padStart(2, '0') + ':00';

      return {
        time: hourStr,
        views: logsInBucket.length,
        users: uniqueUsers.size,
        frequency: logsInBucket.length + sessionsInBucket.length,
      };
    });

    // Total actual views across the system
    const totalViews = totalAuditLogs + activeSessions;

    return {
      businesses: businessesByStatus.reduce((acc, b) => ({ ...acc, [b.status]: b._count.id }), {}),
      subscriptions: subscriptionsByStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
      trialsExpiringSoon,
      overdue: {
        count: overdueInvoices._count.id,
        amount: overdueInvoices._sum.net_amount ? Number(overdueInvoices._sum.net_amount) : 0,
      },
      revenueCollected: revenueCollected._sum.amount ? Number(revenueCollected._sum.amount) : 0,
      smsVolume,
      syncErrors,
      totalUsers,
      activeSessions,
      totalViews,
      frequencyTrends,
      hourlyTrends,
    };
  }

  async getGlobalAuditLogs(query: {
    page?: number;
    limit?: number;
    businessId?: string;
    action?: string;
    entityTable?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.businessId) where.business_id = query.businessId;
    if (query.action) where.action = query.action;
    if (query.entityTable) where.entity_table = query.entityTable;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, first_name: true, last_name: true, email: true } },
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
