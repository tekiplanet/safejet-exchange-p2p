import * as crypto from 'crypto';

const key = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY_SECRET=', key); 