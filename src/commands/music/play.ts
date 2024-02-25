import { joinVoiceChannel, type DiscordGatewayAdapterImplementerMethods, type DiscordGatewayAdapterLibraryMethods, createAudioResource, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { SlashCommandStringOption, SlashCommandBuilder, CommandInteraction, GuildMember, MembershipScreeningFieldType, Client, Collection } from "discord.js"
import { Kazagumo } from "kazagumo";
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
    kazagumo: Kazagumo;
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

    let player = await client.kazagumo.getPlayer(guildID);
    if (!player) {
        player = await client.kazagumo.createPlayer({
            guildId: guildID,
            voiceId: member.voice.channel.id,
            volume: 50,
        });
    }

    let song = <string>interaction.options.get("song", true).value;

    let playable = await player.search(song, {
        requester: interaction.user.id,
    });

    if (playable.type === "TRACK") {
        if (player.queue.length === 0 && !player.playing) {
            player.play(playable.tracks[0]);
        } else {
            player.queue.push(playable.tracks[0]);
        }
    } else if (playable.type === "PLAYLIST") {
        playable.tracks.forEach(track => {
            if (!player) {
                return;
            }
            if (player.queue.length === 0 && !player.playing) {
                player.play(track);
            } else {
                player.queue.push(track);
            }
        });
    } else if (playable.type === "SEARCH") {
        if (player.queue.length === 0 && !player.playing) {
            player.play(playable.tracks[0]);
        } else {
            player.queue.push(playable.tracks[0]);
        }
    }


    await interaction.reply({content: `Queued song: \`${playable.tracks[0].title}\``, ephemeral: true})
}

export {
    data,
    execute
};