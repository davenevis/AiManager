# 🚀 AiManager - Autonomous AI Company

> Transform any project into an autonomous AI company with intelligent workers that coordinate and build your vision automatically!

**🧪 Test Update - [Current Time: January 27, 2025 00:37 UTC] - Checking if GitHub updates properly**

[![NPM Version](https://img.shields.io/npm/v/@davenevis/aimanager)](https://www.npmjs.com/package/@davenevis/aimanager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/@davenevis/aimanager)](https://nodejs.org/)

## ✨ What is AiManager?

AiManager is a revolutionary CLI tool that creates **autonomous AI companies** for your projects. Instead of managing multiple Claude instances manually, AiManager:

- 🤖 **Spawns intelligent AI workers** automatically
- 🏢 **Provides a CEO dashboard** for project management  
- ⚡ **Coordinates workers in real-time** through file-based communication
- 📊 **Monitors progress** with live WebSocket updates
- 🛡️ **Prevents corruption** with 5-layer protection system
- 📁 **Organizes projects** in dedicated subfolders

## 🎯 Quick Start

### Install Globally
```bash
npm install -g @davenevis/aimanager
```

### Launch Your AI Company
```bash
# Initialize a new project
aimanager init "My Awesome Project"

# Launch the CEO control panel
aimanager dashboard
```

**Open http://localhost:3000 and watch the magic happen!** ✨

## 🏢 CEO Control Panel

The crown jewel of AiManager - a beautiful web interface where you:

### 📋 **Create Projects**
- Describe your vision in natural language
- Select project complexity and type
- Choose specific technologies and requirements

### 👥 **Deploy AI Workers**
- **Nova** 🎨 - Frontend Specialist (React, UI/UX)
- **Zephyr** ⚡ - Features Engineer (Backend, APIs)
- **Cipher** 🔒 - Security Specialist (Auth, Security)  
- **Sage** 🚀 - Full Stack Engineer (Integration)
- **Pixel** 🎭 - UI/UX Designer (Design, Branding)
- **Alex** 🏢 - Project Manager (Coordination)

### 📊 **Monitor Real-Time Progress**
- Live worker status updates
- Task completion tracking
- Blocker identification and resolution
- Company performance metrics

## 🎪 Usage Examples

### Command Line Interface
```bash
# Quick autonomous project launch
aimanager autonomous "build a React dashboard with user authentication"

# Monitor team activity
aimanager show-team

# Update your status as a worker
aimanager focus "Implementing user authentication"
aimanager complete "Login form" "Password validation"

# View assigned tasks
aimanager tasks

# Create project backups
aimanager backup
```

### CEO Dashboard Workflow
1. **Launch Dashboard**: `aimanager dashboard`
2. **Create Project**: Fill out the beautiful web form
3. **Select Workers**: Choose AI specialists for your team
4. **Launch Company**: Click the magic button
5. **Monitor Progress**: Watch autonomous AI workers build your vision

## 🔧 Features

### 🤖 **Autonomous Workers**
- **Intelligent task assignment** based on worker specialties
- **Automatic terminal spawning** with custom system prompts
- **Real-time coordination** through corruption-proof file system
- **Self-managing workflows** with blocker resolution

### 🏢 **CEO Experience**
- **Professional web interface** for project management
- **Real-time WebSocket updates** showing live progress
- **Project organization** in dedicated subfolders
- **Company statistics** and performance monitoring

### 🛡️ **Corruption-Proof Architecture**
- **5-layer protection system** prevents file corruption
- **Atomic file operations** with locking mechanisms
- **JSON validation and recovery** for reliability
- **Continuous backups** with automatic cleanup

### 📊 **Real-Time Monitoring**
- **Live dashboard updates** via WebSocket
- **Worker status tracking** with progress indicators
- **Task completion monitoring** across all projects
- **Blocker identification** and resolution support

## 🚀 Advanced Usage

### Project Templates
```bash
# List available templates
aimanager autonomous templates

# Launch with specific complexity
aimanager autonomous "e-commerce platform" --complexity high

# Use specific workers
aimanager autonomous "mobile app" --workers nova,cipher,sage
```

### Configuration Management
```bash
# View current configuration
aimanager config list

# Update settings
aimanager config set project.theme dark
aimanager config set workers.max_concurrent 3

# Validate setup
aimanager config validate
```

### Data Management
```bash
# Export project data
aimanager export --format json
aimanager export --format csv

# Create backups
aimanager backup
aimanager backup list
aimanager backup restore backup-name
```

## 🏗️ Architecture

AiManager uses a sophisticated architecture designed for autonomous AI coordination:

### Core Components
- **Terminal Spawner**: Automatically creates Claude terminals with custom prompts
- **Project Manager AI**: Analyzes requests and creates execution plans  
- **File Operations**: Corruption-proof file system with atomic writes
- **Dashboard Server**: Real-time WebSocket updates and CEO interface
- **Worker Coordination**: Task assignment and progress monitoring

### File Structure
```
your-project/
├── .aimanager/              # AiManager configuration
│   ├── config/             # Project and worker settings
│   ├── data/               # Worker status and tasks
│   └── instructions/       # Auto-generated worker prompts
└── ai-projects/            # Launched projects
    ├── project-1/          # Each project in subfolder
    └── project-2/
```

## 📋 Requirements

- **Node.js**: >= 16.0.0
- **NPM**: >= 8.0.0
- **Claude Code**: For AI worker terminals
- **Modern Browser**: For CEO dashboard
- **Windows/macOS/Linux**: Cross-platform support

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/davenevis/AiManager.git
cd AiManager
npm install
npm run dev
```

## 📄 License

MIT © [Dave Nevis](https://github.com/davenevis)

## 🙏 Acknowledgments

- Built for the Claude Code ecosystem
- Inspired by autonomous agent coordination
- Designed for real-world project management

---

**Ready to build the future with autonomous AI workers?** 🚀

Install AiManager today and transform your development process forever!

```bash
npm install -g @davenevis/aimanager
aimanager dashboard
```

**[⭐ Star this repo](https://github.com/davenevis/AiManager) if AiManager helped you build amazing projects!**