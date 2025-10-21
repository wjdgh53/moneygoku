'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import TestRunReport from '@/components/bot/TestRunReport';
import BotScheduleStatus from '@/components/bot/BotScheduleStatus';
import AnalystRatingCard from '@/components/bot/AnalystRatingCard';
import { TestReport } from '@/lib/services/botTestService';

interface Bot {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  mode: 'PAPER' | 'LIVE';
  config?: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
  symbol: string;
  fundAllocation: number;
  analystRating: string | null; // JSON string from FMP API
  strategy?: {
    id: string;
    name: string;
    timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
    riskAppetite: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';
    stopLoss: number;
    takeProfit: number;
  };
  portfolio?: {
    id: string;
    name: string;
  };
  trades: Array<{
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalAmount: number;
    fees: number;
    status: string;
    executedAt: string;
    reason?: string;
  }>;
}

interface OrderWithFillStatus {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
  status: string;
  executedAt: string;
  reason?: string;
  alpacaOrderId?: string;
  fillStatus?: {
    status: string;
    filledQty: number;
    remainingQty: number;
    fillRate: number;
    averageFillPrice?: number;
  };
}

interface FundStatus {
  allocatedFund: number;
  stockValue: number;
  availableCash: number;
  totalValue: number;
  totalReturns: number;
  totalReturnsPercent: number;
}

interface PositionData {
  quantity: number;
  entryPrice: number;
  currentValue: number;
  currentPrice: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [fundStatus, setFundStatus] = useState<FundStatus | null>(null);
  const [position, setPosition] = useState<PositionData | null>(null);
  const [orders, setOrders] = useState<OrderWithFillStatus[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBotDetails(params.id as string);
      fetchReports(params.id as string);
      fetchPosition(params.id as string);
      fetchOrders(params.id as string);
    }
  }, [params.id]);

  const fetchBotDetails = async (botId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bots/${botId}`);

      if (!response.ok) {
        throw new Error('Bot not found');
      }

      const data = await response.json();
      setBot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bot details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (botId: string) => {
    try {
      const response = await fetch(`/api/reports/${botId}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const fetchPosition = async (botId: string) => {
    try {
      const response = await fetch(`/api/bots/${botId}/position`);
      if (response.ok) {
        const data = await response.json();
        setFundStatus(data.fundStatus);
        setPosition(data.position);
      }
    } catch (err) {
      console.error('Failed to fetch position:', err);
    }
  };

  const fetchOrders = async (botId: string) => {
    try {
      setOrdersLoading(true);
      const response = await fetch(`/api/bots/${botId}/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleViewReport = async (reportId: string) => {
    try {
      setReportLoading(true);
      const response = await fetch(`/api/reports/detail/${reportId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data.report);
      }
    } catch (err) {
      console.error('Failed to fetch report detail:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => {
    if (!bot) return;

    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        const updatedBot = await response.json();
        setBot(updatedBot);
      }
    } catch (err) {
      console.error('Failed to update bot status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100';
      case 'STOPPED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSymbolIcon = (symbol: string) => {
    const firstLetter = symbol.split('/')[0]?.[0] || 'B';
    const colors = {
      'T': 'bg-red-500',
      'A': 'bg-gray-500',
      'M': 'bg-blue-500',
      'G': 'bg-green-500',
      'N': 'bg-purple-500',
      'B': 'bg-orange-500',
    };
    return colors[firstLetter as keyof typeof colors] || 'bg-blue-500';
  };

  const getOrderStatusColor = (order: OrderWithFillStatus) => {
    if (!order.fillStatus) {
      // Legacy orders without Alpaca tracking
      return order.status === 'EXECUTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }

    const status = order.fillStatus.status.toLowerCase();
    if (status === 'filled') return 'bg-green-100 text-green-800';
    if (status === 'partially_filled') return 'bg-orange-100 text-orange-800';
    if (status === 'rejected' || status === 'canceled' || status === 'expired') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800'; // pending, new, accepted
  };

  const getOrderStatusLabel = (order: OrderWithFillStatus) => {
    if (!order.fillStatus) {
      return order.status;
    }

    const status = order.fillStatus.status;
    if (status === 'filled') return 'FILLED';
    if (status === 'partially_filled') return 'PARTIALLY FILLED';
    if (status === 'rejected') return 'REJECTED';
    if (status === 'canceled') return 'CANCELED';
    if (status === 'expired') return 'EXPIRED';
    if (status === 'pending_new' || status === 'new' || status === 'accepted') return 'PENDING';
    return status.toUpperCase();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !bot) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-red-600 text-xl mb-4">
            {error || 'Bot not found'}
          </div>
          <Link
            href="/bots"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Bots
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/bots" className="hover:text-blue-600">Bots</Link>
          <span>/</span>
          <span className="text-gray-900">{bot.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-2xl ${getSymbolIcon(bot.symbol || 'BOT')} flex items-center justify-center text-white text-2xl font-bold`}>
                {(bot.symbol || 'BOT').split('/')[0]?.[0] || 'B'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
                <p className="text-gray-600 mt-1">{bot.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bot.status)}`}>
                    {bot.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Strategy: {bot.strategy?.name || 'Custom'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {bot.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleStatusChange('PAUSED')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start
                </button>
              )}
              <button
                onClick={() => handleStatusChange('STOPPED')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
              <Link
                href={`/bots/${bot.id}/edit`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block text-center"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>

        {/* Execution Schedule Status */}
        {bot.strategy && (
          <BotScheduleStatus
            lastExecutedAt={bot.lastExecutedAt}
            timeHorizon={bot.strategy.timeHorizon}
            status={bot.status}
          />
        )}

        {/* Fund Status */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-sm border border-blue-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            봇 자금 현황
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-600 text-xs mb-1">할당 자금</p>
              <p className="text-lg font-bold text-gray-900">
                ${fundStatus ? fundStatus.allocatedFund.toFixed(2) : bot.fundAllocation.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-600 text-xs mb-1">보유 주식</p>
              <p className="text-lg font-bold text-blue-600">
                {position ? `${position.quantity}주 × $${position.currentPrice.toFixed(2)}` : '0주'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ${fundStatus ? fundStatus.stockValue.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-600 text-xs mb-1">사용 가능 현금</p>
              <p className="text-lg font-bold text-green-600">
                ${fundStatus ? fundStatus.availableCash.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-600 text-xs mb-1">총 자산</p>
              <p className="text-lg font-bold text-gray-900">
                ${fundStatus ? fundStatus.totalValue.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-600 text-xs mb-1">총 수익</p>
              <p className={`text-lg font-bold ${fundStatus && fundStatus.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fundStatus ? `${fundStatus.totalReturns >= 0 ? '+' : ''}$${fundStatus.totalReturns.toFixed(2)}` : '$0.00'}
              </p>
              <p className={`text-xs ${fundStatus && fundStatus.totalReturnsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fundStatus ? `${fundStatus.totalReturnsPercent >= 0 ? '+' : ''}${fundStatus.totalReturnsPercent.toFixed(2)}%` : '0.00%'}
              </p>
            </div>
          </div>
        </div>

        {/* Bot Profile - Clean Minimal Design */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Bot Profile</h2>

          {/* Key Characteristics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Trading Style */}
            <div className={`bg-gradient-to-br rounded-2xl p-8 text-center ${
              bot.strategy?.riskAppetite === 'AGGRESSIVE' ? 'from-red-50 to-red-100' :
              bot.strategy?.riskAppetite === 'DEFENSIVE' ? 'from-green-50 to-green-100' :
              'from-blue-50 to-blue-100'
            }`}>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                bot.strategy?.riskAppetite === 'AGGRESSIVE' ? 'bg-red-500' :
                bot.strategy?.riskAppetite === 'DEFENSIVE' ? 'bg-green-500' :
                'bg-blue-500'
              }`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Trading Style</h3>
              <p className={`text-4xl font-bold mb-2 ${
                bot.strategy?.riskAppetite === 'AGGRESSIVE' ? 'text-red-600' :
                bot.strategy?.riskAppetite === 'DEFENSIVE' ? 'text-green-600' :
                'text-blue-600'
              }`}>
                {bot.strategy?.riskAppetite || 'BALANCED'}
              </p>
              <p className="text-sm text-gray-600">
                {bot.strategy?.riskAppetite === 'AGGRESSIVE' ? 'High risk, high reward' :
                 bot.strategy?.riskAppetite === 'DEFENSIVE' ? 'Conservative approach' :
                 'Balanced risk-reward'}
              </p>
            </div>

            {/* Time Horizon */}
            <div className={`bg-gradient-to-br rounded-2xl p-8 text-center ${
              bot.strategy?.timeHorizon === 'SHORT_TERM' ? 'from-orange-50 to-orange-100' :
              bot.strategy?.timeHorizon === 'LONG_TERM' ? 'from-indigo-50 to-indigo-100' :
              'from-purple-50 to-purple-100'
            }`}>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                bot.strategy?.timeHorizon === 'SHORT_TERM' ? 'bg-orange-500' :
                bot.strategy?.timeHorizon === 'LONG_TERM' ? 'bg-indigo-500' :
                'bg-purple-500'
              }`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Time Horizon</h3>
              <p className={`text-4xl font-bold mb-2 ${
                bot.strategy?.timeHorizon === 'SHORT_TERM' ? 'text-orange-600' :
                bot.strategy?.timeHorizon === 'LONG_TERM' ? 'text-indigo-600' :
                'text-purple-600'
              }`}>
                {bot.strategy?.timeHorizon === 'SHORT_TERM' ? 'Short-Term' :
                 bot.strategy?.timeHorizon === 'LONG_TERM' ? 'Long-Term' :
                 'Swing'}
              </p>
              <p className="text-sm text-gray-600">
                {bot.strategy?.timeHorizon === 'SHORT_TERM' ? 'Intraday trading' :
                 bot.strategy?.timeHorizon === 'LONG_TERM' ? 'Weeks to months' :
                 '2-7 day holds'}
              </p>
            </div>

          </div>

          {/* Quick Info Bar */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Symbol</p>
              <p className="text-xl font-bold text-gray-900">{bot.symbol}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Mode</p>
              <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${
                bot.mode === 'PAPER' ? 'bg-yellow-200 text-yellow-900' : 'bg-green-200 text-green-900'
              }`}>
                {bot.mode}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Fund</p>
              <p className="text-xl font-bold text-gray-900">${bot.fundAllocation}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Stop Loss</p>
              <p className="text-xl font-bold text-red-600">{bot.strategy?.stopLoss || 5}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Take Profit</p>
              <p className="text-xl font-bold text-green-600">{bot.strategy?.takeProfit || 10}%</p>
            </div>
          </div>
        </div>

        {/* Analyst Rating Section */}
        <AnalystRatingCard analystRatingJson={bot.analystRating} />

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <Link
              href="/trades"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading orders...</span>
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Symbol</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Side</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Price</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fill Rate</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{order.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{order.quantity}</td>
                      <td className="py-3 px-4 text-gray-900">${order.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        {order.fillStatus ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {order.fillStatus.filledQty}/{order.quantity}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({order.fillStatus.fillRate}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  order.fillStatus.fillRate === 100 ? 'bg-green-600' :
                                  order.fillStatus.fillRate > 0 ? 'bg-orange-600' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${order.fillStatus.fillRate}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getOrderStatusColor(order)}`}>
                          {getOrderStatusLabel(order)}
                        </span>
                        {order.reason && (
                          <div className="text-xs text-gray-500 mt-1 max-w-32 truncate" title={order.reason}>
                            {order.reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        <div>{new Date(order.executedAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.executedAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 주문이 없습니다</h3>
              <p className="text-gray-500 text-sm">
                봇이 활성화되어 거래를 시작하면 여기에 최근 주문 내역이 표시됩니다.
              </p>
              {bot.status !== 'ACTIVE' && (
                <p className="text-gray-400 text-xs mt-2">
                  거래를 시작하려면 봇을 활성화하세요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Report History */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">리포트 히스토리</h2>
          </div>

          {reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">시간</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">심볼</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">현재가</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">AI 결정</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">리미트 가격</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">감성 점수</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">거래 실행</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        <div>{new Date(report.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{report.symbol}</td>
                      <td className="py-3 px-4 text-gray-900">${report.currentPrice.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          report.aiAction === 'BUY' ? 'bg-green-100 text-green-800' :
                          report.aiAction === 'SELL' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.aiAction || report.decision}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {report.aiLimitPrice ? `$${report.aiLimitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {report.newsSentiment !== null ? (
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              report.newsSentiment >= 0.5 ? 'text-green-600' :
                              report.newsSentiment >= 0 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {report.newsSentiment >= 0 ? '+' : ''}{report.newsSentiment.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">{report.sentimentLabel}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {report.tradeExecuted ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.tradeSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {report.tradeSuccess ? '성공' : '실패'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            미실행
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 리포트가 없습니다</h3>
              <p className="text-gray-500 text-sm">
                테스트를 실행하면 여기에 리포트가 저장됩니다.
              </p>
            </div>
          )}
        </div>

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">리포트 상세</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <TestRunReport report={selectedReport} inline={true} />
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}