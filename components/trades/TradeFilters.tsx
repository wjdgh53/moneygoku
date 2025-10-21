import { useState } from 'react';

export interface TradeFiltersState {
  source: 'all' | 'database' | 'alpaca';
  botId?: string;
  symbol?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface TradeFiltersProps {
  filters: TradeFiltersState;
  onFiltersChange: (filters: TradeFiltersState) => void;
  availableBots?: { id: string; name: string }[];
}

export default function TradeFilters({ filters, onFiltersChange, availableBots = [] }: TradeFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSourceChange = (source: 'all' | 'database' | 'alpaca') => {
    onFiltersChange({ ...filters, source });
  };

  const handleBotChange = (botId: string) => {
    onFiltersChange({ ...filters, botId: botId || undefined });
  };

  const handleSymbolChange = (symbol: string) => {
    onFiltersChange({ ...filters, symbol: symbol || undefined });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const dateRange = filters.dateRange || { start: '', end: '' };
    onFiltersChange({
      ...filters,
      dateRange: { ...dateRange, [field]: value }
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      source: 'all',
      botId: undefined,
      symbol: undefined,
      dateRange: undefined
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">필터</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showAdvanced ? '간단히' : '고급 필터'}
          </button>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Data Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            데이터 소스
          </label>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: '전체' },
              { value: 'database', label: '데이터베이스' },
              { value: 'alpaca', label: 'Alpaca API' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleSourceChange(option.value as any)}
                className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                  filters.source === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Symbol Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종목 심볼
            </label>
            <input
              type="text"
              value={filters.symbol || ''}
              onChange={(e) => handleSymbolChange(e.target.value)}
              placeholder="예: AAPL, NVDA"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Bot Filter */}
          {availableBots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                봇
              </label>
              <select
                value={filters.botId || ''}
                onChange={(e) => handleBotChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">모든 봇</option>
                {availableBots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">날짜 범위</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(filters.botId || filters.symbol || filters.dateRange) && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {filters.symbol && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                종목: {filters.symbol}
                <button
                  onClick={() => handleSymbolChange('')}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            )}
            {filters.botId && availableBots.find(b => b.id === filters.botId) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                봇: {availableBots.find(b => b.id === filters.botId)?.name}
                <button
                  onClick={() => handleBotChange('')}
                  className="ml-1 text-green-500 hover:text-green-700"
                >
                  ×
                </button>
              </span>
            )}
            {filters.dateRange && (filters.dateRange.start || filters.dateRange.end) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                날짜: {filters.dateRange.start || '시작'} ~ {filters.dateRange.end || '종료'}
                <button
                  onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                  className="ml-1 text-purple-500 hover:text-purple-700"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}