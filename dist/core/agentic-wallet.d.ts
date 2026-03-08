import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { EncryptedData } from './secure-vault';
export interface SessionInfo {
    token: string;
    expiresAt: number;
    walletAddress: string;
    walletName: string;
    createdAt: number;
}
export interface WalletMetadata {
    name: string;
    address: string;
    encrypted: string;
    salt: string;
    iv: string;
    createdAt: string;
    lastUsed?: string;
}
export declare class AgenticWallet {
    private connection;
    private keypair;
    private sessions;
    private walletDir;
    private currentWalletName;
    private rpcUrl;
    constructor(rpcUrl?: string, walletDir?: string);
    /**
     * ===========================================
     * WALLET CREATION & MANAGEMENT
     * ===========================================
     */
    /**
     * Create a new wallet programmatically
     * Requirement #1: Programmatic wallet creation
     */
    createWallet(name: string, password: string): Promise<{
        address: string;
        file: string;
    }>;
    /**
     * Get wallet file path
     */
    private getWalletPath;
    /**
     * Load wallet metadata
     */
    private loadWalletMetadata;
    /**
     * List all wallets
     */
    listWallets(): Promise<{
        name: string;
        address: string;
        createdAt: string;
        lastUsed?: string;
    }[]>;
    /**
     * Delete a wallet
     */
    deleteWallet(name: string, password: string): Promise<boolean>;
    /**
     * ===========================================
     * SESSION MANAGEMENT
     * ===========================================
     */
    /**
     * Unlock wallet and get session token
     * Creates time-limited session for autonomous operation
     */
    unlock(name: string, password: string, durationHours?: number): string;
    /**
     * Validate session token
     */
    private validateSession;
    /**
     * Refresh session token (extend expiration)
     */
    refreshSession(token: string, additionalHours?: number): string;
    /**
     * Lock wallet (revoke session)
     */
    lock(token: string): void;
    /**
     * Lock all wallets
     */
    lockAll(): void;
    /**
     * Get session info
     */
    getSessionInfo(token: string): SessionInfo | null;
    /**
     * Get all active sessions
     */
    getActiveSessions(): SessionInfo[];
    /**
     * ===========================================
     * BALANCE & ACCOUNT INFO
     * ===========================================
     */
    /**
     * Get SOL balance
     * Requirement #3: Hold SOL or SPL tokens
     */
    getBalance(token: string): Promise<number>;
    /**
     * Get wallet address
     */
    getAddress(token: string): string;
    /**
     * Get SPL token balance
     * Requirement #3: Hold SOL or SPL tokens
     */
    getTokenBalance(token: string, mintAddress: string): Promise<number>;
    /**
     * Get all token balances
     */
    getAllTokenBalances(token: string): Promise<{
        mint: string;
        balance: number;
    }[]>;
    /**
     * ===========================================
     * TRANSACTIONS
     * ===========================================
     */
    /**
     * Transfer SOL
     * Requirement #2: Sign transactions automatically
     */
    transferSol(to: string, amount: number, token: string): Promise<string>;
    /**
     * Sign and send any transaction
     * Core auto-signing functionality
     */
    signAndSendTransaction(transaction: Transaction | VersionedTransaction, token: string): Promise<string>;
    /**
     * Simulate transaction (dry run)
     */
    simulateTransaction(transaction: Transaction, token: string): Promise<any>;
    /**
     * Request airdrop (devnet only)
     */
    requestAirdrop(token: string, amount?: number): Promise<string>;
    /**
     * ===========================================
     * SPL TOKEN OPERATIONS
     * ===========================================
     */
    /**
     * Create associated token account
     */
    createTokenAccount(token: string, mintAddress: string): Promise<string>;
    /**
     * Transfer SPL tokens
     */
    transferTokens(token: string, mintAddress: string, toAddress: string, amount: number): Promise<string>;
    /**
     * ===========================================
     * UTILITY FUNCTIONS
     * ===========================================
     */
    /**
     * Get transaction history
     */
    getTransactionHistory(token: string, limit?: number): Promise<any[]>;
    /**
     * Get account info
     */
    getAccountInfo(token: string): Promise<any>;
    /**
     * Check if wallet is unlocked
     */
    isUnlocked(token?: string): boolean;
    /**
     * Get current wallet name
     */
    getCurrentWalletName(): string;
    /**
     * Export wallet private key (encrypted)
     */
    exportWallet(name: string, password: string): {
        encrypted: string;
        address: string;
    };
    /**
     * Import wallet from encrypted data
     */
    importWallet(name: string, encryptedData: EncryptedData, password: string): Promise<string>;
    /**
     * Get RPC URL
     */
    getRpcUrl(): string;
}
//# sourceMappingURL=agentic-wallet.d.ts.map