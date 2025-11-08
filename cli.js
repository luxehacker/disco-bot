#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { select, text, confirm } = require('@clack/prompts');
const chalk = require('chalk');

// 🎨 Define gradient colors for premium look
const gradient = chalk.hex('#57F287'); // Discord green
const accent = chalk.hex('#5865F2');   // Discord blurple
const errorColor = chalk.hex('#ED4245'); // Discord red

const symbols = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
};

// 🌟 Logging function with styling & emojis
const logWithStyle = (message, type = 'info') => {
    const timestamp = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
    const styled = {
        success: `${timestamp} ${gradient.bold(symbols.success)} ${chalk.whiteBright(message)}`,
        error: `${timestamp} ${errorColor.bold(symbols.error)} ${chalk.whiteBright(message)}`,
        info: `${timestamp} ${accent.bold(symbols.info)} ${chalk.whiteBright(message)}`
    };
    console.log(styled[type] || message);
};

// Function to generate command template with selected builders
const generateCommandTemplate = (builders = []) => {
    let imports = ['SlashCommandBuilder'];
    let exampleCode = '';

    if (builders.includes('embed')) {
        imports.push('EmbedBuilder');
        exampleCode += `
        // Example: Create an embed
        // const embed = new EmbedBuilder()
        //     .setColor('Blue')
        //     .setTitle('Title')
        //     .setDescription('Description');
        // await interaction.reply({ embeds: [embed] });`;
    }

    if (builders.includes('button')) {
        imports.push('ButtonBuilder', 'ButtonStyle', 'ActionRowBuilder');
        exampleCode += `
        // Example: Create a button
        // const button = new ButtonBuilder()
        //     .setCustomId('button_id')
        //     .setLabel('Click Me')
        //     .setStyle(ButtonStyle.Primary);
        // const row = new ActionRowBuilder().addComponents(button);
        // await interaction.reply({ content: 'Message with button', components: [row] });`;
    }

    if (builders.includes('selectMenu')) {
        imports.push('StringSelectMenuBuilder', 'StringSelectMenuOptionBuilder', 'ActionRowBuilder');
        exampleCode += `
        // Example: Create a select menu
        // const select = new StringSelectMenuBuilder()
        //     .setCustomId('select_id')
        //     .setPlaceholder('Make a selection')
        //     .addOptions(
        //         new StringSelectMenuOptionBuilder().setLabel('Option 1').setValue('option1'),
        //         new StringSelectMenuOptionBuilder().setLabel('Option 2').setValue('option2')
        //     );
        // const row = new ActionRowBuilder().addComponents(select);
        // await interaction.reply({ content: 'Select an option', components: [row] });`;
    }

    if (builders.includes('modal')) {
        imports.push('ModalBuilder', 'TextInputBuilder', 'TextInputStyle', 'ActionRowBuilder');
        exampleCode += `
        // Example: Show a modal
        // const modal = new ModalBuilder()
        //     .setCustomId('modal_id')
        //     .setTitle('Modal Title');
        // const input = new TextInputBuilder()
        //     .setCustomId('input_id')
        //     .setLabel('Input Label')
        //     .setStyle(TextInputStyle.Short);
        // const row = new ActionRowBuilder().addComponents(input);
        // modal.addComponents(row);
        // await interaction.showModal(modal);`;
    }

    return `const { ${imports.join(', ')} } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('your-command')
        .setDescription('Describe your command here.'),

    async execute(interaction, client) {
        // Command execution logic goes here${exampleCode}
    }
};`;
};

// Templates for different file types
const templates = {
    command: generateCommandTemplate([]),
    prefix: `//! This is a basic structure for a prefix command in discoBase using discord.js

module.exports = {
    name: 'command-name',
    description: 'command-description.',
    aliases: ['alias_1', 'alias_2'],
    run: async (client, message, args) => {
        // Command execution logic goes here
    },
};`,
    event: `module.exports = {
    name: 'event-name',
    async execute(eventObject, client) {
        // Event handling logic goes here
    }
};`
};

// 🗂️ Create file with content & fancy logs
const createFile = (filePath, template) => {
    fs.writeFile(filePath, template.trim(), (err) => {
        if (err) return logWithStyle(`Error: ${err.message}`, 'error');
        const relativePath = path.relative(path.join(__dirname, 'src'), filePath);
        logWithStyle(`✨ File created at: ${chalk.cyanBright(relativePath)}`, 'success');
    });
};

// 🚀 Main execution
(async () => {
    logWithStyle('Welcome to discoBase file generator 🛠️', 'info');

    const fileType = await select({
        message: '📂 Select the type of file to generate:',
        options: [
            { value: 'command', label: 'Command' },
            { value: 'event', label: 'Event' },
            { value: 'prefix', label: 'Prefix Command' }
        ],
    });

    const fileName = await text({
        message: `📝 Enter the name of the ${fileType} file (without extension):`,
        initial: '',
    });

    let selectedBuilders = [];
    if (fileType === 'command') {
        const useBuilders = await confirm({
            message: '🛠️ Do you want to use Discord.js builders in this command?',
        });

        if (useBuilders) {
            const builderOptions = await select({
                message: '📦 Select builders to include (you can add more later):',
                options: [
                    { value: 'embed', label: 'EmbedBuilder' },
                    { value: 'button', label: 'ButtonBuilder & ActionRowBuilder' },
                    { value: 'selectMenu', label: 'StringSelectMenuBuilder' },
                    { value: 'modal', label: 'ModalBuilder & TextInputBuilder' },
                    { value: 'none', label: 'None - I\'ll add them manually' }
                ],
            });

            if (builderOptions !== 'none') {
                selectedBuilders.push(builderOptions);
            }
        }
    }

    const folderMap = {
        command: 'commands',
        event: 'events',
        prefix: 'messages'
    };

    const folderSelection = folderMap[fileType];
    const selectedFolderPath = path.join(__dirname, 'src', folderSelection);

    if (!fs.existsSync(selectedFolderPath)) {
        const createFolder = await confirm({
            message: `🚫 Folder ${folderSelection} does not exist. Create it?`,
        });

        if (createFolder) {
            fs.mkdirSync(selectedFolderPath, { recursive: true });
            logWithStyle(`📁 Folder ${chalk.greenBright(folderSelection)} created successfully.`, 'success');
        } else {
            logWithStyle('❌ Folder creation aborted.', 'error');
            return;
        }
    }

    let subFolders = fs.readdirSync(selectedFolderPath).filter(item => fs.statSync(path.join(selectedFolderPath, item)).isDirectory());

    if (subFolders.length === 0) {
        const createSubfolder = await confirm({
            message: `📂 No subfolders exist in ${folderSelection}. Create one?`,
        });

        if (createSubfolder) {
            const subfolderName = await text({
                message: `🗂️ Enter the name of the new subfolder:`,
                initial: '',
            });

            const newSubfolderPath = path.join(selectedFolderPath, subfolderName);
            fs.mkdirSync(newSubfolderPath, { recursive: true });
            logWithStyle(`📁 Subfolder ${chalk.greenBright(subfolderName)} created successfully.`, 'success');
            subFolders = [subfolderName];
        } else {
            logWithStyle('❌ Subfolder creation aborted.', 'error');
            return;
        }
    }

    const subfolderSelection = await select({
        message: '📂 Select the subfolder to create the file in:',
        options: [
            ...subFolders.map(subfolder => ({ value: subfolder, label: subfolder })),
            { value: 'new', label: '➕ Create new folder' }
        ]
    });

    let subfolderPath;
    if (subfolderSelection === 'new') {
        const newSubfolderName = await text({
            message: '🗂️ Enter the name of the new subfolder:',
            initial: '',
        });
        subfolderPath = path.join(selectedFolderPath, newSubfolderName);
        fs.mkdirSync(subfolderPath, { recursive: true });
        logWithStyle(`📁 New subfolder ${chalk.greenBright(newSubfolderName)} created successfully.`, 'success');
    } else {
        subfolderPath = path.join(selectedFolderPath, subfolderSelection);
    }

    const filePath = path.join(subfolderPath, `${fileName}.js`);

    if (fs.existsSync(filePath)) {
        logWithStyle(`⚠️ File already exists: ${chalk.yellowBright(filePath)}`, 'error');
    } else {
        const template = fileType === 'command' && selectedBuilders.length > 0 
            ? generateCommandTemplate(selectedBuilders) 
            : templates[fileType];
        createFile(filePath, template);
    }
})();
