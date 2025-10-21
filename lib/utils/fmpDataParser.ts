/**
 * FMP Data Parser for AI Trading Decisions
 *
 * Parses and formats FMP news data into simple, structured text for GPT prompts.
 * Focus: Clear, concise, actionable information for trading decisions.
 */

import {
  FMPStockNews,
  FMPPressRelease,
  FMPSocialSentiment,
  FMPSecFiling,
  FMPInsiderTrade,
  FMPNewsData,
} from '@/lib/types/fmpNews';
import { secDocumentSummaryService } from '@/lib/services/secDocumentSummaryService';

// ========================================
// Type Definitions
// ========================================

/**
 * Parsed FMP data ready for GPT prompt
 */
export interface ParsedFMPData {
  criticalEvents: string;      // 🚨 중요 SEC 문서 + 대규모 내부자 거래
  insiderSignals: string;       // 💼 내부자 거래 신호
  recentNews: string;           // 📰 최근 뉴스
  socialSentiment?: string;     // 📊 소셜 감성 (optional)
  summary: string;              // 전체 요약
}

/**
 * Insider trade signal strength
 */
type InsiderSignal = 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL' | 'NEUTRAL';

// ========================================
// Main Parser Function
// ========================================

/**
 * Parse all FMP data into a structured format for GPT
 */
export async function parseFMPDataForGPT(data: FMPNewsData, symbol: string): Promise<ParsedFMPData> {
  const criticalEvents = await parseCriticalEvents(
    data.secFilings,
    data.insiderTrades,
    data.stockNews,
    data.pressReleases,
    symbol
  );
  const insiderSignals = parseInsiderSignals(data.insiderTrades);
  const recentNews = parseRecentNews(data.stockNews, data.pressReleases);
  const socialSentiment = data.socialSentiment.length > 0
    ? parseSocialSentiment(data.socialSentiment)
    : undefined;

  // Generate summary
  const summary = generateSummary({
    criticalEvents,
    insiderSignals,
    recentNews,
    socialSentiment,
  });

  return {
    criticalEvents,
    insiderSignals,
    recentNews,
    socialSentiment,
    summary,
  };
}

// ========================================
// 1. Critical Events (SEC Filings + Large Insider Trades)
// ========================================

/**
 * Parse critical events from SEC filings and large insider trades
 */
async function parseCriticalEvents(
  secFilings: FMPSecFiling[],
  insiderTrades: FMPInsiderTrade[],
  stockNews: FMPStockNews[],
  pressReleases: FMPPressRelease[],
  symbol: string
): Promise<string> {
  const events: string[] = [];

  // Parse important SEC filings (8-K, 10-K, 10-Q)
  const importantFilings = secFilings.filter(f =>
    ['8-K', '10-K', '10-Q'].includes(f.type)
  ).slice(0, 3); // Top 3 most recent

  if (importantFilings.length > 0) {
    events.push('🚨 중요 SEC 문서:');

    // Process filings sequentially to get AI summaries
    for (const filing of importantFilings) {
      const daysAgo = getDaysAgo(filing.fillingDate);

      // 날짜 매칭해서 실제 사건 내용 찾기
      const filingDate = filing.fillingDate.split(' ')[0]; // "2025-10-07 00:00:00" → "2025-10-07"

      // Stock News와 Press Releases에서 같은 날짜 찾기
      const matchingNews = stockNews.find(n => n.publishedDate.startsWith(filingDate));
      const matchingPress = pressReleases.find(p => p.date.startsWith(filingDate));

      let eventContent = '';
      if (matchingNews) {
        eventContent = matchingNews.title;
      } else if (matchingPress) {
        eventContent = matchingPress.title;
      } else {
        // Try to get AI summary from SEC document
        try {
          const aiSummary = await secDocumentSummaryService.getSummary(
            filing.link,
            symbol,
            filing.type,
            filingDate
          );
          eventContent = aiSummary || getFilingTypeLabel(filing.type);
        } catch (error) {
          console.error(`[FMPParser] Error getting SEC summary for ${symbol}:`, error);
          eventContent = getFilingTypeLabel(filing.type);
        }
      }

      events.push(`  • [${filing.type}] ${eventContent} (${daysAgo}일 전)`);
    }
  }

  // Parse large insider trades (> $100k or > 10% owner)
  const largeTrades = insiderTrades.filter(t =>
    t.securitiesTransacted > 0 &&
    (t.price * t.securitiesTransacted > 100000 || t.typeOfOwner.includes('10 percent'))
  ).slice(0, 2); // Top 2

  if (largeTrades.length > 0) {
    events.push('');
    events.push('💰 대규모 내부자 거래:');
    largeTrades.forEach(trade => {
      const tradeValue = trade.price * trade.securitiesTransacted;
      const action = trade.transactionType.startsWith('P') ? '매수' : '매도';
      const daysAgo = getDaysAgo(trade.transactionDate);
      events.push(`  • ${trade.reportingName} (${trade.typeOfOwner}): ${action} $${formatNumber(tradeValue)} (${daysAgo}일 전)`);
    });
  }

  return events.length > 0
    ? events.join('\n')
    : '중요 이벤트 없음';
}

/**
 * Get filing type human-readable label
 */
function getFilingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    '8-K': '중요 사건 보고',
    '10-K': '연간 재무제표',
    '10-Q': '분기 재무제표',
    '3': '최초 내부자 지분 보고',
    '4': '내부자 거래 변동',
  };
  return labels[type] || type;
}

// ========================================
// 2. Insider Trading Signals
// ========================================

/**
 * Parse insider trading signals
 */
function parseInsiderSignals(insiderTrades: FMPInsiderTrade[]): string {
  if (insiderTrades.length === 0) {
    return '내부자 거래 정보 없음';
  }

  // Analyze insider trading patterns (last 30 days)
  const recentTrades = insiderTrades.filter(t => {
    const daysAgo = getDaysAgo(t.transactionDate);
    return daysAgo <= 30 && t.securitiesTransacted > 0;
  });

  if (recentTrades.length === 0) {
    return '최근 30일 내 거래 없음';
  }

  // Count buys vs sells
  let buyCount = 0;
  let sellCount = 0;
  let buyValue = 0;
  let sellValue = 0;

  recentTrades.forEach(trade => {
    const value = trade.price * trade.securitiesTransacted;
    if (trade.transactionType.startsWith('P')) {
      buyCount++;
      buyValue += value;
    } else if (trade.transactionType.startsWith('S')) {
      sellCount++;
      sellValue += value;
    }
  });

  // Determine signal strength
  const signal = getInsiderSignal(buyCount, sellCount, buyValue, sellValue);
  const signalLabel = getInsiderSignalLabel(signal);

  const lines = [
    `💼 내부자 거래 신호: ${signalLabel}`,
    `  • 매수: ${buyCount}건 ($${formatNumber(buyValue)})`,
    `  • 매도: ${sellCount}건 ($${formatNumber(sellValue)})`,
  ];

  // Add top 2 recent trades
  const topTrades = recentTrades.slice(0, 2);
  if (topTrades.length > 0) {
    lines.push('  • 최근 거래:');
    topTrades.forEach(trade => {
      const action = trade.transactionType.startsWith('P') ? '매수' : '매도';
      const daysAgo = getDaysAgo(trade.transactionDate);
      lines.push(`    - ${action} ${formatNumber(trade.securitiesTransacted)}주 @ $${trade.price.toFixed(2)} (${daysAgo}일 전)`);
    });
  }

  return lines.join('\n');
}

/**
 * Determine insider signal strength
 */
function getInsiderSignal(
  buyCount: number,
  sellCount: number,
  buyValue: number,
  sellValue: number
): InsiderSignal {
  // Strong buy: Multiple buys with no sells, or buy value >> sell value
  if (buyCount >= 2 && sellCount === 0) return 'STRONG_BUY';
  if (buyValue > sellValue * 3) return 'STRONG_BUY';

  // Buy: More buys than sells
  if (buyCount > sellCount && buyValue > sellValue) return 'BUY';

  // Strong sell: Multiple sells with no buys
  if (sellCount >= 2 && buyCount === 0) return 'STRONG_SELL';
  if (sellValue > buyValue * 3) return 'STRONG_SELL';

  // Sell: More sells than buys
  if (sellCount > buyCount && sellValue > buyValue) return 'SELL';

  return 'NEUTRAL';
}

/**
 * Get insider signal label with emoji
 */
function getInsiderSignalLabel(signal: InsiderSignal): string {
  const labels: Record<InsiderSignal, string> = {
    STRONG_BUY: '🟢 강한 매수 신호',
    BUY: '🟢 매수 신호',
    NEUTRAL: '⚪ 중립',
    SELL: '🔴 매도 신호',
    STRONG_SELL: '🔴 강한 매도 신호',
  };
  return labels[signal];
}

// ========================================
// 3. Recent News (Stock News + Press Releases)
// ========================================

/**
 * Parse recent news from stock news and press releases
 */
function parseRecentNews(
  stockNews: FMPStockNews[],
  pressReleases: FMPPressRelease[]
): string {
  const allNews = [
    ...stockNews.map(n => ({
      date: n.publishedDate,
      title: n.title,
      text: n.text,
      isPress: false,
    })),
    ...pressReleases.map(p => ({
      date: p.date,
      title: p.title,
      text: p.text,
      isPress: true,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5); // Top 5 most recent

  if (allNews.length === 0) {
    return '최근 뉴스 없음';
  }

  const lines = ['📰 최근 뉴스 (5개):'];

  allNews.forEach((news, idx) => {
    const daysAgo = getDaysAgo(news.date);
    const prefix = news.isPress ? '[공식]' : '[뉴스]';
    lines.push(`  ${idx + 1}. ${prefix} ${news.title} (${daysAgo}일 전)`);
  });

  return lines.join('\n');
}

// ========================================
// 4. Social Sentiment (Optional)
// ========================================

/**
 * Parse social sentiment data
 */
function parseSocialSentiment(sentiments: FMPSocialSentiment[]): string {
  if (sentiments.length === 0) {
    return '소셜 감성 데이터 없음';
  }

  // Get most recent sentiment
  const latest = sentiments[0];
  const avgSentiment = (latest.stocktwitsSentiment + latest.twitterSentiment) / 2;

  const sentimentLabel = getSentimentLabel(avgSentiment);
  const totalPosts = latest.stocktwitsPosts + latest.twitterPosts;

  return [
    `📊 소셜 감성: ${sentimentLabel} (${avgSentiment.toFixed(2)})`,
    `  • 총 게시물: ${formatNumber(totalPosts)}개`,
    `  • StockTwits: ${latest.stocktwitsSentiment.toFixed(2)} (${formatNumber(latest.stocktwitsPosts)}개)`,
    `  • Twitter: ${latest.twitterSentiment.toFixed(2)} (${formatNumber(latest.twitterPosts)}개)`,
  ].join('\n');
}

/**
 * Get sentiment label
 */
function getSentimentLabel(sentiment: number): string {
  if (sentiment > 0.3) return '🟢 긍정';
  if (sentiment > 0.1) return '🟡 약한 긍정';
  if (sentiment > -0.1) return '⚪ 중립';
  if (sentiment > -0.3) return '🟠 약한 부정';
  return '🔴 부정';
}

// ========================================
// 5. Summary Generation
// ========================================

/**
 * Generate overall summary
 */
function generateSummary(sections: {
  criticalEvents: string;
  insiderSignals: string;
  recentNews: string;
  socialSentiment?: string;
}): string {
  const parts = [
    sections.criticalEvents,
    sections.insiderSignals,
    sections.recentNews,
  ];

  if (sections.socialSentiment) {
    parts.push(sections.socialSentiment);
  }

  return parts.join('\n\n');
}

// ========================================
// Utility Functions
// ========================================

/**
 * Calculate days ago from date string
 */
function getDaysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format large numbers (e.g., 1000000 -> 1.0M)
 */
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toFixed(0);
  }
}

// ========================================
// Export
// ========================================

export {
  parseCriticalEvents,
  parseInsiderSignals,
  parseRecentNews,
  parseSocialSentiment,
  generateSummary,
};
