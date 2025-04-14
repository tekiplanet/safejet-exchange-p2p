import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Button,
    CircularProgress,
    IconButton,
    Snackbar,
    Alert as MuiAlert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, ContentCopy as ContentCopyIcon, AccountBalanceWallet as WalletIcon } from '@mui/icons-material';

interface GasTankWallet {
    id: string;
    blockchain: string;
    network: string;
    address: string;
    keyId: string;
    type: 'gas_tank';
    isActive: boolean;
    createdAt: string;
    balance?: {
        balance: string;
        symbol: string;
    };
}

export function GasTankWallets() {
    const router = useRouter();
    const [wallets, setWallets] = useState<GasTankWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [missingWallets, setMissingWallets] = useState<Array<{blockchain: string; network: string}>>([]);
    const [creatingWallet, setCreatingWallet] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [loadingBalances, setLoadingBalances] = useState<{ [key: string]: boolean }>({});

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://encrypted.nadiapoint.com/api';

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

    const fetchWallets = async () => {
        try {
            const response = await fetchWithRetry('/admin/gas-tank-wallets', { method: 'GET' });
            const data = await response.json();
            return data;
        } catch (err) {
            setError('Failed to load gas tank wallets');
            console.error('Error fetching wallets:', err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const scanMissingWallets = async () => {
        try {
            const response = await fetchWithRetry('/admin/gas-tank-wallets/scan', { method: 'GET' });
            const data = await response.json();
            setMissingWallets(data.missing);
        } catch (err) {
            console.error('Error scanning wallets:', err);
            setError('Failed to scan for missing gas tank wallets');
        }
    };

    const handleCreateWallet = async (blockchain: string, network: string) => {
        setCreatingWallet(true);
        try {
            await fetchWithRetry(
                '/admin/gas-tank-wallets',
                {
                    method: 'POST',
                    body: JSON.stringify({ blockchain, network, type: 'gas_tank' })
                }
            );
            
            setStatus({ type: 'success', message: `Successfully created ${blockchain} ${network} gas tank wallet` });
            await fetchWallets();
            await scanMissingWallets();
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to create gas tank wallet' });
            console.error('Error creating wallet:', err);
        } finally {
            setCreatingWallet(false);
        }
    };

    const copyToClipboard = (text: string) => {
        try {
            // Create a temporary input element
            const tempInput = document.createElement('input');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            
            // Select and copy the text
            tempInput.select();
            document.execCommand('copy');
            
            // Remove the temporary element
            document.body.removeChild(tempInput);

            setSnackbar({
                open: true,
                message: 'Address copied to clipboard',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: 'Failed to copy address',
                severity: 'error'
            });
        }
    };

    const fetchWalletBalance = async (walletId: string) => {
        setLoadingBalances(prev => ({ ...prev, [walletId]: true }));
        try {
            const response = await fetchWithRetry(`/admin/gas-tank-wallets/${walletId}/balance`, { 
                method: 'GET' 
            });
            const balanceData = await response.json();
            
            setWallets(currentWallets => 
                currentWallets.map(wallet => 
                    wallet.id === walletId 
                        ? { ...wallet, balance: balanceData }
                        : wallet
                )
            );

            setSnackbar({
                open: true,
                message: 'Balance fetched successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error fetching balance:', err);
            setSnackbar({
                open: true,
                message: 'Failed to fetch balance',
                severity: 'error'
            });
        } finally {
            setLoadingBalances(prev => ({ ...prev, [walletId]: false }));
        }
    };

    useEffect(() => {
        fetchWallets().then(data => {
            // Sort wallets alphabetically by blockchain and then by network
            const sortedWallets = data.sort((a: GasTankWallet, b: GasTankWallet) => {
                const blockchainCompare = a.blockchain.localeCompare(b.blockchain);
                if (blockchainCompare !== 0) return blockchainCompare;
                return a.network.localeCompare(b.network);
            });
            setWallets(sortedWallets);
        });
        scanMissingWallets();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.back()}
                            variant="outlined"
                        >
                            Back
                        </Button>
                        <Typography variant="h5">Gas Tank Wallets</Typography>
                    </div>
                </div>

                {status && (
                    <Alert 
                        severity={status.type}
                        onClose={() => setStatus(null)}
                        sx={{ mb: 2 }}
                    >
                        {status.message}
                    </Alert>
                )}
            </div>

            {/* Missing Wallets Alert */}
            {missingWallets.length > 0 && (
                <Alert 
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {missingWallets.map(({ blockchain, network }) => (
                                <Button
                                    key={`${blockchain}-${network}`}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleCreateWallet(blockchain, network)}
                                    disabled={creatingWallet}
                                >
                                    Create {blockchain} {network}
                                </Button>
                            ))}
                        </Box>
                    }
                >
                    Missing gas tank wallets detected: {missingWallets.map(w => `${w.blockchain} ${w.network}`).join(', ')}
                </Alert>
            )}

            {/* Wallets Table */}
            <Paper className="p-6">
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Blockchain</TableCell>
                                <TableCell>Network</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Balance</TableCell>
                                <TableCell>Created At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wallets.map((wallet) => (
                                <TableRow key={wallet.id}>
                                    <TableCell>{wallet.blockchain}</TableCell>
                                    <TableCell>{wallet.network}</TableCell>
                                    <TableCell>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ 
                                                maxWidth: '200px', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis' 
                                            }}>
                                                {wallet.address}
                                            </span>
                                            <IconButton 
                                                size="small"
                                                onClick={() => copyToClipboard(wallet.address)}
                                                aria-label="copy address"
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                    </TableCell>
                                    <TableCell>{wallet.type}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            wallet.isActive 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {wallet.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {wallet.balance ? (
                                            <div className="flex items-center gap-2">
                                                <span>{`${wallet.balance.balance} ${wallet.balance.symbol}`}</span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => fetchWalletBalance(wallet.id)}
                                                    disabled={loadingBalances[wallet.id]}
                                                >
                                                    <WalletIcon fontSize="small" />
                                                </IconButton>
                                            </div>
                                        ) : (
                                            <Button
                                                size="small"
                                                startIcon={loadingBalances[wallet.id] ? <CircularProgress size={20} /> : <WalletIcon />}
                                                onClick={() => fetchWalletBalance(wallet.id)}
                                                disabled={loadingBalances[wallet.id]}
                                            >
                                                View Balance
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(wallet.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Snackbar 
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <MuiAlert 
                    elevation={6} 
                    variant="filled" 
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </MuiAlert>
            </Snackbar>
        </div>
    );
} 