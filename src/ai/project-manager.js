const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const TerminalSpawner = require('../core/terminal-spawner');
const fileOps = require('../core/file-operations');

/**
 * 🤖 AUTONOMOUS PROJECT MANAGER AI
 * 
 * This is the BRAIN of the autonomous AI company!
 * 
 * Features:
 * - Takes high-level user requests
 * - Breaks them into detailed project plans
 * - Automatically assigns tasks to workers
 * - Spawns Claude terminals for each worker
 * - Monitors progress and removes blockers
 * - Coordinates handoffs and deliverables
 * 
 * THE ULTIMATE AI PROJECT MANAGER! 🏢⚡
 */

class AutonomousProjectManager {
  constructor() {
    this.terminalSpawner = new TerminalSpawner();
    this.projectRoot = process.cwd();
    this.aimanagerRoot = path.join(this.projectRoot, '.aimanager');
    this.isRunning = false;
    this.monitoringInterval = null;
    this.workersSpawned = new Set();
  }

  /**
   * 🚀 MAIN ENTRY POINT - User says "build X" and magic happens!
   */
  async executeProject(userRequest, options = {}) {
    try {
      console.log(chalk.bold.cyan('\n🤖 AUTONOMOUS PROJECT MANAGER ACTIVATED!'));
      console.log(chalk.blue('═'.repeat(60)));
      console.log(chalk.white(`📋 User Request: "${userRequest}"`));
      console.log(chalk.blue('═'.repeat(60)));

      // Step 1: Analyze the request
      console.log(chalk.yellow('\n📊 Phase 1: Analyzing Request...'));
      const projectPlan = await this.analyzeAndPlan(userRequest, options);

      // Step 2: Create project structure
      console.log(chalk.yellow('\n📁 Phase 2: Setting Up Project...'));
      await this.initializeProject(projectPlan);

      // Step 3: Break down into tasks
      console.log(chalk.yellow('\n📋 Phase 3: Creating Task Breakdown...'));
      await this.createTaskBreakdown(projectPlan);

      // Step 4: Assign workers and spawn terminals
      console.log(chalk.yellow('\n👥 Phase 4: Deploying AI Workers...'));
      await this.deployWorkers(projectPlan);

      // Step 5: Start continuous monitoring
      console.log(chalk.yellow('\n🔄 Phase 5: Starting Autonomous Operations...'));
      await this.startAutonomousMode();

      console.log(chalk.green('\n✅ AUTONOMOUS AI COMPANY IS NOW RUNNING!'));
      console.log(chalk.cyan('🎯 Workers are executing your request autonomously'));
      console.log(chalk.cyan('📊 Monitor progress on the dashboard: aimanager dashboard'));
      console.log(chalk.gray('⏹️  Use Ctrl+C to stop autonomous operations'));

      return projectPlan;

    } catch (error) {
      console.error(chalk.red('❌ Project Manager Error:'), error.message);
      throw error;
    }
  }

  /**
   * Analyze user request and create detailed project plan
   */
  async analyzeAndPlan(userRequest, options = {}) {
    console.log(chalk.blue('🧠 Analyzing requirements and creating master plan...'));

    // This is where we'd integrate with Claude API for intelligent planning
    // For MVP, we'll use smart pattern matching and templates

    const projectPlan = await this.generateProjectPlan(userRequest, options);
    
    console.log(chalk.green(`✅ Project plan created: ${projectPlan.milestones.length} milestones, ${projectPlan.estimatedDays} day timeline`));
    
    return projectPlan;
  }

  /**
   * Generate intelligent project plan based on request type
   */
  async generateProjectPlan(userRequest, options) {
    const requestLower = userRequest.toLowerCase();
    
    // Smart project type detection
    let projectType = 'general';
    let technologies = [];
    let complexity = 'medium';

    // Detect project type and technologies
    if (requestLower.includes('react') || requestLower.includes('frontend') || requestLower.includes('ui')) {
      projectType = 'frontend';
      technologies.push('React', 'JavaScript', 'CSS');
    }
    if (requestLower.includes('api') || requestLower.includes('backend') || requestLower.includes('server')) {
      projectType = projectType === 'frontend' ? 'fullstack' : 'backend';
      technologies.push('Node.js', 'Express', 'Database');
    }
    if (requestLower.includes('auth') || requestLower.includes('login') || requestLower.includes('user')) {
      technologies.push('Authentication', 'JWT', 'Security');
    }
    if (requestLower.includes('dashboard') || requestLower.includes('admin')) {
      technologies.push('Dashboard', 'Charts', 'Analytics');
    }
    if (requestLower.includes('database') || requestLower.includes('data')) {
      technologies.push('Database', 'Data Modeling', 'API');
    }

    // Determine complexity
    if (requestLower.includes('simple') || requestLower.includes('basic')) {
      complexity = 'low';
    } else if (requestLower.includes('complex') || requestLower.includes('advanced') || requestLower.includes('enterprise')) {
      complexity = 'high';
    }

    // Generate project plan based on analysis
    const plan = this.createProjectTemplate(userRequest, projectType, technologies, complexity, options);
    
    return plan;
  }

  /**
   * Create project template based on detected requirements
   */
  createProjectTemplate(userRequest, projectType, technologies, complexity, options) {
    const baseProject = {
      name: this.extractProjectName(userRequest),
      description: userRequest,
      type: projectType,
      technologies,
      complexity,
      estimatedDays: complexity === 'low' ? 1 : complexity === 'medium' ? 3 : 7,
      requiredWorkers: []
    };

    // Define project templates
    const templates = {
      frontend: {
        milestones: [
          { name: 'Project Setup', tasks: ['Setup React project', 'Configure build tools', 'Setup component structure'] },
          { name: 'Core Components', tasks: ['Create main layout', 'Build key components', 'Implement routing'] },
          { name: 'Styling & UX', tasks: ['Apply styling', 'Responsive design', 'User experience polish'] },
          { name: 'Testing & Deployment', tasks: ['Write tests', 'Performance optimization', 'Deploy application'] }
        ],
        requiredWorkers: ['nova'] // Frontend specialist
      },
      
      backend: {
        milestones: [
          { name: 'API Design', tasks: ['Design API endpoints', 'Setup server structure', 'Database schema'] },
          { name: 'Core Implementation', tasks: ['Implement API routes', 'Database integration', 'Authentication'] },
          { name: 'Security & Validation', tasks: ['Input validation', 'Security measures', 'Error handling'] },
          { name: 'Testing & Documentation', tasks: ['API testing', 'Documentation', 'Performance tuning'] }
        ],
        requiredWorkers: ['zephyr'] // Features engineer
      },
      
      fullstack: {
        milestones: [
          { name: 'Architecture Planning', tasks: ['System design', 'Technology stack', 'Database design'] },
          { name: 'Backend Development', tasks: ['API development', 'Database setup', 'Authentication'] },
          { name: 'Frontend Development', tasks: ['React components', 'API integration', 'User interface'] },
          { name: 'Integration & Testing', tasks: ['Full integration', 'End-to-end testing', 'Deployment'] }
        ],
        requiredWorkers: ['nova', 'zephyr'] // Both frontend and backend
      },
      
      general: {
        milestones: [
          { name: 'Requirements Analysis', tasks: ['Analyze requirements', 'Create project plan', 'Setup structure'] },
          { name: 'Core Development', tasks: ['Implement main features', 'Build core functionality'] },
          { name: 'Integration & Polish', tasks: ['Integrate components', 'Testing', 'User experience'] },
          { name: 'Finalization', tasks: ['Final testing', 'Documentation', 'Deployment prep'] }
        ],
        requiredWorkers: ['nova', 'zephyr'] // Default team
      }
    };

    const template = templates[projectType] || templates.general;
    
    return {
      ...baseProject,
      ...template,
      createdAt: new Date().toISOString(),
      status: 'planning'
    };
  }

  /**
   * Extract a project name from user request
   */
  extractProjectName(userRequest) {
    // Simple extraction - could be enhanced with NLP
    const words = userRequest.split(' ');
    const meaningfulWords = words.filter(word => 
      !['a', 'an', 'the', 'build', 'create', 'make', 'develop'].includes(word.toLowerCase())
    );
    
    return meaningfulWords.slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '') || 'AI Project';
  }

  /**
   * Initialize project structure and configuration
   */
  async initializeProject(projectPlan) {
    // Update project configuration
    const projectConfig = {
      name: projectPlan.name,
      description: projectPlan.description,
      type: projectPlan.type,
      technologies: projectPlan.technologies,
      complexity: projectPlan.complexity,
      estimatedDays: projectPlan.estimatedDays,
      created: projectPlan.createdAt,
      status: 'active',
      autonomous: true,
      template: 'autonomous-ai-company'
    };

    const configPath = path.join(this.aimanagerRoot, 'config', 'project.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSON(configPath, projectConfig, { spaces: 2 });

    console.log(chalk.green(`✅ Project "${projectPlan.name}" initialized`));
    console.log(chalk.gray(`   📊 Type: ${projectPlan.type} | Complexity: ${projectPlan.complexity}`));
    console.log(chalk.gray(`   🛠️  Technologies: ${projectPlan.technologies.join(', ')}`));
  }

  /**
   * Create detailed task breakdown from project plan
   */
  async createTaskBreakdown(projectPlan) {
    const tasks = [];
    let taskId = 1;

    // Convert milestones to specific tasks
    for (const milestone of projectPlan.milestones) {
      for (const taskDescription of milestone.tasks) {
        const task = {
          id: `task-${taskId++}`,
          title: taskDescription,
          description: `${milestone.name}: ${taskDescription}`,
          milestone: milestone.name,
          status: 'pending',
          priority: this.determinePriority(taskDescription, milestone),
          estimated_hours: this.estimateHours(taskDescription),
          created_at: new Date().toISOString(),
          labels: this.generateLabels(taskDescription, projectPlan.technologies),
          assigned_to: null // Will be assigned during worker deployment
        };
        
        tasks.push(task);
      }
    }

    // Save tasks
    const tasksData = {
      tasks,
      milestones: projectPlan.milestones,
      project: projectPlan.name,
      created: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    const tasksPath = path.join(this.aimanagerRoot, 'data', 'tasks.json');
    await fs.ensureDir(path.dirname(tasksPath));
    await fs.writeJSON(tasksPath, tasksData, { spaces: 2 });

    console.log(chalk.green(`✅ Task breakdown created: ${tasks.length} tasks across ${projectPlan.milestones.length} milestones`));
    
    return tasks;
  }

  /**
   * Determine task priority based on content and position
   */
  determinePriority(taskDescription, milestone) {
    const critical = ['setup', 'structure', 'design', 'architecture', 'foundation'];
    const high = ['core', 'main', 'primary', 'essential', 'key'];
    const low = ['polish', 'optimization', 'documentation', 'testing'];

    const desc = taskDescription.toLowerCase();
    
    if (critical.some(word => desc.includes(word))) return 'critical';
    if (high.some(word => desc.includes(word))) return 'high';
    if (low.some(word => desc.includes(word))) return 'low';
    
    return 'medium';
  }

  /**
   * Estimate hours for a task based on description
   */
  estimateHours(taskDescription) {
    const desc = taskDescription.toLowerCase();
    
    if (desc.includes('setup') || desc.includes('configure')) return 2;
    if (desc.includes('design') || desc.includes('architecture')) return 4;
    if (desc.includes('implement') || desc.includes('build')) return 6;
    if (desc.includes('testing') || desc.includes('optimization')) return 3;
    if (desc.includes('documentation')) return 2;
    
    return 4; // Default
  }

  /**
   * Generate relevant labels for tasks
   */
  generateLabels(taskDescription, technologies) {
    const labels = [];
    const desc = taskDescription.toLowerCase();
    
    if (desc.includes('frontend') || desc.includes('ui') || desc.includes('component')) labels.push('frontend');
    if (desc.includes('backend') || desc.includes('api') || desc.includes('server')) labels.push('backend');
    if (desc.includes('database') || desc.includes('data')) labels.push('database');
    if (desc.includes('testing') || desc.includes('test')) labels.push('testing');
    if (desc.includes('security') || desc.includes('auth')) labels.push('security');
    if (desc.includes('deploy') || desc.includes('build')) labels.push('deployment');
    
    // Add technology labels
    technologies.forEach(tech => {
      if (desc.includes(tech.toLowerCase())) {
        labels.push(tech.toLowerCase());
      }
    });
    
    return labels.length > 0 ? labels : ['development'];
  }

  /**
   * Deploy workers and assign tasks
   */
  async deployWorkers(projectPlan) {
    const workersConfig = await this.getWorkersConfig();
    const tasksData = await this.getTasks();
    const tasks = tasksData.tasks || [];

    // Assign tasks to workers based on their specialties
    const assignments = this.assignTasks(tasks, projectPlan.requiredWorkers, workersConfig);

    // Deploy each required worker
    for (const workerId of projectPlan.requiredWorkers) {
      const workerConfig = workersConfig.workers.find(w => w.id === workerId);
      if (!workerConfig) {
        console.warn(chalk.yellow(`⚠️ Worker ${workerId} not found in config, skipping`));
        continue;
      }

      const workerTasks = assignments[workerId] || [];
      
      console.log(chalk.blue(`🚀 Deploying ${workerConfig.name} (${workerConfig.role})`));
      console.log(chalk.gray(`   📋 Assigned ${workerTasks.length} task(s)`));

      // Update task assignments
      await this.assignTasksToWorker(workerId, workerTasks);

      // Spawn the worker terminal
      const taskContext = {
        assignedTasks: workerTasks,
        projectPlan: projectPlan,
        totalWorkers: projectPlan.requiredWorkers.length
      };

      try {
        await this.terminalSpawner.spawnWorker(workerId, workerConfig, taskContext);
        this.workersSpawned.add(workerId);
        
        // Initialize worker status
        await this.initializeWorkerStatus(workerId, workerConfig, workerTasks);
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to deploy worker ${workerId}:`, error.message));
      }
    }

    console.log(chalk.green(`✅ Deployed ${this.workersSpawned.size} autonomous AI workers`));
  }

  /**
   * Intelligent task assignment based on worker specialties
   */
  assignTasks(tasks, requiredWorkers, workersConfig) {
    const assignments = {};
    
    // Initialize assignments
    requiredWorkers.forEach(workerId => {
      assignments[workerId] = [];
    });

    // Get worker specialties
    const workerSpecialties = {};
    requiredWorkers.forEach(workerId => {
      const worker = workersConfig.workers.find(w => w.id === workerId);
      workerSpecialties[workerId] = worker ? worker.specialties : [];
    });

    // Assign tasks based on specialties and labels
    tasks.forEach(task => {
      let bestWorker = null;
      let bestScore = 0;

      requiredWorkers.forEach(workerId => {
        const specialties = workerSpecialties[workerId];
        let score = 0;

        // Score based on specialty match
        task.labels.forEach(label => {
          if (specialties.includes(label)) score += 3;
        });

        // Score based on role compatibility
        const worker = workersConfig.workers.find(w => w.id === workerId);
        if (worker) {
          if (worker.role.includes('Frontend') && task.labels.includes('frontend')) score += 2;
          if (worker.role.includes('Engineer') && task.labels.includes('backend')) score += 2;
          if (worker.role.includes('Manager') && task.priority === 'critical') score += 1;
        }

        // Balance workload
        const currentLoad = assignments[workerId].length;
        score -= currentLoad * 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestWorker = workerId;
        }
      });

      if (bestWorker) {
        assignments[bestWorker].push(task);
      }
    });

    return assignments;
  }

  /**
   * Assign specific tasks to a worker in the database
   */
  async assignTasksToWorker(workerId, tasks) {
    const tasksData = await this.getTasks();
    
    // Update task assignments
    tasks.forEach(task => {
      const taskIndex = tasksData.tasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        tasksData.tasks[taskIndex].assigned_to = workerId;
        tasksData.tasks[taskIndex].assigned_at = new Date().toISOString();
      }
    });

    // Save updated tasks
    const tasksPath = path.join(this.aimanagerRoot, 'data', 'tasks.json');
    await fs.writeJSON(tasksPath, tasksData, { spaces: 2 });
  }

  /**
   * Initialize worker status file
   */
  async initializeWorkerStatus(workerId, workerConfig, assignedTasks) {
    const status = {
      worker_id: workerId,
      last_update: new Date().toISOString(),
      status: 'ready',
      current_focus: 'Getting ready to start assigned tasks',
      today: {
        completed: [],
        in_progress: [],
        planned: assignedTasks.map(t => t.title)
      },
      blockers: [],
      metrics: {
        tasks_assigned: assignedTasks.length,
        tasks_completed: 0,
        tasks_in_progress: 0
      },
      priorities: {
        high: assignedTasks.filter(t => t.priority === 'high' || t.priority === 'critical').map(t => t.title),
        medium: assignedTasks.filter(t => t.priority === 'medium').map(t => t.title),
        low: assignedTasks.filter(t => t.priority === 'low').map(t => t.title)
      },
      comments: `[${new Date().toISOString()}] Autonomous worker deployed by Project Manager`,
      next_24h: assignedTasks.slice(0, 3).map(t => t.title),
      assigned_tasks: assignedTasks.length,
      autonomous: true
    };

    const statusPath = path.join(this.aimanagerRoot, 'data', `worker-${workerId}.json`);
    await fs.ensureDir(path.dirname(statusPath));
    await fs.writeJSON(statusPath, status, { spaces: 2 });
  }

  /**
   * Start continuous autonomous monitoring
   */
  async startAutonomousMode() {
    this.isRunning = true;
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAndCoordinate();
    }, 30000); // Check every 30 seconds

    // Initial coordination
    await this.monitorAndCoordinate();
  }

  /**
   * Monitor worker progress and coordinate activities
   */
  async monitorAndCoordinate() {
    if (!this.isRunning) return;

    try {
      // Check worker status
      const workerStatuses = await this.getAllWorkerStatuses();
      
      // Look for blockers
      const blockedWorkers = workerStatuses.filter(w => w.blockers && w.blockers.length > 0);
      if (blockedWorkers.length > 0) {
        await this.handleBlockers(blockedWorkers);
      }

      // Check for completed milestones
      await this.checkMilestoneProgress();

      // Look for workers needing more tasks
      const idleWorkers = workerStatuses.filter(w => 
        w.today && w.today.in_progress.length === 0 && w.today.planned.length === 0
      );
      if (idleWorkers.length > 0) {
        await this.assignAdditionalTasks(idleWorkers);
      }

      // Update project status
      await this.updateProjectProgress();

    } catch (error) {
      console.error(chalk.red('⚠️ Monitoring error:'), error.message);
    }
  }

  /**
   * Handle worker blockers automatically
   */
  async handleBlockers(blockedWorkers) {
    for (const worker of blockedWorkers) {
      console.log(chalk.yellow(`🚧 Handling blocker for ${worker.worker_id}: ${worker.blockers[0]}`));
      
      // Simple blocker resolution logic
      // In a full system, this would use AI to resolve blockers
      const resolution = `PM: Working on resolving your blocker. Will coordinate with team.`;
      
      await this.addWorkerComment(worker.worker_id, resolution);
    }
  }

  /**
   * Check milestone completion progress
   */
  async checkMilestoneProgress() {
    const tasks = await this.getTasks();
    const milestones = tasks.milestones || [];
    
    for (const milestone of milestones) {
      const milestoneTasks = tasks.tasks.filter(t => t.milestone === milestone.name);
      const completedTasks = milestoneTasks.filter(t => t.status === 'completed');
      
      if (completedTasks.length === milestoneTasks.length && milestoneTasks.length > 0) {
        console.log(chalk.green(`🎉 Milestone completed: ${milestone.name}`));
        // Could trigger next milestone or celebration
      }
    }
  }

  /**
   * Assign additional tasks to idle workers
   */
  async assignAdditionalTasks(idleWorkers) {
    const tasks = await this.getTasks();
    const unassignedTasks = tasks.tasks.filter(t => !t.assigned_to && t.status === 'pending');
    
    if (unassignedTasks.length === 0) return;

    for (const worker of idleWorkers) {
      // Find suitable task for this worker
      const suitableTask = unassignedTasks.find(task => {
        // Simple matching based on labels and worker role
        return task.labels.some(label => worker.worker_id === 'nova' ? 
          ['frontend', 'ui', 'react'].includes(label) : 
          ['backend', 'api', 'features'].includes(label)
        );
      });

      if (suitableTask) {
        await this.assignTasksToWorker(worker.worker_id, [suitableTask]);
        console.log(chalk.blue(`📋 Assigned additional task to ${worker.worker_id}: ${suitableTask.title}`));
      }
    }
  }

  /**
   * Update overall project progress
   */
  async updateProjectProgress() {
    const tasks = await this.getTasks();
    const allTasks = tasks.tasks || [];
    
    const progress = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      blocked: allTasks.filter(t => t.status === 'blocked').length,
      percentage: Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100)
    };

    // Update project config with progress
    const projectPath = path.join(this.aimanagerRoot, 'config', 'project.json');
    if (await fs.pathExists(projectPath)) {
      const projectConfig = await fs.readJSON(projectPath);
      projectConfig.progress = progress;
      projectConfig.last_updated = new Date().toISOString();
      
      await fs.writeJSON(projectPath, projectConfig, { spaces: 2 });
    }
  }

  /**
   * Stop autonomous operations
   */
  async stopAutonomousMode() {
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Terminate all spawned workers
    await this.terminalSpawner.killAllWorkers();
    
    console.log(chalk.yellow('\n⏹️ Autonomous operations stopped'));
    console.log(chalk.gray('🤖 All AI workers terminated'));
  }

  // Helper methods
  async getWorkersConfig() {
    const configPath = path.join(this.aimanagerRoot, 'config', 'workers.json');
    if (await fs.pathExists(configPath)) {
      return await fs.readJSON(configPath);
    }
    throw new Error('Workers configuration not found. Run aimanager init first.');
  }

  async getTasks() {
    const tasksPath = path.join(this.aimanagerRoot, 'data', 'tasks.json');
    if (await fs.pathExists(tasksPath)) {
      return await fs.readJSON(tasksPath);
    }
    return { tasks: [], milestones: [] };
  }

  async getAllWorkerStatuses() {
    const dataDir = path.join(this.aimanagerRoot, 'data');
    const files = await fs.readdir(dataDir);
    const statusFiles = files.filter(f => f.startsWith('worker-') && f.endsWith('.json'));
    
    const statuses = [];
    for (const file of statusFiles) {
      try {
        const status = await fs.readJSON(path.join(dataDir, file));
        statuses.push(status);
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read ${file}`));
      }
    }
    
    return statuses;
  }

  async addWorkerComment(workerId, comment) {
    const statusPath = path.join(this.aimanagerRoot, 'data', `worker-${workerId}.json`);
    if (await fs.pathExists(statusPath)) {
      const status = await fs.readJSON(statusPath);
      const timestamp = new Date().toISOString();
      status.comments = (status.comments || '') + `\n[${timestamp}] ${comment}`;
      status.last_update = timestamp;
      
      await fs.writeJSON(statusPath, status, { spaces: 2 });
    }
  }
}

module.exports = AutonomousProjectManager;