const { AgentOrchestrator } = require('../dist/agent/agent-orchestrator');
const path = require('path');

// Cache orchestrator instance (Vercel serverless)
let orchestrator = null;
let lastInit = null;

async function getOrchestrator() {
  // Re-initialize every 5 minutes (Vercel cold starts)
  if (!orchestrator || !lastInit || Date.now() - lastInit > 300000) {
    console.log('🔄 Initializing orchestrator...');
    const masterPassword = process.env.MASTER_PASSWORD || 'MasterPassword123!';
    
    // Use /tmp for writable storage on Vercel
    const walletDir = process.env.VERCEL ? '/tmp/wallets' : './wallets';
    
    orchestrator = new AgentOrchestrator(masterPassword, walletDir);
    await orchestrator.initializeMasterWallet(masterPassword);
    
    // Create some default agents if none exist
    const agents = orchestrator.getAllAgents();
    if (agents.length === 0) {
      console.log('🤖 Creating default agents...');
      try {
        await orchestrator.createAgent('trader-1', 0.1);
        await orchestrator.createAgent('trader-2', 0.1);
        await orchestrator.createAgent('analyzer-1', 0.1);
      } catch (e) {
        console.log('⚠️ Agents may already exist:', e.message);
      }
    }
    
    lastInit = Date.now();
    console.log(`✅ Orchestrator ready with ${orchestrator.getAllAgents().length} agents`);
  }
  return orchestrator;
}

module.exports = async (req, res) => {
  // Enable CORS for all routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const orchestrator = await getOrchestrator();

    // GET - Fetch all agents
    if (req.method === 'GET') {
      console.log('📊 GET /api/agents');
      const agents = orchestrator.getAllAgents().map(agent => {
        try {
          return {
            id: agent.id,
            status: agent.status,
            balance: agent.metrics?.totalBalance || 0,
            actions: agent.metrics?.actionsTaken || 0,
            successfulActions: agent.metrics?.successfulActions || 0,
            failedActions: agent.metrics?.failedActions || 0,
            successRate: agent.metrics?.actionsTaken > 0 
              ? (agent.metrics.successfulActions / agent.metrics.actionsTaken) * 100 
              : 0,
            lastActivity: agent.lastActivity || new Date(),
            address: agent.wallet?.getAddress(agent.sessionToken) || '',
            history: (agent.brain?.getHistory() || []).slice(-5).map(h => ({
              timestamp: h.timestamp,
              decision: h.decision,
              result: h.result,
              error: h.error
            }))
          };
        } catch (e) {
          return {
            id: agent.id,
            status: 'ERROR',
            balance: 0,
            actions: 0,
            successRate: 0,
            lastActivity: new Date(),
            history: []
          };
        }
      });
      
      res.status(200).json({ 
        success: true, 
        agents,
        timestamp: new Date().toISOString(),
        network: 'solana-devnet'
      });
    }
    
    // POST - Execute commands
    else if (req.method === 'POST') {
      const { command, agentId, amount } = req.body;
      console.log(`📝 POST /api/agents - Command: ${command}`, { agentId, amount });

      switch (command) {
        case 'create-agent':
          if (!agentId) {
            return res.status(400).json({ error: 'agentId required' });
          }
          await orchestrator.createAgent(agentId, amount || 0.1);
          res.status(200).json({ 
            success: true, 
            message: `Agent ${agentId} created`,
            agentId 
          });
          break;
          
        case 'run-cycle':
          // Run one cycle for all agents
          await orchestrator.runAllAgents(1, 0);
          res.status(200).json({ 
            success: true, 
            message: 'Cycle completed',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'run-multiple-cycles':
          const cycles = amount || 3;
          await orchestrator.runAllAgents(cycles, 2000);
          res.status(200).json({ 
            success: true, 
            message: `${cycles} cycles completed` 
          });
          break;
          
        case 'stop-agent':
          if (!agentId) {
            return res.status(400).json({ error: 'agentId required' });
          }
          await orchestrator.removeAgent(agentId);
          res.status(200).json({ 
            success: true, 
            message: `Agent ${agentId} stopped` 
          });
          break;
          
        case 'fund-agent':
          if (!agentId || !amount) {
            return res.status(400).json({ error: 'agentId and amount required' });
          }
          // Get master wallet session
          const masterSession = orchestrator['masterSession'];
          const agent = orchestrator.getAgent(agentId);
          if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
          }
          const address = agent.wallet.getAddress(agent.sessionToken);
          const sig = await orchestrator['masterWallet'].transferSol(
            address,
            amount,
            masterSession
          );
          res.status(200).json({ 
            success: true, 
            message: `Funded ${agentId} with ${amount} SOL`,
            signature: sig
          });
          break;
          
        default:
          res.status(400).json({ error: 'Unknown command' });
      }
    }
    
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};