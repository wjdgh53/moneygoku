# API 문서

## 주요 API 엔드포인트

### 봇 API
```
GET    /api/bots           - 모든 봇 조회
POST   /api/bots           - 봇 생성
GET    /api/bots/[id]      - 봇 상세
PUT    /api/bots/[id]      - 봇 수정
DELETE /api/bots/[id]      - 봇 삭제
POST   /api/bots/[id]/test - 봇 테스트 실행
POST   /api/bots/[id]/start - 봇 활성화
POST   /api/bots/[id]/stop  - 봇 비활성화
```

### 전략 API
```
GET    /api/strategies     - 모든 전략 조회
POST   /api/strategies     - 전략 생성
GET    /api/strategies/[id] - 전략 상세
PUT    /api/strategies/[id] - 전략 수정
DELETE /api/strategies/[id] - 전략 삭제
```

### 거래 API
```
GET /api/trades           - 모든 거래 내역
GET /api/trades/positions - 현재 포지션
GET /api/trades/history   - 거래 히스토리
```

### 시장 데이터 API
```
GET  /api/market/[symbol]  - 특정 심볼 데이터
POST /api/market/fetch-all - 전체 데이터 갱신
GET  /api/alpha-vantage/indicators - 기술적 지표
```

### 투자 기회 API
```
GET /api/investment-opportunities - 투자 기회 조회
```

### Cron API (Vercel Only)
```
POST /api/cron/short-term  - 단기 봇 실행
POST /api/cron/swing       - 스윙 봇 실행
POST /api/cron/long-term   - 장기 봇 실행
GET  /api/cron/status      - 스케줄러 상태
```

**인증**: Cron API는 `Authorization: Bearer ${CRON_SECRET}` 필요

## 응답 형식

**성공**:
```json
{
  "success": true,
  "data": { /* ... */ }
}
```

**에러**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청
- `401`: 인증 필요
- `404`: 리소스 없음
- `500`: 서버 에러
