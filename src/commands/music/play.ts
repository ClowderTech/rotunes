import { joinVoiceChannel, type DiscordGatewayAdapterImplementerMethods, type DiscordGatewayAdapterLibraryMethods, createAudioResource, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { SlashCommandStringOption, SlashCommandBuilder, CommandInteraction, GuildMember, MembershipScreeningFieldType, Client, Collection } from "discord.js"
import { Kazagumo } from "kazagumo";
import { MoonlinkManager } from "moonlink.js";
import { SpotifyAlbum, SpotifyPlaylist, SpotifyTrack, is_expired, refreshToken, search, sp_validate, spotify, stream } from "play-dl";

const data =  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play the given song in your current voice call.')
    .addStringOption((option: SlashCommandStringOption) => option.setName("song").setDescription("The song name or url to play.").setRequired(true));
  
interface Command {
    data: SlashCommandBuilder;
    execute: Function
}

interface ClientExtended extends Client {
    commands: Collection<string, Command>;
    moonlink: MoonlinkManager;
}

async function execute(interaction: CommandInteraction) {
    let client: ClientExtended = interaction.client as ClientExtended;
    if (!interaction.guild) {
        await interaction.reply({content: "You must use this in a server.", ephemeral: true});
        return;
    }
    let guildID = interaction.guild.id
    let member: GuildMember = <GuildMember>interaction.member;
    if (!member.voice) {
        await interaction.reply({content: "You are not in a voice channel.", ephemeral: true});
        return;
    }
    if (!member.voice.channel) {
        await interaction.reply({content: "You are not in a voice channel.", ephemeral: true});
        return;
    }

    if (!interaction.channel) {
        await interaction.reply({content: "You must use this in a server.", ephemeral: true});
        return;
    }

    let player = await client.moonlink.players.get(guildID);
    if (!player) {
        let channel = member.voice.channel;
        player = await client.moonlink.players.create({
            guildId: guildID,
            voiceChannel: channel.id,
            textChannel: interaction.channel.id,
            autoPlay: false,
            volume: 50,
        });
    }

    if (!player.connected) {
        let channel = member.voice.channel;
        player.connect({
            setDeaf: true,
            setMute: false,
        });
    }

    let song = <string>interaction.options.get("song", true).value;

    let playable = await client.moonlink.search({
        query: song,
        source: "youtube",
        requester: interaction.user.id,
    });

    if (playable.loadType === "empty") {
        await interaction.reply({content: "No matches found.", ephemeral: true});
        return;
    } else if (playable.loadType === "error") {
        await interaction.reply({content: "Failed to load the song.", ephemeral: true});
        return;
    }

    if (playable.loadType === "track") {
        player.queue.add(playable.tracks[0]);
        await interaction.reply({content: `Queued song: \`${playable.tracks[0].title}\``})
    } else if (playable.loadType === "playlist") {
        playable.tracks.forEach(track => {
            if (!player) {
                return;
            }
            player.queue.add(track);
        });
        await interaction.reply({content: `Queued playlist: \`${playable.playlistInfo?.name}\``, ephemeral: true})
    } else if (playable.loadType === "search") {
        player.queue.add(playable.tracks[0]);
        await interaction.reply({content: `Queued song: \`${playable.tracks[0].title}\``})
    }

    if (!player.playing) {
        player.play();
    }
}

export {
    data,
    execute
};