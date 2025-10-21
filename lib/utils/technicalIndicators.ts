// Technical Indicator Calculation Utilities

export interface MarketDataPoint {
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

export interface TechnicalIndicatorResults {
  sma20: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
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
}

export class TechnicalIndicatorCalculator {

  // Simple Moving Average
  static calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  // Exponential Moving Average
  static calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // Relative Strength Index
  static calculateRSI(data: MarketDataPoint[], period: number = 14): number | null {
    if (data.length < period + 1) return null;

    const closes = data.map(d => d.close);
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate gains and losses
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < period) return null;

    // Calculate average gains and losses
    const avgGain = this.calculateSMA(gains.slice(-period), period) || 0;
    const avgLoss = this.calculateSMA(losses.slice(-period), period) || 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  // MACD Calculation
  static calculateMACD(data: MarketDataPoint[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  } {
    const closes = data.map(d => d.close);

    const ema12 = this.calculateEMA(closes, fastPeriod);
    const ema26 = this.calculateEMA(closes, slowPeriod);

    if (ema12 === null || ema26 === null) {
      return { macdLine: null, signalLine: null, histogram: null };
    }

    const macdLine = ema12 - ema26;

    // For signal line, we need MACD history - simplified for now
    const signalLine = macdLine; // This would need proper EMA calculation on MACD values
    const histogram = macdLine - signalLine;

    return {
      macdLine,
      signalLine,
      histogram
    };
  }

  // Bollinger Bands
  static calculateBollingerBands(data: MarketDataPoint[], period: number = 20, stdDev: number = 2): {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  } {
    const closes = data.map(d => d.close);

    if (closes.length < period) {
      return { upper: null, middle: null, lower: null };
    }

    const sma = this.calculateSMA(closes, period);
    if (sma === null) return { upper: null, middle: null, lower: null };

    // Calculate standard deviation
    const recentCloses = closes.slice(-period);
    const variance = recentCloses.reduce((acc, close) => acc + Math.pow(close - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  // Calculate all indicators
  static calculateAllIndicators(data: MarketDataPoint[]): TechnicalIndicatorResults {
    const closes = data.map(d => d.close);

    return {
      sma20: this.calculateSMA(closes, 20),
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26),
      rsi14: this.calculateRSI(data, 14),
      macd: this.calculateMACD(data),
      bollingerBands: this.calculateBollingerBands(data)
    };
  }
}