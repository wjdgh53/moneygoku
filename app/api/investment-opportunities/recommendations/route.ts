/**
 * POST /api/investment-opportunities/recommendations
 *
 * Generate AI bot recommendations from investment opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiBotRecommendationService } from '@/lib/services/aiBotRecommendationService';
import { prisma } from '@/lib/prisma';
import { InvestmentOpportunity } from '@/lib/types/investmentOpportunity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunities } = body as { opportunities: InvestmentOpportunity[] };

    if (!opportunities || !Array.isArray(opportunities)) {
      return NextResponse.json(
        { error: 'Invalid request: opportunities array required' },
        { status: 400 }
      );
    }

    console.log('[API] Generating bot recommendations...');

    // Fetch available strategies from database
    const strategies = await prisma.strategy.findMany({
      select: {
        id: true,
        name: true,
        timeHorizon: true,
        riskAppetite: true,
      },
    });

    if (strategies.length === 0) {
      return NextResponse.json(
        { error: 'No trading strategies available. Please create strategies first.' },
        { status: 400 }
      );
    }

    console.log(`[API] Found ${strategies.length} available strategies`);

    // Generate recommendations
    const recommendations = await aiBotRecommendationService.generateRecommendations(
      opportunities,
      strategies
    );

    console.log(`[API] Generated ${recommendations.recommendations.length} bot recommendations`);

    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error('[API] Error generating bot recommendations:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate bot recommendations',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
