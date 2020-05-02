# Discord Dynamic Music Bot Addon

Discord Dynamic Music Bot Addon is a music bot addon that adds music feature to your bot. It has live progression tracker and streams high quality music from youtube.

In order for bot to work you have to install FFMPEG
You can get it here: https://www.ffmpeg.org/

works on discord.js v12 and probably higher versions

## NPM Package

```bash
- npm npm i discord-dynamic-music-bot-addon --save
- npm start
```

### Example code how to setup

```javascript
const Discord = require("discord.js");
const client = new Discord.Client();
const MusicBotAddon = require("discord-dynamic-music-bot-addon");
const prefix = "!";
const YOUTUBE_API_KEY = '';

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
  // playlistParse: boolean, // should bot parse playlists at all? (default: false)
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

client.on("message", message => {
  if (message.content.toLowerCase().startsWith(prefix)) {
    youtubePlayer.onMessagePrefix(message, prefix); // handles everything for you
    //youtubePlayer.onMessagePrefix(message, prefix, language); // if you want different language in different guilds you have to send language pack in message.
    //youtubePlayer.onMessage(message, message.content.slice(prefix.length),/*language*/); // if you want to do message mannerly remove prefix;
  }
});

client.login("DISCORD_TOKEN");
```

## Image Example how it looks like

![github-small](https://i.ibb.co/YbsckTV/img.png)

The bot is highly customizable it support language pack and custom command which can be defined in language pack.

Basic commands:

```
player help - help message
player <youtube_url> - to player url
player search [search query] - to search youtube
player destroy - to destroy player
player replay - to replay track
player loop - to loop track
player pause - to pause the track
player resume - to resumes paused track
player next - switches to next track in playlist
player previous - switches to previous track in playlist
player playlist parse <youtube_playlist_url> - parses youtube playlist
player playlist remove <id url> - remove item from playlist
player playlist shuffle - shuffles playlist
player playlist sort - sorts playlist if it was shuffled.
player playlist play - forcefully plays item
```

Recommended permissions for bot are

```
"PRIORITY_SPEAKER",
"CONNECT",
"MANAGE_MESSAGES",
"SEND_MESSAGES",
"SPEAK",
"EMBED_LINKS"
```

but it can work with only two permissions

```
"CONNECT",
"SEND_MESSAGES",
```

## Repository

### How to setup?

check example in (./example/index)
in config file you need discord token. Youtube api key is desirable but its not necessary

```
- Discord token https://discordapp.com/developers/applications/
- Youtube Api Key https://console.cloud.google.com/
```

### Running in production

```
- npm install
- npm run build
- npm start
```

### Running in development

```
- npm install
- npm run build:watch
- npm run nodemon
```

### Heroku

It works on heroku but you need to setup build pack

```
https://github.com/issueapp/heroku-buildpack-ffmpeg
https://github.com/heroku/heroku-buildpack-nodejs
```
