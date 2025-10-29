/**
 * Risk Metrics Grid Component
 *
 * Displays comprehensive risk analytics including:
 * - Value at Risk (VaR) at multiple confidence levels
 * - Conditional Value at Risk (CVaR/Expected Shortfall)
 * - Beta and correlation metrics
 * - Volatility measures
 * - Tail risk indicators
 */

'use client';

import { useMemo } from 'react';

export interface RiskMetricsData {
  // Return series (daily or bar returns)
  returns: number[];

  // Benchmark returns (optional, for beta/correlation)
  benchmarkReturns?: number[];

  // Additional metrics from backtest
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  avgDrawdown?: number;
}

interface RiskMetricsGridProps {
  data: RiskMetricsData;
  confidenceLevels?: number[]; // e.g., [0.90, 0.95, 0.99]
}

// Helper function to calculate percentile
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Calculate VaR (Value at Risk)
function calculateVaR(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;
  const alpha = (1 - confidenceLevel) * 100;
  return percentile(returns, alpha);
}

// Calculate CVaR (Conditional Value at Risk / Expected Shortfall)
function calculateCVaR(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;
  const varThreshold = calculateVaR(returns, confidenceLevel);
  const tailLosses = returns.filter(r => r <= varThreshold);
  if (tailLosses.length === 0) return varThreshold;
  return tailLosses.reduce((sum, r) => sum + r, 0) / tailLosses.length;
}

// Calculate volatility (standard deviation of returns)
function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

// Calculate downside volatility (only negative returns)
function calculateDownsideVolatility(returns: number[]): number {
  const negativeReturns = returns.filter(r => r < 0);
  if (negativeReturns.length === 0) return 0;
  const mean = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
  const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / negativeReturns.length;
  return Math.sqrt(variance);
}

// Calculate skewness
function calculateSkewness(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  const skew = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  return skew;
}

// Calculate kurtosis
function calculateKurtosis(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  const kurt = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
  return kurt - 3; // Excess kurtosis
}

// Calculate correlation
function calculateCorrelation(returns1: number[], returns2: number[]): number {
  if (returns1.length === 0 || returns2.length === 0 || returns1.length !== returns2.length) return 0;

  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  const stdDev1 = Math.sqrt(variance1 / returns1.length);
  const stdDev2 = Math.sqrt(variance2 / returns2.length);

  if (stdDev1 === 0 || stdDev2 === 0) return 0;

  return covariance / (returns1.length * stdDev1 * stdDev2);
}

// Calculate beta
function calculateBeta(returns: number[], benchmarkReturns: number[]): number {
  if (returns.length === 0 || benchmarkReturns.length === 0 || returns.length !== benchmarkReturns.length) return 0;

  const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
  const benchmarkVariance = benchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / benchmarkReturns.length;

  if (benchmarkVariance === 0) return 0;

  const returnsMean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  let covariance = 0;

  for (let i = 0; i < returns.length; i++) {
    covariance += (returns[i] - returnsMean) * (benchmarkReturns[i] - benchmarkMean);
  }

  return (covariance / returns.length) / benchmarkVariance;
}

export function RiskMetricsGrid({
  data,
  confidenceLevels = [0.90, 0.95, 0.99],
}: RiskMetricsGridProps) {
  const metrics = useMemo(() => {
    const { returns, benchmarkReturns } = data;

    // Calculate all risk metrics
    const volatility = calculateVolatility(returns);
    const downsideVol = calculateDownsideVolatility(returns);
    const skewness = calculateSkewness(returns);
    const kurtosis = calculateKurtosis(returns);

    // VaR and CVaR at different confidence levels
    const varMetrics = confidenceLevels.map(cl => ({
      level: cl,
      var: calculateVaR(returns, cl),
      cvar: calculateCVaR(returns, cl),
    }));

    // Benchmark-related metrics
    const correlation = benchmarkReturns ? calculateCorrelation(returns, benchmarkReturns) : null;
    const beta = benchmarkReturns ? calculateBeta(returns, benchmarkReturns) : null;

    // Additional statistics
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const minReturn = returns.length > 0 ? Math.min(...returns) : 0;
    const maxReturn = returns.length > 0 ? Math.max(...returns) : 0;

    // Calculate information ratio if benchmark provided
    const informationRatio = benchmarkReturns ? (() => {
      const trackingError = calculateVolatility(
        returns.map((r, i) => r - (benchmarkReturns[i] || 0))
      );
      return trackingError > 0 ? avgReturn / trackingError : 0;
    })() : null;

    return {
      volatility,
      downsideVol,
      skewness,
      kurtosis,
      varMetrics,
      correlation,
      beta,
      avgReturn,
      minReturn,
      maxReturn,
      informationRatio,
    };
  }, [data, confidenceLevels]);

  // Metric Card Component
  function MetricCard({
    title,
    value,
    subtitle,
    interpretation,
    severity,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    interpretation?: string;
    severity?: 'good' | 'neutral' | 'warning' | 'danger';
  }) {
    const severityColors = {
      good: 'border-green-200 bg-green-50',
      neutral: 'border-gray-200 bg-white',
      warning: 'border-yellow-200 bg-yellow-50',
      danger: 'border-red-200 bg-red-50',
    };

    const valueColors = {
      good: 'text-green-700',
      neutral: 'text-gray-900',
      warning: 'text-yellow-700',
      danger: 'text-red-700',
    };

    return (
      <div className={`rounded-lg border-2 p-4 ${severityColors[severity || 'neutral']}`}>
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
          {title}
        </h4>
        <p className={`text-2xl font-bold ${valueColors[severity || 'neutral']}`}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        {interpretation && (
          <p className="text-xs text-gray-500 mt-2 italic">{interpretation}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Volatility Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Volatility Measures</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total Volatility"
            value={`${(metrics.volatility * 100).toFixed(2)}%`}
            subtitle="Standard deviation of returns"
            interpretation="Lower is more stable"
          />
          <MetricCard
            title="Downside Volatility"
            value={`${(metrics.downsideVol * 100).toFixed(2)}%`}
            subtitle="Volatility of negative returns"
            interpretation="Used in Sortino ratio"
          />
          <MetricCard
            title="Volatility Ratio"
            value={(metrics.downsideVol / metrics.volatility).toFixed(2)}
            subtitle="Downside / Total volatility"
            interpretation="<1 indicates asymmetric risk"
          />
        </div>
      </div>

      {/* Value at Risk (VaR) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Value at Risk (VaR)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.varMetrics.map((vm) => (
            <MetricCard
              key={vm.level}
              title={`VaR ${(vm.level * 100).toFixed(0)}%`}
              value={`${(vm.var * 100).toFixed(2)}%`}
              subtitle={`${((1 - vm.level) * 100).toFixed(0)}% chance of worse loss`}
              severity={vm.var < -10 ? 'danger' : vm.var < -5 ? 'warning' : 'neutral'}
            />
          ))}
        </div>
      </div>

      {/* Conditional Value at Risk (CVaR) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conditional Value at Risk (CVaR / Expected Shortfall)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.varMetrics.map((vm) => (
            <MetricCard
              key={vm.level}
              title={`CVaR ${(vm.level * 100).toFixed(0)}%`}
              value={`${(vm.cvar * 100).toFixed(2)}%`}
              subtitle="Expected loss when VaR is exceeded"
              severity={vm.cvar < -15 ? 'danger' : vm.cvar < -10 ? 'warning' : 'neutral'}
              interpretation={`Avg loss in worst ${((1 - vm.level) * 100).toFixed(0)}% of cases`}
            />
          ))}
        </div>
      </div>

      {/* Distribution Characteristics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Average Return"
            value={`${(metrics.avgReturn * 100).toFixed(2)}%`}
            subtitle="Mean daily return"
            severity={metrics.avgReturn > 0 ? 'good' : 'danger'}
          />
          <MetricCard
            title="Skewness"
            value={metrics.skewness.toFixed(3)}
            subtitle="Distribution asymmetry"
            interpretation={
              metrics.skewness > 0.5
                ? 'Positive skew (more upside potential)'
                : metrics.skewness < -0.5
                ? 'Negative skew (more downside risk)'
                : 'Approximately symmetric'
            }
            severity={metrics.skewness > 0 ? 'good' : metrics.skewness < -0.5 ? 'warning' : 'neutral'}
          />
          <MetricCard
            title="Kurtosis"
            value={metrics.kurtosis.toFixed(3)}
            subtitle="Tail heaviness (excess)"
            interpretation={
              metrics.kurtosis > 1
                ? 'Fat tails (more extreme events)'
                : 'Normal or thin tails'
            }
            severity={metrics.kurtosis > 2 ? 'warning' : 'neutral'}
          />
          <MetricCard
            title="Min/Max Return"
            value={`${(metrics.minReturn * 100).toFixed(2)}% / ${(metrics.maxReturn * 100).toFixed(2)}%`}
            subtitle="Worst and best single-period returns"
          />
        </div>
      </div>

      {/* Benchmark Comparison (if available) */}
      {metrics.beta !== null && metrics.correlation !== null && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Benchmark Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Beta"
              value={metrics.beta.toFixed(3)}
              subtitle="Sensitivity to benchmark"
              interpretation={
                metrics.beta > 1
                  ? 'More volatile than benchmark'
                  : metrics.beta < 1
                  ? 'Less volatile than benchmark'
                  : 'Same volatility as benchmark'
              }
            />
            <MetricCard
              title="Correlation"
              value={metrics.correlation.toFixed(3)}
              subtitle="Relationship to benchmark"
              interpretation={
                Math.abs(metrics.correlation) > 0.7
                  ? 'Strong relationship'
                  : Math.abs(metrics.correlation) > 0.3
                  ? 'Moderate relationship'
                  : 'Weak relationship'
              }
            />
            {metrics.informationRatio !== null && (
              <MetricCard
                title="Information Ratio"
                value={metrics.informationRatio.toFixed(3)}
                subtitle="Excess return / tracking error"
                interpretation="Risk-adjusted outperformance"
                severity={metrics.informationRatio > 0.5 ? 'good' : 'neutral'}
              />
            )}
          </div>
        </div>
      )}

      {/* Risk-Adjusted Performance */}
      {(data.sharpeRatio || data.sortinoRatio || data.maxDrawdown) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk-Adjusted Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {data.sharpeRatio !== undefined && (
              <MetricCard
                title="Sharpe Ratio"
                value={data.sharpeRatio.toFixed(3)}
                subtitle="Return per unit of total risk"
                severity={data.sharpeRatio > 1 ? 'good' : data.sharpeRatio < 0 ? 'danger' : 'neutral'}
              />
            )}
            {data.sortinoRatio !== undefined && (
              <MetricCard
                title="Sortino Ratio"
                value={data.sortinoRatio.toFixed(3)}
                subtitle="Return per unit of downside risk"
                severity={data.sortinoRatio > 1 ? 'good' : data.sortinoRatio < 0 ? 'danger' : 'neutral'}
              />
            )}
            {data.maxDrawdown !== undefined && (
              <MetricCard
                title="Max Drawdown"
                value={`${data.maxDrawdown.toFixed(2)}%`}
                subtitle="Peak-to-trough decline"
                severity={data.maxDrawdown < -20 ? 'danger' : data.maxDrawdown < -10 ? 'warning' : 'neutral'}
              />
            )}
            {data.avgDrawdown !== undefined && (
              <MetricCard
                title="Avg Drawdown"
                value={`${data.avgDrawdown.toFixed(2)}%`}
                subtitle="Average of all drawdowns"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
