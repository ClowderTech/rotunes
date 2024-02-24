import { joinVoiceChannel, type DiscordGatewayAdapterImplementerMethods, type DiscordGatewayAdapterLibraryMethods } from "@discordjs/voice";
import { SlashCommandStringOption, SlashCommandBuilder, CommandInteraction, GuildMember, MembershipScreeningFieldType } from "discord.js"
import { is_expired, refreshToken } from "play-dl";

const data =  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play the given song in your current voice call.')
    .addStringOption((option: SlashCommandStringOption) => option.setName("song").setDescription("The song name or url to play.").setRequired(true));
  
async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({content: "You must use this in a server.", ephemeral: true});
        return;
    }
    const member: GuildMember = <GuildMember>interaction.member;
    if (!member.voice) {
        await interaction.reply({content: "You are not in a voice channel.", ephemeral: true});
        return;
    }
    if (!member.voice.channel) {
        await interaction.reply({content: "You are not in a voice channel.", ephemeral: true});
        return;
    }
    const connection = joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: member.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
    });

    if (is_expired()) {
        await refreshToken()
    }

    
}

export {
    data,
    execute
};