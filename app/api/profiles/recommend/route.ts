/**
 * Profile Recommendation API Route
 * POST /api/profiles/recommend - Get recommended profile based on user parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { TradingProfileBuilder } from '@/lib/trading-profile-builder';
import { ProfileValidationInput } from '@/lib/trading-profile-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ProfileValidationInput>;

    // Validate required fields for recommendation
    if (body.userExperience === undefined || body.capitalSize === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'userExperience and capitalSize are required for recommendation'
        },
        { status: 400 }
      );
    }

    // Get recommendation
    const recommended = TradingProfileBuilder.recommend({
      timeHorizon: body.timeHorizon!,
      riskAppetite: body.riskAppetite!,
      userExperience: body.userExperience,
      capitalSize: body.capitalSize,
      monthlyIncome: body.monthlyIncome,
      riskTolerance: body.riskTolerance
    });

    if (!recommended) {
      return NextResponse.json(
        {
          success: false,
          error: 'No suitable profile found for given parameters',
          suggestions: [
            'Consider increasing your trading capital',
            'Gain more experience before attempting this profile',
            'Try a more conservative approach'
          ]
        },
        { status: 400 }
      );
    }

    // Also provide validation result
    const validation = TradingProfileBuilder.validate({
      timeHorizon: recommended.timeHorizon,
      riskAppetite: recommended.riskAppetite,
      userExperience: body.userExperience,
      capitalSize: body.capitalSize,
      monthlyIncome: body.monthlyIncome,
      riskTolerance: body.riskTolerance
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: recommended,
        validation,
        metadata: {
          selectedTimeHorizon: recommended.timeHorizon,
          selectedRiskAppetite: recommended.riskAppetite,
          reason: 'Based on your experience and capital'
        }
      }
    });
  } catch (error) {
    console.error('Error getting recommendation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get profile recommendation'
      },
      { status: 500 }
    );
  }
}
