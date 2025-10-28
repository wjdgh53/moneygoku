/**
 * Backtesting System - Service Exports
 *
 * Centralized exports for all backtesting services.
 */

export { BacktestController, backtestController } from './backtestController';
export { VirtualPortfolioEngine } from './virtualPortfolioEngine';
export { PerformanceAnalytics, performanceAnalytics } from './performanceAnalytics';
export { HistoricalDataProvider, historicalDataProvider } from './historicalDataProvider';
export { BacktestAlertService, backtestAlertService } from './backtestAlertService';

export type { BacktestConfig } from './backtestController';
