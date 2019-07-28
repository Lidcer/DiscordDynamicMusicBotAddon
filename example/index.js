const Discord = require('discord.js');
const client = new Discord.Client();
const {
    SongPlayer
} = require('../dist/songPlayer');

const botToken = 'YOUR_BOT_TOKEN_HERE'
const youtubeApiTokenhere = 'YOUTUBE_API_KEY_HERE'
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