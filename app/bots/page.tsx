import Layout from '@/components/layout/Layout';
import SummaryCards from '@/components/dashboard/SummaryCards';
import BotGrid from '@/components/dashboard/BotGrid';

export default function BotsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <SummaryCards />
        <BotGrid />
      </div>
    </Layout>
  );
}