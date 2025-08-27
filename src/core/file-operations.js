const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Atomic file operations with corruption prevention
 * Implements 5-layer protection system from specification
 */

class FileOperations {
  constructor() {
    this.locks = new Map();
    this.maxLockTime = 30000; // 30 seconds max lock time
  }

  /**
   * Layer 3: File Locking System
   * Prevents simultaneous edits by multiple Claude agents
   */
  async acquireLock(filePath, timeout = this.maxLockTime) {
    const lockFile = `${filePath}.lock`;
    const lockId = uuidv4();
    
    // Check if file is already locked
    if (await fs.pathExists(lockFile)) {
      const lockData = await this.readLockFile(lockFile);
      
      // Check if lock is stale
      if (Date.now() - lockData.timestamp > timeout) {
        console.warn(`Removing stale lock for ${filePath}`);
        await fs.remove(lockFile);
      } else {
        throw new Error(`File is locked by ${lockData.workerId}. Try again in a moment.`);
      }
    }
    
    // Create lock
    const lockData = {
      lockId,
      workerId: this.getCurrentWorkerId(),
      timestamp: Date.now(),
      pid: process.pid
    };
    
    await fs.writeFile(lockFile, JSON.stringify(lockData, null, 2));
    this.locks.set(filePath, { lockId, lockFile });
    
    // Auto-release lock after timeout
    setTimeout(async () => {
      await this.releaseLock(filePath, lockId);
    }, timeout);
    
    return lockId;
  }

  /**
   * Release file lock
   */
  async releaseLock(filePath, lockId) {
    const lockFile = `${filePath}.lock`;
    const lockInfo = this.locks.get(filePath);
    
    if (lockInfo && lockInfo.lockId === lockId) {
      try {
        await fs.remove(lockFile);
        this.locks.delete(filePath);
      } catch (error) {
        // Lock file might already be removed, ignore error
      }
    }
  }

  /**
   * Read lock file safely
   */
  async readLockFile(lockFile) {
    try {
      const content = await fs.readFile(lockFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { timestamp: 0, workerId: 'unknown' };
    }
  }

  /**
   * Layer 2: Atomic File Operations
   * Ensures writes are either complete or don't happen at all
   */
  async atomicWrite(filePath, data, lockId) {
    // Verify we have the lock
    const lockInfo = this.locks.get(filePath);
    if (!lockInfo || lockInfo.lockId !== lockId) {
      throw new Error('Cannot write without proper file lock');
    }

    const tempFile = `${filePath}.tmp.${Date.now()}.${uuidv4()}`;
    const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    try {
      // Create backup before writing
      await this.createBackup(filePath);
      
      // Write to temporary file first
      await fs.writeFile(tempFile, dataString, { encoding: 'utf8', mode: 0o644 });
      
      // Verify the temporary file is valid JSON (if applicable)
      if (filePath.endsWith('.json')) {
        const testContent = await fs.readFile(tempFile, 'utf8');
        JSON.parse(testContent); // This will throw if invalid
      }
      
      // Atomic move - this operation cannot be interrupted
      await fs.move(tempFile, filePath, { overwrite: true });
      
      console.log(`✓ File updated: ${path.basename(filePath)}`);
      
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.remove(tempFile);
      } catch {}
      
      throw new Error(`Atomic write failed: ${error.message}`);
    } finally {
      // Always release lock after write attempt
      await this.releaseLock(filePath, lockId);
    }
  }

  /**
   * Layer 4: JSON Validation & Recovery
   * Smart JSON reading with automatic error recovery
   */
  async safeJSONRead(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`JSON corruption detected in ${filePath}, attempting recovery...`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const recovered = this.attemptJSONRecovery(content);
        
        if (recovered) {
          // Save the corrected version
          const lockId = await this.acquireLock(filePath);
          await this.atomicWrite(filePath, recovered, lockId);
          console.log(`✓ JSON auto-recovery successful for ${path.basename(filePath)}`);
          return recovered;
        }
      } catch (recoveryError) {
        console.warn(`JSON recovery failed: ${recoveryError.message}`);
      }
      
      // Try to restore from backup
      const backupData = await this.restoreFromBackup(filePath);
      if (backupData) {
        console.log(`✓ Restored ${path.basename(filePath)} from backup`);
        return backupData;
      }
      
      // Return default structure as last resort
      console.warn(`Using default structure for ${path.basename(filePath)}`);
      return this.getDefaultStructure(filePath);
    }
  }

  /**
   * Attempt to fix common JSON syntax errors
   */
  attemptJSONRecovery(content) {
    try {
      // Fix common issues
      let fixed = content
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing quotes on keys
        .replace(/(\w+):/g, '"$1":')
        // Fix single quotes to double quotes
        .replace(/'/g, '"')
        // Remove duplicate commas
        .replace(/,+/g, ',')
        // Fix missing closing braces/brackets (basic attempt)
        .replace(/\n\s*$/, '');

      // Try to balance braces and brackets
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;

      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }

      // Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }

      return JSON.parse(fixed);
    } catch (error) {
      return null;
    }
  }

  /**
   * Layer 5: Continuous Backup System
   * Auto-backup before every write operation
   */
  async createBackup(filePath) {
    if (!(await fs.pathExists(filePath))) {
      return;
    }

    const timestamp = Date.now();
    const backupDir = path.join(path.dirname(filePath), '.backups');
    const fileName = path.basename(filePath);
    const backupFile = path.join(backupDir, `${fileName}.backup.${timestamp}`);

    try {
      await fs.ensureDir(backupDir);
      await fs.copy(filePath, backupFile);
      
      // Clean old backups (keep last 10)
      await this.cleanOldBackups(filePath);
    } catch (error) {
      console.warn(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Clean old backup files
   */
  async cleanOldBackups(filePath) {
    const backupDir = path.join(path.dirname(filePath), '.backups');
    const fileName = path.basename(filePath);
    
    if (!(await fs.pathExists(backupDir))) {
      return;
    }

    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith(`${fileName}.backup.`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('.backup.')[1]);
          const timestampB = parseInt(b.split('.backup.')[1]);
          return timestampB - timestampA; // Sort newest first
        });

      // Keep only the last 10 backups
      const filesToDelete = backupFiles.slice(10);
      for (const file of filesToDelete) {
        await fs.remove(path.join(backupDir, file));
      }
    } catch (error) {
      console.warn(`Backup cleanup failed: ${error.message}`);
    }
  }

  /**
   * Restore from most recent backup
   */
  async restoreFromBackup(filePath) {
    const backupDir = path.join(path.dirname(filePath), '.backups');
    const fileName = path.basename(filePath);
    
    if (!(await fs.pathExists(backupDir))) {
      return null;
    }

    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith(`${fileName}.backup.`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('.backup.')[1]);
          const timestampB = parseInt(b.split('.backup.')[1]);
          return timestampB - timestampA; // Sort newest first
        });

      if (backupFiles.length === 0) {
        return null;
      }

      const latestBackup = path.join(backupDir, backupFiles[0]);
      const content = await fs.readFile(latestBackup, 'utf8');
      
      // Restore the file
      const lockId = await this.acquireLock(filePath);
      await fs.writeFile(filePath, content, 'utf8');
      await this.releaseLock(filePath, lockId);
      
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Backup restore failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get default structure for different file types
   */
  getDefaultStructure(filePath) {
    const fileName = path.basename(filePath);
    
    if (fileName.startsWith('worker-')) {
      return {
        worker_id: fileName.replace('worker-', '').replace('.json', ''),
        last_update: new Date().toISOString(),
        status: 'ready',
        current_focus: '',
        today: {
          completed: [],
          in_progress: [],
          planned: []
        },
        blockers: [],
        metrics: {},
        priorities: {
          high: [],
          medium: [],
          low: []
        },
        comments: '',
        next_24h: []
      };
    }
    
    if (fileName === 'tasks.json') {
      return {
        tasks: [],
        last_updated: new Date().toISOString()
      };
    }
    
    return {};
  }

  /**
   * Get current worker ID from environment or config
   */
  getCurrentWorkerId() {
    // Try to determine worker ID from various sources
    if (process.env.AIMANAGER_WORKER_ID) {
      return process.env.AIMANAGER_WORKER_ID;
    }
    
    // Try to read from local config
    try {
      const configPath = path.join(process.cwd(), '.aimanager', 'config', 'worker.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.worker_id;
      }
    } catch (error) {
      // Ignore error, fall back to default
    }
    
    return 'unknown';
  }

  /**
   * High-level safe update method for worker status
   */
  async updateWorkerStatus(workerId, updates) {
    const projectRoot = path.join(process.cwd(), '.aimanager');
    const workerFile = path.join(projectRoot, 'data', `worker-${workerId}.json`);
    
    // Ensure data directory exists
    await fs.ensureDir(path.dirname(workerFile));
    
    const lockId = await this.acquireLock(workerFile);
    
    try {
      // Read current data
      let currentData = {};
      if (await fs.pathExists(workerFile)) {
        currentData = await this.safeJSONRead(workerFile);
      } else {
        currentData = this.getDefaultStructure(workerFile);
      }
      
      // Merge updates
      const updatedData = {
        ...currentData,
        ...updates,
        worker_id: workerId,
        last_update: new Date().toISOString()
      };
      
      // Atomic write
      await this.atomicWrite(workerFile, updatedData, lockId);
      
      return updatedData;
    } catch (error) {
      await this.releaseLock(workerFile, lockId);
      throw error;
    }
  }

  /**
   * High-level safe read method for worker status
   */
  async readWorkerStatus(workerId) {
    const projectRoot = path.join(process.cwd(), '.aimanager');
    const workerFile = path.join(projectRoot, 'data', `worker-${workerId}.json`);
    
    if (!(await fs.pathExists(workerFile))) {
      return this.getDefaultStructure(workerFile);
    }
    
    return await this.safeJSONRead(workerFile);
  }
}

module.exports = new FileOperations();