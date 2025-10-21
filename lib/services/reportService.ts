import { TestReport } from './botTestService';

export const reportService = {
  // Run bot test and save report via API
  async runBotTest(botId: string, symbol: string): Promise<TestReport> {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botId, symbol })
      });

      if (!response.ok) {
        throw new Error(`Failed to run bot test: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Bot test completed and report saved:', result.reportId);
      return result.report;
    } catch (error) {
      console.error('❌ Error running bot test:', error);
      throw error;
    }
  },

  // Load reports from database via API
  async loadReports(botId: string): Promise<TestReport[]> {
    try {
      const response = await fetch(`/api/reports?botId=${botId}`);

      if (!response.ok) {
        throw new Error(`Failed to load reports: ${response.statusText}`);
      }

      const reports = await response.json();
      return reports;
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      return [];
    }
  }
};