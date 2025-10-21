/**
 * Trading Profile API Routes
 * GET /api/profiles - Get all available profiles
 * POST /api/profiles - Create a custom profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { TradingProfileBuilder } from '@/lib/trading-profile-builder';
import { TimeHorizon, RiskAppetite, CreateProfileInput } from '@/lib/trading-profile-types';

// GET /api/profiles - Get all available profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeHorizon = searchParams.get('timeHorizon') as TimeHorizon | null;
    const riskAppetite = searchParams.get('riskAppetite') as RiskAppetite | null;

    // If both parameters provided, get specific profile
    if (timeHorizon && riskAppetite) {
      const profile = TradingProfileBuilder.create({
        timeHorizon,
        riskAppetite
      });

      return NextResponse.json({
        success: true,
        data: profile
      });
    }

    // Otherwise, get all profiles
    const allProfiles = TradingProfileBuilder.getAllProfiles();

    // Group by time horizon for easier consumption
    const grouped = allProfiles.reduce((acc, profile) => {
      if (!acc[profile.timeHorizon]) {
        acc[profile.timeHorizon] = [];
      }
      acc[profile.timeHorizon].push(profile);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        profiles: allProfiles,
        grouped,
        metadata: {
          total: allProfiles.length,
          timeHorizons: Object.keys(TimeHorizon),
          riskAppetites: Object.keys(RiskAppetite)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trading profiles'
      },
      { status: 500 }
    );
  }
}

// POST /api/profiles - Create a custom profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timeHorizon, riskAppetite, customizations } = body as CreateProfileInput;

    // Validate required fields
    if (!timeHorizon || !riskAppetite) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeHorizon and riskAppetite are required'
        },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(TimeHorizon).includes(timeHorizon)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid timeHorizon. Must be one of: ${Object.values(TimeHorizon).join(', ')}`
        },
        { status: 400 }
      );
    }

    if (!Object.values(RiskAppetite).includes(riskAppetite)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid riskAppetite. Must be one of: ${Object.values(RiskAppetite).join(', ')}`
        },
        { status: 400 }
      );
    }

    // Create profile
    const profile = TradingProfileBuilder.create({
      timeHorizon,
      riskAppetite,
      customizations
    });

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create trading profile'
      },
      { status: 500 }
    );
  }
}
