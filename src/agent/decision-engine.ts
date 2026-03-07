import { AgenticWallet } from '../core/agentic-wallet';

export interface Decision {
  shouldAct: boolean;
  action?: {
    type: 'TRANSFER' | 'CHECK_BALANCE' | 'REBALANCE' | 'SIMULATE_TRADE' | 'AIRDROP';
    params: any;
  };
  reason: string;
  confidence: number; // 0-1
}

export interface MarketData {
  price: number;
  volume: number;
  volatility: number;
  timestamp: number;
}

export interface ActionHistoryEntry {
  timestamp: string;
  cycle: number;
  decision: Decision;
  result?: any;
  error?: string;
  executionTime?: number;
}

export class DecisionEngine {
  private wallet: AgenticWallet;
  private sessionToken: string;
  private lastActionTime: number = 0;
  private actionHistory: ActionHistoryEntry[] = [];
  private agentId: string;
  private cycleCount: number = 0;
  
  constructor(wallet: AgenticWallet, sessionToken: string, agentId: string = 'agent-1') {
    this.wallet = wallet;
    this.sessionToken = sessionToken;
    this.agentId = agentId;
  }
  
  /**
   * Simulate market data (in real AI, this would come from oracles/APIs)
   */
  private async getMarketData(): Promise<MarketData> {
    // Simulate market conditions with some randomness but trending patterns
    const now = Date.now();
    const hourOfDay = new Date(now).getHours();
    
    // Base price with time-of-day variation
    const basePrice = 150 + Math.sin(hourOfDay / 24 * Math.PI) * 10;
    
    // Add randomness
    const price = basePrice + (Math.random() * 10 - 5);
    const volume = 1000000 + Math.random() * 500000;
    const volatility = Math.random() * 15; // 0-15%
    
    return {
      price,
      volume,
      volatility,
      timestamp: now
    };
  }
  
  /**
   * Get wallet balance
   */
  private async getBalance(): Promise<number> {
    try {
      return await this.wallet.getBalance(this.sessionToken);
    } catch (error) {
      console.error(`[${this.agentId}] Failed to get balance:`, error);
      return 0;
    }
  }
  
  /**
   * Make autonomous decision based on market conditions and wallet state
   */
  async makeDecision(): Promise<Decision> {
    this.cycleCount++;
    
    try {
      // 1. Observe - gather data
      const balance = await this.getBalance();
      const marketData = await this.getMarketData();
      
      // Log observation for dashboard
      console.log(`\n🤔 [${this.agentId}] Cycle ${this.cycleCount}: Analyzing...`);
      console.log(`   Balance: ${balance.toFixed(4)} SOL`);
      console.log(`   Market: $${marketData.price.toFixed(2)} @ ${marketData.volatility.toFixed(2)}% vol`);
      
      // 2. Think - apply decision logic
      
      // Rule 1: If balance is too low, request airdrop (for devnet testing)
      if (balance < 0.05) {
        return {
          shouldAct: true,
          action: {
            type: 'AIRDROP',
            params: { amount: 0.5 }
          },
          reason: `Balance critically low (${balance.toFixed(4)} SOL), requesting funds`,
          confidence: 1.0
        };
      }
      
      // Rule 2: High volatility - rebalance to safety
      if (marketData.volatility > 12) {
        return {
          shouldAct: true,
          action: {
            type: 'REBALANCE',
            params: { 
              action: 'REDUCE_EXPOSURE',
              reason: 'High volatility detected'
            }
          },
          reason: `High volatility (${marketData.volatility.toFixed(2)}%), reducing exposure`,
          confidence: 0.85
        };
      }
      
      // Rule 3: Low price - simulate buying opportunity
      if (marketData.price < 145) {
        const amount = Math.min(0.05, balance * 0.1); // Use 10% of balance, max 0.05 SOL
        
        return {
          shouldAct: true,
          action: {
            type: 'SIMULATE_TRADE',
            params: { 
              amount,
              side: 'BUY',
              price: marketData.price
            }
          },
          reason: `Price $${marketData.price.toFixed(2)} below threshold, simulating buy`,
          confidence: 0.75
        };
      }
      
      // Rule 4: Time-based action - check and report every 3 cycles
      if (this.cycleCount % 3 === 0) {
        return {
          shouldAct: true,
          action: {
            type: 'CHECK_BALANCE',
            params: { 
              balance,
              marketData: {
                price: marketData.price,
                volatility: marketData.volatility
              }
            }
          },
          reason: 'Routine status check and reporting',
          confidence: 0.9
        };
      }
      
      // Rule 5: Small test transaction occasionally (only if balance > 0.1)
      if (balance > 0.1 && Math.random() < 0.3) { // 30% chance
        // Get address for self-transfer (test)
        const address = this.wallet.getAddress(this.sessionToken);
        
        return {
          shouldAct: true,
          action: {
            type: 'TRANSFER',
            params: { 
              amount: 0.001, // Very small amount for testing
              to: address // Send to self (test)
            }
          },
          reason: 'Testing transaction signing capability',
          confidence: 0.6
        };
      }
      
      // Default: no action
      return {
        shouldAct: false,
        reason: `Market stable ($${marketData.price.toFixed(2)}), balance ${balance.toFixed(4)} SOL`,
        confidence: 0.95
      };
      
    } catch (error) {
      console.error(`[${this.agentId}] Decision error:`, error);
      return {
        shouldAct: false,
        reason: `Error in decision making: ${error}`,
        confidence: 0
      };
    }
  }
  
  /**
   * Execute the decided action
   */
  async executeDecision(decision: Decision): Promise<any> {
    if (!decision.shouldAct || !decision.action) {
      return { 
        executed: false, 
        reason: decision.reason,
        agentId: this.agentId 
      };
    }
    
    const action = decision.action;
    let result;
    let startTime = Date.now();
    
    console.log(`⚡ [${this.agentId}] Executing: ${action.type} - ${decision.reason}`);
    
    try {
      switch (action.type) {
        case 'TRANSFER':
          result = await this.wallet.transferSol(
            action.params.to,
            action.params.amount,
            this.sessionToken
          );
          console.log(`✅ [${this.agentId}] Transfer complete: ${result.substring(0, 20)}...`);
          break;
          
        case 'CHECK_BALANCE':
          const balance = await this.wallet.getBalance(this.sessionToken);
          const address = this.wallet.getAddress(this.sessionToken);
          result = { 
            balance, 
            address,
            timestamp: new Date().toISOString(),
            cycle: this.cycleCount
          };
          console.log(`📊 [${this.agentId}] Balance: ${balance} SOL`);
          break;
          
        case 'REBALANCE':
          // Simulated rebalancing - in real agent would move funds
          console.log(`🔄 [${this.agentId}] Simulating rebalance: ${action.params.reason}`);
          result = { 
            simulated: true, 
            action: action.params.action,
            timestamp: new Date().toISOString()
          };
          break;
          
        case 'SIMULATE_TRADE':
          console.log(`📈 [${this.agentId}] Simulated ${action.params.side} order: ${action.params.amount} SOL @ $${action.params.price}`);
          result = {
            simulated: true,
            type: action.params.side,
            amount: action.params.amount,
            price: action.params.price,
            timestamp: new Date().toISOString()
          };
          break;
          
        case 'AIRDROP':
          console.log(`💧 [${this.agentId}] Requesting airdrop...`);
          const sig = await this.wallet.requestAirdrop(this.sessionToken, action.params.amount);
          result = {
            signature: sig,
            amount: action.params.amount,
            timestamp: new Date().toISOString()
          };
          console.log(`✅ [${this.agentId}] Airdrop complete: ${sig.substring(0, 20)}...`);
          break;
      }
      
      // Record success
      const executionTime = Date.now() - startTime;
      const historyEntry: ActionHistoryEntry = {
        timestamp: new Date().toISOString(),
        cycle: this.cycleCount,
        decision,
        result,
        executionTime
      };
      
      this.actionHistory.push(historyEntry);
      this.lastActionTime = Date.now();
      
      // FIXED: Return without spread operator
      return {
        executed: true,
        executionTime: executionTime,
        agentId: this.agentId,
        result: result,
        decision: {
          type: action.type,
          reason: decision.reason
        }
      };
      
    } catch (error) {
      console.error(`❌ [${this.agentId}] Execution failed:`, error);
      
      // Record failure
      const historyEntry: ActionHistoryEntry = {
        timestamp: new Date().toISOString(),
        cycle: this.cycleCount,
        decision,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
      
      this.actionHistory.push(historyEntry);
      
      // FIXED: Return without spread operator
      return {
        executed: false,
        executionTime: Date.now() - startTime,
        agentId: this.agentId,
        error: error instanceof Error ? error.message : String(error),
        decision: {
          type: action.type,
          reason: decision.reason
        }
      };
    }
  }
  
  /**
   * Run one complete cycle: decide and act
   */
  async runCycle(): Promise<{ decision: Decision; result: any }> {
    console.log(`\n🔄 [${this.agentId}] Starting cycle ${this.cycleCount + 1}`);
    
    const decision = await this.makeDecision();
    console.log(`💭 [${this.agentId}] Decision: ${decision.reason} (confidence: ${decision.confidence})`);
    
    let result = null;
    if (decision.shouldAct) {
      result = await this.executeDecision(decision);
    } else {
      console.log(`😴 [${this.agentId}] No action needed`);
    }
    
    return { decision, result };
  }
  
  /**
   * Get action history
   */
  getHistory(): ActionHistoryEntry[] {
    return this.actionHistory;
  }
  
  /**
   * Get agent status
   */
  getStatus(): { 
    agentId: string; 
    cycleCount: number; 
    lastActionTime: string | null; 
    actionCount: number; 
    lastAction: ActionHistoryEntry | null 
  } {
    return {
      agentId: this.agentId,
      cycleCount: this.cycleCount,
      lastActionTime: this.lastActionTime ? new Date(this.lastActionTime).toISOString() : null,
      actionCount: this.actionHistory.length,
      lastAction: this.actionHistory[this.actionHistory.length - 1] || null
    };
  }
  
  /**
   * Reset the agent
   */
  reset(): void {
    this.cycleCount = 0;
    this.actionHistory = [];
    this.lastActionTime = 0;
    console.log(`🔄 [${this.agentId}] Reset complete`);
  }
}