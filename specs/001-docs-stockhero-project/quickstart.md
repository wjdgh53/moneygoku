# Quickstart Guide: StockHero Clone

**Date**: 2025-09-22
**Feature**: Automated Trading Bot Platform

## Prerequisites

### Development Environment
- Node.js 18+ and npm
- SQLite (included)
- Git for version control
- VS Code or preferred editor

### External Services
- TradingView free tier API access

## Quick Setup (5 minutes)

### 1. Project Initialization
```bash
# Clone or create project
git clone <repository-url>
cd moneygoku

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### 2. Environment Configuration
Edit `.env.local`:
```env
# Database
DATABASE_URL="file:./stockhero.db"

# TradingView API (Free Tier)
TRADINGVIEW_API_KEY="your-free-api-key-here"
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed with sample data (optional)
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Access the application at: http://localhost:3000

## First-Time User Flow (10 minutes)

### 1. Dashboard Overview
- Navigate to http://localhost:3000/dashboard
- View summary cards: Cash ($10,000), Portfolio ($0), Total Returns (0%)
- See "Create New Bot" button and empty bot grid

### 2. Create Your First Bot (Maximum 2-3 bots)
1. Click "Create New Bot" button
2. Follow the simplified wizard:
   - **Step 1**: Basic Info (name, description)
   - **Step 2**: Strategy Selection (create technical strategy)
   - **Step 3**: Risk Management (position size, stop-loss)
   - **Step 4**: Review and Confirm

### 3. Configure Trading Strategy
1. Choose "Technical Analysis" strategy type
2. Configure indicators:
   - RSI (period: 14, oversold: 30, overbought: 70)
   - MACD (fast: 12, slow: 26, signal: 9)
   - Moving Average (period: 20)
3. Set entry/exit conditions:
   - Buy when RSI < 30 AND price > MA20
   - Sell when RSI > 70 OR price < MA20

### 4. Basic Risk Management
1. Set position sizing: 10% of portfolio per trade
2. Configure stop-loss: 5% maximum loss

### 5. Start Paper Trading
1. Save bot configuration
2. Click "Start Bot" to begin paper trading
3. Monitor real-time status on dashboard
4. View trades in "Trades" tab

## Key Features Walkthrough (15 minutes)

### Dashboard Navigation
```
├── Sidebar Menu
│   ├── Dashboard (overview)
│   ├── Bots (manage all bots)
│   ├── Strategies (create/edit strategies)
│   ├── Trades (transaction history)
│   ├── Portfolio (holdings & performance)
│   └── Reports (analytics & insights)
└── Main Content Area
    ├── Header (Paper/Live toggle)
    └── Dynamic content
```

### Bot Management
1. **Create Bot**: 5-step wizard with validation
2. **Monitor Bots**: Real-time status grid with controls
3. **Bot Actions**: Start/Stop/Pause/Edit/Delete
4. **Performance**: Live P&L tracking and metrics

### Strategy Development
1. **Technical Indicators**: RSI, MACD, Bollinger Bands, Moving Averages
2. **Custom Logic**: Combine multiple indicators with AND/OR conditions
3. **Backtesting**: Test strategies against historical data
4. **Strategy Sharing**: Save and share successful strategies

### Trading Simulation
1. **Paper Trading Only**: Risk-free strategy testing with virtual money
2. **Polling Data**: Market data fetched every minute (15-minute delay)
3. **Order Management**: Simple market orders
4. **Portfolio Tracking**: Basic position tracking and P&L

### Risk Management
1. **Position Sizing**: Percentage or fixed dollar amounts
2. **Stop-Loss**: Automatic loss prevention
3. **Daily Limits**: Maximum trades and loss thresholds
4. **Emergency Stops**: Circuit breakers for bot malfunctions

## Testing Scenarios

### Acceptance Test 1: Bot Creation
```gherkin
Given I am on the dashboard page
When I click "Create New Bot"
And I complete all wizard steps with valid data
Then I should see the new bot in the bot grid
And the bot status should be "STOPPED"
```

### Acceptance Test 2: Paper Trading
```gherkin
Given I have created a bot with technical strategy
When I start the bot in paper trading mode
And market conditions trigger a buy signal
Then a trade should be executed
And my portfolio should reflect the new position
```

### Acceptance Test 3: Portfolio Tracking
```gherkin
Given I have executed trades through bots
When I navigate to the portfolio page
Then I should see current positions
And accurate P&L calculations
And performance charts
```

### Acceptance Test 4: Risk Management
```gherkin
Given I have set a 5% stop-loss on a position
When the position loses 5% or more
Then the bot should automatically sell
And no further trades should occur for that symbol
```


## Common Issues & Troubleshooting

### Database Connection Issues
```bash
# Reset SQLite database
rm stockhero.db
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

### TradingView API Issues
```bash
# Verify API key in .env.local
echo $TRADINGVIEW_API_KEY

# Test API connection
npm run test:api

# Check rate limits
curl -H "Authorization: Bearer $TRADINGVIEW_API_KEY" \
  https://api.tradingview.com/v1/symbols
```

### Bot Not Executing Trades
1. Check bot status is "ACTIVE"
2. Verify strategy indicators are calculated
3. Confirm market data is updating
4. Review bot logs for errors
5. Check risk management limits

### Performance Issues
1. Optimize database queries with indexes
2. Enable React development profiler
3. Check network requests in DevTools
4. Monitor memory usage in Node.js

## Next Steps

### Phase 1 (Week 1-2)
- [ ] Complete basic UI components
- [ ] Implement bot CRUD operations
- [ ] Add strategy wizard
- [ ] Basic paper trading simulation

### Phase 2 (Week 3-4)
- [ ] Polling-based market data
- [ ] Technical indicator calculations
- [ ] Basic performance tracking

### Learning Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Guide](https://www.prisma.io/docs)
- [TradingView API](https://www.tradingview.com/charting-library-docs/)
- [Technical Analysis Fundamentals](https://www.investopedia.com/technical-analysis-4689657)

## Support & Community

### Documentation
- API Reference: `/docs/api`
- Component Library: `/docs/components`
- Trading Guide: `/docs/trading`

### Development Tools
- Prisma Studio: `npx prisma studio`
- API Explorer: `/api-docs` (Swagger UI)
- Component Storybook: `npm run storybook`

### Code Quality
```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

This quickstart guide gets you from zero to trading bot in under 30 minutes, with clear validation steps at each stage.