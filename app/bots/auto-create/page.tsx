'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StockTypeSelector from '@/components/auto-bot/StockTypeSelector';
import StockList from '@/components/auto-bot/StockList';
import LoadingSkeleton from '@/components/auto-bot/LoadingSkeleton';
import CreationSuccessModal from '@/components/auto-bot/CreationSuccessModal';
import {
  StockType,
  ScreenedStock,
  StockScreenerResponse,
  BulkBotCreationResponse
} from '@/lib/types/autoBotCreator';

export default function AutoBotCreatorPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'select' | 'review' | 'confirm'>(
    'select'
  );

  // Step 1: Selection state
  const [selectedType, setSelectedType] = useState<StockType | null>(null);
  const [selectedLimit, setSelectedLimit] = useState(10);

  // Step 2: Review state
  const [stocks, setStocks] = useState<ScreenedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3: Success state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [creationResult, setCreationResult] = useState<BulkBotCreationResponse | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);

  // Auto-assign strategy based on volatility
  const assignStrategy = (volatility: number) => {
    if (volatility > 50) {
      return {
        id: 'auto-aggressive',
        name: 'High Volatility - Aggressive',
        timeHorizon: 'SHORT_TERM' as const,
        riskLevel: 'AGGRESSIVE' as const
      };
    } else if (volatility > 20) {
      return {
        id: 'auto-balanced',
        name: 'Medium Volatility - Balanced',
        timeHorizon: 'SWING' as const,
        riskLevel: 'BALANCED' as const
      };
    } else {
      return {
        id: 'auto-defensive',
        name: 'Low Volatility - Conservative',
        timeHorizon: 'LONG_TERM' as const,
        riskLevel: 'DEFENSIVE' as const
      };
    }
  };

  // Handle finding stocks
  const handleFindStocks = async () => {
    if (!selectedType) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch stocks
      const response = await fetch(
        `/api/stocks/screener?type=${selectedType}&limit=${selectedLimit}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stocks');
      }

      const data: StockScreenerResponse = await response.json();

      // Check if API returned an error message (e.g., Alpha Vantage down)
      if ('error' in data && data.error) {
        setError(data.error as string);
        setLoading(false);
        return;
      }

      // Fetch available strategies from database
      const strategiesRes = await fetch('/api/strategies');
      const strategies = await strategiesRes.json();

      // Ensure we have at least one strategy
      if (strategies.length === 0) {
        throw new Error('No strategies available. Please create at least one strategy first.');
      }

      // Assign strategy and fund allocation to each stock
      const stocksWithStrategy = data.stocks.map((stock) => {
        const autoStrategy = assignStrategy(stock.volatility);

        // Find matching strategy from database
        let dbStrategy = strategies.find((s: any) =>
          s.timeHorizon === autoStrategy.timeHorizon &&
          s.riskAppetite === autoStrategy.riskLevel
        );

        // If no exact match, use the first available strategy as fallback
        if (!dbStrategy) {
          dbStrategy = strategies[0];
        }

        return {
          ...stock,
          fundAllocation: 1000,
          suggestedStrategy: {
            id: dbStrategy.id,
            name: dbStrategy.name,
            timeHorizon: dbStrategy.timeHorizon,
            riskLevel: dbStrategy.riskAppetite
          }
        };
      });

      setStocks(stocksWithStrategy);
      setCurrentStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stocks. Please try again.');
      console.error('Error fetching stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle stock updates
  const handleUpdateStock = (index: number, updatedStock: ScreenedStock) => {
    const newStocks = [...stocks];
    newStocks[index] = updatedStock;
    setStocks(newStocks);
  };

  const handleRemoveStock = (index: number) => {
    setStocks(stocks.filter((_, i) => i !== index));
  };

  const handleBulkEdit = (allocation: number) => {
    setStocks(
      stocks.map((stock) => ({
        ...stock,
        fundAllocation: allocation
      }))
    );
  };

  // Handle bulk bot creation
  const handleCreateBots = async () => {
    if (stocks.length === 0) return;

    const confirmed = confirm(
      `Create ${stocks.length} bot${stocks.length !== 1 ? 's' : ''} with total investment of $${stocks
        .reduce((sum, s) => sum + (s.fundAllocation || 1000), 0)
        .toLocaleString()}?`
    );

    if (!confirmed) return;

    setIsCreating(true);
    setError(null);

    try {
      const requestBody = {
        bots: stocks.map((stock) => ({
          name: `${stock.symbol} Auto Bot`,
          symbol: stock.symbol,
          fundAllocation: stock.fundAllocation || 1000,
          strategyId: stock.suggestedStrategy!.id
        }))
      };

      console.log('Creating bots with request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('/api/bots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Bot creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create bots');
      }

      const result: BulkBotCreationResponse = await response.json();
      console.log('Bot creation result:', result);
      setCreationResult(result);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create bots. Please try again.');
      console.error('Error creating bots:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
            <span className="text-5xl">🎯</span>
            Auto Bot Creator
          </h1>
          <p className="text-lg text-gray-600">
            Automatically create multiple trading bots with pre-matched strategies
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {[
              { number: 1, label: 'Select Type', step: 'select' },
              { number: 2, label: 'Review & Customize', step: 'review' },
              { number: 3, label: 'Create Bots', step: 'confirm' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all duration-300 ${
                      currentStep === item.step
                        ? 'bg-blue-600 text-white scale-110 shadow-lg'
                        : index <
                          ['select', 'review', 'confirm'].indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < ['select', 'review', 'confirm'].indexOf(currentStep) ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      item.number
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div
                      className={`text-sm font-semibold ${
                        currentStep === item.step
                          ? 'text-blue-600'
                          : index <
                            ['select', 'review', 'confirm'].indexOf(currentStep)
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {item.label}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < 2 && (
                  <div
                    className={`h-1 flex-1 mx-4 rounded-full transition-colors duration-300 ${
                      index < ['select', 'review', 'confirm'].indexOf(currentStep)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          {/* Step 1: Select Stock Type */}
          {currentStep === 'select' && (
            <div>
              <StockTypeSelector
                selectedType={selectedType}
                onSelect={setSelectedType}
                selectedLimit={selectedLimit}
                onLimitChange={setSelectedLimit}
              />

              {/* Action Button */}
              <div className="flex justify-end mt-8">
                <button
                  onClick={handleFindStocks}
                  disabled={!selectedType || loading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Finding Stocks...</span>
                    </>
                  ) : (
                    <>
                      <span>Find Stocks</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Stocks */}
          {currentStep === 'review' && (
            <div>
              {loading ? (
                <LoadingSkeleton />
              ) : (
                <StockList
                  stocks={stocks}
                  onUpdateStock={handleUpdateStock}
                  onRemoveStock={handleRemoveStock}
                  onBulkEdit={handleBulkEdit}
                />
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('select')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>

                <button
                  onClick={handleCreateBots}
                  disabled={stocks.length === 0 || isCreating}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating {stocks.length} Bots...</span>
                    </>
                  ) : (
                    <>
                      <span>Create {stocks.length} Bot{stocks.length !== 1 ? 's' : ''}</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back to Bots Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/bots')}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center mx-auto space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>Back to Bots</span>
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <CreationSuccessModal
        show={showSuccessModal}
        result={creationResult}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/bots');
        }}
      />
    </div>
  );
}
