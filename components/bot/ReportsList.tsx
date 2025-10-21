'use client';

import { useState } from 'react';
import { TestReport } from '@/lib/services/botTestService';
import TestRunReport from './TestRunReport';

interface ReportsListProps {
  reports: TestReport[];
}

export default function ReportsList({ reports }: ReportsListProps) {
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const handleViewReport = (report: TestReport) => {
    setSelectedReport(report);
    setShowReport(true);
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'BUY':
        return 'bg-green-100 text-green-800';
      case 'SELL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'BUY':
        return '🟢';
      case 'SELL':
        return '🔴';
      default:
        return '🟡';
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
        <p className="text-gray-600">Run tests to generate analysis reports</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reports.map((report, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleViewReport(report)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getDecisionIcon(report.finalDecision)}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor(report.finalDecision)}`}>
                    {report.finalDecision}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {report.timestamp && !isNaN(new Date(report.timestamp).getTime())
                      ? new Date(report.timestamp).toLocaleString('ko-KR')
                      : '날짜 없음'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {report.symbol} · {report.executionTime}ms
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Conditions</p>
                  <p className="text-sm font-medium">
                    {report.conditions.filter(c => c.result).length}/{report.conditions.length} met
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600 line-clamp-2">{report.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <TestRunReport
        report={selectedReport}
        isRunning={false}
        show={showReport}
        onClose={() => {
          setShowReport(false);
          setSelectedReport(null);
        }}
      />
    </>
  );
}