import { StockType } from '@/lib/types/autoBotCreator';

interface StockTypeSelectorProps {
  selectedType: StockType | null;
  onSelect: (type: StockType) => void;
  selectedLimit: number;
  onLimitChange: (limit: number) => void;
}

const stockTypeOptions: { value: StockType; label: string; icon: string; color: string; description: string }[] = [
  {
    value: 'top_gainers',
    label: 'Top Gainers',
    icon: '📈',
    color: 'from-green-500 to-emerald-600',
    description: 'Stocks with highest price increase today'
  },
  {
    value: 'top_losers',
    label: 'Top Losers',
    icon: '📉',
    color: 'from-red-500 to-rose-600',
    description: 'Stocks with highest price decrease today'
  },
  {
    value: 'most_active',
    label: 'Most Active',
    icon: '🔥',
    color: 'from-blue-500 to-indigo-600',
    description: 'Stocks with highest trading volume'
  }
];

const limitOptions = [10, 20, 50];

export default function StockTypeSelector({
  selectedType,
  onSelect,
  selectedLimit,
  onLimitChange
}: StockTypeSelectorProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Select Stock Type</h2>
        <p className="text-gray-600">Choose which type of stocks you want to create bots for</p>
      </div>

      {/* Stock Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stockTypeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
              selectedType === option.value
                ? 'border-blue-500 shadow-xl scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
            }`}
          >
            {/* Selection indicator */}
            {selectedType === option.value && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Icon with gradient */}
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center text-3xl shadow-lg`}>
              {option.icon}
            </div>

            {/* Label */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{option.label}</h3>

            {/* Description */}
            <p className="text-sm text-gray-600">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Limit Selector */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Number of Stocks to Screen
        </label>
        <div className="flex gap-4 justify-center">
          {limitOptions.map((limit) => (
            <button
              key={limit}
              onClick={() => onLimitChange(limit)}
              className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                selectedLimit === limit
                  ? 'bg-blue-600 text-white shadow-lg scale-110'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              {limit} stocks
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
