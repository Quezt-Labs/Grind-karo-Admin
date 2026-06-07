export interface CoachRevenueOverview {
  totalEarnings: number;
  earningsThisMonth: number;
  earningsLastMonth: number;
  earningsChangePercent: number;
  grossCoachingRevenue: number;
  coachingSalesCount: number;
  assignedAthletesCount: number;
}

export interface CoachMonthlyEarningsPoint {
  month: string;
  label: string;
  earnings: number;
  salesCount: number;
}

export interface CoachAthleteEarnings {
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  grossCoachingRevenue: number;
  coachEarnings: number;
  coachingSalesCount: number;
}

export interface CoachRecentCoachingSale {
  id: string;
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  planName: string;
  grossAmount: number;
  coachEarnings: number;
  paidAt: string;
}

export interface CoachRevenueOverviewResponse {
  sharePercent: number;
  overview: CoachRevenueOverview;
  monthlyEarnings: CoachMonthlyEarningsPoint[];
  earningsByAthlete: CoachAthleteEarnings[];
  recentCoachingSales: CoachRecentCoachingSale[];
}
