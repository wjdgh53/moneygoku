'use client';

import { useState } from 'react';

interface OpenPosition {
  bot: string;
  symbol: string;
  shares: number;
  volume: string;
  unrealizedReturn: string;
  date: string;
  action: string;
}

interface CompletedPosition {
  bot: string;
  symbol: string;
  shares: number;
  volume: string;
  unrealizedReturn: string;
  date: string;
  action: string;
}

interface TradeLog {
  bot: string;
  symbol: string;
  side: string;
  volume: string;
  filled: string;
  price: string;
  date: string;
}

export default function PositionsPanel() {
  const [activeTab, setActiveTab] = useState<'open' | 'completed' | 'tradelog'>('open');

  // Mock data
  const [openPositions] = useState<OpenPosition[]>([
    {
      bot: 'RSI Bot #1',
      symbol: 'BTC/USDT',
      shares: 0.5,
      volume: '$21,625.00',
      unrealizedReturn: '+$450.00 (+2.08%)',
      date: '2024-01-15 14:30',
      action: 'LONG'
    },
    {
      bot: 'MACD Bot #2',
      symbol: 'ETH/USDT',
      shares: 2.0,
      volume: '$5,090.00',
      unrealizedReturn: '+$140.00 (+2.75%)',
      date: '2024-01-15 13:15',
      action: 'LONG'
    },
    {
      bot: 'Momentum Bot #3',
      symbol: 'AAPL',
      shares: 50,
      volume: '$9,250.00',
      unrealizedReturn: '-$125.00 (-1.35%)',
      date: '2024-01-15 12:45',
      action: 'SHORT'
    }
  ]);

  const [completedPositions] = useState<CompletedPosition[]>([
    {
      bot: 'RSI Bot #1',
      symbol: 'BTC/USDT',
      shares: 0.3,
      volume: '$12,750.00',
      unrealizedReturn: '+$325.00 (+2.55%)',
      date: '2024-01-14 16:20',
      action: 'CLOSED'
    },
    {
      bot: 'Scalping Bot #4',
      symbol: 'TSLA',
      shares: 25,
      volume: '$5,125.00',
      unrealizedReturn: '+$87.50 (+1.71%)',
      date: '2024-01-14 15:10',
      action: 'CLOSED'
    },
    {
      bot: 'Trend Bot #5',
      symbol: 'GOOGL',
      shares: 10,
      volume: '$1,420.00',
      unrealizedReturn: '-$28.00 (-1.97%)',
      date: '2024-01-14 11:30',
      action: 'CLOSED'
    }
  ]);

  const [tradeLogs] = useState<TradeLog[]>([
    {
      bot: 'RSI Bot #1',
      symbol: 'BTC/USDT',
      side: 'BUY',
      volume: '$21,625.00',
      filled: '0.5000',
      price: '$43,250.00',
      date: '2024-01-15 14:30'
    },
    {
      bot: 'MACD Bot #2',
      symbol: 'ETH/USDT',
      side: 'BUY',
      volume: '$5,090.00',
      filled: '2.0000',
      price: '$2,545.00',
      date: '2024-01-15 13:15'
    },
    {
      bot: 'Momentum Bot #3',
      symbol: 'AAPL',
      side: 'SELL',
      volume: '$9,250.00',
      filled: '50.0000',
      price: '$185.00',
      date: '2024-01-15 12:45'
    },
    {
      bot: 'RSI Bot #1',
      symbol: 'BTC/USDT',
      side: 'SELL',
      volume: '$12,750.00',
      filled: '0.3000',
      price: '$42,500.00',
      date: '2024-01-14 16:20'
    }
  ]);

  const tabs = [
    { key: 'open', label: 'Open' },
    { key: 'completed', label: 'Completed' },
    { key: 'tradelog', label: 'Trade Log' }
  ];

  return (
    <div className="h-80">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'open' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Bot</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Symbol</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Shares</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Volume</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Unrealized Return</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((position, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{position.bot}</td>
                    <td className="px-4 py-3 font-medium">{position.symbol}</td>
                    <td className="px-4 py-3 text-right">{position.shares}</td>
                    <td className="px-4 py-3 text-right">{position.volume}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={position.unrealizedReturn.includes('+') ? 'text-green-600' : 'text-red-600'}>
                        {position.unrealizedReturn}
                      </span>
                    </td>
                    <td className="px-4 py-3">{position.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        position.action === 'LONG'
                          ? 'bg-green-100 text-green-800'
                          : position.action === 'SHORT'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {position.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Bot</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Symbol</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Shares</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Volume</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Unrealized Return</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {completedPositions.map((position, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{position.bot}</td>
                    <td className="px-4 py-3 font-medium">{position.symbol}</td>
                    <td className="px-4 py-3 text-right">{position.shares}</td>
                    <td className="px-4 py-3 text-right">{position.volume}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={position.unrealizedReturn.includes('+') ? 'text-green-600' : 'text-red-600'}>
                        {position.unrealizedReturn}
                      </span>
                    </td>
                    <td className="px-4 py-3">{position.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {position.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tradelog' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Bot</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Symbol</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">Side</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Volume</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Filled</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-900">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {tradeLogs.map((trade, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{trade.bot}</td>
                    <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        trade.side === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{trade.volume}</td>
                    <td className="px-4 py-3 text-right">{trade.filled}</td>
                    <td className="px-4 py-3 text-right">{trade.price}</td>
                    <td className="px-4 py-3">{trade.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}