import { Message, Guild, RichEmbed, TextChannel, Client, VoiceConnection, ColorResolvable, GuildMember, MessageReaction } from 'discord.js';
import { canEmbed, errorInfo, info, addBasicInfo, sliderGenerator, Embeds, deleteManyMessage, stringifyRichEmbed } from './messages';
import { Youtube } from './Youtube';
import { PlayerLanguage, GuildData, VideoInfo, Commands } from './interfaces';
import { Language, playerLanguage } from './language';
import { GuildPlayer, PlaylistItem, VoteInfo } from './GuildPlayer';
import { getYTInfo, getStream, searchYTVideo, parsePlaylist } from './yt-core-discord';
import ytdl = require('ytdl-core');

const youtubeLogo = 'https://s.ytimg.com/yts/img/favicon_144-vfliLAfaB.png'; // Youtube icon
const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);
const urlTester = new RegExp(/https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/g);
const DEFAULT_PLAYER_UPDATE = 10;
const DEFAULT_WAIT_TIME_BETWEEN_TRACKS = 2;
const DEFAULT_SELF_DELETE_TIME = 5;
const DEFAULT_LEAVE_TIME = 20;

const guildPlayer = new WeakMap<YoutubePlayer, GuildData>();
const playerUpdateRate = new WeakMap<YoutubePlayer, number>();
const selfDeleteTime = new WeakMap<YoutubePlayer, number>();
const leaveVoiceChannelAfter = new WeakMap<YoutubePlayer, number>();
const leaveVoiceChannelAfterAllMembersLeft = new WeakMap<YoutubePlayer, number>();
const maxTrackLength = new WeakMap<YoutubePlayer, number>();
const usePatch = new WeakMap<YoutubePlayer, boolean>();
const discordClient = new WeakMap<YoutubePlayer, Client>();
const youtube = new WeakMap<YoutubePlayer, Youtube>();
const autoQueryDetection = new WeakMap<YoutubePlayer, boolean>();
const autoPlaylistDetection = new WeakMap<YoutubePlayer, boolean>();
const waitTimeBetweenTracks = new WeakMap<YoutubePlayer, number>();
const maxItemsInPlayList = new WeakMap<YoutubePlayer, number>();
const maxUserItemsInPlayList = new WeakMap<YoutubePlayer, number>();
const playlistParseWait = new WeakMap<YoutubePlayer, number>();
const multipleParser = new WeakMap<YoutubePlayer, boolean>();
const playlistParse = new WeakMap<YoutubePlayer, boolean>();
const votePercentage = new WeakMap<YoutubePlayer, number>();
const coolDown = new WeakMap<YoutubePlayer, number>();
const deleteUserMessage = new WeakMap<YoutubePlayer, boolean>();
const hardDeleteUserMessage = new WeakMap<YoutubePlayer, boolean>();
const reactionButtons = new WeakMap<YoutubePlayer, boolean>();
const destroyed = new WeakMap<YoutubePlayer, boolean>();
const userCoolDownSet = new WeakMap<YoutubePlayer, Set<string>>();
const suggestReplay = new WeakMap<YoutubePlayer, number>();

const patch = {
    filter: 'audioonly',
    highWaterMark: 1 << 25,
};

export interface YoutubePlayerOptions {
    messageUpdateRate?: number;
    selfDeleteTime?: number;
    leaveVoiceChannelAfter?: number;
    leaveVoiceChannelAfterAllMembersLeft?: number;
    maxTrackLength?: number;
    usePatch?: boolean;
    autoQueryDetection?: boolean;
    autoPlaylistDetection?: boolean;
    waitTimeBetweenTracks?: number;
    maxItemsInPlayList?: number;
    maxUserItemsInPlayList?: number;
    playlistParseWait?: number;
    multipleParser?: boolean;
    playlistParse?: boolean;
    votePercentage?: number;
    coolDown?: number;
    deleteUserMessage?: boolean;
    hardDeleteUserMessage?: boolean;
    reactionButtons?: boolean;
    suggestReplay?: number;
    language?: PlayerLanguage;
}

export class YoutubePlayer {

    /**
     * Constructor that constructs
     * @param {string} string youtube api key
     * @param {PlayerLanguage} PlayerLanguage PlayerLanguage
     */
    constructor(youtubeApiKey?: string, options?: YoutubePlayerOptions) {
        if (!options) options = {} as any;
        if (options && typeof options !== 'object') throw new TypeError('options must be an object!');
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
        guildPlayer.set(this, {});
        if (options && options.language)
            this.defaultLanguage = options.language;
        else {
            playerLanguage.set(this, new Language());
        }

        this.playerUpdateRate = (options && options.messageUpdateRate !== undefined) ? options.messageUpdateRate : DEFAULT_PLAYER_UPDATE;
        this.selfDelete = (options && options.selfDeleteTime !== undefined) ? options.selfDeleteTime : DEFAULT_SELF_DELETE_TIME;
        this.waitTimeBetweenTracks = (options && options.waitTimeBetweenTracks !== undefined) ? options.waitTimeBetweenTracks : DEFAULT_WAIT_TIME_BETWEEN_TRACKS;
        this.deleteUserMessages = (options && options.deleteUserMessage !== undefined) ? options.deleteUserMessage : true;
        this.reactionButtons = (options && options.reactionButtons !== undefined) ? options.reactionButtons : true;
        this.parsePlaylistUrl = (options && options.playlistParse !== undefined) ? options.playlistParse : false;
        this.maxTrackLength = (options && options.maxTrackLength !== undefined) ? options.maxTrackLength : 60 * 3;
        this.maxItemsInPlaylist = (options && options.maxItemsInPlayList !== undefined) ? options.maxItemsInPlayList : 100;
        this.maxUsersItemsInPlaylist = (options && options.maxUserItemsInPlayList !== undefined) ? options.maxUserItemsInPlayList : 10;
        this.votePercentage = (options && options.votePercentage !== undefined) ? options.votePercentage : 60;
        this.playListWaitTime = (options && options.playlistParseWait !== undefined) ? options.playlistParseWait : 2;
        this.leaveVoiceChannelAfter = (options && options.leaveVoiceChannelAfter !== undefined) ? options.leaveVoiceChannelAfter : DEFAULT_LEAVE_TIME;
        this.leaveVoiceChannelAfterWhenNoPlayersInChannel = (options && options.leaveVoiceChannelAfterAllMembersLeft !== undefined) ? options.leaveVoiceChannelAfterAllMembersLeft : DEFAULT_LEAVE_TIME;
        this.userCoolDown = (options && options.coolDown !== undefined) ? options.coolDown : 5;
        this.autoQuerySearch = (options && options.autoQueryDetection !== undefined) ? options.autoQueryDetection : true;
        this.autoPlaylistDetection = (options && options.autoPlaylistDetection !== undefined) ? options.autoPlaylistDetection : false;
        this.multipleVideoParser = (options && options.multipleParser !== undefined) ? options.multipleParser : true;
        this.hardDeleteUserMessages = (options && options.hardDeleteUserMessage !== undefined) ? options.hardDeleteUserMessage : false;
        this.suggestReplayButtons = (options && options.suggestReplay !== undefined) ? options.suggestReplay : 20;

        destroyed.set(this, false);
        userCoolDownSet.set(this, new Set());
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
     * Should parse playlist links.
     * @param {boolean} boolean.
     */
    set parsePlaylistUrl(trueFalse: boolean) {
        if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
        playlistParse.set(this, trueFalse);
    }

    /**
     * Should auto detect  playlist link? Requires autoQueryDetection to be enabled.
     * @param {boolean} boolean.
     */
    set autoPlaylistDetection(trueFalse: boolean) {
        if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
        if (trueFalse && !playlistParse.get(this)!) throw new Error(`playlistParse has to be enabled in order for this function to work`);
        if (trueFalse && !autoQueryDetection.get(this)!) throw new Error(`autoQueryDetection has to be enabled in order for this function to work`);
        autoPlaylistDetection.set(this, trueFalse);
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
     * how much this should wait to parse next playlist time
     * @param {number} number seconds
     */
    set playListWaitTime(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        playlistParseWait.set(this, seconds);
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
        coolDown.set(this, seconds);
    }

    /**
     * Allow multiple videos parsing. This also enables playlist parsing
     * @param {boolean} bool time
     */
    set multipleVideoParser(bool: boolean) {
        if (typeof bool !== 'boolean') throw new Error(`Expected boolean got ${typeof bool}`);
        multipleParser.set(this, bool);
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
        maxTrackLength.set(this, seconds);
    }

    /**
     * Set player edit/update rate
     * @param {number} number how fast/slow should player message be updated.
     */
    set playerUpdateRate(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 5) throw new Error('update rate cannot be lower than 5 seconds');
        playerUpdateRate.set(this, seconds * 1000);
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
     * When all uses leave voice channel how long should bot wait before destroying player
     * @param {number} number in seconds. If set to 0 it will leave immediately .
     */
    set leaveVoiceChannelAfterWhenNoPlayersInChannel(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        leaveVoiceChannelAfter.set(this, seconds * 1000);
    }

    /**
     * percentage of vote for to be executed
     * @param {number} number vote percentage
     */
    set votePercentage(percentage: number) {
        if (typeof percentage !== 'number') throw new Error(`Expected number got ${typeof percentage}`);
        if (percentage < 0) throw new Error(`Number cannot be lower than 0`);
        if (percentage > 100) throw new Error(`Number cannot be higher than 100`);
        votePercentage.set(this, percentage / 100);
    }

    /**
     * Should message be garbage collected
     * @param {number} seconds if 0 no others numbers are seconds
     */
    set selfDelete(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 0) throw new Error('Cannot be below 0');
        selfDeleteTime.set(this, seconds * 1000);
    }

    /**
     * Delete every message in channels when player is active
     * @param {boolean} boolean
     */
    set hardDeleteUserMessages(bool: boolean) {
        if (typeof bool !== 'boolean') throw new Error(`Expected boolean got ${typeof bool}`);
        hardDeleteUserMessage.set(this, bool);
    }

    /**
     * Custom player language pack
     * @param {Language} languePack Custom langue pack
     */
    set defaultLanguage(playerLang: PlayerLanguage) {
        if (typeof playerLang !== 'object') throw new Error(`Expected object got ${typeof playerLang}`);
        playerLanguage.set(this, new Language(playerLang));
    }

    /**
     * Create play buttons with that you can control player without use of any other command
     * @param {bool} boolean enable/disable
     */
    set reactionButtons(bool: boolean) {
        if (typeof bool !== 'boolean') throw new Error(`Expected boolean got ${typeof bool}`);
        reactionButtons.set(this, bool);
    }

    /**
     * How much before the song should show the replay song button
     * reaction button feature has to be enabled in order for this to work
     * @param {seconds} seconds if 0 the button is not going to show up
     */
    set suggestReplayButtons(seconds: number) {
        if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
        if (seconds < 0) throw new Error('Cannot be below 0');
        if (!reactionButtons.get(this)) throw new Error(`reactionButtons feature has to be enabled in order for this feature to work`);
        suggestReplay.set(this, seconds * 1000);
    }

    /**
     * @param {Message} Message Discord message
     * @param {string} String prefix
     * @param {playerLang} PlayerLang object
     * @returns {boolean} It's going to return true if command is valid.
     */
    onMessagePrefix(message: Message, prefix: string, playerLang?: PlayerLanguage): boolean {
        if (!prefix) throw new Error('Prefix cannot be undefined');
        if (typeof prefix !== 'string') throw new Error('Prefix must be string');
        return this.onMessage(message, message.cleanContent.slice(prefix.length).trim(), prefix, playerLang);
    }

    /**
     * Destroys player and makes entire class useless
     * If no call back if provided it going to return Promise;
     * @param {function} callback call function
     */
    async destroy(callback?: () => void) {
        destroyed.set(this, true);
        if (!callback) {
            return new Promise(resolve => {
                this.destroy(() => {
                    resolve();
                });
            });
        }
        const client = discordClient.get(this);
        if (!client) return callback();
        const theGuildData = guildPlayer.get(this)!;
        const keys = Object.keys(theGuildData);
        for (const key of keys) {
            const guild = client.guilds.find(g => g.id === key);
            if (!guild) break;
            const guildPlayer = getGuildPlayer(this, guild);
            const lang = guildPlayer ? guildPlayer.language : playerLanguage.get(this)!;
            await destroyGuildPlayer(this, guild, lang, true);
        }
        callback();
    }

    /**
     * @param {Message} Message Discord message
     * @param {string} String Discord message without prefix
     * @param {string} String Optional just for help command
     * @returns {boolean} It's going to return true if command is valid.
     */
    onMessage(message: Message, messageContentWithOutPrefix: string, prefix?: string, playerLang?: PlayerLanguage): boolean {
        if (!message.guild || message.author.bot) return false;
        if (destroyed.get(this)) return false;
        stealAndSetClient(this, message.client);
        const userCoolDown = userCoolDownSet.get(this)!;
        if (prefix) playerLanguage.get(this)!.setPrefix(prefix);
        const guildPlayer = getGuildPlayer(this, message.guild);

        let lang: Language;

        if (playerLang) lang = new Language(playerLang);
        else if (guildPlayer) lang = guildPlayer.language;
        else lang = playerLanguage.get(this)!;

        const language = lang.getLang();
        const commands = language.commands;
        const channel = message.channel as TextChannel;
        const me = channel.permissionsFor(message.guild.me);
        if (!me) return false;

        if (!me.has('SEND_MESSAGES')) return false;
        let checker = messageContentWithOutPrefix.replace(/  /g, ' ');
        if (checker.indexOf(' ') === -1) return false;

        const selfDeleteT = selfDeleteTime.get(this);

        if (commendChecker(removeFistWord(checker), commands.help)) {
            playerHelp(this, message, lang);
            delUserMessage(this, message);
            return true;
        }
        if (guildPlayer && guildPlayer.playerMessage && guildPlayer.playerMessage.channel !== message.channel) {
            const channel = guildPlayer.playerMessage.channel as TextChannel;
            const permissions = channel.permissionsFor(message.member);
            if (permissions && !permissions.has('READ_MESSAGES'))
                errorInfo(message.channel as TextChannel, language.player.wrongChannelNoAccess.replace(/<CHANNEL>/, channel.toString()), language.error, selfDeleteT);
            else if (permissions && !permissions.has('SEND_MESSAGES'))
                errorInfo(message.channel as TextChannel, language.player.wrongChannelNoPermissions.replace(/<CHANNEL>/, channel.toString()), language.error, selfDeleteT);
            else errorInfo(message.channel as TextChannel, language.player.wrongChannel.replace(/<CHANNEL>/, channel.toString()), language.error, selfDeleteT);
            return true;
        }
        if (userCoolDown.has(message.author.id)) {
            errorInfo(message.channel as TextChannel, language.sendingMessageToQuickly.replace(/<TIME>/g, coolDown.get(this)!.toString()), language.error, selfDeleteT);
            return true;
        } else {
            userCoolDown.add(message.author.id);
            setTimeout(() => {
                userCoolDown.delete(message.author.id);
            }, coolDown.get(this)! * 1000);
        }

        if (commendChecker(checker, commands.playerCommands, false)) {
            playerHelp(this, message, lang);
            return true;
        }
        if (commendChecker(checker, commands.playerCommands)) {
            checker = removeFistWord(checker);
        } else return false;
        // just to throw object out of stack so we can return boolean value to the user
        setTimeout((): any => {

            const voiceChannel = message.member.voiceChannel;
            if (!voiceChannel) {
                errorInfo(message.channel as TextChannel, language.notInVoiceChannel, language.error, selfDeleteTime.get(this));
                return;
            } else if (!voiceChannel.joinable) {
                errorInfo(message.channel as TextChannel, language.cannotConnect, language.error, selfDeleteTime.get(this));
                return;
            }
            let executed = false;

            if (commendChecker(checker, commands.destroy)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                if (guildPlayer && guildPlayer.canExecute(message.member)) message.guild.voiceConnection.channel.leave();
                executed = true;
                return;
            } else if (commendChecker(checker, commands.search)) {
                delUserMessage(this, message);
                const spaceIndex = messageContentWithOutPrefix.indexOf(' ', 2);
                youtubeLuckSearch(this, message, messageContentWithOutPrefix.slice(spaceIndex).trim(), lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.url)) {
                const YTUrls = checker.match(youtubeTester);
                if (YTUrls) addYoutubeToQueue(this, message, YTUrls, undefined, lang);
                else errorInfo(message.channel as TextChannel, language.onlyYoutubeLinks, language.error, selfDeleteTime.get(this));
                executed = true;
            } else if (commendChecker(checker, commands.next)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandNextTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.previous)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandPreviousTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.pause)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandPauseOrReplyTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.resume)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandPauseOrReplyTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.replay)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandReplayTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.replay)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandReplayTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.loop)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                commandLoopTrack(this, message, lang);
                executed = true;
                return;
            } else if (commendChecker(checker, commands.playlist)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                playlistCommand(this, message, checker, commands, lang);
                executed = true;
                return;
            } else {
                if (autoQueryDetection.get(this)) {
                    const YTUrls = checker.match(youtubeTester);
                    const urls = checker.match(urlTester);
                    const playlistId = /[&?]list=([^&]+)/i.test(checker);
                    if (YTUrls && urls && playlistId && playlistParse.get(this)!) parsePlayList(this, message, urls[0], lang, true);
                    else if (YTUrls) addYoutubeToQueue(this, message, YTUrls, undefined, lang);
                    else if (checker.match(urlTester)) {
                        errorInfo(message.channel as TextChannel, language.error, language.onlyYoutubeLinks);
                    } else youtubeLuckSearch(this, message, checker, lang);
                } else errorInfo(message.channel as TextChannel, lang.incorrectUse(), language.error, selfDeleteT);
            }
            if (executed) delUserMessage(this, message);
        });
        return true;
    }
}
function delUserMessage(youtubePlayer: YoutubePlayer, message: Message) {
    const canDelete = deleteUserMessage.get(youtubePlayer)!;
    if (!canDelete) return;
    const channel = message.channel as TextChannel;
    const permissions = channel.permissionsFor(message.guild.me);
    if (permissions && permissions.has('MANAGE_MESSAGES'))
        message.delete().catch(err => { message.client.emit('error', err); });
}

function commendChecker(messageContent: string, aliases: string[], includes = true) {
    if (includes) messageContent = getFirstWord(messageContent);
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

function isSomethingPlaying(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const language = lang.getLang();
    const guildData = getGuildPlayer(youtubePlayer, message.guild);
    const selfDeleteT = selfDeleteTime.get(youtubePlayer);
    if (!guildData) {
        errorInfo(message.channel as TextChannel, language.player.nothingPlaying, language.error, selfDeleteT);
        return false;
    }
    return true;
}

function playlistCommand(youtubePlayer: YoutubePlayer, message: Message, checker: string, commands: Commands, lang: Language) {
    const args = checker.split(' ');
    const language = lang.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    const selfDelete = selfDeleteTime.get(youtubePlayer);
    const shouldBeNumber = parseInt(args[2]);
    if (!guildPlayer) return;

    if (commendChecker(args[1], commands.playlistCommands.parse)) {
        if (!playlistParse.get(youtubePlayer)!) {
            return errorInfo(message.channel as TextChannel, language.player.featureDisabled, language.error, selfDelete);
        }

        if (youtubeTester.test(checker)) {
            const playlistId = /[&?]list=([^&]+)/i.test(checker);
            const urls = checker.match(urlTester);
            if (playlistId && urls) return parsePlayList(youtubePlayer, message, urls[0], lang);
            else return errorInfo(message.channel as TextChannel, language.playlistNotFound, language.error, selfDelete);
        } else if (args[2]) {
            return errorInfo(message.channel as TextChannel, language.onlyYoutubeLinks, language.error, selfDelete);
        } else return errorInfo(message.channel as TextChannel, lang.incorrectUse(), language.error, selfDelete);

    } else if (commendChecker(args[1], commands.playlistCommands.remove)) {
        if (isNaN(shouldBeNumber)) {
            return errorInfo(message.channel as TextChannel, lang.incorrectUse(), language.error, selfDelete);
        } else {
            const item = guildPlayer.playlist.find(i => i.index === shouldBeNumber);
            if (item) {
                if ((item.message && item.message.author === message.author) || canExecute(youtubePlayer, message, lang)) {
                    guildPlayer.removeItemFromPlaylist(item);
                } else return errorInfo(message.channel as TextChannel, language.missingPermission, language.error, selfDelete);

            } else return errorInfo(message.channel as TextChannel, language.player.playlistUnableToFindItem, language.error, selfDelete);
        }
    } else if (commendChecker(args[1], commands.playlistCommands.force)) {
        if (canExecute(youtubePlayer, message, lang)) {
            if (isNaN(shouldBeNumber)) {
                return errorInfo(message.channel as TextChannel, lang.incorrectUse(), language.error, selfDelete);
            } else {
                let item = guildPlayer.playlist.find(i => i.index === shouldBeNumber);
                if (!item) item = guildPlayer.previous.find(i => i.index === shouldBeNumber);
                if (item) {
                    guildPlayer.setSong(item);
                    guildPlayer.nextTrack();
                    return info(message.channel as TextChannel, language.player.forceReplay, language.info, selfDeleteTime.get(youtubePlayer));
                } else return errorInfo(message.channel as TextChannel, language.player.playlistUnableToFindItem, language.error, selfDeleteTime.get(youtubePlayer));
            }
        } else return errorInfo(message.channel as TextChannel, language.missingPermission, language.error, selfDeleteTime.get(youtubePlayer));
    } else if (commendChecker(args[1], commands.playlistCommands.shuffle)) {
        if (canExecute(youtubePlayer, message, lang)) {
            if (guildPlayer.shuffle()) return info(message.channel as TextChannel, language.player.playlistShuffled, language.info, selfDeleteTime.get(youtubePlayer));
            else return errorInfo(message.channel as TextChannel, language.player.playlistNothingToShuffle, language.error, selfDeleteTime.get(youtubePlayer));
        }

    } else if (commendChecker(args[1], commands.playlistCommands.sort)) {
        if (canExecute(youtubePlayer, message, lang)) {
            if (guildPlayer.sort()) return info(message.channel as TextChannel, language.player.playlistSorted, language.info, selfDeleteTime.get(youtubePlayer));
            else return errorInfo(message.channel as TextChannel, language.player.playlistAlreadySorted, language.error, selfDeleteTime.get(youtubePlayer));
        }
    } else {
        return errorInfo(message.channel as TextChannel, lang.incorrectUse(), language.error);
    }
}

function stealAndSetClient(youtubePlayer: YoutubePlayer, client: Client) {
    if (!discordClient.get(youtubePlayer)) {
        discordClient.set(youtubePlayer, client);
        client.on('voiceStateUpdate', guildMember => {
            const voiceChannel = guildMember.guild.me.voiceChannel;
            if (!voiceChannel) {
                client.emit('debug', 'Bot has been disconnected from the voice channel');
                const guildPlayer = getGuildPlayer(youtubePlayer, guildMember.guild);
                const lang = guildPlayer ? guildPlayer.language : playerLanguage.get(youtubePlayer)!;

                destroyGuildPlayer(youtubePlayer, guildMember.guild, lang);
            } else {
                const theGuildPlayer = getGuildPlayer(youtubePlayer, guildMember.guild);
                if (!theGuildPlayer) return;
                const members = !!voiceChannel.members.filter(m => !m.user.bot).size;

                if (theGuildPlayer.timeOutPlayerLeaveAllMemberLeft) {
                    clearTimeout(theGuildPlayer.timeOutPlayerLeaveAllMemberLeft);
                    theGuildPlayer.timeOutPlayerLeaveAllMemberLeft = undefined;
                }
                if (!members) {
                    theGuildPlayer.timeOutPlayerLeaveAllMemberLeft = setTimeout(() => {
                        guildMember.guild.voiceConnection.channel.leave();
                    }, leaveVoiceChannelAfterAllMembersLeft.get(youtubePlayer)!);
                }

            }
        });
        const emojiWatcher = async (theGuildPlayer: GuildPlayer, guildMembers: GuildMember[], messageReaction: MessageReaction, message: Message) => {
            switch (messageReaction.emoji.name) {
                case '⏸️':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePauseResume'))
                        recreateOrRecreatePlayerButtons(theGuildPlayer, suggestReplay.get(youtubePlayer)!);
                    return;
                case '▶️':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePauseResume'))
                        recreateOrRecreatePlayerButtons(theGuildPlayer, suggestReplay.get(youtubePlayer)!);
                    return;
                case '⏮️':
                    return theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePrevious');
                case '⏭️':
                    return theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'voteNext');
                case '🔁':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'voteReplay'))
                        recreateOrRecreatePlayerButtons(theGuildPlayer, suggestReplay.get(youtubePlayer)!);
                    return;
                case '🔂':
                    return theGuildPlayer.setVote(guildMembers, 'voteLoop');
                case '❎':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.canExecute(guildMembers)) message.guild.voiceConnection.channel.leave();
                    else theGuildPlayer.removeFromPlayListByMessage(message);
                    break;
                // case '🔀':
                //     if (theGuildPlayer.setVoteShuffle(guildMembers)) recreateOrRecreatePlayerButtons(theGuildPlayer);
                //     break;
                default:
                    break;
            }
        };

        const onMessageReactionAddOrRemove = (messageReaction: MessageReaction) => {
            const channel = messageReaction.message.channel as TextChannel;
            const guild = channel.guild;
            if (!reactionButtons.get(youtubePlayer)) return;
            if (client.user !== messageReaction.message.author) return;
            const theGuildPlayer = getGuildPlayer(youtubePlayer, guild);
            if (!theGuildPlayer) return;

            const guildMembers = theGuildPlayer.getFromVoiceAndMessageReactions(messageReaction);
            if (!guildMembers.length) return;

            emojiWatcher(theGuildPlayer, guildMembers, messageReaction, messageReaction.message);

        };

        client.on('messageReactionAdd', async messageReaction => {
            const channel = messageReaction.message.channel as TextChannel;
            const guild = channel.guild;
            if (!guild) return;
            const channelPermissions = channel.permissionsFor(guild.me)
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES')) {

                const theGuildPlayer = getGuildPlayer(youtubePlayer, messageReaction.message.guild);
                if (theGuildPlayer && theGuildPlayer.playerMessage) {
                    await removeUsersThatShouldNotReact(theGuildPlayer, messageReaction);
                    if (!['⏸️', '▶️', '⏮️', '⏭️', '🔁', '🔂', '❎'].includes(messageReaction.emoji.name)) {
                        for (const user of messageReaction.users.map(u => u)) {
                            try {
                                messageReaction.remove(user);
                            } catch (_) {
                                break;
                            }
                        }
                    }
                }
                onMessageReactionAddOrRemove(messageReaction);
            }
        });

        client.on('messageReactionRemove', messageReaction => {
            const channel = messageReaction.message.channel as TextChannel;
            const guild = channel.guild;
            if (!guild) return;
            const channelPermissions = channel.permissionsFor(guild.me);
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES'))
                onMessageReactionAddOrRemove(messageReaction);
        });

        client.on('messageDelete', message => {
            if (message.author !== client.user) return;
            if (!message.guild) return;
            const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
            if (!guildPlayer) return;

            if (guildPlayer.playerMessage === message) {
                guildPlayer.playerMessage = undefined;
                updatePlayer(youtubePlayer, message.guild, guildPlayer.language);
                return;
            }

            const suggestReplayNumber = suggestReplay.get(youtubePlayer)!;
            if (guildPlayer.removeFromPlayListByMessage(message, true) && guildPlayer.length < 2)
                recreateOrRecreatePlayerButtons(guildPlayer, suggestReplayNumber);

        });

        client.on('guildDelete', guild => {
            const guildPlayer = getGuildPlayer(youtubePlayer, guild);
            const lang = guildPlayer ? guildPlayer.language : playerLanguage.get(youtubePlayer)!;
            destroyGuildPlayer(youtubePlayer, guild, lang);
        });

        client.on('channelDelete', channel => {
            const guildData = guildPlayer.get(youtubePlayer)!;
            for (const k of Object.entries(guildData)) {
                if (k[1].playerChannel === channel) {
                    k[1].playerChannel.guild.voiceConnection.channel.leave();
                    return;
                }
            }
        });
        client.on('channelUpdate', channel => {
            const guildData = guildPlayer.get(youtubePlayer)!;
            for (const k of Object.entries(guildData)) {
                if (k[1].playerChannel === channel) {
                    const me = k[1].playerChannel.guild.me;
                    const permissions = k[1].playerChannel.memberPermissions(me);
                    if (permissions && !permissions.has('SEND_MESSAGES')) {
                        k[1].playerChannel.guild.voiceConnection.channel.leave();
                        return;
                    }
                }
            }
        });

        client.on('message', msg => {
            if (msg.author === msg.client.user) return;
            if (!hardDeleteUserMessage.get(youtubePlayer)) return;
            const player = getGuildPlayer(youtubePlayer, msg.guild);
            if (!!player && player.playerChannel === msg.channel) {
                msg.delete().catch(err => { msg.client.emit('error', err); });
            }
        });

    }
}

function removeUsersThatShouldNotReact(guildPlayer: GuildPlayer, messageReaction: MessageReaction): Promise<void> {
    return new Promise(async (resolve) => {
        const guildMembers = guildPlayer.getFromVoiceAndMessageReactions(messageReaction);
        const messageGuildMembersReaction = guildPlayer.getGuildMembersFromReactions(messageReaction);
        const membersThatShouldNotReact = messageGuildMembersReaction.filter(g => !guildMembers.includes(g));
        for (const member of membersThatShouldNotReact) {
            try {
                await messageReaction.remove(member);
            } catch (err) {
                messageReaction.message.client.emit('error', err);
                resolve();
                return;
            }
        }
        resolve();
    });
}

async function addYoutubeToQueue(youtubePlayer: YoutubePlayer, message: Message, urls: RegExpMatchArray | string[], playlist = '', lang: Language) {
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = lang.getLang();
    if (isPlaylistFull(message, youtubePlayer, lang)) return;

    if (!multipleParser.get(youtubePlayer)!) urls.length = 1;

    const playlistProgress = (index: number) => {
        return language.player.parsingPlaylist.replace(/<URL>/g, `\n<${playlist}>`) + ` ${index}/${urls.length}`;
    };

    const msgForInfoMsg = playlist ? playlistProgress(0) : language.player.searching.replace(/<URL>/g, `\n<${urls.join('>\n <')}>`);
    const infoMessage = await info(message.channel as TextChannel, msgForInfoMsg, language.info)
        .catch(error => message.client.emit('error', error));

    for (let i = 0; i < urls.length; i++) {
        const youtubeClass = youtube.get(youtubePlayer)!;
        if ((isPlaylistFull(message, youtubePlayer, lang))) {
            await deletePlayerMessage(player);
            updatePlayer(youtubePlayer, message.guild, lang);
            break;
        }
        const title = player.isAlreadyOnPlaylistByUrl(urls[i]);

        if (title) {
            if (player.currentPlayListItem && player.currentPlayListItem.videoInfo.title === title)
                await errorInfo(message.channel as TextChannel, `${message.author} ${language.isCurrentlyPlaying}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            else
                await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            await deletePlayerMessage(player);
            updatePlayer(youtubePlayer, message.guild, lang);
            break;
        }

        try {
            const options = usePatch.get(youtubePlayer) ? patch : {};
            const videoInfo = await getYTInfo(urls[i]);
            const maxTLength = maxTrackLength.get(youtubePlayer)!;
            if (parseInt(videoInfo.length_seconds) / 60 > maxTLength) {
                await errorInfo(message.channel as TextChannel, ` ${message.author} ${language.toLongTrack.replace(/<TRACKURL>/g, `<${videoInfo.video_url}>`).replace(/<MAXLENGTH>/g, maxTrackLength.toString())}`, language.error, selfDeleteTime.get(youtubePlayer));
                if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
                await deletePlayerMessage(player);
                updatePlayer(youtubePlayer, message.guild, lang);
                break;
            }
            const playlistItem: PlaylistItem = {
                videoInfo,
                steamOptions: options,
                stream: await getStream(videoInfo, options),
                videoData: youtubeClass ? await youtubeClass.getVideoInfo(urls[i]) : undefined,
                submitted: new Date(Date.now()),
                submitter: message.member,
            };
            if (playlist && infoMessage && typeof infoMessage !== 'boolean') {
                const m = Array.isArray(infoMessage) ? infoMessage[0] : infoMessage;
                const embed = Embeds.infoEmbed(playlistProgress(i));
                if (canEmbed(message.channel as TextChannel)) m.edit(embed)
                    .catch(error => message.client.emit('error', error));
                else m.edit(stringifyRichEmbed(embed, message.guild))
                    .catch(error => message.client.emit('error', error));
            }
            if (player.push(playlistItem)) {
                await startPlayer(youtubePlayer, message, lang);
                if (i === urls.length - 1) await sendQueueVideoInfo(youtubePlayer, message, playlistItem, lang, false, true);
                else await sendQueueVideoInfo(youtubePlayer, message, playlistItem, lang, false, false);
            }

            if (i !== urls.length - 1) await wait(playlistParseWait.get(youtubePlayer)!);
        } catch (error) {
            errorInfo(message.channel as TextChannel, error.toString(), language.error, selfDeleteTime.get(youtubePlayer));
            break;
        }
    }

    if (infoMessage && infoMessage !== true) {
        deleteManyMessage(infoMessage);
    }
}

async function youtubeLuckSearch(youtubePlayer: YoutubePlayer, message: Message, query: string, lang: Language) {
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = lang.getLang();
    const youtubeClass = youtube.get(youtubePlayer)!;
    if (isPlaylistFull(message, youtubePlayer, lang)) return;
    let url = '';
    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/<URL>/g, `\`${query}\``), language.info)
        .catch(error => message.client.emit('error', error));

    let playlistItem: PlaylistItem;
    try {
        const result = youtubeClass ? await youtubeClass.searchOnLuck(query) : await searchYTVideo(query);
        const lengthSeconds = typeof result.length_seconds === 'string' ? parseInt(result.length_seconds) : result.length_seconds;
        url = `${result.video_url} `;
        const maxTrackLengthMinutes = maxTrackLength.get(youtubePlayer)!;
        if (lengthSeconds > maxTrackLengthMinutes * 60) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.toLongTrack.replace(/<TRACK_URL>/g, `${result.video_url}`).replace(/<MAX_LENGTH>/g, maxTrackLengthMinutes.toString())}`, language.error, selfDeleteTime.get(youtubePlayer));
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            await deletePlayerMessage(player);
            updatePlayer(youtubePlayer, message.guild, lang);
            return;
        }

        const title = player.isAlreadyOnPlaylistById(result.video_id);
        if (title) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
            await deletePlayerMessage(player);
            updatePlayer(youtubePlayer, message.guild, lang);
            return;
        }

        const options = usePatch.get(youtubePlayer) ? patch : {};

        const videoInfo = youtubeClass ? await getYTInfo(result!.video_url) : result as ytdl.videoInfo;
        playlistItem = {
            videoInfo,
            steamOptions: options,
            stream: await getStream(videoInfo, options),
            videoData: youtubeClass ? result as VideoInfo : undefined,
            submitted: new Date(Date.now()),
            submitter: message.member,
        };
        if (!player.push(playlistItem)) {
            errorInfo(message.channel as TextChannel, `Unable to add to playlist`, language.error, selfDeleteTime.get(youtubePlayer));
            return;
        }
    } catch (error) {
        errorInfo(message.channel as TextChannel, `${url}${language.foundVideoUnavailable}`, language.error, selfDeleteTime.get(youtubePlayer));
        message.client.emit('error', error);
        return;
    }

    if (infoMessage !== false && infoMessage !== true) deleteManyMessage(infoMessage);
    await startPlayer(youtubePlayer, message, lang);
    sendQueueVideoInfo(youtubePlayer, message, playlistItem, lang, true);
}

async function parsePlayList(youtubePlayer: YoutubePlayer, message: Message, playlistUrl: string, lang: Language, failsafe = false) {
    const language = lang.getLang();
    if (isPlaylistFull(message, youtubePlayer, lang)) return;

    try {
        const playlist = await parsePlaylist(playlistUrl) as any;
        const urls = playlist.items.map((i: any) => i.url_simple);

        if (urls.length) addYoutubeToQueue(youtubePlayer, message, urls, playlistUrl, lang);
        else throw new Error('playlist not found');
    } catch (error) {
        const url = playlistUrl.match(youtubeTester);
        if (failsafe && url) addYoutubeToQueue(youtubePlayer, message, url, undefined, lang);
        else {
            errorInfo(message.channel as TextChannel, `${language.playListParseFail}`, language.error, selfDeleteTime.get(youtubePlayer));
        }
        message.client.emit('error', error);
        return;
    }
}

function isPlaylistFull(message: Message, youtubePlayer: YoutubePlayer, lang: Language, exceeded = false): boolean {
    const language = lang.getLang();
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    if (player.length > maxItemsInPlayList.get(youtubePlayer)! - 1) {
        errorInfo(message.channel as TextChannel, language.player.playlistFull, language.error, selfDeleteTime.get(youtubePlayer));
        return true;
    }
    if (player.howManySongsDoesMemberHaveInPlaylist(message.member) > maxUserItemsInPlayList.get(youtubePlayer)! - 1) {
        const toManyUserSongs = exceeded ? language.player.toManyUserTracksLimitExceeded : language.player.toManyUserTracks;
        errorInfo(message.channel as TextChannel, toManyUserSongs, language.error, selfDeleteTime.get(youtubePlayer));
        return true;
    }
    return false;
}

async function playerHelp(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const embed = new RichEmbed();
    embed.addField(lang.getLang().player.helpCommand, lang.help().join('\n'));
    embed.setColor('GREEN');
    let channel = message.channel;
    if (player) {
        try {
            channel = await message.author.createDM();
        } catch (_) {/*ignore */ }
    }
    if (channel.type === 'dm' || canEmbed(message.channel as TextChannel)) {
        channel.send(embed).catch(error => message.client.emit('error', error));
    } else channel.send(stringifyRichEmbed(embed, message.guild)).catch(error => message.client.emit('error', error));
}

function getOrSetGuildPlayer(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const guildData = guildPlayer.get(youtubePlayer)!;
    if (!guildData[message.guild.id]) {
        guildData[message.guild.id] = new GuildPlayer(message.guild, lang, votePercentage.get(youtubePlayer)!, message.channel as TextChannel)
            .on('update', () => {
                updatePlayer(youtubePlayer, message.guild, lang);
            })
            .on('start', () => {
                if (message.guild.me && message.guild.me.voiceChannel && message.guild.me.voiceChannel.connection)
                    playerLoop(youtubePlayer, message.guild.me.voiceChannel.connection, lang);
            });
        guildData[message.guild.id].updateRate(playerUpdateRate.get(youtubePlayer)!);
        guildData[message.guild.id].buttons = (reactionButtons.get(youtubePlayer)!);
    }
    return guildData[message.guild.id];
}

function getGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild): GuildPlayer | undefined {
    const guildData = guildPlayer.get(youtubePlayer)!;
    return guildData[guild.id];
}

async function sendQueueVideoInfo(youtubePlayer: YoutubePlayer, message: Message, playlistItem: PlaylistItem, lang: Language, search = false, update = true) {
    const guildPlayer = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = lang.getLang();
    const embed = new RichEmbed();
    addBasicInfo(youtubePlayer, embed, playlistItem, message.guild);
    const description = search ? `${language.videoAdded} ${playlistItem.submitter} ${language.luckSearch}` : `${language.videoAdded} ${playlistItem.submitter}`;
    if (embed.description) embed.setDescription(`${embed.description}\n${description}`);
    else embed.setDescription(description);
    embed.addField(language.video.duration, getYoutubeTime(parseInt(playlistItem.videoInfo.length_seconds) * 1000));
    const index = playlistItem.index!;
    embed.setFooter(language.player.id.replace(/<ID>/g, index.toString()));
    if (canEmbed(message.channel as TextChannel)) {
        message.channel.send(embed)
            .then(msg => {
                const m = Array.isArray(msg) ? msg[0] : msg;
                playlistItem.message = m;
                if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0) {
                    m.react('❎');
                }
            })
            .catch(error => message.client.emit('error', error));
    } else {
        message.channel.send(stringifyRichEmbed(embed, message.guild))
            .then(msg => {
                const m = Array.isArray(msg) ? msg[0] : msg;
                playlistItem.message = m;
                if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0) {
                    m.react('❎');
                }
            })
            .catch(error => message.client.emit('error', error));
    }
    if (update) {
        await deletePlayerMessage(guildPlayer);
        updatePlayer(youtubePlayer, message.guild, lang);
    }
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

async function startPlayer(youtubePlayer: YoutubePlayer, message: Message, lang: Language): Promise<VoiceConnection> {
    return new Promise(async (resolve, reject) => {
        const language = lang.getLang();
        const guildPlayer = getOrSetGuildPlayer(youtubePlayer, message, lang);

        if (guildPlayer.timeOutPlayerLeave) {
            clearTimeout(guildPlayer.timeOutPlayerLeave);
            guildPlayer.timeOutPlayerLeave = undefined;
            message.client.emit('debug', `[Youtube Player] [Status] resumed ${message.guild.id}`);
        }

        let connection: VoiceConnection;
        if (message.guild.me.voiceChannel && message.guild.me.voiceChannel.connection) {
            connection = message.guild.me.voiceChannel.connection;
        } else {
            try {
                connection = await message.member.voiceChannel.join();
                guildPlayer.setTextChannel(message.channel as TextChannel);
                info(message.channel as TextChannel, language.player.created, language.info);
                message.client.emit('debug', `[Youtube Player] [Status] Player has resumed in guild ${message.guild.id}`);
                playerLoop(youtubePlayer, connection, lang);
            } catch (error) {
                message.client.emit('error', error);
                errorInfo(message.channel as TextChannel, language.cannotConnect, language.error, selfDeleteTime.get(youtubePlayer));
                destroyGuildPlayer(youtubePlayer, message.guild, lang);
                reject(new Error(error));
                return;
            }
        }
        resolve(connection);
    });
}

function playerLoop(youtubePlayer: YoutubePlayer, connection: VoiceConnection, lang: Language) {
    const guildPlayer = getGuildPlayer(youtubePlayer, connection.channel.guild);
    if (!guildPlayer) return;
    if (!guildPlayer.switchToNextTrack()) {
        guildPlayer.suspend();
        if (guildPlayer.playerMessage)
            guildPlayer.playerMessage.clearReactions().catch(err => connection.client.emit('error', err));
        guildPlayer.timeOutPlayerLeave = setTimeout(() => {
            connection.channel.leave();
        }, leaveVoiceChannelAfter.get(youtubePlayer)!);
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
            const suggestReplayNumber = suggestReplay.get(youtubePlayer)!;
            recreateOrRecreatePlayerButtons(guildPlayer, suggestReplayNumber);
            playerLoop(youtubePlayer, connection, lang);
        }, waitTimeBetweenTracks.get(youtubePlayer));
    });
    dispatcher.on('debug', info => {
        connection.client.emit('debug', `[Dispatcher] [debug] ${info}`);
    });
    dispatcher.on('start', () => {
        connection.client.emit('debug', `[Youtube Player] [Status] Track started in guild ${connection.channel.guild.id}`);
        guildPlayer.setStartTime();
        updatePlayer(youtubePlayer, connection.channel.guild, lang);
    });
    dispatcher.on('error', e => {
        connection.client.emit('debug', `[Youtube Player] [Status] Track Error in guild ${connection.channel.guild.id} ${e}`);
        connection.client.emit('error', e);
    });
}

async function updatePlayer(youtubePlayer: YoutubePlayer, guild: Guild, lang: Language) {
    const language = lang.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, guild);
    if (!guildPlayer) return;
    const textChannel = guildPlayer.getTextChannel();
    const voice = guild.me.voiceChannel;
    const currentSong = guildPlayer.currentPlayListItem;
    const startSongTime = guildPlayer.getSongProgressionTime();
    if (!textChannel || !startSongTime || !currentSong || !voice) return;

    let progress = '';
    const videoTimestamp = parseInt(currentSong.videoInfo.length_seconds) * 1000;
    if (startSongTime.getTime() < videoTimestamp) progress = `${getYoutubeTime(startSongTime.getTime())} / ${getYoutubeTime(videoTimestamp)}`;
    else progress = `${getYoutubeTime(videoTimestamp)} / ${getYoutubeTime(videoTimestamp)}`;

    const embed = new RichEmbed();
    addBasicInfo(youtubePlayer, embed, currentSong, guild);
    if (!embed.description) embed.setDescription(`\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
    else embed.setDescription(`${embed.description}\n\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
    embed.setColor(guildPlayer.color as ColorResolvable);
    embed.addField(language.video.progress, progress, true);
    const voteNext = guildPlayer.voteNextStatus;
    const votePrevious = guildPlayer.votePreviousStatus;
    const voteReplay = guildPlayer.voteReplayStatus;
    const votePauseResume = guildPlayer.votePauseResumeStatus;
    const voteLoopStatus = guildPlayer.voteLoopStatus;
    const voteReplayStatus = guildPlayer.voteReplayStatus;
    if (voteNext || votePrevious || voteReplay || votePauseResume || voteLoopStatus || voteReplayStatus) {
        const vote: string[] = [];
        if (voteNext) vote.push(`${language.player.vote.next} ${voteNext}`);
        if (voteReplay) vote.push(`${language.player.vote.replay} ${voteReplay}`);
        if (votePrevious) vote.push(`${language.player.vote.previous} ${votePrevious}`);
        if (votePauseResume) vote.push(`${language.player.vote.pauseResume} ${votePauseResume}`);
        if (voteLoopStatus) vote.push(`${language.player.vote.loop} ${voteLoopStatus}`);
        if (voteReplayStatus) vote.push(`${language.player.vote.replay} ${voteReplayStatus}`);
        embed.addField(language.player.vote.vote, vote.join('\n'));
    }
    const index = currentSong.index!;
    const loadedTracks = guildPlayer.length > 0 ? ` | ${language.player.loadedTracks.replace(/<NUMBER>/g, guildPlayer.length.toString())}` : '';
    const trackInfo = `| ${language.player.id.replace(/<ID>/g, index.toString())}${loadedTracks}`;

    if (guildPlayer.isPaused)
        embed.setFooter(language.player.statusPaused, youtubeLogo);
    else {
        if (guildPlayer.isLooping) embed.setFooter(`${language.player.statusPlaying} 🔂 ${trackInfo}`, youtubeLogo);
        else if (guildPlayer.isGoingToReplay) embed.setFooter(`${language.player.statusPlaying} 🔁 ${trackInfo}`, youtubeLogo);
        else embed.setFooter(`${language.player.statusPlaying} ${trackInfo}`, youtubeLogo);
    }
    embed.setThumbnail('');
    if (!guildPlayer.playerMessage) {
        if (!guildPlayer.waitForUpdate) {
            guildPlayer.waitForUpdate = true;
            if (textChannel && canEmbed(textChannel)) {
                textChannel.send(embed)
                    .then(msg => {
                        const m = Array.isArray(msg) ? msg[0] : msg;
                        guildPlayer.playerMessage = m;
                        const suggestReplayNumber = suggestReplay.get(youtubePlayer)!;
                        recreateOrRecreatePlayerButtons(guildPlayer, suggestReplayNumber);
                    })
                    .catch(e => guild.client.emit('error', e))
                    .finally(() => {
                        guildPlayer.waitForUpdate = false;
                    });
            } else if (textChannel) {
                textChannel.send(stringifyRichEmbed(embed, guild))
                    .then(msg => {
                        const m = Array.isArray(msg) ? msg[0] : msg;
                        guildPlayer.playerMessage = m;
                        const suggestReplayNumber = suggestReplay.get(youtubePlayer)!;
                        recreateOrRecreatePlayerButtons(guildPlayer, suggestReplayNumber);
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
        guildPlayer.playerMessage.edit(stringifyRichEmbed(embed, guild))
            .catch(e => guild.client.emit('error', e));
    }

    if (!guildPlayer.isGoingToReplay && guildPlayer.playerMessage && reactionButtons.get(youtubePlayer) && videoTimestamp - startSongTime.getTime() < suggestReplay.get(youtubePlayer)!) {
        const message = guildPlayer.playerMessage;
        if (message) {
            const channel = message.channel as TextChannel;
            const channelPermissions = channel.permissionsFor(channel.guild.me);
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES'))
                message.react('🔁').catch(error => guild.client.emit('error', error));
        }
    }
}

async function recreateOrRecreatePlayerButtons(guildPlayer: GuildPlayer, suggestReplay: number) {
    const message = guildPlayer.playerMessage;
    if (!message) return;
    const currentPlaying = guildPlayer.currentPlayListItem;
    const videoTimestamp = currentPlaying ? parseInt(currentPlaying.videoInfo.length_seconds) * 1000 : -1;
    const startSongTime = guildPlayer.getSongProgressionTime();
    const channel = message.channel as TextChannel;
    const channelPermissions = channel.permissionsFor(channel.guild.me);
    if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES')) {
        if (channelPermissions.has('MANAGE_MESSAGES'))
            await message.clearReactions().catch(error => message.client.emit('error', error));
        else deletePlayerMessage(guildPlayer);

        if (guildPlayer.previous.length > 1)
            await message.react('⏮️').catch(error => message.client.emit('error', error));
        if (guildPlayer.isPaused) await message.react('▶️').catch(error => message.client.emit('error', error));
        else await message.react('⏸️').catch(error => message.client.emit('error', error));
        if (guildPlayer.playlist.length !== 0)
            await message.react('⏭️').catch(error => message.client.emit('error', error));
        if (guildPlayer.loop)
            await message.react('🔂').catch(error => message.client.emit('error', error));
        if (!guildPlayer.isGoingToReplay && startSongTime && videoTimestamp - startSongTime.getTime() < suggestReplay)
            await message.react('🔁').catch(error => message.client.emit('error', error));
        // message.react('🔀').catch(error => message.client.emit('error', error));
    }
}

async function destroyGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild, lang: Language, unexpected = false): Promise<void> {
    return new Promise(async resolve => {
        const theGuildData = guildPlayer.get(youtubePlayer)!;
        if (!theGuildData[guild.id]) {
            resolve();
            return;
        }
        const theGuildPlayer = theGuildData[guild.id];
        delete theGuildData[guild.id];
        if (guild.voiceConnection && guild.voiceConnection.channel) {
            await guild.voiceConnection.channel.leave();
        }

        if (theGuildPlayer.timeOutPlayerLeaveAllMemberLeft) {
            clearTimeout(theGuildPlayer.timeOutPlayerLeaveAllMemberLeft);
            theGuildPlayer.timeOutPlayerLeaveAllMemberLeft = undefined;
        }

        if (theGuildPlayer.timeOutPlayerLeave) {
            clearTimeout(theGuildPlayer.timeOutPlayerLeave);
            theGuildPlayer.timeOutPlayerLeave = undefined;
        }

        const playListMessages = theGuildPlayer.playlist.filter(i => i.message);
        const playerMessage = theGuildPlayer.playerMessage;
        await theGuildPlayer.destroy();
        if (playerMessage) await playerMessage.delete().catch(error => guild.client.emit('error', error));
        if (!unexpected && theGuildPlayer.fullDestroy) theGuildPlayer.fullDestroy();
        const language = lang.getLang();

        const textChannel = theGuildPlayer.getTextChannel();
        if (guild.me.voiceChannel && guild.me.voiceChannel.connection) await guild.me.voiceChannel.connection.disconnect();
        if (textChannel) await info(textChannel as TextChannel, unexpected ? language.player.destroyUnexpected : language.player.destroy, language.info);
        for (const playListMessage of playListMessages) {
            guild.client.emit('debug', `[Youtube Player] [destroy] Removing reaction on message`);
            if (playListMessage.message)
                await playListMessage.message.clearReactions().catch(error => guild.client.emit('error', error));
        }
        guild.client.emit('debug', `[Youtube Player] [Status] Player destroyed in guild ${guild.id}`);
        resolve();

    });
}

function commandNextTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const language = lang.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    if (!guildPlayer.length) {
        errorInfo(message.channel as TextChannel, language.player.vote.emptyPlaylist, language.error, selfDeleteTime.get(youtubePlayer));
    } else {
        sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteNext'), lang);
    }
}

function commandPauseOrReplyTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'votePauseResume'), lang);
}

function commandPreviousTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const language = lang.getLang();
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    if (!guildPlayer.previous.length) {
        errorInfo(message.channel as TextChannel, language.player.vote.noPreviousTrack, language.error, selfDeleteTime.get(youtubePlayer));
    } else {
        sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'votePrevious'), lang);
    }
}

function commandLoopTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteLoop'), lang);
}

function commandReplayTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteReplay'), lang);
}

async function sendVoteInfo(youtubePlayer: YoutubePlayer, message: Message, status: VoteInfo, lang: Language) {
    const language = lang.getLang();
    switch (status) {
        case VoteInfo.NO_PERMISSION:
            await errorInfo(message.channel as TextChannel, language.player.vote.notAllowed, language.error, selfDeleteTime.get(youtubePlayer));
            break;
        case VoteInfo.ALREADY_VOTE:
            await errorInfo(message.channel as TextChannel, language.player.vote.alreadyVoted, language.error, selfDeleteTime.get(youtubePlayer));
            break;
        case VoteInfo.VOTE_EXECUTED:
            // await errorInfo(message.channel as TextChannel, language.player.vote.alreadyVoted, selfDeleteTime.get(this));
            break;
        case VoteInfo.VOTE_SUCCESSFUL:
            await errorInfo(message.channel as TextChannel, language.player.vote.voteSuccessful, language.error, selfDeleteTime.get(youtubePlayer));
            break;
        default:
            break;
    }
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (guildPlayer) await deletePlayerMessage(guildPlayer);
    updatePlayer(youtubePlayer, message.guild, lang);
}

function wait(time: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

function canExecute(youtubePlayer: YoutubePlayer, message: Message, lang: Language): boolean {
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return false;
    const language = lang.getLang();

    const usersInVC = message.guild.voiceConnection.channel.members.filter(m => !m.user.bot).size;
    if (usersInVC > 1 && !guildPlayer.canExecute(message.member)) {
        errorInfo(message.channel as TextChannel, language.missingPermission, language.error, selfDeleteTime.get(youtubePlayer));
        return false;
    }
    return true;
}

function deletePlayerMessage(guildPlayer: GuildPlayer): Promise<void> {
    return new Promise(async resolve => {
        if (guildPlayer.playerMessage && guildPlayer.playerMessage.deletable) {
            const client = guildPlayer.playerMessage.client;
            await guildPlayer.playerMessage.delete().catch(err => { client.emit('error', err); });
        }
        resolve();
    });
}
