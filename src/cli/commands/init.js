const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const ora = require('ora');

/**
 * Initialize AiManager project
 * Sets up directory structure and configuration files
 */

class InitCommand {
  constructor() {
    this.templates = {
      'react': 'React/Vite Project',
      'node': 'Node.js API Project',
      'default': 'Generic Project'
    };
  }

  async execute(projectName, options = {}) {
    const spinner = ora('Initializing AiManager project...').start();
    
    try {
      // Check if already initialized
      const aimanagerPath = path.join(process.cwd(), '.aimanager');
      if (await fs.pathExists(aimanagerPath)) {
        spinner.fail('AiManager project already initialized in this directory');
        return;
      }

      // Get project details
      const projectConfig = await this.getProjectConfig(projectName, options);
      const workersConfig = await this.getWorkersConfig();
      
      // Create directory structure
      spinner.text = 'Creating directory structure...';
      await this.createDirectoryStructure(aimanagerPath);
      
      // Create configuration files
      spinner.text = 'Creating configuration files...';
      await this.createConfigFiles(aimanagerPath, projectConfig, workersConfig);
      
      // Create initial data files
      spinner.text = 'Creating initial data files...';
      await this.createInitialDataFiles(aimanagerPath, workersConfig.workers);
      
      // Create worker instruction files
      spinner.text = 'Generating worker instructions...';
      await this.createWorkerInstructions(aimanagerPath, workersConfig.workers);
      
      // Create project settings file
      await this.createProjectSettings(projectConfig);
      
      spinner.succeed('AiManager project initialized successfully!');
      
      // Show next steps
      this.showNextSteps(projectName, workersConfig.workers);
      
    } catch (error) {
      spinner.fail(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async getProjectConfig(projectName, options) {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: projectName,
        validate: (input) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: `${projectName} - Multi-Claude development project`
      },
      {
        type: 'list',
        name: 'template',
        message: 'Project template:',
        choices: Object.entries(this.templates).map(([key, value]) => ({
          name: value,
          value: key
        })),
        default: options.template || 'default'
      },
      {
        type: 'input',
        name: 'manager',
        message: 'Project manager name:',
        default: 'ALEX',
        validate: (input) => input.length > 0 || 'Manager name is required'
      }
    ];

    return await inquirer.prompt(questions);
  }

  async getWorkersConfig() {
    const { workerCount } = await inquirer.prompt([
      {
        type: 'number',
        name: 'workerCount',
        message: 'How many Claude workers will be on this project?',
        default: 2,
        validate: (input) => input > 0 && input <= 10 || 'Must be between 1 and 10 workers'
      }
    ]);

    const workers = [];
    
    for (let i = 0; i < workerCount; i++) {
      console.log(chalk.cyan(`\n👤 Configure Worker ${i + 1}:`));
      
      const workerConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'id',
          message: 'Worker ID (lowercase, no spaces):',
          default: i === 0 ? 'nova' : i === 1 ? 'zephyr' : `worker${i + 1}`,
          validate: (input) => {
            if (!/^[a-z0-9_-]+$/.test(input)) {
              return 'ID must be lowercase letters, numbers, underscore, or dash only';
            }
            if (workers.some(w => w.id === input)) {
              return 'Worker ID must be unique';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'name',
          message: 'Worker name (display name):',
          default: (answers) => answers.id.toUpperCase(),
          validate: (input) => input.length > 0 || 'Worker name is required'
        },
        {
          type: 'list',
          name: 'role',
          message: 'Worker role:',
          choices: [
            'Frontend Specialist',
            'Backend Specialist', 
            'Full-Stack Developer',
            'DevOps Engineer',
            'QA Engineer',
            'Technical Writer',
            'Designer',
            'Other'
          ]
        },
        {
          type: 'input',
          name: 'specialization',
          message: 'Specialization/Skills:',
          default: (answers) => {
            const defaults = {
              'Frontend Specialist': 'React, TypeScript, UI/UX, Mobile Design',
              'Backend Specialist': 'Node.js, APIs, Databases, Architecture',
              'Full-Stack Developer': 'Frontend & Backend, System Design',
              'DevOps Engineer': 'CI/CD, Infrastructure, Monitoring',
              'QA Engineer': 'Testing, Automation, Quality Assurance',
              'Technical Writer': 'Documentation, API Docs, Tutorials',
              'Designer': 'UI Design, UX Research, Prototyping'
            };
            return defaults[answers.role] || 'General Development';
          }
        },
        {
          type: 'list',
          name: 'avatar',
          message: 'Choose avatar emoji:',
          choices: ['🎨', '🚀', '⚡', '🔧', '💡', '🎯', '🛠️', '📱', '🌟', '🔥'],
          default: i === 0 ? '🎨' : '🚀'
        },
        {
          type: 'list', 
          name: 'color',
          message: 'Choose theme color:',
          choices: [
            { name: 'Blue', value: '#6366f1' },
            { name: 'Pink', value: '#ec4899' },
            { name: 'Green', value: '#10b981' },
            { name: 'Purple', value: '#8b5cf6' },
            { name: 'Orange', value: '#f59e0b' },
            { name: 'Red', value: '#ef4444' }
          ]
        }
      ]);

      // Add responsibilities based on role
      workerConfig.responsibilities = this.getDefaultResponsibilities(workerConfig.role);
      workerConfig.kpis = this.getDefaultKPIs(workerConfig.role);

      workers.push(workerConfig);
    }

    return {
      workers,
      team_structure: {
        manager: workers.find(w => w.role.includes('Manager'))?.id || workers[0].id,
        coordination_method: 'JSON status updates',
        update_frequency: 'daily'
      }
    };
  }

  getDefaultResponsibilities(role) {
    const responsibilities = {
      'Frontend Specialist': [
        'User interface development and optimization',
        'Component architecture and reusability',
        'Mobile responsiveness and accessibility',
        'Frontend performance optimization'
      ],
      'Backend Specialist': [
        'API design and implementation',
        'Database architecture and optimization', 
        'Server-side logic and business rules',
        'System integration and scalability'
      ],
      'Full-Stack Developer': [
        'End-to-end feature development',
        'Frontend and backend integration',
        'System architecture decisions',
        'Technical problem solving across the stack'
      ],
      'DevOps Engineer': [
        'CI/CD pipeline setup and maintenance',
        'Infrastructure provisioning and monitoring',
        'Deployment automation and optimization',
        'System reliability and performance'
      ],
      'QA Engineer': [
        'Test strategy and planning',
        'Automated testing implementation',
        'Quality metrics and reporting',
        'Bug identification and verification'
      ]
    };

    return responsibilities[role] || [
      'Project tasks and development work',
      'Code quality and best practices',
      'Team collaboration and communication',
      'Continuous learning and improvement'
    ];
  }

  getDefaultKPIs(role) {
    const kpis = {
      'Frontend Specialist': [
        'Component completion rate',
        'UI/UX improvements implemented',
        'Mobile performance score',
        'Accessibility compliance'
      ],
      'Backend Specialist': [
        'API endpoint completion rate',
        'Database query optimization',
        'System performance improvements',
        'Security implementations'
      ],
      'Full-Stack Developer': [
        'Feature completion rate',
        'Cross-stack integration success',
        'Technical debt reduction',
        'System reliability improvements'
      ]
    };

    return kpis[role] || [
      'Task completion rate',
      'Code quality score',
      'Team collaboration effectiveness',
      'Problem resolution time'
    ];
  }

  async createDirectoryStructure(basePath) {
    const dirs = [
      'config',
      'data',
      'data/.backups',
      'logs',
      'exports'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(basePath, dir));
    }
  }

  async createConfigFiles(basePath, projectConfig, workersConfig) {
    // Project configuration
    const project = {
      project: {
        name: projectConfig.name,
        description: projectConfig.description,
        start_date: new Date().toISOString().split('T')[0],
        version: '1.0.0',
        phase: 'Initial Development',
        manager: projectConfig.manager,
        priority: 'high',
        template: projectConfig.template
      },
      goals: {
        current_sprint: {
          name: 'Setup & Initial Development',
          deadline: this.getDatePlusWeeks(2),
          objectives: [
            'Complete project setup and configuration',
            'Establish team coordination workflow',
            'Begin core feature development',
            'Set up testing and quality processes'
          ]
        },
        success_metrics: {
          team_velocity: 'Consistent daily progress from all workers',
          code_quality: 'All code reviewed and tested',
          coordination_efficiency: 'Clear communication and minimal blockers',
          milestone_delivery: 'On-time completion of sprint goals'
        }
      },
      milestones: [
        {
          name: 'Project Setup Complete',
          date: this.getDatePlusWeeks(1),
          status: 'in_progress'
        },
        {
          name: 'Core Features MVP',
          date: this.getDatePlusWeeks(4),
          status: 'pending'
        },
        {
          name: 'Testing & Quality Assurance',
          date: this.getDatePlusWeeks(6),
          status: 'pending'
        }
      ]
    };

    await fs.writeJSON(path.join(basePath, 'config', 'project.json'), project, { spaces: 2 });
    await fs.writeJSON(path.join(basePath, 'config', 'workers.json'), workersConfig, { spaces: 2 });
  }

  async createInitialDataFiles(basePath, workers) {
    // Create initial worker status files
    for (const worker of workers) {
      const workerStatus = {
        worker_id: worker.id,
        last_update: new Date().toISOString(),
        status: 'ready',
        current_focus: 'Waiting for project kickoff and task assignment',
        today: {
          completed: ['Completed AiManager setup and configuration'],
          in_progress: ['Getting familiar with project structure'],
          planned: ['Waiting for task assignments from project manager']
        },
        blockers: [],
        metrics: {
          tasks_completed: 0,
          productivity_score: 100
        },
        priorities: {
          high: [],
          medium: [],
          low: []
        },
        comments: `Worker ${worker.name} ready for project collaboration`,
        next_24h: [
          'Review project documentation and requirements',
          'Set up development environment',
          'Coordinate with team members'
        ]
      };

      await fs.writeJSON(
        path.join(basePath, 'data', `worker-${worker.id}.json`),
        workerStatus,
        { spaces: 2 }
      );
    }

    // Create initial tasks file
    const tasksData = {
      tasks: [
        {
          id: 1001,
          title: 'Review project setup and requirements',
          assignee_id: workers[0].id,
          priority: 'high',
          status: 'todo',
          due_date: this.getDatePlusWeeks(1),
          created_at: new Date().toISOString(),
          created_by: 'manager',
          description: 'Get familiar with project structure, requirements, and team coordination workflow'
        }
      ],
      last_updated: new Date().toISOString()
    };

    await fs.writeJSON(path.join(basePath, 'data', 'tasks.json'), tasksData, { spaces: 2 });
  }

  async createWorkerInstructions(basePath, workers) {
    for (const worker of workers) {
      const instructions = `# Instructions for ${worker.name}

You are the **${worker.role}** for this project. The project manager has set up AiManager for coordination.

## 🎯 Your Role
**Specialization**: ${worker.specialization}

**Key Responsibilities**:
${worker.responsibilities.map(r => `- ${r}`).join('\n')}

**Success Metrics**:
${worker.kpis.map(k => `- ${k}`).join('\n')}

## 🚀 Getting Started

### IMPORTANT: Use Commands, NOT Direct JSON Editing
DO NOT edit JSON files directly - use these safe commands instead:

### Daily Status Commands:
\`\`\`bash
# Set your current status
aimanager status active|ready|blocked|offline

# Update what you're working on
aimanager focus "What you're currently working on"

# Mark tasks as completed (can list multiple)
aimanager complete "Task 1" "Task 2" "Task 3"

# Add tasks you're currently working on
aimanager working "Current task description"

# Report blockers (issues preventing progress)
aimanager blocked "Description of what's blocking you"

# Add comments or notes
aimanager comment "Any additional notes or communication"

# View your current status
aimanager show

# View team status
aimanager show-team

# Batch update multiple fields
aimanager update --status active --focus "Converting components" --completed "Header setup"
\`\`\`

### Task Management Commands:
\`\`\`bash
# View your assigned tasks
aimanager tasks

# View project information
aimanager project

# Get help
aimanager help
\`\`\`

## 📋 Daily Workflow

1. **Start of day**: Run \`aimanager status active\` and \`aimanager show-team\`
2. **Set focus**: Use \`aimanager focus "What I'm working on today"\`
3. **During work**: Update progress with \`aimanager working "Current task"\`
4. **Complete tasks**: Use \`aimanager complete "Finished task description"\`
5. **Report issues**: Use \`aimanager blocked "Description of blocker"\`
6. **End of day**: Add \`aimanager comment "Summary of today's work"\`

## 🤝 Team Coordination

- The manager sees all your updates in real-time via their dashboard
- Use \`aimanager show-team\` to see what other workers are doing
- Commands automatically handle timestamps and JSON formatting
- All updates are safe and cannot corrupt the system

## 📁 File Locations (For Reference Only - Don't Edit!)
- Your status file: \`.aimanager/data/worker-${worker.id}.json\`
- Shared tasks: \`.aimanager/data/tasks.json\`
- Other workers: \`.aimanager/data/worker-*.json\`

## 🎉 Ready to Start!
You're all set up! The project manager will assign tasks and monitor progress through the AiManager dashboard. Use the commands above to stay coordinated with the team.

**Remember**: Always use commands instead of editing files directly. This prevents errors and keeps everything synchronized.
`;

      await fs.writeFile(
        path.join(basePath, `${worker.name.toLowerCase()}-instructions.md`),
        instructions
      );
    }
  }

  async createProjectSettings(projectConfig) {
    const settings = {
      project_name: projectConfig.name,
      template: projectConfig.template,
      created_at: new Date().toISOString(),
      aimanager_version: '1.0.0'
    };

    await fs.writeJSON('.aimanager.json', settings, { spaces: 2 });
  }

  getDatePlusWeeks(weeks) {
    const date = new Date();
    date.setDate(date.getDate() + (weeks * 7));
    return date.toISOString().split('T')[0];
  }

  showNextSteps(projectName, workers) {
    console.log(chalk.bold.green('\n🎉 Project Setup Complete!'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.bold('\n📁 Created:'));
    console.log(chalk.green('  ✓ .aimanager/ directory with all configuration'));
    console.log(chalk.green('  ✓ Worker status files for all team members'));
    console.log(chalk.green('  ✓ Project configuration and initial tasks'));
    console.log(chalk.green('  ✓ Individual worker instruction files'));
    
    console.log(chalk.bold('\n🚀 Next Steps:'));
    console.log(chalk.cyan('  1. Start the dashboard:'));
    console.log(chalk.white('     aimanager'));
    console.log(chalk.cyan('  2. Share worker instructions with your Claude agents:'));
    
    workers.forEach(worker => {
      console.log(chalk.white(`     📄 ${worker.name.toLowerCase()}-instructions.md → ${worker.name}`));
    });
    
    console.log(chalk.cyan('  3. Workers can start using commands like:'));
    console.log(chalk.white('     aimanager status active'));
    console.log(chalk.white('     aimanager focus "Getting started with the project"'));
    
    console.log(chalk.bold('\n📊 Dashboard URL:'));
    console.log(chalk.underline.blue('  http://localhost:3000'));
    
    console.log(chalk.bold('\n💡 Tips:'));
    console.log(chalk.yellow('  • Dashboard updates in real-time as workers use commands'));
    console.log(chalk.yellow('  • All worker updates are safe and corruption-proof'));
    console.log(chalk.yellow('  • Use the dashboard to assign tasks and monitor progress'));
    
    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.italic(`Welcome to ${projectName} with AiManager! 🎯`));
    console.log();
  }
}

module.exports = async (projectName, options) => {
  const init = new InitCommand();
  await init.execute(projectName, options);
};