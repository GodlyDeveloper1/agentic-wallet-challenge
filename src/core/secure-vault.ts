import * as CryptoJS from 'crypto-js';
import bs58 from 'bs58';

export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
}

export interface WalletData {
  name: string;
  address: string;
  encrypted: string;
  salt: string;
  iv: string;
  createdAt: string;
}

export class SecureVault {
  private static readonly ITERATIONS = 600000;
  private static readonly KEY_SIZE = 256;
  private static readonly SALT_SIZE = 16;
  private static readonly IV_SIZE = 16;
  
  /**
   * Encrypt private key with password using AES-256
   */
  static encryptPrivateKey(privateKey: Uint8Array, password: string): EncryptedData {
    try {
      // Generate random salt and IV
      const salt = CryptoJS.lib.WordArray.random(this.SALT_SIZE);
      const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);
      
      // Derive key using PBKDF2
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: this.KEY_SIZE / 32,
        iterations: this.ITERATIONS,
        hasher: CryptoJS.algo.SHA256
      });
      
      // Convert private key to base58 string for encryption
      const privateKeyBase58 = bs58.encode(privateKey);
      
      // Encrypt using CBC mode
      const encrypted = CryptoJS.AES.encrypt(privateKeyBase58, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
      
      return {
        encrypted,
        salt: salt.toString(),
        iv: iv.toString()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }
  
  /**
   * Decrypt private key using password
   */
  static decryptPrivateKey(encryptedData: EncryptedData, password: string): Uint8Array {
    try {
      const { encrypted, salt, iv } = encryptedData;
      
      // Derive key same way as encryption
      const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
        keySize: this.KEY_SIZE / 32,
        iterations: this.ITERATIONS,
        hasher: CryptoJS.algo.SHA256
      });
      
      // Decrypt using CBC mode
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convert to string
      const privateKeyBase58 = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!privateKeyBase58) {
        throw new Error('Decryption failed - invalid password or corrupted data');
      }
      
      // Decode from base58
      return bs58.decode(privateKeyBase58);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}. Check your password.`);
    }
  }
  
  /**
   * Zero out memory (best effort)
   */
  static secureZero(data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      data[i] = 0;
    }
  }
  
  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    
    return password;
  }
  
  /**
   * Create a session token
   */
  static generateSessionToken(): string {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    return Buffer.from(buffer).toString('base64');
  }
  
  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    return { valid: true, message: 'Password strength: strong' };
  }
}