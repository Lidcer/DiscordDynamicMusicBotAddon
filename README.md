# DiscordYoutubePlayer
DiscordYoutubePlayer is a music bot with with live progression tracker and high quality streaming music. 
![github-small](https://i.ibb.co/YbsckTV/img.png)

The bot is highly customizable it support language pack and custom command which can be defined in language pack.

Basic function Commands
commands:
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
but it can works with only two permissions
```
"CONNECT",
"SEND_MESSAGES",
```

## How to setup?
check example in ()./example/index)
in config file you need discord token. Youtube apk is desirable but its not necessary
```
- Discord token https://discordapp.com/developers/applications/
- Youtube Api Key https://console.cloud.google.com/
```

## Running in production
```
- npm install
- npm run build
- npm start 
```
## Running in development
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




