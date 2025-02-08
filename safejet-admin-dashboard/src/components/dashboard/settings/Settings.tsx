import { Box, Typography, Paper, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { useRouter } from 'next/router';
import { Settings as SettingsIcon } from '@mui/icons-material';

export function Settings() {
    const router = useRouter();

    const settingsCategories = [
        {
            title: 'Admin Wallets',
            description: 'Manage admin wallets for different blockchains and networks',
            icon: <SettingsIcon sx={{ fontSize: 40 }} />,
            href: '/dashboard/settings/admin-wallets'
        },
        // More categories will be added later
    ];

    return (
        <div className="space-y-6">
            <Paper className="p-6">
                <Typography variant="h5" className="mb-6">
                    System Settings
                </Typography>
                
                <Grid container spacing={3}>
                    {settingsCategories.map((category) => (
                        <Grid item xs={12} sm={6} md={4} key={category.title}>
                            <Card>
                                <CardActionArea 
                                    onClick={() => router.push(category.href)}
                                    sx={{ height: '100%' }}
                                >
                                    <CardContent className="text-center p-6">
                                        <Box className="mb-4">
                                            {category.icon}
                                        </Box>
                                        <Typography variant="h6" gutterBottom>
                                            {category.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {category.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </div>
    );
} 