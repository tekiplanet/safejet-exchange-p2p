import DashboardLayout from '@/components/layout/DashboardLayout';
import { DepositManagement } from '@/components/dashboard/deposits/DepositManagement';

export default function DepositManagementPage() {
  return (
    <DashboardLayout>
      <DepositManagement />
    </DashboardLayout>
  );
} 