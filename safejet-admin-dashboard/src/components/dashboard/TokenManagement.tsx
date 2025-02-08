import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Tooltip,
    Checkbox,
    ListItemText,
    Avatar
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Visibility as VisibilityIcon, Sync as SyncIcon } from '@mui/icons-material';
import { TOKEN_CONFIG, NetworkVersion, Network, Blockchain, PriceFeedProvider } from '../../config/tokens';
import { LoadingButton } from '@mui/lab';


interface Token {
    id: string;
    symbol: string;
    name: string;
    blockchain: Blockchain;
    contractAddress: string | null;
    decimals: number;
    isActive: boolean;
    networkVersion: NetworkVersion;
    metadata: {
        icon: string;
        isNative?: boolean;
        networks: Network[];
        priceFeeds: {
            [network: string]: {
                provider: PriceFeedProvider;
                address?: string;
                symbol?: string;
                interval: number;
            }
        }
    };
    networkConfigs: {
        [version: string]: {
            [network: string]: {
                network: Network;
                version: NetworkVersion;
                isActive: boolean;
                blockchain: Blockchain;
                arrivalTime: string;
                requiredFields: {
                    tag: boolean;
                    memo: boolean;
                }
            }
        }
    };
}

const getDefaultNetworkVersion = (blockchain: Blockchain): NetworkVersion => {
    switch (blockchain) {
        case 'ethereum':
            return 'ERC20';
        case 'bsc':
            return 'BEP20';
        case 'trx':
            return 'TRC20';
        case 'bitcoin':
        case 'xrp':
            return 'NATIVE';
        default:
            return 'ERC20';
    }
};

export default function TokenManagement() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [editToken, setEditToken] = useState<Partial<Token> | null>(null);
    const [page, setPage] = useState(1);
    const [totalTokens, setTotalTokens] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [viewNetworkConfig, setViewNetworkConfig] = useState<Token | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [syncingToken, setSyncingToken] = useState<string | null>(null);
    const [syncingNetworks, setSyncingNetworks] = useState<string | null>(null);
    const router = useRouter();

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://admin.ctradesglobal.com/api';

    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
        const token = localStorage.getItem('adminToken');
        
        // Add debug logging
        console.log('Current token:', token);
        console.log('API URL:', `${API_BASE}${url}`);
        
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

        // Log headers
        console.log('Request headers:', headers);

        const fetchOptions: RequestInit = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            },
            credentials: 'include' as RequestCredentials
        };

        let lastError: Error = new Error('Failed to fetch');

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(`${API_BASE}${url}`, fetchOptions);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText,
                        url: `${API_BASE}${url}`,
                        headers: headers
                    });

                    if (response.status === 401) {
                        try {
                            const errorData = JSON.parse(errorText);
                            if (errorData.message === 'Unauthorized' || errorData.message === 'Invalid token') {
                        localStorage.removeItem('adminToken');
                        router.push('/login');
                        throw new Error('Session expired');
                            }
                        } catch (e) {
                            console.error('Error parsing error response:', e);
                        }
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response;
            } catch (error) {
                console.error('Fetch error:', error);
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');
                if (i === retries - 1) break;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        throw lastError;
    };

    const fetchTokens = async () => {
        setLoading(true);
        try {
            const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const response = await fetchWithRetry(
                `/admin/deposits/tokens?page=${page}&limit=${pageSize}${searchParam}`, 
                { method: 'GET' }
            );
            const data = await response.json();
            setTokens(data.data);
            setTotalTokens(data.total);
            setStatus('');
        } catch (error) {
            console.error('Error fetching tokens:', error);
            setStatus('Error loading tokens. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to first page when searching
            fetchTokens();
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]); // Fetch when search query changes

    useEffect(() => {
        if (localStorage.getItem('adminToken')) {
            fetchTokens();
        }
    }, [page, pageSize]); // Refetch when page or pageSize changes

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editToken || !editToken.networkVersion) return;

        setLoading(true);
        try {
            const selectedNetworks = editToken.metadata?.networks || [];
            const version = editToken.networkVersion as NetworkVersion;
            
            const networkConfigs = {
                [version]: Object.fromEntries(
                    selectedNetworks.map(network => [
                        network,
                        editToken.networkConfigs?.[version]?.[network] || {
                            network,
                            version,
                            isActive: true,
                            blockchain: editToken.blockchain,
                            arrivalTime: version === 'NATIVE' 
                                ? TOKEN_CONFIG.defaults.arrivalTimes.NATIVE 
                                : TOKEN_CONFIG.defaults.arrivalTimes.default,
                            requiredFields: {
                                tag: editToken.blockchain === 'xrp',
                                memo: false
                            }
                        }
                    ])
                )
            };

            const tokenToSubmit = {
                ...editToken,
                networkConfigs
            };

            if (editToken.id) {
                await fetchWithRetry(`/admin/deposits/tokens/${editToken.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(tokenToSubmit)
                });
            } else {
                await fetchWithRetry('/admin/tokens', {
                    method: 'POST',
                    body: JSON.stringify(tokenToSubmit)
                });
            }
            setEditToken(null);
            await fetchTokens();
            setStatus('Token saved successfully');
        } catch (error) {
            console.error('Error saving token:', error);
            setStatus('Error saving token. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1); // Reset to first page when changing page size
    };

    const handleNetworkVersionChange = (version: NetworkVersion) => {
        const blockchain = editToken?.blockchain || '';
        const networks = editToken?.metadata?.networks || ['mainnet'];
        
        const networkConfigs: Token['networkConfigs'] = {
            [version]: Object.fromEntries(
                networks.map(network => {
                    // Get existing config for this network if it exists
                    const existingConfig = editToken?.networkConfigs?.[version]?.[network];
                    
                    return [
                        network,
                        {
                            network: network as Network,
                            version: version,
                            isActive: existingConfig?.isActive ?? true,
                            blockchain: blockchain as Blockchain,
                            // Preserve existing arrival time or use default
                            arrivalTime: existingConfig?.arrivalTime || (
                                version === 'NATIVE' 
                                    ? TOKEN_CONFIG.defaults.arrivalTimes.NATIVE 
                                    : TOKEN_CONFIG.defaults.arrivalTimes.default
                            ),
                            requiredFields: {
                                tag: existingConfig?.requiredFields?.tag ?? (blockchain === 'xrp'),
                                memo: existingConfig?.requiredFields?.memo ?? false
                            }
                        }
                    ];
                })
            )
        };

        setEditToken({
            ...editToken,
            networkVersion: version,
            networkConfigs
        });
    };

    const createToken = async (token: Token) => {
        try {
            const response = await fetch('/api/admin/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(token)
            });
            
            if (!response.ok) throw new Error('Failed to create token');
            
            const data = await response.json();
            // Refresh token list after creation
            fetchTokens();
            return data;
        } catch (error) {
            console.error('Error creating token:', error);
            throw error;
        }
    };

    const updateTokenStatus = async (id: string, active: boolean) => {
        try {
            const endpoint = active ? 'activate' : 'deactivate';
            const response = await fetch(`/api/admin/tokens/${id}/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error(`Failed to ${endpoint} token`);
            
            // Refresh token list after update
            fetchTokens();
        } catch (error) {
            console.error(`Error ${active ? 'activating' : 'deactivating'} token:`, error);
            throw error;
        }
    };

    const handleSyncToken = async (tokenId: string, symbol: string) => {
        setSyncingToken(tokenId);
        try {
            const response = await fetchWithRetry(
                `/admin/deposits/tokens/${tokenId}/sync-wallets`,
                { method: 'POST' }
            );
            const result = await response.json();
            
            // Create a detailed status message
            const details = result.details;
            const statusMessage = `
                ${symbol} sync complete:
                Funding wallets: ${details.funding.newBalancesCreated} created, ${details.funding.existingBalances} existing
                Spot wallets: ${details.spot.newBalancesCreated} created, ${details.spot.existingBalances} existing
                Total users: ${details.totalUsers}
                ${details.funding.allUsersHaveBalance && details.spot.allUsersHaveBalance ? '(All users now have both wallet types)' : ''}
            `.trim();
            
            setStatus(statusMessage);
        } catch (error) {
            console.error('Error syncing token wallets:', error);
            setStatus(`Error syncing wallets for ${symbol}`);
        } finally {
            setSyncingToken(null);
        }
    };

    const handleSyncNetworks = async (tokenId: string, symbol: string) => {
        setSyncingNetworks(tokenId);
        try {
            const response = await fetchWithRetry(
                `/admin/deposits/tokens/${tokenId}/sync-networks`,
                { method: 'POST' }
            );
            const result = await response.json();
            
            // Create a detailed status message
            const details = result.details;
            const statusMessage = `
                ${symbol} network sync complete:
                Updated ${details.funding.balancesUpdated} funding wallets
                Updated ${details.spot.balancesUpdated} spot wallets
            `.trim();
            
            setStatus(statusMessage);
        } catch (error) {
            console.error('Error syncing token networks:', error);
            setStatus(`Error syncing networks for ${symbol}`);
        } finally {
            setSyncingNetworks(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">Token Management</h2>
                    </div>
                    <div className="flex space-x-4">
                        {/* Add search input */}
                        <TextField
                            placeholder="Search tokens..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-w-[200px]"
                            InputProps={{
                                startAdornment: (
                                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                ),
                            }}
                        />
                    <Button
                        startIcon={<AddIcon />}
                        variant="contained"
                            onClick={() => {
                                const defaultBlockchain: Blockchain = 'ethereum';
                                const defaultVersion = getDefaultNetworkVersion(defaultBlockchain);
                                
                                setEditToken({
                                    isActive: true,
                                    blockchain: defaultBlockchain,
                                    networkVersion: defaultVersion,
                                    metadata: {
                                        networks: ['mainnet'],
                                        icon: '',
                                        priceFeeds: {
                                            mainnet: {
                                                provider: TOKEN_CONFIG.priceFeedProviders[0].value,
                                                interval: TOKEN_CONFIG.defaults.interval
                                            }
                                        }
                                    } as Token['metadata']
                                });
                            }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        Add Token
                    </Button>
                    </div>
                </div>

                {/* Status Messages */}
                {status && (
                    <div className={`mt-4 p-4 rounded-md ${
                        status.toLowerCase().includes('error')
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                    }`}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {status.toLowerCase().includes('error') ? (
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{status}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tokens Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-2 text-gray-600">Loading tokens...</span>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blockchain</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Address</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network Version</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tokens.map((token) => (
                                    <tr key={token.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar 
                                                    src={token.metadata?.icon} 
                                                    alt={token.symbol}
                                                    sx={{ 
                                                        width: 28,
                                                        height: 28,
                                                        backgroundColor: 'transparent',
                                                        border: '1px solid #e0e0e0',
                                                        padding: '2px'
                                                    }}
                                                >
                                                    {token.symbol.charAt(0)}
                                                </Avatar>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontWeight: 500,
                                                        color: 'text.primary',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {token.symbol}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{token.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{token.blockchain}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{token.contractAddress || 'Native'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{token.networkVersion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                token.isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {token.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex space-x-2">
                                            <IconButton onClick={() => setEditToken(token)}>
                                                <EditIcon />
                                            </IconButton>
                                                <IconButton onClick={() => setViewNetworkConfig(token)}>
                                                    <VisibilityIcon />
                                                </IconButton>
                                                <Tooltip title="Sync Wallet Balances">
                                                    <LoadingButton
                                                        size="small"
                                                        loading={syncingToken === token.id}
                                                        onClick={() => handleSyncToken(token.id, token.symbol)}
                                                        startIcon={<SyncIcon />}
                                                        loadingPosition="start"
                                                        variant="outlined"
                                                    >
                                                        Sync Balances
                                                    </LoadingButton>
                                                </Tooltip>
                                                <Tooltip title="Sync Network Metadata">
                                                    <LoadingButton
                                                        size="small"
                                                        loading={syncingNetworks === token.id}
                                                        onClick={() => handleSyncNetworks(token.id, token.symbol)}
                                                        startIcon={<SyncIcon />}
                                                        loadingPosition="start"
                                                        variant="outlined"
                                                        color="info"
                                                    >
                                                        Sync Networks
                                                    </LoadingButton>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add pagination controls below the table */}
            {!loading && tokens.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="border rounded px-2 py-1 bg-white"
                        >
                            {[10, 20, 50].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {page} of {Math.max(1, Math.ceil(totalTokens / pageSize))}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= Math.ceil(totalTokens / pageSize)}
                            className="px-3 py-1 border rounded bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Edit/Add Dialog */}
            <Dialog 
                open={editToken !== null} 
                onClose={() => setEditToken(null)}
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>{editToken?.id ? 'Edit Token' : 'Add Token'}</DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <div className="grid grid-cols-2 gap-4">
                            <TextField
                                fullWidth
                                label="Symbol"
                                value={editToken?.symbol || ''}
                                onChange={(e) => setEditToken({ ...editToken, symbol: e.target.value })}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Name"
                                value={editToken?.name || ''}
                                onChange={(e) => setEditToken({ ...editToken, name: e.target.value })}
                                margin="normal"
                                required
                            />
                        </div>

                        <FormControl fullWidth margin="normal" required>
                            <InputLabel>Blockchain</InputLabel>
                            <Select
                                value={editToken?.blockchain || ''}
                                onChange={(e) => setEditToken({ ...editToken, blockchain: e.target.value as Blockchain })}
                                label="Blockchain"
                            >
                                {TOKEN_CONFIG.blockchains.map(blockchain => (
                                    <MenuItem key={blockchain.value} value={blockchain.value}>
                                        {blockchain.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Contract Address"
                            value={editToken?.contractAddress || ''}
                            onChange={(e) => setEditToken({ ...editToken, contractAddress: e.target.value })}
                            margin="normal"
                            helperText="Leave empty for native tokens like BTC"
                        />

                        {/* <div className="grid grid-cols-2 gap-4"> */}
                            <TextField
                                fullWidth
                                label="Decimals"
                                type="number"
                                value={editToken?.decimals || ''}
                                onChange={(e) => setEditToken({ 
                                    ...editToken, 
                                    decimals: parseInt(e.target.value) 
                                })}
                                margin="normal"
                                required
                                inputProps={{ min: 0, max: 18 }}
                            />
                        {/* </div> */}

                        <Box marginY={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editToken?.isActive || false}
                                        onChange={(e) => setEditToken({ 
                                            ...editToken, 
                                            isActive: e.target.checked 
                                        })}
                                    />
                                }
                                label="Active"
                            />
                        </Box>

                        {/* Basic Metadata */}
                        <TextField
                            fullWidth
                            label="Icon URL"
                            value={editToken?.metadata?.icon || ''}
                            onChange={(e) => setEditToken({
                                ...editToken,
                                metadata: {
                                    ...(editToken?.metadata || {}),
                                    icon: e.target.value,
                                    networks: editToken?.metadata?.networks || ['mainnet'],
                                    priceFeeds: editToken?.metadata?.priceFeeds || {
                                        mainnet: {
                                            provider: "chainlink" as const,
                                            interval: 60
                                        }
                                    }
                                }
                            })}
                            margin="normal"
                            required
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editToken?.metadata?.isNative || false}
                                    onChange={(e) => {
                                        const currentMetadata = editToken?.metadata || {
                                            icon: '',
                                            networks: ['mainnet'],
                                            priceFeeds: {}
                                        };

                                        setEditToken({
                                            ...editToken,
                                            metadata: {
                                                ...currentMetadata,
                                                isNative: e.target.checked
                                            }
                                        });
                                    }}
                                />
                            }
                            label="Native Token"
                        />

                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Networks
                            </Typography>
                            
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Available Networks</InputLabel>
                                <Select
                                    multiple
                                    value={editToken?.metadata?.networks || []}
                                    onChange={(e) => {
                                        const networks = e.target.value as Network[];
                                        const currentMetadata = editToken?.metadata || {
                                            icon: '',
                                            networks: [],
                                            priceFeeds: {}
                                        };

                                        // Create default price feeds for new networks
                                        const updatedPriceFeeds = { ...currentMetadata.priceFeeds };
                                        networks.forEach(network => {
                                            if (!updatedPriceFeeds[network]) {
                                                updatedPriceFeeds[network] = {
                                                    provider: TOKEN_CONFIG.priceFeedProviders[0].value,
                                                    interval: TOKEN_CONFIG.defaults.interval
                                                };
                                            }
                                        });

                                        // Create default network configs for new networks
                                        const version = editToken?.networkVersion;
                                        if (version) {
                                            const currentConfigs = editToken?.networkConfigs || {};
                                            const updatedConfigs: Token['networkConfigs'] = { ...currentConfigs };
                                            
                                            networks.forEach(network => {
                                                if (!updatedConfigs[version]?.[network]) {
                                                    const networkConfig = {
                                                        [network]: {
                                                            network: network as Network,
                                                            version: version,
                                                            isActive: true,
                                                            blockchain: editToken?.blockchain as Blockchain,
                                                            arrivalTime: version === 'NATIVE' 
                                                                ? TOKEN_CONFIG.defaults.arrivalTimes.NATIVE 
                                                                : TOKEN_CONFIG.defaults.arrivalTimes.default,
                                                            requiredFields: {
                                                                tag: editToken?.blockchain === 'xrp',
                                                                memo: false
                                                            }
                                                        }
                                                    };

                                                    updatedConfigs[version] = {
                                                        ...(updatedConfigs[version] || {}),
                                                        ...networkConfig
                                                    };
                                                }
                                            });

                                            setEditToken({
                                                ...editToken,
                                                metadata: {
                                                    ...currentMetadata,
                                                    networks,
                                                    priceFeeds: updatedPriceFeeds
                                                },
                                                networkConfigs: updatedConfigs
                                            });
                                        } else {
                                            setEditToken({
                                                ...editToken,
                                                metadata: {
                                                    ...currentMetadata,
                                                    networks,
                                                    priceFeeds: updatedPriceFeeds
                                                }
                                            });
                                        }
                                    }}
                                    renderValue={(selected) => (selected as Network[]).join(', ')}
                                    label="Available Networks"
                                >
                                    {TOKEN_CONFIG.networks.map(network => (
                                        <MenuItem key={network.value} value={network.value}>
                                            <Checkbox checked={editToken?.metadata?.networks?.includes(network.value) || false} />
                                            <ListItemText primary={network.label} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {editToken?.metadata?.networks?.map((network) => (
                                <Box key={network} sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {network.charAt(0).toUpperCase() + network.slice(1)} Settings
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={(() => {
                                                    const version = editToken?.networkVersion;
                                                    if (!version) return false;
                                                    return editToken?.networkConfigs?.[version]?.[network]?.isActive || false;
                                                })()}
                                                onChange={(e) => {
                                                    if (!editToken?.networkVersion) return;
                                                    const currentConfigs = editToken?.networkConfigs || {};
                                                    
                                                    setEditToken({
                                                        ...editToken,
                                                        networkConfigs: {
                                                            ...currentConfigs,
                                                            [editToken.networkVersion]: {
                                                                ...currentConfigs[editToken.networkVersion],
                                                                [network]: {
                                                                    ...currentConfigs[editToken.networkVersion]?.[network],
                                                                    isActive: e.target.checked
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                            />
                                        }
                                        label="Active"
                                    />
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Network Configuration
                            </Typography>

                            <FormControl fullWidth margin="normal" required>
                                <InputLabel>Network Version</InputLabel>
                                <Select
                                    value={editToken?.networkVersion || ''}
                                    onChange={(e) => handleNetworkVersionChange(e.target.value as NetworkVersion)}
                                    label="Network Version"
                                >
                                    {TOKEN_CONFIG.networkVersions.map(version => (
                                        <MenuItem key={version.value} value={version.value}>
                                            {version.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {editToken?.networkVersion && (
                                <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {editToken.networkVersion} Configuration
                                    </Typography>

                                    {editToken?.metadata?.networks.map((network) => (
                                        <Box key={network} sx={{ mt: 2, p: 2, border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                            <Typography variant="subtitle2" color="textSecondary">
                                                {network.charAt(0).toUpperCase() + network.slice(1)}
                                            </Typography>

                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <TextField
                                                    fullWidth
                                                    label="Arrival Time"
                                                    value={(() => {
                                                        const version = editToken?.networkVersion;
                                                        if (!version) return '';
                                                        return editToken?.networkConfigs?.[version]?.[network]?.arrivalTime || '';
                                                    })()}
                                                    onChange={(e) => {
                                                        const currentConfigs = editToken?.networkConfigs || {};
                                                        const version = editToken?.networkVersion || '';
                                                        
                                                        setEditToken({
                                                            ...editToken,
                                                            networkConfigs: {
                                                                ...currentConfigs,
                                                                [version]: {
                                                                    ...currentConfigs[version],
                                                                    [network]: {
                                                                        ...currentConfigs[version]?.[network],
                                                                        arrivalTime: e.target.value
                                                                    }
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    margin="normal"
                                                />

                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={(() => {
                                                                const version = editToken?.networkVersion;
                                                                if (!version) return false;
                                                                return editToken?.networkConfigs?.[version]?.[network]?.isActive || false;
                                                            })()}
                                                            onChange={(e) => {
                                                                const currentConfigs = editToken?.networkConfigs || {};
                                                                const version = editToken?.networkVersion || '';
                                                                
                                                                setEditToken({
                                                                    ...editToken,
                                                                    networkConfigs: {
                                                                        ...currentConfigs,
                                                                        [version]: {
                                                                            ...currentConfigs[version],
                                                                            [network]: {
                                                                                ...currentConfigs[version]?.[network],
                                                                                isActive: e.target.checked
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    }
                                                    label="Active"
                                                />

                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={(() => {
                                                                const version = editToken?.networkVersion;
                                                                if (!version) return false;
                                                                return editToken?.networkConfigs?.[version]?.[network]?.requiredFields?.tag || false;
                                                            })()}
                                                            onChange={(e) => {
                                                                const currentConfigs = editToken?.networkConfigs || {};
                                                                const version = editToken?.networkVersion || '';
                                                                
                                                                setEditToken({
                                                                    ...editToken,
                                                                    networkConfigs: {
                                                                        ...currentConfigs,
                                                                        [version]: {
                                                                            ...currentConfigs[version],
                                                                            [network]: {
                                                                                ...currentConfigs[version]?.[network],
                                                                                requiredFields: {
                                                                                    ...currentConfigs[version]?.[network]?.requiredFields,
                                                                                    tag: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    }
                                                    label="Requires Tag"
                                                />

                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={(() => {
                                                                const version = editToken?.networkVersion;
                                                                if (!version) return false;
                                                                return editToken?.networkConfigs?.[version]?.[network]?.requiredFields?.memo || false;
                                                            })()}
                                                            onChange={(e) => {
                                                                const currentConfigs = editToken?.networkConfigs || {};
                                                                const version = editToken?.networkVersion || '';
                                                                
                                                                setEditToken({
                                                                    ...editToken,
                                                                    networkConfigs: {
                                                                        ...currentConfigs,
                                                                        [version]: {
                                                                            ...currentConfigs[version],
                                                                            [network]: {
                                                                                ...currentConfigs[version]?.[network],
                                                                                requiredFields: {
                                                                                    ...currentConfigs[version]?.[network]?.requiredFields,
                                                                                    memo: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                    }
                                                    label="Requires Memo"
                                                />
                                            </div>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Price Feed Configuration
                            </Typography>

                            {editToken?.metadata?.networks.map((network) => (
                                <Box key={network} sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {network.charAt(0).toUpperCase() + network.slice(1)} Price Feed
                                    </Typography>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormControl fullWidth margin="normal">
                                            <InputLabel>Provider</InputLabel>
                                            <Select
                                                value={editToken?.metadata?.priceFeeds?.[network]?.provider || 'chainlink'}
                                                onChange={(e) => {
                                                    const provider = e.target.value as PriceFeedProvider;
                                                    const currentMetadata = editToken?.metadata || {
                                                        networks: [network],
                                                        icon: '',
                                                        priceFeeds: {}
                                                    };

                                                    setEditToken({
                                                        ...editToken,
                                                        metadata: {
                                                            ...currentMetadata,
                                                            priceFeeds: {
                                                                ...currentMetadata.priceFeeds,
                                                                [network]: {
                                                                    provider,
                                                                    interval: 60,
                                                                    ...(provider === 'chainlink' ? { address: '' } : { symbol: '' })
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                label="Provider"
                                            >
                                                {TOKEN_CONFIG.priceFeedProviders.map(provider => (
                                                    <MenuItem key={provider.value} value={provider.value}>
                                                        {provider.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        {editToken?.metadata?.priceFeeds?.[network]?.provider === 'chainlink' ? (
                                            <TextField
                                                fullWidth
                                                label="Oracle Address"
                                                value={editToken?.metadata?.priceFeeds?.[network]?.address || ''}
                                                onChange={(e) => {
                                                    const currentMetadata = editToken?.metadata || {
                                                        networks: [network],
                                                        icon: '',
                                                        priceFeeds: {}
                                                    };

                                                    setEditToken({
                                                        ...editToken,
                                                        metadata: {
                                                            ...currentMetadata,
                                                            priceFeeds: {
                                                                ...currentMetadata.priceFeeds,
                                                                [network]: {
                                                                    ...currentMetadata.priceFeeds[network],
                                                                    address: e.target.value
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                margin="normal"
                                            />
                                        ) : (
                                            <TextField
                                                fullWidth
                                                label="Symbol"
                                                value={editToken?.metadata?.priceFeeds?.[network]?.symbol || ''}
                                                onChange={(e) => {
                                                    const currentMetadata = editToken?.metadata || {
                                                        networks: [network],
                                                        icon: '',
                                                        priceFeeds: {}
                                                    };

                                                    setEditToken({
                                                        ...editToken,
                                                        metadata: {
                                                            ...currentMetadata,
                                                            priceFeeds: {
                                                                ...currentMetadata.priceFeeds,
                                                                [network]: {
                                                                    ...currentMetadata.priceFeeds[network],
                                                                    symbol: e.target.value
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                margin="normal"
                                            />
                                        )}

                                        <TextField
                                            fullWidth
                                            label="Update Interval (seconds)"
                                            type="number"
                                            value={editToken?.metadata?.priceFeeds?.[network]?.interval || 60}
                                            onChange={(e) => {
                                                const currentMetadata = editToken?.metadata || {
                                                    networks: [network],
                                                    icon: '',
                                                    priceFeeds: {}
                                                };

                                                setEditToken({
                                                    ...editToken,
                                                    metadata: {
                                                        ...currentMetadata,
                                                        priceFeeds: {
                                                            ...currentMetadata.priceFeeds,
                                                            [network]: {
                                                                ...currentMetadata.priceFeeds[network],
                                                                interval: parseInt(e.target.value)
                                                            }
                                                        }
                                                    }
                                                });
                                            }}
                                            margin="normal"
                                            inputProps={{ min: 1 }}
                                        />
                                    </div>
                                </Box>
                            ))}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditToken(null)}>Cancel</Button>
                        <Button type="submit" variant="contained">Save</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Network Config Dialog */}
            <Dialog
                open={viewNetworkConfig !== null}
                onClose={() => setViewNetworkConfig(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Network Configurations - {viewNetworkConfig?.symbol}</DialogTitle>
                <DialogContent>
                    <div className="space-y-4 mt-4">
                        {viewNetworkConfig?.metadata.networks.map((network) => (
                            <Box key={network} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    {network.charAt(0).toUpperCase() + network.slice(1)}
                                </Typography>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Typography variant="caption" color="textSecondary">
                                            Provider
                                        </Typography>
                                        <Typography>
                                            {viewNetworkConfig?.metadata.priceFeeds[network]?.provider}
                                        </Typography>
                                    </div>
                                    <div>
                                        <Typography variant="caption" color="textSecondary">
                                            Interval
                                        </Typography>
                                        <Typography>
                                            {viewNetworkConfig?.metadata.priceFeeds[network]?.interval} seconds
                                        </Typography>
                                    </div>
                                    {viewNetworkConfig?.metadata.priceFeeds[network]?.address && (
                                        <div className="col-span-2">
                                            <Typography variant="caption" color="textSecondary">
                                                Oracle Address
                                            </Typography>
                                            <Typography className="break-all">
                                                {viewNetworkConfig.metadata.priceFeeds[network].address}
                                            </Typography>
                                        </div>
                                    )}
                                    {viewNetworkConfig?.metadata.priceFeeds[network]?.symbol && (
                                        <div className="col-span-2">
                                            <Typography variant="caption" color="textSecondary">
                                                Symbol
                                            </Typography>
                                            <Typography>
                                                {viewNetworkConfig.metadata.priceFeeds[network].symbol}
                                            </Typography>
                                        </div>
                                    )}
                                </div>
                            </Box>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewNetworkConfig(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
} 