import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/strategies/[id] - Get strategy by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        bots: true,
      },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy' },
      { status: 500 }
    );
  }
}

// PUT /api/strategies/[id] - Update strategy by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, entryConditions, exitConditions, stopLoss, takeProfit } = body;

    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name: name || existingStrategy.name,
        description: description !== undefined ? description : existingStrategy.description,
        entryConditions: entryConditions || existingStrategy.entryConditions,
        exitConditions: exitConditions || existingStrategy.exitConditions,
        stopLoss: stopLoss !== undefined ? stopLoss : existingStrategy.stopLoss,
        takeProfit: takeProfit !== undefined ? takeProfit : existingStrategy.takeProfit,
      },
    });

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Error updating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update strategy' },
      { status: 500 }
    );
  }
}

// DELETE /api/strategies/[id] - Delete strategy by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    await prisma.strategy.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    );
  }
}