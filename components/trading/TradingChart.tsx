'use client';

import { useEffect, useRef, useState } from 'react';

interface TradingChartProps {
  symbol: string;
}

export default function TradingChart({ symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState('1H');

  const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

  useEffect(() => {
    if (chartContainerRef.current) {
      // Clear previous chart
      chartContainerRef.current.innerHTML = '';

      // Create TradingView widget
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: symbol.replace('/', ''),
        interval: timeframe,
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: 'tradingview_chart',
        hide_top_toolbar: false,
        hide_legend: true,
        save_image: false,
        studies: [
          'RSI@tv-basicstudies',
          'MACD@tv-basicstudies'
        ]
      });

      const chartContainer = document.createElement('div');
      chartContainer.id = 'tradingview_chart';
      chartContainer.style.height = '100%';
      chartContainer.style.width = '100%';

      chartContainerRef.current.appendChild(chartContainer);
      chartContainerRef.current.appendChild(script);
    }
  }, [symbol, timeframe]);

  return (
    <div className="h-full flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Chart</h3>

        {/* Timeframe Selector */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                timeframe === tf
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative">
        <div ref={chartContainerRef} className="absolute inset-0" />

        {/* Fallback when TradingView is not available */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{symbol} Chart</h4>
            <p className="text-gray-600">TradingView chart will load here</p>

            {/* Mock Price Movement */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center bg-white p-3 rounded border">
                <span className="text-sm text-gray-600">Current Price</span>
                <span className="font-semibold text-green-600">$43,250.00</span>
              </div>
              <div className="flex justify-between items-center bg-white p-3 rounded border">
                <span className="text-sm text-gray-600">24h Change</span>
                <span className="font-semibold text-green-600">+2.98%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}