import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingButton } from '@mui/lab';
import { Save as SaveIcon } from '@mui/icons-material';
import { 
    TextField, 
    Grid, 
    Paper, 
    Typography, 
    Alert,
    Box,
    CircularProgress,
    Snackbar
} from '@mui/material';

interface ContactSettings {
    contactEmail: string;
    supportPhone: string;
    emergencyContact: {
        phone: string;
        email: string;
        supportLine: string;
    };
    companyAddress: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    businessInfo: {
        registrationNumber: string;
        taxId: string;
        operatingHours: string;
        timeZone: string;
    };
    socialMedia: {
        facebook: string;
        twitter: string;
        instagram: string;
        tiktok: string;
        telegram: string;
        discord: string;
        whatsapp: string;
        wechat: string;
        linkedin: string;
        youtube: string;
    };
    supportLinks: {
        helpCenter: string;
        supportTickets: string;
        faq: string;
        knowledgeBase: string;
    };
}

export function ContactSettings() {
    const router = useRouter();
    const [settings, setSettings] = useState<ContactSettings>({
        contactEmail: '',
        supportPhone: '',
        emergencyContact: {
            phone: '',
            email: '',
            supportLine: '',
        },
        companyAddress: {
            street: '',
            city: '',
            state: '',
            country: '',
            postalCode: '',
        },
        businessInfo: {
            registrationNumber: '',
            taxId: '',
            operatingHours: '',
            timeZone: '',
        },
        socialMedia: {
            facebook: '',
            twitter: '',
            instagram: '',
            tiktok: '',
            telegram: '',
            discord: '',
            whatsapp: '',
            wechat: '',
            linkedin: '',
            youtube: '',
        },
        supportLinks: {
            helpCenter: '',
            supportTickets: '',
            faq: '',
            knowledgeBase: '',
        },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetchWithRetry('/admin/settings/contact', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const data = await response.json();
            setSettings({
                contactEmail: data.find((s: any) => s.key === 'contactEmail')?.value || '',
                supportPhone: data.find((s: any) => s.key === 'supportPhone')?.value || '',
                emergencyContact: typeof data.find((s: any) => s.key === 'emergencyContact')?.value === 'string'
                    ? JSON.parse(data.find((s: any) => s.key === 'emergencyContact')?.value)
                    : data.find((s: any) => s.key === 'emergencyContact')?.value || {
                        phone: '',
                        email: '',
                        supportLine: '',
                    },
                companyAddress: typeof data.find((s: any) => s.key === 'companyAddress')?.value === 'string'
                    ? JSON.parse(data.find((s: any) => s.key === 'companyAddress')?.value)
                    : data.find((s: any) => s.key === 'companyAddress')?.value || {},
                businessInfo: typeof data.find((s: any) => s.key === 'businessInfo')?.value === 'string'
                    ? JSON.parse(data.find((s: any) => s.key === 'businessInfo')?.value)
                    : data.find((s: any) => s.key === 'businessInfo')?.value || {
                        registrationNumber: '',
                        taxId: '',
                        operatingHours: '',
                        timeZone: '',
                    },
                socialMedia: typeof data.find((s: any) => s.key === 'socialMedia')?.value === 'string'
                    ? JSON.parse(data.find((s: any) => s.key === 'socialMedia')?.value)
                    : data.find((s: any) => s.key === 'socialMedia')?.value || {
                        facebook: '',
                        twitter: '',
                        instagram: '',
                        tiktok: '',
                        telegram: '',
                        discord: '',
                        whatsapp: '',
                        wechat: '',
                        linkedin: '',
                        youtube: '',
                    },
                supportLinks: typeof data.find((s: any) => s.key === 'supportLinks')?.value === 'string'
                    ? JSON.parse(data.find((s: any) => s.key === 'supportLinks')?.value)
                    : data.find((s: any) => s.key === 'supportLinks')?.value || {
                        helpCenter: '',
                        supportTickets: '',
                        faq: '',
                        knowledgeBase: '',
                    },
            });
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setError(err.message || 'Failed to load settings');
            if (err.message === 'Session expired') {
                router.push('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            console.log('Preparing settings for save:', settings);
            
            const settingsPayload = [
                { key: 'contactEmail', value: settings.contactEmail },
                { key: 'supportPhone', value: settings.supportPhone },
                { key: 'emergencyContact', value: JSON.stringify(settings.emergencyContact) },
                { key: 'companyAddress', value: JSON.stringify(settings.companyAddress) },
                { key: 'businessInfo', value: JSON.stringify(settings.businessInfo) },
                { key: 'socialMedia', value: JSON.stringify(settings.socialMedia) },
                { key: 'supportLinks', value: JSON.stringify(settings.supportLinks) },
            ];
            
            console.log('Sending settings payload:', settingsPayload);
            
            const response = await fetchWithRetry('/admin/settings/contact', {
                method: 'PATCH',
                body: JSON.stringify({
                    settings: settingsPayload,
                }),
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(`Failed to save settings: ${responseData.message || 'Unknown error'}`);
            }

            setSuccess('Settings saved successfully');
            console.log('Settings saved successfully');
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setError(err.message || 'Failed to save settings');
            if (err.message === 'Session expired') {
                router.push('/login');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        if (field.startsWith('address.')) {
            const addressField = field.split('.')[1];
            setSettings(prev => ({
                ...prev,
                companyAddress: {
                    ...prev.companyAddress,
                    [addressField]: value,
                },
            }));
        } else if (field.startsWith('social.')) {
            const socialField = field.split('.')[1];
            setSettings(prev => ({
                ...prev,
                socialMedia: {
                    ...prev.socialMedia,
                    [socialField]: value,
                },
            }));
        } else if (field.startsWith('emergency.')) {
            const emergencyField = field.split('.')[1];
            setSettings(prev => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [emergencyField]: value,
                },
            }));
        } else if (field.startsWith('business.')) {
            const businessField = field.split('.')[1];
            setSettings(prev => ({
                ...prev,
                businessInfo: {
                    ...prev.businessInfo,
                    [businessField]: value,
                },
            }));
        } else if (field.startsWith('support.')) {
            const supportField = field.split('.')[1];
            setSettings(prev => ({
                ...prev,
                supportLinks: {
                    ...prev.supportLinks,
                    [supportField]: value,
                },
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Paper className="p-6 mb-6">
                <Typography variant="h6" className="mb-4">
                    Contact Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" className="mb-6">
                    Manage your platform's contact information and support details
                </Typography>

                <Grid container spacing={3}>
                    {/* Primary Contact Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3">
                            Primary Contact
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Contact Email"
                            value={settings.contactEmail}
                            onChange={(e) => handleChange('contactEmail', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Support Phone"
                            value={settings.supportPhone}
                            onChange={(e) => handleChange('supportPhone', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>

                    {/* Emergency Contact Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Emergency Contact
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Emergency Phone"
                            value={settings.emergencyContact.phone}
                            onChange={(e) => handleChange('emergency.phone', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Emergency Email"
                            value={settings.emergencyContact.email}
                            onChange={(e) => handleChange('emergency.email', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="24/7 Support Line"
                            value={settings.emergencyContact.supportLine}
                            onChange={(e) => handleChange('emergency.supportLine', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>

                    {/* Business Information Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Business Information
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Business Registration Number"
                            value={settings.businessInfo.registrationNumber}
                            onChange={(e) => handleChange('business.registrationNumber', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Tax ID/VAT Number"
                            value={settings.businessInfo.taxId}
                            onChange={(e) => handleChange('business.taxId', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Operating Hours"
                            value={settings.businessInfo.operatingHours}
                            onChange={(e) => handleChange('business.operatingHours', e.target.value)}
                            className="mb-4"
                            placeholder="e.g., Mon-Fri: 9:00 AM - 5:00 PM"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Time Zone"
                            value={settings.businessInfo.timeZone}
                            onChange={(e) => handleChange('business.timeZone', e.target.value)}
                            className="mb-4"
                            placeholder="e.g., UTC+1"
                        />
                    </Grid>

                    {/* Company Address Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Company Address
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Street Address"
                            value={settings.companyAddress.street}
                            onChange={(e) => handleChange('address.street', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="City"
                            value={settings.companyAddress.city}
                            onChange={(e) => handleChange('address.city', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="State"
                            value={settings.companyAddress.state}
                            onChange={(e) => handleChange('address.state', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Country"
                            value={settings.companyAddress.country}
                            onChange={(e) => handleChange('address.country', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Postal Code"
                            value={settings.companyAddress.postalCode}
                            onChange={(e) => handleChange('address.postalCode', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>

                    {/* Support Links Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Support Resources
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Help Center URL"
                            value={settings.supportLinks.helpCenter}
                            onChange={(e) => handleChange('support.helpCenter', e.target.value)}
                            className="mb-4"
                            placeholder="https://help.yourplatform.com"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Support Tickets URL"
                            value={settings.supportLinks.supportTickets}
                            onChange={(e) => handleChange('support.supportTickets', e.target.value)}
                            className="mb-4"
                            placeholder="https://support.yourplatform.com"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="FAQ Page URL"
                            value={settings.supportLinks.faq}
                            onChange={(e) => handleChange('support.faq', e.target.value)}
                            className="mb-4"
                            placeholder="https://yourplatform.com/faq"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Knowledge Base URL"
                            value={settings.supportLinks.knowledgeBase}
                            onChange={(e) => handleChange('support.knowledgeBase', e.target.value)}
                            className="mb-4"
                            placeholder="https://kb.yourplatform.com"
                        />
                    </Grid>

                    {/* Social Media Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" className="mb-3 mt-4">
                            Social Media & Community
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Facebook"
                            value={settings.socialMedia.facebook}
                            onChange={(e) => handleChange('social.facebook', e.target.value)}
                            className="mb-4"
                            placeholder="https://facebook.com/your-page"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Twitter"
                            value={settings.socialMedia.twitter}
                            onChange={(e) => handleChange('social.twitter', e.target.value)}
                            className="mb-4"
                            placeholder="https://twitter.com/your-handle"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Instagram"
                            value={settings.socialMedia.instagram}
                            onChange={(e) => handleChange('social.instagram', e.target.value)}
                            className="mb-4"
                            placeholder="https://instagram.com/your-handle"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="TikTok"
                            value={settings.socialMedia.tiktok}
                            onChange={(e) => handleChange('social.tiktok', e.target.value)}
                            className="mb-4"
                            placeholder="https://tiktok.com/@your-handle"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Telegram"
                            value={settings.socialMedia.telegram}
                            onChange={(e) => handleChange('social.telegram', e.target.value)}
                            className="mb-4"
                            placeholder="https://t.me/your-channel"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Discord"
                            value={settings.socialMedia.discord}
                            onChange={(e) => handleChange('social.discord', e.target.value)}
                            className="mb-4"
                            placeholder="https://discord.gg/your-server"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="WhatsApp"
                            value={settings.socialMedia.whatsapp}
                            onChange={(e) => handleChange('social.whatsapp', e.target.value)}
                            className="mb-4"
                            placeholder="https://wa.me/your-number"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="WeChat ID"
                            value={settings.socialMedia.wechat}
                            onChange={(e) => handleChange('social.wechat', e.target.value)}
                            className="mb-4"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="LinkedIn"
                            value={settings.socialMedia.linkedin}
                            onChange={(e) => handleChange('social.linkedin', e.target.value)}
                            className="mb-4"
                            placeholder="https://linkedin.com/company/your-company"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="YouTube"
                            value={settings.socialMedia.youtube}
                            onChange={(e) => handleChange('social.youtube', e.target.value)}
                            className="mb-4"
                            placeholder="https://youtube.com/@your-channel"
                        />
                    </Grid>
                </Grid>

                <Box display="flex" justifyContent="flex-end" mt={3}>
                    <LoadingButton
                        loading={saving}
                        loadingPosition="start"
                        startIcon={<SaveIcon />}
                        variant="contained"
                        onClick={handleSave}
                    >
                        Save Changes
                    </LoadingButton>
                </Box>
            </Paper>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess(null)}
            >
                <Alert severity="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
} 