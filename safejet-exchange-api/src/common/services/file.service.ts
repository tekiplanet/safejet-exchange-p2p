import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

@Injectable()
export class FileService {
  private readonly uploadDir: string;
  private readonly chatUploadDir: string;
  private readonly validImageExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', 
    '.avif', '.heic', '.heif', '.gif', 
    '.bmp', '.tiff', '.tif'
  ];

  constructor() {
    // Use public directory for uploads
    this.uploadDir = path.join(process.cwd(), 'public/uploads/payment-methods');
    this.chatUploadDir = path.join(process.cwd(), 'public/uploads/chat');
    
    // Ensure upload directories exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.chatUploadDir)) {
      fs.mkdirSync(this.chatUploadDir, { recursive: true });
    }
  }

  private isValidImageFilename(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.validImageExtensions.includes(ext);
  }

  async saveBase64Image(base64String: string): Promise<string> {
    try {
      // If it's just a filename and has valid image extension, return it as is
      if (!base64String.includes('base64,') && this.isValidImageFilename(base64String)) {
        return base64String;
      }

      // Validate base64 string format
      if (!base64String.includes('base64,')) {
        throw new Error('Invalid base64 image format');
      }

      // Extract MIME type and base64 data
      const matches = base64String.match(/^data:image\/([a-zA-Z0-9-+/]+);base64,/);
      if (!matches) {
        throw new Error('Invalid image format');
      }

      const imageFormat = matches[1].toLowerCase();
      const base64Data = base64String.split('base64,')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length > 5 * 1024 * 1024) {
        throw new Error('Image size exceeds 5MB limit');
      }

      // Generate random filename with original format if supported, fallback to webp
      const outputFormat = ['jpeg', 'png', 'webp', 'avif'].includes(imageFormat) 
        ? imageFormat 
        : 'webp';
      
      const filename = `${crypto.randomBytes(16).toString('hex')}.${outputFormat}`;
      const filepath = path.join(this.uploadDir, filename);

      try {
        const sharpInstance = sharp(buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          });

        // Apply format-specific processing
        switch (outputFormat) {
          case 'jpeg':
            await sharpInstance
              .jpeg({ quality: 80, progressive: true })
              .toFile(filepath);
            break;
          case 'png':
            await sharpInstance
              .png({ compressionLevel: 9 })
              .toFile(filepath);
            break;
          case 'webp':
            await sharpInstance
              .webp({ quality: 80 })
              .toFile(filepath);
            break;
          case 'avif':
            await sharpInstance
              .avif({ quality: 80 })
              .toFile(filepath);
            break;
          default:
            await sharpInstance
              .webp({ quality: 80 })
              .toFile(filepath);
        }

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

  getChatFilePath(filename: string): string {
    return path.join(this.chatUploadDir, filename);
  }

  async saveChatImage(base64String: string): Promise<string> {
    try {
      console.log('Starting saveChatImage process...');
      console.log('Chat upload directory:', this.chatUploadDir);
      console.log('Base64 string length:', base64String?.length);

      // If it's just a filename and has valid image extension, return it as is
      if (!base64String.includes('base64,') && this.isValidImageFilename(base64String)) {
        console.log('Input is a valid filename, returning as is:', base64String);
        return base64String;
      }

      // Validate base64 string format
      if (!base64String.includes('base64,')) {
        console.error('Invalid base64 format - missing "base64," marker');
        throw new Error('Invalid base64 image format');
      }

      // Extract MIME type and base64 data
      const matches = base64String.match(/^data:image\/([a-zA-Z0-9-+/]+);base64,/);
      if (!matches) {
        console.error('Invalid image format - could not extract MIME type');
        throw new Error('Invalid image format');
      }

      const imageFormat = matches[1].toLowerCase();
      console.log('Detected image format:', imageFormat);
      
      const base64Data = base64String.split('base64,')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      console.log('Decoded buffer size:', buffer.length, 'bytes');
      
      if (buffer.length > 5 * 1024 * 1024) {
        console.error('Image size exceeds limit:', buffer.length, 'bytes');
        throw new Error('Image size exceeds 5MB limit');
      }

      // Generate random filename with original format if supported, fallback to webp
      const outputFormat = ['jpeg', 'png', 'webp', 'avif'].includes(imageFormat) 
        ? imageFormat 
        : 'webp';
      
      const filename = `${crypto.randomBytes(16).toString('hex')}.${outputFormat}`;
      const filepath = path.join(this.chatUploadDir, filename);
      console.log('Generated filepath:', filepath);

      try {
        console.log('Creating Sharp instance for image processing...');
        const sharpInstance = sharp(buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          });

        // Apply format-specific processing
        console.log('Processing image with format:', outputFormat);
        switch (outputFormat) {
          case 'jpeg':
            await sharpInstance
              .jpeg({ quality: 80, progressive: true })
              .toFile(filepath);
            break;
          case 'png':
            await sharpInstance
              .png({ compressionLevel: 9 })
              .toFile(filepath);
            break;
          case 'webp':
            await sharpInstance
              .webp({ quality: 80 })
              .toFile(filepath);
            break;
          case 'avif':
            await sharpInstance
              .avif({ quality: 80 })
              .toFile(filepath);
            break;
          default:
            await sharpInstance
              .webp({ quality: 80 })
              .toFile(filepath);
        }

        // Verify file was created
        const fileExists = fs.existsSync(filepath);
        const fileStats = fileExists ? fs.statSync(filepath) : null;
        console.log('File creation status:', {
          exists: fileExists,
          size: fileStats?.size,
          path: filepath
        });

        if (!fileExists || !fileStats?.size) {
          throw new Error('File was not created successfully');
        }

        console.log(`Chat image saved successfully at: ${filepath}`);
        return filename;
      } catch (error) {
        console.error('Sharp processing error:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Chat image processing error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
} 