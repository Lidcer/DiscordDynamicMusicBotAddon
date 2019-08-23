import { Message, VoiceChannel, Guild, VoiceConnection, RichEmbed, Collector, TextChannel, GuildMember, Channel, GuildAuditLogs, ColorResolvable } from "discord.js";
import { Embeds } from "./embeds";
import ytdl = require('ytdl-core-discord');
import { Youtube, VideoData } from "./Youtube";

const youtubeLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/YouTube_social_white_squircle_%282017%29.svg/1024px-YouTube_social_white_squircle_%282017%29.svg.png'
const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);

const urlTester = new RegExp(/https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/g)
const defaultPlayerUpdate = 1000 * 5
const defaultWaitTimeBetweenTracks = 1000 * 2

const messageUpdateRate = new WeakMap();
const data = new WeakMap();
const youtubeKey = new WeakMap();
const secondCommand = new WeakMap();
const playerLanguage = new WeakMap();
const waitTimeBetweenTracks = new WeakMap();
const deleteUserMessage = new WeakMap();

interface PlayerLanguage {
    notInVoiceChannel?: string
    cannotConnect?: string
    onlyYoutubeLinks?: string
    incorrectUse?: string
    videoAdded?: string
    luckSearch?: string
    alreadyOnPlaylist?: string
    missingPermission?: string
    video: VideoLanguge
    player: Player
    help: Help
}

interface Player {
    created: string
    destroy: string
    paused: string
    resumed: string
    suffled: string
    brokenUrl: string
    replay: string
    forceReplay: string
    alredyOnReplay: string
    nothingToSuffle: string
    statusPlaying: string
    statusPaused: string
    loopingOn: string
    loopingOff: string
    skip: string
    error: string
}

interface Help {
    url: string
    skip: string
    replay: string
    destroy: string
    search: string
    pause: string
    resume: string

}

interface VideoLanguge {
    views?: string
    upvote?: string
    downvote?: string
    comments?: string
    published?: string
    rateing?: string
    duration?: string
    progress?: string
    monthsName?: string[]
}

interface GuildQueue {
    video: VideoData
    submitter: GuildMember
    submited: Date
}

interface GuildData {
    paused: Date
    looping: boolean
    voiceChannel: VoiceChannel
    startSongTime: Date
    textChannel: TextChannel
    playerMessage: Message
    connection: VoiceConnection
    currentSong: GuildQueue
    color: number[]
    queue: GuildQueue[]
    setTimeout: NodeJS.Timeout
}

export class YoutubePlayer {

    constructor(youtubeApiKey: string, language?: PlayerLanguage) {
        if (language && typeof language !== "object") throw new Error('language must be an object!')
        if (!language) language = {} as any;
        if (!youtubeApiKey) throw new Error("Youtube api key cannot be empty");
        if (typeof youtubeApiKey !== "string") throw new Error(`Expected string got ${typeof youtubeApiKey}`);
        youtubeKey.set(this, youtubeApiKey)
        messageUpdateRate.set(this, defaultPlayerUpdate);
        data.set(this, {});
        secondCommand.set(this, true);
        waitTimeBetweenTracks.set(this, defaultWaitTimeBetweenTracks)
        deleteUserMessage.set(this, true);

        const thisPlayerLanguage: PlayerLanguage = {
            notInVoiceChannel: language.notInVoiceChannel || 'You have to be in voice channel in order to use player commands!',
            cannotConnect: language.cannotConnect || 'Im unable to connect to this channel! 😐',
            onlyYoutubeLinks: language.onlyYoutubeLinks || 'Sorry but only Youtube links are supported',
            incorrectUse: language.incorrectUse || 'You are using player command incorrectly. Type `player help` to get more info',
            videoAdded: language.videoAdded || 'Added by',
            luckSearch: language.luckSearch || 'with luck search',
            missingPermission: language.missingPermission || "Missing permission you need to have role DJ to use command or being alone in channel also works.",
            alreadyOnPlaylist: language.alreadyOnPlaylist || "Requested track is already on playlist!",
            video: {
                comments: "Comments",
                downvote: "👎",
                upvote: "👍",
                rateing: "Raiting",
                views: "Views",
                published: "Published",
                duration: "Duration",
                progress: "Progress",
                monthsName: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            },
            player: {
                created: "Player has been created",
                destroy: "Player has been destroyed",
                brokenUrl: "Broken Link",
                paused: "Player has been paused by",
                resumed: "Player has been resumed by",
                suffled: "Playlist shuffled",
                replay: "Your song is going to be replayed when this song ends",
                forceReplay: "Executing force replay",
                alredyOnReplay: "This song is already on list for replay",
                skip: "Track has been skiped by",
                nothingToSuffle: "Playlist dose not have enough song to shuffle",
                statusPaused: "Paused",
                statusPlaying: "Playing",
                loopingOn: "🔁 Looping this song is now enabled ✔️",
                loopingOff: "🔁 Looping this song is not disabled ❌",
                error: "Error"
            },
            help: {
                destroy: "<preifx> player destory - to destroy player",
                replay: "<preifx> player replay - to replay track",
                pause: "<preifx> player pause - to pause the track",
                resume: "<preifx> player resume - to resumes paused track",
                search: "<preifx> player search [search query] - to search youtube",
                skip: "<preifx> player skip - to skips track",
                url: "<preifx> player <youtube url> - to player url"
            }

        }
        playerLanguage.set(this, thisPlayerLanguage);

    }


    onMessage(message: Message, msg: string) {
        const language = playerLanguage.get(this);
        if (!message.guild || message.author.bot) return;
        const channel = message.channel as TextChannel;
        if (!channel.permissionsFor(message.guild.me).hasPermission("SEND_MESSAGES")) return;

        const checker = msg.toLowerCase();


        if (checker === 'player') return playerHelp(this, message);
        else if (secondCommand.get(this) && checker === 'p') return playerHelp(this, message);

        if (checker.toLowerCase().startsWith('player '))
            msg = msg.slice(6).replace(/  /g, ' ').trim();
        else if (secondCommand.get(this) && checker.toLowerCase().startsWith('p '))
            msg = msg.slice(1).replace(/  /g, ' ').trim();
        else
            return;


        //just to trow object out of stack
        setTimeout(() => {
            const voiceChannel = message.member.voiceChannel;

            if (!voiceChannel) {
                const reply = language.notInVoiceChannel
                return message.channel.send(Embeds.errorEmbed(reply))
                    .catch(() => message.channel.send(reply).catch(() => { }))
            }
            else if (!voiceChannel.joinable) {
                const reply = language.cannotConnect
                return message.channel.send(Embeds.errorEmbed(reply))
                    .catch(() => message.channel.send(reply).catch(() => { }))
            }

            /*
            if (checker.includes('replay') || checker.includes('<>') || checker.includes('rewind')) {
                //  return replaySong(message, language);
            }*/

            setupGuild(this, message.guild.id)

            if (msg.toLowerCase() !== 'yt' && msg.toLowerCase().startsWith('yt')) {
                msg = msg.slice(2).trim();
                youtubeLuckSearch(this, message, msg)
                return;
            }
            if (msg.toLowerCase() !== 'youtube' && msg.toLowerCase().startsWith('youtube')) {
                msg = msg.slice(7).trim();
                youtubeLuckSearch(this, message, msg)
                return;
            }
            if (msg.toLowerCase() !== 'search' && msg.toLowerCase().startsWith('search')) {
                msg = msg.slice(7).trim();
                youtubeLuckSearch(this, message, msg)
                return;
            }


            switch (msg.toLowerCase()) {
                case 'destroy':
                case 'leave':
                case 'kill':
                    destroyPlayer(this, message.guild);
                    message.delete().catch(() => { })
                    break;

                case 'skip':
                case 'next':
                case '>>':
                    skipTrack(this, message);
                    message.delete().catch(() => { })
                    break;
                case 'help':
                case '?':
                    playerHelp(this, message);
                    break;
                case 'pause':
                    pauseTrack(this, message);
                    break;
                case 'resume':
                    resumeTrack(this, message);
                    break;
                case 'replay':
                case '<>':
                case 'rewind':
                    replayTrack(this, message);
                    break;
                case 'loop':
                    loopTrack(this, message)
                    break;
                case 'shuffle':
                case 'mix':
                    shuffleQueue(this, message);
                    message.delete().catch(() => { })
                    break;
                default:

                    //            setupGuild(this, message.guild.id);
                    let urls = null;
                    if (urls = msg.match(youtubeTester)) addYoutubeToQueue(this, message, urls)
                    else if (msg.match(urlTester)) {

                        if (canEmbed(message.channel as TextChannel))
                            return message.channel.send(Embeds.errorEmbed(playerLanguage.get(this).youtubeOnly))
                                .catch(error => message.client.emit("error", error))
                        else
                            return message.channel.send(playerLanguage.get(this).youtubeOnly)
                                .catch(error => message.client.emit("error", error))
                    }
                    else {

                        youtubeLuckSearch(this, message, msg)
                        /*
                        if (canEmbed(message.channel as TextChannel))
                            return message.channel.send(Embeds.errorEmbed(playerLanguage.get(this).incorrectUse))
                                .catch(error => message.client.emit("error", error))
                        else
                            return message.channel.send(playerLanguage.get(this).incorrectUse)
                                .catch(error => message.client.emit("error", error))
                                */
                    }
                    break;
            }
        }, 0);
    }
}

function loopTrack(classObj: YoutubePlayer, message: Message) {
    const guildData = data.get(classObj)[message.guild.id] as GuildData;
    const language = playerLanguage.get(classObj) as PlayerLanguage;

    if (!verifyUser(classObj, message)) return;

    if (guildData.looping) {
        guildData.looping = false;
        message.channel.send(language.player.loopingOff).catch(() => { });
    } else {
        guildData.looping = true;
        message.channel.send(language.player.loopingOn).catch(() => { });
    }
}


function canEmbed(channel: TextChannel) {
    return channel.permissionsFor(channel.guild.me).hasPermission("EMBED_LINKS")
}

function setupGuild(object, guildid) {
    if (data.get(object)[guildid]) return;
    let guildData = data.get(object)

    const emptyData: GuildData = {
        paused: null,
        looping: false,
        voiceChannel: null,
        startSongTime: null,
        textChannel: null,
        playerMessage: null,
        connection: null,
        color: [255, 0, 0],
        currentSong: null,
        queue: [],
        setTimeout: null
    };

    guildData[guildid] = emptyData;
    data.set(object, guildData);
}

function playerHelp(playerObject: YoutubePlayer, message: Message) {
    const language = playerLanguage.get(playerObject) as PlayerLanguage;

    const helpInfo = [
        language.help.url,
        language.help.search,
        language.help.destroy,
        language.help.replay,
        language.help.pause,
        language.help.resume,
        language.help.skip
    ]

    message.channel.send(`\`\`\`${helpInfo.join("\n")}\`\`\``).catch(() => { })
}

async function youtubeLuckSearch(playerObject: YoutubePlayer, message: Message, querry: string) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const language = playerLanguage.get(playerObject) as PlayerLanguage
    let queue: GuildQueue[] = [];

    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    await Youtube.searchOnLuck(youtubeKey.get(playerObject), querry)
        .then((videoInfo: VideoData) => {

            const id = videoInfo.id;
            const queueID = guildData.queue.map(e => e.video.id);
            if (queueID.includes(id) || (guildData.currentSong && guildData.currentSong.video.id === id)) {
                if (canEmbed(message.channel as TextChannel)) {
                    message.channel.send(Embeds.infoEmbed(`${message.author} ${language.alreadyOnPlaylist}\n \`${videoInfo.title}\``))
                        .then((m: Message) => {
                            setTimeout(() => {
                                m.delete();
                            }, 1000 * 5);
                        })
                        .catch(error => message.client.emit("error", error))
                } else {
                    message.channel.send(`${message.author}\n${language.alreadyOnPlaylist}\n\`${videoInfo.title}\``)
                        .then((m: Message) => {
                            setTimeout(() => {
                                m.delete();
                            }, 1000 * 5);
                        })
                        .catch(error => message.client.emit("error", error))
                }
                return;
            }
            queue.push({
                video: videoInfo,
                submitter: message.member,
                submited: new Date(Date.now())
            })

            addToGuildQueue(playerObject, message, queue)
            startPlayer(playerObject, message)
            sendQueueVideoInfo(playerObject, message, queue, true);

        })
        .catch(error => {
            message.client.emit("error", error)
            message.channel.send(error.message)
        })
}

async function addYoutubeToQueue(playerObject: YoutubePlayer, message: Message, urls) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData

    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    const language = playerLanguage.get(playerObject);
    let queue: GuildQueue[] = [];
    for (const url of urls) {
        await Youtube.getVideoInfo(youtubeKey.get(playerObject), url)
            .then((videoInfo: VideoData) => {

                const id = videoInfo.id;
                const queueID = guildData.queue.map(e => e.video.id);
                if (queueID.includes(id) || (guildData.currentSong && guildData.currentSong.video.id === id)) {
                    if (canEmbed(message.channel as TextChannel)) {
                        message.channel.send(Embeds.infoEmbed(`${message.author} ${language.alreadyOnPlaylist}\n \`${videoInfo.title}\``))
                            .then((m: Message) => {
                                setTimeout(() => {
                                    m.delete();
                                }, 1000 * 5)
                            })
                            .catch(error => message.client.emit("error", error))
                    } else {
                        message.channel.send(`${message.author}\n${language.alreadyOnPlaylist}\n\`${videoInfo.title}\``)
                            .then((m: Message) => {
                                setTimeout(() => {
                                    m.delete();
                                }, 1000 * 5)
                            })
                            .catch(error => message.client.emit("error", error))
                    }
                    return;
                }

                queue.push({
                    video: videoInfo,
                    submitter: message.member,
                    submited: new Date(Date.now())
                })
            })
            .catch(error => {
                message.client.emit("error", error)
                message.channel.send(error.message)
            })
    }
    if (queue.length === 0) return;
    addToGuildQueue(playerObject, message, queue);
    startPlayer(playerObject, message);
    sendQueueVideoInfo(playerObject, message, queue);
}

function addToGuildQueue(classObj, message: Message, queue: GuildQueue[]) {
    for (const q of queue) {
        const guildData = data.get(classObj);
        guildData[message.guild.id].queue.push(q)
        data.set(classObj, guildData);
    }
}

function sendQueueVideoInfo(playerObject: YoutubePlayer, message: Message, queue: GuildQueue[], search = false) {
    const language = playerLanguage.get(playerObject) as PlayerLanguage;
    for (const q of queue) {

        if (canEmbed(message.channel as TextChannel)) {
            const embed = new RichEmbed()
            addBasicInfo(playerObject, embed, q.video)
            if (search) {
                embed.setDescription(`${language.videoAdded} ${q.submitter} ${language.luckSearch}`)
            }
            else {
                embed.setDescription(`${language.videoAdded} ${q.submitter}`)
            }
            embed.addField(language.video.duration, getYoutubeTime(new Date(q.video.duration)))
            message.channel.send(embed).catch(error => message.client.emit("error", error));
        } else {
            message.channel.send(`\`${q.video.url}\` ${language.videoAdded} ${q.submitter}`).catch(error => message.client.emit("error", error))
        }
    }
    updatePlayer(playerObject, message.guild, true)
}

function addBasicInfo(playerObject: YoutubePlayer, embed: RichEmbed, video: VideoData) {
    const language = playerLanguage.get(playerObject);
    embed.setAuthor(video.channel.title, video.channel.thumbnail, `https://www.youtube.com/channel/${video.channel.id}`);
    embed.setTitle(video.title);
    embed.setColor('RED');
    embed.setURL(video.url);
    embed.setThumbnail(video.thumbnail);

    const date = video.publishedAt;

    const day = date.getDate();
    const month = language.video.monthsName[date.getMonth()];
    const year = date.getFullYear();
    embed.addField(language.video.published, `${day} ${month} ${year}`, true)

    const views = video.statistics.viewCount < 10000 ? video.statistics.viewCount : video.statistics.viewCount.toString().match(/.{1,3}/g).join(',')
    const comments = video.statistics.commentCount < 10000 ? video.statistics.commentCount : video.statistics.commentCount.toString().match(/.{1,3}/g).join(',')
    let likes = video.statistics.likeCount < 1000 ? video.statistics.likeCount.toString() : (video.statistics.likeCount / 1000).toFixed(1) + 'K';
    let disLike = video.statistics.dislikeCount < 1000 ? video.statistics.dislikeCount.toString() : (video.statistics.dislikeCount / 1000).toFixed(1) + 'K';

    if (likes.includes('K') && likes.slice(likes.length - 3, likes.length - 1) === '.0') {
        likes = likes.slice(0, likes.length - 3) + 'K'
    }
    if (disLike.includes('K') && disLike.slice(disLike.length - 3, disLike.length - 1) === '.0') {
        disLike = disLike.slice(0, disLike.length - 3) + 'K'
    }

    embed.addField(language.video.views, views, true);
    embed.addField(language.video.rateing, `${language.video.upvote}${likes}  ${language.video.downvote}${disLike}`, true);
    embed.addField(language.video.comments, comments, true);
    return embed
}


function getYoutubeTime(date: Date) {
    let seconds: any = date.getSeconds();
    let minutes: any = date.getMinutes();
    let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

    seconds = seconds < 10 ? `0${seconds}` : seconds
    minutes = minutes < 10 ? `0${minutes}` : minutes

    if (hours)
        hours = hours < 10 ? `0${hours}:` : `${hours}:`
    else
        hours = '';

    return `${hours}${minutes}:${seconds}`;
}

function startPlayer(playerObject: YoutubePlayer, message: Message) {
    const language = playerLanguage.get(playerObject);
    const guildData = data.get(playerObject)[message.guild.id] as GuildData;
    if (!guildData) return;

    if (guildData.connection) {
        if (!guildData.queue[0]) return destroyPlayer(playerObject, message.guild);

    }; //return this.updatePlayer(message.guild);
    if (guildData.queue.length === 0) return destroyPlayer(playerObject, message.guild);

    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return destroyPlayer(playerObject, message.guild)

    if (!guildData.connection) {
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(language.player.created))
                .catch(error => message.client.emit("error", error))
        } else {
            message.channel.send(language.player.created)
                .catch(error => message.client.emit("error", error))
        }
    }

    voiceChannel.join()
        .then(async connection => {


            guildData.connection = connection;
            guildData.textChannel = message.channel as TextChannel;

            if (!guildData.setTimeout)
                guildData.setTimeout = setInterval(() => {
                    updatePlayer(playerObject, message.guild)
                }, messageUpdateRate.get(playerObject));


            if (!guildData.currentSong)
                nextTrack(playerObject, message);
        }).catch(error => {
            message.client.emit("error", error)
            if (canEmbed(message.channel as TextChannel))
                message.channel.send(Embeds.errorEmbed(language.cannotConnect))
                    .catch(error => message.client.emit("error", error))
            else
                message.channel.send(language.cannotConnect)
                    .catch(error => message.client.emit("error", error))
        });
}

async function destroyPlayer(playerObject: YoutubePlayer, guild: Guild) {
    const language = playerLanguage.get(playerObject);
    const guildData = data.get(playerObject)[guild.id] as GuildData;


    if (!guildData) return
    if (guildData.connection) {
        if (guildData.setTimeout)
            clearInterval(guildData.setTimeout)
        guildData.setTimeout = null;

        const connection = guildData.connection as VoiceConnection
        const channel = guildData.textChannel as TextChannel
        guildData.queue = [];
        if (guildData.playerMessage) {
            guildData.playerMessage.delete().catch(e => guild.client.emit("error", e))
            guildData.playerMessage = null;
        }
        await connection.disconnect();
        if (channel) {
            if (canEmbed(channel))
                await channel.send(Embeds.infoEmbed(language.player.destroy))
                    .catch(e => guild.client.emit("error", e)) as Message
            else {
                await channel.send(language.player.destroy)
                    .catch(e => guild.client.emit("error", e)) as Message
            }


        }
    }
    if (guildData[guild.id])
        delete guildData[guild.id];
    guild.client.emit("debug", `[Song Player] [Status] Player destroyed in guild ${guild.id}`)

}

async function updatePlayer(playerObject: YoutubePlayer, guild: Guild, fullUpdate = false) {
    const language = playerLanguage.get(playerObject) as PlayerLanguage;
    const guildData = data.get(playerObject)[guild.id] as GuildData;

    const channel = guildData.textChannel;
    let voice = null;
    if (guildData.connection)
        voice = guildData.connection.channel;
    const currentSong = guildData.currentSong;
    const startSongTime = guildData.startSongTime

    if (!startSongTime) return;
    if (!currentSong) return;
    if (!voice) return;

    if (fullUpdate) {
        await guildData.playerMessage.delete().catch(e => guild.client.emit("error", e))
        guildData.playerMessage = null;
    }

    if (voice && voice.members.size === 1) destroyPlayer(playerObject, guild)

    let add = 0;
    if (guildData.paused) {
        add = Date.now() - guildData.paused.getTime();
    }

    let date = new Date(Date.now() - startSongTime.getTime() + add);
    let progress = `${getYoutubeTime(date)} / ${getYoutubeTime(new Date(currentSong.video.duration))}`

    guildData.color = colorChanger(guildData.color)

    const embed = new RichEmbed();
    addBasicInfo(playerObject, embed, currentSong.video)
    //@ts-ignore
    embed.setColor(guildData.color)
    embed.addField(language.video.progress, progress, true)
    if (guildData.paused)//a
        embed.setFooter(language.player.statusPaused, youtubeLogo)
    else {
        if (guildData.looping)
            embed.setFooter(language.player.statusPlaying + ' 🔄', currentSong.video.thumbnail)
        else
            embed.setFooter(language.player.statusPlaying, currentSong.video.thumbnail)
    }
    embed.setThumbnail(null)
    if (!guildData.playerMessage) {

        if (canEmbed(channel))
            channel.send(embed)
                .then(msg => {
                    guildData.playerMessage = msg as Message
                })
                .catch(e => guild.client.emit("error", e))
        else
            channel.send(`${currentSong.video.url}\n${currentSong.video.title}\n${progress} ${guildData.paused ? 'Paused' : ''}`)
                .then(msg => {
                    guildData.playerMessage = msg as Message
                })
                .catch(e => guild.client.emit("error", e))
        return;
    }

    if (guildData.playerMessage.embeds.length !== 0) {
        guildData.playerMessage.edit(embed).catch(e => guild.client.emit("error", e))
    } else {
        guildData.playerMessage.edit(`${currentSong.video.url}\n${currentSong.video.title}\n${progress} ${guildData.paused ? 'Paused' : ''}`).catch(e => guild.client.emit("error", e))
    }

}

function nextTrack(playerObject: YoutubePlayer, message: Message, force = false) {
    const language = playerLanguage.get(playerObject);
    const guildData = data.get(playerObject)[message.guild.id] as GuildData;
    if (!guildData) return
    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    if (!guildData.looping && guildData.queue.length === 0) return destroyPlayer(playerObject, message.guild);
    if (!guildData.connection) return destroyPlayer(playerObject, message.guild);

    let currentSong = guildData.currentSong;
    const connection = guildData.connection;

    if (!force) {
        if (!guildData.looping) {
            currentSong = guildData.queue.shift();
            guildData.currentSong = currentSong;
        }
    }

    ytdl(currentSong.video.url)
        .then(stream => {
            const dispatcher = connection.playOpusStream(stream);

            updatePlayer(playerObject, message.guild);

            dispatcher.on('end', e => {
                message.client.emit("debug", `[Song Player] [Status] Track ended in guild ${message.guild.id}`)
                setTimeout(() => {
                    nextTrack(playerObject, message)
                }, waitTimeBetweenTracks.get(playerObject));
            })
            dispatcher.on('start', e => {
                message.client.emit("debug", `[Song Player] [Status] Track started in guild ${message.guild.id}`)
                guildData.startSongTime = new Date(Date.now());
                updatePlayer(playerObject, message.guild);
            })
            dispatcher.on('error', async e => {
                message.client.emit("debug", `[Song Player] [Status] Track Error in guild ${message.guild.id} ${e}`)
                message.client.emit("error", e)

                const channel = guildData.textChannel as TextChannel;
                if (channel) {

                    if (canEmbed(channel))
                        await channel.send(Embeds.errorEmbed(`${e} \`${currentSong.video.url}\``))
                            .catch(error => message.client.emit("error", error))
                    else
                        await channel.send(`${e} \`${currentSong.video.url}\``)
                            .catch(error => message.client.emit("error", error))
                }
                nextTrack(playerObject, message)
            })
        })
        .catch(s => {
            message.client.emit("error", s)
            if (guildData.textChannel) {
                const channel = guildData.textChannel;
                const reply = language.player.brokenUrl;

                if (canEmbed(channel))
                    channel.send(Embeds.errorEmbed(`${reply} \`${currentSong.video.url}\``))
                        .catch(error => message.client.emit("error", error));
                else {
                    channel.send(`${reply} \`${currentSong.video.url}\``)
                        .catch(error => message.client.emit("error", error));
                }
            }
            nextTrack(playerObject, message)
        })
}


function skipTrack(playerObject: YoutubePlayer, message: Message) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage

    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    if (!guildData) return;
    if (!verifyUser(playerObject, message)) return;

    message.client.emit("debug", `[Song Player] [Status] Track has been skiped by use ${message.author.id} guild ${message.guild.id}`);
    guildData.connection.dispatcher.end()
    if (canEmbed(message.channel as TextChannel)) {
        message.channel.send(Embeds.infoEmbed(`${lanugage.player.skip} ${message.author}`))
            .catch(error => message.client.emit("error", error))
    }
    else {
        message.channel.send(`${lanugage.player.skip} ${message.author}`)
            .catch(error => message.client.emit("error", error))
    }
}

function pauseTrack(playerObject: YoutubePlayer, message: Message) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage
    if (!guildData) return;
    if (!guildData.connection) return;

    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    message.client.emit("debug", `[Song Player] [Status] Track has been paused by use ${message.author.id} guild ${message.guild.id}`);
    if (!guildData.connection.dispatcher.paused) {
        guildData.connection.dispatcher.pause();
        guildData.paused = new Date(Date.now());
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(`${lanugage.player.paused} ${message.author}`))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(`${lanugage.player.paused} ${message.author}`)
                .catch(error => message.client.emit("error", error))
        }
    }
    if (guildData.setTimeout)
        clearInterval(guildData.setTimeout)
    guildData.setTimeout = null;

    updatePlayer(playerObject, message.guild, true)
}

function resumeTrack(playerObject: YoutubePlayer, message: Message) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage
    if (!guildData) return;
    if (!guildData.connection) return;

    if (deleteUserMessage.get(playerObject))
        message.delete().catch(() => { });

    message.client.emit("debug", `[Song Player] [Status] Track has been resumed by use ${message.author.id} guild ${message.guild.id}`);
    if (guildData.connection.dispatcher.paused) {
        guildData.connection.dispatcher.resume();

        const paused = guildData.paused as Date
        const timeNow = new Date(Date.now());
        const pausedTime = new Date(timeNow.getTime() - paused.getTime())
        const startTime = guildData.startSongTime as Date
        guildData.startSongTime = new Date(startTime.getTime() + pausedTime.getTime())
        guildData.paused = new Date(Date.now());
        guildData.paused = null;
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(`${lanugage.player.resumed} ${message.author}`))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(`${lanugage.player.resumed} ${message.author}`)
                .catch(error => message.client.emit("error", error))
        }
        guildData.setTimeout = setInterval(() => {
            updatePlayer(playerObject, message.guild)
        }, messageUpdateRate.get(playerObject));
        updatePlayer(playerObject, message.guild, true)
    }
}

function replayTrack(playerObject: YoutubePlayer, message: Message, force = false) {
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage
    if (!guildData) return;
    if (!guildData.currentSong) return;

    if (force) {
        guildData.queue.unshift(guildData.currentSong)

        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.player.forceReplay))
                .catch(error => message.client.emit("error", error))

        }
        else {
            message.channel.send(lanugage.player.forceReplay)
                .catch(error => message.client.emit("error", error))
        }

        nextTrack(playerObject, message)
        return
    }

    if (guildData.currentSong !== guildData.queue[0]) {
        guildData.queue.unshift(guildData.currentSong)
        message.client.emit("debug", `[Song Player] [Status] ${message.author.id} execute force replay in guild ${message.guild.id}`);
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.player.replay))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(lanugage.player.replay)
                .catch(error => message.client.emit("error", error))
        }
        message.client.emit("debug", `[Song Player] [Status] Track has is going to be replayed set by use ${message.author.id} guild ${message.guild.id}`);
    }

    else {
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.player.alredyOnReplay))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(lanugage.player.alredyOnReplay)
                .catch(error => message.client.emit("error", error))
        }
    }
}

function shuffleQueue(playerObject: Youtube, message) {
    const guildData = data.get(playerObject) as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage

    if (guildData.queue && guildData.queue.length > 1) {
        guildData.queue.sort(() => Math.random() - 0.5)
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.player.suffled))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(lanugage.player.suffled)
                .catch(error => message.client.emit("error", error))
        }
        message.client.emit("debug", `[Song Player] [Status] Playlist has been shuffled by ${message.author.id} guild ${message.guild.id}`);
    } else {
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.player.nothingToSuffle))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(lanugage.player.nothingToSuffle)
                .catch(error => message.client.emit("error", error))
        }
    }
}

function verifyUser(playerObject: YoutubePlayer, message: Message): boolean {
    const memberRoles = message.member.roles.filter(r => r.name.toLowerCase() === 'dj' || r.name.toLowerCase() === 'mod' || r.name.toLowerCase() === 'moderator').map(r => r)
    const guildData = data.get(playerObject)[message.guild.id] as GuildData
    const lanugage = playerLanguage.get(playerObject) as PlayerLanguage

    if (guildData && guildData.connection && guildData.connection.channel && guildData.connection.channel.members.size <= 2) return true;
    if (message.member.hasPermission("ADMINISTRATOR") || message.member.hasPermission("MANAGE_CHANNELS") || memberRoles.length !== 0) return true;

    else {
        if (canEmbed(message.channel as TextChannel)) {
            message.channel.send(Embeds.infoEmbed(lanugage.missingPermission))
                .catch(error => message.client.emit("error", error))
        }
        else {
            message.channel.send(lanugage.missingPermission)
                .catch(error => message.client.emit("error", error))
        }
        return false
    }
}

function colorChanger(number: number[]) {

    const increaser = 11;

    if (number[0] > 0 && number[1] <= 0) {
        number[0] -= increaser;
        number[2] += increaser;
    }
    if (number[2] > 0 && number[0] <= 0) {
        number[2] -= increaser;
        number[1] += increaser;
    }
    if (number[1] > 0 && number[2] <= 0) {
        number[0] += increaser;
        number[1] -= increaser;
    }

    if (number[0] < 0) number[0] = 0;
    if (number[1] < 0) number[1] = 0;
    if (number[2] < 0) number[2] = 0;
    if (number[0] > 255) number[0] = 255;
    if (number[1] > 255) number[1] = 255;
    if (number[2] > 255) number[2] = 255;
    return number
}