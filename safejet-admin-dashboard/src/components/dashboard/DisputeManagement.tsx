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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextareaAutosize,
} from '@mui/material';

interface Dispute {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
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
    currency: string;
  };
}

interface ApiResponse {
  disputes: Dispute[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalDisputes, setTotalDisputes] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const router = useRouter();

  const API_BASE = '/api';

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const queryParams = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetch(`${API_BASE}/admin/disputes?${queryParams.toString()}`, {
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
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();
      setDisputes(data.disputes || data);
      if (data.meta) {
        setTotalDisputes(data.meta.total);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setError('Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDispute || !messageContent.trim()) {
      return;
    }

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/admin/disputes/${selectedDispute.id}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ message: messageContent.trim() })
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          router.push('/login');
          return;
        }
        throw new Error('Failed to send message');
      }

      setMessageContent('');
      setMessageDialogOpen(false);
      fetchDisputes();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchDisputes();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (localStorage.getItem('adminToken')) {
      fetchDisputes();
    }
  }, [page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 mb-4 md:mb-0">
            <h2 className="text-lg font-medium text-gray-900">Dispute Management</h2>
          </div>
          <div className="flex space-x-4">
            <TextField
              placeholder="Search disputes..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-[200px]"
            />
            <FormControl size="small" sx={{ minWidth: '150px' }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tracking ID</TableCell>
              <TableCell>Initiator</TableCell>
              <TableCell>Respondent</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} align="center" className="text-red-500">{error}</TableCell>
              </TableRow>
            ) : disputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No disputes found</TableCell>
              </TableRow>
            ) : (
              disputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell>{dispute.order.trackingId}</TableCell>
                  <TableCell>
                    <div>{dispute.initiator.fullName}</div>
                    <div className="text-sm text-gray-500">{dispute.initiator.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{dispute.respondent.fullName}</div>
                    <div className="text-sm text-gray-500">{dispute.respondent.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(dispute.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => router.push(`/dashboard/disputes/details?id=${dispute.id}`)}
                    >
                      View Dispute
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalDisputes}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </div>

      {/* Message Dialog */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => {
          setMessageDialogOpen(false);
          setMessageContent('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Message</DialogTitle>
        <DialogContent>
          <TextareaAutosize
            minRows={4}
            placeholder="Enter your message here..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="w-full p-2 border rounded mt-2"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMessageDialogOpen(false);
              setMessageContent('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={sendingMessage || !messageContent.trim()}
            variant="contained"
            color="primary"
          >
            {sendingMessage ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 