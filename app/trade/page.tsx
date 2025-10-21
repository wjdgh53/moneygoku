'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';

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

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<'open' | 'completed' | 'tradelog'>('open');

  const openPositions: OpenPosition[] = [
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
  ];

  const completedPositions: CompletedPosition[] = [
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
  ];

  const tradeLogs: TradeLog[] = [
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
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-black">Trade</h1>

        {/* 3 Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'open'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('tradelog')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'tradelog'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trade Log
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          {activeTab === 'open' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Bot</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Symbol</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Shares</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Volume</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Unrealized Return</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((position, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-blue-600 font-medium">{position.bot}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black">{position.symbol}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{position.shares}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{position.volume}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">
                      <span className={position.unrealizedReturn.includes('+') ? 'text-green-600' : 'text-red-600'}>
                        {position.unrealizedReturn}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-black">{position.date}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        position.action === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {position.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'completed' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Bot</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Symbol</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Shares</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Volume</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Unrealized Return</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {completedPositions.map((position, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-blue-600 font-medium">{position.bot}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black">{position.symbol}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{position.shares}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{position.volume}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">
                      <span className={position.unrealizedReturn.includes('+') ? 'text-green-600' : 'text-red-600'}>
                        {position.unrealizedReturn}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-black">{position.date}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {position.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'tradelog' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Bot</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Symbol</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-black">Side</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Volume</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Filled</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-black">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {tradeLogs.map((trade, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-blue-600 font-medium">{trade.bot}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black">{trade.symbol}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        trade.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{trade.volume}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{trade.filled}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-black">{trade.price}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-black">{trade.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}