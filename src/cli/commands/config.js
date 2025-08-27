const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const fileOps = require('../../core/file-operations');

/**
 * Configuration management commands
 * Handles project and worker configuration
 */

class ConfigCommands {
  constructor() {
    this.projectRoot = path.join(process.cwd(), '.aimanager');
    this.configDir = path.join(this.projectRoot, 'config');
  }

  /**
   * Get configuration value
   */
  async get(key) {
    if (!key) {
      // Show all configuration
      return await this.list();
    }

    try {
      const [section, property] = key.split('.');
      
      if (!section) {
        throw new Error('Configuration key must be in format: section.property');
      }

      const configPath = path.join(this.configDir, `${section}.json`);
      
      if (!(await fs.pathExists(configPath))) {
        console.log(chalk.yellow(`Configuration section '${section}' not found`));
        return;
      }

      const config = await fs.readJSON(configPath);
      
      if (!property) {
        // Show entire section
        console.log(chalk.bold.cyan(`\\n📋 Configuration [${section}]:`));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(JSON.stringify(config, null, 2));
      } else {
        const value = this.getNestedProperty(config, property);
        
        if (value === undefined) {
          console.log(chalk.yellow(`Property '${property}' not found in section '${section}'`));
        } else {
          console.log(chalk.bold.cyan(`\\n📋 ${key}:`));
          console.log(typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
        }
      }

    } catch (error) {
      throw new Error(`Failed to get configuration: ${error.message}`);
    }
  }

  /**
   * Set configuration value
   */
  async set(key, value) {
    if (!key || value === undefined) {
      throw new Error('Usage: config set <section.property> <value>');
    }

    try {
      const [section, property] = key.split('.');
      
      if (!section || !property) {
        throw new Error('Configuration key must be in format: section.property');
      }

      const configPath = path.join(this.configDir, `${section}.json`);
      
      // Read existing config or create new
      let config = {};
      if (await fs.pathExists(configPath)) {
        config = await fs.readJSON(configPath);
      }

      // Parse value (try JSON first, then string)
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      // Set nested property
      this.setNestedProperty(config, property, parsedValue);
      
      // Update timestamp
      config.last_updated = new Date().toISOString();

      // Write config file
      const lockId = await fileOps.acquireLock(configPath);
      await fileOps.atomicWrite(configPath, config, lockId);

      console.log(chalk.green(`✓ Configuration updated: ${key} = ${JSON.stringify(parsedValue)}`));

    } catch (error) {
      throw new Error(`Failed to set configuration: ${error.message}`);
    }
  }

  /**
   * List all configuration
   */
  async list() {
    try {
      console.log(chalk.bold.cyan('\\n📋 AiManager Configuration:'));
      console.log(chalk.gray('═'.repeat(50)));

      if (!(await fs.pathExists(this.configDir))) {
        console.log(chalk.yellow('No configuration found. Run aimanager init first.'));
        return;
      }

      const configFiles = await fs.readdir(this.configDir);
      const jsonFiles = configFiles.filter(file => file.endsWith('.json'));

      if (jsonFiles.length === 0) {
        console.log(chalk.yellow('No configuration files found.'));
        return;
      }

      for (const file of jsonFiles) {
        const sectionName = path.basename(file, '.json');
        const configPath = path.join(this.configDir, file);
        
        try {
          const config = await fs.readJSON(configPath);
          
          console.log(chalk.bold(`\\n[${sectionName}]`));
          
          // Special formatting for different sections
          if (sectionName === 'project') {
            console.log(`  Name: ${config.name || 'Unknown'}`);
            console.log(`  Description: ${config.description || 'No description'}`);
            console.log(`  Created: ${config.created ? new Date(config.created).toLocaleString() : 'Unknown'}`);
            console.log(`  Template: ${config.template || 'default'}`);
          } else if (sectionName === 'workers') {
            console.log(`  Count: ${config.workers?.length || 0}`);
            if (config.workers?.length > 0) {
              config.workers.forEach(worker => {
                console.log(`    • ${worker.name} (${worker.role}) - ${worker.id}`);
              });
            }
          } else if (sectionName === 'worker') {
            console.log(`  Current Worker: ${config.worker_id || 'Not set'}`);
            console.log(`  Last Updated: ${config.last_updated ? new Date(config.last_updated).toLocaleString() : 'Never'}`);
          } else {
            // Generic display
            Object.entries(config).forEach(([key, value]) => {
              if (key === 'last_updated') {
                console.log(`  ${key}: ${new Date(value).toLocaleString()}`);
              } else if (typeof value === 'object') {
                console.log(`  ${key}: ${JSON.stringify(value, null, 2).split('\\n').join('\\n    ')}`);
              } else {
                console.log(`  ${key}: ${value}`);
              }
            });
          }
        } catch (error) {
          console.log(chalk.red(`  Error reading ${file}: ${error.message}`));
        }
      }

      console.log(); // Empty line

    } catch (error) {
      throw new Error(`Failed to list configuration: ${error.message}`);
    }
  }

  /**
   * Reset configuration section
   */
  async reset(section) {
    if (!section) {
      throw new Error('Usage: config reset <section>');
    }

    try {
      const configPath = path.join(this.configDir, `${section}.json`);
      
      if (!(await fs.pathExists(configPath))) {
        console.log(chalk.yellow(`Configuration section '${section}' does not exist`));
        return;
      }

      // Confirm before deletion
      const inquirer = require('inquirer');
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Are you sure you want to reset the '${section}' configuration?`,
          default: false
        }
      ]);

      if (!confirmed) {
        console.log(chalk.yellow('Configuration reset cancelled'));
        return;
      }

      // Remove config file
      await fs.remove(configPath);
      
      console.log(chalk.green(`✓ Configuration section '${section}' reset`));

    } catch (error) {
      throw new Error(`Failed to reset configuration: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   */
  async validate() {
    try {
      console.log(chalk.bold.cyan('\\n🔍 Validating Configuration:'));
      console.log(chalk.gray('─'.repeat(40)));

      const issues = [];
      
      // Check if project is initialized
      if (!(await fs.pathExists(this.projectRoot))) {
        issues.push('❌ Project not initialized (.aimanager directory missing)');
        console.log(chalk.red('Configuration validation failed: Project not initialized'));
        return;
      }

      // Check project config
      const projectPath = path.join(this.configDir, 'project.json');
      if (await fs.pathExists(projectPath)) {
        const project = await fs.readJSON(projectPath);
        if (!project.name) issues.push('⚠️ Project name not set');
        console.log(chalk.green('✓ Project configuration found'));
      } else {
        issues.push('❌ Project configuration missing');
      }

      // Check workers config
      const workersPath = path.join(this.configDir, 'workers.json');
      if (await fs.pathExists(workersPath)) {
        const workers = await fs.readJSON(workersPath);
        if (!workers.workers || workers.workers.length === 0) {
          issues.push('⚠️ No workers configured');
        } else {
          console.log(chalk.green(`✓ ${workers.workers.length} worker(s) configured`));
        }
      } else {
        issues.push('❌ Workers configuration missing');
      }

      // Check data directory
      const dataDir = path.join(this.projectRoot, 'data');
      if (await fs.pathExists(dataDir)) {
        console.log(chalk.green('✓ Data directory exists'));
      } else {
        issues.push('⚠️ Data directory missing');
      }

      // Check worker status files
      if (await fs.pathExists(workersPath)) {
        const workers = await fs.readJSON(workersPath);
        let statusFileCount = 0;
        
        for (const worker of workers.workers || []) {
          const statusFile = path.join(this.projectRoot, 'data', `worker-${worker.id}.json`);
          if (await fs.pathExists(statusFile)) {
            statusFileCount++;
          }
        }
        
        if (statusFileCount > 0) {
          console.log(chalk.green(`✓ ${statusFileCount} worker status file(s) found`));
        } else {
          issues.push('⚠️ No worker status files found');
        }
      }

      // Show issues
      if (issues.length > 0) {
        console.log(chalk.yellow(`\\n⚠️ Issues found (${issues.length}):`));
        issues.forEach(issue => console.log(`  ${issue}`));
      } else {
        console.log(chalk.green('\\n✅ Configuration is valid!'));
      }

      console.log(); // Empty line

    } catch (error) {
      throw new Error(`Failed to validate configuration: ${error.message}`);
    }
  }

  /**
   * Helper: Get nested property from object
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  /**
   * Helper: Set nested property in object
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
}

const configCommands = new ConfigCommands();

module.exports = {
  get: (key) => configCommands.get(key),
  set: (key, value) => configCommands.set(key, value),
  list: () => configCommands.list(),
  reset: (section) => configCommands.reset(section),
  validate: () => configCommands.validate()
};