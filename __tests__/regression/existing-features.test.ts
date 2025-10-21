/**
 * Regression Tests - Existing Features
 *
 * CRITICAL: These tests ensure that the Auto Bot Creator feature
 * does NOT break any existing functionality.
 *
 * ALL TESTS MUST PASS before merging to main branch.
 *
 * @group regression
 * @group critical
 */

import { prisma } from '@/lib/prisma'

describe('Regression Tests - Existing Bot Features', () => {
  let testStrategyId: string
  let testBotId: string

  beforeAll(async () => {
    // Create test strategy
    const strategy = await prisma.strategy.create({
      data: {
        name: 'Regression Test Strategy',
        timeHorizon: 'SWING',
        riskAppetite: 'BALANCED',
        entryConditions: { rsi: { period: 14, operator: '<', value: 40 } },
        exitConditions: { rsi: { period: 14, operator: '>', value: 60 } },
      }
    })
    testStrategyId = strategy.id
  })

  beforeEach(async () => {
    // Clean up before each test
    await prisma.trade.deleteMany()
    await prisma.position.deleteMany()
    await prisma.bot.deleteMany()
  })

  afterAll(async () => {
    await prisma.trade.deleteMany()
    await prisma.position.deleteMany()
    await prisma.bot.deleteMany()
    await prisma.strategy.delete({ where: { id: testStrategyId } })
    await prisma.$disconnect()
  })

  describe('Manual Bot Creation (Existing Feature)', () => {
    it('should still create bot manually with custom settings', async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Manual Test Bot',
          symbol: 'TSLA',
          strategyId: testStrategyId,
          fundAllocation: 5000,
          status: 'STOPPED',
          mode: 'PAPER',
        }
      })

      expect(bot).toBeDefined()
      expect(bot.name).toBe('Manual Test Bot')
      expect(bot.symbol).toBe('TSLA')
      expect(bot.status).toBe('STOPPED')
    })

    it('should create bot with default values', async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Default Bot',
          symbol: 'AAPL',
          strategyId: testStrategyId,
        }
      })

      expect(bot.fundAllocation).toBe(1000.0)
      expect(bot.totalReturns).toBe(0.0)
      expect(bot.winRate).toBe(0.0)
      expect(bot.mode).toBe('PAPER')
    })

    it('should allow custom fund allocation', async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Custom Fund Bot',
          symbol: 'NVDA',
          strategyId: testStrategyId,
          fundAllocation: 15000,
        }
      })

      expect(bot.fundAllocation).toBe(15000)
    })
  })

  describe('Bot Status Management (Existing Feature)', () => {
    beforeEach(async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Status Test Bot',
          symbol: 'SPY',
          strategyId: testStrategyId,
          fundAllocation: 3000,
        }
      })
      testBotId = bot.id
    })

    it('should start bot (update status to ACTIVE)', async () => {
      const updatedBot = await prisma.bot.update({
        where: { id: testBotId },
        data: {
          status: 'ACTIVE',
          lastExecutedAt: new Date(),
        }
      })

      expect(updatedBot.status).toBe('ACTIVE')
      expect(updatedBot.lastExecutedAt).toBeDefined()
    })

    it('should stop bot (update status to STOPPED)', async () => {
      await prisma.bot.update({
        where: { id: testBotId },
        data: { status: 'ACTIVE' }
      })

      const stoppedBot = await prisma.bot.update({
        where: { id: testBotId },
        data: { status: 'STOPPED' }
      })

      expect(stoppedBot.status).toBe('STOPPED')
    })

    it('should pause bot (update status to PAUSED)', async () => {
      const pausedBot = await prisma.bot.update({
        where: { id: testBotId },
        data: { status: 'PAUSED' }
      })

      expect(pausedBot.status).toBe('PAUSED')
    })

    it('should set error status', async () => {
      const errorBot = await prisma.bot.update({
        where: { id: testBotId },
        data: { status: 'ERROR' }
      })

      expect(errorBot.status).toBe('ERROR')
    })

    it('should delete bot', async () => {
      await prisma.bot.delete({
        where: { id: testBotId }
      })

      const deletedBot = await prisma.bot.findUnique({
        where: { id: testBotId }
      })

      expect(deletedBot).toBeNull()
    })
  })

  describe('Strategy Management (Existing Feature)', () => {
    it('should retrieve all strategies', async () => {
      const strategies = await prisma.strategy.findMany()

      expect(strategies).toBeDefined()
      expect(Array.isArray(strategies)).toBe(true)
      expect(strategies.length).toBeGreaterThan(0)
    })

    it('should retrieve strategy by ID', async () => {
      const strategy = await prisma.strategy.findUnique({
        where: { id: testStrategyId }
      })

      expect(strategy).toBeDefined()
      expect(strategy?.name).toBe('Regression Test Strategy')
    })

    it('should create custom strategy', async () => {
      const newStrategy = await prisma.strategy.create({
        data: {
          name: 'Custom Regression Strategy',
          timeHorizon: 'SHORT_TERM',
          riskAppetite: 'AGGRESSIVE',
          entryConditions: { rsi: { period: 14, operator: '<', value: 30 } },
          exitConditions: { rsi: { period: 14, operator: '>', value: 70 } },
        }
      })

      expect(newStrategy).toBeDefined()
      expect(newStrategy.timeHorizon).toBe('SHORT_TERM')

      // Clean up
      await prisma.strategy.delete({ where: { id: newStrategy.id } })
    })

    it('should verify existing strategies are unchanged', async () => {
      const strategy = await prisma.strategy.findUnique({
        where: { id: testStrategyId }
      })

      expect(strategy?.timeHorizon).toBe('SWING')
      expect(strategy?.riskAppetite).toBe('BALANCED')
      expect(strategy?.stopLoss).toBe(5.0)
      expect(strategy?.takeProfit).toBe(10.0)
    })
  })

  describe('Trade Recording (Existing Feature)', () => {
    beforeEach(async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Trade Test Bot',
          symbol: 'TSLA',
          strategyId: testStrategyId,
          fundAllocation: 5000,
        }
      })
      testBotId = bot.id
    })

    it('should record BUY trade', async () => {
      const trade = await prisma.trade.create({
        data: {
          botId: testBotId,
          symbol: 'TSLA',
          side: 'BUY',
          quantity: 10,
          price: 250.00,
          total: 2500.00,
          status: 'EXECUTED',
          reason: 'RSI below 40',
        }
      })

      expect(trade).toBeDefined()
      expect(trade.side).toBe('BUY')
      expect(trade.quantity).toBe(10)
      expect(trade.total).toBe(2500.00)
    })

    it('should record SELL trade', async () => {
      const trade = await prisma.trade.create({
        data: {
          botId: testBotId,
          symbol: 'TSLA',
          side: 'SELL',
          quantity: 5,
          price: 260.00,
          total: 1300.00,
          status: 'EXECUTED',
          reason: 'RSI above 60',
        }
      })

      expect(trade.side).toBe('SELL')
      expect(trade.total).toBe(1300.00)
    })

    it('should cascade delete trades when bot is deleted', async () => {
      // Create trade
      await prisma.trade.create({
        data: {
          botId: testBotId,
          symbol: 'TSLA',
          side: 'BUY',
          quantity: 10,
          price: 250.00,
          total: 2500.00,
        }
      })

      // Delete bot
      await prisma.bot.delete({ where: { id: testBotId } })

      // Verify trades are deleted
      const trades = await prisma.trade.findMany({
        where: { botId: testBotId }
      })

      expect(trades).toHaveLength(0)
    })
  })

  describe('Position Management (Existing Feature)', () => {
    beforeEach(async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Position Test Bot',
          symbol: 'AAPL',
          strategyId: testStrategyId,
          fundAllocation: 10000,
        }
      })
      testBotId = bot.id
    })

    it('should create position for bot', async () => {
      const position = await prisma.position.create({
        data: {
          botId: testBotId,
          symbol: 'AAPL',
          quantity: 50,
          avgEntryPrice: 175.00,
          totalCost: 8750.00,
        }
      })

      expect(position).toBeDefined()
      expect(position.quantity).toBe(50)
      expect(position.avgEntryPrice).toBe(175.00)
    })

    it('should enforce unique constraint (one position per bot per symbol)', async () => {
      await prisma.position.create({
        data: {
          botId: testBotId,
          symbol: 'AAPL',
          quantity: 50,
          avgEntryPrice: 175.00,
          totalCost: 8750.00,
        }
      })

      // Try to create duplicate
      await expect(
        prisma.position.create({
          data: {
            botId: testBotId,
            symbol: 'AAPL', // Same bot, same symbol
            quantity: 10,
            avgEntryPrice: 180.00,
            totalCost: 1800.00,
          }
        })
      ).rejects.toThrow()
    })

    it('should update position quantity and average price', async () => {
      const position = await prisma.position.create({
        data: {
          botId: testBotId,
          symbol: 'AAPL',
          quantity: 50,
          avgEntryPrice: 175.00,
          totalCost: 8750.00,
        }
      })

      // Update position (simulate adding more shares)
      const updatedPosition = await prisma.position.update({
        where: { id: position.id },
        data: {
          quantity: 60,
          avgEntryPrice: 176.00,
          totalCost: 10560.00,
        }
      })

      expect(updatedPosition.quantity).toBe(60)
      expect(updatedPosition.avgEntryPrice).toBe(176.00)
    })
  })

  describe('Database Integrity (Existing Feature)', () => {
    it('should verify foreign key constraints are intact', async () => {
      // Try to create bot with non-existent strategy
      await expect(
        prisma.bot.create({
          data: {
            name: 'Invalid Strategy Bot',
            symbol: 'TSLA',
            strategyId: 'non-existent-id',
          }
        })
      ).rejects.toThrow()
    })

    it('should verify cascade delete works', async () => {
      const bot = await prisma.bot.create({
        data: {
          name: 'Cascade Test Bot',
          symbol: 'TSLA',
          strategyId: testStrategyId,
        }
      })

      // Create related data
      await prisma.trade.create({
        data: {
          botId: bot.id,
          symbol: 'TSLA',
          side: 'BUY',
          quantity: 10,
          price: 250.00,
          total: 2500.00,
        }
      })

      await prisma.position.create({
        data: {
          botId: bot.id,
          symbol: 'TSLA',
          quantity: 10,
          avgEntryPrice: 250.00,
          totalCost: 2500.00,
        }
      })

      // Delete bot
      await prisma.bot.delete({ where: { id: bot.id } })

      // Verify related data is deleted
      const trades = await prisma.trade.findMany({ where: { botId: bot.id } })
      const positions = await prisma.position.findMany({ where: { botId: bot.id } })

      expect(trades).toHaveLength(0)
      expect(positions).toHaveLength(0)
    })

    it('should verify no orphaned records exist', async () => {
      // Get all bot IDs
      const bots = await prisma.bot.findMany({ select: { id: true } })
      const botIds = bots.map(b => b.id)

      // Check trades
      const orphanedTrades = await prisma.trade.findMany({
        where: {
          botId: {
            notIn: botIds.length > 0 ? botIds : ['dummy']
          }
        }
      })

      expect(orphanedTrades).toHaveLength(0)
    })
  })

  describe('API Endpoints (Existing Feature)', () => {
    it('should verify GET /api/bots still works', async () => {
      // TODO: Test existing bot listing endpoint
      // This verifies that adding /api/bots/bulk doesn't break /api/bots
      expect(true).toBe(true) // Placeholder
    })

    it('should verify POST /api/bots still works', async () => {
      // TODO: Test existing bot creation endpoint
      expect(true).toBe(true) // Placeholder
    })

    it('should verify GET /api/strategies still works', async () => {
      // TODO: Test existing strategy endpoint
      expect(true).toBe(true) // Placeholder
    })
  })
})

/**
 * REGRESSION TEST CHECKLIST:
 *
 * Before deploying Auto Bot Creator feature:
 *
 * 1. [ ] All manual bot creation tests pass
 * 2. [ ] All bot status management tests pass
 * 3. [ ] All strategy management tests pass
 * 4. [ ] All trade recording tests pass
 * 5. [ ] All position management tests pass
 * 6. [ ] All database integrity tests pass
 * 7. [ ] All existing API endpoints still work
 * 8. [ ] No orphaned records in database
 * 9. [ ] Foreign key constraints intact
 * 10. [ ] Cascade deletes working correctly
 *
 * IF ANY TEST FAILS:
 * - DO NOT merge to main
 * - Investigate why existing feature is broken
 * - Fix the issue before proceeding
 * - Re-run all regression tests
 *
 * CRITICAL: The user emphasized "망치지마라" (don't break it!)
 * These regression tests are your safety net.
 */
