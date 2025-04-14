import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingButton } from '@mui/lab';
import { Save as SaveIcon } from '@mui/icons-material';
import { 
    TextField, 
    Grid, 
    Paper, 
    Typography, 
    Alert,
    Box,
    CircularProgress,
    Snackbar,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface EnvironmentSettings {
    smtp: {
        host: string;
        port: string;
        user: string;
        password: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    kyc: {
        sumsubAppToken: string;
        sumsubSecretKey: string;
        sumsubWebhookSecret: string;
        sumsubWebhookUrl: string;
    };
    blockchain: {
        confirmations: {
            ethereum: string;
            bsc: string;
            bitcoin: string;
            tron: string;
            xrp: string;
        };
        minimumBalances: {
            eth: string;
            bnb: string;
            trx: string;
            xrp: string;
        };
        tronFees: {
            tokenFeeLimit: string;
            minFeeBalance: string;
        };
        rpc: {
            ethereum: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            bsc: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            bitcoin: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            tron: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
                apiKey: string;
            };
            xrp: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
        };
        other: {
            cryptocompareApiKey: string;
        };
    };
}

type SettingsSection = keyof EnvironmentSettings;
type SubsectionKey<T extends SettingsSection> = keyof EnvironmentSettings[T];
type FieldKey<T extends SettingsSection, U extends SubsectionKey<T>> = keyof EnvironmentSettings[T][U];

export function EnvironmentSettings() {
    const router = useRouter();
    const [settings, setSettings] = useState<EnvironmentSettings>({
        smtp: {
            host: '',
            port: '',
            user: '',
            password: '',
        },
        twilio: {
            accountSid: '',
            authToken: '',
            phoneNumber: '',
        },
        kyc: {
            sumsubAppToken: '',
            sumsubSecretKey: '',
            sumsubWebhookSecret: '',
            sumsubWebhookUrl: '',
        },
        blockchain: {
            confirmations: {
                ethereum: '',
                bsc: '',
                bitcoin: '',
                tron: '',
                xrp: '',
            },
            minimumBalances: {
                eth: '',
                bnb: '',
                trx: '',
                xrp: '',
            },
            tronFees: {
                tokenFeeLimit: '',
                minFeeBalance: '',
            },
            rpc: {
                ethereum: {
                    mainnet: '',
                    mainnetFallback: '',
                    testnet: '',
                    testnetFallback: '',
                },
                bsc: {
                    mainnet: '',
                    mainnetFallback: '',
                    testnet: '',
                    testnetFallback: '',
                },
                bitcoin: {
                    mainnet: '',
                    mainnetFallback: '',
                    testnet: '',
                    testnetFallback: '',
                },
                tron: {
                    mainnet: '',
                    mainnetFallback: '',
                    testnet: '',
                    testnetFallback: '',
                    apiKey: '',
                },
                xrp: {
                    mainnet: '',
                    mainnetFallback: '',
                    testnet: '',
                    testnetFallback: '',
                },
            },
            other: {
                cryptocompareApiKey: '',
            },
        },
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://encrypted.nadiapoint.com/api';

    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
            router.push('/login');
            throw new Error('No auth token found');
        }

        const headers = {
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };

        const fetchOptions: RequestInit = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            },
            credentials: 'include'
        };

        let lastError: Error = new Error('Failed to fetch');

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(`${API_BASE}${url}`, fetchOptions);
                
                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('adminToken');
                        router.push('/login');
                        throw new Error('Session expired');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');
                if (i === retries - 1) break;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        throw lastError;
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetchWithRetry('/admin/settings/environment', {
                method: 'GET',
            });

            const data = await response.json();
            setSettings(data);
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setError(err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const response = await fetchWithRetry('/admin/settings/environment', {
                method: 'PATCH',
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            setSuccess('Settings saved successfully');
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (
        section: SettingsSection,
        subsection: string | null,
        fieldPath: string,
        value: string
    ) => {
        setSettings(prev => {
            // Handle deeply nested RPC settings
            if (section === 'blockchain' && subsection === 'rpc') {
                const [network, fieldName] = fieldPath.split('.');
                return {
                    ...prev,
                    blockchain: {
                        ...prev.blockchain,
                        rpc: {
                            ...prev.blockchain.rpc,
                            [network]: {
                                ...prev.blockchain.rpc[network as keyof typeof prev.blockchain.rpc],
                                [fieldName]: value
                            }
                        }
                    }
                };
            }

            // Handle other blockchain settings
            if (section === 'blockchain' && subsection) {
                return {
                    ...prev,
                    blockchain: {
                        ...prev.blockchain,
                        [subsection]: {
                            ...prev.blockchain[subsection as keyof typeof prev.blockchain],
                            [fieldPath]: value
                        }
                    }
                };
            }

            // Handle other sections (smtp, twilio, kyc)
            if (subsection) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [subsection]: {
                            ...(prev[section] as any)[subsection],
                            [fieldPath]: value
                        }
                    }
                };
            }

            // Handle top-level fields
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [fieldPath]: value
                }
            };
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    const togglePasswordVisibility = (field: string) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    return (
        <Box>
            <Paper className="p-6 mb-6">
                <Typography variant="h6" className="mb-4">
                    Environment Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" className="mb-6">
                    Configure system environment variables and API keys
                </Typography>

                <Grid container spacing={3}>
                    {/* SMTP Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3">
                            Email (SMTP) Settings
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="SMTP Host"
                            value={settings.smtp.host}
                            onChange={(e) => handleChange('smtp', null, 'host', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="SMTP Port"
                            value={settings.smtp.port}
                            onChange={(e) => handleChange('smtp', null, 'port', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="SMTP User"
                            value={settings.smtp.user}
                            onChange={(e) => handleChange('smtp', null, 'user', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="SMTP Password"
                            type={showPasswords['smtp_password'] ? 'text' : 'password'}
                            value={settings.smtp.password}
                            onChange={(e) => handleChange('smtp', null, 'password', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('smtp_password')}
                                            edge="end"
                                        >
                                            {showPasswords['smtp_password'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* Twilio Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Twilio Settings
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Account SID"
                            value={settings.twilio.accountSid}
                            onChange={(e) => handleChange('twilio', null, 'accountSid', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Auth Token"
                            type={showPasswords['twilio_token'] ? 'text' : 'password'}
                            value={settings.twilio.authToken}
                            onChange={(e) => handleChange('twilio', null, 'authToken', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('twilio_token')}
                                            edge="end"
                                        >
                                            {showPasswords['twilio_token'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Phone Number"
                            value={settings.twilio.phoneNumber}
                            onChange={(e) => handleChange('twilio', null, 'phoneNumber', e.target.value)}
                        />
                    </Grid>

                    {/* KYC Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            KYC Settings (Sumsub)
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="App Token"
                            type={showPasswords['sumsub_token'] ? 'text' : 'password'}
                            value={settings.kyc.sumsubAppToken}
                            onChange={(e) => handleChange('kyc', null, 'sumsubAppToken', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('sumsub_token')}
                                            edge="end"
                                        >
                                            {showPasswords['sumsub_token'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Secret Key"
                            type={showPasswords['sumsub_secret'] ? 'text' : 'password'}
                            value={settings.kyc.sumsubSecretKey}
                            onChange={(e) => handleChange('kyc', null, 'sumsubSecretKey', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('sumsub_secret')}
                                            edge="end"
                                        >
                                            {showPasswords['sumsub_secret'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Webhook Secret"
                            type={showPasswords['sumsub_webhook'] ? 'text' : 'password'}
                            value={settings.kyc.sumsubWebhookSecret}
                            onChange={(e) => handleChange('kyc', null, 'sumsubWebhookSecret', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('sumsub_webhook')}
                                            edge="end"
                                        >
                                            {showPasswords['sumsub_webhook'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Webhook URL"
                            value={settings.kyc.sumsubWebhookUrl}
                            onChange={(e) => handleChange('kyc', null, 'sumsubWebhookUrl', e.target.value)}
                        />
                    </Grid>

                    {/* Blockchain Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Blockchain Settings
                        </Typography>
                    </Grid>

                    {/* Block Confirmations */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2">
                            Block Confirmations
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <TextField
                            fullWidth
                            label="Ethereum Confirmations"
                            type="number"
                            value={settings.blockchain.confirmations.ethereum}
                            onChange={(e) => handleChange('blockchain', 'confirmations', 'ethereum', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <TextField
                            fullWidth
                            label="BSC Confirmations"
                            type="number"
                            value={settings.blockchain.confirmations.bsc}
                            onChange={(e) => handleChange('blockchain', 'confirmations', 'bsc', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <TextField
                            fullWidth
                            label="Bitcoin Confirmations"
                            type="number"
                            value={settings.blockchain.confirmations.bitcoin}
                            onChange={(e) => handleChange('blockchain', 'confirmations', 'bitcoin', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <TextField
                            fullWidth
                            label="Tron Confirmations"
                            type="number"
                            value={settings.blockchain.confirmations.tron}
                            onChange={(e) => handleChange('blockchain', 'confirmations', 'tron', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={4}>
                        <TextField
                            fullWidth
                            label="XRP Confirmations"
                            type="number"
                            value={settings.blockchain.confirmations.xrp}
                            onChange={(e) => handleChange('blockchain', 'confirmations', 'xrp', e.target.value)}
                        />
                    </Grid>

                    {/* Minimum Balances */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            Minimum Balances
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <TextField
                            fullWidth
                            label="ETH Minimum Balance"
                            type="number"
                            value={settings.blockchain.minimumBalances.eth}
                            onChange={(e) => handleChange('blockchain', 'minimumBalances', 'eth', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ETH</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <TextField
                            fullWidth
                            label="BNB Minimum Balance"
                            type="number"
                            value={settings.blockchain.minimumBalances.bnb}
                            onChange={(e) => handleChange('blockchain', 'minimumBalances', 'bnb', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">BNB</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <TextField
                            fullWidth
                            label="TRX Minimum Balance"
                            type="number"
                            value={settings.blockchain.minimumBalances.trx}
                            onChange={(e) => handleChange('blockchain', 'minimumBalances', 'trx', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">TRX</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <TextField
                            fullWidth
                            label="XRP Minimum Balance"
                            type="number"
                            value={settings.blockchain.minimumBalances.xrp}
                            onChange={(e) => handleChange('blockchain', 'minimumBalances', 'xrp', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">XRP</InputAdornment>,
                            }}
                        />
                    </Grid>

                    {/* Tron Fee Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            Tron Fee Settings
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Token Fee Limit"
                            type="number"
                            value={settings.blockchain.tronFees.tokenFeeLimit}
                            onChange={(e) => handleChange('blockchain', 'tronFees', 'tokenFeeLimit', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">TRX</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Minimum Fee Balance"
                            type="number"
                            value={settings.blockchain.tronFees.minFeeBalance}
                            onChange={(e) => handleChange('blockchain', 'tronFees', 'minFeeBalance', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">TRX</InputAdornment>,
                            }}
                        />
                    </Grid>

                    {/* RPC URLs Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Blockchain RPC URLs
                        </Typography>
                    </Grid>

                    {/* Ethereum RPC URLs */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2">
                            Ethereum
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet RPC URL"
                            value={settings.blockchain.rpc.ethereum.mainnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'ethereum.mainnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet Fallback RPC URL"
                            value={settings.blockchain.rpc.ethereum.mainnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'ethereum.mainnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet RPC URL"
                            value={settings.blockchain.rpc.ethereum.testnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'ethereum.testnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet Fallback RPC URL"
                            value={settings.blockchain.rpc.ethereum.testnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'ethereum.testnetFallback', e.target.value)}
                        />
                    </Grid>

                    {/* BSC RPC URLs */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            BSC
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet RPC URL"
                            value={settings.blockchain.rpc.bsc.mainnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bsc.mainnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet Fallback RPC URL"
                            value={settings.blockchain.rpc.bsc.mainnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bsc.mainnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet RPC URL"
                            value={settings.blockchain.rpc.bsc.testnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bsc.testnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet Fallback RPC URL"
                            value={settings.blockchain.rpc.bsc.testnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bsc.testnetFallback', e.target.value)}
                        />
                    </Grid>

                    {/* Bitcoin RPC URLs */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            Bitcoin
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet RPC URL"
                            value={settings.blockchain.rpc.bitcoin.mainnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bitcoin.mainnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet Fallback RPC URL"
                            value={settings.blockchain.rpc.bitcoin.mainnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bitcoin.mainnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet RPC URL"
                            value={settings.blockchain.rpc.bitcoin.testnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bitcoin.testnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet Fallback RPC URL"
                            value={settings.blockchain.rpc.bitcoin.testnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'bitcoin.testnetFallback', e.target.value)}
                        />
                    </Grid>

                    {/* Tron Network Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            Tron Network
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet API URL"
                            value={settings.blockchain.rpc.tron.mainnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'tron.mainnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet Fallback API URL"
                            value={settings.blockchain.rpc.tron.mainnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'tron.mainnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet API URL"
                            value={settings.blockchain.rpc.tron.testnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'tron.testnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet Fallback API URL"
                            value={settings.blockchain.rpc.tron.testnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'tron.testnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Tron API Key"
                            type={showPasswords['tron_api_key'] ? 'text' : 'password'}
                            value={settings.blockchain.rpc.tron.apiKey}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'tron.apiKey', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('tron_api_key')}
                                            edge="end"
                                        >
                                            {showPasswords['tron_api_key'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* XRP Network Settings */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            XRP Network
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet RPC URL"
                            value={settings.blockchain.rpc.xrp.mainnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'xrp.mainnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Mainnet Fallback RPC URL"
                            value={settings.blockchain.rpc.xrp.mainnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'xrp.mainnetFallback', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet RPC URL"
                            value={settings.blockchain.rpc.xrp.testnet}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'xrp.testnet', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Testnet Fallback RPC URL"
                            value={settings.blockchain.rpc.xrp.testnetFallback}
                            onChange={(e) => handleChange('blockchain', 'rpc', 'xrp.testnetFallback', e.target.value)}
                        />
                    </Grid>

                    {/* Other API Keys */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" className="mb-2 mt-3">
                            Other API Keys
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="CryptoCompare API Key"
                            type={showPasswords['cryptocompare_api_key'] ? 'text' : 'password'}
                            value={settings.blockchain.other.cryptocompareApiKey}
                            onChange={(e) => handleChange('blockchain', 'other', 'cryptocompareApiKey', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => togglePasswordVisibility('cryptocompare_api_key')}
                                            edge="end"
                                        >
                                            {showPasswords['cryptocompare_api_key'] ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                </Grid>

                <Box display="flex" justifyContent="flex-end" mt={3}>
                    <LoadingButton
                        loading={saving}
                        loadingPosition="start"
                        startIcon={<SaveIcon />}
                        variant="contained"
                        onClick={handleSave}
                    >
                        Save Changes
                    </LoadingButton>
                </Box>
            </Paper>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess(null)}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
} 