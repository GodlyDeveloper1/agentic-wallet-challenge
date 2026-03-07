module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const packageJson = require('../package.json');
    
    res.status(200).json({
      success: true,
      status: 'online',
      name: 'Agentic Wallet API',
      version: packageJson.version,
      network: 'solana-devnet',
      timestamp: new Date().toISOString(),
      features: [
        'multi-agent orchestration',
        'autonomous decision making',
        'solana devnet integration',
        'real-time monitoring'
      ],
      endpoints: {
        'GET /api/agents': 'List all agents',
        'POST /api/agents': 'Execute commands (create-agent, run-cycle, stop-agent)',
        'GET /api/status': 'This status endpoint'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};