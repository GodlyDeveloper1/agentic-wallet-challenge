import { AgenticWallet } from '../core/agentic-wallet';
export interface Decision {
    shouldAct: boolean;
    action?: {
        type: 'TRANSFER' | 'CHECK_BALANCE' | 'REBALANCE' | 'SIMULATE_TRADE' | 'AIRDROP';
        params: any;
    };
    reason: string;
    confidence: number;
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
export declare class DecisionEngine {
    private wallet;
    private sessionToken;
    private lastActionTime;
    private actionHistory;
    private agentId;
    private cycleCount;
    constructor(wallet: AgenticWallet, sessionToken: string, agentId?: string);
    /**
     * Simulate market data (in real AI, this would come from oracles/APIs)
     */
    private getMarketData;
    /**
     * Get wallet balance
     */
    private getBalance;
    /**
     * Make autonomous decision based on market conditions and wallet state
     */
    makeDecision(): Promise<Decision>;
    /**
     * Execute the decided action
     */
    executeDecision(decision: Decision): Promise<any>;
    /**
     * Run one complete cycle: decide and act
     */
    runCycle(): Promise<{
        decision: Decision;
        result: any;
    }>;
    /**
     * Get action history
     */
    getHistory(): ActionHistoryEntry[];
    /**
     * Get agent status
     */
    getStatus(): {
        agentId: string;
        cycleCount: number;
        lastActionTime: string | null;
        actionCount: number;
        lastAction: ActionHistoryEntry | null;
    };
    /**
     * Reset the agent
     */
    reset(): void;
}
//# sourceMappingURL=decision-engine.d.ts.map