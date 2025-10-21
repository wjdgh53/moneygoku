import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/bots/[id]/stop - Stop bot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bot = await prisma.bot.findUnique({
      where: { id },
    });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    if (bot.status === 'STOPPED') {
      return NextResponse.json(
        { error: 'Bot is already stopped' },
        { status: 400 }
      );
    }

    const updatedBot = await prisma.bot.update({
      where: { id },
      data: {
        status: 'STOPPED',
      },
      include: {
        strategy: true,
        trades: true,
      }
    });

    return NextResponse.json(updatedBot);
  } catch (error) {
    console.error('Error stopping bot:', error);
    return NextResponse.json(
      { error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}