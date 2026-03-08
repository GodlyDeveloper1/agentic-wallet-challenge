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
exports.testAgent = testAgent;
const agentic_wallet_1 = require("./core/agentic-wallet");
const decision_engine_1 = require("./agent/decision-engine");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function testAgent() {
    console.log('🤖 Testing AI Decision Engine...\n');
    console.log('='.repeat(60));
    // Create wallet instance
    const wallet = new agentic_wallet_1.AgenticWallet(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', './wallets');
    const walletName = 'test-agent-' + Date.now();
    const password = 'TestPassword123!';
    try {
        // Step 1: Create wallet
        console.log('📝 Step 1: Creating agent wallet...');
        const { address } = await wallet.createWallet(walletName, password);
        console.log(`   ✅ Wallet created: ${address}`);
        // Step 2: Unlock wallet
        console.log('\n🔓 Step 2: Unlocking wallet...');
        const token = wallet.unlock(walletName, password, 1); // 1 hour session
        console.log(`   ✅ Session token: ${token.substring(0, 20)}...`);
        // Step 3: Request airdrop for testing
        console.log('\n💧 Step 3: Requesting devnet airdrop...');
        try {
            const sig = await wallet.requestAirdrop(token, 1);
            console.log(`   ✅ Airdrop received! Signature: ${sig.substring(0, 20)}...`);
        }
        catch (error) {
            console.log('   ⚠️ Airdrop failed (might be rate limited), continuing with 0 balance');
        }
        // Step 4: Check initial balance
        console.log('\n💰 Step 4: Checking initial balance...');
        const initialBalance = await wallet.getBalance(token);
        console.log(`   ✅ Balance: ${initialBalance} SOL`);
        // Step 5: Create agent
        console.log('\n🧠 Step 5: Initializing AI decision engine...');
        const agent = new decision_engine_1.DecisionEngine(wallet, token, 'test-agent-1');
        console.log(`   ✅ Agent created with ID: test-agent-1`);
        // Step 6: Run decision cycles
        console.log('\n🔄 Step 6: Running autonomous decision cycles...\n');
        for (let i = 0; i < 5; i++) {
            console.log(`\n📊 CYCLE ${i + 1}/5`);
            console.log('-'.repeat(40));
            const { decision, result } = await agent.runCycle();
            console.log(`\n📋 Cycle Summary:`);
            console.log(`   Decision: ${decision.reason}`);
            console.log(`   Confidence: ${decision.confidence * 100}%`);
            if (decision.shouldAct) {
                console.log(`   Action Type: ${decision.action?.type}`);
                if (result) {
                    console.log(`   Result: ✅ Success`);
                    if (result.signature) {
                        console.log(`   Signature: ${result.signature.substring(0, 20)}...`);
                    }
                }
            }
            else {
                console.log(`   Action: 😴 None needed`);
            }
            // Wait between cycles
            if (i < 4) {
                console.log('\n⏳ Waiting 3 seconds before next cycle...');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        // Step 7: Show history
        console.log('\n' + '='.repeat(60));
        console.log('📊 Step 7: Agent Action History');
        console.log('='.repeat(60));
        const history = agent.getHistory();
        if (history.length === 0) {
            console.log('No actions recorded yet.');
        }
        else {
            history.forEach((entry, index) => {
                console.log(`\n${index + 1}. ${entry.timestamp}`);
                console.log(`   Cycle: ${entry.cycle}`);
                console.log(`   Decision: ${entry.decision.reason}`);
                if (entry.result) {
                    console.log(`   Result: ✅ Success (${entry.executionTime}ms)`);
                    if (entry.result.balance) {
                        console.log(`   Balance: ${entry.result.balance} SOL`);
                    }
                }
                if (entry.error) {
                    console.log(`   Error: ❌ ${entry.error}`);
                }
            });
        }
        // Step 8: Show final status
        console.log('\n' + '='.repeat(60));
        console.log('📈 Step 8: Final Agent Status');
        console.log('='.repeat(60));
        const status = agent.getStatus();
        console.log(`   Agent ID: ${status.agentId}`);
        console.log(`   Cycles Run: ${status.cycleCount}`);
        console.log(`   Actions Taken: ${status.actionCount}`);
        console.log(`   Last Action: ${status.lastActionTime || 'Never'}`);
        // Step 9: Clean up
        console.log('\n🔒 Step 9: Cleaning up...');
        wallet.lock(token);
        console.log('   ✅ Wallet locked');
        // Optional: Delete test wallet
        try {
            await wallet.deleteWallet(walletName, password);
            console.log('   ✅ Test wallet deleted');
        }
        catch (error) {
            console.log('   ⚠️ Could not delete wallet (might not exist)');
        }
        console.log('\n' + '='.repeat(60));
        console.log('🎉 TEST COMPLETE! Agentic wallet and AI decision engine are working!');
        console.log('='.repeat(60));
    }
    catch (error) {
        console.error('\n❌ Test failed:', error);
        // Clean up on error
        try {
            const token = wallet.unlock(walletName, password, 1);
            wallet.lock(token);
        }
        catch (e) {
            // Ignore cleanup errors
        }
    }
}
// Run the test
if (require.main === module) {
    testAgent().catch(console.error);
}
//# sourceMappingURL=test-agent.js.map