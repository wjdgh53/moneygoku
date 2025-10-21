# Data Model: StockHero Clone

**Date**: 2025-09-22
**Feature**: Automated Trading Bot Platform

## Core Entities

### Bot
Represents an automated trading bot instance.

**Attributes**:
- `id`: Unique identifier (UUID)
- `name`: Bot display name
- `description`: Bot description (optional)
- `status`: Bot operational status ('ACTIVE', 'PAUSED', 'STOPPED', 'ERROR')
- `mode`: Trading mode ('PAPER', 'LIVE')
- `strategyId`: Foreign key to Strategy
- `config`: JSON object for bot configuration
- `lastExecutedAt`: Last execution timestamp
- `createdAt`: Bot creation timestamp
- `updatedAt`: Last modification timestamp

**Validation Rules**:
- Name must be 3-50 characters
- Status must be valid enum value
- Mode must be 'PAPER' only
- Config must be valid JSON

**Relationships**:
- Many-to-one with Strategy
- One-to-many with Trade
- One-to-one with Portfolio

**State Transitions**:
- STOPPED → ACTIVE: Start bot
- ACTIVE → PAUSED: Pause bot
- PAUSED → ACTIVE: Resume bot
- ANY → STOPPED: Stop bot
- ANY → ERROR: System error occurred

### Strategy
Defines trading logic and parameters.

**Attributes**:
- `id`: Unique identifier (UUID)
- `userId`: Foreign key to User (strategy creator)
- `name`: Strategy name
- `description`: Strategy description
- `type`: Strategy type ('TECHNICAL' only)
- `parameters`: JSON object for strategy parameters
- `indicators`: Array of technical indicators used
- `riskLevel`: Risk level (1-5 scale)
- `performance`: JSON object for strategy performance metrics
- `createdAt`: Strategy creation timestamp
- `updatedAt`: Last modification timestamp

**Validation Rules**:
- Name must be 3-100 characters
- Type must be valid enum value
- Risk level must be 1-5
- Parameters must be valid JSON
- Indicators must be array of valid indicator names

**Relationships**:
- One-to-many with Bot

### Portfolio
Tracks financial position and performance.

**Attributes**:
- `id`: Unique identifier (UUID)
- `botId`: Foreign key to Bot (optional for manual portfolios)
- `name`: Portfolio name
- `cashBalance`: Available cash amount
- `totalValue`: Total portfolio value
- `totalReturns`: Total returns (profit/loss)
- `totalReturnsPercent`: Total returns percentage
- `dayReturns`: Daily returns
- `dayReturnsPercent`: Daily returns percentage
- `positions`: JSON array of current positions
- `createdAt`: Portfolio creation timestamp
- `updatedAt`: Last modification timestamp

**Validation Rules**:
- Cash balance must be non-negative
- Total value must be non-negative
- Positions must be valid JSON array

**Relationships**:
- One-to-one with Bot (optional)
- One-to-many with Trade

### Trade
Represents individual buy/sell transactions.

**Attributes**:
- `id`: Unique identifier (UUID)
- `portfolioId`: Foreign key to Portfolio
- `botId`: Foreign key to Bot (optional for manual trades)
- `symbol`: Stock symbol (e.g., 'AAPL', 'TSLA')
- `side`: Trade side ('BUY', 'SELL')
- `quantity`: Number of shares
- `price`: Execution price per share
- `totalAmount`: Total trade amount (quantity × price)
- `fees`: Trading fees
- `status`: Trade status ('PENDING', 'EXECUTED', 'FAILED', 'CANCELLED')
- `executedAt`: Execution timestamp
- `reason`: Trade reason/trigger (optional)
- `createdAt`: Trade creation timestamp
- `updatedAt`: Last modification timestamp

**Validation Rules**:
- Symbol must be valid format (3-5 uppercase letters)
- Side must be 'BUY' or 'SELL'
- Quantity must be positive
- Price must be positive
- Total amount must equal quantity × price
- Fees must be non-negative

**Relationships**:
- Many-to-one with Portfolio
- Many-to-one with Bot (optional)

### MarketData
Stores historical and real-time market data.

**Attributes**:
- `id`: Unique identifier (UUID)
- `symbol`: Stock symbol
- `timestamp`: Data timestamp
- `open`: Opening price
- `high`: Highest price
- `low`: Lowest price
- `close`: Closing price
- `volume`: Trading volume
- `source`: Data source ('TRADINGVIEW' only)
- `createdAt`: Record creation timestamp

**Validation Rules**:
- Symbol must be valid format
- Timestamp must be valid datetime
- Prices must be positive
- Volume must be non-negative
- Source must be valid enum value

**Relationships**:
- Standalone entity (no direct relationships)

### TechnicalIndicator
Stores calculated technical indicator values.

**Attributes**:
- `id`: Unique identifier (UUID)
- `symbol`: Stock symbol
- `indicator`: Indicator name ('RSI', 'MACD', 'BB', 'MA')
- `period`: Calculation period
- `value`: Calculated indicator value
- `metadata`: JSON object for additional indicator data
- `timestamp`: Calculation timestamp
- `createdAt`: Record creation timestamp

**Validation Rules**:
- Symbol must be valid format
- Indicator must be valid enum value
- Period must be positive integer
- Value must be numeric
- Metadata must be valid JSON

**Relationships**:
- Standalone entity (referenced by symbol/timestamp)

## Database Schema Design

### Indexes
- Bot: `status`, `lastExecutedAt`
- Strategy: `type`, `createdAt`
- Portfolio: `botId`, `updatedAt`
- Trade: `portfolioId`, `botId`, `symbol`, `executedAt`, `status`
- MarketData: `symbol + timestamp` (composite), `symbol`, `timestamp`
- TechnicalIndicator: `symbol + indicator + timestamp` (composite)

### Foreign Key Constraints
- Bot.strategyId → Strategy.id (SET NULL)
- Portfolio.botId → Bot.id (SET NULL)
- Trade.portfolioId → Portfolio.id (CASCADE DELETE)
- Trade.botId → Bot.id (SET NULL)

### Data Types
- IDs: UUID (varchar(36))
- Timestamps: TIMESTAMP WITH TIME ZONE
- Money amounts: DECIMAL(15,2)
- Percentages: DECIMAL(8,4)
- JSON fields: JSON (SQLite)
- Enums: VARCHAR with CHECK constraints

## Performance Considerations

### Query Optimization
- Time-series queries for MarketData and TechnicalIndicator
- Portfolio performance calculations
- Polling-based trade monitoring (1-minute intervals)
- Bot status tracking (2-3 bots max)

### Caching Strategy
- Cache recent market data for active symbols
- Cache calculated technical indicators
- Cache portfolio summaries for dashboard display

### Data Retention
- Keep all trade history for compliance
- Retain market data for backtesting (1+ years)
- Archive old technical indicator values monthly
- Backup strategy configurations before modifications

## Security Considerations

### Data Protection
- No sensitive financial credentials stored
- User preferences encrypted if needed
- Trade data integrity through constraints
- Audit trail for all trading activities

### Access Control
- Single-user local application
- No authentication required
- All data locally stored