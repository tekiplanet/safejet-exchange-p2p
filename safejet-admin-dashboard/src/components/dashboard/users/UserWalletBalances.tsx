import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Search as SearchIcon } from '@mui/icons-material';

interface WalletBalance {
    symbol: string;
    spot: {
        balance: string;
        usdValue: number;
    };
    funding: {
        balance: string;
        usdValue: number;
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
                `/admin/wallet-balances/${id}?page=${page + 1}&limit=${rowsPerPage}&search=${search}`,
                { method: 'GET' }
            );
            const { data, pagination } = await response.json();
            setBalances(Object.entries(data).map(([symbol, balance]: [string, any]) => ({
                symbol,
                spot: {
                    balance: balance.spot,
                    usdValue: balance.spotUsdValue || 0
                },
                funding: {
                    balance: balance.funding,
                    usdValue: balance.fundingUsdValue || 0
                }
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

    useEffect(() => {
        if (id) {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            setSearchTimeout(setTimeout(() => {
                fetchBalances();
            }, 500));
        }
    }, [id, page, rowsPerPage, search]);

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
                        <Typography variant="h5">User Wallet Balances</Typography>
                    </div>
                </div>

                {error && (
                    <Alert severity="error" className="mb-4">
                        {error}
                    </Alert>
                )}
            </div>

            <Paper className="p-6">
                <div className="mb-4">
                    <TextField
                        fullWidth
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
                </div>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Token</TableCell>
                                <TableCell align="right">Spot Balance</TableCell>
                                <TableCell align="right">Spot Value (USD)</TableCell>
                                <TableCell align="right">Funding Balance</TableCell>
                                <TableCell align="right">Funding Value (USD)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balances.map((balance) => (
                                <TableRow key={balance.symbol}>
                                    <TableCell component="th" scope="row">
                                        {balance.symbol}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatCrypto(balance.spot.balance)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatUSD(balance.spot.usdValue)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatCrypto(balance.funding.balance)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatUSD(balance.funding.usdValue)}
                                    </TableCell>
                                </TableRow>
                            ))}
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
        </div>
    );
} 