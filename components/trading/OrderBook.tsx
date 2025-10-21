'use client';

import { useState, useEffect } from 'react';

interface OrderBookProps {
  symbol: string;
}

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export default function OrderBook({ symbol }: OrderBookProps) {
  const [spread, setSpread] = useState(0);
  const [lastPrice, setLastPrice] = useState(43250.00);

  // Mock order book data
  const [asks, setAsks] = useState<OrderLevel[]>([
    { price: 43280.50, size: 2.45, total: 2.45 },
    { price: 43275.25, size: 1.85, total: 4.30 },
    { price: 43270.00, size: 3.20, total: 7.50 },
    { price: 43265.75, size: 0.95, total: 8.45 },
    { price: 43260.50, size: 4.10, total: 12.55 },
    { price: 43255.25, size: 2.75, total: 15.30 },
    { price: 43250.00, size: 1.65, total: 16.95 },
  ]);

  const [bids, setBids] = useState<OrderLevel[]>([
    { price: 43245.75, size: 1.80, total: 1.80 },
    { price: 43240.50, size: 2.95, total: 4.75 },
    { price: 43235.25, size: 3.45, total: 8.20 },
    { price: 43230.00, size: 1.25, total: 9.45 },
    { price: 43225.75, size: 4.85, total: 14.30 },
    { price: 43220.50, size: 2.15, total: 16.45 },
    { price: 43215.25, size: 3.75, total: 20.20 },
  ]);

  useEffect(() => {
    if (asks.length > 0 && bids.length > 0) {
      const topAsk = asks[asks.length - 1].price;
      const topBid = bids[0].price;
      setSpread(topAsk - topBid);
    }
  }, [asks, bids]);

  const getVolumePercentage = (size: number, maxSize: number) => {
    return (size / maxSize) * 100;
  };

  const maxAskSize = Math.max(...asks.map(a => a.size));
  const maxBidSize = Math.max(...bids.map(b => b.size));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Order Book</h3>
          <div className="text-xs text-gray-500">
            Spread: ${spread.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200">
          <div className="text-right">Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>

        <div className="flex flex-col h-full">
          {/* Asks (Sell Orders) */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-px">
              {asks.slice().reverse().map((ask, index) => (
                <div
                  key={index}
                  className="relative grid grid-cols-3 gap-2 px-4 py-1 text-xs hover:bg-red-50 cursor-pointer group"
                >
                  {/* Volume Bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-100 opacity-50"
                    style={{ width: `${getVolumePercentage(ask.size, maxAskSize)}%` }}
                  />

                  <div className="text-right text-red-600 font-medium relative z-10">
                    {ask.price.toFixed(2)}
                  </div>
                  <div className="text-right text-gray-900 relative z-10">
                    {ask.size.toFixed(4)}
                  </div>
                  <div className="text-right text-gray-600 relative z-10">
                    {ask.total.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Price */}
          <div className="px-4 py-3 bg-gray-100 border-y border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ${lastPrice.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">Last Price</div>
            </div>
          </div>

          {/* Bids (Buy Orders) */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-px">
              {bids.map((bid, index) => (
                <div
                  key={index}
                  className="relative grid grid-cols-3 gap-2 px-4 py-1 text-xs hover:bg-green-50 cursor-pointer group"
                >
                  {/* Volume Bar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-green-100 opacity-50"
                    style={{ width: `${getVolumePercentage(bid.size, maxBidSize)}%` }}
                  />

                  <div className="text-right text-green-600 font-medium relative z-10">
                    {bid.price.toFixed(2)}
                  </div>
                  <div className="text-right text-gray-900 relative z-10">
                    {bid.size.toFixed(4)}
                  </div>
                  <div className="text-right text-gray-600 relative z-10">
                    {bid.total.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}