import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Button,
    Typography,
    Paper,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Divider,
    Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface KYCData {
    identityDetails?: {
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        address: string;
        city: string;
        state: string;
        country: string;
        submittedAt: Date;
    };
    verificationStatus?: {
        identity?: {
            status: 'processing' | 'pending' | 'completed' | 'failed';
            documentType?: string;
            lastAttempt?: Date;
            failureReason?: string;
            reviewAnswer?: 'GREEN' | 'RED' | 'ON_HOLD';
            reviewRejectType?: 'RETRY' | 'FINAL';
            reviewRejectDetails?: string;
        };
        advanced?: {
            status: 'pending' | 'processing' | 'completed' | 'failed';
            lastAttempt: Date;
            reviewAnswer?: 'GREEN' | 'RED';
        };
    };
}

interface User {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    kycLevel: number;
    countryName: string;
    createdAt: string;
    kycData: KYCData;
    kycLevelDetails?: {
        id: string;
        level: number;
        title: string;
    };
}

export default function UserDetails() {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [saving, setSaving] = useState(false);

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
                    const errorText = await response.text();
                    console.error('API Error:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });

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

    const fetchUser = async () => {
        if (!id) return;
        
        try {
            const response = await fetchWithRetry(`/admin/users/${id}`, { method: 'GET' });
            const data = await response.json();
            setUser(data);
            setStatus('');
        } catch (error) {
            console.error('Error fetching user:', error);
            setStatus('Error loading user details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchUser();
        }
    }, [id]);

    const handleUpdateUser = async (updates: Partial<User>) => {
        if (!user?.id) return;
        
        setSaving(true);
        try {
            // If updating KYC level, send just the level number
            const updateData = updates.kycLevel !== undefined 
                ? { kycLevel: updates.kycLevel }
                : updates;

            console.log('Sending update:', updateData); // Add logging

            const response = await fetchWithRetry(`/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            }, 3);

            if (!response.ok) {
                let errorMessage = 'Failed to update user';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            await fetchUser();
            setStatus('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            setStatus(error instanceof Error ? error.message : 'Error updating user. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <Typography color="textSecondary">Loading user details...</Typography>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6">
                <Alert severity="error">User not found</Alert>
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
                            onClick={() => router.push('/dashboard/users')}
                            variant="outlined"
                        >
                            Back to Users
                        </Button>
                        <Typography variant="h5">User Details</Typography>
                    </div>
                </div>

                {status && (
                    <Alert 
                        severity={status.includes('Error') ? 'error' : 'success'} 
                        className="mb-4"
                    >
                        {status}
                    </Alert>
                )}
            </div>

            <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                    <Paper className="p-6 h-full">
                        <Typography variant="h6" className="mb-4">Basic Information</Typography>
                        <div className="space-y-3">
                            <Typography><strong>Full Name:</strong> {user.fullName}</Typography>
                            <Typography><strong>Email:</strong> {user.email}</Typography>
                            <Typography><strong>Phone:</strong> {user.phone}</Typography>
                            <Typography><strong>Country:</strong> {user.countryName}</Typography>
                            <Typography><strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}</Typography>
                        </div>
                    </Paper>
                </Grid>

                {/* Verification Status */}
                <Grid item xs={12} md={6}>
                    <Paper className="p-6 h-full">
                        <Typography variant="h6" className="mb-4">Verification Status</Typography>
                        <div className="space-y-3">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={user.emailVerified}
                                        onChange={(e) => handleUpdateUser({ emailVerified: e.target.checked })}
                                        disabled={saving}
                                    />
                                }
                                label="Email Verified"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={user.phoneVerified}
                                        onChange={(e) => handleUpdateUser({ phoneVerified: e.target.checked })}
                                        disabled={saving}
                                    />
                                }
                                label="Phone Verified"
                            />
                        </div>
                    </Paper>
                </Grid>

                {/* KYC Information */}
                <Grid item xs={12}>
                    <Paper className="p-6">
                        <Typography variant="h6" className="mb-4">KYC Information</Typography>
                        <div className="space-y-4">
                            <FormControl fullWidth>
                                <InputLabel>KYC Level</InputLabel>
                                <Select
                                    value={user.kycLevel}
                                    onChange={(e) => handleUpdateUser({ kycLevel: e.target.value as number })}
                                    label="KYC Level"
                                    disabled={saving}
                                >
                                    <MenuItem value={0}>Level 0</MenuItem>
                                    <MenuItem value={1}>Level 1</MenuItem>
                                    <MenuItem value={2}>Level 2</MenuItem>
                                    <MenuItem value={3}>Level 3</MenuItem>
                                </Select>
                            </FormControl>

                            {user.kycData?.identityDetails && (
                                <div className="mt-6">
                                    <Divider className="my-4" />
                                    <Typography variant="subtitle1" className="mb-3">Identity Details</Typography>
                                    <Grid container spacing={3}>
                                        <Grid item xs={6}>
                                            <Typography><strong>First Name:</strong> {user.kycData.identityDetails.firstName}</Typography>
                                            <Typography><strong>Last Name:</strong> {user.kycData.identityDetails.lastName}</Typography>
                                            <Typography><strong>Date of Birth:</strong> {user.kycData.identityDetails.dateOfBirth}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography><strong>Address:</strong> {user.kycData.identityDetails.address}</Typography>
                                            <Typography><strong>City:</strong> {user.kycData.identityDetails.city}</Typography>
                                            <Typography><strong>State:</strong> {user.kycData.identityDetails.state}</Typography>
                                            <Typography><strong>Country:</strong> {user.kycData.identityDetails.country}</Typography>
                                        </Grid>
                                    </Grid>
                                </div>
                            )}

                            {user.kycData?.verificationStatus && (
                                <div className="mt-6">
                                    <Divider className="my-4" />
                                    <Typography variant="subtitle1" className="mb-3">Verification Status</Typography>
                                    {user.kycData.verificationStatus.identity && (
                                        <div className="mb-2">
                                            <Typography><strong>Identity Status:</strong> {user.kycData.verificationStatus.identity.status}</Typography>
                                            {user.kycData.verificationStatus.identity.reviewAnswer && (
                                                <Typography><strong>Review Result:</strong> {user.kycData.verificationStatus.identity.reviewAnswer}</Typography>
                                            )}
                                        </div>
                                    )}
                                    {user.kycData.verificationStatus.advanced && (
                                        <div>
                                            <Typography><strong>Advanced Status:</strong> {user.kycData.verificationStatus.advanced.status}</Typography>
                                            {user.kycData.verificationStatus.advanced.reviewAnswer && (
                                                <Typography><strong>Review Result:</strong> {user.kycData.verificationStatus.advanced.reviewAnswer}</Typography>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Paper>
                </Grid>
            </Grid>
        </div>
    );
} 