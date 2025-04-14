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
import { ArrowBack as ArrowBackIcon, ContentCopy as ContentCopyIcon, LockOpen as LockOpenIcon } from '@mui/icons-material';
import { DecryptWalletDialog } from './DecryptWalletDialog';

interface AdminWallet {
    id: string;
    blockchain: string;
    network: string;
    address: string;
    type: 'hot' | 'cold';
    isActive: boolean;
    createdAt: string;
}

export function AdminWallets() {
    const router = useRouter();
    const [wallets, setWallets] = useState<AdminWallet[]>([]);
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
    const [selectedWallet, setSelectedWallet] = useState<AdminWallet | null>(null);
    const [decryptDialogOpen, setDecryptDialogOpen] = useState(false);

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

    const fetchWallets = async () => {
        try {
            const response = await fetchWithRetry('/admin/wallets', { method: 'GET' });
            const data = await response.json();
            setWallets(data);
            setError('');
        } catch (err) {
            setError('Failed to load admin wallets');
            console.error('Error fetching wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const scanMissingWallets = async () => {
        try {
            const response = await fetchWithRetry('/admin/wallets/scan', { method: 'GET' });
            const data = await response.json();
            setMissingWallets(data.missing);
        } catch (err) {
            console.error('Error scanning wallets:', err);
            setError('Failed to scan for missing wallets');
        }
    };

    const handleCreateWallet = async (blockchain: string, network: string) => {
        setCreatingWallet(true);
        try {
            await fetchWithRetry(
                '/admin/wallets',
                {
                    method: 'POST',
                    body: JSON.stringify({ blockchain, network, type: 'hot' })
                }
            );
            
            setStatus({ type: 'success', message: `Successfully created ${blockchain} ${network} wallet` });
            await fetchWallets();
            await scanMissingWallets();
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to create wallet' });
            console.error('Error creating wallet:', err);
        } finally {
            setCreatingWallet(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            // Check if clipboard API is available
            if (!navigator?.clipboard) {
                // Fallback to older execCommand method
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
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
                document.body.removeChild(textArea);
                return;
            }

            // Use modern clipboard API
            await navigator.clipboard.writeText(text);
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

    const handleDecryptClick = (wallet: AdminWallet) => {
        setSelectedWallet(wallet);
        setDecryptDialogOpen(true);
    };

    const handleDecryptDialogClose = () => {
        setSelectedWallet(null);
        setDecryptDialogOpen(false);
    };

    useEffect(() => {
        fetchWallets();
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
                        <Typography variant="h5">Admin Wallets</Typography>
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
                    Missing admin wallets detected: {missingWallets.map(w => `${w.blockchain} ${w.network}`).join(', ')}
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
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wallets.map((wallet) => (
                                <TableRow key={wallet.id}>
                                    <TableCell>{wallet.blockchain}</TableCell>
                                    <TableCell>{wallet.network}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                                {wallet.address}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => copyToClipboard(wallet.address)}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleDecryptClick(wallet)}
                                            startIcon={<LockOpenIcon />}
                                        >
                                            Decrypt
                                        </Button>
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

            {selectedWallet && (
                <DecryptWalletDialog
                    open={decryptDialogOpen}
                    onClose={handleDecryptDialogClose}
                    walletId={selectedWallet.id}
                    blockchain={selectedWallet.blockchain}
                    network={selectedWallet.network}
                />
            )}
        </div>
    );
} 