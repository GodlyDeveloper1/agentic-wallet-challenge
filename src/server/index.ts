import express from 'express';
import cors from 'cors';
import { AgentOrchestrator } from '../agent/agent-orchestrator';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize orchestrator
let orchestrator: AgentOrchestrator;

async function initializeServer() {
  const masterPassword = process.env.MASTER_PASSWORD || 'MasterPassword123!';
  orchestrator = new AgentOrchestrator(masterPassword, './wallets');
  await orchestrator.initializeMasterWallet(masterPassword);
  
  console.log('✅ Orchestrator initialized');
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    network: 'solana-devnet'
  });
});

app.get('/api/agents', (req, res) => {
  try {
    const agents = orchestrator.getAllAgents().map(agent => ({
      id: agent.id,
      status: agent.status,
      balance: agent.metrics.totalBalance,
      actions: agent.metrics.actionsTaken,
      successfulActions: agent.metrics.successfulActions,
      failedActions: agent.metrics.failedActions,
      successRate: agent.metrics.actionsTaken > 0 
        ? (agent.metrics.successfulActions / agent.metrics.actionsTaken) * 100 
        : 0,
      lastActivity: agent.lastActivity,
      address: agent.wallet.getAddress(agent.sessionToken),
      history: agent.brain.getHistory().slice(-5)
    }));
    
    res.json({ agents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents', async (req, res) => {
  try {
    const { command, agentId, amount } = req.body;
    
    switch (command) {
      case 'create-agent':
        await orchestrator.createAgent(agentId, amount || 0.1);
        res.json({ success: true, message: `Agent ${agentId} created` });
        break;
        
      case 'run-cycle':
        await orchestrator.runAllAgents(1, 0);
        res.json({ success: true, message: 'Cycle completed' });
        break;
        
      case 'stop-agent':
        await orchestrator.removeAgent(agentId);
        res.json({ success: true, message: `Agent ${agentId} stopped` });
        break;
        
      default:
        res.status(400).json({ error: 'Unknown command' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}).catch(console.error);