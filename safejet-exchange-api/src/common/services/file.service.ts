import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

@Injectable()
export class FileService {
  private readonly uploadDir: string;

  constructor() {
    // Use public directory for uploads
    this.uploadDir = path.join(process.cwd(), 'public/uploads/payment-methods');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveBase64Image(base64String: string): Promise<string> {
    try {
      // Validate base64 string format
      if (!base64String.includes('base64,')) {
        throw new Error('Invalid base64 image format');
      }

      const base64Data = base64String.split('base64,')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length > 5 * 1024 * 1024) {
        throw new Error('Image size exceeds 5MB limit');
      }

      const filename = `${crypto.randomBytes(16).toString('hex')}.jpg`;
      const filepath = path.join(this.uploadDir, filename);

      try {
        await sharp(buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true
          })
          .toFile(filepath);

        console.log(`Image saved successfully at: ${filepath}`);
        return filename;
      } catch (error) {
        console.error('Sharp processing error:', error);
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
} 