/**
 * FMP Analyst Ratings Service
 *
 * 애널리스트 레이팅 업/다운그레이드 데이터 수집
 * API 제한: 월 250회 (봇 생성 시에만 호출)
 */

export interface AnalystChange {
  company: string;
  from: string;
  to: string;
  date: string;
}

export interface AnalystRating {
  latestChange: {
    gradingCompany: string;
    previousGrade: string;
    newGrade: string;
    publishedDate: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
  } | null;
  consensus: 'BUY' | 'SELL' | 'HOLD';
  totalChanges: number;
  changes: AnalystChange[];
  fetchedAt: string;
}

interface FMPRatingResponse {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  newsBaseURL: string;
  newsPublisher: string;
  newGrade: string;
  previousGrade: string;
  gradingCompany: string;
}

class FMPAnalystService {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v4';

  constructor() {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY is not set');
    }
    this.apiKey = apiKey;
  }

  /**
   * FMP API로부터 업그레이드/다운그레이드 데이터 가져오기
   */
  private async fetchUpgradesDowngrades(symbol: string): Promise<FMPRatingResponse[]> {
    const url = `${this.baseUrl}/upgrades-downgrades?symbol=${symbol}&apikey=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.statusText}`);
      }

      const data = await response.json();

      // 에러 메시지가 포함된 경우
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      return data || [];

    } catch (error: any) {
      console.error('❌ FMP API fetch error:', error);
      throw error;
    }
  }

  /**
   * 레이팅 변경을 BUY/SELL/HOLD 신호로 해석
   */
  private interpretRatingChange(previousGrade: string, newGrade: string): 'BUY' | 'SELL' | 'HOLD' {
    const bullishGrades = [
      'Strong Buy',
      'Buy',
      'Overweight',
      'Outperform',
    ];

    const bearishGrades = [
      'Strong Sell',
      'Sell',
      'Underweight',
      'Underperform',
    ];

    const neutralGrades = [
      'Hold',
      'Neutral',
      'Equal-Weight',
      'Equal Weight',
      'Market Perform',
    ];

    const wasBullish = bullishGrades.some(grade => previousGrade.toLowerCase().includes(grade.toLowerCase()));
    const isBullish = bullishGrades.some(grade => newGrade.toLowerCase().includes(grade.toLowerCase()));
    const wasBearish = bearishGrades.some(grade => previousGrade.toLowerCase().includes(grade.toLowerCase()));
    const isBearish = bearishGrades.some(grade => newGrade.toLowerCase().includes(grade.toLowerCase()));
    const wasNeutral = neutralGrades.some(grade => previousGrade.toLowerCase().includes(grade.toLowerCase()));
    const isNeutral = neutralGrades.some(grade => newGrade.toLowerCase().includes(grade.toLowerCase()));

    // 상향 조정
    if (!wasBullish && isBullish) return 'BUY';
    if (wasBearish && !isBearish) return 'BUY';
    if (wasNeutral && isBullish) return 'BUY';

    // 하향 조정
    if (wasBullish && !isBullish) return 'SELL';
    if (!wasBearish && isBearish) return 'SELL';
    if (isNeutral && wasBullish) return 'SELL';

    // 변화 없음
    return 'HOLD';
  }

  /**
   * 여러 레이팅 변경으로부터 합의 신호 도출
   */
  private calculateConsensus(changes: FMPRatingResponse[]): 'BUY' | 'SELL' | 'HOLD' {
    if (changes.length === 0) return 'HOLD';

    // 최근 30일 이내의 변경만 고려
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentChanges = changes.filter(change => {
      const publishedDate = new Date(change.publishedDate);
      return publishedDate >= thirtyDaysAgo;
    });

    if (recentChanges.length === 0) return 'HOLD';

    let buySignals = 0;
    let sellSignals = 0;
    let holdSignals = 0;

    recentChanges.forEach(change => {
      const signal = this.interpretRatingChange(change.previousGrade, change.newGrade);
      if (signal === 'BUY') buySignals++;
      else if (signal === 'SELL') sellSignals++;
      else holdSignals++;
    });

    // 합의 판단: 다수결
    if (buySignals > sellSignals && buySignals > holdSignals) return 'BUY';
    if (sellSignals > buySignals && sellSignals > holdSignals) return 'SELL';
    return 'HOLD';
  }

  /**
   * 메인 함수: 애널리스트 레이팅 데이터 가져오기
   */
  async getUpgradesDowngrades(symbol: string): Promise<AnalystRating | null> {
    console.log(`📊 FMP: ${symbol} 애널리스트 레이팅 조회...`);

    try {
      const rawData = await this.fetchUpgradesDowngrades(symbol);

      if (!rawData || rawData.length === 0) {
        console.log(`ℹ️ ${symbol}에 대한 애널리스트 레이팅 변경 없음`);
        return null;
      }

      // 최신 변경 (첫 번째 항목)
      const latest = rawData[0];
      const latestSignal = this.interpretRatingChange(latest.previousGrade, latest.newGrade);

      // 최근 변경 목록 (최대 5개)
      const changes: AnalystChange[] = rawData.slice(0, 5).map(change => ({
        company: change.gradingCompany,
        from: change.previousGrade,
        to: change.newGrade,
        date: change.publishedDate,
      }));

      // 합의 신호 계산
      const consensus = this.calculateConsensus(rawData);

      // 최근 30일 내 변경 횟수
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const totalChanges = rawData.filter(change => {
        const publishedDate = new Date(change.publishedDate);
        return publishedDate >= thirtyDaysAgo;
      }).length;

      const result: AnalystRating = {
        latestChange: {
          gradingCompany: latest.gradingCompany,
          previousGrade: latest.previousGrade,
          newGrade: latest.newGrade,
          publishedDate: latest.publishedDate,
          signal: latestSignal,
        },
        consensus,
        totalChanges,
        changes,
        fetchedAt: new Date().toISOString(),
      };

      console.log(`✅ 애널리스트 레이팅 조회 완료:`);
      console.log(`   최신 변경: ${latest.gradingCompany} - ${latest.previousGrade} → ${latest.newGrade} (${latestSignal})`);
      console.log(`   합의 신호: ${consensus}`);
      console.log(`   최근 30일 변경: ${totalChanges}건`);

      return result;

    } catch (error: any) {
      console.error(`❌ FMP 애널리스트 레이팅 조회 실패 (${symbol}):`, error.message);

      // API 호출 실패 시 null 반환 (봇 생성은 계속 진행)
      return null;
    }
  }

  /**
   * 여러 종목을 배치로 처리 (rate limit 고려)
   */
  async batchGetRatings(symbols: string[]): Promise<Map<string, AnalystRating | null>> {
    const results = new Map<string, AnalystRating | null>();

    for (const symbol of symbols) {
      try {
        const rating = await this.getUpgradesDowngrades(symbol);
        results.set(symbol, rating);

        // Rate limit 방지: 각 호출 사이 1초 대기
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(`❌ ${symbol} 레이팅 조회 실패:`, error.message);
        results.set(symbol, null);
      }
    }

    return results;
  }
}

export const fmpAnalystService = new FMPAnalystService();
