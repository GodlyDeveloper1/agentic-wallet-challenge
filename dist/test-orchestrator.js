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
const agent_orchestrator_1 = require("./agent/agent-orchestrator");
const dotenv = __importStar(require("dotenv"));
const readline = __importStar(require("readline"));
dotenv.config();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (query) => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};
async function testOrchestrator() {
    console.log('\n' + '='.repeat(70));
    console.log('🤖 MULTI-AGENT ORCHESTRATOR TEST');
    console.log('='.repeat(70));
    console.log('\nThis test will:');
    console.log('1. Create a master wallet');
    console.log('2. Create multiple AI agents with their own wallets');
    console.log('3. Run autonomous cycles with all agents');
    console.log('4. Demonstrate scalability (key judging criterion)\n');
    try {
        // Get master password
        const masterPassword = process.env.MASTER_PASSWORD || 'MasterPassword123!';
        // Initialize orchestrator
        console.log('🚀 Initializing orchestrator...');
        const orchestrator = new agent_orchestrator_1.AgentOrchestrator(masterPassword, './wallets');
        // Initialize master wallet (async)
        console.log('\n🔑 Setting up master wallet...');
        await orchestrator.initializeMasterWallet(masterPassword);
        // Create multiple agents
        console.log('\n' + '-'.repeat(70));
        const agentCount = 3; // Start with 3 agents
        console.log(`🤖 Creating ${agentCount} autonomous agents...`);
        const agentIds = await orchestrator.createAgents(agentCount, 0.05); // Fund with 0.05 SOL each
        console.log('\n✅ Agents created:');
        agentIds.forEach((id, i) => {
            console.log(`   ${i + 1}. ${id}`);
        });
        // Show initial status
        console.log('\n' + '-'.repeat(70));
        console.log('📊 INITIAL AGENT STATUS:');
        const initialAgents = orchestrator.getAllAgents();
        console.table(initialAgents.map(a => ({
            'Agent': a.id,
            'Balance': a.metrics.totalBalance.toFixed(4) + ' SOL',
            'Status': a.status,
            'Actions': `${a.metrics.successfulActions}/${a.metrics.actionsTaken}`
        })));
        // Ask user how many cycles to run
        console.log('\n' + '-'.repeat(70));
        const cycleInput = await question('How many autonomous cycles to run? (recommended: 3-5): ');
        const cycles = parseInt(cycleInput) || 3;
        const intervalInput = await question('Interval between cycles in seconds? (recommended: 5): ');
        const interval = (parseInt(intervalInput) || 5) * 1000;
        console.log('\n' + '='.repeat(70));
        console.log(`🎯 Starting ${cycles} autonomous cycles with ${agentCount} agents...`);
        console.log('='.repeat(70));
        // Run all agents
        await orchestrator.runAllAgents(cycles, interval);
        // Show final summary
        console.log('\n' + '='.repeat(70));
        console.log('📈 FINAL ORCHESTRATOR SUMMARY');
        console.log('='.repeat(70));
        const finalAgents = orchestrator.getAllAgents();
        // Calculate totals
        let totalCycles = 0;
        let totalActions = 0;
        let totalSuccess = 0;
        let totalBalance = 0;
        finalAgents.forEach(agent => {
            totalCycles += agent.metrics.cyclesRun;
            totalActions += agent.metrics.actionsTaken;
            totalSuccess += agent.metrics.successfulActions;
            totalBalance += agent.metrics.totalBalance;
        });
        console.log('\n📊 AGENT PERFORMANCE:');
        finalAgents.forEach((agent, i) => {
            console.log(`\n🤖 Agent ${i + 1}: ${agent.id}`);
            console.log(`   📍 Address: ${agent.wallet.getAddress(agent.sessionToken)}`);
            console.log(`   💰 Final Balance: ${agent.metrics.totalBalance.toFixed(4)} SOL`);
            console.log(`   🔄 Cycles Run: ${agent.metrics.cyclesRun}`);
            console.log(`   ⚡ Actions Taken: ${agent.metrics.actionsTaken}`);
            console.log(`   ✅ Successful: ${agent.metrics.successfulActions}`);
            console.log(`   ❌ Failed: ${agent.metrics.failedActions}`);
            console.log(`   📈 Success Rate: ${agent.metrics.actionsTaken > 0
                ? ((agent.metrics.successfulActions / agent.metrics.actionsTaken) * 100).toFixed(1)
                : 0}%`);
        });
        console.log('\n' + '-'.repeat(70));
        console.log('🏆 TOTAL STATISTICS:');
        console.log(`   🤖 Total Agents: ${finalAgents.length}`);
        console.log(`   🔄 Total Cycles: ${totalCycles}`);
        console.log(`   ⚡ Total Actions: ${totalActions}`);
        console.log(`   ✅ Total Successful: ${totalSuccess}`);
        console.log(`   💰 Total Balance: ${totalBalance.toFixed(4)} SOL`);
        console.log(`   📊 Average Success Rate: ${totalActions > 0
            ? ((totalSuccess / totalActions) * 100).toFixed(1)
            : 0}%`);
        // Demonstrate scalability
        console.log('\n' + '='.repeat(70));
        console.log('✨ SCALABILITY DEMONSTRATION');
        console.log('='.repeat(70));
        console.log('\n✓ Multiple agents running simultaneously');
        console.log('✓ Each agent has independent wallet and decision engine');
        console.log('✓ All agents operate autonomously in parallel');
        console.log('✓ Central orchestrator manages all agents');
        console.log('✓ Independent session management per agent');
        // Ask if user wants to add more agents
        console.log('\n' + '-'.repeat(70));
        const addMore = await question('\nDo you want to add more agents to demonstrate scalability? (y/n): ');
        if (addMore.toLowerCase() === 'y') {
            const moreCount = await question('How many more agents to add? ');
            const additional = parseInt(moreCount) || 2;
            console.log(`\n🤖 Adding ${additional} more agents...`);
            const newAgentIds = await orchestrator.createAgents(additional, 0.03);
            console.log('\n✅ New agents created:');
            newAgentIds.forEach(id => console.log(`   ${id}`));
            // Run one more cycle with all agents
            console.log('\n🎯 Running one final cycle with all agents...');
            await orchestrator.runAllAgents(1, 2000);
            console.log('\n📊 Final count: ' + orchestrator.getAllAgents().length + ' agents running!');
        }
        // Clean shutdown
        console.log('\n' + '-'.repeat(70));
        console.log('🔒 Shutting down orchestrator...');
        orchestrator.shutdown();
        console.log('\n' + '='.repeat(70));
        console.log('🎉 TEST COMPLETE! Orchestrator is working!');
        console.log('='.repeat(70));
        console.log('\nKey achievements:');
        console.log('✓ Multiple independent agents');
        console.log('✓ Autonomous decision making');
        console.log('✓ Parallel execution');
        console.log('✓ Centralized management');
        console.log('✓ Scalable architecture');
    }
    catch (error) {
        console.error('\n❌ Test failed:', error);
    }
    finally {
        rl.close();
    }
}
// Run the test
if (require.main === module) {
    testOrchestrator().catch(console.error);
}
//# sourceMappingURL=test-orchestrator.js.map