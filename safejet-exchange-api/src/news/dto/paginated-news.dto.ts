import { News } from '../entities/news.entity';

export class PaginatedNewsResponse {
  items: News[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} 