export interface Campaign {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
}
