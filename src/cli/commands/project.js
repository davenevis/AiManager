const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

/**
 * Project information commands
 * Displays project details and statistics
 */

class ProjectCommands {
  constructor() {
    this.projectRoot = path.join(process.cwd(), '.aimanager');
  }

  /**
   * Show comprehensive project information
   */
  async showProject() {
    try {
      console.log(chalk.bold.cyan('\\n🚀 AiManager Project Information:'));
      console.log(chalk.gray('═'.repeat(60)));

      // Project basic info
      await this.showProjectDetails();
      
      // Workers overview
      await this.showWorkersOverview();
      
      // Activity summary
      await this.showActivitySummary();
      
      // File system info
      await this.showFileSystemInfo();
      
      console.log(); // Empty line

    } catch (error) {
      throw new Error(`Failed to show project information: ${error.message}`);
    }
  }

  /**
   * Show project basic details
   */
  async showProjectDetails() {
    const projectConfigPath = path.join(this.projectRoot, 'config', 'project.json');
    
    if (await fs.pathExists(projectConfigPath)) {
      const project = await fs.readJSON(projectConfigPath);
      
      console.log(chalk.bold('\\n📋 Project Details:'));
      console.log(`  Name: ${chalk.cyan(project.name || 'Unnamed Project')}`);
      console.log(`  Description: ${project.description || 'No description'}`);
      console.log(`  Template: ${project.template || 'default'}`);
      console.log(`  Created: ${project.created ? new Date(project.created).toLocaleString() : 'Unknown'}`);
      console.log(`  Directory: ${chalk.gray(this.projectRoot)}`);
      
      if (project.repository) {
        console.log(`  Repository: ${chalk.blue(project.repository)}`);
      }
      
      if (project.version) {
        console.log(`  Version: ${project.version}`);
      }
    } else {
      console.log(chalk.yellow('\\n⚠️ Project configuration not found'));
    }
  }

  /**
   * Show workers overview
   */
  async showWorkersOverview() {
    const workersConfigPath = path.join(this.projectRoot, 'config', 'workers.json');
    
    if (await fs.pathExists(workersConfigPath)) {
      const workersConfig = await fs.readJSON(workersConfigPath);
      const workers = workersConfig.workers || [];
      
      console.log(chalk.bold('\\n👥 Workers Overview:'));
      console.log(`  Total Workers: ${chalk.cyan(workers.length)}`);
      
      if (workers.length > 0) {
        // Status summary
        const statusCounts = { active: 0, ready: 0, blocked: 0, offline: 0 };
        
        for (const worker of workers) {
          const statusFile = path.join(this.projectRoot, 'data', `worker-${worker.id}.json`);
          
          if (await fs.pathExists(statusFile)) {
            try {
              const status = await fs.readJSON(statusFile);
              const currentStatus = status.status || 'offline';
              statusCounts[currentStatus] = (statusCounts[currentStatus] || 0) + 1;
            } catch {
              statusCounts.offline++;
            }
          } else {
            statusCounts.offline++;
          }
        }
        
        console.log(`  Status: ${chalk.green(statusCounts.active + ' active')} • ${chalk.yellow(statusCounts.ready + ' ready')} • ${chalk.red(statusCounts.blocked + ' blocked')} • ${chalk.gray(statusCounts.offline + ' offline')}`);
        
        // Worker list
        console.log('\\n  Worker List:');
        for (const worker of workers) {
          console.log(`    ${worker.avatar} ${chalk.bold(worker.name)} - ${chalk.gray(worker.role)} (${worker.id})`);
        }
      }
    } else {
      console.log(chalk.yellow('\\n⚠️ No workers configured'));
    }
  }

  /**
   * Show activity summary
   */
  async showActivitySummary() {
    console.log(chalk.bold('\\n📊 Activity Summary:'));
    
    const dataDir = path.join(this.projectRoot, 'data');
    
    if (!(await fs.pathExists(dataDir))) {
      console.log('  No activity data found');
      return;
    }
    
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalBlocked = 0;
    let totalComments = 0;
    let lastActivity = null;
    
    // Count tasks from tasks.json
    const tasksFile = path.join(dataDir, 'tasks.json');
    if (await fs.pathExists(tasksFile)) {
      try {
        const tasksData = await fs.readJSON(tasksFile);
        const tasks = tasksData.tasks || [];
        
        const taskCounts = {
          completed: tasks.filter(t => t.status === 'completed').length,
          in_progress: tasks.filter(t => t.status === 'in_progress').length,
          blocked: tasks.filter(t => t.status === 'blocked').length,
          pending: tasks.filter(t => !t.status || t.status === 'pending').length
        };
        
        console.log(`  Tasks: ${chalk.green(taskCounts.completed + ' done')} • ${chalk.yellow(taskCounts.in_progress + ' active')} • ${chalk.blue(taskCounts.pending + ' pending')} • ${chalk.red(taskCounts.blocked + ' blocked')}`);
      } catch (error) {
        console.log(`  Tasks: ${chalk.red('Error reading tasks file')}`);
      }
    }
    
    // Aggregate worker activity
    const workerFiles = await fs.readdir(dataDir);
    const statusFiles = workerFiles.filter(file => file.startsWith('worker-') && file.endsWith('.json'));
    
    for (const file of statusFiles) {
      try {
        const workerData = await fs.readJSON(path.join(dataDir, file));
        
        // Count today's activities
        if (workerData.today) {
          totalCompleted += (workerData.today.completed || []).length;
          totalInProgress += (workerData.today.in_progress || []).length;
        }
        
        totalBlocked += (workerData.blockers || []).length;
        
        // Count comments
        if (workerData.comments) {
          totalComments += workerData.comments.split('\\n').length;
        }
        
        // Track last activity
        if (workerData.last_update) {
          const updateTime = new Date(workerData.last_update);
          if (!lastActivity || updateTime > lastActivity) {
            lastActivity = updateTime;
          }
        }
      } catch (error) {
        // Skip corrupted files
        continue;
      }
    }
    
    console.log(`  Today's Work: ${chalk.green(totalCompleted + ' completed')} • ${chalk.yellow(totalInProgress + ' in progress')}`);
    console.log(`  Blockers: ${chalk.red(totalBlocked)}`);
    console.log(`  Comments: ${chalk.blue(totalComments)}`);
    console.log(`  Last Activity: ${lastActivity ? chalk.gray(lastActivity.toLocaleString()) : 'No recent activity'}`);
  }

  /**
   * Show file system information
   */
  async showFileSystemInfo() {
    console.log(chalk.bold('\\n💾 File System:'));
    
    try {
      // Count files in each directory
      const configDir = path.join(this.projectRoot, 'config');
      const dataDir = path.join(this.projectRoot, 'data');
      const backupDir = path.join(this.projectRoot, 'data', '.backups');
      const instructionsDir = path.join(this.projectRoot, 'instructions');
      
      let configCount = 0, dataCount = 0, backupCount = 0, instructionsCount = 0;
      
      if (await fs.pathExists(configDir)) {
        configCount = (await fs.readdir(configDir)).length;
      }
      
      if (await fs.pathExists(dataDir)) {
        dataCount = (await fs.readdir(dataDir)).filter(file => !file.startsWith('.')).length;
      }
      
      if (await fs.pathExists(backupDir)) {
        backupCount = (await fs.readdir(backupDir)).length;
      }
      
      if (await fs.pathExists(instructionsDir)) {
        instructionsCount = (await fs.readdir(instructionsDir)).length;
      }
      
      console.log(`  Config files: ${chalk.cyan(configCount)}`);
      console.log(`  Data files: ${chalk.cyan(dataCount)}`);
      console.log(`  Backup files: ${chalk.cyan(backupCount)}`);
      console.log(`  Instruction files: ${chalk.cyan(instructionsCount)}`);
      
      // Calculate total size
      const stats = await fs.stat(this.projectRoot);
      console.log(`  Project size: ${chalk.gray('~' + this.formatBytes(await this.getDirectorySize(this.projectRoot)))}`);
      
    } catch (error) {
      console.log(`  ${chalk.red('Error reading file system information')}`);
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    let size = 0;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(itemPath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return size;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

const projectCommands = new ProjectCommands();

module.exports = {
  showProject: () => projectCommands.showProject()
};