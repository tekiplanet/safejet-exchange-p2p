import { Box, Typography, Paper, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import { 
    AccountBalanceWallet as WalletIcon,
    LocalGasStation as GasStationIcon,
    ContactSupport as ContactIcon,
    ArrowForward as ArrowForwardIcon 
} from '@mui/icons-material';

export function Settings() {
    const router = useRouter();

    const settingsCategories = [
        {
            title: 'Admin Wallets',
            description: 'Manage admin wallets for different blockchains and networks',
            icon: <WalletIcon />,
            href: '/dashboard/settings/admin-wallets'
        },
        {
            title: 'Gas Tank Wallets',
            description: 'Manage gas tank wallets for token sweep operations',
            icon: <GasStationIcon />,
            href: '/dashboard/settings/gas-tank-wallets'
        },
        {
            title: 'Contact Settings',
            description: 'Manage platform contact information and support details',
            icon: <ContactIcon />,
            href: '/dashboard/settings/contact'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">System Settings</h2>
                        <p className="text-sm text-gray-500">Manage your exchange system settings</p>
                    </div>
                </div>
            </div>

            {/* Settings Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsCategories.map((category) => (
                    <Paper 
                        key={category.title}
                        className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                        onClick={() => router.push(category.href)}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        {category.icon}
                                    </div>
                                    <div>
                                        <Typography variant="h6" className="font-medium">
                                            {category.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {category.description}
                                        </Typography>
                                    </div>
                                </div>
                                <ArrowForwardIcon />
                            </div>
                        </div>
                    </Paper>
                ))}
            </div>
        </div>
    );
} 