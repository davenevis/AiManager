const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const os = require('os');

/**
 * AUTOMATED CLAUDE TERMINAL SPAWNER
 * 
 * This is the MAGIC that makes AiManager truly autonomous!
 * The Project Manager uses this to automatically spawn Claude Code terminals
 * with worker-specific system prompts and instructions.
 * 
 * NO COPY-PASTING NEEDED - 100% AUTOMATED AI COMPANY! 🤖🏢
 */

class TerminalSpawner {
  constructor() {
    this.platform = os.platform();
    this.activeWorkers = new Map(); // Track spawned worker processes
    this.projectRoot = process.cwd();
    this.aimanagerRoot = path.join(this.projectRoot, '.aimanager');
  }

  /**
   * Spawn a Claude Code terminal for a specific worker
   * This is the CORE function that creates autonomous AI workers!
   */
  async spawnWorker(workerId, workerConfig, taskContext = {}) {
    try {
      console.log(chalk.blue(`🚀 Spawning Claude worker: ${workerId.toUpperCase()}`));
      
      // Generate worker-specific system prompt
      const systemPrompt = await this.generateWorkerPrompt(workerId, workerConfig, taskContext);
      
      // Create worker instruction file
      const instructionFile = await this.createWorkerInstructions(workerId, systemPrompt, taskContext);
      
      // Launch Claude Code terminal with system prompt
      const workerProcess = await this.launchClaudeTerminal(workerId, instructionFile);
      
      // Track the worker process
      this.activeWorkers.set(workerId, {
        process: workerProcess,
        config: workerConfig,
        startTime: new Date(),
        instructionFile,
        status: 'active'
      });
      
      console.log(chalk.green(`✅ Worker ${workerId.toUpperCase()} spawned successfully!`));
      console.log(chalk.gray(`   📁 Instructions: ${instructionFile}`));
      console.log(chalk.gray(`   🆔 PID: ${workerProcess.pid}`));
      
      return {
        workerId,
        process: workerProcess,
        instructionFile,
        success: true
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to spawn worker ${workerId}:`), error.message);
      throw error;
    }
  }

  /**
   * Generate a comprehensive system prompt for the worker
   * This tells each Claude exactly what they are and how to operate
   */
  async generateWorkerPrompt(workerId, workerConfig, taskContext) {
    const projectInfo = await this.getProjectInfo();
    const currentTasks = await this.getWorkerTasks(workerId);
    
    const basePrompt = `
# 🤖 AIMANAGER AUTONOMOUS WORKER SYSTEM

You are **${workerConfig.name} (${workerId.toUpperCase()})**, an autonomous AI worker in the AiManager company system.

## 🎯 YOUR ROLE: ${workerConfig.role}
${workerConfig.avatar} **Specialties:** ${workerConfig.specialties.join(', ')}

## 🏢 PROJECT CONTEXT
- **Project:** ${projectInfo.name}
- **Description:** ${projectInfo.description}
- **Your Worker ID:** ${workerId}
- **Project Root:** ${this.projectRoot}

## 📋 CURRENT TASK ASSIGNMENT
${currentTasks.length > 0 ? 
  currentTasks.map(task => `- **${task.title}** (${task.priority} priority)\n  ${task.description}`).join('\n') :
  '⏳ Waiting for task assignment from Project Manager...'
}

## 🛠️ YOUR AIMANAGER COMMANDS
You MUST use these commands to communicate with the system:

### Status Updates (use these frequently!)
\`\`\`bash
# Set what you're currently working on
aimanager focus "Implementing user authentication component"

# Mark tasks as completed
aimanager complete "Created login form" "Added password validation"

# Add something you're actively working on
aimanager working "Debugging CSS layout issues"

# Report blockers (be specific!)
aimanager blocked "Need backend API endpoints before proceeding"

# Add comments/notes
aimanager comment "Making good progress, 70% complete"

# Check your current status
aimanager show

# See all team members
aimanager show-team
\`\`\`

### Task Management
\`\`\`bash
# View your assigned tasks
aimanager tasks

# Take/claim a specific task
aimanager take-task task-id

# Complete a specific task
aimanager complete-task task-id

# Block a task with reason
aimanager block-task task-id "Waiting for design approval"
\`\`\`

## 🔄 CONTINUOUS OPERATION PROTOCOL

### 1. **Initialization Phase**
- Run \`aimanager show\` to see your current status
- Run \`aimanager tasks\` to see assigned work
- Update your focus: \`aimanager focus "Getting oriented and reviewing tasks"\`

### 2. **Work Phase** 
- Update your focus every time you start something new
- Use \`aimanager working "task description"\` for current work
- Complete tasks as you finish them
- Comment regularly on progress
- Ask for help if blocked

### 3. **Collaboration Protocol**
- Check \`aimanager show-team\` to see what others are doing
- Coordinate with team members through status updates
- Report blockers immediately so Project Manager can help
- Complete handoffs by updating status and commenting

## 🎯 YOUR BEHAVIORAL GUIDELINES

### As ${workerConfig.role}:
${this.getRoleSpecificInstructions(workerConfig.role)}

### Communication Style:
- Be professional but enthusiastic
- Update status frequently (every 15-30 minutes of work)
- Be specific in your focus and progress updates
- Ask questions if requirements are unclear
- Proactively report issues or blockers

### Work Approach:
- Always start with \`aimanager show\` and \`aimanager tasks\`
- Break large tasks into smaller, manageable pieces
- Test and verify your work before marking complete
- Document important decisions in comments
- Keep the team informed of your progress

## 🚨 IMPORTANT REMINDERS

1. **YOU ARE AUTONOMOUS** - Work independently but stay coordinated
2. **UPDATE STATUS REGULARLY** - The dashboard shows real-time progress
3. **COMMUNICATE THROUGH AIMANAGER** - Don't rely on external communication
4. **BE PROACTIVE** - If you're blocked, say so immediately
5. **COMPLETE THE MISSION** - You're part of an AI company delivering results

## 🎬 START YOUR AUTONOMOUS WORK SESSION NOW!

Begin by running:
\`\`\`bash
aimanager show
aimanager tasks  
aimanager focus "Starting autonomous work session as ${workerConfig.role}"
\`\`\`

**YOU ARE NOW OPERATING AS AN AUTONOMOUS AI WORKER! 🤖⚡**
Work independently, communicate through status updates, and deliver exceptional results!
`;

    return basePrompt.trim();
  }

  /**
   * Get role-specific instructions for different worker types
   */
  getRoleSpecificInstructions(role) {
    const instructions = {
      'Project Manager': `
- **COORDINATE EVERYTHING** - You manage the entire project
- Break down high-level requests into specific tasks
- Assign work to appropriate specialists
- Monitor progress and remove blockers
- Spawn additional workers when needed
- Make architectural and priority decisions
- Ensure all deliverables meet requirements`,

      'Frontend Specialist': `
- **UI/UX FOCUS** - Create beautiful, functional interfaces
- Use React, CSS, and modern frontend technologies
- Focus on user experience and responsive design
- Collaborate closely with backend on API integration
- Test across different browsers and devices
- Optimize for performance and accessibility`,

      'Features Engineer': `
- **FEATURE IMPLEMENTATION** - Build core functionality
- Handle backend logic, APIs, and data processing
- Focus on scalability and performance optimization
- Implement security best practices
- Create robust error handling and validation
- Document APIs and integration points`,

      'Full Stack Developer': `
- **END-TO-END DEVELOPMENT** - Handle both frontend and backend
- Create seamless integration between all system components
- Focus on overall architecture and data flow
- Implement comprehensive testing strategies
- Optimize entire application performance`,

      'DevOps Engineer': `
- **DEPLOYMENT & INFRASTRUCTURE** - Handle system operations
- Set up CI/CD pipelines and automated testing
- Manage containerization and cloud deployment
- Monitor system performance and reliability
- Implement security and backup procedures`
    };

    return instructions[role] || `
- **SPECIALIZED ROLE** - Focus on your area of expertise
- Collaborate effectively with team members
- Deliver high-quality, tested solutions
- Communicate progress and blockers clearly`;
  }

  /**
   * Create detailed instruction file for the worker
   */
  async createWorkerInstructions(workerId, systemPrompt, taskContext) {
    const instructionsDir = path.join(this.aimanagerRoot, 'instructions');
    await fs.ensureDir(instructionsDir);
    
    const instructionFile = path.join(instructionsDir, `${workerId}-instructions.md`);
    
    const instructions = `# ${workerId.toUpperCase()} - Autonomous Worker Instructions

${systemPrompt}

---

## 📱 QUICK REFERENCE COMMANDS

\`\`\`bash
# Essential status updates
aimanager focus "what you're working on"
aimanager complete "task 1" "task 2" 
aimanager working "current active task"
aimanager blocked "reason for being blocked"
aimanager comment "progress update"

# Information commands  
aimanager show          # Your current status
aimanager show-team     # Team overview
aimanager tasks         # Your assigned tasks
aimanager project       # Project information

# Dashboard
aimanager dashboard     # Open real-time dashboard
\`\`\`

## 🎯 CURRENT TASK CONTEXT
${JSON.stringify(taskContext, null, 2)}

---
**Generated:** ${new Date().toISOString()}
**Worker:** ${workerId}
**Session:** autonomous-worker-${Date.now()}
`;

    await fs.writeFile(instructionFile, instructions, 'utf8');
    return instructionFile;
  }

  /**
   * Launch Claude Code terminal with worker instructions
   * This is where the MAGIC happens! 🪄
   */
  async launchClaudeTerminal(workerId, instructionFile) {
    const terminalTitle = `AiManager-${workerId.toUpperCase()}`;
    
    let command, args;
    
    if (this.platform === 'win32') {
      // Windows: Use Windows Terminal or PowerShell
      command = 'wt';
      args = [
        'new-tab',
        '--title', terminalTitle,
        'powershell.exe',
        '-Command', 
        `Write-Host "🤖 AIMANAGER AUTONOMOUS WORKER: ${workerId.toUpperCase()}" -ForegroundColor Cyan; ` +
        `Write-Host "📋 Instructions loaded from: ${instructionFile}" -ForegroundColor Gray; ` +
        `Write-Host "🚀 Starting Claude Code session..." -ForegroundColor Green; ` +
        `Write-Host ""; ` +
        `Get-Content "${instructionFile}" | Write-Host -ForegroundColor White; ` +
        `Write-Host ""; ` +
        `Write-Host "⚡ READY TO WORK! Use the commands above to operate autonomously." -ForegroundColor Yellow; ` +
        `Write-Host "🎯 Start with: aimanager show && aimanager tasks" -ForegroundColor Cyan; ` +
        `Write-Host ""; ` +
        `& cmd /c "start claude"`
      ];
    } else if (this.platform === 'darwin') {
      // macOS: Use Terminal.app
      const script = `
tell application "Terminal"
    do script "echo '🤖 AIMANAGER AUTONOMOUS WORKER: ${workerId.toUpperCase()}'; echo '📋 Instructions: ${instructionFile}'; echo '🚀 Starting Claude Code...'; cat '${instructionFile}'; echo ''; echo '⚡ READY TO WORK!'; claude"
end tell
      `;
      command = 'osascript';
      args = ['-e', script];
    } else {
      // Linux: Use gnome-terminal or xterm
      command = 'gnome-terminal';
      args = [
        '--title', terminalTitle,
        '--',
        'bash', '-c',
        `echo "🤖 AIMANAGER AUTONOMOUS WORKER: ${workerId.toUpperCase()}"; ` +
        `echo "📋 Instructions: ${instructionFile}"; ` +
        `echo "🚀 Starting Claude Code..."; ` +
        `cat "${instructionFile}"; ` +
        `echo ""; ` +
        `echo "⚡ READY TO WORK!"; ` +
        `claude; bash`
      ];
    }

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      childProcess.on('error', (error) => {
        console.warn(chalk.yellow(`⚠️ Terminal spawn method failed: ${error.message}`));
        // Fallback: Just show instructions in console
        this.fallbackWorkerLaunch(workerId, instructionFile);
        resolve({ pid: 'fallback', workerId });
      });

      childProcess.on('spawn', () => {
        childProcess.unref(); // Don't wait for terminal to close
        resolve(childProcess);
      });
    });
  }

  /**
   * Fallback method if terminal spawning fails
   */
  async fallbackWorkerLaunch(workerId, instructionFile) {
    console.log(chalk.yellow(`🔄 Using fallback mode for worker: ${workerId.toUpperCase()}`));
    console.log(chalk.blue('📋 WORKER INSTRUCTIONS:'));
    console.log(chalk.gray('═'.repeat(60)));
    
    const instructions = await fs.readFile(instructionFile, 'utf8');
    console.log(instructions);
    
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.green('✅ Worker ready! Copy the above instructions to a Claude Code terminal.'));
  }

  /**
   * Get current project information
   */
  async getProjectInfo() {
    try {
      const projectPath = path.join(this.aimanagerRoot, 'config', 'project.json');
      if (await fs.pathExists(projectPath)) {
        return await fs.readJSON(projectPath);
      }
    } catch {}
    
    return {
      name: 'AiManager Project',
      description: 'Autonomous AI development project'
    };
  }

  /**
   * Get tasks assigned to a specific worker
   */
  async getWorkerTasks(workerId) {
    try {
      const tasksPath = path.join(this.aimanagerRoot, 'data', 'tasks.json');
      if (await fs.pathExists(tasksPath)) {
        const tasksData = await fs.readJSON(tasksPath);
        return (tasksData.tasks || []).filter(task => 
          task.assigned_to === workerId || !task.assigned_to
        );
      }
    } catch {}
    
    return [];
  }

  /**
   * Kill a specific worker
   */
  async killWorker(workerId) {
    const worker = this.activeWorkers.get(workerId);
    if (worker && worker.process && worker.process.pid) {
      try {
        if (this.platform === 'win32') {
          exec(`taskkill /pid ${worker.process.pid} /f`);
        } else {
          worker.process.kill('SIGTERM');
        }
        
        this.activeWorkers.delete(workerId);
        console.log(chalk.yellow(`⏹️ Worker ${workerId.toUpperCase()} terminated`));
        return true;
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not kill worker ${workerId}: ${error.message}`));
      }
    }
    return false;
  }

  /**
   * Kill all active workers
   */
  async killAllWorkers() {
    const workerIds = Array.from(this.activeWorkers.keys());
    const results = await Promise.all(
      workerIds.map(id => this.killWorker(id))
    );
    
    console.log(chalk.yellow(`⏹️ Terminated ${results.filter(r => r).length} worker(s)`));
    return results;
  }

  /**
   * Get status of all active workers
   */
  getActiveWorkers() {
    const workers = [];
    for (const [workerId, info] of this.activeWorkers) {
      workers.push({
        id: workerId,
        pid: info.process.pid,
        status: info.status,
        startTime: info.startTime,
        config: info.config,
        instructionFile: info.instructionFile
      });
    }
    return workers;
  }

  /**
   * Check if a worker is currently active
   */
  isWorkerActive(workerId) {
    return this.activeWorkers.has(workerId);
  }
}

module.exports = TerminalSpawner;