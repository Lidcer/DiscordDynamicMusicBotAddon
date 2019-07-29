const Discord = require('discord.js');
const client = new Discord.Client();
const {
    SongPlayer
} = require('../dist/songPlayer');

const config = require('config.json')

const botToken = config.discordToken
const youtubeApiTokenhere = config.youtubeApi
const prefix = '!'

const songPlayer = new SongPlayer(youtubeApiTokenhere)


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (message.content.toLowerCase().startsWith(prefix))
        songPlayer.onMessage(message, message.content.slice(prefix.length));
});




client.login(botToken);