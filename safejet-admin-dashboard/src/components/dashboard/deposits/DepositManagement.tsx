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

interface Deposit {
    id: string;
    userId: string;
    walletId: string;
    tokenId: string;
    txHash: string;
    amount: string;
    blockchain: string;
    network: string;
    networkVersion: string;
    blockNumber: number;
    confirmations: number;
    status: 'pending' | 'confirming' | 'confirmed' | 'failed';
    metadata: {
        from: string;
        contractAddress?: string;
        blockHash?: string;
        fee?: string;
        memo?: string;
        tag?: string;
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

export function DepositManagement() {
    const router = useRouter();
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
    const [statusFilter, setStatusFilter] = useState('');
    const [blockchainFilter, setBlockchainFilter] = useState('');
    const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
    const [userDetails, setUserDetails] = useState<Record<string, User>>({});
    const [tokenDetails, setTokenDetails] = useState<Record<string, Token>>({});
    const [processingDeposit, setProcessingDeposit] = useState<string | null>(null);
    const [processConfirmations, setProcessConfirmations] = useState<number>(10);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://encrypted.nadiapoint.com/api';

    const formatAmount = (amount: string): string => {
        try {
            // Remove trailing zeros after decimal point
            const num = parseFloat(amount);
            if (isNaN(num)) return '0';

            // Format with commas and up to 8 decimal places
            const parts = num.toFixed(8).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            
            // Remove trailing zeros in decimal part
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
            setTokenDetails(prev => ({
                ...prev,
                [tokenId]: {
                    id: tokenId,
                    symbol: '???',
                    name: 'Unknown Token',
                    blockchain: 'unknown',
                    networkVersion: 'unknown'
                } as Token
            }));
        }
    };

    const fetchDeposits = async () => {
        try {
            const response = await fetchWithRetry(
                `/admin/deposits?page=${page + 1}&limit=${rowsPerPage}&search=${search}&status=${statusFilter}&blockchain=${blockchainFilter}`,
                { method: 'GET' }
            );
            const { data, pagination } = await response.json();
            setDeposits(data);
            setTotal(pagination.total);
            setError('');

            const deposits = data as Deposit[];
            
            // Fetch both user and token details
            const userIds = deposits.map(d => d.userId);
            const tokenIds = deposits.map(d => d.tokenId);
            
            // Convert Sets to Arrays before mapping
            const uniqueUserIds = Array.from(new Set(userIds));
            const uniqueTokenIds = Array.from(new Set(tokenIds));
            
            await Promise.all([
                ...uniqueUserIds.map(id => fetchUserDetails(id)),
                ...uniqueTokenIds.map(id => fetchTokenDetails(id))
            ]);
        } catch (error) {
            console.error('Error fetching deposits:', error);
            setError('Failed to load deposits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            fetchDeposits();
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
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'confirming':
                return 'info';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const handleViewDetails = (deposit: Deposit) => {
        setSelectedDeposit(deposit);
    };

    const handleCloseDetails = () => {
        setSelectedDeposit(null);
    };

    const handleProcessClick = (event: React.MouseEvent<HTMLElement>, depositId: string) => {
        setAnchorEl(event.currentTarget);
        setProcessingDepositId(depositId);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
        setProcessingDepositId(null);
    };

    const handleProcessDeposit = async () => {
        if (!processingDepositId) return;
        
        setProcessingDeposit(processingDepositId);
        try {
            await fetchWithRetry(
                `/admin/deposits/${processingDepositId}/process`,
                { 
                    method: 'POST',
                    body: JSON.stringify({ confirmations: processConfirmations })
                }
            );
            await fetchDeposits();
            handleClosePopover();
        } catch (error) {
            console.error('Error processing deposit:', error);
        } finally {
            setProcessingDeposit(null);
        }
    };

    const getUserDetailsUrl = (userId: string) => `/dashboard/users/details?id=${userId}`;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">Deposit Management</h2>
                        <p className="text-sm text-gray-500">View and manage all deposits</p>
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
                        {/* Add status filter */}
                        <FormControl size="small" sx={{ minWidth: '200px' }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as string)}
                                label="Status"
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="confirming">Confirming</MenuItem>
                                <MenuItem value="confirmed">Confirmed</MenuItem>
                                <MenuItem value="failed">Failed</MenuItem>
                            </Select>
                        </FormControl>
                        {/* Add blockchain filter */}
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

                {/* Status Messages */}
                {error && (
                    <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700">
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
            </div>

            {/* Deposits Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-2 text-gray-600">Loading deposits...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>TxHash</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Blockchain</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deposits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" className="py-8">
                                            <div className="text-gray-500">No deposits found</div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    deposits.map((deposit) => (
                                        <TableRow key={deposit.id} hover>
                                            <TableCell>
                                                <Tooltip title={deposit.txHash}>
                                                    <span className="font-mono">
                                                        {deposit.txHash.substring(0, 8)}...
                                                        {deposit.txHash.substring(deposit.txHash.length - 8)}
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={`ID: ${deposit.userId}`}>
                                                    <a 
                                                        href={getUserDetailsUrl(deposit.userId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {userDetails[deposit.userId]?.fullName || 
                                                         userDetails[deposit.userId]?.email || 
                                                         deposit.userId}
                                                    </a>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    {deposit.blockchain}
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        ({deposit.network})
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatAmount(deposit.amount)}
                                                {tokenDetails[deposit.tokenId] && (
                                                    <span className="ml-1 text-gray-500">
                                                        {tokenDetails[deposit.tokenId].symbol}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={deposit.status}
                                                    color={getStatusChipColor(deposit.status)}
                                                    size="small"
                                                    className="capitalize"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(deposit.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex justify-end gap-2">
                                                    {deposit.status === 'pending' && (
                                                        <Tooltip title="Process Deposit">
                                                            <LoadingButton
                                                                size="small"
                                                                loading={processingDeposit === deposit.id}
                                                                onClick={(e) => handleProcessClick(e, deposit.id)}
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
                                                            onClick={() => handleViewDetails(deposit)}
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

            {/* Add Deposit Details Dialog */}
            <Dialog
                open={selectedDeposit !== null}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Deposit Details
                </DialogTitle>
                <DialogContent>
                    {selectedDeposit && (
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Transaction Hash
                                    </Typography>
                                    <Typography className="break-all">
                                        {selectedDeposit.txHash}
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        User
                                    </Typography>
                                    <Typography>
                                        <a 
                                            href={getUserDetailsUrl(selectedDeposit.userId)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                        >
                                            {userDetails[selectedDeposit.userId]?.fullName || 
                                             userDetails[selectedDeposit.userId]?.email || 
                                             selectedDeposit.userId}
                                        </a>
                                        <span className="text-xs text-gray-500 ml-2">
                                            (ID: {selectedDeposit.userId})
                                        </span>
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Amount
                                    </Typography>
                                    <Typography>
                                        {formatAmount(selectedDeposit.amount)}
                                        {tokenDetails[selectedDeposit.tokenId] && (
                                            <span className="ml-1 text-gray-500">
                                                {tokenDetails[selectedDeposit.tokenId].symbol}
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
                                            label={selectedDeposit.status}
                                            color={getStatusChipColor(selectedDeposit.status)}
                                            size="small"
                                            className="capitalize"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Blockchain
                                    </Typography>
                                    <Typography>
                                        {selectedDeposit.blockchain} ({selectedDeposit.network})
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        Confirmations
                                    </Typography>
                                    <Typography>
                                        {selectedDeposit.confirmations}
                                    </Typography>
                                </div>
                                {selectedDeposit.metadata.from && (
                                    <div className="col-span-2">
                                        <Typography variant="caption" color="textSecondary">
                                            From Address
                                        </Typography>
                                        <Typography className="break-all">
                                            {selectedDeposit.metadata.from}
                                        </Typography>
                                    </div>
                                )}
                                {selectedDeposit.metadata.contractAddress && (
                                    <div className="col-span-2">
                                        <Typography variant="caption" color="textSecondary">
                                            Contract Address
                                        </Typography>
                                        <Typography className="break-all">
                                            {selectedDeposit.metadata.contractAddress}
                                        </Typography>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedDeposit?.status === 'pending' && (
                        <>
                            <TextField
                                type="number"
                                label="Confirmations"
                                value={processConfirmations}
                                onChange={(e) => setProcessConfirmations(Number(e.target.value))}
                                size="small"
                                sx={{ width: 120, mr: 2 }}
                                inputProps={{ min: 1 }}
                            />
                            <LoadingButton
                                loading={processingDeposit === selectedDeposit.id}
                                onClick={() => {
                                    setProcessingDepositId(selectedDeposit.id);
                                    handleProcessDeposit();
                                }}
                                startIcon={<ProcessIcon />}
                                loadingPosition="start"
                                variant="contained"
                                color="success"
                            >
                                Process Deposit
                            </LoadingButton>
                        </>
                    )}
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Process Deposit Popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <div className="p-4 space-y-4">
                    <Typography variant="subtitle2">Set Confirmations</Typography>
                    <TextField
                        type="number"
                        label="Confirmations"
                        value={processConfirmations}
                        onChange={(e) => setProcessConfirmations(Number(e.target.value))}
                        size="small"
                        fullWidth
                        inputProps={{ min: 1 }}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="small" onClick={handleClosePopover}>
                            Cancel
                        </Button>
                        <LoadingButton
                            size="small"
                            loading={Boolean(processingDeposit)}
                            onClick={handleProcessDeposit}
                            variant="contained"
                            color="success"
                        >
                            Confirm
                        </LoadingButton>
                    </div>
                </div>
            </Popover>
        </div>
    );
} 