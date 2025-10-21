// Types for Auto Bot Creator

export type StockType = 'top_gainers' | 'top_losers' | 'most_active';

export interface ScreenedStock {
  symbol: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  volume: number;
  source: string;
  fetchedAt: string;
  volatility: number;
  momentum: number;
  liquidity: number;
  // Suggested strategy (will be added by frontend)
  suggestedStrategy?: {
    id: string;
    name: string;
    timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
    riskLevel: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';
  };
  // User-editable allocation
  fundAllocation?: number;
}

export interface StockScreenerRequest {
  type: StockType;
  limit: number;
}

export interface StockScreenerResponse {
  stocks: ScreenedStock[];
  screenerType: StockType;
  timestamp: string;
  totalFound: number;
}

export interface BulkBotCreationRequest {
  bots: {
    name: string;
    symbol: string;
    fundAllocation: number;
    strategyId: string;
  }[];
}

export interface BulkBotCreationResponse {
  created: {
    success: true;
    bot: {
      id: string;
      name: string;
      symbol: string;
      strategyId: string;
      fundAllocation: number;
    };
  }[];
  failed: {
    success: false;
    error: {
      code: string;
      message: string;
      symbol: string;
    };
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
