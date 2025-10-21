/**
 * Profile Validation API Route
 * POST /api/profiles/validate - Validate user parameters for a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { TradingProfileBuilder } from '@/lib/trading-profile-builder';
import { ProfileValidationInput } from '@/lib/trading-profile-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ProfileValidationInput;

    // Validate required fields
    if (!body.timeHorizon || !body.riskAppetite) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeHorizon and riskAppetite are required'
        },
        { status: 400 }
      );
    }

    if (body.userExperience === undefined || body.capitalSize === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'userExperience and capitalSize are required'
        },
        { status: 400 }
      );
    }

    // Perform validation
    const validation = TradingProfileBuilder.validate(body);

    return NextResponse.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate profile'
      },
      { status: 500 }
    );
  }
}
