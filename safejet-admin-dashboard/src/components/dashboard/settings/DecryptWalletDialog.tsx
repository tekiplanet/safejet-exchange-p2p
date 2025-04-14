import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    CircularProgress,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface DecryptWalletDialogProps {
    open: boolean;
    onClose: () => void;
    walletId: string;
    blockchain: string;
    network: string;
}

export function DecryptWalletDialog({
    open,
    onClose,
    walletId,
    blockchain,
    network,
}: DecryptWalletDialogProps) {
    const [password, setPassword] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const { enqueueSnackbar } = useSnackbar();

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://encrypted.nadiapoint.com/api';

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (decryptedKey && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && decryptedKey) {
            setDecryptedKey(null);
            setPassword('');
            setSecretKey('');
        }
        return () => clearInterval(timer);
    }, [timeLeft, decryptedKey]);

    const handleDecrypt = async () => {
        if (!password || !secretKey) {
            setError('Please fill in both admin password and secret key');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('Authentication token not found. Please log in again.');
                enqueueSnackbar('Session expired. Please log in again.', { variant: 'error' });
                return;
            }

            const response = await fetch(`${API_BASE}/admin/wallet-balances/decrypt-key/${walletId}`, {
                method: 'POST',
                headers: {
                    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    adminPassword: password,
                    adminSecretKey: secretKey
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setError(data.message || 'Invalid credentials');
                    enqueueSnackbar('Invalid credentials', { variant: 'error' });
                    return;
                }
                throw new Error(data.message || 'Failed to decrypt wallet');
            }

            setDecryptedKey(data.privateKey);
            setTimeLeft(30); // Show for 30 seconds
            enqueueSnackbar('Private key decrypted successfully', { variant: 'success' });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while decrypting the wallet';
            setError(errorMessage);
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = async () => {
        if (!decryptedKey) return;

        try {
            await navigator.clipboard.writeText(decryptedKey);
            enqueueSnackbar('Private key copied to clipboard', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Failed to copy private key', { variant: 'error' });
        }
    };

    const handleClose = () => {
        setPassword('');
        setSecretKey('');
        setError(null);
        setDecryptedKey(null);
        setTimeLeft(0);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Decrypt {blockchain} {network} Wallet
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    {!decryptedKey ? (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Admin Master Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Admin Secret Key"
                                type={showSecretKey ? 'text' : 'password'}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowSecretKey(!showSecretKey)}
                                                edge="end"
                                            >
                                                {showSecretKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </>
                    ) : (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Private Key (visible for {timeLeft} seconds):
                            </Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1,
                                    position: 'relative',
                                    wordBreak: 'break-all',
                                }}
                            >
                                <Typography variant="body2" component="div">
                                    {decryptedKey}
                                </Typography>
                                <IconButton
                                    onClick={handleCopyKey}
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                    }}
                                >
                                    <ContentCopyIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                {!decryptedKey && (
                    <Button
                        onClick={handleDecrypt}
                        variant="contained"
                        disabled={loading || !password || !secretKey}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Decrypt'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
} 