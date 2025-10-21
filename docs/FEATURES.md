# 주요 기능

## 1. AI 기반 트레이딩

### 2단계 의사결정
1. **객관적 점수**: 기술적 지표 + 뉴스 감성
2. **GPT 조정**: AI가 뉴스/애널리스트/SEC 분석 후 최종 조정 (-0.5 ~ +0.5)

### Kelly Criterion
- 점수에 따라 투자 비율 자동 계산
- 리스크 자동 관리

## 2. 트레이딩 전략

### 기술적 지표
- RSI, MACD, Bollinger Bands, SMA/EMA, Stochastic

### 리스크 관리
- Stop Loss: 자동 손절매
- Take Profit: 자동 익절매
- Position Dampening: 과도한 매수 방지

## 3. 자동 실행

### Vercel Cron Jobs
- Short-term: 30분마다
- Swing: 하루 3번
- Long-term: 하루 1번

## 4. 투자 기회 발견

### 자동 스크리닝
- 기술적 신호 감지
- 뉴스 감성 분석
- 애널리스트 평가
- SEC 공시 모니터링

### AI 요약
- GPT가 각 기회를 자연어로 요약
- 투자 포인트 명확화
