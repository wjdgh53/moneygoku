/**
 * SEC Document Summary Service
 *
 * Fetches SEC filing documents (8-K, 10-K, 10-Q) from SEC.gov
 * and generates AI-powered summaries using OpenAI.
 *
 * Features:
 * - HTML parsing from SEC.gov
 * - AI-generated summaries in Korean
 * - In-memory caching (5 minutes)
 * - Error resilience with fallbacks
 */

import OpenAI from 'openai';

/**
 * SEC Document Summary response
 */
export interface SecDocumentSummary {
  symbol: string;
  filingDate: string;
  filingType: string;
  summary: string;       // AI-generated summary (1-2 sentences)
  items: string[];       // Important items found (e.g., ["Item 1.01", "Item 8.01"])
  fetchedAt: Date;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: SecDocumentSummary;
  timestamp: Date;
}

class SecDocumentSummaryService {
  private openai: OpenAI;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly FETCH_TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_HTML_LENGTH = 50000; // Limit HTML size for OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Get summary for SEC document
   * Returns cached result if available, otherwise fetches and summarizes
   */
  async getSummary(
    secLink: string,
    symbol: string,
    filingType: string = '8-K',
    filingDate: string = ''
  ): Promise<string | null> {
    // Check cache first
    const cacheKey = `${symbol}:${filingDate}:${filingType}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[SecSummary] Using cached summary for ${symbol} ${filingType}`);
      return cached.summary;
    }

    try {
      console.log(`[SecSummary] Fetching SEC document: ${secLink}`);

      // 1. Fetch HTML from SEC.gov
      const htmlContent = await this.fetchSecHtml(secLink);
      if (!htmlContent) {
        console.log(`[SecSummary] Failed to fetch HTML for ${symbol}`);
        return null;
      }

      // 2. Parse HTML to extract text and important items
      const { text, items } = this.parseSecHtml(htmlContent, filingType);
      if (!text) {
        console.log(`[SecSummary] No text content found in ${symbol} filing`);
        return null;
      }

      // 3. Generate AI summary
      const summary = await this.generateSummary(symbol, filingType, text, items);
      if (!summary) {
        console.log(`[SecSummary] Failed to generate summary for ${symbol}`);
        return null;
      }

      // 4. Cache result
      const result: SecDocumentSummary = {
        symbol,
        filingDate,
        filingType,
        summary,
        items,
        fetchedAt: new Date()
      };
      this.cache.set(cacheKey, {
        data: result,
        timestamp: new Date()
      });

      console.log(`[SecSummary] ✅ Summary generated for ${symbol}: ${summary}`);
      return summary;

    } catch (error) {
      console.error(`[SecSummary] Error processing ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch SEC HTML document
   */
  private async fetchSecHtml(secLink: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

      const response = await fetch(secLink, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MoneyGoku Trading Bot contact@example.com'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[SecSummary] SEC.gov returned status ${response.status}`);
        return null;
      }

      const html = await response.text();
      return html;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`[SecSummary] Timeout fetching SEC document`);
      } else {
        console.error(`[SecSummary] Error fetching SEC document:`, error);
      }
      return null;
    }
  }

  /**
   * Parse SEC HTML to extract text content and important items
   */
  private parseSecHtml(html: string, filingType: string): { text: string; items: string[] } {
    // Remove HTML tags and scripts
    let text = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit text length for OpenAI
    if (text.length > this.MAX_HTML_LENGTH) {
      text = text.substring(0, this.MAX_HTML_LENGTH);
    }

    // Extract important items for 8-K filings
    const items: string[] = [];
    if (filingType === '8-K') {
      const itemPatterns = [
        /Item\s+1\.01[^\.]*([^\n]{0,100})/i,  // Entry into Material Agreement
        /Item\s+1\.02[^\.]*([^\n]{0,100})/i,  // Termination of Material Agreement
        /Item\s+2\.01[^\.]*([^\n]{0,100})/i,  // Completion of Acquisition
        /Item\s+5\.02[^\.]*([^\n]{0,100})/i,  // Departure of Directors or Officers
        /Item\s+8\.01[^\.]*([^\n]{0,100})/i,  // Other Events
      ];

      itemPatterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match && match[0]) {
          items.push(match[0].trim());
        }
      });
    }

    return { text, items };
  }

  /**
   * Generate AI summary using OpenAI
   */
  private async generateSummary(
    symbol: string,
    filingType: string,
    text: string,
    items: string[]
  ): Promise<string | null> {
    try {
      const itemsText = items.length > 0
        ? `\n\n주요 항목:\n${items.join('\n')}`
        : '';

      const prompt = `당신은 SEC 문서를 분석하는 금융 전문가입니다.

## 종목: ${symbol}
## 문서 타입: ${filingType}
${itemsText}

## SEC 문서 내용:
${text.substring(0, 3000)}

## 작업:
위 SEC ${filingType} 문서의 핵심 내용을 **1-2문장**으로 요약하세요.
투자자가 즉시 이해할 수 있도록 **구체적인 금액, 날짜, 사건**을 포함하세요.

예시:
- "$50M 시리즈 B 투자 유치 및 신규 이사 3명 선임"
- "CEO 사임 및 후임 COO 승진 발표"
- "$100M 규모 인수합병 계약 체결"

## 응답 형식 (JSON):
{
  "summary": "1-2문장 요약"
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 SEC 문서를 간결하게 요약하는 금융 전문가입니다. 항상 JSON 형식으로 응답합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return result.summary || null;

    } catch (error: any) {
      console.error('[SecSummary] OpenAI error:', error.message || error);
      return null;
    }
  }

  /**
   * Get summary from cache
   */
  private getFromCache(key: string): SecDocumentSummary | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date().getTime();
    const age = now - entry.timestamp.getTime();

    if (age < this.CACHE_DURATION_MS) {
      return entry.data;
    }

    // Cache expired
    this.cache.delete(key);
    return null;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[SecSummary] Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const secDocumentSummaryService = new SecDocumentSummaryService();
