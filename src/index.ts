import { Events, Client, GatewayIntentBits, Collection, REST, Routes, Interaction, CommandInteraction, SlashCommandBuilder } from "discord.js";

import { readdirSync } from "fs";

import { config } from "dotenv";
import { SpotifyTrack } from "play-dl";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { createRequire } from "module";
import { Kazagumo } from "kazagumo";
import { Connectors, Player } from "shoukaku";
import { MoonlinkManager } from "moonlink.js";

config({override: true});
if (!process.env.TOKEN || !process.env.LAVALINK_HOST || !process.env.LAVALINK_PASSWORD || !process.env.LAVALINK_PORT) {
    console.error("Please provide a token, lavalink host, and lavalink password in a .env file or as environment variables.");
    process.exit(1);
}

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

interface Command {
    data: SlashCommandBuilder;
    execute: Function
}

interface Track {
    spotifyTrack: SpotifyTrack;
    requester: string;
}


interface ClientExtended extends Client {
    commands: Collection<string, Command>;
    moonlink: MoonlinkManager;
}

const client: ClientExtended = new Client(
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
        ],
    }
) as ClientExtended;

client.commands = new Collection();

client.moonlink = new MoonlinkManager(
    [
        {
            host: process.env.LAVALINK_HOST,
            port: Number(process.env.LAVALINK_PORT),
            secure: true,
            password: process.env.LAVALINK_PASSWORD,
        }
    ],
    {
        autoResume: true,
    },
    (guildID: any, sPayload: any) => {
        client.guilds.cache.get(guildID)!.shard.send(JSON.parse(sPayload));
    }
);

// Event: Node created
client.moonlink.on("nodeCreate", node => {
    console.log(`${node.host} was connected, and the magic is in the air`);
});

const commandsPath = `${__dirname}/commands`;
const commandFolders = readdirSync(commandsPath);

function checkForValidFile(file: string) {
    return file.split(".")[file.split(".").length - 1] === "js" || file.split(".")[file.split(".").length - 1] === "ts";
}

for (const folder of commandFolders) {
    const commandFiles = readdirSync(`${commandsPath}/${folder}`).filter(file => checkForValidFile(file));
    for (const file of commandFiles) {
        const command = await import(`${commandsPath}/${folder}/${file}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`Warn: ${file} does not have the proper structure.`);
        }
    }
}

const devCommandsPath = `${__dirname}/devCommands`;
const devCommandsFiles = readdirSync(devCommandsPath).filter(file => checkForValidFile(file));

for (const file of devCommandsFiles) {
    const command = await import(`${devCommandsPath}/${file}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`Warn: ${file} does not have the proper structure.`);
    }
}

const eventsPath = `${__dirname}/events`;
const eventFiles = readdirSync(eventsPath).filter(file => checkForValidFile(file));

for (const file of eventFiles) {
	const event = await import(`${eventsPath}/${file}`);
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

client.once(Events.ClientReady, async (readyClient: Client) => {
    console.log(`Logged in as ${readyClient.user?.tag}!`);

    client.moonlink.init(readyClient.user?.id);

    if (readyClient.application?.commands.holds.length === 0) {
        const commands: Array<JSON> = [];
        const devCommands: Array<JSON> = [];

        const commandsPath = `${__dirname}/commands`;
        const commandFolders = readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const commandFiles = readdirSync(`${commandsPath}/${folder}`).filter(file => checkForValidFile(file));
            for (const file of commandFiles) {
                const command = await import(`${commandsPath}/${folder}/${file}`);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.warn(`Warn: ${file} does not have the proper structure.`);
                }
            }
        }

        const devCommandsPath = `${__dirname}/devCommands`;
        const devCommandsFiles = readdirSync(devCommandsPath).filter(file => checkForValidFile(file));

        for (const file of devCommandsFiles) {
            const command = await import(`${devCommandsPath}/${file}`);
            if ('data' in command && 'execute' in command) {
                devCommands.push(command.data.toJSON());
            } else {
                console.warn(`Warn: ${file} does not have the proper structure.`);
            }
        }

        const rest = new REST().setToken(client.token!);

        (async () => {
            try {
                console.log('Started refreshing application (/) commands.');

                await rest.put(
                    Routes.applicationCommands(client.user!.id),
                    { body: commands },
                );

                await rest.put(
                    Routes.applicationGuildCommands(client.user!.id, '1185316093078802552'),
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

client.on(Events.Raw, (packet: any) => {
    client.moonlink.packetUpdate(packet);
});

client.login(process.env.TOKEN);
