# Vercel 배포 가이드

MoneyGoku 프로젝트를 Vercel에 배포하는 완전한 가이드입니다.

## 📋 사전 준비

### 1. GitHub 저장소 준비
```bash
# 모든 변경사항 커밋
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Vercel Postgres 데이터베이스 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. **Storage** → **Create Database** → **Postgres** 선택
3. 데이터베이스 이름 입력 (예: `moneygoku-db`)
4. Region 선택: **Seoul (South Korea)** 권장
5. 생성 후 **Connection String**을 복사해두세요

## 🚀 Vercel 배포 단계

### 1. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/new)로 이동
2. **Import Git Repository** 선택
3. GitHub에서 `moneygoku` 저장소 선택
4. **Import** 클릭

### 2. 환경 변수 설정

**Project Settings** → **Environment Variables**에서 다음 변수들을 추가하세요:

#### 필수 환경 변수:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | Vercel Postgres 연결 문자열 | `postgres://user:pass@host/db?sslmode=require` |
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-proj-...` |
| `ALPACA_API_KEY` | Alpaca API 키 | `PKK5UNQV74...` |
| `ALPACA_SECRET_KEY` | Alpaca Secret 키 | `fMI2RpKCr6...` |
| `ALPHA_VANTAGE_KEY` | Alpha Vantage API 키 | `2GXMYLHV...` |

#### 선택적 환경 변수:

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI 모델 |
| `ALPACA_BASE_URL` | `https://paper-api.alpaca.markets` | Alpaca API URL (Paper Trading) |
| `FMP_API_KEY` | - | Financial Modeling Prep API 키 |

### 3. 데이터베이스 마이그레이션

배포 후 **첫 배포시에만** Vercel에서 데이터베이스를 초기화해야 합니다.

#### 방법 1: Vercel CLI 사용 (권장)

```bash
# Vercel CLI 설치 (한 번만)
npm install -g vercel

# Vercel 프로젝트에 연결
vercel link

# 환경 변수를 로컬로 가져오기
vercel env pull

# Prisma 마이그레이션 실행
npx prisma migrate deploy

# 시드 데이터 삽입 (옵션)
npm run db:seed
```

#### 방법 2: Vercel Dashboard 사용

1. **Deployments** → 최신 배포 선택
2. **Functions** 탭 → 아무 API 함수 선택
3. **Console** 탭에서 다음 명령어 실행:

```bash
npx prisma migrate deploy
```

### 4. Cron Jobs 확인

`vercel.json` 파일에 이미 Cron Jobs가 설정되어 있습니다:

- **Short-term bots**: 4시간마다 (`0 */4 * * *`)
- **Swing bots**: 매일 9시, 15시 (`0 9,15 * * *`)
- **Long-term bots**: 매일 10시 (`0 10 * * *`)

Vercel 대시보드의 **Cron Jobs** 탭에서 자동으로 활성화됩니다.

## ✅ 배포 확인

1. **Deployment URL** 방문 (예: `https://moneygoku.vercel.app`)
2. 다음 기능 테스트:
   - ✅ 메인 페이지 로딩
   - ✅ Bot 생성/조회
   - ✅ 투자 기회 분석
   - ✅ Market Events 조회
   - ✅ Bot 테스트 실행

## 🔧 문제 해결

### 데이터베이스 연결 오류

```
Error: Can't reach database server
```

**해결 방법:**
1. `DATABASE_URL` 환경 변수 확인
2. SSL 모드가 포함되었는지 확인: `?sslmode=require`
3. Vercel Postgres 데이터베이스가 같은 Region에 있는지 확인

### Prisma 마이그레이션 오류

```
Error: Migration engine failed
```

**해결 방법:**
```bash
# 로컬에서 마이그레이션 파일 생성
npx prisma migrate dev --name init

# Vercel에 푸시
git add prisma/migrations
git commit -m "Add Prisma migrations"
git push

# Vercel에서 배포 후 migrate deploy 실행
npx prisma migrate deploy
```

### Cron Jobs가 실행되지 않을 때

1. **Project Settings** → **Crons** 탭 확인
2. Cron Jobs가 활성화되어 있는지 확인
3. **Logs** 탭에서 실행 기록 확인

## 📊 모니터링

### Vercel Analytics
- **Analytics** 탭: 트래픽, 성능 지표
- **Logs** 탭: 실시간 로그 확인
- **Speed Insights**: Core Web Vitals 모니터링

### 권장 사항
- **Error Tracking**: Vercel Log Drains 설정
- **Performance Monitoring**: Vercel Speed Insights 활성화
- **Database Monitoring**: Vercel Postgres 대시보드 정기 확인

## 🔄 업데이트 배포

```bash
# 변경사항 커밋
git add .
git commit -m "Update feature X"
git push

# Vercel이 자동으로 재배포합니다
```

## 💰 비용 관리

### Vercel 무료 플랜 (Hobby)
- ✅ 무제한 배포
- ✅ 100GB 대역폭/월
- ✅ Serverless Functions
- ✅ Cron Jobs (제한적)

### 유료 플랜이 필요한 경우:
- 🔹 더 많은 Cron Jobs 실행
- 🔹 팀 협업 기능
- 🔹 더 많은 대역폭/빌드 시간

### Vercel Postgres 비용:
- **Free tier**: 256MB, 60시간 compute
- **Pro tier**: $20/월부터

## 📝 환경 변수 업데이트

```bash
# Vercel CLI로 환경 변수 추가
vercel env add VARIABLE_NAME

# 또는 대시보드에서:
# Settings → Environment Variables → Add
```

## 🎯 최적화 팁

1. **이미지 최적화**: Next.js `Image` 컴포넌트 사용
2. **캐싱**: API 라우트에서 적절한 `Cache-Control` 헤더 설정
3. **Bundle 크기**: `next build` 결과 확인 및 최적화
4. **Serverless Function 타임아웃**: 복잡한 작업은 10초 이내로 최적화

## 📚 참고 자료

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Alpaca API Documentation](https://alpaca.markets/docs/)

---

**문제가 발생하면:**
- Vercel Dashboard의 Logs 탭 확인
- GitHub Issues에 문의
- [Vercel Community](https://vercel.com/community) 방문
