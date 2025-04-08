export class NewsDto {
  id: string;
  title: string;
  type: string;
  shortDescription: string;
  content: string;
  imageUrl?: string;
  externalLink?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
} 