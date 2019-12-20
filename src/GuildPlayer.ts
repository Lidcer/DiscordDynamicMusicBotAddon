import { VideoInfo, PlayerLanguage } from './interfaces';
import { opus } from 'prism-media';
import { GuildMember, TextChannel, Message, Guild } from 'discord.js';
import { EventEmitter } from 'events';
import { random } from 'lodash';
import { getStream } from './yt-core-discord';
import ytdl = require('ytdl-core');

// @ts-ignore declaration files does not exist.
import getVideoId from 'get-video-id';
import { YoutubePlayer } from './YoutubePlayer';

export interface PlaylistItem {
    videoData?: VideoInfo;
    steamOptions: any;
    videoInfo: ytdl.videoInfo;
    stream: opus.Encoder | opus.WebmDemuxer;
    submitter: GuildMember;
    submitted: Date;
    message?: Message;
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
    private message?: Message;
    private suspended = false;
    private rgb: number[] = [0, 0, 0];

    constructor(
        private guild: Guild,
        private youtubePlayer: YoutubePlayer,
        votePercentage: number) {
        super();
        this.votePercentage = votePercentage;
        this.rgb = [random(0, 225), random(0, 225), random(0, 225)];
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
        if (playlistItem) {
            return playlistItem.videoInfo.title;
        } else {
            return false;
        }
    }

    addVote(guildMember: GuildMember, type: VoteType): VoteInfo {
        if (guildMember.user.bot) return VoteInfo.NO_PERMISSION;
        if (this.canExecute(guildMember)) {
            this.onVoteSuccessful(type);
            return VoteInfo.VOTE_EXECUTED;
        }
        if (!this[type].includes(guildMember)) {
            this[type].push(guildMember);
            const users = this.getVoiceChannelUsers();
            if (users * this.votePercentage < this[type].length) {
                this.onVoteSuccessful(type);
                return VoteInfo.VOTE_EXECUTED;
            } else {
                return VoteInfo.VOTE_SUCCESSFUL;
            }
        } else return VoteInfo.ALREADY_VOTE;
    }

    setVote(guildMembers: GuildMember[], type: VoteType): boolean {
        this.votePauseResume = guildMembers;
        for (const guildMember of guildMembers) {
            if (this.canExecute(guildMember)) {
                this.onVoteSuccessful(type);
                return true;
            }
        }
        const users = this.getVoiceChannelUsers();
        if (users * this.votePercentage < this.votePauseResume.length) {
            this.onVoteSuccessful(type);
            return true;
        }
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

    getVoiceChannelUsers() {
        const voiceConnection = this.guild.voiceConnection;
        if (!voiceConnection) return 0;
        return voiceConnection.channel.members.filter(u => !u.user.bot).size;
    }

    howManySongsDoesMemberHasInPlaylist(guildMember: GuildMember) {
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

    destroy() {
        this.clearTimeout();
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
            return true;
        }
        return false;
    }

    push(item: PlaylistItem): boolean {
        if (this.playlist.find(v => v.videoInfo.video_id === item.videoInfo.video_id)) {
            return false;
        } else {
            this.playlist.push(item);
            if (this.suspended) {
                this.suspended = false;
                this.emit('start');
            }
            return true;
        }
    }

    switchToNextSong() {
        this.clearVotes();
        if (this.loop) return this.getNewStream(this.currentlyPlaying);
        this.currentlyPlaying = this.playlist.shift();
        if (this.currentlyPlaying)
            this.previous.push(this.currentlyPlaying);
        return this.getNewStream(this.currentlyPlaying);
    }

    switchToPreviousSong() {
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
        this.votePrevious = [];
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
        const voiceConnection = this.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) voiceConnection.dispatcher.end();
    }

    pauseTrack() {
        const voiceConnection = this.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.pause();
            voiceConnection.dispatcher.pause();
        }
    }

    resumeTrack() {
        const voiceConnection = this.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.unpause();
            voiceConnection.dispatcher.resume();
        }
    }

    replayTrack() {
        const voiceConnection = this.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.switchToPreviousSong();
            voiceConnection.dispatcher.end();
        }
    }

    previousTrack() {
        const voiceConnection = this.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.switchToPreviousSong();
            this.switchToPreviousSong();
            voiceConnection.dispatcher.end();
        }
    }

    shuffleQueue(message: Message, language: PlayerLanguage) {
        const voiceConnection = message.guild.voiceConnection;
        if (voiceConnection && voiceConnection.dispatcher) {
            if (this.shuffle()) {
                message.channel.send(language.player.nothingToShuffle).catch(error => message.client.emit('error', error));
            } else {
                message.channel.send(language.player.shuffled).catch(error => message.client.emit('error', error));
            }
        }
    }

    private onVoteSuccessful(type: VoteType) {
        switch (type) {
            case 'voteNext':
                this.nextTrack();
                return;
            case 'voteLoop':
                this.loop = !this.loop;
                return;
            case 'votePauseResume':
                this.pauseResume();
                return;
            case 'votePrevious':
                this.previousTrack();
                return;
            case 'voteReplay':
                this.replayTrack();
            default:
                break;
        }
    }

    private pauseResume() {
        const voiceConnection = this.guild.voiceConnection;
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
    private canExecute(guildMembers: GuildMember[] | GuildMember): boolean {
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

    private getNewStream(playlistItem?: PlaylistItem) {
        if (playlistItem) {
            playlistItem.stream = getStream(playlistItem.videoInfo, playlistItem.steamOptions);
        }
        return playlistItem;
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

    set playerMessage(message: Message | undefined) {
        this.message = message;
    }

    get playerMessage() {
        return this.message;
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

    get voteNextStatus() {
        if (this.voteNext.length === 0) return null;
        const users = this.getVoiceChannelUsers();
        if (users === 0) return null;
        return `${this.voteNext.length}/${users}`;
    }
    get votePreviousStatus() {
        if (this.votePrevious.length === 0) return null;
        const users = this.getVoiceChannelUsers();
        if (users === 0) return null;
        return `${this.votePrevious.length}/${users}`;
    }
    get voteReplayStatus() {
        if (this.voteReplay.length === 0) return null;
        const users = this.getVoiceChannelUsers();
        if (users === 0) return null;
        return `${this.voteReplay.length}/${users}`;
    }
    get votePauseResumeStatus() {
        if (this.votePauseResume.length === 0) return null;
        const users = this.getVoiceChannelUsers();
        if (users === 0) return null;
        return `${this.votePauseResume.length}/${users}`;
    }
    get voteLoopStatus() {
        if (this.voteLoop.length === 0) return null;
        const users = this.getVoiceChannelUsers();
        if (users === 0) return null;
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
