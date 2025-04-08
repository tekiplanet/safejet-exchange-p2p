export interface NewsItem {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  type: 'announcement' | 'marketUpdate' | 'alert';
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  imageUrl?: string;
  externalLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsResponse {
  news: NewsItem[];
} 