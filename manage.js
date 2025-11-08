#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { select, text, confirm, multiselect } = require('@clack/prompts');
const chalk = require('chalk');
const { exec } = require('child_process');

const gradient = chalk.hex('#57F287');
const accent = chalk.hex('#5865F2');
const errorColor = chalk.hex('#ED4245');
const warningColor = chalk.hex('#FEE75C');

const log = (message, type = 'info') => {
    const timestamp = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
    const symbols = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    const colors = {
        success: gradient,
        error: errorColor,
        info: accent,
        warning: warningColor
    };

    console.log(`${timestamp} ${colors[type](symbols[type])} ${chalk.white(message)}`);
};

/**
 * Get all files recursively from a directory
 */
const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else if (file.endsWith('.js')) {
            arrayOfFiles.push(filePath);
        }
    });
    
    return arrayOfFiles;
};

/**
 * Get command/event tree structure
 */
const getFileTree = (basePath) => {
    const tree = {};
    const files = getAllFiles(basePath);
    
    files.forEach(file => {
        const relativePath = path.relative(basePath, file);
        const parts = relativePath.split(path.sep);
        const category = parts.length > 1 ? parts[0] : 'Root';
        
        if (!tree[category]) {
            tree[category] = [];
        }
        tree[category].push({
            name: path.basename(file, '.js'),
            path: file,
            relativePath: relativePath
        });
    });
    
    return tree;
};

/**
 * Find matching command file in another directory
 */
const findMatchingCommand = (fileName, searchDir) => {
    if (!fs.existsSync(searchDir)) {
        return null;
    }
    
    const allFiles = getAllFiles(searchDir);
    const baseName = path.basename(fileName, '.js');
    
    // Find file with same name
    const matchingFile = allFiles.find(file => {
        return path.basename(file, '.js') === baseName;
    });
    
    return matchingFile || null;
};

/**
 * Pause/Resume commands - Works for both slash and prefix commands
 */
const toggleCommandState = async (filePath, disable) => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        if (disable) {
            // Check if disabled property already exists
            if (/^\s*disabled:\s*(true|false)/m.test(content)) {
                // Replace existing disabled value
                content = content.replace(/^(\s*)disabled:\s*(false|true)/m, '$1disabled: true');
                log(`Updated existing disabled property to true`, 'info');
            } else {
                // Need to add the disabled property at module.exports level
                // For slash commands: add after "module.exports = {" but before "data:"
                // For prefix commands: add after "module.exports = {" but before "name:"
                
                // Try to find "data:" for slash commands
                if (/data:\s*new\s+SlashCommandBuilder/.test(content)) {
                    content = content.replace(
                        /(module\.exports\s*=\s*\{)(\s*)(\/\/.*\n\s*)?(data:)/,
                        '$1$2disabled: true,\n$2$4'
                    );
                    log(`Added disabled property for slash command`, 'info');
                } 
                // Try to find "name:" for prefix commands
                else if (/^\s*name:\s*['"`]/m.test(content)) {
                    content = content.replace(
                        /(module\.exports\s*=\s*\{)(\s*)(\/\/.*\n\s*)?(name:)/,
                        '$1$2disabled: true,\n$2$4'
                    );
                    log(`Added disabled property for prefix command`, 'info');
                }
                else {
                    log(`Could not determine command type in file`, 'error');
                    return false;
                }
            }
            
            // Verify the change was made
            if (content === originalContent) {
                log(`Warning: No changes were made to the file`, 'warning');
                return false;
            }
            
            log(`Command paused: ${path.basename(filePath)}`, 'success');
        } else {
            // Resume command - set to false
            if (/^\s*disabled:\s*true/m.test(content)) {
                content = content.replace(/^(\s*)disabled:\s*true/m, '$1disabled: false');
                log(`Set disabled to false`, 'info');
            } else if (/^\s*disabled:\s*false/m.test(content)) {
                log(`Command was already enabled`, 'warning');
                return true;
            } else {
                log(`Command does not have disabled property`, 'warning');
                return true;
            }
            
            log(`Command resumed: ${path.basename(filePath)}`, 'success');
        }
        
        // Write the file
        fs.writeFileSync(filePath, content, 'utf8');
        
        log(`File updated successfully`, 'success');
        
        return true;
    } catch (error) {
        log(`Error toggling command state: ${error.message}`, 'error');
        console.error(error);
        return false;
    }
};

/**
 * Toggle both slash and prefix versions of a command
 */
const toggleBothCommandVersions = async (filePath, disable) => {
    const fileName = path.basename(filePath, '.js');
    const commandsDir = path.join(__dirname, 'src', 'commands');
    const messagesDir = path.join(__dirname, 'src', 'messages');
    
    let success = true;
    let filesUpdated = 0;
    
    // Determine if this is a slash command or prefix command
    const isSlashCommand = filePath.includes(path.sep + 'commands' + path.sep);
    const isPrefixCommand = filePath.includes(path.sep + 'messages' + path.sep);
    
    // Toggle the current file
    const currentSuccess = await toggleCommandState(filePath, disable);
    if (currentSuccess) filesUpdated++;
    success = success && currentSuccess;
    
    // Find and toggle the matching command in the other directory
    if (isSlashCommand) {
        // This is a slash command, look for matching prefix command
        const matchingPrefixCmd = findMatchingCommand(fileName, messagesDir);
        if (matchingPrefixCmd) {
            log(`Found matching prefix command: ${path.basename(matchingPrefixCmd)}`, 'info');
            const prefixSuccess = await toggleCommandState(matchingPrefixCmd, disable);
            if (prefixSuccess) filesUpdated++;
            success = success && prefixSuccess;
        } else {
            log(`No matching prefix command found for ${fileName}`, 'warning');
        }
    } else if (isPrefixCommand) {
        // This is a prefix command, look for matching slash command
        const matchingSlashCmd = findMatchingCommand(fileName, commandsDir);
        if (matchingSlashCmd) {
            log(`Found matching slash command: ${path.basename(matchingSlashCmd)}`, 'info');
            const slashSuccess = await toggleCommandState(matchingSlashCmd, disable);
            if (slashSuccess) filesUpdated++;
            success = success && slashSuccess;
        } else {
            log(`No matching slash command found for ${fileName}`, 'warning');
        }
    }
    
    if (filesUpdated > 0) {
        log(`Updated ${filesUpdated} file(s)`, 'success');
    }
    
    return success;
};

/**
 * Open file in default editor
 */
const openInEditor = (filePath) => {
    return new Promise((resolve, reject) => {
        const editor = process.env.EDITOR || 'notepad';
        const command = process.platform === 'win32' 
            ? `start ${editor} "${filePath}"`
            : `${editor} "${filePath}"`;
        
        exec(command, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

/**
 * Delete file with confirmation
 */
const deleteFile = async (filePath) => {
    const confirmed = await confirm({
        message: `Are you sure you want to delete ${chalk.red(path.basename(filePath))}? This cannot be undone!`
    });
    
    if (confirmed) {
        try {
            fs.unlinkSync(filePath);
            log(`File deleted: ${path.basename(filePath)}`, 'success');
            return true;
        } catch (error) {
            log(`Error deleting file: ${error.message}`, 'error');
            return false;
        }
    }
    return false;
};

/**
 * Main menu
 */
const mainMenu = async () => {
    console.clear();
    console.log(gradient.bold('\n🛠️  DISCOBASE MANAGER\n'));
    
    const action = await select({
        message: 'What would you like to do?',
        options: [
            { value: 'manage-slash-commands', label: '⚙️  Manage Slash Commands' },
            { value: 'manage-prefix-commands', label: '💬 Manage Prefix Commands' },
            { value: 'manage-events', label: '📅 Manage Events' },
            { value: 'create-new', label: '➕ Create New (Command/Event)' },
            { value: 'exit', label: '🚪 Exit' }
        ]
    });
    
    if (action === 'exit') {
        log('Goodbye! 👋', 'info');
        process.exit(0);
    }
    
    if (action === 'create-new') {
        require('./cli.js');
        return;
    }
    
    if (action === 'manage-slash-commands') {
        await manageFiles(path.join(__dirname, 'src', 'commands'), 'Slash Commands');
    } else if (action === 'manage-prefix-commands') {
        await manageFiles(path.join(__dirname, 'src', 'messages'), 'Prefix Commands');
    } else if (action === 'manage-events') {
        await manageFiles(path.join(__dirname, 'src', 'events'), 'Events');
    }
};

/**
 * Manage files (commands or events)
 */
const manageFiles = async (basePath, type) => {
    if (!fs.existsSync(basePath)) {
        log(`${type} directory not found!`, 'error');
        return mainMenu();
    }
    
    const tree = getFileTree(basePath);
    const categories = Object.keys(tree);
    
    if (categories.length === 0) {
        log(`No ${type.toLowerCase()} found!`, 'warning');
        return mainMenu();
    }
    
    const category = await select({
        message: `Select a category:`,
        options: [
            ...categories.map(cat => ({ value: cat, label: `📁 ${cat} (${tree[cat].length} files)` })),
            { value: 'back', label: '⬅️  Back to Main Menu' }
        ]
    });
    
    if (category === 'back') {
        return mainMenu();
    }
    
    const file = await select({
        message: `Select a ${type.slice(0, -1).toLowerCase()}:`,
        options: [
            ...tree[category].map(f => ({ 
                value: f.path, 
                label: `📄 ${f.name}` 
            })),
            { value: 'back', label: '⬅️  Back' }
        ]
    });
    
    if (file === 'back') {
        return manageFiles(basePath, type);
    }
    
    const isCommand = type.toLowerCase().includes('command');
    
    const options = [
        { value: 'edit', label: '✏️  Edit' },
        { value: 'delete', label: '🗑️  Delete' },
        { value: 'back', label: '⬅️  Back' }
    ];
    
    // Only show pause/resume for commands
    if (isCommand) {
        options.splice(1, 0, 
            { value: 'pause', label: '⏸️  Pause/Disable (Both Slash & Prefix)' },
            { value: 'resume', label: '▶️  Resume/Enable (Both Slash & Prefix)' }
        );
    }
    
    const action = await select({
        message: `What would you like to do with ${chalk.cyan(path.basename(file))}?`,
        options: options
    });
    
    switch (action) {
        case 'edit':
            log(`Opening ${path.basename(file)} in editor...`, 'info');
            try {
                await openInEditor(file);
                log('File opened successfully!', 'success');
            } catch (error) {
                log(`Could not open editor: ${error.message}`, 'error');
            }
            break;
        case 'pause':
            const pauseSuccess = await toggleBothCommandVersions(file, true);
            if (pauseSuccess) {
                log('⏳ Waiting for file watcher to reload commands...', 'info');
                await new Promise(resolve => setTimeout(resolve, 2000));
                log('✅ Commands should now be disabled. Try using them to verify!', 'success');
            }
            break;
        case 'resume':
            const resumeSuccess = await toggleBothCommandVersions(file, false);
            if (resumeSuccess) {
                log('⏳ Waiting for file watcher to reload commands...', 'info');
                await new Promise(resolve => setTimeout(resolve, 2000));
                log('✅ Commands should now be enabled. Try using them to verify!', 'success');
            }
            break;
        case 'delete':
            await deleteFile(file);
            break;
        case 'back':
            return manageFiles(basePath, type);
    }
    
    return manageFiles(basePath, type);
};

(async () => {
    await mainMenu();
})();
