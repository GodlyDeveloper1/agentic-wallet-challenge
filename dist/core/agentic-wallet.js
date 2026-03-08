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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const secure_vault_1 = require("./secure-vault");
const fs = __importStar(require("fs")); // For sync operations
const fsPromises = __importStar(require("fs/promises")); // For async operations
const path = __importStar(require("path")); // For path operations
class AgenticWallet {
    constructor(rpcUrl = 'https://api.devnet.solana.com', walletDir = './wallets') {
        this.keypair = null;
        this.sessions = new Map();
        this.currentWalletName = '';
        this.rpcUrl = rpcUrl;
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.walletDir = walletDir;
        // Create wallet directory if it doesn't exist
        if (!fs.existsSync(walletDir)) {
            fs.mkdirSync(walletDir, { recursive: true });
        }
    }
    /**
     * ===========================================
     * WALLET CREATION & MANAGEMENT
     * ===========================================
     */
    /**
     * Create a new wallet programmatically
     * Requirement #1: Programmatic wallet creation
     */
    async createWallet(name, password) {
        // Validate password strength
        const strengthCheck = secure_vault_1.SecureVault.validatePasswordStrength(password);
        if (!strengthCheck.valid) {
            throw new Error(`Weak password: ${strengthCheck.message}`);
        }
        // Check if wallet already exists
        const walletFile = this.getWalletPath(name);
        if (fs.existsSync(walletFile)) {
            throw new Error(`Wallet ${name} already exists`);
        }
        // Generate new keypair
        this.keypair = web3_js_1.Keypair.generate();
        const address = this.keypair.publicKey.toString();
        // Encrypt private key
        const encryptedData = secure_vault_1.SecureVault.encryptPrivateKey(this.keypair.secretKey, password);
        // Save to file
        const walletData = {
            name,
            address,
            encrypted: encryptedData.encrypted,
            salt: encryptedData.salt,
            iv: encryptedData.iv,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };
        fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));
        console.log(`✅ Wallet created: ${address}`);
        console.log(`💾 Saved to: ${walletFile}`);
        return { address, file: walletFile };
    }
    /**
     * Get wallet file path
     */
    getWalletPath(name) {
        return path.join(this.walletDir, `${name}.json`);
    }
    /**
     * Load wallet metadata
     */
    async loadWalletMetadata(name) {
        const walletFile = this.getWalletPath(name);
        try {
            const data = await fsPromises.readFile(walletFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Wallet ${name} not found or corrupted`);
        }
    }
    /**
     * List all wallets
     */
    async listWallets() {
        try {
            const files = await fsPromises.readdir(this.walletDir);
            const wallets = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await fsPromises.readFile(path.join(this.walletDir, file), 'utf8');
                    const wallet = JSON.parse(data);
                    wallets.push({
                        name: wallet.name,
                        address: wallet.address,
                        createdAt: wallet.createdAt,
                        lastUsed: wallet.lastUsed
                    });
                }
            }
            return wallets;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Delete a wallet
     */
    async deleteWallet(name, password) {
        const walletFile = this.getWalletPath(name);
        if (!fs.existsSync(walletFile)) {
            throw new Error(`Wallet ${name} not found`);
        }
        // Verify password by trying to decrypt
        const metadata = await this.loadWalletMetadata(name);
        const encryptedData = {
            encrypted: metadata.encrypted,
            salt: metadata.salt,
            iv: metadata.iv
        };
        // This will throw if password is wrong
        secure_vault_1.SecureVault.decryptPrivateKey(encryptedData, password);
        // Delete the file
        await fsPromises.unlink(walletFile);
        console.log(`🗑️ Wallet ${name} deleted`);
        return true;
    }
    /**
     * ===========================================
     * SESSION MANAGEMENT
     * ===========================================
     */
    /**
     * Unlock wallet and get session token
     * Creates time-limited session for autonomous operation
     */
    unlock(name, password, durationHours = 1) {
        const walletPath = this.getWalletPath(name);
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet ${name} not found`);
        }
        const metadata = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        // Decrypt private key
        const encryptedData = {
            encrypted: metadata.encrypted,
            salt: metadata.salt,
            iv: metadata.iv
        };
        const privateKey = secure_vault_1.SecureVault.decryptPrivateKey(encryptedData, password);
        this.keypair = web3_js_1.Keypair.fromSecretKey(privateKey);
        this.currentWalletName = name;
        // Zero out private key from memory (security best practice)
        secure_vault_1.SecureVault.secureZero(privateKey);
        // Generate session token
        const token = secure_vault_1.SecureVault.generateSessionToken();
        const expiresAt = Date.now() + (durationHours * 60 * 60 * 1000);
        this.sessions.set(token, {
            token,
            expiresAt,
            walletAddress: this.keypair.publicKey.toString(),
            walletName: name,
            createdAt: Date.now()
        });
        // Update last used timestamp
        metadata.lastUsed = new Date().toISOString();
        fs.writeFileSync(walletPath, JSON.stringify(metadata, null, 2));
        console.log(`🔓 Unlocked wallet ${name} for ${durationHours} hour(s)`);
        console.log(`⏰ Session expires: ${new Date(expiresAt).toLocaleString()}`);
        return token;
    }
    /**
     * Validate session token
     */
    validateSession(token) {
        const session = this.sessions.get(token);
        if (!session) {
            throw new Error('Invalid session token');
        }
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            throw new Error('Session expired');
        }
        // Ensure keypair is loaded for this session
        if (!this.keypair) {
            throw new Error('Wallet not loaded - please unlock again');
        }
        // Verify the keypair matches the session
        if (this.keypair.publicKey.toString() !== session.walletAddress) {
            throw new Error('Session/wallet mismatch');
        }
        return true;
    }
    /**
     * Refresh session token (extend expiration)
     */
    refreshSession(token, additionalHours = 1) {
        const session = this.sessions.get(token);
        if (!session) {
            throw new Error('Invalid session token');
        }
        // Extend expiration
        session.expiresAt += (additionalHours * 60 * 60 * 1000);
        this.sessions.set(token, session);
        console.log(`🔄 Session extended until ${new Date(session.expiresAt).toLocaleString()}`);
        return token;
    }
    /**
     * Lock wallet (revoke session)
     */
    lock(token) {
        const session = this.sessions.get(token);
        if (session) {
            this.sessions.delete(token);
            console.log(`🔒 Locked wallet ${session.walletName}`);
        }
        // If no more sessions, clear keypair
        if (this.sessions.size === 0) {
            this.keypair = null;
            this.currentWalletName = '';
            console.log('🔒 All wallets locked');
        }
    }
    /**
     * Lock all wallets
     */
    lockAll() {
        this.sessions.clear();
        this.keypair = null;
        this.currentWalletName = '';
        console.log('🔒 All wallets locked');
    }
    /**
     * Get session info
     */
    getSessionInfo(token) {
        const session = this.sessions.get(token);
        if (!session)
            return null;
        return { ...session };
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        // Clean expired sessions
        const now = Date.now();
        for (const [token, session] of this.sessions) {
            if (now > session.expiresAt) {
                this.sessions.delete(token);
            }
        }
        return Array.from(this.sessions.values());
    }
    /**
     * ===========================================
     * BALANCE & ACCOUNT INFO
     * ===========================================
     */
    /**
     * Get SOL balance
     * Requirement #3: Hold SOL or SPL tokens
     */
    async getBalance(token) {
        this.validateSession(token);
        const balance = await this.connection.getBalance(this.keypair.publicKey);
        return balance / web3_js_1.LAMPORTS_PER_SOL;
    }
    /**
     * Get wallet address
     */
    getAddress(token) {
        this.validateSession(token);
        return this.keypair.publicKey.toString();
    }
    /**
     * Get SPL token balance
     * Requirement #3: Hold SOL or SPL tokens
     */
    async getTokenBalance(token, mintAddress) {
        this.validateSession(token);
        try {
            const mintPubkey = new web3_js_1.PublicKey(mintAddress);
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(this.keypair.publicKey, { mint: mintPubkey });
            if (tokenAccounts.value.length === 0) {
                return 0;
            }
            // Parse the first token account
            const accountData = spl_token_1.AccountLayout.decode(tokenAccounts.value[0].account.data);
            return Number(accountData.amount);
        }
        catch (error) {
            console.error('Error getting token balance:', error);
            return 0;
        }
    }
    /**
     * Get all token balances
     */
    async getAllTokenBalances(token) {
        this.validateSession(token);
        try {
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(this.keypair.publicKey, { programId: spl_token_1.TOKEN_PROGRAM_ID });
            const balances = [];
            for (const { account, pubkey } of tokenAccounts.value) {
                const accountData = spl_token_1.AccountLayout.decode(account.data);
                balances.push({
                    mint: accountData.mint.toString(),
                    balance: Number(accountData.amount)
                });
            }
            return balances;
        }
        catch (error) {
            console.error('Error getting token balances:', error);
            return [];
        }
    }
    /**
     * ===========================================
     * TRANSACTIONS
     * ===========================================
     */
    /**
     * Transfer SOL
     * Requirement #2: Sign transactions automatically
     */
    async transferSol(to, amount, token) {
        this.validateSession(token);
        const toPubkey = new web3_js_1.PublicKey(to);
        const lamports = amount * web3_js_1.LAMPORTS_PER_SOL;
        // Check balance first
        const balance = await this.connection.getBalance(this.keypair.publicKey);
        if (balance < lamports) {
            throw new Error(`Insufficient balance: ${balance / web3_js_1.LAMPORTS_PER_SOL} SOL available, ${amount} SOL requested`);
        }
        // Create transaction
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: this.keypair.publicKey,
            toPubkey,
            lamports
        }));
        return this.signAndSendTransaction(transaction, token);
    }
    /**
     * Sign and send any transaction
     * Core auto-signing functionality
     */
    async signAndSendTransaction(transaction, token) {
        this.validateSession(token);
        let signature;
        if (transaction instanceof web3_js_1.Transaction) {
            // Legacy transaction
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.keypair.publicKey;
            // Sign
            transaction.sign(this.keypair);
            // Send
            signature = await this.connection.sendRawTransaction(transaction.serialize());
        }
        else {
            // Versioned transaction
            transaction.sign([this.keypair]);
            signature = await this.connection.sendRawTransaction(transaction.serialize());
        }
        // Confirm
        const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        console.log(`✅ Transaction sent: ${signature}`);
        return signature;
    }
    /**
     * Simulate transaction (dry run)
     */
    async simulateTransaction(transaction, token) {
        this.validateSession(token);
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.keypair.publicKey;
        // Simulate without signing
        const simulation = await this.connection.simulateTransaction(transaction);
        return simulation;
    }
    /**
     * Request airdrop (devnet only)
     */
    async requestAirdrop(token, amount = 1) {
        this.validateSession(token);
        const signature = await this.connection.requestAirdrop(this.keypair.publicKey, amount * web3_js_1.LAMPORTS_PER_SOL);
        await this.connection.confirmTransaction(signature, 'confirmed');
        console.log(`💧 Airdrop received: ${amount} SOL`);
        console.log(`   Signature: ${signature}`);
        return signature;
    }
    /**
     * ===========================================
     * SPL TOKEN OPERATIONS
     * ===========================================
     */
    /**
     * Create associated token account
     */
    async createTokenAccount(token, mintAddress) {
        this.validateSession(token);
        const mintPubkey = new web3_js_1.PublicKey(mintAddress);
        const tokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, this.keypair, mintPubkey, this.keypair.publicKey);
        return tokenAccount.address.toString();
    }
    /**
     * Transfer SPL tokens
     */
    async transferTokens(token, mintAddress, toAddress, amount) {
        this.validateSession(token);
        const mintPubkey = new web3_js_1.PublicKey(mintAddress);
        const toPubkey = new web3_js_1.PublicKey(toAddress);
        // Get or create token accounts
        const fromTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, this.keypair, mintPubkey, this.keypair.publicKey);
        const toTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, this.keypair, mintPubkey, toPubkey);
        // Transfer
        const signature = await (0, spl_token_1.transfer)(this.connection, this.keypair, fromTokenAccount.address, toTokenAccount.address, this.keypair.publicKey, amount);
        return signature;
    }
    /**
     * ===========================================
     * UTILITY FUNCTIONS
     * ===========================================
     */
    /**
     * Get transaction history
     */
    async getTransactionHistory(token, limit = 10) {
        this.validateSession(token);
        const signatures = await this.connection.getSignaturesForAddress(this.keypair.publicKey, { limit });
        return signatures;
    }
    /**
     * Get account info
     */
    async getAccountInfo(token) {
        this.validateSession(token);
        const info = await this.connection.getAccountInfo(this.keypair.publicKey);
        return info;
    }
    /**
     * Check if wallet is unlocked
     */
    isUnlocked(token) {
        if (token) {
            const session = this.sessions.get(token);
            return !!session && Date.now() <= session.expiresAt;
        }
        return this.keypair !== null && this.sessions.size > 0;
    }
    /**
     * Get current wallet name
     */
    getCurrentWalletName() {
        return this.currentWalletName;
    }
    /**
     * Export wallet private key (encrypted)
     */
    exportWallet(name, password) {
        const walletPath = this.getWalletPath(name);
        const metadata = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        // Verify password
        const encryptedData = {
            encrypted: metadata.encrypted,
            salt: metadata.salt,
            iv: metadata.iv
        };
        secure_vault_1.SecureVault.decryptPrivateKey(encryptedData, password);
        return {
            encrypted: metadata.encrypted,
            address: metadata.address
        };
    }
    /**
     * Import wallet from encrypted data
     */
    async importWallet(name, encryptedData, password) {
        // Verify the encrypted data works
        const privateKey = secure_vault_1.SecureVault.decryptPrivateKey(encryptedData, password);
        const keypair = web3_js_1.Keypair.fromSecretKey(privateKey);
        const address = keypair.publicKey.toString();
        // Save wallet
        const walletData = {
            name,
            address,
            encrypted: encryptedData.encrypted,
            salt: encryptedData.salt,
            iv: encryptedData.iv,
            createdAt: new Date().toISOString()
        };
        const walletFile = this.getWalletPath(name);
        fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));
        return address;
    }
    /**
     * Get RPC URL
     */
    getRpcUrl() {
        return this.rpcUrl;
    }
}
exports.AgenticWallet = AgenticWallet;
//# sourceMappingURL=agentic-wallet.js.map