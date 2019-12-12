const Discord = require('discord.js');
const client = new Discord.Client();
const {
    YoutubePlayer
} = require('../dist/YoutubePlayer');
//const YoutubePlayer = require('../dist/DiscordInteractiveYoutubePlayer');

const language = require('./language.json');

const config = require('./config.json');

const botToken = config.discordToken;
const youtubeApiToken = config.youtubeApi;
const prefix = '!';

const youtubePlayer = new YoutubePlayer(youtubeApiToken, language);
//youtubePlayer.deleteUserMessages = false;
youtubePlayer.usePatch = true;
youtubePlayer.selfDelete = 0;

client.on('ready', () => {
    console.info(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
        game: {
            name: `${prefix}player <url>`,
            type: "WATCHING"
        }
    })
});

client.on('message', message => {
    if (message.content.toLowerCase().startsWith(prefix))
        youtubePlayer.onMessage(message, message.content.slice(prefix.length));
});

client.on("error", console.error);
client.on("debug", console.info);

client.login(botToken);