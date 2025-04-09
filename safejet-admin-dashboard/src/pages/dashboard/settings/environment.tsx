import DashboardLayout from '@/components/layout/DashboardLayout';
import { EnvironmentSettings } from '@/components/dashboard/settings/EnvironmentSettings';

function EnvironmentSettingsPage() {
    return (
        <DashboardLayout>
            <EnvironmentSettings />
        </DashboardLayout>
    );
}

export default EnvironmentSettingsPage; 