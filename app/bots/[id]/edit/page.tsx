'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import BotWizard from '@/components/bot-wizard/BotWizard';
import { TimeHorizon, RiskAppetite } from '@/components/bot-wizard/types';

interface Bot {
  id: string;
  name: string;
  symbol: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  mode: 'PAPER' | 'LIVE';
  config: string;
  fundAllocation: number;
  createdAt: string;
  updatedAt: string;
  strategy?: {
    id: string;
    name: string;
    type: string;
  };
  portfolio?: {
    id: string;
    name: string;
  };
}

interface BotConfig {
  symbol?: string;
  brokerage?: string;
  fundAllocation?: number;
  entryOrderType?: string;
  exitOrderType?: string;
  positionSize?: number;
  riskLevel?: string;
  stopLoss?: number;
  takeProfit?: number;
}

export default function EditBotPage() {
  const params = useParams();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form data
  const [botName, setBotName] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [tradingSymbol, setTradingSymbol] = useState('');
  const [fundAllocation, setFundAllocation] = useState(1000);
  const [entryOrderType, setEntryOrderType] = useState('MARKET');
  const [exitOrderType, setExitOrderType] = useState('MARKET');

  useEffect(() => {
    if (params.id) {
      fetchBotDetails(params.id as string);
    }
  }, [params.id]);

  const fetchBotDetails = async (botId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bots/${botId}`);

      if (!response.ok) {
        throw new Error('Bot not found');
      }

      const data = await response.json();
      setBot(data);

      // Initialize form with current bot data
      setBotName(data.name);
      const config: BotConfig = JSON.parse(data.config || '{}');
      setTradingSymbol(data.symbol || config.symbol || '');
      setBrokerage(config.brokerage || 'Interactive Brokers');
      setFundAllocation(data.fundAllocation || config.fundAllocation || config.positionSize || 1000);
      setEntryOrderType(config.entryOrderType || 'MARKET');
      setExitOrderType(config.exitOrderType || 'MARKET');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bot details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBot = async () => {
    if (!bot) return;

    try {
      setSaving(true);

      const updatedConfig: BotConfig = {
        symbol: tradingSymbol,
        brokerage,
        fundAllocation,
        entryOrderType,
        exitOrderType,
        positionSize: fundAllocation,
        riskLevel: 'Medium',
        stopLoss: 5,
        takeProfit: 10
      };

      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: botName,
          symbol: tradingSymbol,
          fundAllocation: fundAllocation,
          config: updatedConfig,
        }),
      });

      if (response.ok) {
        router.push(`/bots/${bot.id}`);
      } else {
        throw new Error('Failed to update bot');
      }
    } catch (err) {
      setError('Failed to update bot');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !bot) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-red-600 text-xl mb-4">
            {error || 'Bot not found'}
          </div>
          <Link
            href="/bots"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Bots
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/bots" className="hover:text-blue-600">Bots</Link>
          <span>/</span>
          <Link href={`/bots/${bot.id}`} className="hover:text-blue-600">{bot.name}</Link>
          <span>/</span>
          <span className="text-gray-900">Edit</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">봇 수정</h1>
              <p className="text-gray-600 mt-1">트레이딩 봇의 프로필과 설정을 수정하세요</p>
            </div>
            <Link
              href={`/bots/${bot.id}`}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Wizard */}
        <BotWizard
          isEdit={true}
          botId={bot.id}
          initialValues={{
            name: bot.name,
            symbol: bot.symbol,
            fundAllocation: bot.fundAllocation
          }}
        />
      </div>
    </Layout>
  );
}