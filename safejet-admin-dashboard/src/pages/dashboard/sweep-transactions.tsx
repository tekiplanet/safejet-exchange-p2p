import DashboardLayout from '@/components/layout/DashboardLayout';
import { SweepTransactions } from '@/components/dashboard/sweep-transactions/SweepTransactions';

export default function SweepTransactionsPage() {
  return (
    <DashboardLayout>
      <SweepTransactions />
    </DashboardLayout>
  );
} 