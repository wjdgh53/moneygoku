/**
 * StockSymbolBadge Component
 * Reusable component for displaying stock symbols with click-to-detail functionality
 */

import Link from 'next/link';
import React from 'react';

interface StockSymbolBadgeProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'danger';
  clickable?: boolean;
}

export default function StockSymbolBadge({
  symbol,
  size = 'md',
  variant = 'default',
  clickable = true
}: StockSymbolBadgeProps) {

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    primary: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    success: 'bg-green-100 text-green-800 hover:bg-green-200',
    danger: 'bg-red-100 text-red-800 hover:bg-red-200'
  };

  const baseClasses = `
    inline-flex items-center font-semibold rounded-md
    transition-colors duration-200
    ${sizeClasses[size]}
    ${variantClasses[variant]}
  `;

  if (!clickable) {
    return (
      <span className={baseClasses}>
        {symbol}
      </span>
    );
  }

  return (
    <Link
      href={`/stocks/${symbol}`}
      className={`${baseClasses} cursor-pointer`}
      title={`View ${symbol} details`}
    >
      {symbol}
    </Link>
  );
}
