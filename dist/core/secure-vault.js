"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureVault = void 0;
const CryptoJS = __importStar(require("crypto-js"));
const bs58_1 = __importDefault(require("bs58"));
class SecureVault {
    /**
     * Encrypt private key with password using AES-256
     */
    static encryptPrivateKey(privateKey, password) {
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
            const privateKeyBase58 = bs58_1.default.encode(privateKey);
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
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error}`);
        }
    }
    /**
     * Decrypt private key using password
     */
    static decryptPrivateKey(encryptedData, password) {
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
            return bs58_1.default.decode(privateKeyBase58);
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error}. Check your password.`);
        }
    }
    /**
     * Zero out memory (best effort)
     */
    static secureZero(data) {
        for (let i = 0; i < data.length; i++) {
            data[i] = 0;
        }
    }
    /**
     * Generate a secure random password
     */
    static generateSecurePassword(length = 32) {
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
    static generateSessionToken() {
        const buffer = new Uint8Array(32);
        crypto.getRandomValues(buffer);
        return Buffer.from(buffer).toString('base64');
    }
    /**
     * Validate password strength
     */
    static validatePasswordStrength(password) {
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
exports.SecureVault = SecureVault;
SecureVault.ITERATIONS = 600000;
SecureVault.KEY_SIZE = 256;
SecureVault.SALT_SIZE = 16;
SecureVault.IV_SIZE = 16;
//# sourceMappingURL=secure-vault.js.map