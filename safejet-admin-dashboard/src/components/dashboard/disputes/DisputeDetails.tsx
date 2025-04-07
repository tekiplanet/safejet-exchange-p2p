import { useState, useEffect, useRef } from 'react';
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
  Divider,
  Alert,
  Tab,
  Tabs,
  CircularProgress,
  TextField,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Send as SendIcon } from '@mui/icons-material';

interface DisputeMessage {
  id: string;
  message: string;
  createdAt: string;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM';
  sender?: {
    fullName: string;
    email: string;
  };
  attachments?: Array<{
    id: string;
    url: string;
    type: string;
    fileName?: string;
    originalUrl?: string;
  }>;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface MessageWithFiles extends DisputeMessage {
  files?: Array<{
    id?: string;
    url?: string;
    path?: string;
    location?: string;
    type?: string;
    mimeType?: string;
    name?: string;
    originalName?: string;
    [key: string]: any;
  }>;
}

interface Dispute {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reason: string;
  description: string;
  resolution?: string;
  initiator: {
    fullName: string;
    email: string;
  };
  respondent: {
    fullName: string;
    email: string;
  };
  order: {
    trackingId: string;
    amount: number;
    assetAmount: number;
    price: number;
    currency: string;
    cryptoAsset: string;
    status: string;
    buyerStatus: string;
    sellerStatus: string;
    paymentMethod: string;
    paymentMetadata: {
      methodId?: string;
      methodType?: string;
      name?: string;
      details?: Record<string, any>;
      icon?: string;
      typeName?: string;
      methodDetails?: Record<string, any>;
      userId?: string;
      [key: string]: any; // Allow for additional properties
    };
    completePaymentDetails?: {
      name: string;
      details: Record<string, any>;
      id?: string;
      fields?: Array<{
        id: string;
        name: string;
        label?: string;
        fieldType?: string;
        order?: number;
      }>;
      paymentMethodType: {
        name: string;
        icon: string;
        id?: string;
      };
    };
    buyer: {
      fullName: string;
      email: string;
    };
    seller: {
      fullName: string;
      email: string;
    };
    createdAt: string;
  };
  messages: DisputeMessage[];
  history: {
    action: string;
    timestamp: string;
    actor: string;
    details: string;
  }[];
  progressHistory?: {
    title: string;
    timestamp: string;
    addedBy: string;
    details: string;
  }[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dispute-tabpanel-${index}`}
      aria-labelledby={`dispute-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function DisputeDetails() {
  const router = useRouter();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = '/api';

  const fetchDispute = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/admin/disputes/${router.query.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch dispute details');
      }

      const data = await response.json();
      
      // Check specifically for message attachments
      if (data.messages && data.messages.length > 0) {
        // Check for messages with direct attachmentUrl
        const messagesWithAttachmentUrl = data.messages.filter((m: any) => m.attachmentUrl);
        if (messagesWithAttachmentUrl.length > 0) {
          console.log(`Found ${messagesWithAttachmentUrl.length} messages with direct attachmentUrl:`, 
            messagesWithAttachmentUrl.map((m: any) => ({ 
              id: m.id, 
              attachmentUrl: m.attachmentUrl, 
              attachmentType: m.attachmentType 
            }))
          );
          
          // Extract all image path variants for testing
          const testImagePaths = [
            `/api/p2p/chat/images/${messagesWithAttachmentUrl[0].attachmentUrl}`,
            `/api/upload/${messagesWithAttachmentUrl[0].attachmentUrl}`,
            `/api/attachments/${messagesWithAttachmentUrl[0].attachmentUrl}`,
            `/uploads/${messagesWithAttachmentUrl[0].attachmentUrl}`,
            `/${messagesWithAttachmentUrl[0].attachmentUrl}`
          ];
          console.log('Testing multiple image path formats:', testImagePaths);
          
          // Check sample URL from Flutter app
          const sampleUrl = messagesWithAttachmentUrl[0].attachmentUrl;
          console.log(`Sample attachment URL: ${sampleUrl} - is absolute: ${sampleUrl.startsWith('http')}`);
        }
        
        // Convert direct attachmentUrl to attachments array
        data.messages = data.messages.map((message: any) => {
          // If the message has attachmentUrl but no attachments array
          if (message.attachmentUrl && (!message.attachments || message.attachments.length === 0)) {
            // Use the exact filename without any path prefixes
            const fileName = message.attachmentUrl;
            
            console.log(`Converting message ${message.id} attachmentUrl to attachments array:`, {
              originalUrl: message.attachmentUrl,
              fileName
            });
            
            const directImageUrl = `/api/p2p/chat/images/${fileName}`;  // Match the backend endpoint exactly
            return {
              ...message,
              attachments: [{
                id: `${message.id}-attachment`,
                url: directImageUrl,  // Use the unique name
                type: message.attachmentType || 
                      (message.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/octet-stream'),
                fileName: fileName,
                originalUrl: message.attachmentUrl
              }]
            };
          }
          return message;
        });
        
        // Check if there's any message with files property
        const messagesWithFiles = data.messages.filter((m: any) => m.files && m.files.length > 0);
        if (messagesWithFiles.length > 0) {
          console.log('Found messages with files property instead of attachments:', messagesWithFiles);
          
          // Fix the property name discrepancy by copying files to attachments
          data.messages = data.messages.map((message: any) => {
            if (message.files && message.files.length > 0 && (!message.attachments || message.attachments.length === 0)) {
              return {
                ...message,
                attachments: message.files.map((file: any) => ({
                  id: file.id || Math.random().toString(),
                  url: file.url || file.path || file.location || '',
                  type: file.type || file.mimeType || (file.url?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/octet-stream'),
                  fileName: file.name || file.originalName || 'attachment'
                }))
              };
            }
            return message;
          });
        }
        
        // Also check for fileAttachments property
        const messagesWithFileAttachments = data.messages.filter((m: any) => m.fileAttachments && m.fileAttachments.length > 0);
        if (messagesWithFileAttachments.length > 0) {
          console.log('Found messages with fileAttachments property:', messagesWithFileAttachments);
          
          // Map fileAttachments to attachments
          data.messages = data.messages.map((message: any) => {
            if (message.fileAttachments && message.fileAttachments.length > 0 && (!message.attachments || message.attachments.length === 0)) {
              return {
                ...message,
                attachments: message.fileAttachments.map((file: any) => ({
                  id: file.id || Math.random().toString(),
                  url: file.url || file.path || file.location || '',
                  type: file.type || file.mimeType || (file.url?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/octet-stream'),
                  fileName: file.name || file.originalName || 'attachment'
                }))
              };
            }
            return message;
          });
        }
        
        // Also check for media property
        const messagesWithMedia = data.messages.filter((m: any) => m.media && m.media.length > 0);
        if (messagesWithMedia.length > 0) {
          console.log('Found messages with media property:', messagesWithMedia);
          
          // Map media to attachments
          data.messages = data.messages.map((message: any) => {
            if (message.media && message.media.length > 0 && (!message.attachments || message.attachments.length === 0)) {
              return {
                ...message,
                attachments: message.media.map((media: any) => ({
                  id: media.id || Math.random().toString(),
                  url: media.url || media.path || media.location || '',
                  type: media.type || media.mimeType || (media.url?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/octet-stream'),
                  fileName: media.name || media.originalName || 'media'
                }))
              };
            }
            return message;
          });
        }
        
        // Check for images property
        const messagesWithImages = data.messages.filter((m: any) => m.images && m.images.length > 0);
        if (messagesWithImages.length > 0) {
          console.log('Found messages with images property:', messagesWithImages);
          
          // Map images to attachments
          data.messages = data.messages.map((message: any) => {
            if (message.images && message.images.length > 0 && (!message.attachments || message.attachments.length === 0)) {
              return {
                ...message,
                attachments: message.images.map((image: any) => ({
                  id: image.id || Math.random().toString(),
                  url: image.url || image.path || image.location || '',
                  type: 'image/jpeg', // Assuming it's an image
                  fileName: image.name || image.originalName || 'image'
                }))
              };
            }
            return message;
          });
        }
        
        // Log the final messages with attachments
        const finalMessagesWithAttachments = data.messages.filter((m: any) => m.attachments && m.attachments.length > 0);
        if (finalMessagesWithAttachments.length > 0) {
          console.log('Final messages with attachments after processing:', finalMessagesWithAttachments.length);
        }
      }
      
      setDispute(data);
      setNewStatus(data.status);
      setError(null);
    } catch (error) {
      console.error('Error fetching dispute:', error);
      setError('Failed to fetch dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!dispute || newStatus === dispute.status) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/admin/disputes/${dispute.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update dispute status');
      }

      await fetchDispute();
      setStatus('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      setStatus('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (router.query.id) {
      fetchDispute();
      
      // Log the domain for debugging purposes
      console.log('Current domain:', window.location.origin);
    }
    scrollToBottom();
  }, [router.query.id]);

  useEffect(() => {
    scrollToBottom();
  }, [dispute?.messages]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Add console logging for payment method debugging
  useEffect(() => {
  }, [dispute]);

  // Add console logging for message debugging
  useEffect(() => {
    if (dispute?.messages?.length) {
      const messagesWithAttachments = dispute.messages.filter(m => m.attachments && m.attachments.length > 0);
      if (messagesWithAttachments.length > 0) {
        console.log('Messages with attachments:', messagesWithAttachments);
      } else {
        console.log('No messages with attachments found');
        // Check if attachments exist but with a different property name
        const sampleMessage = dispute.messages[0];
        const messageKeys = Object.keys(sampleMessage);
        console.log('Message structure:', {
          keys: messageKeys,
          sample: sampleMessage
        });
        
        // Look for potential attachment fields
        const potentialAttachmentFields = messageKeys.filter(key => 
          key.includes('attach') || 
          key.includes('file') || 
          key.includes('image') || 
          key.includes('media')
        );
        
        if (potentialAttachmentFields.length > 0) {
          console.log('Potential attachment fields:', potentialAttachmentFields);
        }
      }
    }
  }, [dispute?.messages]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatCryptoAmount = (amount: number) => {
    // Format with up to 8 decimal places, no trailing zeros
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  const formatFiatAmount = (amount: number) => {
    // Format with thousand separators and 2 decimal places
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrency = (currency: string | undefined) => {
    if (!currency) return '';
    
    switch (currency.toUpperCase()) {
      case 'NGN':
        return '₦';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSendMessage = async () => {
    if (!dispute || (!newMessage.trim() && selectedFiles.length === 0)) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Use FormData to handle file uploads
      const formData = new FormData();
      formData.append('message', newMessage.trim());
      
      // If we have files, add them
      if (selectedFiles.length > 0) {
        console.log(`Sending ${selectedFiles.length} files:`, selectedFiles.map(f => f.name));
        
        // Add files to FormData
        // Match exactly how Flutter is sending the attachment
        const firstFile = selectedFiles[0];
        
        try {
          // Convert the first file to base64 for attachment
          const base64 = await fileToBase64(firstFile);
          const mimeType = firstFile.type || 'application/octet-stream';
          
          // Append with proper parameter name exactly as Flutter app does
          formData.append('attachment', `data:${mimeType};base64,${base64}`);
          console.log(`Attachment added as base64, MIME type: ${mimeType}, size: ${base64.length} chars`);
        } catch (error) {
          console.error('Error converting file to base64:', error);
          setStatus('Failed to prepare file for upload');
          setSendingMessage(false);
          return;
        }
      }

      console.log('Sending message to dispute:', dispute.id);
      console.log('FormData keys:', [...formData.keys()]);
      
      const response = await fetch(`${API_BASE}/admin/disputes/${dispute.id}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
          // Note: Don't set Content-Type when using FormData, browser will set it automatically with boundary
        },
        body: formData
      });

      if (!response.ok) {
        // Try to get response body for more error details
        try {
          const errorData = await response.json();
          console.error('Error response from server:', errorData);
          throw new Error(`Failed to send message: ${errorData.message || response.statusText}`);
        } catch (jsonError) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }
      }

      // Try to get response body for debugging
      try {
        const responseData = await response.json();
        console.log('Message sent successfully, response:', responseData);
      } catch (jsonError) {
        console.log('Message sent successfully, no JSON response');
      }

      await fetchDispute();
      setNewMessage('');
      setSelectedFiles([]);
      setStatus('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const getMessageStyle = (senderType: string, message: DisputeMessage, dispute: Dispute) => {
    const type = senderType?.toUpperCase() || '';
    
    // Determine if message sender is buyer or seller
    const isBuyer = message.sender && dispute.order.buyer.email === message.sender.email;
    const isSeller = message.sender && dispute.order.seller.email === message.sender.email;
    
    switch (type) {
      case 'ADMIN':
        return {
          ml: 'auto',
          mr: 0,
          bgcolor: '#2196f3',  // Bright blue for admin
          color: '#ffffff',
          borderRadius: '12px 12px 0 12px',
          boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)',
        };
      case 'USER':
        if (isBuyer) {
          return {
            ml: 0,
            mr: 'auto',
            bgcolor: '#e8f5e9',  // Light green for buyer
            color: '#1b5e20',
            borderRadius: '12px 12px 12px 0',
            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.1)',
          };
        } else if (isSeller) {
          return {
            ml: 0,
            mr: 'auto',
            bgcolor: '#e3f2fd',  // Light blue for seller
            color: '#0d47a1',
            borderRadius: '12px 12px 12px 0',
            boxShadow: '0 2px 4px rgba(13, 71, 161, 0.1)',
          };
        } else {
          return {
            ml: 0,
            mr: 'auto',
            bgcolor: '#f5f5f5',  // Default light grey for user
            color: '#424242',
            borderRadius: '12px 12px 12px 0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          };
        }
      case 'SYSTEM':
        return {
          mx: 'auto',
          bgcolor: '#ffebee',  // Light red for system
          color: '#c62828',
          width: 'fit-content',
          maxWidth: '80%',
          borderRadius: '12px',
          border: '1px solid #ffcdd2',
          boxShadow: '0 2px 4px rgba(198, 40, 40, 0.1)',
        };
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!dispute) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No dispute found
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/disputes')}
        >
          Back to Disputes
        </Button>
        <Typography variant="h5" component="h1">
          Dispute Details
        </Typography>
      </Box>

      {status && (
        <Alert 
          severity={status.includes('success') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setStatus('')}
        >
          {status}
        </Alert>
      )}

      {/* Main Content */}
      <Paper sx={{ mb: 3 }}>
        <Box p={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Order ID
              </Typography>
              <Typography variant="body1">
                {dispute.order.trackingId}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="RESOLVED_BUYER">Resolved (Buyer)</MenuItem>
                    <MenuItem value="RESOLVED_SELLER">Resolved (Seller)</MenuItem>
                    <MenuItem value="CLOSED">Closed</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="small"
                  disabled={updating || newStatus === dispute.status}
                  onClick={handleUpdateStatus}
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Initiator
              </Typography>
              <Typography variant="body1">
                {dispute.initiator.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dispute.initiator.email}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Respondent
              </Typography>
              <Typography variant="body1">
                {dispute.respondent.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dispute.respondent.email}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Reason
              </Typography>
              <Typography variant="body1">
                {dispute.reason}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1">
                {dispute.description}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Messages" />
            <Tab label="History" />
            <Tab label="Order Details" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box 
            display="flex" 
            flexDirection="column" 
            height="60vh" 
            sx={{ 
              bgcolor: '#f5f5f5',  // Light grey background for chat area
              borderRadius: 1,
              p: 2
            }}
          >
            <Box flex={1} overflow="auto" mb={2}>
              {!dispute.messages?.length ? (
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  No messages yet
                </Typography>
              ) : (
                [...dispute.messages]
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((message) => {
                    const senderTypeUpper = message.senderType?.toUpperCase() || '';
                    // Determine if message sender is buyer or seller
                    const isBuyer = message.sender && dispute.order.buyer.email === message.sender.email;
                    const isSeller = message.sender && dispute.order.seller.email === message.sender.email;
                    
                    let senderLabel = '';
                    if (senderTypeUpper === 'SYSTEM') {
                      senderLabel = 'System';
                    } else if (isBuyer) {
                      senderLabel = `${message.sender?.fullName || 'Buyer'}`;
                    } else if (isSeller) {
                      senderLabel = `${message.sender?.fullName || 'Seller'}`;
                    } else if (senderTypeUpper === 'ADMIN') {
                      senderLabel = 'Admin';
                    } else {
                      senderLabel = message.sender?.fullName || message.senderType;
                    }
                    
                    return (
                      <Paper 
                        key={message.id} 
                        sx={{ 
                          p: 2, 
                          mb: 2,
                          maxWidth: '80%',
                          ...getMessageStyle(message.senderType, message, dispute)
                        }}
                        elevation={2}
                      >
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: 'inherit',
                              fontWeight: 600
                            }}
                          >
                            {senderLabel}
                            {isBuyer && senderTypeUpper === 'USER' && ' (Buyer)'}
                            {isSeller && senderTypeUpper === 'USER' && ' (Seller)'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'inherit',
                              opacity: 0.8
                            }}
                          >
                            {formatDate(message.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ color: 'inherit' }}>
                          {message.message}
                        </Typography>
                        {/* Handle both attachments array and direct attachmentUrl */}
                        {((message.attachments && message.attachments.length > 0) || message.attachmentUrl) && (
                          <Box mt={1}>
                            {/* If we have an attachment array, render those */}
                            {message.attachments && message.attachments.length > 0 && message.attachments.map((attachment) => {
                              const fileName = attachment.originalUrl || 
                                              (attachment.fileName) || 
                                              (attachment.url && attachment.url.split('/').pop());
                              
                              // Try the Flutter approach of using a direct URL
                              const directImageUrl = `/api/p2p/chat/images/${fileName}`;  // Match the backend endpoint exactly
                              console.log(`Rendering attachment with direct URL: ${fileName}, URL: ${directImageUrl}`);
                              
                              // More robust image type detection 
                              const isImage = 
                                // Check by mime type
                                (attachment.type && attachment.type.toLowerCase().startsWith('image/')) || 
                                // Check by file extension in URL
                                (fileName && /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName)) ||
                                // Check for image-specific URL patterns
                                (fileName && /\/(img|image|photo|picture)s?\//i.test(fileName));
                              
                              return isImage ? (
                                <Box key={attachment.id} mt={1} sx={{ maxWidth: '100%' }}>
                                  <img
                                    src={directImageUrl}
                                    alt={attachment.fileName || 'Image attachment'}
                                    style={{ 
                                      maxWidth: '100%', 
                                      maxHeight: '300px', 
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                    onClick={() => window.open(directImageUrl, '_blank')}
                                    onError={(e) => {
                                      console.error(`Error loading image: ${directImageUrl}`);
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAwdjI0aC0yNHYtMjRoMjR6bS0yIDVoLTIwdjE0aDIwdi0xNHptLTEgMTNoLTE4di0xMmgxOHYxMnptLTEzLjUyOC0zLjI2OWwtMi4xOTYgMi4yNy0uMDA1LS4wMDUtLjM1MS0uMzY0IDIuNTUxLTIuNjQ1LTIuNTUxLTIuNjQ2LjM1MS0uMzY0LjAwNS0uMDA1IDIuMTk2IDIuMjcgNC4yNzItNC40MjcuMzUxLjM2NC4wMDUuMDA1YTQ1NzMuMzcxIDQ1NzMuMzcxIDAgMDEtNC42MjggNC43OTMgNDU3My43ODQgNDU3My43ODQgMCAwMTQuNjI4IDQuNzkzLS4wMDUuMDA1LS4zNTEuMzY0LTQuMjcyLTQuNDI3eiIgZmlsbD0iI2QzZDNkMyIvPjwvc3ZnPg==';
                                      e.currentTarget.style.padding = '10%';
                                      e.currentTarget.style.background = '#f5f5f5';
                                    }}
                                  />
                                  {attachment.fileName && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'inherit', opacity: 0.7 }}>
                                      {attachment.fileName}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Box 
                                  key={attachment.id} 
                                  mt={1} 
                                  sx={{ 
                                    p: 1.5, 
                                    bgcolor: 'rgba(0,0,0,0.04)', 
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <Typography variant="body2">
                                    {attachment.fileName || 'File attachment'}
                                  </Typography>
                                  <Button 
                                    size="small" 
                                    component="a" 
                                    href={directImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    variant="outlined"
                                  >
                                    Download
                                  </Button>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Paper>
                    );
                  })
              )}
              <div ref={messagesEndRef} />
            </Box>
            {dispute.status !== 'CLOSED' && (
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendingMessage}
                  multiline
                  maxRows={4}
                />
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <IconButton 
                  color="primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingMessage}
                  title="Attach files"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                    style={{ width: '20px', height: '20px' }}
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </IconButton>
                <IconButton 
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || (!newMessage.trim() && selectedFiles.length === 0)}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            )}
            {selectedFiles.length > 0 && (
              <Box mt={2} sx={{ bgcolor: 'rgba(0,0,0,0.03)', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {selectedFiles.length} file(s) selected
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {selectedFiles.map((file, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        bgcolor: 'background.paper', 
                        p: 0.5, 
                        pl: 1, 
                        borderRadius: 1,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    >
                      <Typography variant="caption" noWrap sx={{ maxWidth: '120px' }}>
                        {file.name}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveFile(index)}
                        sx={{ ml: 0.5 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            {!dispute.progressHistory?.length ? (
              <Typography variant="body1" color="text.secondary" textAlign="center">
                No history entries yet
              </Typography>
            ) : (
              dispute.progressHistory.map((event, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">
                      {event.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(event.timestamp)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    By: {event.addedBy}
                  </Typography>
                  <Typography variant="body1">
                    {event.details}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Asset Amount
              </Typography>
              <Typography variant="body1">
                {formatCryptoAmount(dispute.order.assetAmount)} {dispute.order.cryptoAsset}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Price
              </Typography>
              <Typography variant="body1">
                {formatCurrency(dispute.order.currency)}{formatFiatAmount(dispute.order.price)}/{dispute.order.cryptoAsset}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="body1">
                {formatCurrency(dispute.order.currency)}{formatFiatAmount(dispute.order.amount)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Order Status
              </Typography>
              <Typography variant="body1">
                {formatStatus(dispute.order.status)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Buyer Status
              </Typography>
              <Typography variant="body1">
                {formatStatus(dispute.order.buyerStatus)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Seller Status
              </Typography>
              <Typography variant="body1">
                {formatStatus(dispute.order.sellerStatus)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Buyer
              </Typography>
              <Typography variant="body1">
                {dispute.order.buyer.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dispute.order.buyer.email}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Seller
              </Typography>
              <Typography variant="body1">
                {dispute.order.seller.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dispute.order.seller.email}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Payment Method
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                {(() => {
                  // Define variables for payment display
                  let methodName = 'Unknown Payment Method';
                  let accountOwner = '';
                  let details: Record<string, any> = {};
                  let fields: any[] = [];
                  
                  // Try to get data from completePaymentDetails
                  if (dispute.order.completePaymentDetails) {
                    const completeDetails = dispute.order.completePaymentDetails;
                    methodName = completeDetails.paymentMethodType?.name || methodName;
                    accountOwner = completeDetails.name || '';
                    details = completeDetails.details || {};
                    fields = completeDetails.fields || [];
                    
                    // Add additional debug log to check field structure
                    // console.log('Payment fields detail:', {
                    //   fields: fields,
                    //   details: details,
                    //   detailsKeys: Object.keys(details),
                    //   sampleDetail: details[fields[0]?.name],
                    // });
                  } 
                  // Fallback to paymentMetadata
                  else if (dispute.order.paymentMetadata) {
                    // Extract method name (Bank Transfer, etc)
                    methodName = dispute.order.paymentMetadata.typeName || 
                                 dispute.order.paymentMethod || 
                                 methodName;
                    
                    // Extract account owner (person name)
                    accountOwner = dispute.order.paymentMetadata.methodName || 
                                   dispute.order.paymentMetadata.name || 
                                   '';
                    
                    // Extract details
                    if (dispute.order.paymentMetadata.details) {
                      details = dispute.order.paymentMetadata.details;
                    } else {
                      // Create details object from relevant fields
                      details = {
                        ...(dispute.order.paymentMetadata.typeId && { 'Type ID': dispute.order.paymentMetadata.typeId }),
                        ...(dispute.order.paymentMetadata.description && { 'Description': dispute.order.paymentMetadata.description })
                      };
                    }
                  }
                  
                  return (
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary" mb={1}>
                        {methodName}
                      </Typography>
                      
                      {accountOwner && (
                        <Box display="flex" alignItems="center" mb={2}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>
                            Account Owner:
                          </Typography>
                          <Typography variant="body1" fontWeight="500">
                            {accountOwner}
                          </Typography>
                        </Box>
                      )}
                      
                      {/* If we have structured fields from database, use them */}
                      {fields && fields.length > 0 && (
                        <Box>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" color="text.secondary" mb={1}>
                            Payment Details (Structured):
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {fields.map((field) => {
                              const fieldId = field.id;
                              const fieldName = field.name;
                              const fieldLabel = field.label || field.name;
                              
                              // Access the field value from details
                              let fieldValue = 'Not provided';
                              
                              // First check if we have a nested object with the field name
                              if (details[fieldName]) {
                                const detail = details[fieldName];
                                // If it's an object with a value property
                                if (typeof detail === 'object' && detail !== null && 'value' in detail) {
                                  fieldValue = detail.value;
                                } else {
                                  // Otherwise use the value directly
                                  fieldValue = detail;
                                }
                              }
                              
                              return (
                                <Grid item xs={12} sm={6} key={fieldId || fieldName}>
                                  <Box mb={1} sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {fieldLabel}
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                      {typeof fieldValue === 'object' 
                                        ? JSON.stringify(fieldValue) 
                                        : fieldValue?.toString() || ''}
                                    </Typography>
                                  </Box>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      )}
                      
                      {/* Otherwise use raw details data */}
                      {Object.keys(details).length > 0 && (!fields || fields.length === 0) && (
                        <Box>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" color="text.secondary" mb={1}>
                            Payment Details:
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {Object.entries(details).map(([key, value]) => (
                              <Grid item xs={12} sm={6} key={key}>
                                <Box mb={1} sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1 }}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </Typography>
                                  <Typography variant="body1" fontWeight="medium">
                                    {value?.toString() || ''}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                      
                      {Object.keys(details).length === 0 && (!fields || fields.length === 0) && (
                        <Typography variant="body2" color="text.secondary">
                          No additional payment details available
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created At
              </Typography>
              <Typography variant="body1">
                {formatDate(dispute.order.createdAt)}
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
} 