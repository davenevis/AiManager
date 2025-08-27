const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs-extra');
const chokidar = require('chokidar');
// Import open module with fallback
let open;
try {
  open = require('open');
} catch (error) {
  console.warn('Note: Browser auto-open disabled (open module not available)');
  open = null;
}
const chalk = require('chalk');
const cors = require('cors');
const mime = require('mime-types');

/**
 * Dashboard server with real-time WebSocket updates
 * Watches .aimanager directory for changes and pushes updates to connected clients
 */

class DashboardServer {
  constructor(options = {}) {
    this.port = parseInt(options.port) || 3000;
    this.host = options.host || 'localhost';
    this.shouldOpen = options.open !== false;
    this.theme = options.theme || 'dark';
    this.verbose = options.verbose || false;
    
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Set();
    this.watcher = null;
    
    this.projectRoot = path.join(process.cwd(), '.aimanager');
    this.publicDir = path.join(__dirname, '../../../public');
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupFileWatcher();
  }

  /**
   * Setup Express server with API endpoints
   */
  setupExpress() {
    // Enable CORS
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Serve static files from public directory
    this.app.use(express.static(this.publicDir));
    
    // API Routes
    this.app.get('/api/project', this.getProjectInfo.bind(this));
    this.app.get('/api/workers', this.getWorkers.bind(this));
    this.app.get('/api/worker/:id', this.getWorkerStatus.bind(this));
    this.app.get('/api/tasks', this.getTasks.bind(this));
    this.app.get('/api/health', this.getHealth.bind(this));
    
    // 🚀 CEO CONTROL PANEL ENDPOINTS
    this.app.post('/api/launch-project', this.launchProject.bind(this));
    this.app.get('/api/active-projects', this.getActiveProjects.bind(this));
    this.app.get('/api/available-workers', this.getAvailableWorkers.bind(this));
    
    // Serve CEO dashboard by default, original dashboard at /monitor
    this.app.get('/monitor', (req, res) => {
      const indexPath = path.join(this.publicDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send(this.generateFallbackHTML());
      }
    });
    
    // Serve CEO dashboard for all other routes
    this.app.get('*', (req, res) => {
      const ceoDashPath = path.join(this.publicDir, 'ceo-dashboard.html');
      if (fs.existsSync(ceoDashPath)) {
        res.sendFile(ceoDashPath);
      } else {
        res.send(this.generateCEOFallbackHTML());
      }
    });

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Setup WebSocket server for real-time updates
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      
      if (this.verbose) {
        console.log(chalk.blue(`📡 WebSocket client connected from ${req.socket.remoteAddress}`));
      }
      
      // Send initial data
      this.sendToClient(ws, {
        type: 'connected',
        timestamp: new Date().toISOString()
      });
      
      // Send current project data
      this.sendProjectData(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
        if (this.verbose) {
          console.log(chalk.yellow('📡 WebSocket client disconnected'));
        }
      });
      
      ws.on('error', (error) => {
        console.warn(chalk.yellow('WebSocket error:'), error.message);
        this.clients.delete(ws);
      });
      
      // Handle client messages (ping/pong, commands, etc.)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.warn(chalk.yellow('Invalid WebSocket message:'), data.toString());
        }
      });
    });
  }

  /**
   * Setup file watcher for real-time updates
   */
  setupFileWatcher() {
    if (!fs.existsSync(this.projectRoot)) {
      console.warn(chalk.yellow('Project root not found, file watching disabled'));
      return;
    }
    
    const watchPattern = path.join(this.projectRoot, '**/*.json');
    
    this.watcher = chokidar.watch(watchPattern, {
      ignored: [
        /\.lock$/,
        /\.tmp\./,
        /\.backup\./,
        /node_modules/
      ],
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
      .on('error', (error) => {
        console.warn(chalk.yellow('File watcher error:'), error.message);
      });
      
    if (this.verbose) {
      console.log(chalk.blue(`👀 Watching: ${watchPattern}`));
    }
  }

  /**
   * Handle file system changes
   */
  async handleFileChange(event, filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    if (this.verbose) {
      console.log(chalk.blue(`📁 File ${event}: ${relativePath}`));
    }
    
    // Determine what changed
    let updateType = 'unknown';
    let data = null;
    
    if (relativePath.startsWith('data/worker-')) {
      updateType = 'worker_status';
      const workerId = path.basename(relativePath, '.json').replace('worker-', '');
      data = await this.getWorkerStatusSafe(workerId);
    } else if (relativePath === 'data/tasks.json') {
      updateType = 'tasks';
      data = await this.getTasksSafe();
    } else if (relativePath.startsWith('config/')) {
      updateType = 'config';
      data = await this.getProjectInfoSafe();
    }
    
    // Broadcast to all connected clients
    this.broadcast({
      type: 'file_change',
      event,
      file: relativePath,
      updateType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * API: Get project information
   */
  async getProjectInfo(req, res) {
    try {
      const data = await this.getProjectInfoSafe();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * API: Get all workers
   */
  async getWorkers(req, res) {
    try {
      const workersConfigPath = path.join(this.projectRoot, 'config', 'workers.json');
      
      if (!(await fs.pathExists(workersConfigPath))) {
        return res.json({ success: true, data: { workers: [] } });
      }
      
      const workersConfig = await fs.readJSON(workersConfigPath);
      
      // Enrich with current status data
      const enrichedWorkers = await Promise.all(
        workersConfig.workers.map(async (worker) => {
          const status = await this.getWorkerStatusSafe(worker.id);
          return { ...worker, ...status };
        })
      );
      
      res.json({
        success: true,
        data: {
          ...workersConfig,
          workers: enrichedWorkers
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * API: Get specific worker status
   */
  async getWorkerStatus(req, res) {
    try {
      const { id } = req.params;
      const data = await this.getWorkerStatusSafe(id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * API: Get tasks
   */
  async getTasks(req, res) {
    try {
      const data = await this.getTasksSafe();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * API: Health check
   */
  async getHealth(req, res) {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.floor(memUsage.rss / 1024 / 1024),
          heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024)
        },
        clients: this.clients.size,
        watching: this.watcher ? true : false,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Safe file readers with error handling
   */
  async getProjectInfoSafe() {
    try {
      const configPath = path.join(this.projectRoot, 'config', 'project.json');
      if (await fs.pathExists(configPath)) {
        return await fs.readJSON(configPath);
      }
      return { name: 'Unknown Project', created: new Date().toISOString() };
    } catch (error) {
      return { name: 'Error Loading Project', error: error.message };
    }
  }

  async getWorkerStatusSafe(workerId) {
    try {
      const workerPath = path.join(this.projectRoot, 'data', `worker-${workerId}.json`);
      if (await fs.pathExists(workerPath)) {
        return await fs.readJSON(workerPath);
      }
      return {
        worker_id: workerId,
        status: 'offline',
        last_update: new Date().toISOString(),
        today: { completed: [], in_progress: [], planned: [] }
      };
    } catch (error) {
      return {
        worker_id: workerId,
        status: 'error',
        error: error.message,
        last_update: new Date().toISOString()
      };
    }
  }

  async getTasksSafe() {
    try {
      const tasksPath = path.join(this.projectRoot, 'data', 'tasks.json');
      if (await fs.pathExists(tasksPath)) {
        return await fs.readJSON(tasksPath);
      }
      return { tasks: [], last_updated: new Date().toISOString() };
    } catch (error) {
      return { tasks: [], error: error.message, last_updated: new Date().toISOString() };
    }
  }

  /**
   * Send project data to a specific client
   */
  async sendProjectData(ws) {
    try {
      const [projectInfo, workers, tasks] = await Promise.all([
        this.getProjectInfoSafe(),
        this.getWorkers({ params: {} }, { json: (data) => data.data }),
        this.getTasksSafe()
      ]);

      this.sendToClient(ws, {
        type: 'initial_data',
        data: {
          project: projectInfo,
          workers: workers,
          tasks: tasks
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle client messages
   */
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'get_data':
        this.sendProjectData(ws);
        break;
        
      default:
        if (this.verbose) {
          console.log(chalk.blue('📨 Unknown client message:'), message);
        }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Error handler middleware
   */
  errorHandler(error, req, res, next) {
    console.error(chalk.red('Server error:'), error.message);
    
    if (res.headersSent) {
      return next(error);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }

  /**
   * Generate CEO fallback HTML when public files don't exist
   */
  generateCEOFallbackHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AiManager CEO Control Panel</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: ${this.theme === 'dark' ? '#0a0a0a' : '#f5f5f5'};
            color: ${this.theme === 'dark' ? '#ffffff' : '#333333'};
        }
        .container { max-width: 800px; margin: 0 auto; text-align: center; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; background: ${this.theme === 'dark' ? '#1a1a1a' : '#ffffff'}; }
        .ceo-title { font-size: 2rem; margin-bottom: 1rem; }
        .loading { padding: 40px; }
        pre { background: ${this.theme === 'dark' ? '#2a2a2a' : '#f8f8f8'}; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="ceo-title">🏢 AiManager CEO Control Panel</h1>
        <div class="status">
            <h2>⚡ Building CEO Interface...</h2>
            <p>The autonomous AI company management system is loading...</p>
            <div class="loading">Connecting to AI workers...</div>
        </div>
    </div>
    
    <script>
        const ws = new WebSocket('ws://${this.host}:${this.port}');
        
        ws.onopen = function() {
            console.log('✅ CEO Control Panel connected');
        };
        
        ws.onerror = function(error) {
            document.querySelector('.loading').innerHTML = '❌ Connection failed. Refresh to retry.';
        };
        
        // Auto-refresh to load full interface
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    </script>
</body>
</html>`;
  }

  /**
   * Generate fallback HTML when public files don't exist
   */
  generateFallbackHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AiManager Dashboard</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: ${this.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
            color: ${this.theme === 'dark' ? '#ffffff' : '#333333'};
        }
        .container { max-width: 800px; margin: 0 auto; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; background: ${this.theme === 'dark' ? '#2a2a2a' : '#ffffff'}; }
        .loading { text-align: center; padding: 40px; }
        pre { background: ${this.theme === 'dark' ? '#0a0a0a' : '#f8f8f8'}; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AiManager Dashboard</h1>
        <div class="status">
            <h2>📊 Dashboard Loading...</h2>
            <p>React components are being built. For now, here's the raw data:</p>
            <div id="data-container">
                <div class="loading">Connecting to WebSocket...</div>
            </div>
        </div>
    </div>
    
    <script>
        const ws = new WebSocket('ws://${this.host}:${this.port}');
        const container = document.getElementById('data-container');
        
        ws.onopen = function() {
            container.innerHTML = '<div class="loading">✅ Connected! Loading project data...</div>';
            ws.send(JSON.stringify({ type: 'get_data' }));
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'initial_data') {
                container.innerHTML = '<pre>' + JSON.stringify(data.data, null, 2) + '</pre>';
            } else if (data.type === 'file_change') {
                console.log('File changed:', data);
                const update = document.createElement('div');
                update.innerHTML = '<strong>📁 ' + data.event + ':</strong> ' + data.file + ' <small>(' + new Date(data.timestamp).toLocaleTimeString() + ')</small>';
                container.appendChild(update);
            }
        };
        
        ws.onerror = function(error) {
            container.innerHTML = '<div style="color: #ff4444;">❌ WebSocket error: ' + error + '</div>';
        };
        
        ws.onclose = function() {
            container.innerHTML = '<div style="color: #ffaa44;">⚠️ Connection lost. Refresh to reconnect.</div>';
        };
    </script>
</body>
</html>`;
  }

  /**
   * Start the server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
          return;
        }
        
        const url = `http://${this.host}:${this.port}`;
        
        console.log(chalk.green('🚀 AiManager Dashboard started!'));
        console.log(chalk.blue(`📊 Dashboard: ${url}`));
        console.log(chalk.blue(`🔌 WebSocket: ws://${this.host}:${this.port}`));
        console.log(chalk.gray(`👥 Workers: ${this.clients.size} connected`));
        console.log(chalk.gray(`📁 Watching: ${this.projectRoot}`));
        console.log(chalk.gray('Press Ctrl+C to stop'));
        
        // Auto-open browser
        if (this.shouldOpen && open) {
          open(url).catch(err => {
            console.warn(chalk.yellow('Could not open browser:'), err.message);
          });
        } else if (this.shouldOpen && !open) {
          console.log(chalk.blue(`💡 Open your browser to: ${url}`));
        }
        
        resolve({ url, port: this.port, host: this.host });
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.watcher) {
      await this.watcher.close();
    }
    
    this.clients.forEach(client => {
      client.close();
    });
    
    this.wss.close();
    this.server.close();
    
    console.log(chalk.yellow('📊 Dashboard stopped'));
  }

  /**
   * 🚀 CEO CONTROL PANEL: Launch Project
   */
  async launchProject(req, res) {
    try {
      const projectData = req.body;
      
      console.log(chalk.cyan('🚀 CEO launching project:'), projectData.projectName);
      
      // Create project subfolder
      const projectSlug = projectData.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const projectDir = path.join(process.cwd(), 'ai-projects', projectSlug);
      await fs.ensureDir(projectDir);
      
      // Change to project directory temporarily
      const originalDir = process.cwd();
      process.chdir(projectDir);
      
      try {
        // Initialize AiManager in subfolder
        const initCommand = require('./init');
        await initCommand(projectData.projectName, {
          template: 'autonomous',
          description: projectData.description,
          workers: projectData.workers
        });
        
        // Launch autonomous project
        const AutonomousProjectManager = require('../../ai/project-manager');
        const projectManager = new AutonomousProjectManager();
        
        // Build request string
        const request = `${projectData.description} (${projectData.projectType} complexity: ${projectData.complexity})`;
        
        // Execute project (but don't wait for completion)
        setImmediate(async () => {
          try {
            await projectManager.executeProject(request, {
              projectType: projectData.projectType,
              complexity: projectData.complexity,
              workers: projectData.workers.map(w => w.id),
              subfolder: projectSlug
            });
          } catch (error) {
            console.error(chalk.red('Project execution error:'), error.message);
          }
        });
        
        // Return to original directory
        process.chdir(originalDir);
        
        res.json({
          success: true,
          projectId: projectSlug,
          projectDir: projectDir,
          message: 'Autonomous AI company launched successfully!',
          workers: projectData.workers.length,
          estimated_completion: this.estimateCompletion(projectData.complexity)
        });
        
      } catch (error) {
        process.chdir(originalDir);
        throw error;
      }
      
    } catch (error) {
      console.error(chalk.red('CEO launch error:'), error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to launch autonomous AI company'
      });
    }
  }

  /**
   * Get active projects
   */
  async getActiveProjects(req, res) {
    try {
      const projectsDir = path.join(process.cwd(), 'ai-projects');
      const projects = [];
      
      if (await fs.pathExists(projectsDir)) {
        const projectFolders = await fs.readdir(projectsDir);
        
        for (const folder of projectFolders) {
          const projectPath = path.join(projectsDir, folder);
          const aimanagerPath = path.join(projectPath, '.aimanager');
          
          if (await fs.pathExists(aimanagerPath)) {
            try {
              const configPath = path.join(aimanagerPath, 'config', 'project.json');
              if (await fs.pathExists(configPath)) {
                const config = await fs.readJSON(configPath);
                
                // Get worker statuses
                const dataDir = path.join(aimanagerPath, 'data');
                const workers = [];
                
                if (await fs.pathExists(dataDir)) {
                  const files = await fs.readdir(dataDir);
                  const workerFiles = files.filter(f => f.startsWith('worker-') && f.endsWith('.json'));
                  
                  for (const file of workerFiles) {
                    try {
                      const workerStatus = await fs.readJSON(path.join(dataDir, file));
                      workers.push(workerStatus);
                    } catch {}
                  }
                }
                
                projects.push({
                  id: folder,
                  path: projectPath,
                  name: config.name,
                  status: config.status || 'active',
                  created: config.created,
                  progress: config.progress,
                  workers: workers.length,
                  activeWorkers: workers.filter(w => w.status === 'active').length
                });
              }
            } catch (error) {
              console.warn(chalk.yellow(`Warning: Could not read project ${folder}`));
            }
          }
        }
      }
      
      res.json({
        success: true,
        data: projects
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available workers
   */
  async getAvailableWorkers(req, res) {
    const availableWorkers = [
      {
        id: 'nova',
        name: 'Nova',
        role: 'Frontend Specialist',
        avatar: '🎨',
        specialties: ['react', 'ui/ux', 'styling', 'responsive-design'],
        description: 'Expert in React, modern CSS, and beautiful user interfaces',
        status: 'available'
      },
      {
        id: 'zephyr',
        name: 'Zephyr',
        role: 'Features Engineer',
        avatar: '⚡',
        specialties: ['backend', 'api', 'database', 'optimization'],
        description: 'Builds robust backend systems and core functionality',
        status: 'available'
      },
      {
        id: 'alex',
        name: 'Alex',
        role: 'Project Manager',
        avatar: '🏢',
        specialties: ['coordination', 'planning', 'documentation'],
        description: 'Oversees projects and coordinates team activities',
        status: 'available'
      },
      {
        id: 'sage',
        name: 'Sage',
        role: 'Full Stack Engineer',
        avatar: '🚀',
        specialties: ['fullstack', 'integration', 'deployment', 'testing'],
        description: 'End-to-end development and system integration',
        status: 'available'
      },
      {
        id: 'cipher',
        name: 'Cipher',
        role: 'Security Specialist',
        avatar: '🔒',
        specialties: ['security', 'authentication', 'encryption', 'compliance'],
        description: 'Security implementation and vulnerability assessment',
        status: 'available'
      },
      {
        id: 'pixel',
        name: 'Pixel',
        role: 'UI/UX Designer',
        avatar: '🎭',
        specialties: ['design', 'prototyping', 'user-experience', 'branding'],
        description: 'Creates stunning designs and user experiences',
        status: 'available'
      }
    ];
    
    res.json({
      success: true,
      data: availableWorkers
    });
  }

  /**
   * Estimate project completion time
   */
  estimateCompletion(complexity) {
    const estimates = {
      low: '1-2 days',
      medium: '3-5 days',
      high: '1-2 weeks',
      enterprise: '2+ weeks'
    };
    
    return estimates[complexity] || '3-5 days';
  }
}

/**
 * Main dashboard command function
 */
async function startDashboard(options = {}) {
  const dashboard = new DashboardServer(options);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⏸️  Stopping dashboard...'));
    await dashboard.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await dashboard.stop();
    process.exit(0);
  });
  
  try {
    await dashboard.start();
    return dashboard;
  } catch (error) {
    console.error(chalk.red('Failed to start dashboard:'), error.message);
    throw error;
  }
}

module.exports = startDashboard;