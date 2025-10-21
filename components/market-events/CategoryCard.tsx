/**
 * CategoryCard Component
 * Base wrapper component for market event category cards
 */

import React from 'react';

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

export default function CategoryCard({
  title,
  icon,
  gradientFrom,
  gradientTo,
  children,
  isEmpty = false
}: CategoryCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header with gradient */}
      <div
        className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} px-6 py-4 flex items-center space-x-3`}
      >
        <div className="text-2xl">{icon}</div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>

      {/* Content */}
      <div className="p-6">
        {isEmpty ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
