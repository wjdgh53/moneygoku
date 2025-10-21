import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mergeConfigs } from '@/lib/utils/strategyConfig';

// GET /api/strategies - List all strategies
export async function GET() {
  try {
    const strategies = await prisma.strategy.findMany({
      include: {
        bots: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add bot count to each strategy
    const strategiesWithCount = strategies.map(strategy => ({
      ...strategy,
      botCount: strategy.bots.length
    }));

    return NextResponse.json(strategiesWithCount);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    );
  }
}

// POST /api/strategies - Create a new strategy with 2D profile support
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 Received strategy creation request:', body);

    const {
      name,
      description,
      timeHorizon,
      riskAppetite,
      entryConditions,
      exitConditions,
      stopLoss,
      takeProfit
    } = body;

    // Validate required fields
    if (!name || !entryConditions || !exitConditions) {
      return NextResponse.json(
        { error: 'Name, entryConditions, and exitConditions are required' },
        { status: 400 }
      );
    }

    // If 2D profile is provided, use merged configs
    let finalStopLoss = stopLoss || 5.0;
    let finalTakeProfit = takeProfit || 10.0;
    let finalTimeHorizon = timeHorizon || 'SWING';
    let finalRiskAppetite = riskAppetite || 'BALANCED';

    // Apply configuration from 2D profile if provided
    if (timeHorizon && riskAppetite) {
      const merged = mergeConfigs(timeHorizon, riskAppetite);
      finalStopLoss = merged.mergedParams.stopLoss;
      finalTakeProfit = merged.mergedParams.takeProfit;

      console.log(`🎯 Applied 2D profile: ${timeHorizon} + ${riskAppetite}`);
      console.log(`   Stop Loss: ${finalStopLoss}%, Take Profit: ${finalTakeProfit}%`);
    }

    const strategy = await prisma.strategy.create({
      data: {
        name,
        description,
        timeHorizon: finalTimeHorizon,
        riskAppetite: finalRiskAppetite,
        entryConditions,
        exitConditions,
        stopLoss: finalStopLoss,
        takeProfit: finalTakeProfit,
      },
    });

    return NextResponse.json(strategy, { status: 201 });
  } catch (error) {
    console.error('Error creating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to create strategy' },
      { status: 500 }
    );
  }
}