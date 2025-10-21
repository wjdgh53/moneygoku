# Tasks: StockHero Clone - Automated Trading Bot Platform

**Input**: Design documents from `/specs/001-docs-stockhero-project/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Next.js 14, TypeScript, Prisma, SQLite, Tailwind CSS
   → Structure: Single Next.js project with API routes
2. Load design documents:
   → data-model.md: Bot, Strategy, Portfolio, Trade, MarketData, TechnicalIndicator
   → contracts/: 11 API endpoints for bots, portfolios, trades, strategies, market data
   → quickstart.md: 4 acceptance test scenarios
3. Generate tasks by category following simplified requirements:
   → Setup: Next.js init, SQLite, dependencies
   → Core UI: Layout, Dashboard, Bot Management
   → API: Simple CRUD endpoints
   → Polling: Market data fetcher
   → Testing: Basic functionality tests
4. Task rules applied:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Core before integration
5. Number tasks sequentially (T001-T015)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Single Next.js project structure at repository root
- `app/` for Next.js App Router pages and API routes
- `components/` for React components
- `lib/` for utilities and services
- `prisma/` for database schema

## Phase 3.1: Setup & Initialization
- [ ] T001 Initialize Next.js 14 project with TypeScript and Tailwind CSS
- [ ] T002 Set up Prisma with SQLite database configuration
- [ ] T003 [P] Create basic project structure (app/, components/, lib/, prisma/)
- [ ] T004 [P] Configure environment variables (.env.local) with TradingView API placeholder

## Phase 3.2: Core UI Components
- [ ] T005 Create Layout component with Sidebar in components/layout/Layout.tsx
- [ ] T006 [P] Create Dashboard page with summary cards in app/dashboard/page.tsx
- [ ] T007 [P] Create Bot Management page skeleton in app/bots/page.tsx
- [ ] T008 [P] Create Portfolio page skeleton in app/portfolio/page.tsx

## Phase 3.3: Database & Models
- [ ] T009 Define Prisma schema for all entities in prisma/schema.prisma
- [ ] T010 Generate Prisma client and run initial migration
- [ ] T011 [P] Create seed script with sample data in prisma/seed.ts

## Phase 3.4: API Endpoints (Simplified)
- [ ] T012 [P] Implement GET/POST /api/bots for bot CRUD operations
- [ ] T013 [P] Implement GET /api/portfolio for portfolio data
- [ ] T014 [P] Implement GET/POST /api/trades for trade management
- [ ] T015 [P] Implement market data polling service in lib/services/marketDataService.ts

## Dependencies
- T001 must complete before all others
- T002 before T009-T011 (database setup)
- T009-T010 before T012-T014 (API needs models)
- T005 before T006-T008 (Layout needed for pages)

## Parallel Execution Examples
```
# After T001-T002 complete, launch T003-T004:
Task: "Create basic project structure"
Task: "Configure environment variables"

# After T005 complete, launch T006-T008:
Task: "Create Dashboard page with summary cards"
Task: "Create Bot Management page skeleton"
Task: "Create Portfolio page skeleton"

# After T010 complete, launch T011-T015:
Task: "Create seed script with sample data"
Task: "Implement GET/POST /api/bots"
Task: "Implement GET /api/portfolio"
Task: "Implement GET/POST /api/trades"
Task: "Implement market data polling service"
```

## Notes
- Focus on basic functionality first - no complex trading logic
- Use mock data for TradingView integration initially
- Keep UI simple with Tailwind CSS utility classes
- Polling interval set to 1 minute for market data
- Maximum 2-3 bots as per specifications
- Paper trading mode only

## Success Criteria
- [ ] Next.js app runs without errors
- [ ] Basic UI navigation works
- [ ] SQLite database connected via Prisma
- [ ] API endpoints return mock data
- [ ] Dashboard displays bot status
- [ ] Can create/view bots through UI
- [ ] Portfolio shows basic positions

## Playwright MCP Testing Notes
When using Playwright MCP for testing:
1. Start the Next.js dev server first: `npm run dev`
2. Use `browser_navigate` to test page navigation
3. Use `browser_snapshot` to verify UI elements render correctly
4. Test basic CRUD operations through the UI
5. Verify polling updates every minute