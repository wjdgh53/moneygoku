'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import BotWizard from '@/components/bot-wizard/BotWizard';

export default function CreateBotPage() {
  const router = useRouter();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/bots" className="hover:text-blue-600">Bots</Link>
          <span>/</span>
          <span className="text-gray-900">Create</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">새 봇 생성</h1>
              <p className="text-gray-600 mt-1">투자 기간과 리스크 성향을 선택하여 나만의 트레이딩 봇을 만드세요</p>
            </div>
            <Link
              href="/bots"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Wizard */}
        <BotWizard isEdit={false} />
      </div>
    </Layout>
  );
}
