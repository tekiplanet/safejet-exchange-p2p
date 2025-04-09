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
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Popover,
} from '@mui/material';
import { Search as SearchIcon, Visibility as VisibilityIcon, PlayArrow as ProcessIcon } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from 'notistack';

interface Withdrawal {
    id: string;
    userId: string;
    tokenId: string;
    address: string;
    amount: string;
    fee: string;
    networkVersion: string;
    network: string;
    memo?: string;
    tag?: string;
    txHash?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    metadata: {
        token: {
            symbol: string;
            name: string;
            networkVersion: string;
        };
        amount: {
            value: string;
            usdValue: string;
        };
        fee: {
            amount: string;
            usdValue: string;
        };
        receiveAmount: string;
        processingReason?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface User {
    id: string;
    fullName: string;
    email: string;
}

interface Token {
    id: string;
    symbol: string;
    name: string;
    blockchain: string;
    networkVersion: string;
}

interface ProcessConfirmationState {
    password: string;
    secretKey: string;
    error: string;
}

export function WithdrawalManagement() {
    const router = useRouter();
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
    const [statusFilter, setStatusFilter] = useState('');
    const [blockchainFilter, setBlockchainFilter] = useState('');
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
    const [userDetails, setUserDetails] = useState<Record<string, User>>({});
    const [tokenDetails, setTokenDetails] = useState<Record<string, Token>>({});
    const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState<'completed' | 'failed' | 'cancelled'>('completed');
    const [processingReason, setProcessingReason] = useState('');
    const [processConfirmation, setProcessConfirmation] = useState<ProcessConfirmationState>({
        password: '',
        secretKey: '',
        error: ''
    });
    const [showProcessConfirmation, setShowProcessConfirmation] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://admin.ctradesglobal.com/api';

    const formatAmount = (amount: string): string => {
        try {
            const num = parseFloat(amount);
            if (isNaN(num)) return '0';
            const parts = num.toFixed(8).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (parts[1]) {
                parts[1] = parts[1].replace(/0+$/, '');
                return parts[1].length > 0 ? parts.join('.') : parts[0];
            }
            return parts[0];
        } catch (error) {
            console.error('Error formatting amount:', error);
            return amount;
        }
    };

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

    const fetchUserDetails = async (userId: string) => {
        if (userDetails[userId]) return;
        
        try {
            const response = await fetchWithRetry(
                `/admin/users/${userId}`,
                { method: 'GET' }
            );
            const user = await response.json();
            setUserDetails(prev => ({
                ...prev,
                [userId]: user
            }));
        } catch (error) {
            console.error(`Error fetching user details for ${userId}:`, error);
        }
    };

    const fetchTokenDetails = async (tokenId: string) => {
        if (tokenDetails[tokenId]) return;
        
        try {
            const response = await fetchWithRetry(
                `/admin/deposits/token-details/${tokenId}`,
                { method: 'GET' }
            );
            const token = await response.json();
            setTokenDetails(prev => ({
                ...prev,
                [tokenId]: token
            }));
        } catch (error) {
            console.error(`Error fetching token details for ${tokenId}:`, error);
        }
    };

    const fetchWithdrawals = async () => {
        try {
            const response = await fetchWithRetry(
                `/admin/withdrawals?page=${page + 1}&limit=${rowsPerPage}&search=${search}&status=${statusFilter}&blockchain=${blockchainFilter}`,
                { method: 'GET' }
            );
            const { data, pagination } = await response.json();
            setWithdrawals(data);
            setTotal(pagination.total);
            setError('');

            const withdrawals = data as Withdrawal[];
            
            const userIds = withdrawals.map(w => w.userId);
            const tokenIds = withdrawals.map(w => w.tokenId);
            
            const uniqueUserIds = Array.from(new Set(userIds));
            const uniqueTokenIds = Array.from(new Set(tokenIds));
            
            await Promise.all([
                ...uniqueUserIds.map(id => fetchUserDetails(id)),
                ...uniqueTokenIds.map(id => fetchTokenDetails(id))
            ]);
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            setError('Failed to load withdrawals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            fetchWithdrawals();
        }, 500);
        setSearchTimeout(timeout);
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [page, rowsPerPage, search, statusFilter, blockchainFilter]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusChipColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'processing':
                return 'info';
            case 'failed':
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const handleViewDetails = (withdrawal: Withdrawal) => {
        setSelectedWithdrawal(withdrawal);
    };

    const handleCloseDetails = () => {
        setSelectedWithdrawal(null);
    };

    const handleProcessClick = (event: React.MouseEvent<HTMLElement>, withdrawalId: string) => {
        setProcessingWithdrawalId(withdrawalId);
        setShowProcessConfirmation(true);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
        setProcessingWithdrawalId(null);
        setProcessingStatus('completed');
        setProcessingReason('');
    };

    const handleCloseProcessConfirmation = () => {
        setShowProcessConfirmation(false);
        setProcessConfirmation({
            password: '',
            secretKey: '',
            error: ''
        });
    };

    const handleProcessWithdrawal = async () => {
        if (!processConfirmation.password || !processConfirmation.secretKey) {
            setProcessConfirmation(prev => ({
                ...prev,
                error: 'Please fill in both password and secret key'
            }));
            return;
        }

        try {
            setProcessingWithdrawal(processingWithdrawalId);
            const withdrawal = withdrawals.find(w => w.id === processingWithdrawalId);
            if (!withdrawal) {
                throw new Error('Withdrawal not found');
            }

            const metadata = typeof withdrawal.metadata === 'string' 
                ? JSON.parse(withdrawal.metadata) 
                : withdrawal.metadata;

            const response = await fetchWithRetry(
                `/admin/withdrawals/${processingWithdrawalId}/process`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        status: 'completed',
                        password: processConfirmation.password,
                        secretKey: processConfirmation.secretKey,
                        amount: metadata.receiveAmount
                    })
                }
            );

            const data = await response.json();
            if (!data.success) {
                setProcessConfirmation(prev => ({
                    ...prev,
                    error: data.message
                }));
                return;
            }

            enqueueSnackbar('Withdrawal processed successfully', { variant: 'success' });
            handleCloseProcessConfirmation();
            handleClosePopover();
            fetchWithdrawals();
        } catch (error) {
            console.error('Process withdrawal error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to process withdrawal';
            
            setProcessConfirmation(prev => ({
                ...prev,
                error: errorMessage
            }));
        } finally {
            setProcessingWithdrawal(null);
        }
    };

    const getUserDetailsUrl = (userId: string) => `/dashboard/users/details?id=${userId}`;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">Withdrawal Management</h2>
                        <p className="text-sm text-gray-500">View and manage all withdrawals</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <TextField
                            placeholder="Search by TX hash, User ID, or Transaction ID"
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
                                <MenuItem value="processing">Processing</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                                <MenuItem value="failed">Failed</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: '200px' }}>
                            <InputLabel>Blockchain</InputLabel>
                            <Select
                                value={blockchainFilter}
                                onChange={(e) => setBlockchainFilter(e.target.value as string)}
                                label="Blockchain"
                            >
                                <MenuItem value="">All Chains</MenuItem>
                                <MenuItem value="ethereum">Ethereum</MenuItem>
                                <MenuItem value="bitcoin">Bitcoin</MenuItem>
                                <MenuItem value="bsc">BSC</MenuItem>
                                <MenuItem value="trx">TRON</MenuItem>
                                <MenuItem value="xrp">XRP</MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700">
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
            </div>

            {/* Withdrawals Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-2 text-gray-600">Loading withdrawals...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Fee</TableCell>
                                    <TableCell>Address</TableCell>
                                    <TableCell>Network</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {withdrawals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" className="py-8">
                                            <div className="text-gray-500">No withdrawals found</div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    withdrawals.map((withdrawal) => (
                                        <TableRow key={withdrawal.id} hover>
                                            <TableCell>
                                                <Tooltip title={`ID: ${withdrawal.userId}`}>
                                                    <a 
                                                        href={getUserDetailsUrl(withdrawal.userId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {userDetails[withdrawal.userId]?.fullName || 
                                                         userDetails[withdrawal.userId]?.email || 
                                                         withdrawal.userId}
                                                    </a>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                {formatAmount(withdrawal.amount)}
                                                {withdrawal.metadata?.token && (
                                                    <span className="ml-1 text-gray-500">
                                                        {withdrawal.metadata.token.symbol}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {formatAmount(withdrawal.fee)}
                                                {withdrawal.metadata?.token && (
                                                    <span className="ml-1 text-gray-500">
                                                        {withdrawal.metadata.token.symbol}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={withdrawal.address}>
                                                    <span className="font-mono">
                                                        {withdrawal.address.substring(0, 8)}...
                                                        {withdrawal.address.substring(withdrawal.address.length - 8)}
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    {withdrawal.network}
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        ({withdrawal.networkVersion})
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={withdrawal.status}
                                                    color={getStatusChipColor(withdrawal.status)}
                                                    size="small"
                                                    className="capitalize"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(withdrawal.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex justify-end gap-2">
                                                    {withdrawal.status === 'pending' && (
                                                        <Tooltip title="Process Withdrawal">
                                                            <LoadingButton
                                                                size="small"
                                                                loading={processingWithdrawal === withdrawal.id}
                                                                onClick={(e) => handleProcessClick(e, withdrawal.id)}
                                                                startIcon={<ProcessIcon />}
                                                                loadingPosition="start"
                                                                variant="contained"
                                                                color="success"
                                                            >
                                                                Process
                                                            </LoadingButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="View Details">
                                                        <IconButton 
                                                            size="small"
                                                            onClick={() => handleViewDetails(withdrawal)}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                <div className="border-t border-gray-200">
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            {/* Withdrawal Details Dialog */}
            <Dialog
                open={selectedWithdrawal !== null}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Withdrawal Details
                </DialogTitle>
                <DialogContent>
                    {selectedWithdrawal && (
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        User
                                    </Typography>
                                    <Typography>
                                        <a 
                                            href={getUserDetailsUrl(selectedWithdrawal.userId)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                        >
                                            {userDetails[selectedWithdrawal.userId]?.fullName || 
                                             userDetails[selectedWithdrawal.userId]?.email || 
                                             selectedWithdrawal.userId}
                                        </a>
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Amount
                                    </Typography>
                                    <Typography>
                                        {formatAmount(selectedWithdrawal.amount)}
                                        {selectedWithdrawal.metadata?.token && (
                                            <span className="ml-1 text-gray-500">
                                                {selectedWithdrawal.metadata.token.symbol}
                                            </span>
                                        )}
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Fee
                                    </Typography>
                                    <Typography>
                                        {formatAmount(selectedWithdrawal.fee)}
                                        {selectedWithdrawal.metadata?.token && (
                                            <span className="ml-1 text-gray-500">
                                                {selectedWithdrawal.metadata.token.symbol}
                                            </span>
                                        )}
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Receive Amount
                                    </Typography>
                                    <Typography>
                                        {formatAmount(selectedWithdrawal.metadata?.receiveAmount || '0')}
                                        {selectedWithdrawal.metadata?.token && (
                                            <span className="ml-1 text-gray-500">
                                                {selectedWithdrawal.metadata.token.symbol}
                                            </span>
                                        )}
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Status
                                    </Typography>
                                    <div>
                                        <Chip
                                            label={selectedWithdrawal.status}
                                            color={getStatusChipColor(selectedWithdrawal.status)}
                                            size="small"
                                            className="capitalize"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Typography variant="caption" color="textSecondary">
                                        Withdrawal Address
                                    </Typography>
                                    <Typography className="break-all">
                                        {selectedWithdrawal.address}
                                    </Typography>
                                </div>
                                {selectedWithdrawal.memo && (
                                    <div>
                                        <Typography variant="caption" color="textSecondary">
                                            Memo
                                        </Typography>
                                        <Typography>
                                            {selectedWithdrawal.memo}
                                        </Typography>
                                    </div>
                                )}
                                {selectedWithdrawal.tag && (
                                    <div>
                                        <Typography variant="caption" color="textSecondary">
                                            Tag
                                        </Typography>
                                        <Typography>
                                            {selectedWithdrawal.tag}
                                        </Typography>
                                    </div>
                                )}
                                {selectedWithdrawal.txHash && (
                                    <div className="col-span-2">
                                        <Typography variant="caption" color="textSecondary">
                                            Transaction Hash
                                        </Typography>
                                        <Typography className="break-all">
                                            {selectedWithdrawal.txHash}
                                        </Typography>
                                    </div>
                                )}
                                {selectedWithdrawal.metadata?.processingReason && (
                                    <div className="col-span-2">
                                        <Typography variant="caption" color="textSecondary">
                                            Processing Reason
                                        </Typography>
                                        <Typography>
                                            {selectedWithdrawal.metadata.processingReason}
                                        </Typography>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedWithdrawal?.status === 'pending' && (
                        <LoadingButton
                            loading={processingWithdrawal === selectedWithdrawal.id}
                            onClick={(e) => handleProcessClick(e, selectedWithdrawal.id)}
                            startIcon={<ProcessIcon />}
                            loadingPosition="start"
                            variant="contained"
                            color="success"
                        >
                            Process Withdrawal
                        </LoadingButton>
                    )}
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Process Confirmation Modal */}
            <Dialog
                open={showProcessConfirmation}
                onClose={handleCloseProcessConfirmation}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Confirm Withdrawal Processing
                </DialogTitle>
                <DialogContent>
                    <div className="space-y-4 mt-4">
                        <Typography variant="body2" color="textSecondary">
                            Please enter your password and the secret key to process this withdrawal.
                        </Typography>
                        <TextField
                            fullWidth
                            type="password"
                            label="Admin Password"
                            value={processConfirmation.password}
                            onChange={(e) => setProcessConfirmation(prev => ({
                                ...prev,
                                password: e.target.value,
                                error: ''
                            }))}
                            margin="dense"
                        />
                        <TextField
                            fullWidth
                            type="password"
                            label="Secret Key"
                            value={processConfirmation.secretKey}
                            onChange={(e) => setProcessConfirmation(prev => ({
                                ...prev,
                                secretKey: e.target.value,
                                error: ''
                            }))}
                            margin="dense"
                        />
                        {processConfirmation.error && (
                            <Alert severity="error" className="mt-2">
                                {processConfirmation.error}
                            </Alert>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseProcessConfirmation}>
                        Cancel
                    </Button>
                    <LoadingButton
                        loading={Boolean(processingWithdrawal)}
                        onClick={handleProcessWithdrawal}
                        variant="contained"
                        color="success"
                    >
                        Confirm Processing
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </div>
    );
} 