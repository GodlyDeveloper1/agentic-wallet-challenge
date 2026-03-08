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
export declare class SecureVault {
    private static readonly ITERATIONS;
    private static readonly KEY_SIZE;
    private static readonly SALT_SIZE;
    private static readonly IV_SIZE;
    /**
     * Encrypt private key with password using AES-256
     */
    static encryptPrivateKey(privateKey: Uint8Array, password: string): EncryptedData;
    /**
     * Decrypt private key using password
     */
    static decryptPrivateKey(encryptedData: EncryptedData, password: string): Uint8Array;
    /**
     * Zero out memory (best effort)
     */
    static secureZero(data: Uint8Array): void;
    /**
     * Generate a secure random password
     */
    static generateSecurePassword(length?: number): string;
    /**
     * Create a session token
     */
    static generateSessionToken(): string;
    /**
     * Validate password strength
     */
    static validatePasswordStrength(password: string): {
        valid: boolean;
        message: string;
    };
}
//# sourceMappingURL=secure-vault.d.ts.map