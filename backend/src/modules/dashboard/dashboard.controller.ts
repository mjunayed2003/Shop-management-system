import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { CurrentBranch } from '../../common/decorators/current-branch.decorator.js';
import type { BranchContext } from '../../common/decorators/current-branch.decorator.js';
import { DashboardService } from './dashboard.service.js';

@Controller('api/v1/dashboards')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('business')
  async getBusinessDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBranch() branchContext: BranchContext | undefined,
    @Query('branchId') queryBranchId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('year') year: string | undefined,
    @Query('period') period: string | undefined,
    @Query('productTimeframe') productTimeframe: string | undefined,
    @Query('categoryTimeframe') categoryTimeframe: string | undefined,
    @Query('ordersTimeframe') ordersTimeframe: string | undefined,
    @Query('paymentsTimeframe') paymentsTimeframe: string | undefined,
    @Req() req: any,
  ) {
    const branchId =
      queryBranchId ||
      (typeof branchContext === 'string'
        ? branchContext
        : branchContext?.branchId || (req.headers?.['x-branch-id'] as string) || undefined);
    const isAllBranchAdmin = user.isOwner || branchContext?.isAllBranchAdmin || req.branchContext?.isAllBranchAdmin;
    const permissions = user.isOwner ? ['*'] : req.userPermissions || [];
    const canViewProfit =
      user.isOwner ||
      permissions.includes('*') ||
      permissions.includes('report.view_profit') ||
      permissions.includes('report.view');

    return this.dashboardService.getBusinessDashboard(
      user.businessId,
      branchId,
      Boolean(isAllBranchAdmin),
      Boolean(canViewProfit),
      startDate,
      endDate,
      year ? parseInt(year, 10) : undefined,
      period,
      productTimeframe,
      categoryTimeframe,
      ordersTimeframe,
      paymentsTimeframe,
    );
  }

  @Get('cashier')
  async getCashierDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBranch() branchContext: BranchContext | undefined,
    @Req() req: any,
  ) {
    const branchId =
      typeof branchContext === 'string'
        ? branchContext
        : branchContext?.branchId || (req.headers?.['x-branch-id'] as string) || undefined;
    return this.dashboardService.getCashierDashboard(
      user.businessId,
      branchId,
      user.id,
    );
  }
}
