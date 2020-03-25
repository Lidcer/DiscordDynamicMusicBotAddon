import { VideoInfo } from './interfaces';
import { opus } from 'prism-media';
import { GuildMember, TextChannel, Message, Guild, MessageReaction } from 'discord.js';
import { EventEmitter } from 'events';
import { random } from 'lodash';
import { getStream } from './yt-core-discord';
import ytdl = require('ytdl-core');

// @ts-ignore declaration files does not exist.
import getVideoId from 'get-video-id';
import { Language } from './language';

export interface PlaylistItem {
    videoData?: VideoInfo;
    steamOptions: any;
    videoInfo: ytdl.videoInfo;
    stream: opus.Encoder | opus.WebmDemuxer;
    submitter: GuildMember;
    submitted: Date;
    message?: Message;
    index?: number;
}

export enum VoteInfo {
    NO_PERMISSION = 0,
    ALREADY_VOTE = 1,
    VOTE_SUCCESSFUL = 2,
    VOTE_EXECUTED = 3,
}

export declare type VoteType = 'voteNext' | 'votePrevious' | 'voteReplay' | 'votePauseResume' | 'voteLoop';
export declare interface GuildPlayer {
    on(event: 'update', listener: () => void): this;
    on(event: 'start', listener: () => void): this;
}

export class GuildPlayer extends EventEmitter {

    buttons = false;
    waitForUpdate = false;
    loop = false;
    language: Language;
    timeOutPlayerLeave?: NodeJS.Timeout;
    timeOutPlayerLeaveAllMemberLeft?: NodeJS.Timeout;
    readonly previous: PlaylistItem[] = [];
    readonly playlist: PlaylistItem[] = [];
    private votePercentage: number;
    private voteNext: GuildMember[] = [];
    private votePrevious: GuildMember[] = [];
    private voteReplay: GuildMember[] = [];
    private votePauseResume: GuildMember[] = [];
    private voteLoop: GuildMember[] = [];
    private currentlyPlaying?: PlaylistItem;
    private textChannel?: TextChannel;
    private interval?: NodeJS.Timeout;
    private trackStartTime?: Date;
    private paused?: Date;
    private goingToReplay = false;
    private shuffled = false;
    private message?: Message;
    private suspended = false;
    private defaultChannel: TextChannel;
    private counter = 0;
    private rgb: number[] = [0, 0, 0];

    constructor(
        private guild: Guild,
        language: Language,
        votePercentage: number,
        defaultChannel: TextChannel,
    ) {
        super();
        this.votePercentage = votePercentage;
        this.defaultChannel = defaultChannel;
        this.language = language;
        this.rgb = [random(128, 225), 0, 0];
    }

    isAlreadyOnPlaylistByUrl(url: string) {
        const data = getVideoId(url);
        if (data.id && data.service === 'youtube') {
            return this.isAlreadyOnPlaylistById(data.id);
        }
        return false;
    }

    isAlreadyOnPlaylistById(id: string) {
        const playlistItem = this.playlist.find(v => v.videoInfo.video_id === id);
        if (!playlistItem && this.currentPlayListItem && this.currentPlayListItem.videoInfo.video_id === id)
            return this.currentPlayListItem.videoInfo.title;

        if (playlistItem) return playlistItem.videoInfo.title;
        else return false;
    }

    replaySong(): boolean {
        if (!this.currentPlayListItem) return false;
        this.playlist.unshift(this.currentPlayListItem);
        this.currentlyPlaying = undefined;
        return true;
    }

    addVote(guildMember: GuildMember, type: VoteType): VoteInfo {
        if (guildMember.user.bot) return VoteInfo.NO_PERMISSION;
        if (type === 'voteNext' && this.playlist[0] && this.playlist[0].submitter === guildMember) {
            this.onVoteSuccessful(type);
            return VoteInfo.VOTE_EXECUTED;
        }

        if (this.canExecute(guildMember)) {
            this.onVoteSuccessful(type);
            return VoteInfo.VOTE_EXECUTED;
        }
        if (!this[type].includes(guildMember)) {
            this[type].push(guildMember);
            const users = this.getVoiceChannelUsersSize();
            if (!users || users * this.votePercentage < this[type].length) {
                this.onVoteSuccessful(type);
                return VoteInfo.VOTE_EXECUTED;
            } else {
                return VoteInfo.VOTE_SUCCESSFUL;
            }
        } else return VoteInfo.ALREADY_VOTE;
    }

    setVote(guildMembers: GuildMember[], type: VoteType): boolean {
        const now = this.currentlyPlaying;
        if (type === 'voteNext' && !this.length) return false;
        if (now && type === 'voteNext' && !!guildMembers.find(g => g === now.submitter)) {
            this.onVoteSuccessful(type);
            return true;
        }
        if (type === 'votePrevious' && !this.previous.length) return false;
        if (type === 'voteReplay' && this.isLooping) return true;
        if (type === 'voteLoop' && this.isGoingToReplay) return true;

        if (this.canExecute(guildMembers)) {
            this.onVoteSuccessful(type);
            return true;
        }

        const users = this.getVoiceChannelUsersSize();
        if (!users || users * this.votePercentage < this.votePauseResume.length) {
            this.onVoteSuccessful(type);
            return true;
        }

        this[type] = guildMembers;
        return false;
    }

    removeVote(guildMember: GuildMember, type: VoteType): VoteInfo {
        if (guildMember.user.bot) return VoteInfo.NO_PERMISSION;
        if (this[type].includes(guildMember)) {
            const index = this[type].indexOf(guildMember);
            this[type].splice(index, 1);
            return VoteInfo.VOTE_EXECUTED;
        } else return VoteInfo.ALREADY_VOTE;
    }

    getVoiceChannelUsersSize() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (!voiceConnection) return 0;
        return voiceConnection.channel.members.filter(u => !u.user.bot).size;
    }

    howManySongsDoesMemberHaveInPlaylist(guildMember: GuildMember) {
        return this.playlist.filter(i => i.submitter === guildMember).length;
    }

    setStartTime() {
        this.trackStartTime = new Date(Date.now());
    }

    resetTime() {
        this.trackStartTime = undefined;
    }

    setTextChannel(textChannel: TextChannel) {
        this.textChannel = textChannel;
    }

    getTextChannel() {
        return this.textChannel;
    }

    updateRate(n: number) {
        this.clearTimeout();
        this.interval = setInterval(() => {
            this.colorFader();

            if (!this.waitForUpdate) {
                this.emit('update');
            }
        }, n);
    }

    suspend() {
        this.suspended = true;
    }

    clearTimeout() {
        if (this.interval) {
            clearTimeout(this.interval);
        }
        this.interval = undefined;
    }

    getSongProgressionTime() {
        if (!this.startTime) return null;
        if (this.paused !== undefined) {
            return this.paused;
        }
        return new Date(Date.now() - this.startTime.getTime());
    }

    destroy(): Promise<void> {
        return new Promise(async (resolve) => {
            this.clearTimeout();
            resolve();
        });

    }

    fullDestroy(): Promise<void> {
        return new Promise(async (resolve) => {
            await this.destroy();

            const messages = this.playlist.filter(i => !!i.message).map(i => i.message);

            for (const message of messages) {
                if (message)
                    await message.reactions.removeAll().catch((err: any) => message.client.emit('error', err));
            }
            resolve();
        });
    }

    pause() {
        if (this.startTime) this.paused = new Date(Date.now() - this.startTime.getTime());
    }

    unpause() {
        if (this.paused && this.trackStartTime) this.trackStartTime = new Date(Date.now() - this.paused.getTime());

        this.paused = undefined;
    }

    shuffle(): boolean {
        if (this.playlist.length > 2) {
            this.playlist.sort(() => Math.random() - 0.5);
            this.shuffled = true;
            return true;
        }
        return false;
    }
    sort(): boolean {
        if (!this.shuffled) return false;
        this.shuffled = false;
        if (!this.playlist[0]) return false;
        if (this.playlist.length < 1) return false;
        let index = this.playlist[0].index!;

        for (const item of this.playlist) {
            if (item.index !== index) {
                this.playlist.sort((a, b) => (a.index! - b.index!));
                return true;
            }
            index++;
        }
        return false;
    }

    push(item: PlaylistItem): boolean {
        if (this.playlist.find(v => v.videoInfo.video_id === item.videoInfo.video_id)) {
            return false;
        } else {
            item.index = this.counter++;
            this.playlist.push(item);
            if (this.shuffled) this.shuffle();
            if (this.suspended) {
                this.suspended = false;
                this.emit('start');
            }
            return true;
        }
    }

    switchToNextTrack() {
        const replay = this.goingToReplay;
        this.goingToReplay = false;
        this.clearVotes();
        if (this.loop) return this.getNewStream(this.currentlyPlaying);
        if (replay) return this.getNewStream(this.currentlyPlaying);
        this.currentlyPlaying = this.playlist.shift();
        if (this.currentlyPlaying) {
            if (this.currentlyPlaying.message) this.currentlyPlaying.message.reactions.removeAll();
            this.previous.push(this.currentlyPlaying);
        }
        return this.getNewStream(this.currentlyPlaying);
    }

    switchToPreviousTrack() {
        this.goingToReplay = false;
        this.clearVotes();
        if (this.loop) return this.getNewStream(this.currentlyPlaying);

        this.currentlyPlaying = this.previous.pop();
        if (this.currentlyPlaying)
            this.playlist.unshift(this.currentlyPlaying);
        return this.getNewStream(this.currentlyPlaying);
    }

    clearVotes() {
        this.voteNext = [];
        this.votePrevious = [];
        this.voteReplay = [];
        this.voteLoop = [];
        this.votePauseResume = [];
    }

    addRemoveUser(voteGroup: GuildMember[], guildMember: GuildMember): boolean {
        if (voteGroup.includes(guildMember)) {
            const index = voteGroup.indexOf(guildMember);
            voteGroup.splice(index, 1);
            return false;
        } else {
            voteGroup.push(guildMember);
            return true;
        }
    }

    nextTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) voiceConnection.dispatcher.end();
    }

    pauseTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.pause();
            voiceConnection.dispatcher.pause();
        }
    }

    resumeTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.unpause();
            voiceConnection.dispatcher.resume();
        }
    }

    replayAsNextTrack(): boolean {
        if (!this.isLooping) {
            this.goingToReplay = !this.goingToReplay;
            return true;
        }
        return false;
    }

    replayTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.switchToPreviousTrack();
            voiceConnection.dispatcher.end();
        }
    }

    setSong(playlistItem: PlaylistItem) {
        const index = this.playlist.indexOf(playlistItem);
        if (index !== -1) {
            this.playlist.splice(index, 1);
        }
        this.playlist.unshift(playlistItem);

    }

    previousTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.switchToPreviousTrack();
            this.switchToPreviousTrack();
            voiceConnection.dispatcher.end();
        }
    }

    removeFromPlayListByMessage(message: Message, deleted = false): Promise<boolean> {
        return new Promise(async resolve => {
            const playlistItem = this.playlist.find(p => p.message === message);
            if (!playlistItem) return resolve(false);
            if (deleted) {
                this.removeItemFromPlaylist(playlistItem, deleted);
                return resolve(true);
            }
            const msg = playlistItem.message;
            if (!msg) return resolve(false);
            const messageReaction = message.reactions.resolve('❎');
            if (!messageReaction) return resolve(false);
            const messageMembers = await this.getGuildMembersFromReactions(messageReaction);
            const guild = message.guild;
            if (!guild) return resolve(false);
            const voice = guild.voice;
            if (!voice) return resolve(false);
            const channel = voice.channel;
            if (!channel) return resolve(false);

            const voiceGuildMembers = channel.members.map(m => m).filter(m => !m.user.bot);
            const sumGuildMembers = voiceGuildMembers.filter(m => messageMembers.includes(m));
            let shouldContinue = this.canExecute(sumGuildMembers);
            if (!shouldContinue) shouldContinue = !!sumGuildMembers.find(m => m === playlistItem.submitter);
            if (!shouldContinue) {
                const shouldNotReact = messageMembers.filter(m => m !== playlistItem.submitter);
                for (const user of shouldNotReact) {
                    await messageReaction.users.remove(user).catch((err: any) => msg.client.emit('error', err));
                }
                return resolve(false);
            }
            this.removeItemFromPlaylist(playlistItem, deleted);
            return resolve(true);
        });
    }
    canExecute(guildMembers: GuildMember[] | GuildMember): boolean {
        if (!Array.isArray(guildMembers)) return !guildMembers.user.bot && guildMembers.hasPermission('MANAGE_CHANNELS');
        if (guildMembers.length === 0) return false;
        const voice = guildMembers[0].guild.voice;
        if (!voice) return false;
        if (!voice.channel) return false;
        if (voice.channel.members.filter(m => !m.user.bot).size === 1) return true;
        for (const guildMember of guildMembers) {
            if (this.canExecute(guildMember)) return true;
        }
        return false;
    }

    async getGuildMembersFromReactions(messageReaction: MessageReaction) {
        const guildMembers: GuildMember[] = [];
        const guild = messageReaction.message.guild;
        if (!guild) return [];
        const users = await messageReaction.users.fetch();
        for (const user of users.map(u => u)) {
            const guildMember = await guild.members.fetch(user.id);
            if (guildMember && !guildMember.user.bot) guildMembers.push(guildMember);
        }
        return guildMembers;
    }

    async getFromVoiceAndMessageReactions(messageReaction: MessageReaction) {

        const messageMembers = await this.getGuildMembersFromReactions(messageReaction);
        const voice = this.guild.voice;
        if (!voice) return [];
        const voiceChannel = voice.channel;
        if (!voiceChannel) return [];
        const voiceGuildMembers = voiceChannel.members.map(m => m).filter(m => !m.user.bot);
        const result = voiceGuildMembers.filter(m => messageMembers.includes(m));
        return result;
    }

    removeItemFromPlaylist(playlistItem: PlaylistItem, deleted = false) {
        const index = this.playlist.indexOf(playlistItem);
        if (index === -1) return false;
        this.playlist.splice(index, 1);
        if (playlistItem.message && !deleted) {
            const client = playlistItem.message.client;
            playlistItem.message.delete().catch(err => client.emit('error', err));
        }
    }

    private onVoteSuccessful(type: VoteType) {
        switch (type) {
            case 'voteNext':
                this.nextTrack();
                this.voteNext = [];
                return;
            case 'voteLoop':
                this.loop = !this.loop;
                return;
            case 'votePauseResume':
                this.pauseResume();
                this.votePauseResume = [];
                return;
            case 'votePrevious':
                this.previousTrack();
                this.votePrevious = [];
                return;
            case 'voteReplay':
                this.replayAsNextTrack();
                this.voteReplay = [];
            default:
                break;
        }
    }

    private pauseResume() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (!voiceConnection) return;
        const dispatcher = voiceConnection.dispatcher;
        if (!dispatcher) return;
        if (dispatcher.paused) {
            this.unpause();
            dispatcher.resume();
        } else {
            this.pause();
            dispatcher.pause();
        }
    }

    private getNewStream(playlistItem?: PlaylistItem) {
        if (playlistItem) {
            playlistItem.stream = getStream(playlistItem.videoInfo, playlistItem.steamOptions);
        }
        return playlistItem;
    }

    set playerMessage(message: Message | undefined) {
        this.message = message;
    }

    get playerMessage() {
        return this.message;
    }
    set playerChannel(channel: TextChannel) {
        this.defaultChannel = channel;
    }

    get playerChannel() {
        return this.defaultChannel;
    }
    get currentPlayListItem() {
        return this.currentlyPlaying;
    }

    get length() {
        return this.playlist.length;
    }
    get startTime() {
        return this.trackStartTime;
    }

    get color() {
        return this.rgb;
    }

    get isPaused() {
        return !!this.paused;
    }

    get isLooping() {
        return !!this.loop;
    }

    get isGoingToReplay() {
        return this.goingToReplay;
    }

    get voteNextStatus() {
        if (this.voteNext.length === 0) return null;
        const users = this.getVoiceChannelUsersSize();
        if (users === 0) return null;
        if (this.voteNext.length === users) return null;
        return `${this.voteNext.length}/${users}`;
    }
    get votePreviousStatus() {
        if (this.votePrevious.length === 0) return null;
        const users = this.getVoiceChannelUsersSize();
        if (users === 0) return null;
        if (this.votePrevious.length === users) return null;
        return `${this.votePrevious.length}/${users}`;
    }
    get voteReplayStatus() {
        if (this.voteReplay.length === 0) return null;
        const users = this.getVoiceChannelUsersSize();
        if (users === 0) return null;
        if (this.voteReplay.length === users) return null;
        return `${this.voteReplay.length}/${users}`;
    }
    get votePauseResumeStatus() {
        if (this.votePauseResume.length === 0) return null;
        const users = this.getVoiceChannelUsersSize();
        if (users === 0) return null;
        if (this.votePauseResume.length === users) return null;
        return `${this.votePauseResume.length}/${users}`;
    }
    get voteLoopStatus() {
        if (this.voteLoop.length === 0) return null;
        const users = this.getVoiceChannelUsersSize();
        if (users === 0) return null;
        if (this.voteLoop.length === users) return null;
        return `${this.voteLoop.length}/${users}`;
    }

    private colorFader() {
        const increaser = 11;

        if (this.rgb[0] > 0 && this.rgb[1] <= 0) {
            this.rgb[0] -= increaser;
            this.rgb[2] += increaser;
        }
        if (this.rgb[2] > 0 && this.rgb[0] <= 0) {
            this.rgb[2] -= increaser;
            this.rgb[1] += increaser;
        }
        if (this.rgb[1] > 0 && this.rgb[2] <= 0) {
            this.rgb[0] += increaser;
            this.rgb[1] -= increaser;
        }

        if (this.rgb[0] < 0) this.rgb[0] = 0;
        if (this.rgb[1] < 0) this.rgb[1] = 0;
        if (this.rgb[2] < 0) this.rgb[2] = 0;
        if (this.rgb[0] > 255) this.rgb[0] = 255;
        if (this.rgb[1] > 255) this.rgb[1] = 255;
        if (this.rgb[2] > 255) this.rgb[2] = 255;
        return this.rgb;
    }
}
