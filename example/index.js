const Discord = require('discord.js');
const client = new Discord.Client();
const { YoutubePlayer } = require('../dist/YoutubePlayer');

const language = require('./language.json');
let config = {};
try {
    config = require('./config.json');
} catch (_) {
    config.DISCORD_TOKEN = process.env.DISCORD_TOKEN
    config.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
}

const prefix = '+';

const options = {
    // messageUpdateRate: number, // how fast should message be updated in second. Under 5 seconds its not going to work. (default: 5)
    // selfDeleteTime: number, // error message that bot sends to notify user about something are going to delete in seconds. (default: 5)
    // leaveVoiceChannelAfter: number, // when there isn't playing anything when should bot leave the channel is seconds. (default: 20)
    // leaveVoiceChannelAfterAllMembersLeft: number, // when no one is in channel and nothing is playing when should bot leave the channel is seconds. (default: 20)
    // maxTrackLength: number, // How long can requested track be in minutes. (default: 180 )
    // usePatch: boolean, // If you are experience issue where track is terminated 10 - 15 seconds before the end of the track enable it. (default: false)
    // autoQueryDetection: boolean, // Smart feature a user only have to type player command and youtube url link and its going to automatically search or look for url. (default: true)
    // autoPlaylistDetection: boolean, // should autoQueryDetection look for playlist link and automatically parse them? (default: false)
    // waitTimeBetweenTracks: number,   // how longs should bot wait between switching tracks in seconds. (default: 2)
    // maxItemsInPlayList: number, // how many songs can playlist have in it. (default: 100) 
    // maxUserItemsInPlayList: number,  // how many songs can user have in playlist (default: 10)
    // playlistParseWait: number, // wait time between fetching each track form playlist in seconds (default: 2)
    // multipleParser: boolean, // should bot look for multiple url in one message eg (player yt_url yt_url) (default: true)
    // playlistParse: boolean, // should bot parse playlists at all? (default: true)
    // votePercentage: number, // how many votes in percentage are required to perform vote action in percentage (default: 60)
    // coolDown: number, // how repeatedly can a user send bot command. It's recommended to be higher tan 5 seconds in seconds (default: 5)
    // deleteUserMessage: boolean, // should delete user command messages (default: true)
    // hardDeleteUserMessage: boolean, // should delete every user message when the player is active (default:false)
    // reactionButtons: boolean, // should add reaction button to easily control the player with out entering commands (default: true)
    // suggestReplay: number, // should bot offer you a replay after the end of the song in seconds 0 to disable the feature (default: 20)
    // language: language, // Custom language pack is check ./language.json. by defining custom command you are only added aliases to existing commands the default ones are still going to be available
};

const youtubePlayer = new YoutubePlayer(config.YOUTUBE_API_KEY, options);


client.on('ready', async () => {
    console.info(`Logged in as ${client.user.tag}!`);
    console.info(`Invite Link ${await client.generateInvite(["PRIORITY_SPEAKER", "CONNECT", "MANAGE_MESSAGES", "SEND_MESSAGES", "SPEAK", "EMBED_LINKS"])}`)
    setPresence()
});

function setPresence() {
    client.user.setPresence({
        game: {
            name: `${prefix}player <url> | ${client.guilds.size}`,
            type: "WATCHING"
        }
    })
}

process.on('SIGINT', () => {
    youtubePlayer.destroy(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    youtubePlayer.destroy(() => {
        process.exit(0);
    });
});


client.on('message', message => {
    if (message.content.toLowerCase().startsWith(prefix)) {
        youtubePlayer.onMessagePrefix(message, prefix); // handles everything for you

        //youtubePlayer.onMessagePrefix(message, prefix, language); // if you want different language in different guilds you have to send language pack in message.

        //youtubePlayer.onMessage(message, message.content.slice(prefix.length),/*language*/); // if you want to do message mannerly remove prefix;
    }
});


client.on('guildCreate', guild => {
    setPresence();
    const channel = guild.channels.find(c => (c.type === 'text' && c.permissionsFor(guild.me).has('SEND_MESSAGES')));
    const message = [
        `This bot is open source. You can find this code here <https://github.com/Lidcer/DiscordDynamicMusicBotAddon>.`,
        `Checkout \`${prefix}player help\` command`,
    ].join('\n');

    if (channel) channel.send(message);
});
client.on('guildDelete', () => { setPresence(); });

//client.on("error", console.error);
//client.on("debug", console.info);

client.login(config.DISCORD_TOKEN);