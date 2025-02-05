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
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
} from '@mui/material';
import { Visibility as VisibilityIcon, Download as DownloadIcon } from '@mui/icons-material';

interface User {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    kycLevel: number;
    kycLevelDetails?: {
        id: string;
        level: number;
        title: string;
    };
    createdAt: string;
}

interface ApiResponse {
    users: User[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [kycLevelFilter, setKycLevelFilter] = useState<number | ''>('');
    const [verifiedFilter, setVerifiedFilter] = useState<'email' | 'phone' | 'both' | ''>('');
    const router = useRouter();

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
            credentials: 'include' as RequestCredentials
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
                console.error('Fetch error:', error);
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');
                if (i === retries - 1) break;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        throw lastError;
    };

    const fetchUsers = async () => {
        try {
            const response = await fetchWithRetry(
                `/admin/users?page=${page}&limit=${pageSize}${
                    searchQuery ? `&search=${searchQuery}` : ''
                }${kycLevelFilter ? `&kycLevel=${kycLevelFilter}` : ''}${
                    verifiedFilter ? `&verified=${verifiedFilter}` : ''
                }`,
                { method: 'GET' },
                3
            );

            const data: ApiResponse = await response.json();
            
            setUsers(data.users);
            setTotalPages(data.meta.totalPages);
            setTotalUsers(data.meta.total);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchUsers();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, kycLevelFilter, verifiedFilter]);

    useEffect(() => {
        if (localStorage.getItem('adminToken')) {
            fetchUsers();
        }
    }, [page, pageSize]);

    const handleExportCSV = async () => {
        try {
            const response = await fetchWithRetry(
                '/admin/users/export/csv',
                { method: 'GET' },
                3
            );
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'users.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting users:', error);
            setStatus('Error exporting users. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">User Management</h2>
                    </div>
                    <div className="flex space-x-4">
                        <TextField
                            placeholder="Search users..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-w-[200px]"
                        />
                        <FormControl size="small" className="min-w-[150px]">
                            <InputLabel>KYC Level</InputLabel>
                            <Select
                                value={kycLevelFilter}
                                onChange={(e) => setKycLevelFilter(e.target.value as number | '')}
                                label="KYC Level"
                            >
                                <MenuItem value="">All Levels</MenuItem>
                                <MenuItem value={0}>Level 0</MenuItem>
                                <MenuItem value={1}>Level 1</MenuItem>
                                <MenuItem value={2}>Level 2</MenuItem>
                                <MenuItem value={3}>Level 3</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" className="min-w-[150px]">
                            <InputLabel>Verified Status</InputLabel>
                            <Select
                                value={verifiedFilter}
                                onChange={(e) => setVerifiedFilter(e.target.value as 'email' | 'phone' | 'both' | '')}
                                label="Verified Status"
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="email">Email Verified</MenuItem>
                                <MenuItem value="phone">Phone Verified</MenuItem>
                                <MenuItem value="both">Both Verified</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            startIcon={<DownloadIcon />}
                            variant="outlined"
                            onClick={handleExportCSV}
                        >
                            Export CSV
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
                        <p className="text-sm font-medium">{status}</p>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-2 text-gray-600">Loading users...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Full Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>KYC Level</TableCell>
                                    <TableCell>Verification Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.fullName}</TableCell>
                                        <TableCell>
                                            {user.email}
                                            {user.emailVerified && (
                                                <span className="ml-2 text-green-600">✓</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.phone}
                                            {user.phoneVerified && (
                                                <span className="ml-2 text-green-600">✓</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Level {user.kycLevel}
                                                {user.kycLevelDetails && ` - ${user.kycLevelDetails.title}`}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className={`text-sm ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                                                    Email: {user.emailVerified ? 'Verified' : 'Not Verified'}
                                                </div>
                                                <div className={`text-sm ${user.phoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                                                    Phone: {user.phoneVerified ? 'Verified' : 'Not Verified'}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                onClick={() => router.push(`/dashboard/users/details?id=${user.id}`)}
                                                size="small"
                                                title="View Details"
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">
                                {Math.min((page - 1) * pageSize + 1, totalUsers)}
                            </span>
                            {' '}-{' '}
                            <span className="font-medium">
                                {Math.min(page * pageSize, totalUsers)}
                            </span>
                            {' '}of{' '}
                            <span className="font-medium">{totalUsers}</span>
                            {' '}results
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <FormControl size="small" style={{ width: 100 }}>
                            <Select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                <MenuItem value={10}>10 / page</MenuItem>
                                <MenuItem value={20}>20 / page</MenuItem>
                                <MenuItem value={50}>50 / page</MenuItem>
                                <MenuItem value={100}>100 / page</MenuItem>
                            </Select>
                        </FormControl>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                variant="outlined"
                                size="small"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={() => setPage(page + 1)}
                                disabled={page * pageSize >= totalUsers}
                                variant="outlined"
                                size="small"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 