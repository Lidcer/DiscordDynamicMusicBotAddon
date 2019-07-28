import { Message, VoiceChannel, Guild, VoiceConnection, RichEmbed, Collector, TextChannel, GuildMember } from "discord.js";
import { Embeds } from "./embeds";
import ytdl = require('ytdl-core-discord');
import * as Youtube from 'simple-youtube-api';
import { EventEmitter } from "events";
//import { YOUTUBE_API_KEY, client } from "../../index";

const youtubeLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/YouTube_social_white_squircle_%282017%29.svg/1024px-YouTube_social_white_squircle_%282017%29.svg.png'



interface VideoDetails {
    type: string
    id: string;
    url: string,
    submitter: string,
    time: string,
    title: string,
    length: number,
    channelId: string,
    channel: string,
    channelThumbnail: string,
    thumbnail: string,
    publishedAt: Date,
}


export class SongPlayer extends EventEmitter {

    private messageUpdateRate = 1000 * 10; // 10 seconds....
    private data = {}
    private youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);
    private urlTester = new RegExp(/https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/g)
    private youtube: Youtube


    constructor(youtubeApiKey: string) {
        super();
        if (typeof youtubeApiKey !== 'string') throw new Error('Youtube Api must be a string!')
        this.youtube = new Youtube(youtubeApiKey)



    }

    onMessage(message: Message, msg: string, language?: any) {
        console.log(this.data)
        if (!msg.toLowerCase().startsWith('player')) return;
        msg = msg.slice(6).replace(/  /g, ' ').trim();

        if (!language) language = {};

        if (!message.guild || message.author.bot) return;

        //just to trow object out of stack
        setTimeout(() => {

            const voiceChannel = message.member.voiceChannel;

            if (!voiceChannel) {
                const reply = language.notInVoiceChannel || 'You have to be in voice channel to use my commands!'
                return message.channel.send(Embeds.errorEmbed(reply))
                    .catch(() => message.channel.send(reply).catch(() => { }))
            }
            else if (!voiceChannel.joinable) {
                const reply = language.cannotConnect || 'Im unable to connect to that channel :neutral_face:!'
                return message.channel.send(Embeds.errorEmbed(reply))
                    .catch(() => message.channel.send(reply).catch(() => { }))
            }


            const checker = msg.toLowerCase();

            if (checker.includes('replay') || checker.includes('<>') || checker.includes('rewind')) {
                this.replaySong(message, language);
                return;
            }


            switch (checker) {
                case 'destroy':
                case 'leave':
                    this.destroy(message.guild, language);
                    break;

                case 'skip':
                case 'next':
                case '>>':
                    this.skipSong(message);
                    break;
                case 'help':

                    message.channel.send('<prefix>player <url>\n<prefix>player destroy\n<prefix>player skip\n<prefix>player replay')
                    break;


                case 'replay':
                case '<>':
                case 'rewind':
                    this.replaySong(message, language);
                    break;
                case 'shuffle':
                    this.shufflePlaylist(message, language);
                    break;
                default:
                    let urls = null;
                    if (urls = msg.match(this.youtubeTester)) this.addYoutubeToQueue(message, urls, language)
                    else if (msg.match(this.urlTester)) {
                        const reply = language.youtubeOnly || 'Sorry but only Youtube links are supported'
                        return message.channel.send(Embeds.infoEmbed(reply))
                            .catch(() => message.channel.send(reply).catch(() => { }))
                    }
                    else {
                        const reply = language.incorrectUs || 'You are using player command incorrectly. Type `player help` to get more info'

                        return message.channel.send(Embeds.errorEmbed(reply))
                            .catch(() => message.channel.send(reply).catch(() => {

                            }))
                    }
                    break;
            }

        }, 0);
    }



    private async addYoutubeToQueue(message, urls, language) {
        this.setup(message.guild)

        if (this.data[message.guild.id].textChannel)
            if (this.data[message.guild.id].textChannel !== message.channel) {
                const reply = language.wrongChannel || 'Wrong cannel please use';

                return message.channel.send(message.author, Embeds.errorEmbed(`${reply} ${this.data[message.guild.id].textChannel}`))
                    .catch(() => message.channel.send(`${message.author}${reply} ${this.data[message.guild.id].textChannel}`).catch(err => {
                        this.data[message.guild.id].textChannel = null;
                        this.data[message.guild.id].textChannel = message.channel;
                        this.updatePlayer(message.guild)
                        this.addYoutubeToQueue(message, urls, language)
                    }))
            }

        for (const url of urls) {
            await this.youtube.getVideo(url)
                .then(async video => {
                    const channel = await this.youtube.getChannelByID(video.channel.id).catch(() => { })



                    const hours = video.duration.hours ? `${video.duration.hours}:` : '';
                    const minutes = video.duration.minutes.toString().length === 1 ? `0${video.duration.minutes}` : video.duration.minutes
                    const seconds = video.duration.seconds.toString().length === 1 ? `0${video.duration.seconds}` : video.duration.seconds
                    const id = video.id;



                    const ids = this.data[message.guild.id].queue.map(queue => queue.id);

                    const length = (parseInt(video.duration.hours) * 60 * 60) + (parseInt(video.duration.minutes) * 60) + parseInt(video.duration.seconds)

                    if (ids.includes(id)) throw 'alreadyExistInPlaylist'
                    else if (this.data[message.guild.id].currentSong && this.data[message.guild.id].currentSong.id === id) throw 'playingRightNow'

                    const { thumbnails } = video;


                    let videoThumbnail = null;
                    if (thumbnails.high) videoThumbnail = video.thumbnails.high.url
                    else if (thumbnails.medium) videoThumbnail = video.thumbnails.medium.url
                    else if (thumbnails.default) videoThumbnail = video.thumbnails.default.url
                    else if (thumbnails.standard) videoThumbnail = video.thumbnails.standard.url

                    const videoDetails: VideoDetails = {
                        type: 'youtube',
                        id: video.id,
                        url: url,
                        submitter: message.author.id,
                        time: `${hours}${minutes}:${seconds}`.trim(),
                        title: video.title,
                        length: length,
                        channelId: video.channel.id,
                        channel: video.channel.title,
                        channelThumbnail: null,
                        thumbnail: videoThumbnail,
                        publishedAt: video.publishedAt
                    }
                    if (channel) {
                        videoDetails.channelThumbnail = channel.thumbnails.default.url;
                    }

                    if (video.duration.hours >= 3) {
                        const reply = language.toLongVideo || 'Video cannot be longer than 3 hours!';

                        return message.channel.send(Embeds.errorEmbed(`${reply} ${url}`))
                            .catch(() => message.channel.send(`${reply} ${url} `).catch(() => { }))
                    } else if (video.duration.minutes === 0 && video.duration.seconds < 10) {
                        const reply = language.toShortVideo || 'Cannot play video that is shorter than 10 second!';

                        return message.channel.send(Embeds.errorEmbed(`${reply} ${url} `))
                            .catch(() => message.channel.send(`${reply} ${url} `).catch(() => { }))
                    }
                    else {
                        this.data[message.guild.id].queue.push(videoDetails);
                        const embed = this.queueEmbed(message, videoDetails, language);

                        return message.channel.send(embed)
                            .catch(() => message.channel.send(`${url} Added to playlist`).catch(() => { }))
                    }
                })
                .catch(error => {
                    let reply = '';
                    if (error === 'alreadyExistInPlaylist') {
                        reply = language.alreadyExistInPlaylist || 'Already exist in playlist';
                        reply = `${message.author} ${reply}`;
                    }
                    else if (error === 'playingRightNow') {
                        reply = language.currentSongInPlaylist || 'Cannot add song to playlist that is currently playing';
                        reply = `${message.author} ${reply}`;
                    } else {
                        console.error(error)
                        reply = language.InvaildURL || 'Invalid Url';
                    }


                    return message.channel.send(Embeds.errorEmbed(`${reply} ${url} `))
                        .catch(() => message.channel.send(`${reply} ${url} `).catch(() => { }))

                })
        }
        message.delete().catch(() => { });
        this.playerStart(message, language)

    }


    private playerStart(message: Message, language) {
        if (this.data[message.guild.id].connection) {
            return this.updatePlayer(message.guild);
        };
        if (!message.guild.available) return this.destroy(message.guild, language);

        if (!this.data[message.guild.id].queue[0]) {
            this.destroy(message.guild, language);
            return
        }

        const voiceChannel = message.member.voiceChannel;
        if (!voiceChannel) return this.destroy(message.guild, language);

        voiceChannel.join()
            .then(connection => {
                this.data[message.guild.id].connection = connection;
                this.data[message.guild.id].textChannel = message.channel;

                this.data[message.guild.id].setTimeout = setInterval(() => {
                    this.updatePlayerStatus(message.guild)
                }, this.messageUpdateRate);


                message.channel.send(Embeds.infoEmbed('Player created'))
                    .then(msg => {
                        this.data[message.guild.id].playerMessage = msg
                    })
                    .catch(() => {
                        message.channel.send('player Created')
                            .then(msg => {
                                this.data[message.guild.id].playerMessage = msg
                            }).catch(() => { });
                    })
                this.nextSong(message.guild, language);
            })
            .catch(error => {
                return message.channel.send(Embeds.errorEmbed(error))
                    .catch(() => message.channel.send(`error`).catch(() => { }))
            });
    }

    private verifyUser(member: GuildMember): boolean {
        const memberRoles = member.roles.filter(r => r.name.toLowerCase() === 'dj' || r.name.toLowerCase() === 'mod' || r.name.toLowerCase() === 'moderator').map(r => r)

        if (member.hasPermission("ADMINISTRATOR") || member.hasPermission("MANAGE_CHANNELS") || memberRoles.length !== 0)
            return true;
        else return false;
    }

    private updatePlayer(guild: Guild) {

        const playerMessage = this.data[guild.id].playerMessage as Message;
        const channel = this.data[guild.id].textChannel as TextChannel;

        playerMessage.delete().catch(() => { })

        if (channel) {
            const currentSong = this.data[guild.id].currentSong

            channel.send(this.playerEmbed(currentSong))
                .then(msg => {
                    this.data[guild.id].playerMessage = msg;
                })
                .catch(() => {
                    channel.send(currentSong.url)
                        .then(msg => {
                            this.data[guild.id].playerMessage = msg;
                        })
                        .catch(() => { });
                })
        }
    }

    private updatePlayerStatus(guild) {


        //Date.now()
        if (!this.data[guild.id].startSongTime) return;
        if (!this.data[guild.id].playerMessage) return;
        if (!this.data[guild.id].currentSong) return;

        const length = this.data[guild.id].currentSong.length
        const startSongTime = this.data[guild.id].startSongTime
        const now = Date.now();
        const timePassed = now - startSongTime;
        if (timePassed <= length) return;


        const date = new Date(timePassed);

        let seconds: any = date.getSeconds();
        let minutes: any = date.getMinutes();
        let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

        seconds = seconds < 10 ? `0${seconds}` : seconds

        minutes = minutes < 10 ? `0${minutes}` : minutes

        if (hours)
            hours = hours < 10 ? `0${hours}:` : `${hours}:`
        else
            hours = '';


        const embed = new RichEmbed();
        this.addBasicInfo(embed, this.data[guild.id].currentSong)
        embed.addField('Video progression', `${hours}${minutes}:${seconds} / ${this.data[guild.id].currentSong.time}`);



        const message = this.data[guild.id].playerMessage as Message
        embed.setTimestamp(Date.now())
        embed.setFooter('Playing now', youtubeLogo)

        message.edit(embed).catch(err => { console.log(err) });

    }


    private async replaySong(message: Message, language: any) {

        const userStatus = this.verifyUser(message.member)


        if (!userStatus) {
            message.channel.send('Missing permission')
            return;
        }

        let force = false;
        if (message.content.toLowerCase().includes('-f') || message.content.toLowerCase().includes('--force'))
            force = true;

        if (this.data[message.guild.id].currentSong === this.data[message.guild.id].queue[0]) {
            if (force) {
                message.channel.send('Force replaying has been executed!')
                return this.skipSong(message)
            }

            message.channel.send('Already on list for reaply!')
            return;
        }
        let queue = [this.data[message.guild.id].currentSong]
        const thisQuenue = this.data[message.guild.id].queue;

        for (const song of thisQuenue) {
            queue.push(song)
        }
        this.data[message.guild.id].queue = queue;
        if (force) {
            message.channel.send('Force replaying has been executed!')
            this.skipSong(message)
        }
        else {
            message.channel.send('Your song will be when this song ends!')
        }

    }

    private skipSong(message: Message) {
        const userStatus = this.verifyUser(message.member)

        if (!userStatus) {
            message.channel.send('Missing permission')
            return;
        }

        const connection = this.data[message.guild.id].connection as VoiceConnection
        connection.dispatcher.end();

    }

    private async shufflePlaylist(message: Message, language: any) {
        const userStatus = this.verifyUser(message.member)

        if (!userStatus) {
            message.channel.send('Missing permission')
            return;
        }
        this.data[message.guild.id].queue.sort(() => Math.random() - 0.5);
        message.channel.send('Playlist has been shuffled')

    }


    async nextSong(guild: Guild, language) {
        if (!this.data[guild.id]) return
        if (this.data[guild.id].queue.length === 0) return this.destroy(guild, language);
        if (!this.data[guild.id].queue) return this.destroy(guild, language);
        if (!this.data[guild.id].connection) return this.destroy(guild, language)

        if (this.data[guild.id].connection) {
            const type = this.data[guild.id].queue[0].type
            const connection = this.data[guild.id].connection as VoiceConnection
            const currentSong = this.data[guild.id].queue.shift();
            this.data[guild.id].currentSong = currentSong;


            if (type === 'youtube') {
                await ytdl(currentSong.url)
                    .then(stream => {
                        const dispatcher = connection.playOpusStream(stream);

                        this.updatePlayer(guild);
                        dispatcher.on('end', e => {
                            // console.log('ping')
                            setTimeout(() => {

                                this.nextSong(guild, language);
                            }, 1000 * 2);
                        })
                        dispatcher.on('start', e => {
                            this.updatePlayerStatus(guild);
                            this.data[guild.id].startSongTime = Date.now();
                        })
                        dispatcher.on('error', async e => {
                            //console.log('error')

                            const channel = this.data[guild.id].textChannel;
                            if (channel) {
                                await channel.send(Embeds.errorEmbed(`${e} \`${currentSong.url}\``))
                                    .catch(() => channel.send(`${e} \`${currentSong.url}\``).catch(() => { }))
                            }

                            this.nextSong(guild, language);
                        })





                    })
                    .catch(s => {
                        this.emit('error', s)
                        if (this.data[guild.id].textChannel) {
                            const channel = this.data[guild.id].textChannel;
                            const reply = language.brokenLink || 'Unable to play link'

                            return channel.send(Embeds.errorEmbed(`${reply} \`${currentSong.url}\``))
                                .catch(() => channel.send(`${reply} \`${currentSong.url}\``).catch(() => { }))
                        }
                        // console.log('url broken skipping...')
                        this.nextSong(guild, language);
                    })
            }
            else {
                this.nextSong(guild, language);
            }
        }
    }

    public async destroy(guild, language) {

        if (this.data[guild.id].connection) {
            if (this.data[guild.id].setTimeout)
                clearInterval(this.data[guild.id].setTimeout)
            this.data[guild.id].setTimeout = null;

            const connection = this.data[guild.id].connection as VoiceConnection
            const channel = this.data[guild.id].textChannel as TextChannel
            this.data[guild.id].queue = [];
            await connection.disconnect();

            if (this.data[guild.id].playerMessage) {
                this.data[guild.id].playerMessage.delete().catch(() => { })
            }
            if (channel) {
                const reply = language.playerDestroyed || 'Player has been destroyed';
                const channel = this.data[guild.id].textChannel;
                channel.send(Embeds.infoEmbed(`${reply}`))
                    .then(msg => {
                        setTimeout(() => {
                            msg.delete().catch(() => { });
                        }, 10000);
                    })
                    .catch(() => channel.send(`${reply} `)
                        .then(msg => {
                            setTimeout(() => {
                                msg.delete().catch(() => { });
                            }, 10000);
                        })
                        .catch(() => { }))
            }
        }


        delete this.data[guild.id];
    }


    private playerEmbed(videoDetails) {
        const embed = new RichEmbed();
        this.addBasicInfo(embed, videoDetails);
        embed.setColor("RED")

        embed.setFooter('Playing now', youtubeLogo)
        return embed

    }


    private queueEmbed(message: Message, videoDetails: VideoDetails, language) {
        const embed = new RichEmbed();
        embed.addField('Video duration', videoDetails.time, true)
        this.addBasicInfo(embed, videoDetails);

        embed.setDescription(`Added by ${message.author.tag}`)
        embed.setFooter('Playlist', youtubeLogo);
        embed.setTimestamp(Date.now())
        return embed;

    }

    private addBasicInfo(embed: RichEmbed, videoDetails: VideoDetails) {
        embed.setAuthor(videoDetails.channel, videoDetails.channelThumbnail, `https://www.youtube.com/channel/${videoDetails.channelId}`);
        embed.setTitle(videoDetails.title);
        embed.setColor('RED');
        embed.setURL(videoDetails.url);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const date = videoDetails.publishedAt;

        const day = date.getDate();
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        embed.addField('Published', `${day} ${month} ${year}`, true)

        embed.setThumbnail(videoDetails.thumbnail);

    }


    private setup(guild) {
        if (this.data[guild.id]) return;
        this.data[guild.id] = {
            voiceChannel: null,
            startSongTime: null,
            textChannel: null,
            playerMessage: null,
            connection: null,
            currentSong: null,
            queue: [],
            setTimeout: null,
        }
    }

}