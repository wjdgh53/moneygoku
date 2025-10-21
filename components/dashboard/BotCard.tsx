import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TestReport } from '@/lib/services/botTestService';
import TestRunReport from '@/components/bot/TestRunReport';
import { parseAnalystRating, type SignalType } from '@/lib/types/analyst';

interface BotCardProps {
  id: string;
  symbol: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  allocatedFund: number;
  totalFund: number;
  returnValue: string;
  apy: string;
  position: 'long' | 'short';
  iconBg: string;
  analystRating?: string | null;
}

export default function BotCard({
  id,
  symbol,
  name,
  status,
  allocatedFund,
  totalFund,
  returnValue,
  apy,
  position,
  iconBg,
  analystRating
}: BotCardProps) {
  const router = useRouter();
  const [showTestReport, setShowTestReport] = useState(false);
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [positionData, setPositionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch position data on mount
  useEffect(() => {
    fetchPositionData();
  }, [id]);

  const fetchPositionData = async () => {
    try {
      const response = await fetch(`/api/bots/${id}/position`);
      if (response.ok) {
        const data = await response.json();
        setPositionData(data);
      }
    } catch (error) {
      console.error('Failed to fetch position:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining cash: totalFund - positionValue
  const getPositionValue = () => {
    if (!positionData?.position?.currentValue) return 0;
    return parseFloat(positionData.position.currentValue);
  };

  const getRemainingCash = () => {
    if (positionData?.fundStatus?.availableCash !== undefined) {
      return parseFloat(positionData.fundStatus.availableCash);
    }
    const positionValue = getPositionValue();
    return totalFund - positionValue;
  };

  const getProgressPercentage = () => {
    const positionValue = getPositionValue();
    return Math.min((positionValue / totalFund) * 100, 100);
  };

  const getTotalReturn = () => {
    if (positionData?.position?.unrealizedPL !== undefined) {
      return parseFloat(positionData.position.unrealizedPL);
    }
    return 0;
  };

  const getReturnPercentage = () => {
    if (positionData?.position?.unrealizedPLPercent !== undefined) {
      return parseFloat(positionData.position.unrealizedPLPercent);
    }
    return 0;
  };

  const getPositionQuantity = () => {
    if (positionData?.position?.quantity) {
      return parseInt(positionData.position.quantity);
    }
    return 0;
  };

  const getPositionSide = () => {
    return positionData?.position?.quantity > 0 ? 'long' : 'short';
  };

  const runBotTest = async () => {
    setIsTestRunning(true);
    setShowTestReport(true);
    setTestReport(null);

    try {
      console.log(`🧪 Running test for bot ${name} (${symbol})`);

      const response = await fetch(`/api/bots/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      console.log(`✅ Test completed: ${data.message}`);
      setTestReport(data.report);

      // Refresh position data after test
      await fetchPositionData();

    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setTestReport({
        symbol,
        timestamp: new Date().toISOString(),
        executionTime: 0,
        apiCalls: [],
        conditions: [],
        finalDecision: 'HOLD',
        reason: 'Test failed',
        error: error.message
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const updateBotStatus = async (newStatus: 'ACTIVE' | 'STOPPED', e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update bot status');
      }

      console.log(`✅ Bot ${name} status updated to ${newStatus}`);
      window.location.reload();
    } catch (error) {
      console.error('❌ Status update failed:', error);
      alert('봇 상태 업데이트에 실패했습니다.');
    }
  };

  const deleteBot = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`"${name}" 봇을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete bot');
      }

      console.log(`✅ Bot ${name} deleted`);
      window.location.reload();
    } catch (error) {
      console.error('❌ Delete failed:', error);
      alert('봇 삭제에 실패했습니다.');
    }
  };

  const totalReturn = getTotalReturn();
  const returnPercentage = getReturnPercentage();
  const positionQty = getPositionQuantity();
  const remainingCash = getRemainingCash();
  const progressPercentage = getProgressPercentage();

  // Parse analyst rating
  const rating = parseAnalystRating(analystRating || null);

  const getSignalBadgeStyle = (signal: SignalType) => {
    const styles = {
      BUY: 'bg-green-100 text-green-700',
      SELL: 'bg-red-100 text-red-700',
      HOLD: 'bg-gray-100 text-gray-700'
    };
    return styles[signal];
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col">
      {/* Header with Icon and Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            <span className="text-white font-bold text-lg">{symbol.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">{symbol}</h3>
              {rating && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getSignalBadgeStyle(rating.consensus)}`}>
                  {rating.consensus}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{name}</p>
          </div>
        </div>

        <div className={`w-3 h-3 rounded-full ${status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
      </div>

      {/* Position Info - Single Line (Fixed Height) */}
      <div className="mb-6 h-6 flex items-center">
        {positionQty > 0 ? (
          <div className="text-sm text-gray-700">
            <span className="font-medium">보유 주식:</span> <span className="font-semibold text-gray-900">{positionQty}주</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            포지션 없음
          </div>
        )}
      </div>

      {/* Fund Status - Shows Remaining Cash */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Fund Status</span>
          <span className="text-sm font-semibold text-gray-900">
            ${remainingCash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/${totalFund.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Performance Metrics - Clean Layout */}
      <div className="space-y-4 mb-6 flex-grow">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total Return</span>
          <span className={`text-base font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Return %</span>
          <div className="flex items-center space-x-2">
            <span className={`text-base font-bold ${returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
            </span>
            {positionQty > 0 && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                getPositionSide() === 'long'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {getPositionSide().toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mt-auto">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push(`/bots/${id}`)}
            className="bg-gray-100 text-gray-700 text-xs py-2.5 px-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            View
          </button>
          <button
            onClick={runBotTest}
            disabled={isTestRunning}
            className="bg-green-600 text-white text-xs py-2.5 px-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestRunning ? '테스트중...' : 'Test'}
          </button>
          {status === 'ACTIVE' ? (
            <button
              onClick={(e) => updateBotStatus('STOPPED', e)}
              className="bg-red-600 text-white text-xs py-2.5 px-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={(e) => updateBotStatus('ACTIVE', e)}
              className="bg-blue-600 text-white text-xs py-2.5 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start
            </button>
          )}
        </div>
        <button
          onClick={deleteBot}
          className="w-full bg-red-50 text-red-600 text-xs py-2.5 px-3 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          Delete
        </button>
      </div>

      {/* Test Report Modal */}
      <TestRunReport
        report={testReport}
        isRunning={isTestRunning}
        show={showTestReport}
        onClose={() => setShowTestReport(false)}
      />
    </div>
  );
}
