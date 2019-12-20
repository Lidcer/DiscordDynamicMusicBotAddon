import { VideoInfo } from './interfaces';
import { opus } from 'prism-media';
import { GuildMember, TextChannel, Message, Guild } from 'discord.js';
import { EventEmitter } from 'events';
import { random } from 'lodash';
import { getStream } from './yt-core-discord';
import ytdl = require('ytdl-core');

// @ts-ignore declaration files does not exist.
import getVideoId from 'get-video-id';

export interface PlaylistItem {
    videoData?: VideoInfo;
    steamOptions: any;
    videoInfo: ytdl.videoInfo;
    stream: opus.Encoder | opus.WebmDemuxer;
    submitter: GuildMember;
    submitted: Date;
    message?: Message;
}

export declare interface GuildPlayer {
    on(event: 'update', listener: () => void): this;
    on(event: 'start', listener: () => void): this;
}

export class GuildPlayer extends EventEmitter {

    voteNext: GuildMember[] = [];
    votePrevious: GuildMember[] = [];
    voteReplay: GuildMember[] = [];
    votePauseResume: GuildMember[] = [];
    buttons = false;
    waitForUpdate = false;
    loop = false;
    readonly previous: PlaylistItem[] = [];
    readonly playlist: PlaylistItem[] = [];
    private currentlyPlaying?: PlaylistItem;
    private textChannel?: TextChannel;
    private interval?: NodeJS.Timeout;
    private trackStartTime?: Date;
    private paused?: Date;
    private message?: Message;
    private suspended = false;
    private rgb: number[] = [0, 0, 0];

    constructor() {
        super();
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

    addVotePauseResume(guildMember: GuildMember): boolean {
        if (guildMember.user.bot) return false;
        if (!this.votePauseResume.includes(guildMember)) {
            this.votePauseResume.push(guildMember);
            const users = this.getVoiceChannelUsers(guildMember.guild);
            if (users * 0.6 < this.votePauseResume.length) return true;
        }
        return false;
    }

    removeVotePauseResume(guildMember: GuildMember) {
        if (guildMember.user.bot) return;
        if (this.votePauseResume.includes(guildMember)) {
            const index = this.votePauseResume.indexOf(guildMember);
            this.votePauseResume.splice(index, 1);
        }
    }

    addVoteNext(guildMember: GuildMember): boolean {
        if (guildMember.user.bot) return false;
        if (!this.voteNext.includes(guildMember)) {
            this.voteNext.push(guildMember);
            const users = this.getVoiceChannelUsers(guildMember.guild);
            if (users * 0.6 < this.voteNext.length) return true;
        }
        return false;
    }

    removeVoteNext(guildMember: GuildMember) {
        if (guildMember.user.bot) return;
        if (this.voteNext.includes(guildMember)) {
            const index = this.voteNext.indexOf(guildMember);
            this.voteNext.splice(index, 1);
        }
    }

    addVotePrevious(guildMember: GuildMember): boolean {
        if (guildMember.user.bot) return false;
        if (!this.votePrevious.includes(guildMember)) {
            this.votePrevious.push(guildMember);
            const users = this.getVoiceChannelUsers(guildMember.guild);
            if (users * 0.6 < this.votePrevious.length) return true;
        }
        return false;
    }

    removeVotePrevious(guildMember: GuildMember) {
        if (guildMember.user.bot) return;
        if (this.votePrevious.includes(guildMember)) {
            const index = this.votePrevious.indexOf(guildMember);
            this.votePrevious.splice(index, 1);
        }
    }

    addVoteReplay(guildMember: GuildMember): boolean {
        if (guildMember.user.bot) return false;
        if (!this.voteReplay.includes(guildMember)) {
            this.voteReplay.push(guildMember);
            const users = this.getVoiceChannelUsers(guildMember.guild);
            if (users * 0.6 < this.voteReplay.length) return true;
        }
        return false;
    }

    removeVoteReplay(guildMember: GuildMember) {
        if (guildMember.user.bot) return;
        if (this.voteReplay.includes(guildMember)) {
            const index = this.voteReplay.indexOf(guildMember);
            this.voteReplay.splice(index, 1);
        }
    }

    getVoiceChannelUsers(guild: Guild) {
        if (!guild) return 0;
        const voiceConnection = guild.voiceConnection;
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
        if (this.startTime)
            this.paused = new Date(Date.now() - this.startTime.getTime());
    }

    unpause() {
        if (this.paused && this.trackStartTime) {
            this.trackStartTime = new Date(Date.now() - this.paused.getTime());
        }

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
        const users = this.getVoiceChannelUsers(this.voteNext[0].guild);
        if (users === 0) return null;
        return `${this.voteNext.length}/${users}`;
    }
    get votePreviousStatus() {
        if (this.votePrevious.length === 0) return null;
        const users = this.getVoiceChannelUsers(this.votePrevious[0].guild);
        if (users === 0) return null;
        return `${this.votePrevious.length}/${users}`;
    }
    get voteReplayStatus() {
        if (this.voteReplay.length === 0) return null;
        const users = this.getVoiceChannelUsers(this.voteReplay[0].guild);
        if (users === 0) return null;
        return `${this.voteReplay.length}/${users}`;
    }
    get votePauseResumeStatus() {
        if (this.votePauseResume.length === 0) return null;
        const users = this.getVoiceChannelUsers(this.votePauseResume[0].guild);
        if (users === 0) return null;
        return `${this.votePauseResume.length}/${users}`;
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
