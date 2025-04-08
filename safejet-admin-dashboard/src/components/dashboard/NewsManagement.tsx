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
    Chip,
    TablePagination,
    InputAdornment
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

type NewsType = 'announcement' | 'marketUpdate' | 'alert';
type NewsPriority = 'high' | 'medium' | 'low';

interface NewsItem {
    id: string;
    title: string;
    content: string;
    type: NewsType;
    priority: NewsPriority;
    createdAt: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;
    
    return (
        <div className="flex flex-wrap gap-2 mb-4 p-2 border-b border-gray-200">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('bold') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title="Bold"
            >
                <strong>B</strong>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('italic') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title="Italic"
            >
                <em>I</em>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('underline') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title="Underline"
            >
                <u>U</u>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <button
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('paragraph') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
            >
                P
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('heading', { level: 1 }) 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
            >
                H1
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('heading', { level: 2 }) 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
            >
                H2
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('bulletList') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title="Bullet List"
            >
                • List
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-3 py-1 rounded ${
                    editor.isActive('orderedList') 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title="Numbered List"
            >
                1. List
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Undo"
            >
                ↶
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Redo"
            >
                ↷
            </button>
        </div>
    );
};

interface News {
    id: string;
    type: 'announcement' | 'marketUpdate' | 'alert';
    priority: 'high' | 'medium' | 'low';
    title: string;
    shortDescription: string;
    content: string;
    isActive: boolean;
    imageUrl?: string;
    externalLink?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string | null;
}

export default function NewsManagement() {
    const [news, setNews] = useState<News[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [editNews, setEditNews] = useState<Partial<News> | null>(null);
    const [page, setPage] = useState(0);
    const [totalNews, setTotalNews] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [newsToDelete, setNewsToDelete] = useState<string | null>(null);
    const router = useRouter();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2]
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false
                },
                paragraph: {
                    HTMLAttributes: {
                        class: 'my-2'
                    }
                }
            }),
            Underline,
            Link.configure({
                openOnClick: false,
            }),
        ],
        content: editNews?.content || '',
        editable: true,
        autofocus: true,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] w-full max-w-none',
                spellcheck: 'true',
            },
            handleDOMEvents: {
                keydown: (_view, event) => {
                    // Handle space key normally
                    if (event.key === ' ') {
                        return false;
                    }
                    return false;
                }
            }
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setEditNews(prev => prev ? {
                ...prev,
                content: html
            } : null);
        },
    });

    useEffect(() => {
        if (editor && editNews?.content) {
            editor.commands.setContent(editNews.content);
        }
    }, [editNews?.content, editor]);

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

    const fetchNews = async () => {
        setLoading(true);
        try {
            const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const response = await fetchWithRetry(
                `/news/admin?page=${page + 1}&limit=${rowsPerPage}${searchParam}`, 
                { method: 'GET' }
            );
            const data = await response.json();
            setNews(data.data);
            setTotalNews(data.total);
            setStatus('');
        } catch (error) {
            console.error('Error fetching news:', error);
            setStatus('Error loading news. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            fetchNews();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (localStorage.getItem('adminToken')) {
            fetchNews();
        }
    }, [page, rowsPerPage]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editNews || !editNews.content) return;

        setLoading(true);
        try {
            const newsData = {
                title: editNews.title,
                content: editNews.content,
                shortDescription: editNews.shortDescription || editNews.content.substring(0, 255),
                type: editNews.type,
                priority: editNews.priority,
                isActive: editNews.isActive,
                imageUrl: editNews.imageUrl,
                externalLink: editNews.externalLink
            };

            if (editNews.id) {
                await fetchWithRetry(`/news/admin/${editNews.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(newsData)
                });
            } else {
                await fetchWithRetry('/news/admin', {
                    method: 'POST',
                    body: JSON.stringify(newsData)
                });
            }
            setEditNews(null);
            await fetchNews();
            setStatus('News saved successfully');
        } catch (error) {
            console.error('Error saving news:', error);
            setStatus('Error saving news. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetchWithRetry(`/news/admin/${id}`, {
                method: 'DELETE'
            });
            await fetchNews();
            setStatus('News deleted successfully');
            setDeleteConfirmOpen(false);
            setNewsToDelete(null);
        } catch (error) {
            console.error('Error deleting news:', error);
            setStatus('Error deleting news. Please try again.');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'default';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'announcement':
                return 'primary';
            case 'marketUpdate':
                return 'success';
            case 'alert':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                        <h2 className="text-lg font-medium text-gray-900">News Management</h2>
                        <p className="text-sm text-gray-500">Manage announcements, market updates, and alerts</p>
                    </div>
                    <div className="flex space-x-4">
                        <TextField
                            placeholder="Search news..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-w-[200px]"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            onClick={() => setEditNews({
                                isActive: true,
                                type: 'announcement',
                                priority: 'medium'
                            })}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Add News
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

            {/* News Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="ml-2 text-gray-600">Loading news...</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Priority</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {news.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.type}
                                                color={getTypeColor(item.type)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.priority}
                                                color={getPriorityColor(item.priority)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.isActive ? 'Active' : 'Inactive'}
                                                color={item.isActive ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(item.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end space-x-2">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setEditNews(item)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setNewsToDelete(item.id);
                                                        setDeleteConfirmOpen(true);
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                <TablePagination
                    component="div"
                    count={totalNews}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            </div>

            {/* Edit/Add Dialog */}
            <Dialog
                open={editNews !== null}
                onClose={() => setEditNews(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editNews?.id ? 'Edit News' : 'Add News'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <div className="space-y-4">
                            <TextField
                                fullWidth
                                label="Title"
                                value={editNews?.title || ''}
                                onChange={(e) => setEditNews({ ...editNews, title: e.target.value })}
                                required
                            />

                            <TextField
                                fullWidth
                                label="Short Description"
                                value={editNews?.shortDescription || ''}
                                onChange={(e) => setEditNews({ ...editNews, shortDescription: e.target.value })}
                                multiline
                                rows={2}
                                required
                            />

                            <TextField
                                fullWidth
                                label="Image URL"
                                value={editNews?.imageUrl || ''}
                                onChange={(e) => setEditNews({ ...editNews, imageUrl: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                helperText="Optional: URL for the news image"
                            />

                            <TextField
                                fullWidth
                                label="External Link"
                                value={editNews?.externalLink || ''}
                                onChange={(e) => setEditNews({ ...editNews, externalLink: e.target.value })}
                                placeholder="https://example.com/article"
                                helperText="Optional: URL for additional information"
                            />

                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={editNews?.type || 'announcement'}
                                    onChange={(e) => setEditNews({ ...editNews, type: e.target.value as NewsType })}
                                >
                                    <MenuItem value="announcement">Announcement</MenuItem>
                                    <MenuItem value="marketUpdate">Market Update</MenuItem>
                                    <MenuItem value="alert">Alert</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={editNews?.priority || 'medium'}
                                    onChange={(e) => setEditNews({ ...editNews, priority: e.target.value as NewsPriority })}
                                >
                                    <MenuItem value="high">High</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="low">Low</MenuItem>
                                </Select>
                            </FormControl>

                            <div className="space-y-2">
                                <Typography variant="subtitle1">Content</Typography>
                                <div className="border rounded-md overflow-hidden">
                                    <MenuBar editor={editor} />
                                    <div className="p-4">
                                        <EditorContent 
                                            editor={editor} 
                                            className="min-h-[200px] focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl w-full max-w-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editNews?.isActive || false}
                                        onChange={(e) => setEditNews({
                                            ...editNews,
                                            isActive: e.target.checked
                                        })}
                                    />
                                }
                                label="Active"
                            />
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditNews(null)}>Cancel</Button>
                        <LoadingButton
                            type="submit"
                            loading={loading}
                            variant="contained"
                        >
                            Save
                        </LoadingButton>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setNewsToDelete(null);
                }}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this news item? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDeleteConfirmOpen(false);
                            setNewsToDelete(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => newsToDelete && handleDelete(newsToDelete)}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
} 