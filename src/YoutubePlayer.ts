import { Message, Guild, RichEmbed, TextChannel, Client, VoiceConnection, ColorResolvable, GuildMember, MessageReaction } from 'discord.js';
import { canEmbed, errorInfo, info, addBasicInfo, sliderGenerator } from './embeds';
import { Youtube } from './Youtube';
import { PlayerLanguage, GuildData } from './interfaces';
import { Language } from './language';
import { GuildPlayer, PlaylistItem, VoteInfo } from './GuildPlayer';
import { getYTInfo, getStream } from './yt-core-discord';

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
const maxVideoLength = new WeakMap<YoutubePlayer, number>();
const usePatch = new WeakMap<YoutubePlayer, boolean>();
const isClientSet = new WeakMap<YoutubePlayer, boolean>();
const youtube = new WeakMap<YoutubePlayer, Youtube>();
const secondCommand = new WeakMap<YoutubePlayer, boolean>();
const autoQueryDetection = new WeakMap<YoutubePlayer, boolean>();
const waitTimeBetweenTracks = new WeakMap<YoutubePlayer, number>();
const maxItemsInPlayList = new WeakMap<YoutubePlayer, number>();
const maxUserItemsInPlayList = new WeakMap<YoutubePlayer, number>();
const votePercentage = new WeakMap<YoutubePlayer, number>();
const coolDown = new WeakMap<YoutubePlayer, number>();
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
            console.warn('YouTube Api key has not been not provided! Rich embeds are going to contain less information about the video!');
        } else {
            try {
                const youtubeClass = new Youtube(youtubeApiKey);
                youtube.set(this, youtubeClass);

            } catch (error) {
                console.warn('YouTube Api key that has been provided is not valid! Rich embeds are going to contain less information about the video!');
            }
        }

        if (typeof youtubeApiKey !== 'string') throw new TypeError(`Expected string got ${typeof youtubeApiKey}`);
        messageUpdateRate.set(this, defaultPlayerUpdate);
        guildPlayer.set(this, {});
        secondCommand.set(this, true);
        selfDeleteTime.set(this, defaultSelfDeleteTime);
        waitTimeBetweenTracks.set(this, defaultWaitTimeBetweenTracks);
        deleteUserMessage.set(this, true);
        reactionButtons.set(this, true);
        playerLanguage.set(this, new Language(language));
        isClientSet.set(this, false);
        maxVideoLength.set(this, 60 * 3);
        maxItemsInPlayList.set(this, 100);
        maxUserItemsInPlayList.set(this, 10);
        votePercentage.set(this, 0.6);
        coolDown.set(this, 5);
        autoQueryDetection.set(this, true);
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
     * Should search if none of the player commands where found in message
     * @param {boolean} boolean Enables/disables autoQuerySearch
     */
    set autoQuerySearch(trueFalse: boolean) {
        if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
        autoQueryDetection.set(this, trueFalse);
    }

    /**
     * how much items can be in playlist.
     * @param {number} number playlist limit.
     */
    set maxItemsInPlaylist(items: number) {
        if (typeof items !== 'number') throw new Error(`Expected number got ${typeof items}`);
        if (items < 1) throw new Error('max video length cannot be lower than 1 item');
        maxItemsInPlayList.set(this, items);
    }

    /**
     * How much track can a user have in playlist
     * @param {number} number user playlist limit
     */
    set maxUsersItemsInPlaylist(items: number) {
        if (typeof items !== 'number') throw new Error(`Expected number got ${typeof items}`);
        if (items < 1) throw new Error('max video length cannot be lower than 1 item');
        maxUserItemsInPlayList.set(this, items);
    }

    /**
     * User command cool down. How much does bot needs to wait before accepting new command
     * @param {number} number time
     */
    set userCoolDown(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 0) throw new Error('cooldown cannot be lower than 0');
        coolDown.set(this, seconds * 1000);
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
     * max track length
     * @param {number} number max track length
     */
    set maxTrackLength(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 0.0834) throw new Error('max video length cannot be lower than 5 seconds');
        maxVideoLength.set(this, seconds);
    }

    /**
     * Set player edit/update rate
     * @param {number} number how fast/slow should player message be updated.
     */
    set playerUpdateRate(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 5) throw new Error('update rate cannot be lower than 5 seconds');
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
     * When bot runs out of songs how long should wait before disconnecting voice channel
     * @param {number} number in seconds. If set to 0 it will leave immediately.
     */
    set votePercentage(percentage: number) {
        if (typeof percentage !== 'number') throw new Error(`Expected number got ${typeof percentage}`);
        if (percentage < 0) throw new Error(`Number cannot be lower than 0`);
        if (percentage > 100) throw new Error(`Number cannot be higher than 100`);
        votePercentage.set(this, percentage / 100);
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
     * Custom player language pack
     * @param {Language} languePack Custom langue pack
     */
    set languagePack(playerLang: PlayerLanguage) {
        if (typeof playerLang !== 'object') throw new Error(`Expected object got ${typeof playerLang}`);
        playerLanguage.set(this, new Language(playerLang));
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
                commandNextTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.previous)) {
                commandPreviousTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.help)) {
                playerHelp(this, message);
                return;
            } else if (commendChecker(checker, commands.pause)) {
                commandPauseOrReplyTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.resume)) {
                commandPauseOrReplyTrack(this, message);
            } else if (commendChecker(checker, commands.replay)) {
                commandReplayTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.replay)) {
                commandReplayTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.loop)) {
                commandLoopTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.showPlayList)) {
                commandLoopTrack(this, message);
                return;
            } else if (commendChecker(checker, commands.shuffle)) {
                const guildData = guildPlayer.get(this)!;
                if (!guildData[message.guild.id]) message.channel.send(language.player.nothingPlaying);
                else getGuildPlayer(this, message.guild).shuffleQueue(message, language);
                return;
            } else {
                if (autoQueryDetection.get(this)) {
                    const urls = checker.match(youtubeTester);
                    if (urls) addYoutubeToQueue(this, message, urls);
                    else if (checker.match(urlTester)) {
                        errorInfo(message.channel as TextChannel, language.onlyYoutubeLinks);
                    } else youtubeLuckSearch(this, message, checker);
                } else errorInfo(message.channel as TextChannel, language.incorrectUse);
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

        const emojiWatcher = (theGuildPlayer: GuildPlayer, guildMembers: GuildMember[], emoji: string, message: Message) => {
            switch (emoji) {
                case '⏸️':
                    if (theGuildPlayer.setVote(guildMembers, 'votePauseResume')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '▶️':
                    if (theGuildPlayer.setVote(guildMembers, 'votePauseResume')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '⏮️':
                    if (theGuildPlayer.setVote(guildMembers, 'votePrevious')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '⏭️':
                    if (theGuildPlayer.setVote(guildMembers, 'voteNext')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '🔁':
                    if (theGuildPlayer.setVote(guildMembers, 'voteLoop')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '🔂':
                    if (theGuildPlayer.setVote(guildMembers, 'voteLoop')) recreateOrRecreatePlayerButtons(theGuildPlayer);
                    break;
                case '❎':
                    theGuildPlayer.removeFromPlayListByMessage(message);
                    break;
                // case '🔀':
                //     if (theGuildPlayer.setVoteShuffle(guildMembers)) recreateOrRecreatePlayerButtons(theGuildPlayer);
                //     break;
                default:
                    break;
            }
        };

        const onMessageReactionAddOrRemove = (messageReaction: MessageReaction) => {
            if (!messageReaction.message.guild) return;
            const guild = messageReaction.message.guild;
            const guildData = guildPlayer.get(youtubePlayer)!;
            const theGuildPlayer = guildData[guild.id];
            if (!theGuildPlayer) return;
            if (client.user !== messageReaction.message.author) return;

            const guildMembers = theGuildPlayer.getUsersFromReactions(messageReaction);
            emojiWatcher(theGuildPlayer, guildMembers, messageReaction.emoji.name, messageReaction.message);
        };

        client.on('messageReactionAdd', messageReaction => {
            onMessageReactionAddOrRemove(messageReaction);
        });

        client.on('messageReactionRemove', messageReaction => {
            onMessageReactionAddOrRemove(messageReaction);
        });

    }
}

async function addYoutubeToQueue(youtubePlayer: YoutubePlayer, message: Message, urls: RegExpMatchArray) {
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    if (isPlaylistFull(message, youtubePlayer, language)) return;

    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/\(URL\)/g, `<${urls.join('> <')}>`))
        .catch(error => message.client.emit('error', error));

    if (deleteUserMessage.get(youtubePlayer) && message.deletable)
        message.delete().catch(error => message.client.emit('error', error));

    const playlistItems: PlaylistItem[] = [];
    for (const url of urls) {
        const youtubeClass = youtube.get(youtubePlayer)!;
        const title = player.isAlreadyOnPlaylistByUrl(url);
        if (title) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, selfDeleteTime.get(youtubePlayer)!);
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            updatePlayer(youtubePlayer, message.guild, true);
            break;
        }
        try {
            const options = usePatch.get(youtubePlayer) ? patch : {};
            const videoInfo = await getYTInfo(url);
            const maxTrackLength = maxVideoLength.get(youtubePlayer)!;
            if (parseInt(videoInfo.length_seconds) / 60 > maxTrackLength) {
                await errorInfo(message.channel as TextChannel, ` ${message.author} ${language.toLongTrack.replace(/<trackurl>/g, `<${videoInfo.video_url}>`).replace(/<maxlength>/g, maxTrackLength.toString())}`);
                if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
                updatePlayer(youtubePlayer, message.guild, true);
                break;
            }
            const playlistItem: PlaylistItem = {
                videoInfo,
                steamOptions: options,
                stream: await getStream(videoInfo, options),
                videoData: youtubeClass ? await youtubeClass.getVideoInfo(url) : undefined,
                submitted: new Date(Date.now()),
                submitter: message.member,
            };
            if (player.push(playlistItem)) {
                playlistItems.push(playlistItem);
            }
        } catch (error) {
            errorInfo(message.channel as TextChannel, error.toString(), selfDeleteTime.get(youtubePlayer));
            break;
        }
    }

    if (infoMessage) {
        if (Array.isArray(infoMessage)) {
            for (const msg of infoMessage) {
                msg.delete().catch(error => message.client.emit('error', error));
            }
        } else if (infoMessage !== true) {
            infoMessage.delete().catch(error => message.client.emit('error', error));
        }
    }

    if (playlistItems.length === 0) return;
    await startPlayer(youtubePlayer, message);
    sendQueueVideoInfo(youtubePlayer, message, playlistItems);
}

async function youtubeLuckSearch(youtubePlayer: YoutubePlayer, message: Message, query: string) {
    if (!youtube.get(youtubePlayer)) return;
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const youtubeClass = youtube.get(youtubePlayer)!;
    if (isPlaylistFull(message, youtubePlayer, language)) return;
    let url = '';
    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/\(URL\)/g, `\`${query}\``))
        .catch(error => message.client.emit('error', error));

    if (deleteUserMessage.get(youtubePlayer) && message.deletable)
        message.delete().catch(error => message.client.emit('error', error));

    let playlistItem: PlaylistItem;
    try {
        const result = await youtubeClass.searchOnLuck(query);
        url = `${result.video_url} `;
        const maxTrackLength = maxVideoLength.get(youtubePlayer)!;
        if (result.duration > maxTrackLength) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.toLongTrack.replace(/<trackurl>/g, `${result.video_url}`).replace(/<maxlength>/g, maxTrackLength.toString())}`);
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            updatePlayer(youtubePlayer, message.guild, true);
            return;
        }

        const title = player.isAlreadyOnPlaylistById(result.id);
        if (title) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, selfDeleteTime.get(youtubePlayer)!);
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            updatePlayer(youtubePlayer, message.guild, true);
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
        errorInfo(message.channel as TextChannel, `${url}${language.foundVideoUnavailable}`, selfDeleteTime.get(youtubePlayer));
        message.client.emit('error', error);
        return;
    }

    if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
    await startPlayer(youtubePlayer, message);
    sendQueueVideoInfo(youtubePlayer, message, [playlistItem], true);
}

function deleteManyMessage(message: Message | Message[]) {
    if (Array.isArray(message)) {
        for (const msg of message) {
            msg.delete().catch(error => msg.client.emit('error', error));
        }
    } else message.delete().catch(error => message.client.emit('error', error));
}

function isPlaylistFull(message: Message, youtubePlayer: YoutubePlayer, language: PlayerLanguage): boolean {
    const player = getGuildPlayer(youtubePlayer, message.guild);
    if (player.length > maxItemsInPlayList.get(youtubePlayer)!) {
        message.channel.send(language.player.playlistFull)
            .catch(error => message.client.emit('error', error));
        return true;
    }
    if (player.howManySongsDoesMemberHasInPlaylist(message.member) > maxUserItemsInPlayList.get(youtubePlayer)!) {
        message.channel.send(language.player.toManyUserSongs)
            .catch(error => message.client.emit('error', error));
        return true;
    }
    return false;
}

function playerHelp(playerObject: YoutubePlayer, message: Message, prefix?: string) {
    const helps = playerLanguage.get(playerObject)!.help(prefix);
    const language = playerLanguage.get(playerObject)!.getLang();
    const helpInfo: string[] = [];
    for (const help of Object.keys(helps)) helpInfo.push(help);

    if (canEmbed(message.channel as TextChannel)) {
        const embed = new RichEmbed();
        embed.addField(language.player.helpCommand, helpInfo.join('\n'));
        embed.setColor('GREEN');
        message.channel.send(embed).catch(error => message.client.emit('error', error));
    } else message.channel.send(`\`\`\`${helpInfo.join('\n')}\`\`\``).catch(error => message.client.emit('error', error));
}

function getGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild) {
    const guildData = guildPlayer.get(youtubePlayer)!;
    if (!guildData[guild.id]) {
        guildData[guild.id] = new GuildPlayer(guild, youtubePlayer, votePercentage.get(youtubePlayer)!)
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

function sendQueueVideoInfo(youtubePlayer: YoutubePlayer, message: Message, playlistItems: PlaylistItem[], search = false) {
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    for (const playlistItem of playlistItems) {
        if (canEmbed(message.channel as TextChannel)) {
            const embed = new RichEmbed();
            addBasicInfo(youtubePlayer, embed, playlistItem);
            if (search) embed.setDescription(`${language.videoAdded} ${playlistItem.submitter} ${language.luckSearch}`);
            else embed.setDescription(`${language.videoAdded} ${playlistItem.submitter}`);
            embed.addField(language.video.duration, getYoutubeTime(parseInt(playlistItem.videoInfo.length_seconds) * 1000));
            message.channel.send(embed)
                .then(msg => {
                    if (Array.isArray(msg)) {
                        playlistItem.message = msg[0];
                        if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0) {
                            msg[0].react('❎');
                        }
                    } else {
                        playlistItem.message = msg;
                        if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0) {
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

function getYoutubeTime(timestamp: number) {
    const date = new Date(timestamp);
    let seconds: any = date.getSeconds();
    let minutes: any = date.getMinutes();
    let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

    seconds = seconds < 10 ? `0${seconds}` : seconds;
    minutes = minutes < 10 ? `0${minutes}` : minutes;

    if (hours) hours = hours < 10 ? `0${hours}:` : `${hours}:`;
    else hours = '';

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

function playerLoop(youtubePlayer: YoutubePlayer, connection: VoiceConnection) {
    const guildPlayer = getGuildPlayer(youtubePlayer, connection.channel.guild);
    if (!guildPlayer.switchToNextSong()) {
        guildPlayer.suspend();
        connection.client.emit('debug', `[Youtube Player] [Status] Player suspended in guild ${connection.channel.guild.id}`);
        return;
    }
    const playlistItem = guildPlayer.currentPlayListItem;

    if (!playlistItem) throw new Error('nothing to play. Should not happen');

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
    const videoTimestamp = parseInt(currentSong.videoInfo.length_seconds) * 1000;
    if (startSongTime.getTime() < videoTimestamp) progress = `${getYoutubeTime(startSongTime.getTime())} / ${getYoutubeTime(videoTimestamp)}`;
    else progress = `${getYoutubeTime(videoTimestamp)} / ${getYoutubeTime(videoTimestamp)}`;

    const embed = new RichEmbed();
    addBasicInfo(youtubePlayer, embed, currentSong);
    if (!embed.description) {
        embed.setDescription(`\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
    } else {
        embed.setDescription(`${embed.description}\n\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
    }
    embed.setColor(guildPlayer.color as ColorResolvable);
    embed.addField(language.video.progress, progress, true);
    const voteNext = guildPlayer.voteNextStatus;
    const votePrevious = guildPlayer.votePreviousStatus;
    const voteReplay = guildPlayer.voteReplayStatus;
    const votePauseResume = guildPlayer.votePauseResumeStatus;
    const voteLoopStatus = guildPlayer.voteLoopStatus;
    if (voteNext || votePrevious || voteReplay || votePauseResume || voteLoopStatus) {
        const vote: string[] = [];
        if (voteNext) vote.push(`${language.player.vote.next} ${voteNext}`);
        if (voteReplay) vote.push(`${language.player.vote.replay} ${voteReplay}`);
        if (votePrevious) vote.push(`${language.player.vote.previous} ${votePrevious}`);
        if (votePauseResume) vote.push(`${language.player.vote.pauseResume} ${votePauseResume}`);
        if (voteLoopStatus) vote.push(`${language.player.vote.loop} ${voteLoopStatus}`);
        embed.addField(language.player.vote.vote, vote.join('\n'));
    }

    if (guildPlayer.isPaused)
        embed.setFooter(language.player.statusPaused, youtubeLogo);
    else {
        if (guildPlayer.isLooping) embed.setFooter(`${language.player.statusPlaying} 🔄`, youtubeLogo);
        else embed.setFooter(language.player.statusPlaying, youtubeLogo);
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
        await message.clearReactions().catch(error => message.client.emit('error', error));
        if (guildPlayer.previous.length > 1)
            await message.react('⏮️').catch(error => message.client.emit('error', error));
        if (guildPlayer.isPaused) await message.react('▶️').catch(error => message.client.emit('error', error));
        else await message.react('⏸️').catch(error => message.client.emit('error', error));
        if (guildPlayer.playlist.length !== 0)
            await message.react('⏭️').catch(error => message.client.emit('error', error));
        // if(guildPlayer.isLooping)message.react('🔁').catch(error => message.client.emit('error', error));
        // else message.react('🔂').catch(error => message.client.emit('error', error));
        // message.react('🔀').catch(error => message.client.emit('error', error));

    }
}

async function destroyGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild) {
    const theGuildData = guildPlayer.get(youtubePlayer)!;
    if (!theGuildData[guild.id]) return;
    const playerMessage = theGuildData[guild.id].playerMessage;
    theGuildData[guild.id].destroy();
    if (playerMessage) playerMessage.delete().catch(error => guild.client.emit('error', error));
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    const textChannel = theGuildData[guild.id].getTextChannel();

    if (guild.me.voiceChannel && guild.me.voiceChannel.connection) guild.me.voiceChannel.connection.disconnect();
    if (textChannel) info(textChannel, language.player.destroy);

    delete theGuildData[guild.id];
    guild.client.emit('debug', `[Youtube Player] [Status] Player destroyed in guild ${guild.id}`);
}

function commandNextTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteNext'));
}

function commandPauseOrReplyTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'votePauseResume'));
}

function commandPreviousTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'votePrevious'));
}

function commandLoopTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteLoop'));
}

function commandReplayTrack(youtubePlayer: YoutubePlayer, message: Message) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteReplay'));
}

async function sendVoteInfo(youtubePlayer: YoutubePlayer, message: Message, status: VoteInfo) {
    const language = playerLanguage.get(youtubePlayer)!.getLang();
    switch (status) {
        case VoteInfo.NO_PERMISSION:
            await errorInfo(message.channel as TextChannel, language.player.vote.notAllowed);
            break;
        case VoteInfo.ALREADY_VOTE:
            await errorInfo(message.channel as TextChannel, language.player.vote.alreadyVoted);
            break;
        case VoteInfo.VOTE_EXECUTED:
            // await errorInfo(message.channel as TextChannel, language.player.vote.alreadyVoted);
            break;
        case VoteInfo.VOTE_SUCCESSFUL:
            await errorInfo(message.channel as TextChannel, language.player.vote.voteSuccessful);
            break;
        default:
            break;
    }
    updatePlayer(youtubePlayer, message.guild, true);
}
