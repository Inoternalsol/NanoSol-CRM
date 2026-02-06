/* eslint-disable @typescript-eslint/no-require-imports */
const { createCipheriv, createDecipheriv, randomBytes, scryptSync } = require('crypto');
require('dotenv').config({ path: '.env.local' });

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'nanosol-crm-default-encryption-secret-key-2024';

function encrypt(text) {
    const iv = randomBytes(12);
    const salt = randomBytes(16);
    const key = scryptSync(ENCRYPTION_KEY, salt, 32);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(hash) {
    const [saltHex, ivHex, tagHex, encryptedHex] = hash.split(':');
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

console.log("Testing Crypto...");
try {
    const original = "SuperSecretPassword123!";
    console.log("Original:", original);
    const encrypted = encrypt(original);
    console.log("Encrypted:", encrypted);
    const decrypted = decrypt(encrypted);
    console.log("Decrypted:", decrypted);

    if (original === decrypted) console.log("SUCCESS: Crypto works.");
    else console.error("FAILURE: Mismatch.");
} catch (e) {
    console.error("CRITICAL FAILURE:", e);
}
