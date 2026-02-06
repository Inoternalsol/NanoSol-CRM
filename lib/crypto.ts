import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

// Fallback key for development - In production, this MUST be set in .env
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'nanosol-crm-default-encryption-secret-key-2024';

export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    const key = scryptSync(ENCRYPTION_KEY, salt, 32);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: salt:iv:tag:encryptedContent
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(hash: string): string {
    const parts = hash.split(':');

    // Legacy/Plain-text fallback: If it doesn't look like our encrypted format (4 parts), 
    // assume it's a plain password from before encryption was enforced.
    if (parts.length !== 4) {
        // console.warn('Legacy password format detected, returning as-is'); 
        return hash;
    }

    const [saltHex, ivHex, tagHex, encryptedHex] = parts;

    if (!saltHex || !ivHex || !tagHex || !encryptedHex) {
        return hash; // Double check fallback
    }

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const key = scryptSync(ENCRYPTION_KEY, salt, 32);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
