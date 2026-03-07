import { AgenticWallet } from '../core/agentic-wallet';
import { DecisionEngine } from './decision-engine';
import { SecureVault } from '../core/secure-vault';
import * as fs from 'fs';
import * as path from 'path';

export interface ManagedAgent {
  id: string;
  wallet: AgenticWallet;
  brain: DecisionEngine;
  sessionToken: string;
  status: 'IDLE' | 'RUNNING' | 'STOPPED' | 'ERROR';
  lastActivity: Date;
  walletName: string;
  createdAt: Date;
  metrics: {
    cyclesRun: number;
    actionsTaken: number;
    successfulActions: number;
    failedActions: number;
    totalBalance: number;
  };
}

export class AgentOrchestrator {
  private agents: Map<string, ManagedAgent> = new Map();
  private masterWallet: AgenticWallet;
  private masterSession: string = ''; // Initialize with empty string
  private walletDir: string;
  
  constructor(masterWalletPassword: string, walletDir: string = './wallets') {
    this.walletDir = walletDir;
    this.masterWallet = new AgenticWallet(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      walletDir
    );
    
    // Create or load master wallet (synchronously for constructor)
    this.initializeMasterWalletSync(masterWalletPassword);
  }
  
  /**
   * Initialize master wallet synchronously for constructor
   */
  private initializeMasterWalletSync(password: string): void {
    const masterPath = path.join(this.walletDir, 'master.json');
    
    try {
      if (fs.existsSync(masterPath)) {
        console.log('🔑 Loading existing master wallet...');
        // Use sync unlock for constructor
        this.masterSession = this.masterWallet.unlock('master', password, 24);
      } else {
        console.log('📦 Creating new master wallet...');
        // For creation, we need to do this asynchronously
        // We'll set a placeholder and handle creation later
        console.log('⚠️ Master wallet not found. Please run initializeMasterWallet() after construction.');
        this.masterSession = '';
      }
    } catch (error) {
      console.error('❌ Failed to initialize master wallet:', error);
      throw error;
    }
  }
  
  /**
   * Initialize master wallet asynchronously (call this after construction)
   */
  async initializeMasterWallet(password: string): Promise<void> {
    const masterPath = path.join(this.walletDir, 'master.json');
    
    try {
      if (!fs.existsSync(masterPath)) {
        console.log('📦 Creating new master wallet...');
        const { address } = await this.masterWallet.createWallet('master', password);
        console.log(`✅ Master wallet created: ${address}`);
      }
      
      this.masterSession = this.masterWallet.unlock('master', password, 24);
      console.log('✅ Master wallet initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize master wallet:', error);
      throw error;
    }
  }
  
  /**
   * Create a new agent with its own wallet
   */
  async createAgent(
    agentId: string, 
    initialFunding: number = 0.1,
    agentPassword?: string
  ): Promise<ManagedAgent> {
    console.log(`\n🚀 Creating agent: ${agentId}`);
    
    try {
      // Check if master session is valid
      if (!this.masterSession) {
        throw new Error('Master wallet not initialized. Call initializeMasterWallet() first.');
      }
      
      // Generate secure password for agent if not provided
      const password = agentPassword || SecureVault.generateSecurePassword();
      
      // 1. Create wallet for this agent
      const wallet = new AgenticWallet(
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        this.walletDir
      );
      
      const { address } = await wallet.createWallet(agentId, password);
      console.log(`   ✅ Wallet created: ${address}`);
      
      // 2. Fund from master wallet (devnet SOL)
      if (initialFunding > 0) {
        try {
          const masterBalance = await this.masterWallet.getBalance(this.masterSession);
          if (masterBalance < initialFunding) {
            console.log(`   ⚠️ Master balance low (${masterBalance} SOL), requesting airdrop...`);
            await this.masterWallet.requestAirdrop(this.masterSession, 2);
          }
          
          const sig = await this.masterWallet.transferSol(
            address,
            initialFunding,
            this.masterSession
          );
          console.log(`   💰 Funded with ${initialFunding} SOL: ${sig.substring(0, 20)}...`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`   ⚠️ Funding failed: ${errorMessage}`);
        }
      }
      
      // 3. Unlock agent wallet
      const sessionToken = wallet.unlock(agentId, password, 24); // 24 hour session
      
      // 4. Create brain
      const brain = new DecisionEngine(wallet, sessionToken, agentId);
      
      // 5. Get initial balance
      let balance = 0;
      try {
        balance = await wallet.getBalance(sessionToken);
      } catch (e) {
        // Ignore balance errors
      }
      
      const agent: ManagedAgent = {
        id: agentId,
        wallet,
        brain,
        sessionToken,
        status: 'IDLE',
        lastActivity: new Date(),
        walletName: agentId,
        createdAt: new Date(),
        metrics: {
          cyclesRun: 0,
          actionsTaken: 0,
          successfulActions: 0,
          failedActions: 0,
          totalBalance: balance
        }
      };
      
      this.agents.set(agentId, agent);
      console.log(`   ✅ Agent ${agentId} ready`);
      
      return agent;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to create agent ${agentId}:`, errorMessage);
      throw error;
    }
  }
  
  /**
   * Run a single agent cycle
   */
  async runAgentCycle(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    agent.status = 'RUNNING';
    
    try {
      // Update metrics
      agent.metrics.cyclesRun++;
      
      // Agent thinks and acts autonomously
      const { decision, result } = await agent.brain.runCycle();
      
      // Update metrics based on result
      if (decision.shouldAct) {
        agent.metrics.actionsTaken++;
        if (result && !result.error) {
          agent.metrics.successfulActions++;
        } else {
          agent.metrics.failedActions++;
        }
      }
      
      // Update balance
      try {
        agent.metrics.totalBalance = await agent.wallet.getBalance(agent.sessionToken);
      } catch (e) {
        // Ignore balance errors
      }
      
      agent.lastActivity = new Date();
      agent.status = 'IDLE';
      
    } catch (error) {
      console.error(`❌ Agent ${agentId} error:`, error);
      agent.status = 'ERROR';
      agent.metrics.failedActions++;
    }
  }
  
  /**
   * Run all agents in parallel
   */
  async runAllAgents(cycles: number = 3, intervalMs: number = 5000): Promise<void> {
    console.log(`\n🎯 Running ${this.agents.size} agents for ${cycles} cycles...`);
    console.log('='.repeat(60));
    
    for (let cycle = 1; cycle <= cycles; cycle++) {
      console.log(`\n📊 CYCLE ${cycle}/${cycles} - ${new Date().toLocaleTimeString()}`);
      console.log('-'.repeat(60));
      
      // Show pre-cycle status
      this.printStatusTable();
      
      // Run all agents in parallel
      const promises = Array.from(this.agents.keys()).map(async agentId => {
        try {
          await this.runAgentCycle(agentId);
        } catch (e) {
          console.error(`Agent ${agentId} failed:`, e);
        }
      });
      
      await Promise.all(promises);
      
      // Show post-cycle status
      console.log('\n📈 Cycle Complete:');
      this.printStatusTable();
      
      if (cycle < cycles) {
        console.log(`\n⏳ Waiting ${intervalMs/1000}s before next cycle...`);
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All agent cycles completed');
    this.printSummary();
  }
  
  /**
   * Print status table
   */
  private printStatusTable(): void {
    const statuses = Array.from(this.agents.values()).map(a => ({
      'Agent ID': a.id,
      'Status': a.status,
      'Balance': a.metrics.totalBalance.toFixed(4) + ' SOL',
      'Actions': `${a.metrics.successfulActions}/${a.metrics.actionsTaken}`,
      'Last Active': a.lastActivity.toLocaleTimeString()
    }));
    
    console.table(statuses);
  }
  
  /**
   * Print summary
   */
  private printSummary(): void {
    console.log('\n📊 ORCHESTRATOR SUMMARY');
    console.log('='.repeat(60));
    
    let totalCycles = 0;
    let totalActions = 0;
    let totalSuccess = 0;
    let totalBalance = 0;
    
    for (const agent of this.agents.values()) {
      totalCycles += agent.metrics.cyclesRun;
      totalActions += agent.metrics.actionsTaken;
      totalSuccess += agent.metrics.successfulActions;
      totalBalance += agent.metrics.totalBalance;
      
      console.log(`\n🤖 Agent: ${agent.id}`);
      console.log(`   Cycles: ${agent.metrics.cyclesRun}`);
      console.log(`   Actions: ${agent.metrics.successfulActions}/${agent.metrics.actionsTaken} successful`);
      console.log(`   Balance: ${agent.metrics.totalBalance.toFixed(4)} SOL`);
      console.log(`   Status: ${agent.status}`);
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log(`📈 TOTAL: ${totalCycles} cycles, ${totalSuccess}/${totalActions} actions, ${totalBalance.toFixed(4)} SOL`);
    console.log('='.repeat(60));
  }
  
  /**
   * Create multiple agents at once
   */
  async createAgents(count: number, baseFunding: number = 0.1): Promise<string[]> {
    console.log(`\n🤖 Creating ${count} agents...`);
    
    const agentIds = [];
    for (let i = 1; i <= count; i++) {
      const agentId = `agent-${i}-${Date.now().toString().slice(-4)}`;
      await this.createAgent(agentId, baseFunding);
      agentIds.push(agentId);
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return agentIds;
  }
  
  /**
   * Get agent by ID
   */
  getAgent(agentId: string): ManagedAgent | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * Get all agents
   */
  getAllAgents(): ManagedAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Stop and remove an agent
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Lock wallet
    try {
      agent.wallet.lock(agent.sessionToken);
    } catch (e) {
      // Ignore lock errors
    }
    
    this.agents.delete(agentId);
    console.log(`🗑️ Agent ${agentId} removed`);
    
    return true;
  }
  
  /**
   * Shutdown orchestrator
   */
  shutdown(): void {
    console.log('\n🔒 Shutting down orchestrator...');
    
    for (const [id, agent] of this.agents) {
      try {
        agent.wallet.lock(agent.sessionToken);
        console.log(`   ✅ Locked agent ${id}`);
      } catch (e) {
        console.log(`   ⚠️ Failed to lock agent ${id}`);
      }
    }
    
    try {
      if (this.masterSession) {
        this.masterWallet.lock(this.masterSession);
        console.log('   ✅ Locked master wallet');
      }
    } catch (e) {
      // Ignore
    }
    
    this.agents.clear();
    console.log('✅ Orchestrator shutdown complete');
  }
}