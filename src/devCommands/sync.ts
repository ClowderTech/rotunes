const { SlashCommandBuilder, CommandInteraction, Collection, Message, REST, Routes } = require("discord.js")

const { readdirSync } = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync the bot\'s commands with the commands folder.'),
    async execute(interaction: typeof CommandInteraction) {
        const commands: Array<JSON> = [];
        const devCommands: Array<JSON> = [];

        const foldersPath = `${__dirname}/../commands`;
        const commandFolders = readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandFiles = readdirSync(`${foldersPath}/${folder}`).filter((file: string) => file.endsWith('.ts'));
            for (const file of commandFiles) {
                const command = require(`${foldersPath}/${folder}/${file}`);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.warn(`Warn: ${file} does not have the proper structure.`);
                }
            }
        }

        const devFoldersPath = `${__dirname}/../devCommands`;
        const devCommandFiles = readdirSync(devFoldersPath).filter((file: string) => file.endsWith('.ts'));

        for (const file of devCommandFiles) {
            const command = require(`${devFoldersPath}/${file}`);
            if ('data' in command && 'execute' in command) {
                devCommands.push(command.data.toJSON());
            } else {
                console.warn(`Warn: ${file} does not have the proper structure.`);
            }
        }

        const rest = new REST().setToken(interaction.client.token);

        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(
                    Routes.applicationCommands(interaction.client.user.id),
                    { body: commands },
                );

                await rest.put(
                    Routes.applicationGuildCommands(interaction.client.user.id, '1185316093078802552'),
                    { body: devCommands },
                );

                console.log('Successfully reloaded application (/) commands.');
            }
            catch (error) {
                console.error(error);
            }
        })();

        interaction.reply(`Synced ${commands.length + devCommands.length} commands.`);
    }
}