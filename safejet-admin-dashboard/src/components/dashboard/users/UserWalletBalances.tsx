import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Button,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    TextField,
    TablePagination,
    InputAdornment,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Avatar,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Search as SearchIcon, SyncAlt as SyncIcon, AccountBalanceWallet as WalletIcon, ExpandMore as ExpandMoreIcon, ContentCopy as CopyIcon, AddCircleOutline } from '@mui/icons-material';

interface WalletBalance {
    symbol: string;
    spot: {
        balance: string;
        usdValue: number;
        frozen?: string;
        frozenUsdValue?: number;
    };
    funding: {
        balance: string;
        usdValue: number;
        frozen?: string;
        frozenUsdValue?: number;
    };
    metadata?: {
        icon: string;
        // ... other metadata fields
    };
}

const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const formatCrypto = (value: string) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
    }).format(parseFloat(value));
};

// Add sort options type
type SortOption = 'symbol' | 'spotValue' | 'fundingValue';

export function UserWalletBalances() {
    const router = useRouter();
    const { id } = router.query;
    const [balances, setBalances] = useState<WalletBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
    const [hideZeroBalances, setHideZeroBalances] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{
        type: 'success' | 'error';
        text: string;
        details?: {
            newTokens: string[];
            totalCreated: number;
            spotBalances: number;
            fundingBalances: number;
        };
    } | null>(null);
    const [walletAddresses, setWalletAddresses] = useState<Record<string, Array<{
        network: string;
        address: string;
        memo?: string;
        tag?: string;
    }>>>({});
    const [showAddresses, setShowAddresses] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [copyMessage, setCopyMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
    const [adjustBalanceData, setAdjustBalanceData] = useState({
        baseSymbol: '',
        type: 'spot' as 'spot' | 'funding',
        action: 'add' as 'add' | 'deduct' | 'freeze' | 'unfreeze',
        amount: ''
    });
    const [adjustingBalance, setAdjustingBalance] = useState(false);
    const [userName, setUserName] = useState('');
    const [missingWallets, setMissingWallets] = useState<Array<{blockchain: string; network: string}>>([]);
    const [creatingWallet, setCreatingWallet] = useState(false);
    const [totalValues, setTotalValues] = useState({
        spot: 0,
        spotFrozen: 0,
        funding: 0,
        fundingFrozen: 0
    });

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://admin.ctradesglobal.com/api';

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

    const fetchBalances = async () => {
        if (!id) return;
        
        try {
            const response = await fetchWithRetry(
                `/admin/wallet-balances/${id}?page=${page + 1}&limit=${rowsPerPage}&search=${search}&hideZero=${hideZeroBalances}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
                { method: 'GET' }
            );
            const { data, pagination } = await response.json();
            setBalances(Object.entries(data).map(([symbol, balance]: [string, any]) => ({
                symbol,
                spot: {
                    balance: balance.spot,
                    usdValue: balance.spotUsdValue || 0,
                    frozen: balance.spotFrozen || '0',
                    frozenUsdValue: balance.spotFrozenUsdValue || 0
                },
                funding: {
                    balance: balance.funding,
                    usdValue: balance.fundingUsdValue || 0,
                    frozen: balance.fundingFrozen || '0',
                    frozenUsdValue: balance.fundingFrozenUsdValue || 0
                },
                metadata: balance.metadata || {}
            })));
            setTotal(pagination.total);
            setError('');
        } catch (error) {
            console.error('Error fetching balances:', error);
            setError('Failed to load wallet balances');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!id) return;
        setIsSyncing(true);
        setSyncMessage(null);

        try {
            const response = await fetchWithRetry(
                `/admin/wallet-balances/sync/${id}`,
                { method: 'POST' }
            );

            if (response.ok) {
                const data = await response.json();
                setSyncMessage({
                    type: 'success',
                    text: data.message,
                    details: data.details
                });
                // Refresh balances
                fetchBalances();
            } else {
                throw new Error('Failed to sync wallets');
            }
        } catch (error) {
            setSyncMessage({
                type: 'error',
                text: 'Failed to sync wallet balances. Please try again.'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchWalletAddresses = async () => {
        if (!id) return;
        setLoadingAddresses(true);
        
        try {
            const response = await fetchWithRetry(
                `/admin/wallet-balances/addresses/${id}`,
                { method: 'GET' }
            );
            const data = await response.json();
            setWalletAddresses(data);
        } catch (error) {
            console.error('Error fetching wallet addresses:', error);
            setSyncMessage({
                type: 'error',
                text: 'Failed to load wallet addresses'
            });
        } finally {
            setLoadingAddresses(false);
        }
    };

    const copyToClipboard = (text: string) => {
        try {
            // Just copy the wallet address directly
            document.execCommand('copy');
            const selection = window.getSelection();
            const range = document.createRange();
            const addressElement = document.createElement('span');
            addressElement.textContent = text;
            document.body.appendChild(addressElement);
            range.selectNodeContents(addressElement);
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.execCommand('copy');
            document.body.removeChild(addressElement);
            
            setCopyMessage({
                type: 'success',
                text: 'Address copied to clipboard!'
            });
        } catch (err) {
            console.error('Copy failed:', err);
            setCopyMessage({
                type: 'error',
                text: 'Failed to copy address. Please try again.'
            });
        }
        setTimeout(() => setCopyMessage(null), 2000);
    };

    const handleAdjustBalance = async () => {
        if (!id || !adjustBalanceData.baseSymbol || !adjustBalanceData.amount) return;
        
        setAdjustingBalance(true);
        try {
            const response = await fetchWithRetry(
                `/admin/wallet-balances/${id}/adjust-balance`,
                {
                    method: 'POST',
                    body: JSON.stringify(adjustBalanceData)
                }
            );

            const data = await response.json();
            setSyncMessage({
                type: 'success',
                text: data.message
            });
            setAdjustBalanceOpen(false);
            // Refresh balances
            fetchBalances();
        } catch (err) {
            const error = err as Error;
            setSyncMessage({
                type: 'error',
                text: error?.message || 'Failed to adjust balance'
            });
        } finally {
            setAdjustingBalance(false);
        }
    };

    const fetchUserDetails = async () => {
        if (!id) return;
        try {
            const response = await fetchWithRetry(
                `/admin/users/${id}`,
                { method: 'GET' }
            );
            const user = await response.json();
            setUserName(user.fullName || 'User');
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    const scanWallets = async () => {
        try {
            const response = await fetchWithRetry(
                `/admin/wallet-management/${id}/scan-wallets`,
                { method: 'GET' }
            );
            const data = await response.json();
            setMissingWallets(data.missing);
        } catch (error) {
            console.error('Error scanning wallets:', error);
            setSyncMessage({
                type: 'error',
                text: 'Failed to scan wallets'
            });
        }
    };

    const handleCreateWallet = async (blockchain: string, network: string) => {
        setCreatingWallet(true);
        try {
            await fetchWithRetry(
                `/admin/wallet-management/${id}/create-wallet`,
                {
                    method: 'POST',
                    body: JSON.stringify({ blockchain, network })
                }
            );
            // Refresh scan
            await scanWallets();
            setSyncMessage({
                type: 'success',
                text: `Successfully created ${blockchain} ${network} wallet`
            });
        } catch (error) {
            console.error('Error creating wallet:', error);
            setSyncMessage({
                type: 'error',
                text: 'Failed to create wallet'
            });
        } finally {
            setCreatingWallet(false);
        }
    };

    useEffect(() => {
        if (id) {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            setSearchTimeout(setTimeout(() => {
                fetchBalances();
            }, 500));
        }
    }, [id, page, rowsPerPage, search, hideZeroBalances, sortBy, sortOrder]);

    useEffect(() => {
        if (id) {
            fetchUserDetails();
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            scanWallets();
        }
    }, [id]);

    useEffect(() => {
        const totals = balances.reduce((acc, balance) => {
            acc.spot += balance.spot.usdValue;
            acc.spotFrozen += (balance.spot.frozenUsdValue || 0);
            acc.funding += balance.funding.usdValue;
            acc.fundingFrozen += (balance.funding.frozenUsdValue || 0);
            return acc;
        }, {
            spot: 0,
            spotFrozen: 0,
            funding: 0,
            fundingFrozen: 0
        });
        
        setTotalValues(totals);
    }, [balances]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <Typography color="textSecondary">Loading wallet balances...</Typography>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                color: 'text.primary',  // Make text color more prominent
                                fontWeight: 500,        // Make it slightly bolder
                                fontSize: '1.5rem'      // Ensure good size
                            }}
                        >
                            {userName}'s Wallet Balances
                        </Typography>
                    </div>
                </div>

                {error && (
                    <Alert severity="error" className="mb-4">
                        {error}
                    </Alert>
                )}
                
                {/* Add info alert about frozen balances */}
                <Alert severity="info" sx={{ mt: 2 }} onClose={() => {}} className="mb-4">
                    <Typography variant="body2">
                        Balances now show both available and frozen amounts. Frozen balances are funds that are currently locked in trades, withdrawals, or other operations.
                    </Typography>
                </Alert>
            </div>

            <Paper className="p-6">
                <div className="flex flex-col space-y-4 mb-4">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Wallet Balances
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                color="info"
                                startIcon={<WalletIcon />}
                                onClick={() => {
                                    fetchWalletAddresses();
                                    setShowAddresses(true);
                                }}
                                disabled={loadingAddresses}
                            >
                                View Wallet Addresses
                            </Button>
                            
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSync}
                                disabled={isSyncing}
                                startIcon={isSyncing ? <CircularProgress size={20} /> : <SyncIcon />}
                            >
                                {isSyncing ? 'Syncing...' : 'Sync Balances'}
                            </Button>
                        </Box>
                    </Box>

                    {/* Legend for frozen balances */}
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            bgcolor: 'background.paper',
                            p: 1,
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            borderRadius: 1,
                            mb: 2
                        }}
                    >
                        <Box sx={{ 
                            width: 16, 
                            height: 16, 
                            bgcolor: 'warning.main', 
                            borderRadius: '50%' 
                        }} />
                        <Typography variant="caption">
                            <strong>Frozen balance</strong> - Funds that are locked and cannot be used for trading or withdrawals
                        </Typography>
                    </Box>

                    {syncMessage && (
                        <Alert 
                            severity={syncMessage.type}
                            onClose={() => setSyncMessage(null)}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="body2">{syncMessage.text}</Typography>
                            {syncMessage.details && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" component="div">
                                        • Created {syncMessage.details.totalCreated} new wallets
                                    </Typography>
                                    {syncMessage.details.newTokens.length > 0 && (
                                        <Typography variant="caption" component="div">
                                            • Added support for new tokens: {syncMessage.details.newTokens.join(', ')}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" component="div">
                                        • Updated {syncMessage.details.spotBalances} spot balances and {syncMessage.details.fundingBalances} funding balances
                                    </Typography>
                                </Box>
                            )}
                        </Alert>
                    )}

                    <div className="flex items-center space-x-4">
                        <TextField
                            className="flex-grow"
                            variant="outlined"
                            placeholder="Search by token symbol..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        
                        <FormControl variant="outlined" style={{ minWidth: 200 }}>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                label="Sort By"
                            >
                                <MenuItem value="symbol">Symbol</MenuItem>
                                <MenuItem value="spotValue">Spot Value</MenuItem>
                                <MenuItem value="fundingValue">Funding Value</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            variant="outlined"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            startIcon={sortOrder === 'asc' ? '↑' : '↓'}
                        >
                            {sortOrder.toUpperCase()}
                        </Button>
                    </div>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={hideZeroBalances}
                                onChange={(e) => setHideZeroBalances(e.target.checked)}
                            />
                        }
                        label="Hide Zero Balances"
                    />
                </div>

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
                        Missing wallets detected: {missingWallets.map(w => `${w.blockchain} ${w.network}`).join(', ')}
                    </Alert>
                )}

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Token</TableCell>
                                <TableCell align="right">Spot Balance</TableCell>
                                <TableCell align="right">Spot Value (USD)</TableCell>
                                <TableCell align="right">Funding Balance</TableCell>
                                <TableCell align="right">Funding Value (USD)</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balances.map((balance) => {
                                // Calculate if there are any frozen balances
                                const hasSpotFrozen = parseFloat(balance.spot.frozen || '0') > 0;
                                const hasFundingFrozen = parseFloat(balance.funding.frozen || '0') > 0;
                                const hasFrozen = hasSpotFrozen || hasFundingFrozen;
                                
                                return (
                                    <TableRow 
                                        key={balance.symbol}
                                        sx={{ 
                                            // Add a subtle background color if there are frozen funds
                                            ...(hasFrozen && { 
                                                backgroundColor: 'rgba(255, 152, 0, 0.05)' 
                                            })
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar 
                                                    src={balance.metadata?.icon}
                                                    alt={balance.symbol}
                                                    sx={{ 
                                                        width: 28,
                                                        height: 28,
                                                        backgroundColor: 'transparent',
                                                        border: '1px solid #e0e0e0',
                                                        padding: '2px'
                                                    }}
                                                >
                                                    {balance.symbol.charAt(0)}
                                                </Avatar>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontWeight: 500,
                                                        color: 'text.primary',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {balance.symbol}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{formatCrypto(balance.spot.balance)}</Typography>
                                            {hasSpotFrozen && (
                                                <Tooltip title="Frozen balances are temporarily locked funds that cannot be withdrawn or traded. These may be reserved for open orders, pending transactions, or security holds.">
                                                    <Box component="div" sx={{ 
                                                        color: 'warning.main', 
                                                        mt: 0.5, 
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'medium',
                                                        borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                        pt: 0.5,
                                                        cursor: 'help'
                                                    }}>
                                                        {formatCrypto(balance.spot.frozen || '0')} frozen
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{formatUSD(balance.spot.usdValue)}</Typography>
                                            {hasSpotFrozen && (
                                                <Tooltip title="USD value of the frozen balance">
                                                    <Box component="div" sx={{ 
                                                        color: 'warning.main', 
                                                        mt: 0.5, 
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'medium',
                                                        borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                        pt: 0.5,
                                                        cursor: 'help'
                                                    }}>
                                                        {formatUSD(balance.spot.frozenUsdValue || 0)} frozen
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{formatCrypto(balance.funding.balance)}</Typography>
                                            {hasFundingFrozen && (
                                                <Tooltip title="Frozen balances are temporarily locked funds that cannot be withdrawn or traded. These may be reserved for open orders, pending transactions, or security holds.">
                                                    <Box component="div" sx={{ 
                                                        color: 'warning.main', 
                                                        mt: 0.5, 
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'medium',
                                                        borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                        pt: 0.5,
                                                        cursor: 'help'
                                                    }}>
                                                        {formatCrypto(balance.funding.frozen || '0')} frozen
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{formatUSD(balance.funding.usdValue)}</Typography>
                                            {hasFundingFrozen && (
                                                <Tooltip title="USD value of the frozen balance">
                                                    <Box component="div" sx={{ 
                                                        color: 'warning.main', 
                                                        mt: 0.5, 
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'medium',
                                                        borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                        pt: 0.5,
                                                        cursor: 'help'
                                                    }}>
                                                        {formatUSD(balance.funding.frozenUsdValue || 0)} frozen
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setAdjustBalanceData(prev => ({
                                                        ...prev,
                                                        baseSymbol: balance.symbol,
                                                        amount: ''  // Reset amount
                                                    }));
                                                    setAdjustBalanceOpen(true);
                                                }}
                                                startIcon={<AddCircleOutline />}
                                            >
                                                Adjust
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow 
                                sx={{ 
                                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                    '& td': { fontWeight: 'bold' }
                                }}
                            >
                                <TableCell>Total</TableCell>
                                <TableCell align="right">-</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2">{formatUSD(totalValues.spot)}</Typography>
                                    {totalValues.spotFrozen > 0 && (
                                        <Tooltip title="Total USD value of all frozen spot balances">
                                            <Box component="div" sx={{ 
                                                color: 'warning.main', 
                                                mt: 0.5, 
                                                fontSize: '0.75rem',
                                                fontWeight: 'medium',
                                                borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                pt: 0.5,
                                                cursor: 'help'
                                            }}>
                                                {formatUSD(totalValues.spotFrozen)} frozen
                                            </Box>
                                        </Tooltip>
                                    )}
                                </TableCell>
                                <TableCell align="right">-</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2">{formatUSD(totalValues.funding)}</Typography>
                                    {totalValues.fundingFrozen > 0 && (
                                        <Tooltip title="Total USD value of all frozen funding balances">
                                            <Box component="div" sx={{ 
                                                color: 'warning.main', 
                                                mt: 0.5, 
                                                fontSize: '0.75rem',
                                                fontWeight: 'medium',
                                                borderTop: '1px dashed rgba(255, 152, 0, 0.5)',
                                                pt: 0.5,
                                                cursor: 'help'
                                            }}>
                                                {formatUSD(totalValues.fundingFrozen)} frozen
                                            </Box>
                                        </Tooltip>
                                    )}
                                </TableCell>
                                <TableCell align="center">-</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </Paper>

            <Dialog
                open={showAddresses}
                onClose={() => {
                    setShowAddresses(false);
                    setCopyMessage(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Wallet Addresses</DialogTitle>
                <DialogContent>
                    {copyMessage && (
                        <Alert 
                            severity={copyMessage.type}
                            onClose={() => setCopyMessage(null)}
                            sx={{ mb: 2 }}
                        >
                            {copyMessage.text}
                        </Alert>
                    )}
                    {loadingAddresses ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        Object.entries(walletAddresses).map(([blockchain, addresses]) => (
                            <Accordion key={blockchain}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1" sx={{ textTransform: 'uppercase' }}>
                                        {blockchain}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List dense>
                                        {addresses.map((wallet, idx) => (
                                            <React.Fragment key={`${blockchain}-${wallet.network}-${idx}`}>
                                                <ListItem
                                                    secondaryAction={
                                                        <Tooltip title="Copy Address">
                                                            <IconButton 
                                                                edge="end" 
                                                                onClick={() => copyToClipboard(wallet.address)}
                                                            >
                                                                <CopyIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    }
                                                >
                                                    <ListItemText
                                                        primary={`${wallet.network}`}
                                                        secondary={
                                                            <React.Fragment>
                                                                <Typography component="span" variant="body2">
                                                                    {wallet.address}
                                                                </Typography>
                                                                {wallet.memo && (
                                                                    <Typography component="div" variant="caption">
                                                                        Memo: {wallet.memo}
                                                                    </Typography>
                                                                )}
                                                                {wallet.tag && (
                                                                    <Typography component="div" variant="caption">
                                                                        Tag: {wallet.tag}
                                                                    </Typography>
                                                                )}
                                                            </React.Fragment>
                                                        }
                                                    />
                                                </ListItem>
                                                <Divider />
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowAddresses(false);
                        setCopyMessage(null);
                    }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={adjustBalanceOpen}
                onClose={() => !adjustingBalance && setAdjustBalanceOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Adjust Token Balance</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Typography variant="subtitle1">
                            Token: {adjustBalanceData.baseSymbol}
                        </Typography>

                        {/* Information about frozen balances */}
                        {(adjustBalanceData.action === 'freeze' || adjustBalanceData.action === 'unfreeze') && (
                            <Alert severity="info" sx={{ mb: 1 }}>
                                <Typography variant="caption">
                                    {adjustBalanceData.action === 'freeze' 
                                        ? 'Freezing balances will make them unavailable for trading or withdrawal. Use this for security holds or dispute resolution.' 
                                        : 'Unfreezing will make previously locked funds available again for trading and withdrawal.'}
                                </Typography>
                            </Alert>
                        )}

                        <FormControl fullWidth>
                            <InputLabel>Balance Type</InputLabel>
                            <Select
                                value={adjustBalanceData.type}
                                onChange={(e) => setAdjustBalanceData(prev => ({
                                    ...prev,
                                    type: e.target.value as 'spot' | 'funding'
                                }))}
                                label="Balance Type"
                            >
                                <MenuItem value="spot">Spot</MenuItem>
                                <MenuItem value="funding">Funding</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Action</InputLabel>
                            <Select
                                value={adjustBalanceData.action}
                                onChange={(e) => setAdjustBalanceData(prev => ({
                                    ...prev,
                                    action: e.target.value as 'add' | 'deduct' | 'freeze' | 'unfreeze'
                                }))}
                                label="Action"
                            >
                                <MenuItem value="add">Add</MenuItem>
                                <MenuItem value="deduct">Deduct</MenuItem>
                                <MenuItem value="freeze" sx={{ color: 'warning.main' }}>Freeze</MenuItem>
                                <MenuItem value="unfreeze" sx={{ color: 'success.main' }}>Unfreeze</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Amount"
                            type="number"
                            value={adjustBalanceData.amount}
                            onChange={(e) => setAdjustBalanceData(prev => ({
                                ...prev,
                                amount: e.target.value
                            }))}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0, step: "any" }
                            }}
                            helperText={
                                adjustBalanceData.action === 'freeze' 
                                    ? 'Amount to freeze from available balance' 
                                    : adjustBalanceData.action === 'unfreeze'
                                        ? 'Amount to unfreeze and return to available balance'
                                        : undefined
                            }
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setAdjustBalanceOpen(false)} 
                        disabled={adjustingBalance}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdjustBalance}
                        variant="contained"
                        color={adjustBalanceData.action === 'freeze' ? 'warning' : 
                              adjustBalanceData.action === 'unfreeze' ? 'success' : 'primary'}
                        disabled={adjustingBalance || !adjustBalanceData.baseSymbol || !adjustBalanceData.amount}
                    >
                        {adjustingBalance ? 'Processing...' : (
                            adjustBalanceData.action === 'add' ? 'Add Balance' :
                            adjustBalanceData.action === 'deduct' ? 'Deduct Balance' :
                            adjustBalanceData.action === 'freeze' ? 'Freeze Balance' : 'Unfreeze Balance'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
} 