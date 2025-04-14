import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TablePagination,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    RadioGroup,
    FormControlLabel,
    Radio,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RetryIcon, Visibility as VisibilityIcon, Info as InfoIcon } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

interface SweepTransaction {
    id: string;
    depositId: string;
    fromWalletId: string;
    toAdminWalletId: string;
    amount: string;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    txHash: string;
    message?: string;
    metadata: {
        blockchain: string;
        network: string;
        tokenId?: string;
    };
    token?: {
        symbol: string;
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export function SweepTransactions() {
    const router = useRouter();
    const [sweepTxs, setSweepTxs] = useState<SweepTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedTx, setSelectedTx] = useState<SweepTransaction | null>(null);
    const [retryingTx, setRetryingTx] = useState<string | null>(null);
    const [retryDialog, setRetryDialog] = useState(false);
    const [feeOption, setFeeOption] = useState<'same' | 'higher'>('higher');
    const [messageDialog, setMessageDialog] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState('');

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

    const fetchSweepTransactions = async () => {
        try {
            const response = await fetchWithRetry(
                `/admin/sweep-transactions?page=${page + 1}&limit=${rowsPerPage}&search=${search}&status=${statusFilter}`,
                { method: 'GET' }
            );
            const { data, pagination } = await response.json();
            
            // Fetch token details for each sweep
            const sweepsWithTokens = await Promise.all(data.map(async (sweep: SweepTransaction) => {
                if (sweep.metadata.tokenId) {
                    const tokenResponse = await fetchWithRetry(
                        `/admin/deposits/token-details/${sweep.metadata.tokenId}`,
                        { method: 'GET' }
                    );
                    const token = await tokenResponse.json();
                    return { ...sweep, token };
                }
                return sweep;
            }));

            setSweepTxs(sweepsWithTokens);
            setTotal(pagination.total);
            setError('');
        } catch (error) {
            console.error('Error fetching sweep transactions:', error);
            setError('Failed to load sweep transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            fetchSweepTransactions();
        }, 500);
        setSearchTimeout(timeout);
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [page, rowsPerPage, search, statusFilter]);

    const handleRetry = async () => {
        if (!selectedTx) return;

        setRetryingTx(selectedTx.id);
        try {
            await fetchWithRetry(
                `/admin/sweep-transactions/${selectedTx.id}/retry`,
                {
                    method: 'POST',
                    body: JSON.stringify({ feeOption })
                }
            );
            await fetchSweepTransactions();
            setRetryDialog(false);
        } catch (error) {
            console.error('Error retrying sweep:', error);
        } finally {
            setRetryingTx(null);
        }
    };

    const getStatusChipColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'failed':
                return 'error';
            case 'skipped':
                return 'default';
            default:
                return 'default';
        }
    };

    const formatAmount = (amount: string): string => {
        try {
            // Convert to number and handle scientific notation
            const num = Number(amount);
            if (isNaN(num)) return '0';

            // Convert to string without scientific notation
            const fullStr = num.toFixed(18);

            // Remove trailing zeros after decimal
            const parts = fullStr.split('.');
            if (parts.length === 2) {
                parts[1] = parts[1].replace(/0+$/, '');
                return parts[1].length > 0 ? parts.join('.') : parts[0];
            }
            return parts[0];
        } catch (error) {
            console.error('Error formatting amount:', error);
            return amount;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">Sweep Transactions</h2>
                        <p className="text-sm text-gray-500">View and manage sweep transactions</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <TextField
                            placeholder="Search by TX hash, Deposit ID, or Wallet"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="min-w-[200px]"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: '200px' }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as string)}
                                label="Status"
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                                <MenuItem value="failed">Failed</MenuItem>
                                <MenuItem value="skipped">Skipped</MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                </div>
            </div>

            {/* Sweep Transactions Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>TX Hash</TableCell>
                            <TableCell>From Wallet</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Blockchain</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created At</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sweepTxs.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell>
                                    <Tooltip title={tx.txHash}>
                                        <span className="font-mono">
                                            {tx.txHash.substring(0, 8)}...
                                            {tx.txHash.substring(tx.txHash.length - 8)}
                                        </span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>{tx.fromWalletId}</TableCell>
                                <TableCell>
                                    {formatAmount(tx.amount)} {tx.token?.symbol || ''}
                                </TableCell>
                                <TableCell>
                                    {tx.metadata.blockchain} ({tx.metadata.network})
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={tx.status}
                                        color={getStatusChipColor(tx.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {new Date(tx.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                    <div className="flex justify-end gap-2">
                                        {tx.message && (
                                            <IconButton 
                                                size="small"
                                                onClick={() => {
                                                    setSelectedMessage(tx.message || '');
                                                    setMessageDialog(true);
                                                }}
                                            >
                                                <InfoIcon />
                                            </IconButton>
                                        )}
                                        {(tx.status === 'failed' || tx.status === 'skipped' || tx.status === 'pending') && (
                                            <Tooltip title="Retry Sweep">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedTx(tx);
                                                        setRetryDialog(true);
                                                    }}
                                                >
                                                    <RetryIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>

            {/* Retry Dialog */}
            <Dialog open={retryDialog} onClose={() => setRetryDialog(false)}>
                <DialogTitle>Retry Sweep Transaction</DialogTitle>
                <DialogContent>
                    <div className="mt-4">
                        <Typography variant="subtitle2" gutterBottom>
                            Fee Option
                        </Typography>
                        <RadioGroup
                            value={feeOption}
                            onChange={(e) => setFeeOption(e.target.value as 'same' | 'higher')}
                        >
                            <FormControlLabel
                                value="same"
                                control={<Radio />}
                                label="Use same fee"
                            />
                            <FormControlLabel
                                value="higher"
                                control={<Radio />}
                                label="Use higher fee (recommended)"
                            />
                        </RadioGroup>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRetryDialog(false)}>Cancel</Button>
                    <LoadingButton
                        loading={Boolean(retryingTx)}
                        onClick={handleRetry}
                        variant="contained"
                        color="primary"
                    >
                        Retry
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            {/* Message Dialog */}
            <Dialog 
                open={messageDialog} 
                onClose={() => setMessageDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Message</DialogTitle>
                <DialogContent>
                    <Typography>{selectedMessage}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMessageDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
} 