import Layout from '@/components/layout/Layout';
import SummaryCards from '@/components/dashboard/SummaryCards';
import BotGrid from '@/components/dashboard/BotGrid';

export default function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <SummaryCards />
        <BotGrid />
      </div>
    </Layout>
  );
}