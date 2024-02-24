import { Events, Client, GatewayIntentBits, Collection, REST, Routes, type Interaction, CommandInteraction } from "discord.js";

import { readdirSync } from "fs";

import { config } from "dotenv";

const client: any = new Client(
    {
        intents: [
            GatewayIntentBits.AutoModerationConfiguration, 
            GatewayIntentBits.AutoModerationExecution, 
            GatewayIntentBits.DirectMessageReactions, 
            GatewayIntentBits.DirectMessageTyping, 
            GatewayIntentBits.DirectMessages, 
            GatewayIntentBits.GuildEmojisAndStickers, 
            GatewayIntentBits.GuildIntegrations, 
            GatewayIntentBits.GuildInvites, 
            GatewayIntentBits.GuildMembers, 
            GatewayIntentBits.GuildMessageReactions, 
            GatewayIntentBits.GuildMessageTyping, 
            GatewayIntentBits.GuildMessages, 
            GatewayIntentBits.GuildModeration, 
            GatewayIntentBits.GuildPresences, 
            GatewayIntentBits.GuildScheduledEvents, 
            GatewayIntentBits.GuildVoiceStates, 
            GatewayIntentBits.GuildWebhooks, 
            GatewayIntentBits.Guilds,
            GatewayIntentBits.MessageContent
        ]
    }
);

client.commands = new Collection();

const commandsPath = `./commands`;
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
    const commandFiles = readdirSync(`${commandsPath}/${folder}`).filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
        const command = require(`${commandsPath}/${folder}/${file}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`Warn: ${file} does not have the proper structure.`);
        }
    }
}

const devCommandsPath = `./devCommands`;
const devCommandsFiles = readdirSync(devCommandsPath).filter(file => file.endsWith('.ts'));

for (const file of devCommandsFiles) {
    const command = require(`${devCommandsPath}/${file}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`Warn: ${file} does not have the proper structure.`);
    }
}

const eventsPath = `./events`;
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts'));

for (const file of eventFiles) {
	const event = require(`${eventsPath}/${file}`);
	if (event.once) {
		client.once(event.eventType, (...args: any) => event.execute(...args));
	} else {
		client.on(event.eventType, (...args: any) => event.execute(...args));
	}
}



client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.once(Events.ClientReady, (readyClient: Client) => {
    console.log(`Logged in as ${readyClient.user?.tag}!`);
    if (readyClient.application?.commands.holds.length === 0) {
        const commands: Array<JSON> = [];
        const devCommands: Array<JSON> = [];

        const commandsPath = `./commands`;
        const commandFolders = readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const commandFiles = readdirSync(`${commandsPath}/${folder}`).filter((file: string) => file.endsWith('.ts'));
            for (const file of commandFiles) {
                const command = require(`${commandsPath}/${folder}/${file}`);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.warn(`Warn: ${file} does not have the proper structure.`);
                }
            }
        }

        const devCommandsPath = `./devCommands`;
        const devCommandsFiles = readdirSync(devCommandsPath).filter((file: string) => file.endsWith('.ts'));

        for (const file of devCommandsFiles) {
            const command = require(`${devCommandsPath}/${file}`);
            if ('data' in command && 'execute' in command) {
                devCommands.push(command.data.toJSON());
            } else {
                console.warn(`Warn: ${file} does not have the proper structure.`);
            }
        }

        const rest = new REST().setToken(client.token);

        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commands },
                );

                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, '1185316093078802552'),
                    { body: devCommands },
                );

                console.log('Successfully reloaded application (/) commands.');
            }
            catch (error) {
                console.error(error);
            }
        })();
    }
});

config();

client.login(process.env.TOKEN);
