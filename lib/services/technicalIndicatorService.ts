// Alpha Vantage Technical Indicator Service
import { getAlphaVantageKey } from '@/lib/config/env';

export interface AlphaVantageIndicatorResponse {
  rsi: number | null;
  sma20: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  };
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  stochastic: {
    slowK: number | null;
    slowD: number | null;
  };
}

class TechnicalIndicatorService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';

  constructor() {
    this.API_KEY = getAlphaVantageKey();

    if (!this.API_KEY) {
      throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required. Please set it in your .env.local file.');
    }

    console.log('🔑 Alpha Vantage API Key loaded:', `${this.API_KEY.substring(0, 8)}...`);
  }

  private async fetchIndicator(functionName: string, symbol: string, interval: string, additionalParams: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({
      function: functionName,
      symbol,
      interval,
      apikey: this.API_KEY,
      ...additionalParams
    });

    const url = `${this.BASE_URL}?${params}`;

    try {
      console.log(`🔍 Fetching ${functionName} for ${symbol}...`);
      console.log(`📡 API URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      // Detailed logging of API response
      console.log(`📊 ${functionName} Response Status:`, response.status);
      console.log(`📋 ${functionName} Response Keys:`, Object.keys(data));
      console.log(`📄 ${functionName} Full Response:`, JSON.stringify(data, null, 2));

      if (data['Error Message'] || data['Note']) {
        console.error(`❌ Alpha Vantage API Error:`, data['Error Message'] || data['Note']);
        throw new Error(`Alpha Vantage error: ${data['Error Message'] || data['Note']}`);
      }

      if (data['Information']) {
        console.error(`ℹ️ Alpha Vantage Information:`, data['Information']);

        // Check if it's a rate limit message
        if (data['Information'].includes('rate limit') || data['Information'].includes('25 requests per day')) {
          throw new Error(`Alpha Vantage Rate Limit: ${data['Information']}`);
        }
      }

      return data;
    } catch (error) {
      console.error(`💥 Error fetching ${functionName} for ${symbol}:`, error);
      throw error;
    }
  }

  private getLatestValue(data: any, key: string): number | null {
    if (!data[key]) return null;

    const dates = Object.keys(data[key]);
    if (dates.length === 0) return null;

    const latestDate = dates[0]; // Alpha Vantage returns data in descending order
    const value = data[key][latestDate];

    if (typeof value === 'object') {
      // For indicators that return objects (like MACD, BBANDS)
      return value;
    }

    return parseFloat(value) || null;
  }



  async fetchRSI(symbol: string, interval: string = 'daily', timePeriod: number = 14): Promise<number | null> {
    try {
      const data = await this.fetchIndicator('RSI', symbol, interval, {
        time_period: timePeriod.toString(),
        series_type: 'close'
      });

      if (data['Technical Analysis: RSI']) {
        const rsiData = data['Technical Analysis: RSI'];
        const dates = Object.keys(rsiData);
        if (dates.length > 0) {
          const latestRSI = rsiData[dates[0]]['RSI'];
          return parseFloat(latestRSI);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching RSI:', error);
      return null;
    }
  }

  async fetchSMA(symbol: string, interval: string = 'daily', timePeriod: number = 20): Promise<number | null> {
    try {
      const data = await this.fetchIndicator('SMA', symbol, interval, {
        time_period: timePeriod.toString(),
        series_type: 'close'
      });

      if (data['Technical Analysis: SMA']) {
        const smaData = data['Technical Analysis: SMA'];
        const dates = Object.keys(smaData);
        if (dates.length > 0) {
          const latestSMA = smaData[dates[0]]['SMA'];
          return parseFloat(latestSMA);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching SMA:', error);
      return null;
    }
  }

  async fetchEMA(symbol: string, interval: string = 'daily', timePeriod: number = 12): Promise<number | null> {
    try {
      const data = await this.fetchIndicator('EMA', symbol, interval, {
        time_period: timePeriod.toString(),
        series_type: 'close'
      });

      if (data['Technical Analysis: EMA']) {
        const emaData = data['Technical Analysis: EMA'];
        const dates = Object.keys(emaData);
        if (dates.length > 0) {
          const latestEMA = emaData[dates[0]]['EMA'];
          return parseFloat(latestEMA);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching EMA:', error);
      return null;
    }
  }

  async fetchMACD(symbol: string, interval: string = 'daily'): Promise<{ macdLine: number | null; signalLine: number | null; histogram: number | null }> {
    try {
      const data = await this.fetchIndicator('MACD', symbol, interval, {
        series_type: 'close'
      });

      if (data['Technical Analysis: MACD']) {
        const macdData = data['Technical Analysis: MACD'];
        const dates = Object.keys(macdData);

        if (dates.length > 0) {
          const latestData = macdData[dates[0]];
          return {
            macdLine: parseFloat(latestData['MACD']) || null,
            signalLine: parseFloat(latestData['MACD_Signal']) || null,
            histogram: parseFloat(latestData['MACD_Hist']) || null
          };
        }
      }

      return { macdLine: null, signalLine: null, histogram: null };
    } catch (error) {
      console.error('Error fetching MACD:', error);
      return { macdLine: null, signalLine: null, histogram: null };
    }
  }

  async fetchBollingerBands(symbol: string, interval: string = 'daily', timePeriod: number = 20): Promise<{ upper: number | null; middle: number | null; lower: number | null }> {
    try {
      const data = await this.fetchIndicator('BBANDS', symbol, interval, {
        time_period: timePeriod.toString(),
        series_type: 'close',
        nbdevup: '2',
        nbdevdn: '2',
        matype: '0'
      });

      if (data['Technical Analysis: BBANDS']) {
        const bbandsData = data['Technical Analysis: BBANDS'];
        const dates = Object.keys(bbandsData);

        if (dates.length > 0) {
          const latestData = bbandsData[dates[0]];
          return {
            upper: parseFloat(latestData['Real Upper Band']) || null,
            middle: parseFloat(latestData['Real Middle Band']) || null,
            lower: parseFloat(latestData['Real Lower Band']) || null
          };
        }
      }

      return { upper: null, middle: null, lower: null };
    } catch (error) {
      console.error('Error fetching Bollinger Bands:', error);
      return { upper: null, middle: null, lower: null };
    }
  }

  async fetchStochastic(symbol: string, interval: string = 'daily', fastkperiod: number = 5, slowkperiod: number = 3, slowdperiod: number = 3): Promise<{ slowK: number | null; slowD: number | null }> {
    try {
      const data = await this.fetchIndicator('STOCH', symbol, interval, {
        fastkperiod: fastkperiod.toString(),
        slowkperiod: slowkperiod.toString(),
        slowdperiod: slowdperiod.toString(),
        slowkmatype: '0',
        slowdmatype: '0'
      });

      if (data['Technical Analysis: STOCH']) {
        const stochData = data['Technical Analysis: STOCH'];
        const dates = Object.keys(stochData);

        if (dates.length > 0) {
          const latestData = stochData[dates[0]];
          return {
            slowK: parseFloat(latestData['SlowK']) || null,
            slowD: parseFloat(latestData['SlowD']) || null
          };
        }
      }

      return { slowK: null, slowD: null };
    } catch (error) {
      console.error('Error fetching Stochastic:', error);
      return { slowK: null, slowD: null };
    }
  }


  async fetchCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const params = new URLSearchParams({
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.API_KEY
      });

      const url = `${this.BASE_URL}?${params}`;
      console.log(`💰 Fetching real-time price for ${symbol}...`);

      const response = await fetch(url);
      const data = await response.json();

      console.log(`📊 GLOBAL_QUOTE Response:`, JSON.stringify(data, null, 2));

      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const price = parseFloat(data['Global Quote']['05. price']);
        console.log(`✅ Real-time price for ${symbol}: $${price}`);
        return price;
      }

      if (data['Error Message'] || data['Note'] || data['Information']) {
        console.error(`❌ Alpha Vantage Error:`, data['Error Message'] || data['Note'] || data['Information']);
      }

      return null;
    } catch (error) {
      console.error('Error fetching real-time price:', error);
      return null;
    }
  }

  async fetchAllIndicators(symbol: string, interval: string = 'daily'): Promise<AlphaVantageIndicatorResponse> {
    console.log(`Fetching all indicators for ${symbol} with interval=${interval} from Alpha Vantage API...`);

    try {
      // Add delays between requests to respect API limits (1s for premium)
      const rsi = await this.fetchRSI(symbol, interval, 14);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay

      const sma20 = await this.fetchSMA(symbol, interval, 20);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const ema12 = await this.fetchEMA(symbol, interval, 12);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const ema26 = await this.fetchEMA(symbol, interval, 26);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const macd = await this.fetchMACD(symbol, interval);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const bollingerBands = await this.fetchBollingerBands(symbol, interval, 20);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stochastic = await this.fetchStochastic(symbol, interval);

      console.log(`📊 All indicators fetched for ${symbol}:`, {
        rsi, sma20, ema12, ema26, macd, bollingerBands, stochastic
      });

      return {
        rsi,
        sma20,
        ema12,
        ema26,
        macd,
        bollingerBands,
        stochastic
      };
    } catch (error) {
      console.error(`Error fetching indicators for ${symbol}:`, error);
      throw error;
    }
  }
}

export const technicalIndicatorService = new TechnicalIndicatorService();