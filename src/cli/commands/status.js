const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const fileOps = require('../../core/file-operations');

/**
 * Worker status commands for Claude agents
 * Layer 1: Command-Based Interface (Prevention)
 */

class StatusCommands {
  constructor() {
    this.validStatuses = ['active', 'ready', 'blocked', 'offline'];
  }

  /**
   * Get current worker ID for this Claude agent
   */
  async getCurrentWorkerId() {
    try {
      // Try environment variable first
      if (process.env.AIMANAGER_WORKER_ID) {
        return process.env.AIMANAGER_WORKER_ID;
      }

      // Try to read from worker config
      const configPath = path.join(process.cwd(), '.aimanager', 'config', 'worker.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJSON(configPath);
        return config.worker_id;
      }

      // Prompt for worker ID if not found
      const inquirer = require('inquirer');
      const workersConfigPath = path.join(process.cwd(), '.aimanager', 'config', 'workers.json');
      
      if (await fs.pathExists(workersConfigPath)) {
        const workersConfig = await fs.readJSON(workersConfigPath);
        const workerChoices = workersConfig.workers.map(w => ({
          name: `${w.name} (${w.role})`,
          value: w.id
        }));

        const { workerId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'workerId',
            message: 'Select your worker identity:',
            choices: workerChoices
          }
        ]);

        // Save worker ID for future use
        await fs.writeJSON(configPath, { worker_id: workerId }, { spaces: 2 });
        
        console.log(chalk.green(`✓ Worker identity set to: ${workerId}`));
        return workerId;
      }

      throw new Error('No workers configured. Run aimanager init first.');
    } catch (error) {
      throw new Error(`Failed to determine worker identity: ${error.message}`);
    }
  }

  /**
   * Set worker status
   */
  async setStatus(status) {
    if (!this.validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${this.validStatuses.join(', ')}`);
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      await fileOps.updateWorkerStatus(workerId, { status });
      
      const statusIcon = this.getStatusIcon(status);
      console.log(chalk.green(`${statusIcon} Status updated to: ${chalk.bold(status)}`));
    } catch (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Set current focus/work description
   */
  async setFocus(description) {
    if (!description || description.trim().length === 0) {
      throw new Error('Focus description cannot be empty');
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      await fileOps.updateWorkerStatus(workerId, { 
        current_focus: description.trim() 
      });
      
      console.log(chalk.green(`🎯 Focus updated: ${chalk.italic(description)}`));
    } catch (error) {
      throw new Error(`Failed to update focus: ${error.message}`);
    }
  }

  /**
   * Add completed tasks
   */
  async addCompleted(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Must provide at least one completed task');
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const completed = currentData.today?.completed || [];
      
      // Add new completed tasks
      const newCompleted = [...completed, ...tasks.map(t => t.trim())];
      
      await fileOps.updateWorkerStatus(workerId, { 
        today: {
          ...currentData.today,
          completed: newCompleted
        }
      });
      
      console.log(chalk.green(`✅ Marked ${tasks.length} task(s) as completed:`));
      tasks.forEach(task => {
        console.log(chalk.green(`   • ${task}`));
      });
    } catch (error) {
      throw new Error(`Failed to add completed tasks: ${error.message}`);
    }
  }

  /**
   * Add task to currently working on
   */
  async addWorking(task) {
    if (!task || task.trim().length === 0) {
      throw new Error('Working task description cannot be empty');
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const inProgress = currentData.today?.in_progress || [];
      
      // Add new working task if not already there
      const taskTrimmed = task.trim();
      if (!inProgress.includes(taskTrimmed)) {
        inProgress.push(taskTrimmed);
        
        await fileOps.updateWorkerStatus(workerId, { 
          today: {
            ...currentData.today,
            in_progress: inProgress
          }
        });
        
        console.log(chalk.yellow(`🔄 Now working on: ${chalk.italic(taskTrimmed)}`));
      } else {
        console.log(chalk.yellow(`Already working on: ${taskTrimmed}`));
      }
    } catch (error) {
      throw new Error(`Failed to add working task: ${error.message}`);
    }
  }

  /**
   * Add blocker
   */
  async addBlocker(description) {
    if (!description || description.trim().length === 0) {
      throw new Error('Blocker description cannot be empty');
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const blockers = currentData.blockers || [];
      
      // Add new blocker if not already there
      const blockerTrimmed = description.trim();
      if (!blockers.includes(blockerTrimmed)) {
        blockers.push(blockerTrimmed);
        
        await fileOps.updateWorkerStatus(workerId, { 
          blockers,
          status: 'blocked' // Auto-set status to blocked
        });
        
        console.log(chalk.red(`⚠️  Blocker reported: ${chalk.italic(blockerTrimmed)}`));
        console.log(chalk.yellow(`   Status automatically set to: blocked`));
      } else {
        console.log(chalk.yellow(`Blocker already reported: ${blockerTrimmed}`));
      }
    } catch (error) {
      throw new Error(`Failed to add blocker: ${error.message}`);
    }
  }

  /**
   * Add comment
   */
  async addComment(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    const workerId = await this.getCurrentWorkerId();
    
    try {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const timestamp = new Date().toLocaleString();
      const newComment = `[${timestamp}] ${text.trim()}`;
      
      // Append to existing comments
      const existingComments = currentData.comments || '';
      const updatedComments = existingComments 
        ? `${existingComments}\n${newComment}`
        : newComment;
      
      await fileOps.updateWorkerStatus(workerId, { 
        comments: updatedComments
      });
      
      console.log(chalk.blue(`💬 Comment added: ${chalk.italic(text)}`));
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Show current worker status
   */
  async showStatus() {
    const workerId = await this.getCurrentWorkerId();
    
    try {
      const data = await fileOps.readWorkerStatus(workerId);
      
      console.log(chalk.bold.cyan(`\n📊 Status for ${workerId.toUpperCase()}:`));
      console.log(chalk.gray('─'.repeat(40)));
      
      // Status
      const statusIcon = this.getStatusIcon(data.status);
      console.log(`${statusIcon} Status: ${chalk.bold(data.status || 'ready')}`);
      
      // Current focus
      if (data.current_focus) {
        console.log(`🎯 Focus: ${chalk.italic(data.current_focus)}`);
      }
      
      // Today's work
      if (data.today) {
        if (data.today.completed?.length > 0) {
          console.log(`\n✅ Completed (${data.today.completed.length}):`);
          data.today.completed.forEach(task => {
            console.log(chalk.green(`   • ${task}`));
          });
        }
        
        if (data.today.in_progress?.length > 0) {
          console.log(`\n🔄 In Progress (${data.today.in_progress.length}):`);
          data.today.in_progress.forEach(task => {
            console.log(chalk.yellow(`   • ${task}`));
          });
        }
        
        if (data.today.planned?.length > 0) {
          console.log(`\n📅 Planned (${data.today.planned.length}):`);
          data.today.planned.forEach(task => {
            console.log(chalk.blue(`   • ${task}`));
          });
        }
      }
      
      // Blockers
      if (data.blockers?.length > 0) {
        console.log(chalk.red(`\n⚠️  Blockers (${data.blockers.length}):`));
        data.blockers.forEach(blocker => {
          console.log(chalk.red(`   • ${blocker}`));
        });
      }
      
      // Comments
      if (data.comments) {
        console.log(chalk.blue(`\n💬 Recent Comments:`));
        const comments = data.comments.split('\n').slice(-3); // Show last 3 comments
        comments.forEach(comment => {
          console.log(chalk.blue(`   ${comment}`));
        });
      }
      
      // Last update
      if (data.last_update) {
        const updateTime = new Date(data.last_update).toLocaleString();
        console.log(chalk.gray(`\n🕒 Last updated: ${updateTime}`));
      }
      
      console.log(); // Empty line
    } catch (error) {
      throw new Error(`Failed to show status: ${error.message}`);
    }
  }

  /**
   * Show all team members status
   */
  async showTeam() {
    try {
      const workersConfigPath = path.join(process.cwd(), '.aimanager', 'config', 'workers.json');
      if (!(await fs.pathExists(workersConfigPath))) {
        throw new Error('Workers configuration not found');
      }
      
      const workersConfig = await fs.readJSON(workersConfigPath);
      
      console.log(chalk.bold.cyan('\n👥 Team Status:'));
      console.log(chalk.gray('═'.repeat(50)));
      
      for (const worker of workersConfig.workers) {
        const data = await fileOps.readWorkerStatus(worker.id);
        
        const statusIcon = this.getStatusIcon(data.status);
        const statusColor = this.getStatusColor(data.status);
        
        console.log(`\n${worker.avatar} ${chalk.bold(worker.name)} (${worker.role})`);
        console.log(`   ${statusIcon} ${statusColor(data.status || 'ready')}`);
        
        if (data.current_focus) {
          console.log(`   🎯 ${chalk.italic(data.current_focus)}`);
        }
        
        const completed = data.today?.completed?.length || 0;
        const inProgress = data.today?.in_progress?.length || 0;
        const blockers = data.blockers?.length || 0;
        
        console.log(`   📊 ${completed} done • ${inProgress} active • ${blockers} blocked`);
        
        if (data.last_update) {
          const updateTime = new Date(data.last_update).toLocaleString();
          console.log(chalk.gray(`   🕒 ${updateTime}`));
        }
      }
      
      console.log(); // Empty line
    } catch (error) {
      throw new Error(`Failed to show team status: ${error.message}`);
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      active: '🟢',
      ready: '🟡',
      blocked: '🔴',
      offline: '⚫'
    };
    return icons[status] || '❓';
  }

  /**
   * Get status color function
   */
  getStatusColor(status) {
    const colors = {
      active: chalk.green,
      ready: chalk.yellow,
      blocked: chalk.red,
      offline: chalk.gray
    };
    return colors[status] || chalk.white;
  }

  /**
   * Batch update multiple fields
   */
  async batchUpdate(options) {
    const workerId = await this.getCurrentWorkerId();
    const updates = {};
    
    if (options.status && this.validStatuses.includes(options.status)) {
      updates.status = options.status;
    }
    
    if (options.focus) {
      updates.current_focus = options.focus.trim();
    }
    
    if (options.completed) {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const completed = currentData.today?.completed || [];
      const newTasks = Array.isArray(options.completed) 
        ? options.completed 
        : [options.completed];
      
      updates.today = {
        ...currentData.today,
        completed: [...completed, ...newTasks.map(t => t.trim())]
      };
    }
    
    if (options.working) {
      const currentData = await fileOps.readWorkerStatus(workerId);
      const inProgress = currentData.today?.in_progress || [];
      const newTask = options.working.trim();
      
      if (!inProgress.includes(newTask)) {
        updates.today = {
          ...currentData.today,
          in_progress: [...inProgress, newTask]
        };
      }
    }
    
    if (Object.keys(updates).length === 0) {
      console.log(chalk.yellow('No valid updates provided'));
      return;
    }
    
    try {
      await fileOps.updateWorkerStatus(workerId, updates);
      console.log(chalk.green(`✓ Batch update completed for ${Object.keys(updates).length} field(s)`));
    } catch (error) {
      throw new Error(`Batch update failed: ${error.message}`);
    }
  }
}

const statusCommands = new StatusCommands();

module.exports = {
  setStatus: (status) => statusCommands.setStatus(status),
  setFocus: (description) => statusCommands.setFocus(description),
  addCompleted: (tasks) => statusCommands.addCompleted(tasks),
  addWorking: (task) => statusCommands.addWorking(task),
  addBlocker: (description) => statusCommands.addBlocker(description),
  addComment: (text) => statusCommands.addComment(text),
  showStatus: () => statusCommands.showStatus(),
  showTeam: () => statusCommands.showTeam(),
  batchUpdate: (options) => statusCommands.batchUpdate(options)
};