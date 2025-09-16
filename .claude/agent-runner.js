#!/usr/bin/env node

/**
 * N0DE Multi-Agent Runner - Coordination System
 * Orchestrates the 5 specialized agents for parallel development
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { spawn, execSync } = require('child_process');

class AgentCoordinator {
  constructor() {
    this.agents = new Map();
    this.sharedState = {
      activeTask: null,
      taskQueue: [],
      agentStatus: {},
      performanceMetrics: {},
      lastUpdate: Date.now()
    };
    this.loadAgentConfigurations();
  }

  // Load all agent configurations
  loadAgentConfigurations() {
    console.log('🤖 Loading N0DE Agent Configurations...');
    
    const agentDir = path.join(__dirname, 'agents');
    const agentFiles = fs.readdirSync(agentDir).filter(file => file.endsWith('.yaml'));
    
    agentFiles.forEach(file => {
      try {
        const configPath = path.join(agentDir, file);
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        this.agents.set(config.name, config);
        this.sharedState.agentStatus[config.name] = 'idle';
        console.log(`  ✅ Loaded ${config.name}: ${config.description}`);
      } catch (error) {
        console.error(`  ❌ Failed to load ${file}:`, error.message);
      }
    });
    
    console.log(`\n📊 Total agents loaded: ${this.agents.size}`);
    this.displayAgentMatrix();
  }

  // Display agent specialization matrix
  displayAgentMatrix() {
    console.log('\n🎯 Agent Specialization Matrix:');
    console.log('━'.repeat(80));
    
    this.agents.forEach((config, name) => {
      const domains = config.expertise?.slice(0, 3).join(', ') || 'General';
      console.log(`  ${name.padEnd(20)} │ ${domains}`);
    });
    
    console.log('━'.repeat(80));
  }

  // Route tasks to appropriate agents based on content analysis
  routeTask(task, fileContext = []) {
    console.log(`\n🎯 Routing Task: "${task.description}"`);
    console.log(`📁 File Context: ${fileContext.length} files`);
    
    const routingScores = new Map();
    
    // Initialize scores
    this.agents.forEach((config, name) => {
      routingScores.set(name, 0);
    });
    
    // Score based on task description keywords
    const taskText = task.description.toLowerCase();
    
    this.agents.forEach((config, name) => {
      let score = 0;
      
      // Check domain keywords
      if (config.domains) {
        config.domains.forEach(domain => {
          if (taskText.includes(domain.toLowerCase())) {
            score += 10;
          }
        });
      }
      
      // Check expertise keywords
      if (config.expertise) {
        config.expertise.forEach(skill => {
          const skillWords = skill.toLowerCase().split(' ');
          skillWords.forEach(word => {
            if (taskText.includes(word)) {
              score += 5;
            }
          });
        });
      }
      
      // Check file patterns
      if (config.file_patterns) {
        fileContext.forEach(file => {
          config.file_patterns.forEach(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            if (regex.test(file)) {
              score += 8;
            }
          });
        });
      }
      
      routingScores.set(name, score);
    });
    
    // Find best match
    const bestMatch = Array.from(routingScores.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    console.log('\n📊 Routing Scores:');
    routingScores.forEach((score, name) => {
      const indicator = name === bestMatch[0] ? '👑' : '  ';
      console.log(`  ${indicator} ${name.padEnd(20)}: ${score} points`);
    });
    
    const selectedAgent = bestMatch[0];
    const confidence = bestMatch[1] > 0 ? 'High' : 'Low';
    
    console.log(`\n🎯 Selected Agent: ${selectedAgent} (Confidence: ${confidence})`);
    
    return {
      agent: selectedAgent,
      confidence,
      score: bestMatch[1],
      alternates: Array.from(routingScores.entries())
        .filter(([name]) => name !== selectedAgent)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
    };
  }

  // Execute task with selected agent
  async executeTask(task, routing) {
    const agentConfig = this.agents.get(routing.agent);
    
    console.log(`\n🚀 Executing Task with ${routing.agent.toUpperCase()}`);
    console.log(`📋 Task: ${task.description}`);
    console.log(`🎯 Agent Context: ${agentConfig.description}`);
    
    // Update agent status
    this.sharedState.agentStatus[routing.agent] = 'working';
    this.sharedState.activeTask = {
      description: task.description,
      agent: routing.agent,
      startTime: Date.now()
    };
    
    try {
      // Create agent-specific prompt with context
      const agentPrompt = this.createAgentPrompt(task, agentConfig);
      
      console.log('\n📝 Agent Prompt Created:');
      console.log(`"${agentPrompt.substring(0, 150)}..."`);
      
      // TODO: Execute with Claude CLI
      console.log('\n⚡ Executing with Claude CLI...');
      console.log('💡 In a real implementation, this would call:');
      console.log(`   claude --agent=${routing.agent} "${agentPrompt}"`);
      
      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Task execution completed');
      
      // Update status
      this.sharedState.agentStatus[routing.agent] = 'idle';
      this.sharedState.activeTask = null;
      
      return { success: true, agent: routing.agent };
      
    } catch (error) {
      console.error(`❌ Task execution failed:`, error.message);
      this.sharedState.agentStatus[routing.agent] = 'error';
      return { success: false, error: error.message };
    }
  }

  // Create agent-specific prompt with context
  createAgentPrompt(task, agentConfig) {
    return `
You are the ${agentConfig.name} for the N0DE platform.

AGENT CONTEXT:
${agentConfig.context || 'N0DE is Europe\'s fastest Solana RPC infrastructure'}

YOUR EXPERTISE:
${agentConfig.expertise?.slice(0, 5).join(', ') || 'General development'}

YOUR RESPONSIBILITIES:
${agentConfig.primary_responsibilities?.slice(0, 5).join(', ') || 'General development tasks'}

TASK:
${task.description}

ADDITIONAL CONTEXT:
${task.context || 'No additional context provided'}

Please complete this task according to your specialization and the N0DE platform requirements.
Focus on your domain expertise and coordinate with other agents if needed.
    `.trim();
  }

  // Run multiple agents in parallel
  async runParallelTasks(tasks) {
    console.log(`\n🎭 Running ${tasks.length} tasks in parallel...`);
    
    const taskPromises = tasks.map(async (task, index) => {
      console.log(`\nTask ${index + 1}: ${task.description}`);
      const routing = this.routeTask(task, task.files || []);
      return this.executeTask(task, routing);
    });
    
    const results = await Promise.all(taskPromises);
    
    console.log('\n📊 Parallel Execution Results:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} Task ${index + 1}: ${result.success ? 'Success' : 'Failed'} (${result.agent})`);
    });
    
    return results;
  }

  // Monitor agent health and performance
  monitorAgents() {
    console.log('\n💊 Agent Health Monitor:');
    console.log('━'.repeat(60));
    
    this.agents.forEach((config, name) => {
      const status = this.sharedState.agentStatus[name];
      const statusIcon = {
        'idle': '💤',
        'working': '⚡',
        'error': '❌'
      }[status] || '❓';
      
      console.log(`  ${statusIcon} ${name.padEnd(20)} │ ${status.toUpperCase()}`);
    });
    
    if (this.sharedState.activeTask) {
      const duration = Math.round((Date.now() - this.sharedState.activeTask.startTime) / 1000);
      console.log(`\n🎯 Active Task: ${this.sharedState.activeTask.description}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🤖 Agent: ${this.sharedState.activeTask.agent}`);
    }
  }

  // Display agent coordination help
  displayHelp() {
    console.log('\n🤖 N0DE Multi-Agent Runner Commands:');
    console.log('━'.repeat(60));
    console.log('  node agent-runner.js route "task description"     - Route single task');
    console.log('  node agent-runner.js parallel tasks.json         - Run parallel tasks');
    console.log('  node agent-runner.js monitor                     - Monitor agent health');
    console.log('  node agent-runner.js test                        - Run test scenarios');
    console.log('  node agent-runner.js status                      - Show system status');
    console.log('  node agent-runner.js help                        - Show this help');
    console.log('\n📖 Example Task JSON:');
    console.log(`  [
    {
      "description": "Optimize payment flow UX",
      "context": "Users need to auth before seeing pricing",
      "files": ["frontend/pricing.tsx", "src/billing/controller.ts"]
    }
  ]`);
  }

  // Run test scenarios
  async runTestScenarios() {
    console.log('\n🧪 Running N0DE Multi-Agent Test Scenarios...');
    
    const testTasks = [
      {
        description: "Fix authentication flow for billing access",
        context: "Users can't access billing dashboard after Google OAuth",
        files: ["src/auth/auth.service.ts", "frontend/src/contexts/AuthContext.tsx"]
      },
      {
        description: "Optimize payment conversion rates",
        context: "Current pricing page has high bounce rate",
        files: ["frontend/src/components/PricingSection.tsx"]
      },
      {
        description: "Improve API response times to under 50ms",
        context: "Billing endpoints are slow and affecting UX",
        files: ["src/billing/billing.controller.ts", "src/billing/billing-sync.service.ts"]
      },
      {
        description: "Set up performance monitoring for 9ms latency target",
        context: "Need real-time monitoring for enterprise SLA",
        files: ["src/monitoring/", ".github/workflows/"]
      },
      {
        description: "Conduct security audit of OAuth implementation",
        context: "Ensure production-ready security for enterprise customers",
        files: ["src/auth/", "frontend/src/app/auth/"]
      }
    ];
    
    await this.runParallelTasks(testTasks);
  }
}

// CLI Interface
async function main() {
  const coordinator = new AgentCoordinator();
  const command = process.argv[2] || 'help';
  const argument = process.argv[3];

  switch (command) {
    case 'route':
      if (!argument) {
        console.log('❌ Please provide a task description');
        return;
      }
      const routing = coordinator.routeTask({ description: argument });
      console.log(`\n🎯 Recommended Agent: ${routing.agent}`);
      break;

    case 'parallel':
      if (!argument) {
        console.log('❌ Please provide a tasks JSON file');
        return;
      }
      try {
        const tasks = JSON.parse(fs.readFileSync(argument, 'utf8'));
        await coordinator.runParallelTasks(tasks);
      } catch (error) {
        console.error('❌ Failed to load tasks:', error.message);
      }
      break;

    case 'monitor':
      coordinator.monitorAgents();
      break;

    case 'test':
      await coordinator.runTestScenarios();
      break;

    case 'status':
      console.log('\n📊 N0DE Multi-Agent System Status:');
      console.log(`🕐 Last Update: ${new Date(coordinator.sharedState.lastUpdate).toLocaleString()}`);
      console.log(`🤖 Total Agents: ${coordinator.agents.size}`);
      console.log(`📋 Task Queue: ${coordinator.sharedState.taskQueue.length}`);
      coordinator.monitorAgents();
      break;

    case 'help':
    default:
      coordinator.displayHelp();
      break;
  }
}

// Handle yaml dependency
try {
  require.resolve('js-yaml');
} catch (error) {
  console.log('📦 Installing required dependencies...');
  try {
    execSync('npm install js-yaml', { stdio: 'inherit' });
  } catch (installError) {
    console.error('❌ Failed to install js-yaml. Please run: npm install js-yaml');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Agent coordinator error:', error);
  process.exit(1);
});