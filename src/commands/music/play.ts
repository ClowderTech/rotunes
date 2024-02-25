import { joinVoiceChannel, type DiscordGatewayAdapterImplementerMethods, type DiscordGatewayAdapterLibraryMethods } from "@discordjs/voice";
import { SlashCommandStringOption, SlashCommandBuilder, CommandInteraction, GuildMember, MembershipScreeningFieldType, Client, Collection } from "discord.js"
import { SpotifyAlbum, SpotifyPlaylist, SpotifyTrack, is_expired, refreshToken, search, sp_validate, spotify } from "play-dl";

const data =  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play the given song in your current voice call.')
    .addStringOption((option: SlashCommandStringOption) => option.setName("song").setDescription("The song name or url to play.").setRequired(true));
  
interface Command {
    data: SlashCommandBuilder;
    execute: Function
}

interface Track {
    spotifyTrack: SpotifyTrack;
    requester: string;
}

class RoTunes extends Client {
    public commands: Collection<string, Command> = new Collection();
    public queue_system: Map<string, Track[]> = new Map();
}

async function execute(interaction: CommandInteraction) {
    const client: RoTunes = interaction.client as RoTunes;
    if (!interaction.guild) {
        await interaction.reply({content: "You must use this in a server.", ephemeral: true});
        return;
    }
    const guildID = interaction.guild.id
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
        await refreshToken();
    }

    const lookable = <string>interaction.options.get("song", true).value;

    if (!sp_validate(lookable)) {
        await interaction.reply({content: "This is not a valid search term or spotify url.", ephemeral: true});
        return;
    }

    const spotify_data = await spotify(lookable);

    if (spotify_data.type === "track") {
        const spotify_data_track: SpotifyTrack = spotify_data as SpotifyTrack;
        const youtube_search_data = await search(`${spotify_data_track.name}`)
        const track = {
            spotifyTrack: spotify_data_track,
            requester: member.id,
        }
        if (!client.queue_system.get(guildID)) {
            client.queue_system.set(guildID, []);
        } else {
            client.queue_system.get(guildID)?.push(track)
        }
    } else if (spotify_data.type === "album") {
        const spotify_data_album: SpotifyAlbum = spotify_data as SpotifyAlbum;
        const all_tracks = await spotify_data_album.all_tracks()
        all_tracks.forEach(spotify_data_track => {
            const track = {
                spotifyTrack: spotify_data_track,
                requester: member.id,
            }
            if (!client.queue_system.get(guildID)) {
                client.queue_system.set(guildID, [track]);
            } else {
                client.queue_system.get(guildID)?.push(track);
            }
        });
    } else if (spotify_data.type === "playlist") {
        const spotify_data_playlist: SpotifyPlaylist = spotify_data as SpotifyPlaylist;
        const all_tracks = await spotify_data_playlist.all_tracks()
        all_tracks.forEach(spotify_data_track => {
            const track = {
                spotifyTrack: spotify_data_track,
                requester: member.id,
            }
            if (!client.queue_system.get(guildID)) {
                client.queue_system.set(guildID, [track]);
            } else {
                client.queue_system.get(guildID)?.push(track);
            }
        });
    }

    await interaction.reply({content: `Test: ${client.queue_system.get(guildID)}`, ephemeral: true})
}

export {
    data,
    execute
};