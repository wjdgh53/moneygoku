'use client';

import Layout from '@/components/layout/Layout';
import StepWizard from '@/components/strategy/StepWizard';

export default function CreateStrategyPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <StepWizard />
      </div>
    </Layout>
  );
}