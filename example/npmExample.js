const Discord = require('discord.js');
const client = new Discord.Client();
const MusicBotAddon = require('discord-dynamic-music-bot-addon');

const prefix = '!';

const YOUTUBE_API_KEY = undefined;
const DISCORD_TOKEN = ''
const options = {
    // messageUpdateRate: number, // how fast should message be updated in second. Under 5 seconds its not going to work. (default: 5)
    // selfDeleteTime: number, // error message that bot sends to notify user about something are going to delete in seconds. (default: 5)
    // leaveVoiceChannelAfter: number, // when there isn't playing anything when should bot leave the channel is seconds. (default: 20)
    // leaveVoiceChannelAfterAllMembersLeft: number, // when no one is in channel and nothing is playing when should bot leave the channel is seconds. (default: 20)
    // maxTrackLength: number, // How long can requested track be in minutes. (default: 180 )
    // autoQueryDetection: boolean, // Smart feature a user only have to type player command and youtube url link and its going to automatically search or look for url. (default: true)
    // autoPlaylistDetection: boolean, // should autoQueryDetection look for playlist link and automatically parse them? (default: false)
    // waitTimeBetweenTracks: number,   // how longs should bot wait between switching tracks in seconds. (default: 2)
    // maxItemsInPlayList: number, // how many songs can playlist have in it. (default: 100) 
    // maxUserItemsInPlayList: number,  // how many songs can user have in playlist (default: 10)
    // playlistParseWait: number, // wait time between fetching each track form playlist in seconds (default: 2)
    // multipleParser: boolean, // should bot look for multiple url in one message eg (player yt_url yt_url) (default: true)
    // playlistParse: boolean, // should bot parse playlists at all? (default: true)
    // votePercentage: number, // how many votes in percentage are required to perform vote action in percentage (default: 60)
    // coolDown: number, // how repeatedly can user send bot command. It's recommended to be higher tan 5 seconds in seconds (default: 5)
    // deleteUserMessage: boolean, // should delete user command messages (default: true)
    // hardDeleteUserMessage: boolean, // should delete every user message when the player is active (default:false)
    // reactionButtons: boolean, // should add reaction button to easily control the player with out entering commands (default: true)
    // suggestReplay: number, // should bot offer you a replay after the end of the song in seconds 0 to disable the feature (default: 20)

    // https://github.com/Lidcer/DiscordDynamicMusicBotAddon/blob/master/example/language.json.
    // language: language, // Custom language pack is check url above. By defining custom command you are only added aliases to existing commands the default ones are still going to be available
};

const youtubePlayer = new MusicBotAddon.YoutubePlayer(YOUTUBE_API_KEY, options);

client.on('message', message => {
    if (message.content.toLowerCase().startsWith(prefix)) {
        youtubePlayer.onMessagePrefix(message, prefix); // handles everything for you
        //youtubePlayer.onMessagePrefix(message, prefix, language); // if you want different language in different guilds you have to send language pack in message.
        //youtubePlayer.onMessage(message, message.content.slice(prefix.length),/*language*/); // if you want to do message mannerly remove prefix;
    }
});

client.login(DISCORD_TOKEN);