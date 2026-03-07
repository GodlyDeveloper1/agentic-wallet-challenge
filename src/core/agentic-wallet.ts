import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout, getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import { SecureVault, EncryptedData } from './secure-vault';
import * as fs from 'fs'; // For sync operations
import * as fsPromises from 'fs/promises'; // For async operations
import * as path from 'path'; // For path operations

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

export class AgenticWallet {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private sessions: Map<string, SessionInfo> = new Map();
  private walletDir: string;
  private currentWalletName: string = '';
  private rpcUrl: string;
  
  constructor(rpcUrl: string = 'https://api.devnet.solana.com', walletDir: string = './wallets') {
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, 'confirmed');
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
  async createWallet(name: string, password: string): Promise<{ address: string; file: string }> {
    // Validate password strength
    const strengthCheck = SecureVault.validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      throw new Error(`Weak password: ${strengthCheck.message}`);
    }
    
    // Check if wallet already exists
    const walletFile = this.getWalletPath(name);
    if (fs.existsSync(walletFile)) {
      throw new Error(`Wallet ${name} already exists`);
    }
    
    // Generate new keypair
    this.keypair = Keypair.generate();
    const address = this.keypair.publicKey.toString();
    
    // Encrypt private key
    const encryptedData = SecureVault.encryptPrivateKey(this.keypair.secretKey, password);
    
    // Save to file
    const walletData: WalletMetadata = {
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
  private getWalletPath(name: string): string {
    return path.join(this.walletDir, `${name}.json`);
  }
  
  /**
   * Load wallet metadata
   */
  private async loadWalletMetadata(name: string): Promise<WalletMetadata> {
    const walletFile = this.getWalletPath(name);
    
    try {
      const data = await fsPromises.readFile(walletFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Wallet ${name} not found or corrupted`);
    }
  }
  
  /**
   * List all wallets
   */
  async listWallets(): Promise<{ name: string; address: string; createdAt: string; lastUsed?: string }[]> {
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
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Delete a wallet
   */
  async deleteWallet(name: string, password: string): Promise<boolean> {
    const walletFile = this.getWalletPath(name);
    
    if (!fs.existsSync(walletFile)) {
      throw new Error(`Wallet ${name} not found`);
    }
    
    // Verify password by trying to decrypt
    const metadata = await this.loadWalletMetadata(name);
    const encryptedData: EncryptedData = {
      encrypted: metadata.encrypted,
      salt: metadata.salt,
      iv: metadata.iv
    };
    
    // This will throw if password is wrong
    SecureVault.decryptPrivateKey(encryptedData, password);
    
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
  unlock(name: string, password: string, durationHours: number = 1): string {
    const walletPath = this.getWalletPath(name);
    
    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet ${name} not found`);
    }
    
    const metadata = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    // Decrypt private key
    const encryptedData: EncryptedData = {
      encrypted: metadata.encrypted,
      salt: metadata.salt,
      iv: metadata.iv
    };
    
    const privateKey = SecureVault.decryptPrivateKey(encryptedData, password);
    this.keypair = Keypair.fromSecretKey(privateKey);
    this.currentWalletName = name;
    
    // Zero out private key from memory (security best practice)
    SecureVault.secureZero(privateKey);
    
    // Generate session token
    const token = SecureVault.generateSessionToken();
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
  private validateSession(token: string): boolean {
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
  refreshSession(token: string, additionalHours: number = 1): string {
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
  lock(token: string): void {
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
  lockAll(): void {
    this.sessions.clear();
    this.keypair = null;
    this.currentWalletName = '';
    console.log('🔒 All wallets locked');
  }
  
  /**
   * Get session info
   */
  getSessionInfo(token: string): SessionInfo | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    
    return { ...session };
  }
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionInfo[] {
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
  async getBalance(token: string): Promise<number> {
    this.validateSession(token);
    
    const balance = await this.connection.getBalance(this.keypair!.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }
  
  /**
   * Get wallet address
   */
  getAddress(token: string): string {
    this.validateSession(token);
    return this.keypair!.publicKey.toString();
  }
  
  /**
   * Get SPL token balance
   * Requirement #3: Hold SOL or SPL tokens
   */
  async getTokenBalance(token: string, mintAddress: string): Promise<number> {
    this.validateSession(token);
    
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.keypair!.publicKey,
        { mint: mintPubkey }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      // Parse the first token account
      const accountData = AccountLayout.decode(tokenAccounts.value[0].account.data);
      return Number(accountData.amount);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }
  
  /**
   * Get all token balances
   */
  async getAllTokenBalances(token: string): Promise<{ mint: string; balance: number }[]> {
    this.validateSession(token);
    
    try {
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.keypair!.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      const balances = [];
      for (const { account, pubkey } of tokenAccounts.value) {
        const accountData = AccountLayout.decode(account.data);
        balances.push({
          mint: accountData.mint.toString(),
          balance: Number(accountData.amount)
        });
      }
      
      return balances;
    } catch (error) {
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
  async transferSol(to: string, amount: number, token: string): Promise<string> {
    this.validateSession(token);
    
    const toPubkey = new PublicKey(to);
    const lamports = amount * LAMPORTS_PER_SOL;
    
    // Check balance first
    const balance = await this.connection.getBalance(this.keypair!.publicKey);
    if (balance < lamports) {
      throw new Error(`Insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL available, ${amount} SOL requested`);
    }
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair!.publicKey,
        toPubkey,
        lamports
      })
    );
    
    return this.signAndSendTransaction(transaction, token);
  }
  
  /**
   * Sign and send any transaction
   * Core auto-signing functionality
   */
  async signAndSendTransaction(transaction: Transaction | VersionedTransaction, token: string): Promise<string> {
    this.validateSession(token);
    
    let signature: string;
    
    if (transaction instanceof Transaction) {
      // Legacy transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.keypair!.publicKey;
      
      // Sign
      transaction.sign(this.keypair!);
      
      // Send
      signature = await this.connection.sendRawTransaction(transaction.serialize());
    } else {
      // Versioned transaction
      transaction.sign([this.keypair!]);
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
  async simulateTransaction(transaction: Transaction, token: string): Promise<any> {
    this.validateSession(token);
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair!.publicKey;
    
    // Simulate without signing
    const simulation = await this.connection.simulateTransaction(transaction);
    return simulation;
  }
  
  /**
   * Request airdrop (devnet only)
   */
  async requestAirdrop(token: string, amount: number = 1): Promise<string> {
    this.validateSession(token);
    
    const signature = await this.connection.requestAirdrop(
      this.keypair!.publicKey,
      amount * LAMPORTS_PER_SOL
    );
    
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
  async createTokenAccount(token: string, mintAddress: string): Promise<string> {
    this.validateSession(token);
    
    const mintPubkey = new PublicKey(mintAddress);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.keypair!,
      mintPubkey,
      this.keypair!.publicKey
    );
    
    return tokenAccount.address.toString();
  }
  
  /**
   * Transfer SPL tokens
   */
  async transferTokens(
    token: string, 
    mintAddress: string, 
    toAddress: string, 
    amount: number
  ): Promise<string> {
    this.validateSession(token);
    
    const mintPubkey = new PublicKey(mintAddress);
    const toPubkey = new PublicKey(toAddress);
    
    // Get or create token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.keypair!,
      mintPubkey,
      this.keypair!.publicKey
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.keypair!,
      mintPubkey,
      toPubkey
    );
    
    // Transfer
    const signature = await transfer(
      this.connection,
      this.keypair!,
      fromTokenAccount.address,
      toTokenAccount.address,
      this.keypair!.publicKey,
      amount
    );
    
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
  async getTransactionHistory(token: string, limit: number = 10): Promise<any[]> {
    this.validateSession(token);
    
    const signatures = await this.connection.getSignaturesForAddress(
      this.keypair!.publicKey,
      { limit }
    );
    
    return signatures;
  }
  
  /**
   * Get account info
   */
  async getAccountInfo(token: string): Promise<any> {
    this.validateSession(token);
    
    const info = await this.connection.getAccountInfo(this.keypair!.publicKey);
    return info;
  }
  
  /**
   * Check if wallet is unlocked
   */
  isUnlocked(token?: string): boolean {
    if (token) {
      const session = this.sessions.get(token);
      return !!session && Date.now() <= session.expiresAt;
    }
    return this.keypair !== null && this.sessions.size > 0;
  }
  
  /**
   * Get current wallet name
   */
  getCurrentWalletName(): string {
    return this.currentWalletName;
  }
  
  /**
   * Export wallet private key (encrypted)
   */
  exportWallet(name: string, password: string): { encrypted: string; address: string } {
    const walletPath = this.getWalletPath(name);
    const metadata = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    // Verify password
    const encryptedData: EncryptedData = {
      encrypted: metadata.encrypted,
      salt: metadata.salt,
      iv: metadata.iv
    };
    
    SecureVault.decryptPrivateKey(encryptedData, password);
    
    return {
      encrypted: metadata.encrypted,
      address: metadata.address
    };
  }
  
  /**
   * Import wallet from encrypted data
   */
  async importWallet(name: string, encryptedData: EncryptedData, password: string): Promise<string> {
    // Verify the encrypted data works
    const privateKey = SecureVault.decryptPrivateKey(encryptedData, password);
    const keypair = Keypair.fromSecretKey(privateKey);
    const address = keypair.publicKey.toString();
    
    // Save wallet
    const walletData: WalletMetadata = {
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
  getRpcUrl(): string {
    return this.rpcUrl;
  }
}