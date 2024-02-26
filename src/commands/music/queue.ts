import { EmbedBuilder, CommandInteraction, SlashCommandBuilder, User, Team, TeamMember, Collection, Client} from "discord.js";
import { MoonlinkManager } from "moonlink.js";

interface Command {
    data: SlashCommandBuilder;
    execute: Function
}

interface ClientExtended extends Client {
    commands: Collection<string, Command>;
    moonlink: MoonlinkManager;
}

const data = new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current and next up songs.');

async function execute(interaction: CommandInteraction) {
    let client: ClientExtended = interaction.client as ClientExtended;
    if (!interaction.guild) {
        await interaction.reply({content: "You must use this in a server.", ephemeral: true});
        return;
    }
    let guildID = interaction.guild.id
    let player = await client.moonlink.players.get(guildID);
    if (!player) {
        await interaction.reply({content: "No songs are currently playing.", ephemeral: true});
        return;
    }
};

export {
    data,
    execute
};