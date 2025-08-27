const chalk = require('chalk');
const AutonomousProjectManager = require('../../ai/project-manager');
const path = require('path');
const fs = require('fs-extra');

/**
 * 🤖 AUTONOMOUS AI COMPANY COMMAND
 * 
 * This is the MAGIC COMMAND that makes everything autonomous!
 * 
 * Usage: aimanager autonomous "build a user authentication system"
 * Result: Complete AI company springs into action automatically!
 */

let autonomousManager = null;

/**
 * Start autonomous AI company operations
 */
async function startAutonomous(userRequest, options = {}) {
  try {
    console.log(chalk.bold.magenta('\n🎪 WELCOME TO THE AUTONOMOUS AI COMPANY!'));
    console.log(chalk.magenta('═'.repeat(70)));
    console.log(chalk.white('🤖 Where AI workers collaborate to build your vision!'));
    console.log(chalk.magenta('═'.repeat(70)));

    // Validate project is initialized
    const projectRoot = path.join(process.cwd(), '.aimanager');
    if (!(await fs.pathExists(projectRoot))) {
      throw new Error('AiManager project not initialized. Run "aimanager init" first.');
    }

    // Create autonomous project manager
    autonomousManager = new AutonomousProjectManager();

    // Handle graceful shutdown
    setupGracefulShutdown();

    // Execute the user's request autonomously
    const projectPlan = await autonomousManager.executeProject(userRequest, options);

    // Keep process alive for continuous operation
    console.log(chalk.cyan('\n🔄 Autonomous operations running...'));
    console.log(chalk.gray('   📊 Use "aimanager dashboard" to monitor progress'));
    console.log(chalk.gray('   ⏹️  Press Ctrl+C to stop autonomous operations'));
    
    return projectPlan;

  } catch (error) {
    console.error(chalk.red('💥 Autonomous operations failed:'), error.message);
    
    if (error.message.includes('not initialized')) {
      console.log(chalk.yellow('💡 Solution: Run "aimanager init" to set up your project first'));
    }
    
    throw error;
  }
}

/**
 * Stop autonomous operations
 */
async function stopAutonomous() {
  if (autonomousManager) {
    console.log(chalk.yellow('\n⏹️ Stopping autonomous operations...'));
    await autonomousManager.stopAutonomousMode();
    autonomousManager = null;
    console.log(chalk.green('✅ Autonomous operations stopped cleanly'));
  } else {
    console.log(chalk.yellow('No autonomous operations currently running'));
  }
}

/**
 * Show autonomous operations status
 */
async function showAutonomousStatus() {
  console.log(chalk.bold.cyan('\n🤖 Autonomous AI Company Status:'));
  console.log(chalk.cyan('─'.repeat(50)));

  if (!autonomousManager) {
    console.log(chalk.yellow('⏸️  No autonomous operations running'));
    console.log(chalk.gray('   Use "aimanager autonomous \\"your request\\"" to start'));
    return;
  }

  const activeWorkers = autonomousManager.terminalSpawner.getActiveWorkers();
  
  console.log(chalk.green(`🟢 Autonomous operations: ACTIVE`));
  console.log(chalk.blue(`👥 Active AI workers: ${activeWorkers.length}`));
  
  if (activeWorkers.length > 0) {
    console.log(chalk.bold('\n📋 Worker Status:'));
    for (const worker of activeWorkers) {
      const uptime = Math.floor((new Date() - new Date(worker.startTime)) / 1000 / 60);
      console.log(`   ${worker.config.avatar} ${chalk.bold(worker.config.name)} (${worker.id})`);
      console.log(`      Status: ${chalk.green(worker.status)} | PID: ${worker.pid} | Uptime: ${uptime}m`);
      console.log(`      Role: ${worker.config.role}`);
    }
  }

  // Show project progress if available
  try {
    const projectPath = path.join(process.cwd(), '.aimanager', 'config', 'project.json');
    if (await fs.pathExists(projectPath)) {
      const project = await fs.readJSON(projectPath);
      if (project.progress) {
        const p = project.progress;
        console.log(chalk.bold('\\n📊 Project Progress:'));
        console.log(`   ${chalk.green(`✅ ${p.completed}`)} completed • ${chalk.yellow(`🔄 ${p.in_progress}`)} active • ${chalk.red(`🚧 ${p.blocked}`)} blocked`);
        console.log(`   ${chalk.cyan(`📈 Overall progress: ${p.percentage}%`)}`);
      }
    }
  } catch (error) {
    // Skip progress display if error
  }

  console.log(); // Empty line
}

/**
 * List available autonomous templates
 */
async function listTemplates() {
  console.log(chalk.bold.cyan('\\n🎭 Available Autonomous Project Templates:'));
  console.log(chalk.cyan('─'.repeat(55)));

  const templates = [
    {
      name: 'Frontend Application',
      trigger: ['react', 'frontend', 'ui', 'dashboard'],
      description: 'React-based user interface with modern styling',
      workers: ['Frontend Specialist'],
      duration: '1-2 days'
    },
    {
      name: 'Backend API',
      trigger: ['api', 'backend', 'server', 'database'],
      description: 'RESTful API with database integration',
      workers: ['Features Engineer'],
      duration: '2-3 days'
    },
    {
      name: 'Full-Stack Application',
      trigger: ['fullstack', 'full stack', 'complete app'],
      description: 'Complete application with frontend and backend',
      workers: ['Frontend Specialist', 'Features Engineer'],
      duration: '3-5 days'
    },
    {
      name: 'Authentication System',
      trigger: ['auth', 'login', 'user management'],
      description: 'User authentication with JWT and security',
      workers: ['Features Engineer', 'Frontend Specialist'],
      duration: '2-3 days'
    },
    {
      name: 'Data Dashboard',
      trigger: ['dashboard', 'analytics', 'charts'],
      description: 'Data visualization with interactive charts',
      workers: ['Frontend Specialist', 'Features Engineer'],
      duration: '3-4 days'
    }
  ];

  templates.forEach((template, index) => {
    console.log(chalk.bold(`${index + 1}. ${template.name}`));
    console.log(`   📝 ${template.description}`);
    console.log(`   👥 Workers: ${template.workers.join(', ')}`);
    console.log(`   ⏱️  Duration: ${template.duration}`);
    console.log(`   🎯 Triggers: ${template.trigger.map(t => `"${t}"`).join(', ')}`);
    console.log();
  });

  console.log(chalk.bold.yellow('💡 Usage Examples:'));
  console.log(chalk.gray('   aimanager autonomous "build a React dashboard with user authentication"'));
  console.log(chalk.gray('   aimanager autonomous "create a REST API for user management"'));
  console.log(chalk.gray('   aimanager autonomous "develop a full-stack e-commerce platform"'));
  console.log();
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
  const gracefulShutdown = async (signal) => {
    console.log(chalk.yellow(`\\n⚠️ Received ${signal}, shutting down autonomous operations...`));
    
    if (autonomousManager) {
      await stopAutonomous();
    }
    
    console.log(chalk.green('✅ Shutdown complete'));
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle Windows specific signals
  if (process.platform === 'win32') {
    process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
  }
}

/**
 * Emergency stop all workers
 */
async function emergencyStop() {
  console.log(chalk.red('\\n🚨 EMERGENCY STOP: Terminating all AI workers...'));
  
  if (autonomousManager) {
    try {
      await autonomousManager.terminalSpawner.killAllWorkers();
      console.log(chalk.green('✅ All workers terminated'));
    } catch (error) {
      console.error(chalk.red('❌ Error during emergency stop:'), error.message);
    }
  }
  
  // Force kill any remaining processes (platform specific)
  try {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec('taskkill /f /im claude.exe 2>nul', () => {});
    } else {
      exec('pkill -f claude 2>/dev/null', () => {});
    }
  } catch (error) {
    // Ignore errors in emergency cleanup
  }
  
  console.log(chalk.yellow('🛑 Emergency stop complete'));
}

/**
 * Show help for autonomous commands
 */
function showHelp() {
  console.log(chalk.bold.cyan('\\n🤖 Autonomous AI Company - Help'));
  console.log(chalk.cyan('═'.repeat(40)));
  
  console.log(chalk.bold('\\n📋 Available Commands:'));
  console.log('');
  console.log(chalk.green('aimanager autonomous "your request"'));
  console.log('  Start autonomous AI company to build your request');
  console.log('  Example: aimanager autonomous "build a user dashboard"');
  console.log('');
  console.log(chalk.green('aimanager autonomous status'));
  console.log('  Show current autonomous operations status');
  console.log('');
  console.log(chalk.green('aimanager autonomous stop'));
  console.log('  Stop all autonomous operations cleanly');
  console.log('');
  console.log(chalk.green('aimanager autonomous templates'));
  console.log('  List available project templates and examples');
  console.log('');
  console.log(chalk.green('aimanager autonomous emergency-stop'));
  console.log('  Emergency termination of all AI workers');
  console.log('');
  
  console.log(chalk.bold('\\n🎯 How It Works:'));
  console.log('1. You describe what you want built');
  console.log('2. AI Project Manager analyzes and creates plan');
  console.log('3. Appropriate AI workers are automatically spawned');
  console.log('4. Workers coordinate and build your request');
  console.log('5. You monitor progress on real-time dashboard');
  console.log('');
  
  console.log(chalk.bold('\\n💡 Tips:'));
  console.log('• Be specific about what you want built');
  console.log('• Use technical terms (React, API, database, etc.)');
  console.log('• Run "aimanager dashboard" to watch progress');
  console.log('• Workers operate completely autonomously');
  console.log('');
}

module.exports = {
  startAutonomous,
  stopAutonomous,
  showAutonomousStatus,
  listTemplates,
  emergencyStop,
  showHelp
};