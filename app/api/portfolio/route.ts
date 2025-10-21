import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolio - Get global portfolio data
export async function GET() {
  try {
    // Get or create global portfolio
    let portfolio = await prisma.portfolio.findFirst();

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          totalCash: 10000.0,
          totalValue: 10000.0,
          totalReturns: 0.0,
          totalReturnsPercent: 0.0,
        }
      });
    }

    // Get all positions
    const positions = await prisma.position.findMany({
      orderBy: { symbol: 'asc' }
    });

    // Calculate portfolio summary
    const summary = {
      totalValue: portfolio.totalValue,
      totalCash: portfolio.totalCash,
      totalReturns: portfolio.totalReturns,
      totalReturnsPercent: portfolio.totalReturnsPercent,
      positionsCount: positions.length,
      totalInvested: portfolio.totalValue - portfolio.totalCash
    };

    const response = {
      id: portfolio.id,
      summary,
      positions,
      updatedAt: portfolio.updatedAt
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}