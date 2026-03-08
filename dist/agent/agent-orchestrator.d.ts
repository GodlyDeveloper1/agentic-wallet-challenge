import { AgenticWallet } from '../core/agentic-wallet';
import { DecisionEngine } from './decision-engine';
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
export declare class AgentOrchestrator {
    private agents;
    private masterWallet;
    private masterSession;
    private walletDir;
    constructor(masterWalletPassword: string, walletDir?: string);
    /**
     * Initialize master wallet synchronously for constructor
     */
    private initializeMasterWalletSync;
    /**
     * Initialize master wallet asynchronously (call this after construction)
     */
    initializeMasterWallet(password: string): Promise<void>;
    /**
     * Create a new agent with its own wallet
     */
    createAgent(agentId: string, initialFunding?: number, agentPassword?: string): Promise<ManagedAgent>;
    /**
     * Run a single agent cycle
     */
    runAgentCycle(agentId: string): Promise<void>;
    /**
     * Run all agents in parallel
     */
    runAllAgents(cycles?: number, intervalMs?: number): Promise<void>;
    /**
     * Print status table
     */
    private printStatusTable;
    /**
     * Print summary
     */
    private printSummary;
    /**
     * Create multiple agents at once
     */
    createAgents(count: number, baseFunding?: number): Promise<string[]>;
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): ManagedAgent | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): ManagedAgent[];
    /**
     * Stop and remove an agent
     */
    removeAgent(agentId: string): Promise<boolean>;
    /**
     * Shutdown orchestrator
     */
    shutdown(): void;
}
//# sourceMappingURL=agent-orchestrator.d.ts.map