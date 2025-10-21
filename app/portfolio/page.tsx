'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';

interface Holding {
  stock: string;
  holdings: number;
  price: string;
  amount: string;
  total: string;
}

export default function PortfolioPage() {
  const [holdings] = useState<Holding[]>([
    {
      stock: 'AAPL',
      holdings: 100,
      price: '$185.50',
      amount: '100',
      total: '$18,550.00'
    },
    {
      stock: 'MSFT',
      holdings: 50,
      price: '$420.75',
      amount: '50',
      total: '$21,037.50'
    },
    {
      stock: 'GOOGL',
      holdings: 30,
      price: '$142.25',
      amount: '30',
      total: '$4,267.50'
    },
    {
      stock: 'TSLA',
      holdings: 25,
      price: '$205.00',
      amount: '25',
      total: '$5,125.00'
    },
    {
      stock: 'NVDA',
      holdings: 40,
      price: '$885.50',
      amount: '40',
      total: '$35,420.00'
    },
    {
      stock: 'BTC/USDT',
      holdings: 0.5,
      price: '$43,250.00',
      amount: '0.5',
      total: '$21,625.00'
    },
    {
      stock: 'ETH/USDT',
      holdings: 2.0,
      price: '$2,545.00',
      amount: '2.0',
      total: '$5,090.00'
    },
    {
      stock: 'META',
      holdings: 20,
      price: '$515.25',
      amount: '20',
      total: '$10,305.00'
    },
    {
      stock: 'AMZN',
      holdings: 35,
      price: '$178.50',
      amount: '35',
      total: '$6,247.50'
    },
    {
      stock: 'AMD',
      holdings: 60,
      price: '$165.75',
      amount: '60',
      total: '$9,945.00'
    }
  ]);

  const totalValue = '$137,612.50';
  const todayEarnings = '+$3,245.75';
  const todayPercentage = '+2.42%';
  const isPositive = true;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Portfolio Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            {/* Total Portfolio Value */}
            <div className="mb-6">
              <p className="text-lg font-semibold text-gray-600 mb-2">Total Portfolio Value</p>
              <p className="text-5xl font-bold text-black">{totalValue}</p>
            </div>

            {/* Today's Earnings */}
            <div className="flex items-center justify-center space-x-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Today's Earnings</p>
                <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {todayEarnings}
                </p>
              </div>
              <div className="text-2xl text-gray-400">|</div>
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Percentage</p>
                <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {todayPercentage}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-black">Holdings</h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-black">Stock</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-black">Holdings</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-black">Price</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-black">Amount</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-black">Total</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => (
                <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-black">
                    {holding.stock}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-black">
                    {holding.holdings}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-black">
                    {holding.price}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-black">
                    {holding.amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-black">
                    {holding.total}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-bold text-black text-right">
                  Total Portfolio Value
                </td>
                <td className="px-6 py-4 text-sm font-bold text-black text-right">
                  {totalValue}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Layout>
  );
}