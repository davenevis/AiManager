const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

/**
 * Export project data in various formats
 * Supports JSON and CSV exports
 */

class ExportCommands {
  constructor() {
    this.projectRoot = path.join(process.cwd(), '.aimanager');
  }

  /**
   * Main export function
   */
  async export(options = {}) {
    const format = options.format || 'json';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'aimanager-exports');
    
    try {
      await fs.ensureDir(outputDir);
      
      console.log(chalk.bold.cyan('\\n📤 Exporting AiManager Data:'));
      console.log(chalk.gray('─'.repeat(40)));
      
      if (format === 'json') {
        await this.exportJSON(outputDir, timestamp);
      } else if (format === 'csv') {
        await this.exportCSV(outputDir, timestamp);
      } else {
        throw new Error(`Unsupported export format: ${format}. Supported: json, csv`);
      }
      
      console.log(chalk.green('\\n✅ Export completed successfully!'));
      console.log(chalk.gray(`📁 Files saved to: ${outputDir}`));
      console.log(); // Empty line

    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Export to JSON format
   */
  async exportJSON(outputDir, timestamp) {
    const exportData = await this.gatherAllData();
    
    // Single comprehensive export file
    const mainExportFile = path.join(outputDir, `aimanager-export-${timestamp}.json`);
    await fs.writeJSON(mainExportFile, exportData, { spaces: 2 });
    console.log(chalk.green(`✓ Main export: aimanager-export-${timestamp}.json`));
    
    // Individual section exports
    const sections = ['project', 'workers', 'tasks', 'activity'];
    
    for (const section of sections) {
      if (exportData[section]) {
        const sectionFile = path.join(outputDir, `${section}-${timestamp}.json`);
        await fs.writeJSON(sectionFile, exportData[section], { spaces: 2 });
        console.log(chalk.blue(`  ↳ ${section}-${timestamp}.json`));
      }
    }
  }

  /**
   * Export to CSV format
   */
  async exportCSV(outputDir, timestamp) {
    const exportData = await this.gatherAllData();
    
    // Export workers as CSV
    if (exportData.workers && exportData.workers.workers) {
      const workersCSV = await this.workersToCSV(exportData.workers.workers, exportData.activity);
      const workersFile = path.join(outputDir, `workers-${timestamp}.csv`);
      await fs.writeFile(workersFile, workersCSV, 'utf8');
      console.log(chalk.green(`✓ Workers: workers-${timestamp}.csv`));
    }
    
    // Export tasks as CSV
    if (exportData.tasks && exportData.tasks.tasks) {
      const tasksCSV = await this.tasksToCSV(exportData.tasks.tasks);
      const tasksFile = path.join(outputDir, `tasks-${timestamp}.csv`);
      await fs.writeFile(tasksFile, tasksCSV, 'utf8');
      console.log(chalk.green(`✓ Tasks: tasks-${timestamp}.csv`));
    }
    
    // Export activity summary as CSV
    if (exportData.activity) {
      const activityCSV = await this.activityToCSV(exportData.activity);
      const activityFile = path.join(outputDir, `activity-${timestamp}.csv`);
      await fs.writeFile(activityFile, activityCSV, 'utf8');
      console.log(chalk.green(`✓ Activity: activity-${timestamp}.csv`));
    }
  }

  /**
   * Gather all project data
   */
  async gatherAllData() {
    const data = {
      export_info: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        format: 'aimanager-export'
      }
    };

    // Project configuration
    try {
      const projectPath = path.join(this.projectRoot, 'config', 'project.json');
      if (await fs.pathExists(projectPath)) {
        data.project = await fs.readJSON(projectPath);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not export project config'));
    }

    // Workers configuration
    try {
      const workersPath = path.join(this.projectRoot, 'config', 'workers.json');
      if (await fs.pathExists(workersPath)) {
        data.workers = await fs.readJSON(workersPath);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not export workers config'));
    }

    // Tasks
    try {
      const tasksPath = path.join(this.projectRoot, 'data', 'tasks.json');
      if (await fs.pathExists(tasksPath)) {
        data.tasks = await fs.readJSON(tasksPath);
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not export tasks'));
    }

    // Worker activity data
    data.activity = await this.gatherActivityData();

    return data;
  }

  /**
   * Gather worker activity data
   */
  async gatherActivityData() {
    const activity = {
      workers: {},
      summary: {
        total_completed: 0,
        total_in_progress: 0,
        total_blocked: 0,
        last_activity: null
      }
    };

    try {
      const dataDir = path.join(this.projectRoot, 'data');
      if (!(await fs.pathExists(dataDir))) {
        return activity;
      }

      const files = await fs.readdir(dataDir);
      const workerFiles = files.filter(file => file.startsWith('worker-') && file.endsWith('.json'));

      for (const file of workerFiles) {
        try {
          const workerId = file.replace('worker-', '').replace('.json', '');
          const workerData = await fs.readJSON(path.join(dataDir, file));
          
          activity.workers[workerId] = workerData;

          // Update summary
          if (workerData.today) {
            activity.summary.total_completed += (workerData.today.completed || []).length;
            activity.summary.total_in_progress += (workerData.today.in_progress || []).length;
          }
          
          activity.summary.total_blocked += (workerData.blockers || []).length;

          // Track last activity
          if (workerData.last_update) {
            const updateTime = new Date(workerData.last_update);
            if (!activity.summary.last_activity || updateTime > new Date(activity.summary.last_activity)) {
              activity.summary.last_activity = workerData.last_update;
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read worker file ${file}`));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not gather activity data'));
    }

    return activity;
  }

  /**
   * Convert workers data to CSV
   */
  async workersToCSV(workers, activity) {
    const headers = [
      'ID', 'Name', 'Role', 'Avatar', 'Status', 'Current Focus',
      'Completed Today', 'In Progress', 'Blockers', 'Last Update'
    ];

    let csv = headers.join(',') + '\\n';

    for (const worker of workers) {
      const workerActivity = activity.workers[worker.id] || {};
      const row = [
        this.escapeCSV(worker.id),
        this.escapeCSV(worker.name),
        this.escapeCSV(worker.role),
        this.escapeCSV(worker.avatar || ''),
        this.escapeCSV(workerActivity.status || 'offline'),
        this.escapeCSV(workerActivity.current_focus || ''),
        (workerActivity.today?.completed || []).length,
        (workerActivity.today?.in_progress || []).length,
        (workerActivity.blockers || []).length,
        this.escapeCSV(workerActivity.last_update || '')
      ];
      
      csv += row.join(',') + '\\n';
    }

    return csv;
  }

  /**
   * Convert tasks data to CSV
   */
  async tasksToCSV(tasks) {
    const headers = [
      'ID', 'Title', 'Description', 'Status', 'Priority', 'Assigned To',
      'Estimated Hours', 'Due Date', 'Created', 'Started', 'Completed', 'Labels'
    ];

    let csv = headers.join(',') + '\\n';

    for (const task of tasks) {
      const row = [
        this.escapeCSV(task.id || ''),
        this.escapeCSV(task.title || ''),
        this.escapeCSV(task.description || ''),
        this.escapeCSV(task.status || 'pending'),
        this.escapeCSV(task.priority || 'medium'),
        this.escapeCSV(task.assigned_to || ''),
        task.estimated_hours || '',
        this.escapeCSV(task.due_date || ''),
        this.escapeCSV(task.created_at || ''),
        this.escapeCSV(task.started_at || ''),
        this.escapeCSV(task.completed_at || ''),
        this.escapeCSV((task.labels || []).join('; '))
      ];
      
      csv += row.join(',') + '\\n';
    }

    return csv;
  }

  /**
   * Convert activity summary to CSV
   */
  async activityToCSV(activity) {
    const headers = ['Worker ID', 'Status', 'Completed Tasks', 'In Progress Tasks', 'Blocked Items', 'Comments Count', 'Last Update'];
    let csv = headers.join(',') + '\\n';

    for (const [workerId, data] of Object.entries(activity.workers)) {
      const commentsCount = data.comments ? data.comments.split('\\n').length : 0;
      
      const row = [
        this.escapeCSV(workerId),
        this.escapeCSV(data.status || 'offline'),
        (data.today?.completed || []).length,
        (data.today?.in_progress || []).length,
        (data.blockers || []).length,
        commentsCount,
        this.escapeCSV(data.last_update || '')
      ];
      
      csv += row.join(',') + '\\n';
    }

    return csv;
  }

  /**
   * Escape CSV field
   */
  escapeCSV(field) {
    const str = String(field || '');
    if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

const exportCommands = new ExportCommands();

module.exports = (options) => exportCommands.export(options);