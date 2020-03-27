import { Message, Guild, MessageEmbed, TextChannel, Client, VoiceConnection, GuildMember, MessageReaction, version } from 'discord.js';
import { canEmbed, errorInfo, info, addBasicInfo, Embeds, stringifyRichEmbed } from './messages';
import { Youtube } from './Youtube';
import { PlayerLanguage, GuildData, VideoInfo, Commands } from './interfaces';
import { Language, playerLanguage } from './language';
import { GuildPlayer, PlaylistItem, VoteInfo } from './GuildPlayer';
import { getYTInfo, getStream, searchYTVideo, parsePlaylist } from './yt-core-discord';
import ytdl = require('ytdl-core');

const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\\_]*)(&(amp;)?‌​[\w\\?‌​=]*)?/g);
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
const PLAYER_VERSION = '2.1.6 build';

export interface YoutubePlayerOptions {
    messageUpdateRate?: number;
    selfDeleteTime?: number;
    leaveVoiceChannelAfter?: number;
    leaveVoiceChannelAfterAllMembersLeft?: number;
    maxTrackLength?: number;
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
        if (!options) options = {};
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
        leaveVoiceChannelAfterAllMembersLeft.set(this, seconds * 1000);
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
            const guild = client.guilds.resolve(key);
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

        const args = messageContentWithOutPrefix.split(' ');
        if (!lang.lang.commands.playerCommands.includes(args[0].toLowerCase())) {
            return false;
        }

        const language = lang.getLang();
        const commands = language.commands;
        const channel = message.channel as TextChannel;
        if (!message.guild || !message.guild.me) return false;
        const me = channel.permissionsFor(message.guild.me);
        if (!me) return false;

        if (!me.has('SEND_MESSAGES')) return false;
        let checker = messageContentWithOutPrefix.replace(/ {2}/g, ' ');
        if (checker.indexOf(' ') === -1) return false;

        const selfDeleteT = selfDeleteTime.get(this);

        if (commendChecker(removeFistWord(checker), commands.help)) {
            playerHelp(this, message, lang);
            delUserMessage(this, message);
            return true;
        }
        if (commendChecker(removeFistWord(checker), commands.version)) {
            playerVersion(this, message);
            delUserMessage(this, message);
            return true;
        }
        if (guildPlayer && guildPlayer.playerMessage && message.member && guildPlayer.playerMessage.channel !== message.channel) {
            const channel = guildPlayer.playerMessage.channel as TextChannel;
            const permissions = channel.permissionsFor(message.member);
            if (permissions && !permissions.has('VIEW_CHANNEL'))
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
        if (commendChecker(checker, commands.version, false)) {
            playerVersion(this, message);
            return true;
        }
        if (commendChecker(checker, commands.playerCommands)) {
            checker = removeFistWord(checker);
        } else return false;
        // just to throw object out of stack so we can return boolean value to the user
        setTimeout((): any => {
            if (!message.member || !message.member.voice) return;
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel) {
                return errorInfo(message.channel as TextChannel, language.notInVoiceChannel, language.error, selfDeleteTime.get(this));
            } else if (!voiceChannel.joinable) {
                return errorInfo(message.channel as TextChannel, language.cannotConnect, language.error, selfDeleteTime.get(this));
            }
            let executed = false;

            if (commendChecker(checker, commands.destroy)) {
                if (!isSomethingPlaying(this, message, lang)) return;
                if (guildPlayer && message.guild && message.guild.voice && message.guild.voice.channel && guildPlayer.canExecute(message.member)) message.guild.voice.channel.leave();
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
    if (!message.guild || !message.guild.me) return;
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
    if (!message.guild) return;
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
    if (!message.guild) return;
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
            if (!guildMember.guild || !guildMember.guild.voice || !guildMember.guild.voice.channel) return;
            const voiceChannel = guildMember.guild.voice.channel;
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
                        if (guildMember.guild && guildMember.guild.voice && guildMember.guild.voice.connection && guildMember.guild.voice.connection.channel)
                            guildMember.guild.voice.connection.channel.leave();
                    }, leaveVoiceChannelAfterAllMembersLeft.get(youtubePlayer)!);
                }
            }
        });
        const emojiWatcher = async (theGuildPlayer: GuildPlayer, guildMembers: GuildMember[], messageReaction: MessageReaction, message: Message) => {
            switch (messageReaction.emoji.name) {
                case '⏸️':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePauseResume'))
                        theGuildPlayer.recreateOrRecreatePlayerButtons();
                    return;
                case '▶️':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePauseResume'))
                        theGuildPlayer.recreateOrRecreatePlayerButtons();
                    return;
                case '⏮️':
                    return theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'votePrevious');
                case '⏭️':
                    return theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'voteNext');
                case '🔁':
                    if (theGuildPlayer.playerMessage === message && theGuildPlayer.setVote(guildMembers, 'voteReplay'))
                        theGuildPlayer.recreateOrRecreatePlayerButtons();
                    return;
                case '🔂':
                    return theGuildPlayer.setVote(guildMembers, 'voteLoop');
                case '❎':
                    if (theGuildPlayer.playerMessage === message && message.guild && message.guild.voice && message.guild.voice.channel && theGuildPlayer.canExecute(guildMembers))
                        message.guild.voice.channel.leave();
                    else theGuildPlayer.removeFromPlayListByMessage(message);
                    break;
                // case '🔀':
                //     if (theGuildPlayer.setVoteShuffle(guildMembers)) recreateOrRecreatePlayerButtons(theGuildPlayer);
                //     break;
                default:
                    break;
            }
        };

        const onMessageReactionAddOrRemove = async (messageReaction: MessageReaction) => {
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
            if (!messageReaction.message.guild) return;

            const channel = messageReaction.message.channel as TextChannel;
            const guild = channel.guild;
            if (!guild || !guild.me) return;
            const channelPermissions = channel.permissionsFor(guild.me);
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES')) {
                const theGuildPlayer = getGuildPlayer(youtubePlayer, messageReaction.message.guild);
                if (theGuildPlayer) {
                    const pMsg = theGuildPlayer.playerMessage;
                    const playlistFiltered: PlaylistItem[] = theGuildPlayer.playlist.filter(p => p.message);
                    const msgs = playlistFiltered.map(u => u.message) as Message[];
                    const message = [...msgs, pMsg];
                    if (!message.includes(messageReaction.message)) return;
                }

                if (theGuildPlayer && theGuildPlayer.playerMessage) {

                    await removeUsersThatShouldNotReact(theGuildPlayer, messageReaction);
                    if (!['⏸️', '▶️', '⏮️', '⏭️', '🔁', '🔂', '❎'].includes(messageReaction.emoji.name)) {
                        const users = messageReaction.users.cache.map(u => u);
                        for (const user of users.map(u => u)) {
                            try {
                                messageReaction.users.remove(user);
                            } catch (_) {
                                break;
                            }
                        }
                    }
                }
                onMessageReactionAddOrRemove(messageReaction);
            }
        });

        client.on('messageReactionRemove', async messageReaction => {
            if (!messageReaction.message || !messageReaction.message.guild) return;
            const channel = messageReaction.message.channel as TextChannel;
            const guild = channel.guild;
            if (!guild || !guild.me) return;
            const theGuildPlayer = getGuildPlayer(youtubePlayer, messageReaction.message.guild);
            if (theGuildPlayer) {
                const pMsg = theGuildPlayer.playerMessage;
                const playlistFiltered: PlaylistItem[] = theGuildPlayer.playlist.filter(p => p.message);
                const msgs = playlistFiltered.map(u => u.message) as Message[];
                const message = [...msgs, pMsg];
                if (!message.includes(messageReaction.message)) return;
            }
            const channelPermissions = channel.permissionsFor(guild.me);
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES'))
                onMessageReactionAddOrRemove(messageReaction);
        });

        client.on('messageDelete', async message => {
            if (message.author !== client.user) return;
            if (!message.guild) return;
            const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
            if (!guildPlayer) return;

            if (guildPlayer.playerMessage === message) {
                guildPlayer.deletePlayerMessage();
                await guildPlayer.updatePlayer();
                return;
            }
            if (guildPlayer.removeFromPlayListByMessage(message as Message, true) && guildPlayer.length < 2)
                guildPlayer.recreateOrRecreatePlayerButtons();

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
                    const pc = k[1].playerChannel;
                    const voice = pc.guild.voice;
                    if (voice && voice.channel) voice.channel.leave();
                    return;
                }
            }
        });
        client.on('channelUpdate', channel => {
            const guildData = guildPlayer.get(youtubePlayer)!;
            for (const k of Object.entries(guildData)) {
                if (k[1].playerChannel === channel) {
                    const me = k[1].playerChannel.guild.me;
                    if (!me) continue;
                    const permissions = k[1].playerChannel.permissionsFor(me);
                    if (permissions && !permissions.has('SEND_MESSAGES')) {
                        const voice = k[1].playerChannel.guild.voice;
                        if (voice && voice.channel) voice.channel.leave();
                        return;
                    }
                }
            }
        });

        client.on('message', m => {
            const msg = m as Message;
            if (!msg.guild) return;
            if (msg.author === msg.client.user) return;
            if (!hardDeleteUserMessage.get(youtubePlayer)) return;
            const player = getGuildPlayer(youtubePlayer, msg.guild);
            if (!!player && player.playerChannel === msg.channel) {
                msg.delete().catch(err => { msg.client.emit('error', err); });
            }
        });

        client.on('voiceStateUpdate', voiceChannel => {
            if (!voiceChannel.guild.voice || !voiceChannel.guild.voice.channel) {
                const guildPlayer = getGuildPlayer(youtubePlayer, voiceChannel.guild);
                if (!guildPlayer) return;
                const language = playerLanguage.get(youtubePlayer)!;
                destroyGuildPlayer(youtubePlayer, voiceChannel.guild, language);
            }
        });
    }
}

async function removeUsersThatShouldNotReact(guildPlayer: GuildPlayer, messageReaction: MessageReaction) {
    const guildMembers = guildPlayer.getFromVoiceAndMessageReactions(messageReaction);
    const messageGuildMembersReaction = guildPlayer.getGuildMembersFromReactions(messageReaction);
    const membersThatShouldNotReact = messageGuildMembersReaction.filter(g => !guildMembers.includes(g));
    for (const member of membersThatShouldNotReact) {
        try {
            await messageReaction.users.remove(member);
        } catch (err) {
            messageReaction.message.client.emit('error', err);
        }
    }
}

async function addYoutubeToQueue(youtubePlayer: YoutubePlayer, message: Message, urls: RegExpMatchArray | string[], playlist = '', lang: Language) {
    if (!message.guild || !message.member) return;
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = lang.getLang();
    if (isPlaylistFull(message, youtubePlayer, lang)) return;
    if (!multipleParser.get(youtubePlayer)!) urls.length = 1;
    const playlistProgress = (index: number) => {
        return language.player.parsingPlaylist.replace(/<URL>/g, `\n<${playlist}>`) + ` ${index}/${urls.length}`;
    };

    const msgForInfoMsg = playlist ? playlistProgress(0) : language.player.searching.replace(/<URL>/g, `\n<${urls.join('>\n <')}>`);
    const infoMessage = await info(message.channel as TextChannel, msgForInfoMsg, language.info);

    for (let i = 0; i < urls.length; i++) {
        const youtubeClass = youtube.get(youtubePlayer)!;
        if ((isPlaylistFull(message, youtubePlayer, lang))) {
            player.deletePlayerMessage();
            await player.updatePlayer();
            break;
        }
        const title = player.isAlreadyOnPlaylistByUrl(urls[i]);

        if (title) {
            if (player.currentPlayListItem && player.currentPlayListItem.videoInfo.title === title)
                await errorInfo(message.channel as TextChannel, `${message.author} ${language.isCurrentlyPlaying}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            else
                await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            await infoMessage.delete().catch((e) => { infoMessage.client.emit('error', e); });
            player.deletePlayerMessage();
            await player.updatePlayer();
            break;
        }

        try {

            const videoInfo = await getYTInfo(urls[i]);
            const maxTLength = maxTrackLength.get(youtubePlayer)!;
            if (parseInt(videoInfo.length_seconds) / 60 > maxTLength) {
                await errorInfo(message.channel as TextChannel, ` ${message.author} ${language.toLongTrack.replace(/<TRACKURL>/g, `<${videoInfo.video_url}>`).replace(/<MAXLENGTH>/g, maxTrackLength.toString())}`, language.error, selfDeleteTime.get(youtubePlayer));
                await infoMessage.delete().catch((e) => { infoMessage.client.emit('error', e); });
                player.deletePlayerMessage();
                await player.updatePlayer();
                break;
            }
            const playlistItem: PlaylistItem = {
                videoInfo,
                stream: await getStream(videoInfo),
                videoData: youtubeClass ? await youtubeClass.getVideoInfo(urls[i]) : undefined,
                submitted: new Date(Date.now()),
                submitter: message.member,
            };
            if (playlist && infoMessage) {
                const m = Array.isArray(infoMessage) ? infoMessage[0] : infoMessage;
                const embed = Embeds.infoEmbed(playlistProgress(i));

                if (canEmbed(message.channel as TextChannel)) await m.edit(embed);
                else m.edit(await stringifyRichEmbed(embed, message.guild));
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
    if (infoMessage) infoMessage.delete().catch(() => {/* suppressed */ });


}

async function youtubeLuckSearch(youtubePlayer: YoutubePlayer, message: Message, query: string, lang: Language) {
    if (!message.member || !message.guild) return;
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = player.language.getLang();
    const youtubeAPI = youtube.get(youtubePlayer)!;
    if (isPlaylistFull(message, youtubePlayer, lang)) return;
    let url = '';
    const infoMessage = await info(message.channel as TextChannel, language.player.searching.replace(/<URL>/g, `\`${query}\``), language.info);

    let playlistItem: PlaylistItem;
    try {
        const result = youtubeAPI ? await youtubeAPI.searchOnLuck(query) : await searchYTVideo(query);
        const lengthSeconds = typeof result.length_seconds === 'string' ? parseInt(result.length_seconds) : result.length_seconds;
        url = `${result.video_url} `;
        const maxTrackLengthMinutes = maxTrackLength.get(youtubePlayer)!;


        if (lengthSeconds > maxTrackLengthMinutes * 60) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.toLongTrack.replace(/<TRACK_URL>/g, `${result.video_url}`).replace(/<MAX_LENGTH>/g, maxTrackLengthMinutes.toString())}`, language.error, selfDeleteTime.get(youtubePlayer));
            await infoMessage.delete().catch((e) => { infoMessage.client.emit('error', e); });
            player.deletePlayerMessage();
            await player.updatePlayer();
            return;
        }

        const title = player.isAlreadyOnPlaylistById(result.video_id);
        if (title) {
            await errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n${title}`, language.error, selfDeleteTime.get(youtubePlayer)!);
            await infoMessage.delete().catch((e) => { infoMessage.client.emit('error', e); });
            player.deletePlayerMessage();
            await player.updatePlayer();
            return;
        }

        const videoInfo = youtubeAPI ? await getYTInfo(result!.video_url) : result as ytdl.videoInfo;
        playlistItem = {
            videoInfo,
            stream: await getStream(videoInfo),
            videoData: youtubeAPI ? result as VideoInfo : undefined,
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
    infoMessage.delete().catch((e) => { infoMessage.client.emit('error', e); });
    await startPlayer(youtubePlayer, message, lang);
    await sendQueueVideoInfo(youtubePlayer, message, playlistItem, lang, true);

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
    }
}

function isPlaylistFull(message: Message, youtubePlayer: YoutubePlayer, lang: Language, exceeded = false): boolean {
    const language = lang.getLang();
    const player = getOrSetGuildPlayer(youtubePlayer, message, lang);
    if (!player) return false;
    if (player.length > maxItemsInPlayList.get(youtubePlayer)! - 1) {
        errorInfo(message.channel as TextChannel, language.player.playlistFull, language.error, selfDeleteTime.get(youtubePlayer));
        return true;
    }
    if (message.member && player.howManySongsDoesMemberHaveInPlaylist(message.member) > maxUserItemsInPlayList.get(youtubePlayer)! - 1) {
        const toManyUserSongs = exceeded ? language.player.toManyUserTracksLimitExceeded : language.player.toManyUserTracks;
        errorInfo(message.channel as TextChannel, toManyUserSongs, language.error, selfDeleteTime.get(youtubePlayer));
        return true;
    }
    return false;
}

async function playerHelp(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    if (!message.guild) return;
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const embed = new MessageEmbed();
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
    } else channel.send(await stringifyRichEmbed(embed, message.guild)).catch(error => message.client.emit('error', error));
}

async function playerVersion(youtubePlayer: YoutubePlayer, message: Message) {
    if (!message.guild) return;
    const player = getGuildPlayer(youtubePlayer, message.guild);
    const embed = new MessageEmbed();
    embed.addField('Version', `Player: ${PLAYER_VERSION} | Discord: ${version}`);
    embed.setColor('GREEN');
    let channel = message.channel;
    if (player) {
        try {
            channel = await message.author.createDM();
        } catch (_) {/*ignore */ }
    }
    if (channel.type === 'dm' || canEmbed(message.channel as TextChannel)) {
        channel.send(embed).catch(error => message.client.emit('error', error));
    } else channel.send(await stringifyRichEmbed(embed, message.guild)).catch(error => message.client.emit('error', error));
}

function getOrSetGuildPlayer(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    if (!message.guild) throw new Error('Guild player can only be crated in guild');
    const guildData = guildPlayer.get(youtubePlayer)!;
    if (!guildData[message.guild.id]) {
        guildData[message.guild.id] = new GuildPlayer(
            message.guild,
            youtubePlayer,
            playerUpdateRate.get(youtubePlayer)!,
            suggestReplay.get(youtubePlayer)!,
            reactionButtons.get(youtubePlayer)!,
            leaveVoiceChannelAfter.get(youtubePlayer)!,
            waitTimeBetweenTracks.get(youtubePlayer)!,
            lang,
            votePercentage.get(youtubePlayer)!,
            message.channel as TextChannel);
    }
    return guildData[message.guild.id];
}

function getGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild): GuildPlayer | undefined {
    const guildData = guildPlayer.get(youtubePlayer)!;
    return guildData[guild.id];
}

//FIXME: sends dual message every time
async function sendQueueVideoInfo(youtubePlayer: YoutubePlayer, message: Message, playlistItem: PlaylistItem, lang: Language, search = false, update = true) {
    const guild = message.guild as Guild;
    if (!guild.me) throw new Error('Bot is not in guild');
    const guildPlayer = getOrSetGuildPlayer(youtubePlayer, message, lang);
    const language = lang.getLang();
    const embed = new MessageEmbed();
    await addBasicInfo(youtubePlayer, embed, playlistItem, guild);
    const description = search ? `${language.videoAdded} <@${playlistItem.submitter.id}> ${language.luckSearch}` : `${language.videoAdded} <@${playlistItem.submitter.id}>`;
    if (embed.description) embed.setDescription(`${embed.description}\n${description}`);
    else embed.setDescription(description);
    embed.addField(language.video.duration, getYoutubeTime(parseInt(playlistItem.videoInfo.length_seconds) * 1000));
    const index = playlistItem.index!;
    embed.setFooter(language.player.id.replace(/<ID>/g, index.toString()));
    const channel = message.channel as TextChannel;
    let videoInfoMessage: Message;
    const permissions = channel.permissionsFor(guild.me);
    if (permissions && permissions.has('SEND_MESSAGES')) {
        if (canEmbed(message.channel as TextChannel)) {
            videoInfoMessage = await message.channel.send(embed);
            playlistItem.message = videoInfoMessage;
            if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0 && permissions.has('MANAGE_MESSAGES')) {
                await videoInfoMessage.react('❎');
            }
        } else {
            videoInfoMessage = await message.channel.send(await stringifyRichEmbed(embed, guild));
            playlistItem.message = videoInfoMessage;
            if (reactionButtons.get(youtubePlayer)! && guildPlayer.length !== 0 && permissions.has('MANAGE_MESSAGES')) {
                await videoInfoMessage.react('❎');
            }
        }
    }

    if (update && !!guildPlayer.playerMessage) {
        await guildPlayer.deletePlayerMessage();
        await guildPlayer.updatePlayer();
    }
}

export function getYoutubeTime(timestamp: number) {
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

async function startPlayer(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const guild = message.guild as Guild;
    const member = message.member as GuildMember;
    const language = lang.getLang();
    const guildPlayer = getOrSetGuildPlayer(youtubePlayer, message, lang);

    if (guildPlayer.timeOutPlayerLeave) {
        clearTimeout(guildPlayer.timeOutPlayerLeave);
        guildPlayer.timeOutPlayerLeave = undefined;
        message.client.emit('debug', `[Youtube Player] [Status] resumed ${guild.id}`);
    }

    let connection: VoiceConnection;
    if (guild.me && guild.me.voice.connection) {
        connection = guild.me.voice.connection;
    } else {
        try {
            if (!member.voice.channel) return;
            connection = await member.voice.channel.join();
            if (guild.me && guild.me.voice) guild.me.voice.setDeaf(true).catch(() => {
                if (guild && guild.me && guild.me.voice) guild.me.voice.setSelfDeaf(true).catch(() => {/* ignore */ });
            });

            guildPlayer.setTextChannel(message.channel as TextChannel);
            info(message.channel as TextChannel, language.player.created, language.info);
            message.client.emit('debug', `[Youtube Player] [Status] Player has resumed in guild ${guild.id}`);
            await guildPlayer.playerLoop();
        } catch (error) {
            message.client.emit('error', error);
            errorInfo(message.channel as TextChannel, language.cannotConnect, language.error, selfDeleteTime.get(youtubePlayer));
            destroyGuildPlayer(youtubePlayer, guild, lang);
            throw new Error(error);
        }
    }
    return connection;
}

async function destroyGuildPlayer(youtubePlayer: YoutubePlayer, guild: Guild, lang: Language, unexpected = false) {
    const theGuildData = guildPlayer.get(youtubePlayer)!;
    if (!theGuildData[guild.id]) {
        return;
    }
    const theGuildPlayer = theGuildData[guild.id];
    delete theGuildData[guild.id];
    if (guild.voice && guild.voice.channel) {
        await guild.voice.channel.leave();
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
    if (playerMessage) await theGuildPlayer.deletePlayerMessage();
    if (!unexpected && theGuildPlayer.fullDestroy) theGuildPlayer.fullDestroy();
    const language = lang.getLang();

    const textChannel = theGuildPlayer.getTextChannel();
    if (guild.me && guild.me.voice && guild.me.voice.connection) await guild.me.voice.connection.disconnect();
    if (textChannel) await info(textChannel as TextChannel, unexpected ? language.player.destroyUnexpected : language.player.destroy, language.info);
    for (const playListMessage of playListMessages) {
        guild.client.emit('debug', `[Youtube Player] [destroy] Removing reaction on message`);
        if (playListMessage.message)
            await playListMessage.message.reactions.removeAll().catch(error => guild.client.emit('error', error));
    }
    guild.client.emit('debug', `[Youtube Player] [Status] Player destroyed in guild ${guild.id}`);
}

function commandNextTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    const language = lang.getLang();
    if (!message.guild || !message.member) return;
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    if (!guildPlayer.length) {
        errorInfo(message.channel as TextChannel, language.player.vote.emptyPlaylist, language.error, selfDeleteTime.get(youtubePlayer));
    } else {
        sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteNext'), lang);
    }
}

function commandPauseOrReplyTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    if (!message.guild || !message.member) return;
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'votePauseResume'), lang);
}

function commandPreviousTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    if (!message.guild || !message.member) return;
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
    if (!message.guild || !message.member) return;
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteLoop'), lang);
}

function commandReplayTrack(youtubePlayer: YoutubePlayer, message: Message, lang: Language) {
    if (!message.guild || !message.member) return;
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return;
    sendVoteInfo(youtubePlayer, message, guildPlayer.addVote(message.member, 'voteReplay'), lang);
}

async function sendVoteInfo(youtubePlayer: YoutubePlayer, message: Message, status: VoteInfo, lang: Language) {
    if (!message.guild) return;
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
    if (guildPlayer) {
        guildPlayer.deletePlayerMessage();
        await guildPlayer.updatePlayer();
    }
}

function wait(time: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

function canExecute(youtubePlayer: YoutubePlayer, message: Message, lang: Language): boolean {
    if (!message.guild) return false;
    if (!message.guild.voice || !message.guild.voice.channel || !message.member) return false;
    const guildPlayer = getGuildPlayer(youtubePlayer, message.guild);
    if (!guildPlayer) return false;
    const language = lang.getLang();

    const usersInVC = message.guild.voice.channel.members.filter(m => !m.user.bot).size;
    if (usersInVC > 1 && !guildPlayer.canExecute(message.member)) {
        errorInfo(message.channel as TextChannel, language.missingPermission, language.error, selfDeleteTime.get(youtubePlayer));
        return false;
    }
    return true;
}


function sleep(time: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}