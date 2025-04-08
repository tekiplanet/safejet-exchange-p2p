import DashboardLayout from '@/components/layout/DashboardLayout';
import { WithdrawalManagement } from '@/components/dashboard/withdrawals/WithdrawalManagement';

export default function WithdrawalsPage() {
    return (
        <DashboardLayout>
            <WithdrawalManagement />
        </DashboardLayout>
    );
} 