const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

/**
 * Backup and restore commands
 * Creates compressed backups of the entire .aimanager directory
 */

class BackupCommands {
  constructor() {
    this.projectRoot = path.join(process.cwd(), '.aimanager');
    this.backupDir = path.join(process.cwd(), 'aimanager-backups');
  }

  /**
   * Create a full backup of the project
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `aimanager-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      console.log(chalk.bold.cyan('\\n💾 Creating AiManager Backup:'));
      console.log(chalk.gray('─'.repeat(40)));

      // Ensure backup directory exists
      await fs.ensureDir(this.backupDir);

      // Check if project exists
      if (!(await fs.pathExists(this.projectRoot))) {
        throw new Error('No AiManager project found in current directory');
      }

      // Create backup info
      const backupInfo = {
        created: new Date().toISOString(),
        project_path: this.projectRoot,
        backup_name: backupName,
        version: '1.0.0'
      };

      // Copy entire .aimanager directory
      console.log(chalk.blue('📁 Copying project files...'));
      await fs.copy(this.projectRoot, backupPath, {
        // Exclude lock files and temporary files
        filter: (src) => {
          const filename = path.basename(src);
          return !filename.endsWith('.lock') && 
                 !filename.includes('.tmp.') && 
                 filename !== 'node_modules';
        }
      });

      // Add backup metadata
      const metadataPath = path.join(backupPath, 'backup-info.json');
      await fs.writeJSON(metadataPath, backupInfo, { spaces: 2 });

      // Calculate backup size
      const backupSize = await this.getDirectorySize(backupPath);
      
      console.log(chalk.green('✅ Backup created successfully!'));
      console.log(chalk.gray(`📁 Location: ${backupPath}`));
      console.log(chalk.gray(`📊 Size: ${this.formatBytes(backupSize)}`));
      console.log(chalk.gray(`🕒 Created: ${new Date().toLocaleString()}`));

      // Clean up old backups (keep last 5)
      await this.cleanOldBackups();

      console.log(); // Empty line

      return {
        name: backupName,
        path: backupPath,
        size: backupSize,
        created: backupInfo.created
      };

    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      console.log(chalk.bold.cyan('\\n💾 Available Backups:'));
      console.log(chalk.gray('─'.repeat(50)));

      if (!(await fs.pathExists(this.backupDir))) {
        console.log(chalk.yellow('No backups found.'));
        console.log(chalk.gray('Run "aimanager backup" to create your first backup.'));
        console.log(); // Empty line
        return [];
      }

      const backups = [];
      const items = await fs.readdir(this.backupDir);
      const backupDirs = items.filter(item => item.startsWith('aimanager-backup-'));

      if (backupDirs.length === 0) {
        console.log(chalk.yellow('No backups found.'));
        console.log(); // Empty line
        return [];
      }

      // Get backup information
      for (const backupDir of backupDirs) {
        const backupPath = path.join(this.backupDir, backupDir);
        const metadataPath = path.join(backupPath, 'backup-info.json');
        
        let metadata = {};
        if (await fs.pathExists(metadataPath)) {
          try {
            metadata = await fs.readJSON(metadataPath);
          } catch {
            // Ignore corrupted metadata
          }
        }

        const stats = await fs.stat(backupPath);
        const size = await this.getDirectorySize(backupPath);
        
        const backup = {
          name: backupDir,
          path: backupPath,
          created: metadata.created || stats.birthtime.toISOString(),
          size,
          valid: await this.validateBackup(backupPath)
        };

        backups.push(backup);
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));

      // Display backups
      backups.forEach((backup, index) => {
        const status = backup.valid ? chalk.green('✓') : chalk.red('✗');
        const age = this.getTimeAgo(backup.created);
        
        console.log(`${status} ${chalk.bold(backup.name)}`);
        console.log(`    ${chalk.gray('Created:')} ${new Date(backup.created).toLocaleString()} (${age})`);
        console.log(`    ${chalk.gray('Size:')} ${this.formatBytes(backup.size)}`);
        console.log(`    ${chalk.gray('Path:')} ${backup.path}`);
        
        if (index < backups.length - 1) {
          console.log(); // Empty line between backups
        }
      });

      console.log(chalk.gray(`\\n📊 Total: ${backups.length} backup(s), ${this.formatBytes(backups.reduce((sum, b) => sum + b.size, 0))} total`));
      console.log(); // Empty line

      return backups;

    } catch (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      console.log(chalk.bold.cyan(`\\n🔄 Restoring from Backup: ${backupName}`));
      console.log(chalk.gray('─'.repeat(50)));

      // Check if backup exists
      if (!(await fs.pathExists(backupPath))) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Validate backup
      if (!(await this.validateBackup(backupPath))) {
        throw new Error('Backup appears to be corrupted or incomplete');
      }

      // Warn about existing project
      if (await fs.pathExists(this.projectRoot)) {
        const inquirer = require('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'This will overwrite your current AiManager project. Continue?',
            default: false
          }
        ]);

        if (!confirmed) {
          console.log(chalk.yellow('Restore cancelled'));
          return;
        }

        // Create backup of current state
        console.log(chalk.blue('📁 Backing up current project...'));
        const currentBackup = await this.createBackup();
        console.log(chalk.green(`✓ Current project backed up as: ${currentBackup.name}`));
      }

      // Restore from backup
      console.log(chalk.blue('📁 Restoring project files...'));
      await fs.remove(this.projectRoot);
      await fs.copy(backupPath, this.projectRoot, {
        filter: (src) => {
          // Don't copy the backup metadata file
          return path.basename(src) !== 'backup-info.json';
        }
      });

      console.log(chalk.green('✅ Project restored successfully!'));
      console.log(chalk.gray(`📁 Restored to: ${this.projectRoot}`));

      // Show restore summary
      const metadataPath = path.join(backupPath, 'backup-info.json');
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJSON(metadataPath);
        console.log(chalk.gray(`🕒 Backup was created: ${new Date(metadata.created).toLocaleString()}`));
      }

      console.log(); // Empty line

    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      if (!(await fs.pathExists(backupPath))) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Confirm deletion
      const inquirer = require('inquirer');
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Are you sure you want to delete backup "${backupName}"?`,
          default: false
        }
      ]);

      if (!confirmed) {
        console.log(chalk.yellow('Deletion cancelled'));
        return;
      }

      await fs.remove(backupPath);
      console.log(chalk.green(`✓ Backup deleted: ${backupName}`));

    } catch (error) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupPath) {
    try {
      // Check if required directories exist
      const requiredDirs = ['config', 'data'];
      for (const dir of requiredDirs) {
        if (!(await fs.pathExists(path.join(backupPath, dir)))) {
          return false;
        }
      }

      // Check if essential files exist
      const essentialFiles = [
        'config/project.json',
        'config/workers.json'
      ];

      for (const file of essentialFiles) {
        const filePath = path.join(backupPath, file);
        if (!(await fs.pathExists(filePath))) {
          return false;
        }
        
        // Try to read JSON files
        if (file.endsWith('.json')) {
          try {
            await fs.readJSON(filePath);
          } catch {
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old backups (keep last 5)
   */
  async cleanOldBackups() {
    try {
      const items = await fs.readdir(this.backupDir);
      const backupDirs = items.filter(item => item.startsWith('aimanager-backup-'))
        .sort((a, b) => b.localeCompare(a)); // Sort newest first

      if (backupDirs.length > 5) {
        const toDelete = backupDirs.slice(5);
        
        for (const backup of toDelete) {
          await fs.remove(path.join(this.backupDir, backup));
          console.log(chalk.gray(`🗑️  Removed old backup: ${backup}`));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not clean old backups'));
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
    } catch {
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

  /**
   * Get human readable time ago
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }
  }
}

const backupCommands = new BackupCommands();

module.exports = () => backupCommands.createBackup();
module.exports.list = () => backupCommands.listBackups();
module.exports.restore = (backupName) => backupCommands.restoreBackup(backupName);
module.exports.delete = (backupName) => backupCommands.deleteBackup(backupName);