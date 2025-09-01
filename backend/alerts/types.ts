export interface CrisisAlert {
  id: number;
  campaignId: number;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  sourceUrl?: string;
  triggeredAt: string;
  resolvedAt?: string;
  status: string;
}

export interface CreateAlertRequest {
  campaignId: number;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  sourceUrl?: string;
}

export interface AlertsListResponse {
  alerts: CrisisAlert[];
}

export interface AlertsSummary {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  severityBreakdown: SeverityStats[];
  recentAlerts: CrisisAlert[];
}

export interface SeverityStats {
  severity: string;
  count: number;
}

export interface StaffMember {
  id: number;
  campaignId: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  alertPreferences?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffMemberRequest {
  campaignId: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  alertPreferences?: any;
}

export interface StaffListResponse {
  staff: StaffMember[];
}
