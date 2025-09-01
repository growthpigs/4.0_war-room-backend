import { api } from "encore.dev/api";
import { intelligenceService } from "./service";

interface GenerateReportRequest {
  format: 'summary' | 'detailed';
  timeframe: 'weekly' | 'monthly' | 'quarterly';
  includeCharts?: boolean;
  recipientEmail?: string;
}

interface GenerateReportResponse {
  reportId: string;
  title: string;
  generatedAt: string;
  downloadUrl?: string;
  emailSent?: boolean;
  report: {
    title: string;
    generatedAt: string;
    timeframe: string;
    sections: Array<{
      title: string;
      content: string;
      charts?: Array<{ type: string; data: any }>;
    }>;
  };
}

// Creates comprehensive intelligence report.
export const generateReport = api<GenerateReportRequest, GenerateReportResponse>(
  { expose: true, method: "POST", path: "/intelligence/generate-report" },
  async (req) => {
    const report = await intelligenceService.generateIntelligenceReport(req.format);
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In real implementation, this would:
    // 1. Generate PDF/document from report data
    // 2. Store in object storage
    // 3. Send email if recipient provided
    // 4. Return download URL

    const response: GenerateReportResponse = {
      reportId,
      title: `Intelligence Report - ${req.timeframe}`,
      generatedAt: report.generatedAt,
      report
    };

    // Mock download URL
    if (req.format === 'detailed') {
      response.downloadUrl = `/reports/${reportId}.pdf`;
    }

    // Mock email sent status
    if (req.recipientEmail) {
      response.emailSent = true;
    }

    return response;
  }
);
