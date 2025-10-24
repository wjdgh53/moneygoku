// Alpaca Trading Service - Execute real trades via Alpaca API
import { env } from '@/lib/config/env';

export interface AlpacaConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string; // Live trading: https://api.alpaca.markets | Paper trading: https://paper-api.alpaca.markets
}

export interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  qty: number;
  price?: number; // For limit orders
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
}

export interface TradeResponse {
  success: boolean;
  orderId?: string;
  message: string;
  data?: any;
  error?: string;
}

export interface AccountInfo {
  cash: number;
  portfolioValue: number;
  equity: number;
  lastEquity: number;
  buyingPower: number;
  daytradeCount: number;
}

export interface Position {
  symbol: string;
  qty: number;
  side: 'long' | 'short';
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
  currentPrice: number;  // 실시간 현재가
}

class AlpacaTradingService {
  private config: AlpacaConfig;

  constructor() {
    this.config = {
      apiKey: env.ALPACA_API_KEY,
      secretKey: env.ALPACA_SECRET_KEY,
      baseUrl: env.ALPACA_BASE_URL
    };

    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables are required. Please set them in your .env.local file.');
    }

    console.log('🔧 Alpaca API configured:', {
      apiKey: `${this.config.apiKey.substring(0, 10)}...`,
      secretKey: `${this.config.secretKey.substring(0, 10)}...`,
      baseUrl: this.config.baseUrl
    });
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.secretKey,
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any): Promise<any> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      console.log(`📡 Alpaca API ${method} ${url}`);
      console.log(`🔐 Headers:`, this.getHeaders());
      if (body) console.log(`📦 Body:`, body);

      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });

      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Alpaca API Error:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Alpaca API Response:', data);
      return data;
    } catch (error: any) {
      console.error('💥 Alpaca API Request Failed:', error);
      throw error;
    }
  }

  // Get all positions
  async getPositions(): Promise<Position[]> {
    try {
      const positions = await this.makeRequest('/v2/positions');
      return positions.map((pos: any) => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        side: pos.side,
        marketValue: parseFloat(pos.market_value),
        costBasis: parseFloat(pos.cost_basis),
        unrealizedPl: parseFloat(pos.unrealized_pl),
        unrealizedPlpc: parseFloat(pos.unrealized_plpc),
        currentPrice: parseFloat(pos.current_price)  // 실시간 현재가
      }));
    } catch (error: any) {
      console.error('Failed to get positions:', error);
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  // Get specific position
  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const position = await this.makeRequest(`/v2/positions/${symbol}`);
      return {
        symbol: position.symbol,
        qty: parseFloat(position.qty),
        side: position.side,
        marketValue: parseFloat(position.market_value),
        costBasis: parseFloat(position.cost_basis),
        unrealizedPl: parseFloat(position.unrealized_pl),
        unrealizedPlpc: parseFloat(position.unrealized_plpc),
        currentPrice: parseFloat(position.current_price)  // 실시간 현재가
      };
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null; // No position
      }
      throw error;
    }
  }

  /**
   * Get latest real-time price (최신 캔들 종가)
   * @param symbol - Stock symbol (e.g., "AAPL")
   * @returns Latest close price or null if unavailable
   */
  async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      console.log(`💰 Fetching latest Alpaca price for ${symbol}...`);

      const url = `https://data.alpaca.markets/v2/stocks/${symbol}/bars/latest?feed=iex`;
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.config.apiKey,
          'APCA-API-SECRET-KEY': this.config.secretKey
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ Alpaca bars request failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const closePrice = data.bar?.c;

      if (closePrice && closePrice > 0) {
        console.log(`✅ Alpaca latest price for ${symbol}: $${closePrice}`);
        return closePrice;
      }

      console.warn(`⚠️ No valid close price in Alpaca response for ${symbol}`);
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to fetch Alpaca price for ${symbol}:`, error.message);
      return null;
    }
  }

  // Get account information
  async getAccount(): Promise<AccountInfo> {
    try {
      console.log('📊 Fetching Alpaca account information...');
      const account = await this.makeRequest('/v2/account');

      const accountInfo: AccountInfo = {
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        lastEquity: parseFloat(account.last_equity),
        buyingPower: parseFloat(account.buying_power),
        daytradeCount: parseInt(account.daytrade_count)
      };

      console.log('✅ Account info:', {
        cash: `$${accountInfo.cash.toFixed(2)}`,
        portfolioValue: `$${accountInfo.portfolioValue.toFixed(2)}`,
        equity: `$${accountInfo.equity.toFixed(2)}`
      });

      return accountInfo;
    } catch (error: any) {
      console.error('❌ Failed to get account info:', error);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  // Execute a trade
  async executeTrade(trade: TradeRequest): Promise<TradeResponse> {
    try {
      const isLiveTrading = this.config.baseUrl.includes('api.alpaca.markets');

      // 🆕 Limit order 가격 최종 검증 및 반올림
      let finalPrice = trade.price;
      if (trade.type === 'limit' && trade.price !== undefined) {
        finalPrice = trade.price >= 1
          ? parseFloat(trade.price.toFixed(2))
          : parseFloat(trade.price.toFixed(4));

        if (finalPrice !== trade.price) {
          console.log(`🔧 [executeTrade] 가격 반올림: $${trade.price} → $${finalPrice}`);
        }
      }

      const tradeValue = trade.qty * (finalPrice || 0);

      console.log(`🚀 Executing ${trade.side.toUpperCase()} order for ${trade.qty} shares of ${trade.symbol}`);
      if (isLiveTrading) {
        console.log(`⚠️ LIVE TRADING ALERT: This will execute a real trade worth ~$${tradeValue.toFixed(2)}`);
      }

      if (!this.config.apiKey || !this.config.secretKey) {
        return {
          success: false,
          message: 'Alpaca API credentials not configured',
          error: 'Missing API credentials'
        };
      }

      const orderData = {
        symbol: trade.symbol,
        qty: trade.qty.toString(),
        side: trade.side,
        type: trade.type,
        time_in_force: trade.timeInForce || 'day',
        ...(finalPrice && { limit_price: finalPrice.toString() })  // 🆕 반올림된 가격 사용
      };

      const response = await this.makeRequest('/v2/orders', 'POST', orderData);

      return {
        success: true,
        orderId: response.id,
        message: `${trade.side.toUpperCase()} order placed for ${trade.qty} shares of ${trade.symbol}`,
        data: response
      };

    } catch (error: any) {
      console.error(`💥 Trade execution failed:`, error);
      return {
        success: false,
        message: `Trade failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Calculate trade size based on account balance and risk percentage
  async calculateTradeSize(symbol: string, currentPrice: number, riskPercent: number = 1, allocatedFund?: number): Promise<number> {
    try {
      const account = await this.getAccount();

      // Use allocatedFund if provided, otherwise use portfolio value
      const baseAmount = allocatedFund !== undefined ? allocatedFund : account.portfolioValue;
      const riskAmount = baseAmount * (riskPercent / 100);
      const maxShares = Math.floor(riskAmount / currentPrice);

      console.log(`💰 Trade size calculation for ${symbol}:`);
      console.log(`   Base amount: $${baseAmount} ${allocatedFund !== undefined ? '(allocated fund)' : '(portfolio value)'}`);
      console.log(`   Risk percent: ${riskPercent}%`);
      console.log(`   Risk amount: $${riskAmount}`);
      console.log(`   Current price: $${currentPrice}`);
      console.log(`   Max shares: ${maxShares}`);

      // Live trading safety: conservative position sizing
      const isLiveTrading = this.config.baseUrl.includes('api.alpaca.markets');
      if (isLiveTrading) {
        // Max $500 per trade for live trading safety (or use allocated fund if smaller)
        const maxLiveTradeAmount = allocatedFund !== undefined ? Math.min(allocatedFund, 500) : 500;
        const maxLiveShares = Math.floor(maxLiveTradeAmount / currentPrice);
        const safeShares = Math.min(maxShares, maxLiveShares);
        console.log(`🛡️ Live trading safety: Max ${safeShares} shares ($${safeShares * currentPrice})`);
        return Math.max(1, safeShares);
      }

      // Paper trading: respect allocated fund limits
      if (allocatedFund !== undefined && allocatedFund < riskAmount) {
        const allocatedShares = Math.floor(allocatedFund / currentPrice);
        console.log(`📊 Allocated fund limit: ${allocatedShares} shares ($${allocatedShares * currentPrice})`);
        return Math.max(1, allocatedShares);
      }

      // Minimum 1 share, maximum based on risk
      return Math.max(1, maxShares);
    } catch (error) {
      console.error('Failed to calculate trade size:', error);
      return 1; // Default to 1 share
    }
  }

  // Get all orders
  async getOrders(status?: 'open' | 'closed' | 'all'): Promise<any[]> {
    try {
      const endpoint = status ? `/v2/orders?status=${status}` : '/v2/orders';
      return await this.makeRequest(endpoint);
    } catch (error: any) {
      console.error('Failed to get orders:', error);
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  // 🆕 Get specific order by ID
  async getOrder(orderId: string): Promise<any> {
    try {
      console.log(`📋 Fetching order status: ${orderId}`);
      const order = await this.makeRequest(`/v2/orders/${orderId}`);
      console.log(`✅ Order ${orderId} status: ${order.status}`);
      return order;
    } catch (error: any) {
      console.error(`❌ Failed to get order ${orderId}:`, error);
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  // Cancel all open orders
  async cancelAllOrders(): Promise<void> {
    try {
      await this.makeRequest('/v2/orders', 'DELETE');
      console.log('✅ All open orders cancelled');
    } catch (error: any) {
      console.error('Failed to cancel orders:', error);
      throw new Error(`Failed to cancel orders: ${error.message}`);
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccount();
      console.log('✅ Alpaca API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Alpaca API connection failed:', error);
      return false;
    }
  }

  /**
   * 🆕 Place limit order (with order status verification)
   */
  async placeLimitOrder(
    symbol: string,
    quantity: number,
    side: 'buy' | 'sell',
    limitPrice: number,
    botId?: string
  ): Promise<TradeResponse> {
    // 🆕 Alpaca 가격 규칙 최종 확인: $1 이상은 소수점 2자리, $1 미만은 4자리
    const roundedLimitPrice = limitPrice >= 1
      ? parseFloat(limitPrice.toFixed(2))
      : parseFloat(limitPrice.toFixed(4));

    console.log(`🔧 가격 반올림: $${limitPrice} → $${roundedLimitPrice}`);

    const trade: TradeRequest = {
      symbol,
      qty: quantity,
      side,
      type: 'limit',
      price: roundedLimitPrice,  // 🆕 반올림된 가격 사용
      timeInForce: 'day' // 당일 유효
    };

    console.log(`📝 리미트 오더 생성:`, {
      symbol,
      side: side.toUpperCase(),
      quantity,
      limitPrice: `$${roundedLimitPrice.toFixed(2)}`,
      botId: botId || 'N/A'
    });

    const result = await this.executeTrade(trade);

    // 🆕 주문 체결 상태 확인
    if (result.success && result.orderId) {
      try {
        console.log(`⏳ 주문 상태 확인 중... (2초 대기)`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const orderStatus = await this.getOrder(result.orderId);

        console.log(`\n📊 주문 체결 상태 상세:`);
        console.log(`   주문 ID: ${result.orderId}`);
        console.log(`   상태: ${orderStatus.status}`);
        console.log(`   체결 수량: ${orderStatus.filled_qty || 0}/${quantity}`);
        console.log(`   리미트 가격: $${limitPrice.toFixed(2)}`);

        if (orderStatus.status === 'pending_new' || orderStatus.status === 'new' || orderStatus.status === 'accepted') {
          console.warn(`⚠️ 주문이 아직 체결되지 않음!`);
          console.warn(`   가능한 원인:`);
          console.warn(`   1. 리미트 가격이 시장가와 차이가 큼`);
          console.warn(`   2. 유동성 부족`);
          console.warn(`   3. 시장 마감 시간`);

          result.message += ` (주문 제출됨, 아직 미체결: ${orderStatus.status})`;
        } else if (orderStatus.status === 'filled') {
          console.log(`✅ 주문 체결 완료!`);
          result.message += ` (체결 완료)`;
        } else if (orderStatus.status === 'partially_filled') {
          console.warn(`⚠️ 부분 체결: ${orderStatus.filled_qty}/${quantity}주`);
          result.message += ` (부분 체결: ${orderStatus.filled_qty}/${quantity})`;
        } else if (orderStatus.status === 'canceled' || orderStatus.status === 'expired') {
          console.error(`❌ 주문 취소됨 또는 만료됨: ${orderStatus.status}`);
          result.message += ` (주문 ${orderStatus.status})`;
        }

      } catch (statusError) {
        console.error(`⚠️ 주문 상태 확인 실패 (주문 자체는 성공):`, statusError);
      }
    }

    return result;
  }
}

export const alpacaTradingService = new AlpacaTradingService();