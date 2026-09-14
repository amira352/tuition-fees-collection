import { fetchDashboardSummary } from "../repositories/dashboard.repository.js";

/**
 * Which institution's numbers this caller is allowed to see.
 *
 * An institution only ever sees its own, taken from their token - anything
 * they send on the query string is ignored. Back office and admin see the
 * whole bank unless they ask for one institution.
 *
 * Exported so it can be unit tested without a database, the same way
 * resolveInstitutionId is in the payment history controller.
 */
export const resolveScope = (user, requestedInstitutionId) => {
  if (user.role === "institution") {
    return user.userId;
  }

  return requestedInstitutionId || null;
};

const percentChange = (today, yesterday) => {
  const t = Number(today);
  const y = Number(yesterday);

  // no baseline to compare against, so there is no honest percentage
  if (!y) {
    return null;
  }

  return Math.round(((t - y) / y) * 1000) / 10;
};

export const getDashboard = async (user, requestedInstitutionId) => {
  const summary = await fetchDashboardSummary({
    employeeId: user.userId,
    institutionId: resolveScope(user, requestedInstitutionId),
    timezone: process.env.REPORT_TIMEZONE || "Africa/Cairo"
  });

  return {
    collected_today: summary.collected_today,
    collected_yesterday: summary.collected_yesterday,
    // null when yesterday was zero - the frontend should hide the comparison
    // rather than print "+Infinity%"
    change_vs_yesterday_percent: percentChange(
      summary.collected_today,
      summary.collected_yesterday
    ),
    currency: summary.currency,

    transactions_by_you: summary.transactions_by_you,
    pending_epp_plans: summary.pending_epp_plans,
    awaiting_reconciliation: summary.awaiting_reconciliation,

    failed_today: summary.failed_today,
    last_failure_at: summary.last_failure_at,

    day_started_at: summary.day_started_at,
    timezone: summary.timezone
  };
};
