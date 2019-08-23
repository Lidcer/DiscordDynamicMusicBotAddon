const Discord = require('discord.js');
const client = new Discord.Client();
const {
    YoutubePlayer
} = require('../dist/YoutubePlayer');

const config = require('./config.json')

const botToken = config.discordToken
const youtubeApiToken = config.youtubeApi
const prefix = '!'

const youtubePlayer = new YoutubePlayer(youtubeApiToken)


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
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