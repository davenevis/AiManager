const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const fileOps = require('../../core/file-operations');

/**
 * Task management commands for Claude agents
 * Handles viewing and managing assigned tasks
 */

class TaskCommands {
  constructor() {
    this.projectRoot = path.join(process.cwd(), '.aimanager');
    this.tasksFile = path.join(this.projectRoot, 'data', 'tasks.json');
  }

  /**
   * Show all tasks for current worker
   */
  async showTasks() {
    try {
      // Get current worker ID
      const workerId = await this.getCurrentWorkerId();
      
      // Read tasks file
      const tasksData = await this.readTasksFile();
      
      // Filter tasks for current worker
      const myTasks = tasksData.tasks.filter(task => 
        task.assigned_to === workerId || !task.assigned_to
      );
      
      console.log(chalk.bold.cyan(`\\n📋 Tasks for ${workerId.toUpperCase()}:`));
      console.log(chalk.gray('─'.repeat(50)));
      
      if (myTasks.length === 0) {
        console.log(chalk.yellow('No tasks assigned yet.'));
        console.log(chalk.gray('Check back later or contact your project manager.'));
        return;
      }
      
      // Group tasks by status
      const pending = myTasks.filter(task => !task.status || task.status === 'pending');
      const inProgress = myTasks.filter(task => task.status === 'in_progress');
      const completed = myTasks.filter(task => task.status === 'completed');
      const blocked = myTasks.filter(task => task.status === 'blocked');
      
      // Display tasks by status
      if (pending.length > 0) {
        console.log(chalk.blue(`\\n📅 Pending (${pending.length}):`));
        pending.forEach((task, index) => {
          this.displayTask(task, index + 1);
        });
      }
      
      if (inProgress.length > 0) {
        console.log(chalk.yellow(`\\n🔄 In Progress (${inProgress.length}):`));
        inProgress.forEach((task, index) => {
          this.displayTask(task, index + 1);
        });
      }
      
      if (blocked.length > 0) {
        console.log(chalk.red(`\\n⚠️ Blocked (${blocked.length}):`));
        blocked.forEach((task, index) => {
          this.displayTask(task, index + 1);
        });
      }
      
      if (completed.length > 0) {
        console.log(chalk.green(`\\n✅ Completed (${completed.length}):`));
        completed.forEach((task, index) => {
          this.displayTask(task, index + 1);
        });
      }
      
      // Show summary
      console.log(chalk.gray(`\\n📊 Summary: ${pending.length} pending • ${inProgress.length} active • ${completed.length} done • ${blocked.length} blocked`));
      console.log(); // Empty line
      
    } catch (error) {
      throw new Error(`Failed to show tasks: ${error.message}`);
    }
  }

  /**
   * Display a single task
   */
  displayTask(task, number) {
    const priority = task.priority || 'medium';
    const priorityIcon = {
      high: '🔥',
      medium: '📋',
      low: '📝'
    }[priority];
    
    const statusIcon = {
      pending: '📅',
      in_progress: '🔄',
      completed: '✅',
      blocked: '⚠️'
    }[task.status] || '📋';
    
    console.log(`   ${statusIcon} ${priorityIcon} [${number}] ${task.title}`);
    
    if (task.description && task.description !== task.title) {
      console.log(chalk.gray(`       ${task.description}`));
    }
    
    // Show additional details
    const details = [];
    
    if (task.estimated_hours) {
      details.push(`⏱️ ${task.estimated_hours}h`);
    }
    
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const isOverdue = dueDate < new Date();
      const dateStr = dueDate.toLocaleDateString();
      details.push(isOverdue ? chalk.red(`📅 ${dateStr} (overdue)`) : `📅 ${dateStr}`);
    }
    
    if (task.labels && task.labels.length > 0) {
      details.push(`🏷️ ${task.labels.join(', ')}`);
    }
    
    if (details.length > 0) {
      console.log(chalk.gray(`       ${details.join(' • ')}`));
    }
    
    if (task.notes) {
      console.log(chalk.gray(`       💬 ${task.notes}`));
    }
  }

  /**
   * Take (claim) a task
   */
  async takeTask(taskId) {
    try {
      const workerId = await this.getCurrentWorkerId();
      const tasksData = await this.readTasksFile();
      
      const taskIndex = tasksData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (task.assigned_to && task.assigned_to !== workerId) {
        throw new Error(`Task is already assigned to ${task.assigned_to}`);
      }
      
      // Update task
      tasksData.tasks[taskIndex] = {
        ...task,
        assigned_to: workerId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      
      await this.writeTasksFile(tasksData);
      
      console.log(chalk.green(`✅ Task claimed: ${task.title}`));
      console.log(chalk.gray(`   Status changed to: in_progress`));
      
    } catch (error) {
      throw new Error(`Failed to take task: ${error.message}`);
    }
  }

  /**
   * Start working on a task (update status to in_progress)
   */
  async startTask(taskId) {
    try {
      const workerId = await this.getCurrentWorkerId();
      const tasksData = await this.readTasksFile();
      
      const taskIndex = tasksData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (task.assigned_to !== workerId) {
        throw new Error(`Task is not assigned to you (assigned to: ${task.assigned_to || 'unassigned'})`);
      }
      
      // Update task
      tasksData.tasks[taskIndex] = {
        ...task,
        status: 'in_progress',
        started_at: task.started_at || new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      
      await this.writeTasksFile(tasksData);
      
      console.log(chalk.green(`🔄 Started task: ${task.title}`));
      
    } catch (error) {
      throw new Error(`Failed to start task: ${error.message}`);
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId) {
    try {
      const workerId = await this.getCurrentWorkerId();
      const tasksData = await this.readTasksFile();
      
      const taskIndex = tasksData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (task.assigned_to !== workerId) {
        throw new Error(`Task is not assigned to you (assigned to: ${task.assigned_to || 'unassigned'})`);
      }
      
      // Update task
      tasksData.tasks[taskIndex] = {
        ...task,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      
      await this.writeTasksFile(tasksData);
      
      console.log(chalk.green(`✅ Task completed: ${task.title}`));
      
    } catch (error) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  /**
   * Block a task with reason
   */
  async blockTask(taskId, reason) {
    try {
      const workerId = await this.getCurrentWorkerId();
      const tasksData = await this.readTasksFile();
      
      const taskIndex = tasksData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (task.assigned_to !== workerId) {
        throw new Error(`Task is not assigned to you (assigned to: ${task.assigned_to || 'unassigned'})`);
      }
      
      // Update task
      tasksData.tasks[taskIndex] = {
        ...task,
        status: 'blocked',
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      
      await this.writeTasksFile(tasksData);
      
      console.log(chalk.red(`⚠️ Task blocked: ${task.title}`));
      console.log(chalk.red(`   Reason: ${reason}`));
      
    } catch (error) {
      throw new Error(`Failed to block task: ${error.message}`);
    }
  }

  /**
   * Add comment to task
   */
  async commentTask(taskId, comment) {
    try {
      const workerId = await this.getCurrentWorkerId();
      const tasksData = await this.readTasksFile();
      
      const taskIndex = tasksData.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = tasksData.tasks[taskIndex];
      
      // Create comment
      const newComment = {
        id: Date.now().toString(),
        author: workerId,
        text: comment,
        timestamp: new Date().toISOString()
      };
      
      // Update task
      tasksData.tasks[taskIndex] = {
        ...task,
        comments: [...(task.comments || []), newComment],
        last_updated: new Date().toISOString()
      };
      
      await this.writeTasksFile(tasksData);
      
      console.log(chalk.blue(`💬 Comment added to: ${task.title}`));
      
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get current worker ID
   */
  async getCurrentWorkerId() {
    // Try environment variable first
    if (process.env.AIMANAGER_WORKER_ID) {
      return process.env.AIMANAGER_WORKER_ID;
    }
    
    // Try to read from worker config
    const configPath = path.join(this.projectRoot, 'config', 'worker.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      return config.worker_id;
    }
    
    throw new Error('Worker ID not found. Run commands from a worker context.');
  }

  /**
   * Read tasks file safely
   */
  async readTasksFile() {
    await fs.ensureDir(path.dirname(this.tasksFile));
    
    if (!(await fs.pathExists(this.tasksFile))) {
      return {
        tasks: [],
        last_updated: new Date().toISOString()
      };
    }
    
    try {
      const content = await fs.readFile(this.tasksFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(chalk.yellow('Tasks file corrupted, starting fresh'));
      return {
        tasks: [],
        last_updated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Write tasks file safely
   */
  async writeTasksFile(data) {
    const lockId = await fileOps.acquireLock(this.tasksFile);
    
    try {
      const updatedData = {
        ...data,
        last_updated: new Date().toISOString()
      };
      
      await fileOps.atomicWrite(this.tasksFile, updatedData, lockId);
    } catch (error) {
      await fileOps.releaseLock(this.tasksFile, lockId);
      throw error;
    }
  }
}

const taskCommands = new TaskCommands();

module.exports = {
  showTasks: () => taskCommands.showTasks(),
  takeTask: (taskId) => taskCommands.takeTask(taskId),
  startTask: (taskId) => taskCommands.startTask(taskId),
  completeTask: (taskId) => taskCommands.completeTask(taskId),
  blockTask: (taskId, reason) => taskCommands.blockTask(taskId, reason),
  commentTask: (taskId, comment) => taskCommands.commentTask(taskId, comment)
};