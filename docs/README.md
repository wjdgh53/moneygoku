# MoneyGoku 📈

AI 기반 자동 트레이딩 봇 플랫폼

## 프로젝트 개요

MoneyGoku는 AI를 활용한 자동 주식 트레이딩 봇 시스템입니다. 사용자는 전략을 생성하고, 봇을 설정하여 자동으로 매매를 실행할 수 있습니다.

### 핵심 기술 스택

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **AI**: OpenAI GPT-4o-mini
- **Trading API**: Alpaca Markets (Paper Trading)
- **Market Data**: Alpha Vantage, Financial Modeling Prep
- **Deployment**: Vercel (Serverless)

### 주요 특징

1. **AI 기반 트레이딩 결정**
   - GPT를 활용한 뉴스 감성 분석
   - 기술적 지표 + AI 판단 통합
   - 객관적 점수 계산 + AI 조정

2. **다양한 트레이딩 전략**
   - RSI, MACD, Bollinger Bands 등 기술적 지표
   - 단기/중기/장기 투자 전략
   - 커스텀 엔트리/엑싯 조건 설정

3. **자동화된 봇 관리**
   - Vercel Cron Jobs를 통한 자동 실행
   - 실시간 포지션 추적
   - Stop Loss / Take Profit 자동 실행

4. **투자 기회 발견**
   - AI가 시장에서 투자 기회를 자동 발견
   - 기술적 신호, 뉴스, 애널리스트 평가 종합
   - 개인화된 투자 추천

## 시작하기

### 사전 요구사항

- Node.js 18+
- PostgreSQL 데이터베이스
- Alpaca Markets API 키
- Alpha Vantage API 키
- OpenAI API 키

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

\`\`\`bash
# Database
DATABASE_URL="postgresql://..."

# Trading API (Alpaca)
ALPACA_API_KEY="your_alpaca_api_key"
ALPACA_SECRET_KEY="your_alpaca_secret_key"
ALPACA_BASE_URL="https://paper-api.alpaca.markets"

# Market Data
ALPHA_VANTAGE_KEY="your_alpha_vantage_key"
FMP_API_KEY="your_fmp_api_key"

# AI
OPENAI_API_KEY="your_openai_api_key"
OPENAI_MODEL="gpt-4o-mini"

# Security
CRON_SECRET="your_random_secret"
\`\`\`

### 설치 및 실행

\`\`\`bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma migrate deploy
npx prisma generate

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
\`\`\`

## 프로젝트 구조

\`\`\`
moneygoku/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── bots/              # 봇 관련 페이지
│   ├── strategies/        # 전략 관련 페이지
│   └── ...
├── components/            # React 컴포넌트
│   ├── bot/              # 봇 컴포넌트
│   ├── strategy/         # 전략 컴포넌트
│   └── auto-bot/         # 자동 봇 생성
├── lib/                   # 비즈니스 로직
│   ├── services/         # 핵심 서비스
│   ├── types/            # TypeScript 타입
│   └── utils/            # 유틸리티
├── prisma/               # 데이터베이스 스키마
├── docs/                 # 문서
└── scripts/              # 유틸리티 스크립트
\`\`\`

## 문서

- [주요 기능](./FEATURES.md) - 핵심 기능 상세 설명
- [페이지 가이드](./PAGES.md) - 각 페이지 사용법
- [API 문서](./API.md) - API 엔드포인트 참조
- [배포 가이드](./DEPLOYMENT.md) - Vercel 배포 방법

## 라이선스

Private Project
