#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

// Import command handlers
const initCommand = require('../src/cli/commands/init');
const dashboardCommand = require('../src/cli/commands/dashboard');
const statusCommands = require('../src/cli/commands/status');
const taskCommands = require('../src/cli/commands/tasks');
const configCommands = require('../src/cli/commands/config');

const program = new Command();

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Fatal Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Helper function to check if we're in a project directory
function checkProjectExists() {
  const projectPath = path.join(process.cwd(), '.aimanager');
  return fs.existsSync(projectPath);
}

// Main program setup
program
  .name('aimanager')
  .description('Multi-Claude project management system with visual dashboard')
  .version('1.0.0');

// Initialize project command
program
  .command('init')
  .description('Initialize AiManager in current directory')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <type>', 'Project template (react, node, default)', 'default')
  .action(async (projectName, options) => {
    try {
      await initCommand(projectName || path.basename(process.cwd()), options);
    } catch (error) {
      console.error(chalk.red('Initialization failed:'), error.message);
      process.exit(1);
    }
  });

// Start dashboard (default command)
program
  .command('dashboard', { isDefault: false })
  .description('Start the AiManager dashboard')
  .option('-p, --port <port>', 'Port for dashboard server', '3000')
  .option('-h, --host <host>', 'Host for dashboard server', 'localhost')
  .option('--no-open', 'Don\'t automatically open browser')
  .option('--theme <theme>', 'UI theme (dark, light)', 'dark')
  .option('-v, --verbose', 'Verbose logging')
  .action(async (options) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await dashboardCommand(options);
    } catch (error) {
      console.error(chalk.red('Dashboard failed to start:'), error.message);
      process.exit(1);
    }
  });

// 🤖 AUTONOMOUS AI COMPANY COMMAND - THE MAGIC!
program
  .command('autonomous')
  .description('🤖 Start autonomous AI company operations')
  .argument('[request]', 'What you want the AI company to build')
  .option('-c, --complexity <level>', 'Project complexity (low, medium, high)', 'medium')
  .option('-w, --workers <list>', 'Specific workers to use (comma separated)')
  .option('--no-spawn', 'Don\'t automatically spawn worker terminals')
  .action(async (request, options) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }

    const autonomousCommand = require('../src/cli/commands/autonomous');

    try {
      if (!request) {
        // Show help if no request provided
        autonomousCommand.showHelp();
        return;
      }

      if (request === 'status') {
        await autonomousCommand.showAutonomousStatus();
        return;
      }

      if (request === 'stop') {
        await autonomousCommand.stopAutonomous();
        return;
      }

      if (request === 'templates') {
        await autonomousCommand.listTemplates();
        return;
      }

      if (request === 'emergency-stop') {
        await autonomousCommand.emergencyStop();
        return;
      }

      if (request === 'help') {
        autonomousCommand.showHelp();
        return;
      }

      // Main autonomous operation
      await autonomousCommand.startAutonomous(request, options);

    } catch (error) {
      console.error(chalk.red('💥 Autonomous operation failed:'), error.message);
      process.exit(1);
    }
  });

// Default action when no command is provided
program.action(async (options) => {
  if (!checkProjectExists()) {
    console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
    console.log(chalk.yellow('Or use \'aimanager --help\' for available commands.'));
    process.exit(1);
  }
  
  // Start dashboard with default options
  try {
    await dashboardCommand({ port: '3000', host: 'localhost', open: true, theme: 'dark' });
  } catch (error) {
    console.error(chalk.red('Dashboard failed to start:'), error.message);
    process.exit(1);
  }
});

// Worker status commands
program
  .command('status')
  .description('Update worker status')
  .argument('<status>', 'Worker status (active, ready, blocked, offline)')
  .action(async (status) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.setStatus(status);
    } catch (error) {
      console.error(chalk.red('Status update failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('focus')
  .description('Set current focus/work description')
  .argument('<description>', 'What you are currently working on')
  .action(async (description) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.setFocus(description);
    } catch (error) {
      console.error(chalk.red('Focus update failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('complete')
  .description('Mark tasks as completed')
  .argument('<tasks...>', 'Task descriptions to mark as completed')
  .action(async (tasks) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.addCompleted(tasks);
    } catch (error) {
      console.error(chalk.red('Task completion failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('working')
  .description('Add task to currently working on')
  .argument('<task>', 'Task description')
  .action(async (task) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.addWorking(task);
    } catch (error) {
      console.error(chalk.red('Working task update failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('blocked')
  .description('Report a blocker')
  .argument('<description>', 'Description of what is blocking progress')
  .action(async (description) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.addBlocker(description);
    } catch (error) {
      console.error(chalk.red('Blocker report failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('comment')
  .description('Add a comment or note')
  .argument('<text>', 'Comment text')
  .action(async (text) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.addComment(text);
    } catch (error) {
      console.error(chalk.red('Comment update failed:'), error.message);
      process.exit(1);
    }
  });

// Information commands
program
  .command('show')
  .description('Show current worker status')
  .action(async () => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.showStatus();
    } catch (error) {
      console.error(chalk.red('Show status failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('show-team')
  .description('Show all workers status')
  .action(async () => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await statusCommands.showTeam();
    } catch (error) {
      console.error(chalk.red('Show team failed:'), error.message);
      process.exit(1);
    }
  });

// Task management commands
program
  .command('tasks')
  .description('View assigned tasks')
  .action(async () => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await taskCommands.showTasks();
    } catch (error) {
      console.error(chalk.red('Show tasks failed:'), error.message);
      process.exit(1);
    }
  });

// Configuration commands
program
  .command('config')
  .description('Configuration management')
  .argument('<action>', 'Action (get, set, list)')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(async (action, key, value) => {
    if (!checkProjectExists() && action !== 'list') {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      await configCommands[action](key, value);
    } catch (error) {
      console.error(chalk.red('Config operation failed:'), error.message);
      process.exit(1);
    }
  });

// Project information
program
  .command('project')
  .description('Show project information')
  .action(async () => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      const projectInfo = require('../src/cli/commands/project');
      await projectInfo.showProject();
    } catch (error) {
      console.error(chalk.red('Show project failed:'), error.message);
      process.exit(1);
    }
  });

// Export and backup commands
program
  .command('export')
  .description('Export project data')
  .option('-f, --format <format>', 'Export format (json, csv)', 'json')
  .action(async (options) => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      const exportCommand = require('../src/cli/commands/export');
      await exportCommand(options);
    } catch (error) {
      console.error(chalk.red('Export failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('backup')
  .description('Create project backup')
  .action(async () => {
    if (!checkProjectExists()) {
      console.error(chalk.red('No AiManager project found. Run \'aimanager init\' first.'));
      process.exit(1);
    }
    
    try {
      const backupCommand = require('../src/cli/commands/backup');
      await backupCommand();
    } catch (error) {
      console.error(chalk.red('Backup failed:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();