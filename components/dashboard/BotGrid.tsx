'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BotCard from './BotCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast, { ToastMessage } from '@/components/ui/Toast';

interface Bot {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  config?: string;
  fundAllocation: number;
  totalReturns: number;
  winRate: number;
  totalTrades: number;
  createdAt: string;
  strategy?: {
    name: string;
    type: string;
  };
  _count: {
    trades: number;
  };
}

export default function BotGrid() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [isStoppingAll, setIsStoppingAll] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots');
      if (response.ok) {
        const data = await response.json();
        setBots(data);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/bots/bulk', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          message: `Successfully deleted ${data.deletedCount} bot(s)`
        });
        // Reload bots list
        fetchBots();
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to delete bots'
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Network error occurred while deleting bots'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/bots/bulk', {
        method: 'PUT',
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          message: `Successfully tested ${data.tested} bot(s)${data.failed > 0 ? `, ${data.failed} failed` : ''}`
        });
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to test bots'
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Network error occurred while testing bots'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBulkStart = async () => {
    setIsStartingAll(true);
    try {
      const response = await fetch('/api/bots/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START' })
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          message: `Started ${data.processed} bot(s)${data.skipped > 0 ? `, ${data.skipped} already active` : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''}`
        });
        // Reload bots to show updated status
        fetchBots();
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to start bots'
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Network error occurred while starting bots'
      });
    } finally {
      setIsStartingAll(false);
    }
  };

  const handleBulkStop = async () => {
    setIsStoppingAll(true);
    try {
      const response = await fetch('/api/bots/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP' })
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          message: `Stopped ${data.processed} bot(s)${data.skipped > 0 ? `, ${data.skipped} already stopped` : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''}`
        });
        // Reload bots to show updated status
        fetchBots();
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to stop bots'
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Network error occurred while stopping bots'
      });
    } finally {
      setIsStoppingAll(false);
    }
  };

  // Bot 모델에 symbol 필드가 직접 있으므로 config 파싱 불필요

  const getIconBg = (symbol: string) => {
    const firstLetter = symbol.split('/')[0]?.[0] || 'B';
    const colors = {
      'T': 'bg-red-500',
      'A': 'bg-gray-500',
      'M': 'bg-blue-500',
      'G': 'bg-green-500',
      'N': 'bg-purple-500',
      'B': 'bg-orange-500',
      'R': 'bg-green-500',
    };
    return colors[firstLetter as keyof typeof colors] || 'bg-blue-500';
  };

  const calculateBotMetrics = (bot: Bot) => {
    // 실제 DB 데이터 사용 - 아직 거래가 없으면 초기값 표시
    return {
      allocatedFund: bot.fundAllocation || 0,
      totalFund: bot.fundAllocation || 1000, // 할당된 자금이 총 자금
      returnValue: bot.totalReturns
        ? (bot.totalReturns >= 0
          ? `+$${bot.totalReturns.toFixed(2)}`
          : `-$${Math.abs(bot.totalReturns).toFixed(2)}`)
        : '$0.00',
      apy: bot.winRate > 0 ? `${bot.winRate.toFixed(1)}%` : '0.0%',
      position: 'long' as 'long' | 'short' // 기본값은 long으로 설정
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Bots</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your automated trading strategies
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Start All Bots Button */}
          {bots.length > 0 && (
            <button
              onClick={handleBulkStart}
              disabled={isStartingAll}
              className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingAll ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>Start All Bots</span>
                </>
              )}
            </button>
          )}

          {/* Stop All Bots Button */}
          {bots.length > 0 && (
            <button
              onClick={handleBulkStop}
              disabled={isStoppingAll}
              className="bg-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStoppingAll ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" clipRule="evenodd" />
                  </svg>
                  <span>Stop All Bots</span>
                </>
              )}
            </button>
          )}

          {/* Bulk Test Button */}
          {bots.length > 0 && (
            <button
              onClick={handleBulkTest}
              disabled={isTesting}
              className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Test All Bots</span>
                </>
              )}
            </button>
          )}

          {/* Bulk Delete Button */}
          {bots.length > 0 && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Delete All Bots</span>
                </>
              )}
            </button>
          )}

          {/* Create New Bot Button */}
          <button
            onClick={() => router.push('/bots/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Create New Bot</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              All
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
              Active
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
              Paused
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bot Cards Grid */}
      {bots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bots.map((bot) => {
            const metrics = calculateBotMetrics(bot);
            return (
              <BotCard
                key={bot.id}
                id={bot.id}
                symbol={bot.symbol}
                name={bot.name}
                status={bot.status}
                allocatedFund={metrics.allocatedFund}
                totalFund={metrics.totalFund}
                returnValue={metrics.returnValue}
                apy={metrics.apy}
                position={metrics.position}
                iconBg={getIconBg(bot.symbol)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No trading bots yet</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            Create your first automated trading bot to start earning passive income
          </p>
          <button
            onClick={() => router.push('/bots/create')}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Create Your First Bot
          </button>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete All Bots"
        message={`Are you sure you want to delete all ${bots.length} bot(s)? This action cannot be undone and will remove all associated trades and reports.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}