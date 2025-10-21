import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/bots/[id]/start - Start bot (runs test first, then activates)
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

    if (bot.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Bot is already active' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting bot ${bot.name} (${id})`);
    console.log(`   Step 1: Running initial test...`);

    // 🆕 Step 1: Run test first
    try {
      const testResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/bots/${id}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const testResult = await testResponse.json();

      if (!testResponse.ok) {
        console.error(`❌ Initial test failed for bot ${bot.name}:`, testResult.error);
        return NextResponse.json(
          {
            error: 'Failed to run initial test',
            details: testResult.error || testResult.details
          },
          { status: 500 }
        );
      }

      console.log(`✅ Initial test completed for bot ${bot.name}`);
      console.log(`   Decision: ${testResult.report?.decision || 'N/A'}`);
    } catch (testError) {
      console.error(`❌ Test execution error for bot ${bot.name}:`, testError);
      return NextResponse.json(
        { error: 'Failed to execute initial test', details: testError instanceof Error ? testError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // 🆕 Step 2: Activate bot after successful test
    console.log(`   Step 2: Activating bot...`);
    const updatedBot = await prisma.bot.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        lastExecutedAt: new Date(),
      },
      include: {
        strategy: true,
        trades: true,
      }
    });

    console.log(`✅ Bot ${bot.name} is now ACTIVE`);

    return NextResponse.json({
      ...updatedBot,
      message: 'Bot started successfully with initial test completed'
    });
  } catch (error) {
    console.error('Error starting bot:', error);
    return NextResponse.json(
      { error: 'Failed to start bot' },
      { status: 500 }
    );
  }
}