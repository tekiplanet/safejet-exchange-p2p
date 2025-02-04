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
    IconButton
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';


interface Token {
    id: string;
    symbol: string;
    name: string;
    blockchain: string;
    contractAddress: string | null;
    decimals: number;
    networkVersion: string;
    isActive: boolean;
    baseSymbol: string;
}

export default function TokenManagement() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [editToken, setEditToken] = useState<Partial<Token> | null>(null);
    const router = useRouter();

    const API_BASE = '/api';

    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/login');
            throw new Error('No auth token found');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };

        const fetchOptions = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
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
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        setLoading(true);
        try {
            const response = await fetchWithRetry('/admin/tokens', { method: 'GET' });
            const data = await response.json();
            setTokens(data);
            setStatus('');
        } catch (error) {
            console.error('Error fetching tokens:', error);
            setStatus('Error loading tokens. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editToken) return;

        setLoading(true);
        try {
            if (editToken.id) {
                await fetchWithRetry(`/admin/tokens/${editToken.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(editToken)
                });
            } else {
                await fetchWithRetry('/admin/tokens', {
                    method: 'POST',
                    body: JSON.stringify(editToken)
                });
            }
            setEditToken(null);
            await fetchTokens();
            setStatus('Token saved successfully');
        } catch (error) {
            setStatus('Error saving token. Please try again.');
        } finally {
            setLoading(false);
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
                    <Button
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={() => setEditToken({})}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        Add Token
                    </Button>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{token.symbol}</td>
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
                                            <IconButton onClick={() => setEditToken(token)}>
                                                <EditIcon />
                                            </IconButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

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
                        <TextField
                            fullWidth
                            label="Symbol"
                            value={editToken?.symbol || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                setEditToken({ ...editToken, symbol: e.target.value })}
                            margin="normal"
                            required
                        />
                        {/* ... other fields with proper event typing ... */}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditToken(null)}>Cancel</Button>
                        <Button type="submit" variant="contained">Save</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    );
} 