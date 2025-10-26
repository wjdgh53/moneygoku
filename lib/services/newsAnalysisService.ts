import OpenAI from 'openai';
import { env } from '@/lib/config/env';

export interface NewsArticle {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  source: string;
}

export interface NewsAnalysis {
  articles: NewsArticle[];
  summary: string;
  sentiment: number; // -1.0 (매우 부정) ~ +1.0 (매우 긍정)
  sentimentLabel: 'Very Negative' | 'Negative' | 'Neutral' | 'Positive' | 'Very Positive';
}

class NewsAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Fetch news from Alpha Vantage NEWS_SENTIMENT API
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<NewsArticle[]> {
    const apiKey = env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      console.warn('⚠️ ALPHA_VANTAGE_KEY not set, returning empty news');
      return [];
    }

    try {
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&limit=10&apikey=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.feed && Array.isArray(data.feed)) {
        return data.feed.slice(0, 5).map((item: any) => ({
          title: item.title || 'Untitled',
          url: item.url || '',
          content: item.summary || '',
          publishedDate: item.time_published || new Date().toISOString(),
          source: item.source || 'Unknown'
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Alpha Vantage news fetch error:', error);
      return [];
    }
  }

  /**
   * Analyze news with AI: summary + sentiment
   */
  private async analyzeWithAI(symbol: string, articles: NewsArticle[]): Promise<{ summary: string; sentiment: number; sentimentLabel: string }> {
    if (articles.length === 0) {
      return {
        summary: `${symbol}에 대한 최근 뉴스를 찾을 수 없습니다.`,
        sentiment: 0,
        sentimentLabel: 'Neutral'
      };
    }

    try {
      const articlesText = articles.map((article, idx) =>
        `[${idx + 1}] ${article.title}\n   Source: ${article.source}\n   Content: ${article.content.slice(0, 300)}...`
      ).join('\n\n');

      const prompt = `당신은 금융 뉴스 분석 전문가입니다.

## 분석 대상 종목: ${symbol}

## 최근 뉴스 기사들:
${articlesText}

## 작업:
1. 위 뉴스들을 종합하여 ${symbol} 주식에 대한 핵심 내용을 3-5문장으로 요약하세요.
2. ${symbol} 주식에 대한 전체 감성을 -1.0 ~ +1.0으로 평가하세요.
   - +0.7 ~ +1.0: Very Positive (강한 매수 신호)
   - +0.3 ~ +0.7: Positive (긍정적)
   - -0.3 ~ +0.3: Neutral (중립)
   - -0.7 ~ -0.3: Negative (부정적)
   - -1.0 ~ -0.7: Very Negative (강한 매도 신호)

## 응답 형식 (JSON):
{
  "summary": "뉴스 요약 내용...",
  "sentiment": 0.7,
  "sentimentLabel": "Positive"
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',  // gpt-4o supports json_object format
        messages: [
          {
            role: 'system',
            content: '당신은 금융 뉴스를 분석하는 전문가입니다. 항상 JSON 형식으로 응답합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

      return {
        summary: result.summary || '요약을 생성할 수 없습니다.',
        sentiment: result.sentiment || 0,
        sentimentLabel: result.sentimentLabel || 'Neutral'
      };

    } catch (error: any) {
      console.error('❌ OpenAI analysis error:', error);
      console.error('Error details:', error.message || error);

      // 뉴스는 가져왔지만 AI 분석만 실패한 경우
      const errorMessage = error.message || 'Unknown error';
      return {
        summary: `AI 분석 실패: ${errorMessage}. 뉴스 기사는 아래에서 확인하세요.`,
        sentiment: 0,
        sentimentLabel: 'Neutral'
      };
    }
  }

  /**
   * Main function: Analyze news for a given symbol
   */
  async analyzeNews(symbol: string): Promise<NewsAnalysis> {
    console.log(`📰 Fetching news for ${symbol}...`);

    // 1. Fetch news from Alpha Vantage
    const articles = await this.fetchFromAlphaVantage(symbol);
    console.log(`✅ Found ${articles.length} articles from Alpha Vantage`);

    // 2. Analyze with OpenAI (summary + sentiment)
    const analysis = await this.analyzeWithAI(symbol, articles);
    console.log(`✅ Analysis completed - Sentiment: ${analysis.sentiment} (${analysis.sentimentLabel})`);

    return {
      articles,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      sentimentLabel: analysis.sentimentLabel as any
    };
  }
}

export const newsAnalysisService = new NewsAnalysisService();
