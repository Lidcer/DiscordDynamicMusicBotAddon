import { Message, Guild, RichEmbed, TextChannel, Client, VoiceConnection, ColorResolvable, GuildMember } from 'discord.js';
import { canEmbed, errorInfo, info, addBasicInfo } from './embeds';
import { Youtube, sliderGenerator } from './Youtube';
import { PlayerLanguage, GuildData } from './interfaces';
import { Language } from './language';
import { GuildPlayer, PlaylistItem } from './playlist';
import { getYTInfo, getStream } from './yt-code-discord';

const youtubeLogo = 'https://s.ytimg.com/yts/img/favicon_144-vfliLAfaB.png'; // Youtube icon
const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);
export
    const urlTester = new RegExp(/https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/g);
const defaultPlayerUpdate = 1000 * 5;
const defaultWaitTimeBetweenTracks = 1000 * 2;
const defaultSelfDeleteTime = 1000 * 5;

const guildPlayer = new WeakMap<YoutubePlayer, GuildData>();
const messageUpdateRate = new WeakMap<YoutubePlayer, number>();
const selfDeleteTime = new WeakMap<YoutubePlayer, number>();
const leaveVoiceChannelAfter = new WeakMap<YoutubePlayer, number>();
const usePatch = new WeakMap<YoutubePlayer, boolean>();
const isClientSet = new WeakMap<YoutubePlayer, boolean>();
const youtubeKey = new WeakMap<YoutubePlayer, string>();
const secondCommand = new WeakMap<YoutubePlayer, boolean>();
const waitTimeBetweenTracks = new WeakMap<YoutubePlayer, number>();
const deleteUserMessage = new WeakMap<YoutubePlayer, boolean>();
const reactionButtons = new WeakMap<YoutubePlayer, boolean>();
export const playerLanguage = new WeakMap<YoutubePlayer, Language>();

const patch = {
    filter: 'audioonly',
    highWaterMark: 1 << 25,
};

export class YoutubePlayer {

    /**
     * Constructor that constructs
     * @param {string} string youtube api key
     * @param {PlayerLanguage} PlayerLanguage PlayerLanguage
     */
    constructor(youtubeApiKey?: string, language?: PlayerLanguage) {
        if (language && typeof language !== 'object') throw new TypeError('language must be an object!');
        if (!language) language = {} as any;
        if (!youtubeApiKey) {
            youtubeApiKey = '';
            console.warn('YouTube Api key was not provided! Rich embeds are going to contain less information about the video!');
        } else {
            Youtube.testKey(youtubeApiKey);
        }

        if (typeof youtubeApiKey !== 'string') throw new TypeError(`Expected string got ${typeof youtubeApiKey}`);
        youtubeKey.set(this, youtubeApiKey);
        messageUpdateRate.set(this, defaultPlayerUpdate);
        guildPlayer.set(this, {});
        secondCommand.set(this, true);
        selfDeleteTime.set(this, defaultSelfDeleteTime);
        waitTimeBetweenTracks.set(this, defaultWaitTimeBetweenTracks);
        deleteUserMessage.set(this, true);
        reactionButtons.set(this, true);
        playerLanguage.set(this, new Language(language));
        isClientSet.set(this, false);
    }

    /**
     * Should delete user messages?
     * @param {boolean} boolean if set to true if possible the messages sent by user are going to be deleted.
     */
    set deleteUserMessages(trueFalse: boolean) {
        if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
        deleteUserMessage.set(this, trueFalse);
    }

    /**
     * Should fix where stream is terminated 10 - 15 seconds before the end of the track
     * @param {boolean} boolean Enables/disables patch
     */
    set usePatch(trueFalse: boolean) {
        if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
        usePatch.set(this, trueFalse);
    }

    /**
     * Set wait time between tracks
     * @param {number} number how much should player wait.
     */
    set waitTimeBetweenTracks(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        waitTimeBetweenTracks.set(this, seconds * 1000);
    }

    /**
     * Set player edit/update rate
     * @param {number} number how fast/slow should player message be updated.
     */
    set playerUpdateRate(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 5) throw new Error('update rate cannot be lover than 5 seconds');
        messageUpdateRate.set(this, seconds * 1000);
    }

    /**
     * When bot runs out of songs how long should wait before disconnecting voice channel
     * @param {number} number in seconds. If set to 0 it will leave immediately.
     */
    set leaveVoiceChannelAfter(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        leaveVoiceChannelAfter.set(this, seconds * 1000);
    }

    /**
     * Should message be rubbish collected
     * @param {number} number if 0 no others numbers are seconds
     */
    set selfDelete(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 0) throw new Error('Cannot be below 0');
        selfDeleteTime.set(this, seconds * 1000);
    }

    /**
     * @param {Message} Message Discord message
     * @param {string} String prefix
     * @returns {boolean} It's going to return true if command is valid.
     */
    onMessagePrefix(message: Message, prefix: string): boolean {
        if (!prefix) throw new Error('Prefix cannot be undefined');
        if (typeof prefix !== 'string') throw new Error('Prefix must be string');
        return this.onMessage(message, message.cleanContent.slice(prefix.length).trim(), prefix);
    }

    /**
     * @param {Message} Message Discord message
     * @param {string} String Discord message without prefix
     * @param {string} String Optional just for help command
     * @returns {boolean} It's going to return true if command is valid.
     */
    onMessage(message: Message, messageContentWithOutPrefix: string, prefix?: string): boolean {
        setupClient(this, message.client);
        const language = playerLanguage.get(this)!.getLang();
        const commands = language.commands;
        if (!message.guild || message.author.bot) return false;
        const channel = message.channel as TextChannel;
        const me = channel.permissionsFor(message.guild.me);
        if (!me) return false;
        if (!me.has('SEND_MESSAGES')) return false;

        let checker = messageContentWithOutPrefix.replace(/  /g, ' ');

        if (commendChecker(checker, commands.playerCommands, false)) {
            playerHelp(this, message, prefix);
            return true;
        }

        if (commendChecker(checker, commands.playerCommands)) {
            checker = removeFistWord(checker);

        } else return false;

        // just to throw object out of stack so we can return boolean value to the user
        setTimeout((): any => {
            const voiceChannel = message.member.voiceChannel;

            if (!voiceChannel) {
                errorInfo(message.channel as TextChannel, language.notInVoiceChannel, selfDeleteTime.get(this));
                return true;
            } else if (!voiceChannel.joinable) {
                errorInfo(message.channel as TextChannel, language.cannotConnect, selfDeleteTime.get(this));
                return true;
            }

            /*
            if (checker.includes('replay') || checker.includes('<>') || checker.includes('rewind')) {
                //  return replaySong(message, language);
            }*/

            // TODO replace with dynamic command
            if (messageContentWithOutPrefix.toLowerCase() !== 'yt' && messageContentWithOutPrefix.toLowerCase().startsWith('yt')) {
                messageContentWithOutPrefix = messageContentWithOutPrefix.slice(2).trim();
                youtubeLuckSearch(this, message, messageContentWithOutPrefix);
                return true;
            }
            if (messageContentWithOutPrefix.toLowerCase() !== 'youtube' && messageContentWithOutPrefix.toLowerCase().startsWith('youtube')) {
                messageContentWithOutPrefix = messageContentWithOutPrefix.slice(7).trim();
                youtubeLuckSearch(this, message, messageContentWithOutPrefix);
                return true;
            }
            if (messageContentWithOutPrefix.toLowerCase() !== 'search' && messageContentWithOutPrefix.toLowerCase().startsWith('search')) {
                messageContentWithOutPrefix = messageContentWithOutPrefix.slice(7).trim();
                youtubeLuckSearch(this, message, messageContentWithOutPrefix);
                return true;
            }

            if (commendChecker(checker, commands.destroy)) {
                destroyGuildPlayer(this, message.guild);
                return;
            } else if (commendChecker(checker, commands.next)) {
                requestNextTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.previous)) {
                requestPreviousTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.help)) {
                playerHelp(this, message);
                return;
            } else if (commendChecker(checker, commands.pause)) {
                pauseTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.resume)) {
                resumeTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.replay)) {
                requestReplayTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.loop)) {
                loopTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.shuffle)) {
                shuffleQueue(this, message);
                return;
            } else {
                const urls = checker.match(youtubeTester);
                if (urls) addYoutubeToQueue(this, message, urls);
                else if (checker.match(urlTester)) {
                    errorInfo(message.channel as TextChannel, language.onlyYoutubeLinks);
                } else {
                    youtubeLuckSearch(this, message, checker);
                    // errorInfo(message.channel as TextChannel, language.incorrectUse);
                }
            }
        });
        return true;
    }
}

function commendChecker(messageContent: string, aliases: string[], includes = true) {
    if (includes) {
        messageContent = getFirstWord(messageContent);
    }
    for (const command of aliases) {
        if (messageContent.toLowerCase() === command.toLowerCase()) {
            return true;
        }
    }
    return false;
}
function getFirstWord(text: string) {
    const spaceIndex = text.indexOf(' ');
    if (spaceIndex !== -1) {
        text = text.slice(0, spaceIndex).trim();
    }
    return text;
}
function removeFistWord(text: string) {
    const spaceIndex = text.indexOf(' ');
    if (spaceIndex !== -1) {
        text = text.slice(spaceIndex).trim();
    }
    return text;
}

function setupClient(youtubePlayer: YoutubePlayer, client: Client) {
    if (!isClientSet.get(youtubePlayer)) {
        isClientSet.set(youtubePlayer, true);
        client.on('voiceStateUpdate', guildMember => {
            if (!guildMember.guild.me.voiceChannel) {
                client.emit('debug', 'Bot has been disconnected from the voice channel');
                destroyGuildPlayer(youtubePlayer, guildMember.guild);
            }
        });

        client.on('messageReactionAdd', messageReaction => {
            if (!messageReaction.message.guild) return;
            const guild = messageReaction.message.guild;
            const guildData = guildPlayer.get(youtubePlayer)!;
            const theGuildPlayer = guildData[guild.id];
            if (!theGuildPlayer) return;
            if (theGuildPlayer.playerMessage !== messageReaction.message) return;

            const guildMembers: GuildMember[] = [];

            for (const user of messageReaction.users.map(u => u)) {
                const guildMember = guild.members.find(m => m.user === user);
                if (guildMember && !guildMember.user.bot) guildMembers.push(guildMember);
            }

            switch (messageReaction.emoji.name) {
                case '⏸️':
                    if (canExecute(guildMembers)) {
                        pauseTrack(youtubePlayer, messageReaction.message);
                        recreateOrRecreatePlayerButtons(theGuildPlayer);
                    }
                    break;
                case '▶️':
                    if (canExecute(guildMembers)) {
                        resumeTrack(youtubePlayer, messageReaction.message);
                        recreateOrRecreatePlayerButtons(theGuildPlayer);
                    }
                    break;
                case '⏮️':
                    if (canExecute(guildMembers)) {
                        previousTrack(youtubePlayer, messageReaction.message);
                    }
                    break;
                case '⏭️':
                    if (canExecute(guildMembers)) {
                        nextTrack(messageReaction.message);

                    }

                    break;
                /*
                    case '🔁':
                        if (canExecute(guildMembers)) loopTrack(youtubePlayer, messageReaction.message);
                        break;
                    case '🔂':
                        if (canExecute(guildMembers)) stopLooping(youtubePlayer, messageReaction.message);
                        break;
                    case '🔀':
                        if (canExecute(guildMembers)) randomPlaying(youtubePlayer, messageReaction.message);
                        break;
                    default:
                        break;
                */
            }

        });
    }
}
function canExecute(guildMembers: GuildMember[] | GuildMember): boolean {
    if (!Array.isArray(guildMembers)) {
        return guildMembers.hasPermission('MANAGE_CHANNELS');
    }

    if (guildMembers.length === 0) return false;
    let i = 0;
    for (const guildMember of guildMembers) {
        if (guildMember.hasPermission('MANAGE_CHANNELS')) return true;
        i++;
    }
    return i === guildMembers.length ? true : false;
}

async function addYoutubeToQueue(youtubePlayer: YoutubePlayer, message: Message, urls: RegExpMatchArray) {
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();

    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/\(URL\)/g, `<${urls.join('> <')}>`)).catch(() => { });

    if (deleteUserMessage.get(youtubePlayer) && message.deletable)
        message.delete().catch(error => message.client.emit('error', error));

    const playlistItems: PlaylistItem[] = [];
    for (const url of urls) {
        const apiKey = youtubeKey.get(youtubePlayer)!;
        const title = player.isAlreadyOnPlaylistByUrl(url);
        if (title) {
            errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n<${title}>`, selfDeleteTime.get(youtubePlayer)!);
            break;
        }
        try {
            const options = usePatch.get(youtubePlayer) ? patch : {};
            const videoInfo = await getYTInfo(url);
            const playlistItem: PlaylistItem = {
                videoInfo,
                steamOptions: options,
                stream: await getStream(videoInfo, options),
                videoData: apiKey ? await Youtube.getVideoInfo(apiKey, url) : undefined,
                submitted: new Date(Date.now()),
                submitter: message.member,
            };
            if (player.push(playlistItem)) {
                playlistItems.push(playlistItem);
            }
        } catch (error) {
            errorInfo(message.channel as TextChannel, error.toString(), selfDeleteTime.get(youtubePlayer));
            return;
        }
    }

    if (infoMessage) {
        if (Array.isArray(infoMessage)) {
            for (const msg of infoMessage) {
                msg.delete().catch(() => { });
            }
        } else {
            infoMessage.delete().catch(() => { });
        }
    }

    if (playlistItems.length === 0) return;
    sendQueueVideoInfo(youtubePlayer, message, playlistItems);
    await startPlayer(youtubePlayer, message);
}

async function youtubeLuckSearch(youtubePlayer: YoutubePlayer, message: Message, query: string) {
    if (!youtubeKey.get(youtubePlayer)) return;
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const keyYoutube = youtubeKey.get(youtubePlayer)!;

    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/\(URL\)/g, `\`${query}\``)).catch(() => { });

    if (deleteUserMessage.get(youtubePlayer) && message.deletable)
        message.delete().catch(error => message.client.emit('error', error));

    let playlistItem: PlaylistItem;
    try {
        const result = await Youtube.searchOnLuck(keyYoutube, query);
        const title = player.isAlreadyOnPlaylistById(result.id);
        if (title) {
            errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n<${title}>`, selfDeleteTime.get(youtubePlayer)!);
            return;
        }
        const options = usePatch.get(youtubePlayer) ? patch : {};
        const videoInfo = await getYTInfo(result.video_url);
        playlistItem = {
            videoInfo,
            steamOptions: options,
            stream: await getStream(videoInfo, options),
            videoData: result,
            submitted: new Date(Date.now()),
            submitter: message.member,
        };
        if (!player.push(playlistItem)) {
            errorInfo(message.channel as TextChannel, `Unable to add to playlist`, selfDeleteTime.get(youtubePlayer));
            return;
        }
    } catch (error) {
        errorInfo(message.channel as TextChannel, error.toString(), selfDeleteTime.get(youtubePlayer));
        return;
    }

    if (infoMessage) {
        if (Array.isArray(infoMessage)) {
            for (const msg of infoMessage) {
                msg.delete().catch(() => { });
            }
        } else {
            infoMessage.delete().catch(() => { });
        }
    }
    await startPlayer(youtubePlayer, message);
    sendQueueVideoInfo(youtubePlayer, message, [playlistItem], true);
}

function playerHelp(playerObject: YoutubePlayer, message: Message, prefix?: string) {
    const helps = playerLanguage.get(playerObject)!.help(prefix);
    const language = playerLanguage.get(playerObject)!.getLang();
    const helpInfo: string[] = [];
    for (const help of Object.keys(helps)) {
        helpInfo.push(help);
    }

    if (canEmbed(message.channel as TextChannel)) {
        const embed = new RichEmbed();
        embed.addField(language.player.helpCommand, helpInfo.join('\n'));
        embed.setColor('GREEN');
        message.channel.send(embed).catch(() => { });
    } else {
        message.channel.send(`\`\`\`${helpInfo.join('\n')}\`\`\``).catch(() => { });
    }
}

function getGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild) {
    const guildData = guildPlayer.get(youtubePlayer)!;
    if (!guildData[guild.id]) {
        guildData[guild.id] = new GuildPlayer()
            .on('update', () => {
                updatePlayer(youtubePlayer, guild);
            })
            .on('start', () => {
                if (guild.me && guild.me.voiceChannel && guild.me.voiceChannel.connection)
                    playerLoop(youtubePlayer, guild.me.voiceChannel.connection);
            });
        guildData[guild.id].updateRate(messageUpdateRate.get(youtubePlayer)!);
        guildData[guild.id].buttons = (reactionButtons.get(youtubePlayer)!);
    }
    return guildData[guild.id];
}

function loopTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();

    if (!verifyUser(youtubePlayer, message)) return;

    if (guildPlayer.loop) {
        guildPlayer.loop = false;
        message.channel.send(language.player.loopingOff).catch(() => { });
    } else {
        guildPlayer.loop = true;
        message.channel.send(language.player.loopingOn).catch(() => { });
    }
}

function sendQueueVideoInfo(youtubePlayer: YoutubePlayer, message: Message, playlistItems: PlaylistItem[], search = false) {
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    for (const playlistItem of playlistItems) {
        if (canEmbed(message.channel as TextChannel)) {
            const embed = new RichEmbed();
            addBasicInfo(youtubePlayer, embed, playlistItem);
            if (search) embed.setDescription(`${language.videoAdded} ${playlistItem.submitter} ${language.luckSearch}`);
            else embed.setDescription(`${language.videoAdded} ${playlistItem.submitter}`);
            embed.addField(language.video.duration, getYoutubeTime(new Date(playlistItem.videoInfo.timestamp)));
            message.channel.send(embed)
                .then(msg => {
                    if (Array.isArray(msg)) {
                        playlistItem.message = msg[0];
                        if (reactionButtons.get(youtubePlayer)!) {
                            msg[0].react('❎');
                        }
                    } else {
                        playlistItem.message = msg;
                        if (reactionButtons.get(youtubePlayer)!) {
                            msg.react('❎');
                        }
                    }
                })
                .catch(error => message.client.emit('error', error));
        } else {
            message.channel.send(`\`${playlistItem.videoInfo.video_url}\` ${language.videoAdded} ${playlistItem.submitter}`)
                .then(msg => {
                    if (Array.isArray(msg)) {
                        playlistItem.message = msg[0];
                    } else {
                        playlistItem.message = msg;
                    }
                })
                .catch(error => message.client.emit('error', error));
        }
    }
    updatePlayer(youtubePlayer, message.guild, true);
}

function getYoutubeTime(date: Date) {
    let seconds: any = date.getSeconds();
    let minutes: any = date.getMinutes();
    let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

    seconds = seconds < 10 ? `0${seconds}` : seconds;
    minutes = minutes < 10 ? `0${minutes}` : minutes;

    if (hours)
        hours = hours < 10 ? `0${hours}:` : `${hours}:`;
    else
        hours = '';

    return `${hours}${minutes}:${seconds}`;
}

async function startPlayer(youtubePlayer: YoutubePlayer, message: Message): Promise<VoiceConnection> {
    return new Promise(async (resolve, reject) => {
        const language = playerLanguage.get(youtubePlayer)!.getLang();
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);

        let connection: VoiceConnection;
        if (message.guild.me.voiceChannel && message.guild.me.voiceChannel.connection) {
            connection = message.guild.me.voiceChannel.connection;
        } else {
            try {
                connection = await message.member.voiceChannel.join();
                guildPlayer.setTextChannel(message.channel as TextChannel);
                info(message.channel as TextChannel, language.player.created, selfDeleteTime.get(youtubePlayer));
                message.client.emit('debug', `[Youtube Player] [Status] Player has been created in guild ${message.guild.id}`);
                playerLoop(youtubePlayer, connection);
            } catch (error) {
                message.client.emit('error', error);
                errorInfo(message.channel as TextChannel, language.cannotConnect, selfDeleteTime.get(youtubePlayer));
                destroyGuildPlayer(youtubePlayer, message.guild);
                reject(new Error(error));
                return;
            }
        }
        resolve(connection);
    });
}

async function destroyGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild) {
    const guildData = guildPlayer.get(youtubePlayer)!;
    if (!guildData[guild.id]) return;
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const textChannel = guildData[guild.id].getTextChannel();
    guildData[guild.id].destroy();

    if (guild.me.voiceChannel && guild.me.voiceChannel.connection) {
        guild.me.voiceChannel.connection.disconnect();
    }

    if (textChannel) {
        info(textChannel, language.player.destroy);
    }

    delete guildData[guild.id];
    guild.client.emit('debug', `[Youtube Player] [Status] Player destroyed in guild ${guild.id}`);
}

function playerLoop(youtubePlayer: YoutubePlayer, connection: VoiceConnection) {
    const guildPlayer = getGuildPlayer(youtubePlayer, connection.channel.guild);
    if (!guildPlayer.switchToNextSong()) {
        guildPlayer.suspend();
        connection.client.emit('debug', `[Youtube Player] [Status] Player suspended in guild ${connection.channel.guild.id}`);
        return;
    }
    const playlistItem = guildPlayer.currentPlayListItem;

    if (!playlistItem) {
        throw new Error('nothing to play. Should not happen');
    }

    const dispatcher = connection.playOpusStream(playlistItem.stream);

    dispatcher.on('end', () => {
        connection.client.emit('debug', `[Youtube Player] [Status] Track ended in guild ${connection.channel.guild.id}`);
        setTimeout(() => {
            guildPlayer.resetTime();
            recreateOrRecreatePlayerButtons(guildPlayer);
            playerLoop(youtubePlayer, connection);
        }, waitTimeBetweenTracks.get(youtubePlayer));
    });
    dispatcher.on('debug', info => {
        connection.client.emit('debug', `[Dispatcher] [debug] ${info}`);
    });
    dispatcher.on('start', () => {
        connection.client.emit('debug', `[Youtube Player] [Status] Track started in guild ${connection.channel.guild.id}`);
        guildPlayer.setStartTime();
        updatePlayer(youtubePlayer, connection.channel.guild);
    });
    dispatcher.on('error', e => {
        connection.client.emit('debug', `[Youtube Player] [Status] Track Error in guild ${connection.channel.guild.id} ${e}`);
        connection.client.emit('error', e);
    });
}

async function updatePlayer(youtubePlayer: YoutubePlayer, guild: Guild, fullUpdate = false) {
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, guild);

    const textChannel = guildPlayer.getTextChannel();
    const voice = guild.me.voiceChannel;
    const currentSong = guildPlayer.currentPlayListItem;
    const startSongTime = guildPlayer.getSongProgressionTime();
    if (!textChannel || !startSongTime || !currentSong || !voice) return;

    if (fullUpdate) {
        if (guildPlayer.playerMessage)
            await guildPlayer.playerMessage.delete().catch(e => guild.client.emit('error', e));
        guildPlayer.playerMessage = undefined;
    }

    let progress = '';
    const videoTimestamp = parseInt(currentSong.videoInfo.timestamp);
    if (startSongTime.getTime() < videoTimestamp) {
        progress = `${getYoutubeTime(startSongTime)} / ${getYoutubeTime(new Date(videoTimestamp))}`;
    } else {
        progress = `${getYoutubeTime(new Date(videoTimestamp))} / ${getYoutubeTime(new Date(videoTimestamp))}`;
    }
    const embed = new RichEmbed();
    embed.setDescription(`\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
    addBasicInfo(youtubePlayer, embed, currentSong);
    embed.setColor(guildPlayer.color as ColorResolvable);
    embed.addField(language.video.progress, progress, true);
    if (guildPlayer.isPaused)
        embed.setFooter(language.player.statusPaused, youtubeLogo);
    else {
        if (guildPlayer.isLooping)
            embed.setFooter(`${language.player.statusPlaying} 🔄${currentSong.videoInfo.thumbnail_url}`);
        else
            embed.setFooter(language.player.statusPlaying, currentSong.videoInfo.thumbnail_url);
    }
    embed.setThumbnail('');
    if (!guildPlayer.playerMessage) {
        if (!guildPlayer.waitForUpdate) {
            guildPlayer.waitForUpdate = true;
            if (textChannel && canEmbed(textChannel)) {
                textChannel.send(embed)
                    .then(msg => {
                        if (Array.isArray(msg)) guildPlayer.playerMessage = msg[0];
                        else guildPlayer.playerMessage = msg;
                        recreateOrRecreatePlayerButtons(guildPlayer);
                    })
                    .catch(e => guild.client.emit('error', e))
                    .finally(() => {
                        guildPlayer.waitForUpdate = false;
                    });
            } else if (textChannel) {
                textChannel.send(`${currentSong.videoInfo.video_url}\n${currentSong.videoInfo.title}\n${progress} ${guildPlayer.isPaused ? language.player.statusPaused : ''}`)
                    .then(msg => {
                        if (Array.isArray(msg)) guildPlayer.playerMessage = msg[0];
                        else guildPlayer.playerMessage = msg;
                    })
                    .catch(e => guild.client.emit('error', e))
                    .finally(() => {
                        guildPlayer.waitForUpdate = false;
                    });
            }
            return;
        }
    }

    if (guildPlayer.playerMessage && guildPlayer.playerMessage.embeds.length !== 0) {
        guildPlayer.playerMessage.edit(embed).catch(e => guild.client.emit('error', e));
    } else if (guildPlayer.playerMessage) {
        guildPlayer.playerMessage.edit(`${currentSong.videoInfo.video_url}\n${currentSong.videoInfo.title}\n${progress} ${guildPlayer.isPaused ? language.player.statusPaused : ''}`)
            .catch(e => guild.client.emit('error', e));
    }

    if (guildPlayer.playerMessage && reactionButtons.get(youtubePlayer) && (videoTimestamp - startSongTime.getTime()) > videoTimestamp * 1000) {
        guildPlayer.playerMessage.react('🔁');
    }

}

async function recreateOrRecreatePlayerButtons(guildPlayer: GuildPlayer) {
    const message = guildPlayer.playerMessage;
    if (!message) return;

    const channel = message.channel as TextChannel;
    const clientPermissions = channel.permissionsFor(channel.guild.me);
    if (clientPermissions && clientPermissions.has('ADD_REACTIONS')) {
        await message.clearReactions().catch(() => { });
        if (guildPlayer.previous.length > 1)
            await message.react('⏮️').catch(() => { });
        if (guildPlayer.isPaused) await message.react('▶️').catch(() => { });
        else await message.react('⏸️').catch(() => { });
        if (guildPlayer.playlist.length !== 0)
            await message.react('⏭️').catch(() => { });
        // if(guildPlayer.isLooping)message.react('🔁').catch(() => { });
        // else message.react('🔂').catch(() => { });
        // message.react('🔀').catch(() => { });

    }
}

function nextTrack(message: Message/*, force = false*/): any {
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        voiceConnection.dispatcher.end();
    }
}

function pauseTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
        guildPlayer.pause();
        voiceConnection.dispatcher.pause();
    }
}

function resumeTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
        guildPlayer.unpause();
        voiceConnection.dispatcher.resume();
    }
}

function replayTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
        guildPlayer.switchToPreviousSong();
        voiceConnection.dispatcher.end();
    }

}
function previousTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
        guildPlayer.switchToPreviousSong();
        guildPlayer.switchToPreviousSong();
        voiceConnection.dispatcher.end();
    }
}

function shuffleQueue(youtubePlayer: YoutubePlayer, message: Message) {
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const voiceConnection = message.guild.voiceConnection;
    if (voiceConnection && voiceConnection.dispatcher) {
        const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
        if (guildPlayer.shuffle()) {
            message.channel.send(language.player.nothingToShuffle).catch(() => { });
        } else {
            message.channel.send(language.player.shuffled).catch(() => { });
        }
    }
}

function verifyUser(youtubePlayer: YoutubePlayer, message: Message): boolean {
    const language = playerLanguage.get(youtubePlayer)!.getLang();

    if (message.guild.voiceConnection && message.guild.voiceConnection.channel.members.size <= 2) return true;
    if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS')) return true;

    else {
        info(message.channel as TextChannel, language.missingPermission);
        return false;
    }
}

function requestNextTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const voteUsers = guildPlayer.voteNext;

    if (canExecute(message.member)) {
        nextTrack(message);
        return;
    }

    if (guildPlayer.addRemoveUser(voteUsers, message.member)) {
        if (canExecute(voteUsers)) {
            nextTrack(message);
            info(message.channel as TextChannel, language.player.skip, selfDeleteTime.get(youtubePlayer)!);
        } else {
            info(message.channel as TextChannel, language.vote.voteNext, selfDeleteTime.get(youtubePlayer)!);
        }
    } else
        info(message.channel as TextChannel, language.vote.removedVote, selfDeleteTime.get(youtubePlayer)!);
}

function requestPreviousTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const voteUsers = guildPlayer.voteNext;

    if (canExecute(message.member)) {
        previousTrack(youtubePlayer, message);
        return;
    }

    if (guildPlayer.addRemoveUser(voteUsers, message.member)) {
        if (canExecute(voteUsers)) {
            previousTrack(youtubePlayer, message);
            info(message.channel as TextChannel, language.player.previous, selfDeleteTime.get(youtubePlayer)!);
        } else {
            info(message.channel as TextChannel, language.vote.votePrevious, selfDeleteTime.get(youtubePlayer)!);
        }
    } else
        info(message.channel as TextChannel, language.vote.removedVote, selfDeleteTime.get(youtubePlayer)!);
}

function requestReplayTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const voteUsers = guildPlayer.voteNext;

    if (canExecute(message.member)) {
        replayTrack(youtubePlayer, message);
        return;
    }

    if (guildPlayer.addRemoveUser(voteUsers, message.member)) {
        if (canExecute(voteUsers)) {
            replayTrack(youtubePlayer, message);
            info(message.channel as TextChannel, language.player.replay, selfDeleteTime.get(youtubePlayer)!);
        } else {
            info(message.channel as TextChannel, language.vote.votePrevious, selfDeleteTime.get(youtubePlayer)!);
        }
    } else
        info(message.channel as TextChannel, language.vote.removedVote, selfDeleteTime.get(youtubePlayer)!);
}
