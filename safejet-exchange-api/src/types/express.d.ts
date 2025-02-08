import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            admin?: {
                email: string;
                sub: string;
                type: string;
                iat: number;
                exp: number;
            };
        }
    }
} 