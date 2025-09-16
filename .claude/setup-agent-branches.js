#!/usr/bin/env node

/**
 * N0DE Agent Branch Setup - Best Practice Git Workflow
 * Sets up separate development branches for each specialized agent
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌿 Setting up N0DE Multi-Agent Branch Workflow\n');

// Agent branch configuration
const agentBranches = {
  'frontend-specialist': {
    branch: 'feature/frontend-optimization',
    description: 'Frontend UX improvements and conversion optimization',
    focus: ['frontend/', 'vercel.json', '*.tsx', '*.css'],
    baseProtection: ['src/', 'prisma/'],
    mergeStrategy: 'squash'
  },
  'backend-api-expert': {
    branch: 'feature/backend-performance',
    description: 'Backend API optimization and database improvements',
    focus: ['src/', 'prisma/', 'nest-cli.json', 'tsconfig.json'],
    baseProtection: ['frontend/'],
    mergeStrategy: 'squash'
  },
  'payments-specialist': {
    branch: 'feature/payment-optimization',
    description: 'Payment flow optimization and revenue improvements',
    focus: ['src/billing/', 'src/payments/', 'src/subscriptions/', 'frontend/**/billing/', 'frontend/**/checkout/'],
    baseProtection: ['src/auth/'],
    mergeStrategy: 'squash'
  },
  'security-guardian': {
    branch: 'feature/security-enhancements',
    description: 'Authentication security improvements and compliance',
    focus: ['src/auth/', 'frontend/**/auth/', '*.guard.ts', '*.strategy.ts'],
    baseProtection: ['src/billing/', 'src/payments/'],
    mergeStrategy: 'merge'  // Keep detailed security audit trail
  },
  'devops-engineer': {
    branch: 'feature/infrastructure-optimization',
    description: 'Performance monitoring and deployment automation',
    focus: ['.github/', 'backend.toml', 'docker*', 'monitoring/', 'scripts/'],
    baseProtection: ['src/', 'frontend/'],
    mergeStrategy: 'squash'
  }
};

// Create agent branches from current main
const createAgentBranches = () => {
  console.log('🌱 Creating agent-specific branches...\n');
  
  // Ensure we're on main and up to date
  try {
    console.log('📍 Ensuring main branch is current...');
    execSync('git checkout main', { stdio: 'pipe' });
    execSync('git pull origin main', { stdio: 'pipe' });
    console.log('✅ Main branch updated\n');
  } catch (error) {
    console.log('⚠️  Could not update main branch, proceeding anyway...\n');
  }
  
  Object.entries(agentBranches).forEach(([agentName, config]) => {
    try {
      console.log(`🌿 Creating branch for ${agentName}:`);
      console.log(`   Branch: ${config.branch}`);
      console.log(`   Focus: ${config.description}`);
      
      // Check if branch already exists
      try {
        execSync(`git rev-parse --verify ${config.branch}`, { stdio: 'pipe' });
        console.log(`   ⚠️  Branch ${config.branch} already exists, skipping creation`);
      } catch (error) {
        // Branch doesn't exist, create it
        execSync(`git checkout -b ${config.branch}`, { stdio: 'pipe' });
        execSync(`git push -u origin ${config.branch}`, { stdio: 'pipe' });
        console.log(`   ✅ Branch created and pushed to origin`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`   ❌ Failed to create branch for ${agentName}:`, error.message);
    }
  });
  
  // Return to main
  try {
    execSync('git checkout main', { stdio: 'pipe' });
  } catch (error) {
    console.log('⚠️  Could not return to main branch');
  }
};

// Create branch protection rules (GitHub CLI required)
const setupBranchProtection = () => {
  console.log('🛡️  Setting up branch protection rules...\n');
  
  // Check if GitHub CLI is available
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('⚠️  GitHub CLI not found, skipping branch protection setup');
    console.log('   Install with: brew install gh (or visit https://cli.github.com/)');
    return;
  }
  
  // Set up protection for main branch
  try {
    console.log('🔒 Setting up main branch protection...');
    execSync(`gh api repos/:owner/:repo/branches/main/protection \\
      --method PUT \\
      --field required_status_checks='{"strict":true,"contexts":["ci/tests"]}' \\
      --field enforce_admins=true \\
      --field required_pull_request_reviews='{"required_approving_review_count":1}' \\
      --field restrictions=null`, { stdio: 'pipe' });
    console.log('✅ Main branch protection enabled\n');
  } catch (error) {
    console.log('⚠️  Could not set up branch protection (may require repo admin access)\n');
  }
};

// Create workflow coordination file
const createWorkflowCoordination = () => {
  console.log('⚙️  Creating workflow coordination files...\n');
  
  const workflowConfig = {
    agentBranches,
    workflowRules: {
      // Agents can work in parallel on their branches
      parallelDevelopment: true,
      
      // Cross-agent coordination rules
      coordinationRules: {
        // Security Guardian reviews all auth-related changes
        securityReview: {
          triggers: ['src/auth/', 'frontend/**/auth/', '*.guard.ts', '*.strategy.ts'],
          reviewer: 'security-guardian',
          required: true
        },
        
        // Backend API Expert reviews all API changes
        apiReview: {
          triggers: ['src/**/*.controller.ts', 'src/**/*.service.ts'],
          reviewer: 'backend-api-expert',
          required: false
        },
        
        // Payment Specialist reviews all payment-related changes
        paymentReview: {
          triggers: ['**/billing/', '**/payment/', '**/checkout/', 'src/subscriptions/'],
          reviewer: 'payments-specialist',
          required: true
        }
      },
      
      // Merge strategy per agent
      mergeStrategies: Object.fromEntries(
        Object.entries(agentBranches).map(([agent, config]) => [
          config.branch, 
          config.mergeStrategy
        ])
      )
    }
  };
  
  // Save workflow configuration
  fs.writeFileSync('.claude/workflow-config.json', JSON.stringify(workflowConfig, null, 2));
  console.log('✅ Workflow configuration saved to .claude/workflow-config.json');
  
  // Create branch assignment file
  const branchAssignments = Object.entries(agentBranches).map(([agent, config]) => ({
    agent,
    branch: config.branch,
    focus: config.focus,
    description: config.description
  }));
  
  fs.writeFileSync('.claude/branch-assignments.json', JSON.stringify(branchAssignments, null, 2));
  console.log('✅ Branch assignments saved to .claude/branch-assignments.json\n');
};

// Create agent-specific workflow scripts
const createAgentWorkflowScripts = () => {
  console.log('📝 Creating agent workflow scripts...\n');
  
  Object.entries(agentBranches).forEach(([agentName, config]) => {
    const scriptContent = `#!/bin/bash
# ${agentName.toUpperCase()} Workflow Script
# Automated workflow for ${config.description}

set -e

echo "🤖 ${agentName.toUpperCase()} - Starting workflow"
echo "🌿 Branch: ${config.branch}"
echo "📋 Focus: ${config.description}"

# Switch to agent branch
echo "📍 Switching to agent branch..."
git checkout ${config.branch}
git pull origin ${config.branch}

# Check for conflicts with main
echo "🔍 Checking for conflicts with main..."
CONFLICTS=$(git merge-tree \$(git merge-base ${config.branch} main) ${config.branch} main | wc -l)
if [ "$CONFLICTS" -gt 0 ]; then
  echo "⚠️  Potential conflicts detected with main branch"
  echo "   Consider rebasing or coordinating with other agents"
fi

# Run agent-specific checks
echo "🧪 Running agent-specific checks..."
case "${agentName}" in
  "frontend-specialist")
    cd frontend/n0de-website
    npm run lint
    npm run type-check
    npm run test
    cd ../..
    ;;
  "backend-api-expert")
    npm run lint
    npm run test
    npm run test:e2e
    ;;
  "payments-specialist")
    npm test -- payment billing subscription
    ;;
  "security-guardian")
    npm audit
    npm test -- auth security
    ;;
  "devops-engineer")
    # Check deployment configurations
    echo "  Validating deployment configs..."
    backend status || echo "backend not configured"
    ;;
esac

echo "✅ ${agentName.toUpperCase()} workflow completed"
echo ""
echo "📋 Next steps:"
echo "  1. Make your changes in the appropriate files:"
${config.focus.map(pattern => `echo "     - ${pattern}"`).join('\n')}
echo "  2. Test your changes: ./.claude/scripts/${agentName}-workflow.sh"
echo "  3. Commit changes: git add . && git commit -m 'feat: agent work description'"
echo "  4. Push changes: git push origin ${config.branch}"
echo "  5. Create PR when ready: gh pr create --title 'feat: agent work' --body 'Description'"
`;

    const scriptPath = `.claude/scripts/${agentName}-workflow.sh`;
    
    // Ensure scripts directory exists
    if (!fs.existsSync('.claude/scripts')) {
      fs.mkdirSync('.claude/scripts', { recursive: true });
    }
    
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Make script executable
    try {
      execSync(`chmod +x ${scriptPath}`, { stdio: 'pipe' });
      console.log(`  ✅ ${agentName}-workflow.sh created`);
    } catch (error) {
      console.log(`  ⚠️  Could not make ${scriptPath} executable`);
    }
  });
};

// Create merge coordination script
const createMergeCoordination = () => {
  console.log('🔄 Creating merge coordination script...\n');
  
  const mergeScript = `#!/bin/bash
# N0DE Multi-Agent Merge Coordinator
# Coordinates merging changes from all agent branches

set -e

echo "🔄 N0DE Multi-Agent Merge Coordinator"
echo "===================================="
echo ""

# Get current branch status
echo "📊 Current Branch Status:"
${Object.entries(agentBranches).map(([agent, config]) => 
  `echo "  ${agent}: $(git rev-list --count main..origin/${config.branch} 2>/dev/null || echo 'N/A') commits ahead"`
).join('\n')}
echo ""

# Check for conflicts between agent branches
echo "🔍 Checking for inter-agent conflicts..."
CONFLICT_FOUND=false

${Object.entries(agentBranches).map(([agent1, config1]) =>
  Object.entries(agentBranches).filter(([agent2]) => agent2 > agent1).map(([agent2, config2]) =>
    `echo "  Checking ${agent1} vs ${agent2}..."
CONFLICTS=\$(git merge-tree \$(git merge-base origin/${config1.branch} origin/${config2.branch}) origin/${config1.branch} origin/${config2.branch} 2>/dev/null | wc -l || echo "0")
if [ "$CONFLICTS" -gt 0 ]; then
  echo "    ⚠️  Conflicts detected between ${config1.branch} and ${config2.branch}"
  CONFLICT_FOUND=true
else
  echo "    ✅ No conflicts"
fi`
  ).join('\n')
).join('\n')}

if [ "$CONFLICT_FOUND" = true ]; then
  echo ""
  echo "❌ Inter-agent conflicts detected!"
  echo "   Coordinate with other agents to resolve conflicts before merging"
  exit 1
fi

echo ""
echo "✅ No conflicts detected between agent branches"
echo ""
echo "🚀 Ready for coordinated merge to main!"
echo ""
echo "📋 Recommended merge order:"
${Object.entries(agentBranches).map(([agent, config], index) =>
  `echo "  ${index + 1}. ${agent} (${config.branch}) - ${config.mergeStrategy} merge"`
).join('\n')}
echo ""
echo "💡 To proceed with merges:"
echo "   1. Review all PRs are approved"
echo "   2. Run: ./.claude/scripts/coordinated-merge.sh"
`;

  const scriptPath = '.claude/scripts/merge-coordinator.sh';
  fs.writeFileSync(scriptPath, mergeScript);
  
  try {
    execSync(`chmod +x ${scriptPath}`, { stdio: 'pipe' });
    console.log('✅ Merge coordinator script created');
  } catch (error) {
    console.log('⚠️  Could not make merge coordinator executable');
  }
};

// Display branch workflow summary
const displayWorkflowSummary = () => {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 N0DE MULTI-AGENT BRANCH WORKFLOW SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n📋 Agent Branch Assignments:');
  Object.entries(agentBranches).forEach(([agent, config]) => {
    console.log(`\n🤖 ${agent.toUpperCase()}`);
    console.log(`   Branch: ${config.branch}`);
    console.log(`   Focus: ${config.description}`);
    console.log(`   Files: ${config.focus.slice(0, 3).join(', ')}${config.focus.length > 3 ? '...' : ''}`);
    console.log(`   Merge: ${config.mergeStrategy}`);
  });
  
  console.log('\n🔄 Workflow Commands:');
  console.log('  Setup branches:     ./.claude/setup-agent-branches.js');
  console.log('  Agent workflow:     ./.claude/scripts/{agent}-workflow.sh');
  console.log('  Check conflicts:    ./.claude/scripts/merge-coordinator.sh');
  console.log('  Run agent tasks:    node .claude/agent-runner.js');
  
  console.log('\n📋 Development Process:');
  console.log('  1. Each agent works on their specialized branch');
  console.log('  2. Changes are isolated and can be developed in parallel');
  console.log('  3. Cross-agent coordination through PR reviews');
  console.log('  4. Coordinated merging prevents conflicts');
  console.log('  5. Main branch always stays stable');
  
  console.log('\n🌿 Branch Protection:');
  console.log('  • Main branch requires PR reviews');
  console.log('  • All tests must pass before merge');
  console.log('  • Agent branches can be freely developed');
  console.log('  • Cross-agent reviews for sensitive changes');
};

// Main execution
async function main() {
  try {
    createAgentBranches();
    setupBranchProtection();
    createWorkflowCoordination();
    createAgentWorkflowScripts();
    createMergeCoordination();
    displayWorkflowSummary();
    
    console.log('\n✅ N0DE Multi-Agent Branch Workflow Setup Complete!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Review branch assignments in .claude/branch-assignments.json');
    console.log('  2. Each agent can start working with: ./.claude/scripts/{agent}-workflow.sh');
    console.log('  3. Coordinate changes through PR reviews');
    console.log('  4. Use ./.claude/scripts/merge-coordinator.sh to check for conflicts');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

main();