import { Paise } from '@/domain/money/paise';

export type VelocityPace = 'optimal' | 'normal' | 'accelerated' | 'critical';

export interface SpendingVelocityTelemetry {
  daysElapsed: number;
  daysRemaining: number;
  totalCycleDays: number;
  cycleProgressPercent: number;
  dailyBurnRatePaise: Paise;
  dailySafeTargetPaise: Paise;
  pace: VelocityPace;
  projectedMonthEndSurplusPaise: Paise;
  isProjectedDeficit: boolean;
  runwayDaysLeft: number;
}

/**
 * Calculates real-time telemetry on spending burn rate, daily safe pace,
 * and month-end projected surplus/deficit based on the active salary cycle.
 */
export function calculateSpendingVelocity(params: {
  cycleStart: Date | string;
  cycleEnd: Date | string;
  spentPaise: Paise;
  availablePaise: Paise;
  now?: Date;
}): SpendingVelocityTelemetry {
  const now = params.now ?? new Date();
  const start = params.cycleStart instanceof Date ? params.cycleStart : new Date(params.cycleStart);
  const end = params.cycleEnd instanceof Date ? params.cycleEnd : new Date(params.cycleEnd);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const totalCycleDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
  const daysElapsed = Math.min(
    totalCycleDays,
    Math.max(1, Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY) + 1)
  );
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY));
  const cycleProgressPercent = Math.min(100, Math.round((daysElapsed / totalCycleDays) * 100));

  // Daily average burn rate so far in this cycle
  const dailyBurnRatePaise = Math.round(params.spentPaise / daysElapsed);

  // Daily budget allowable to finish the cycle with balance intact
  const dailySafeTargetPaise =
    daysRemaining > 0 ? Math.round(params.availablePaise / daysRemaining) : params.availablePaise;

  // Projected balance on salary day at current burn rate
  const projectedSpendRemainder = dailyBurnRatePaise * daysRemaining;
  const projectedBalanceAtEnd = params.availablePaise - projectedSpendRemainder;
  const isProjectedDeficit = projectedBalanceAtEnd < 0;
  const projectedMonthEndSurplusPaise = Math.abs(projectedBalanceAtEnd);

  // Runway: how many days before balance reaches ₹0 at current burn rate
  const runwayDaysLeft =
    dailyBurnRatePaise > 0
      ? Math.max(0, Math.floor(params.availablePaise / dailyBurnRatePaise))
      : 999;

  // Pace assessment
  let pace: VelocityPace = 'normal';
  if (params.availablePaise <= 0 || (dailyBurnRatePaise > 0 && runwayDaysLeft < daysRemaining)) {
    pace = 'critical';
  } else if (dailySafeTargetPaise > 0 && dailyBurnRatePaise > dailySafeTargetPaise * 1.2) {
    pace = 'accelerated';
  } else if (dailySafeTargetPaise > 0 && dailyBurnRatePaise <= dailySafeTargetPaise * 0.8) {
    pace = 'optimal';
  } else {
    pace = 'normal';
  }

  return {
    daysElapsed,
    daysRemaining,
    totalCycleDays,
    cycleProgressPercent,
    dailyBurnRatePaise,
    dailySafeTargetPaise: Math.max(0, dailySafeTargetPaise),
    pace,
    projectedMonthEndSurplusPaise,
    isProjectedDeficit,
    runwayDaysLeft,
  };
}
