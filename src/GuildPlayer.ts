import { VideoInfo } from './interfaces';
import { opus } from 'prism-media';
import { GuildMember, TextChannel, Message, Guild, MessageReaction, MessageEmbed, ColorResolvable } from 'discord.js';
import { random } from 'lodash';
import { getStream } from './yt-core-discord';
import ytdl = require('ytdl-core');

// @ts-ignore declaration files does not exist.
import getVideoId from 'get-video-id';
import { Language } from './language';
import { getYoutubeTime, YoutubePlayer } from './YoutubePlayer';
import { sliderGenerator, addBasicInfo, canEmbed, stringifyRichEmbed } from './messages';
import { setTimeout } from 'timers';
const youtubeLogo = 'https://s.ytimg.com/yts/img/favicon_144-vfliLAfaB.png'; // Youtube icon

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
export class GuildPlayer {
    suspended = false;
    loop = false;
    timeOutPlayerLeave?: NodeJS.Timeout;
    timeOutPlayerLeaveAllMemberLeft?: NodeJS.Timeout;
    readonly previous: PlaylistItem[] = [];
    readonly playlist: PlaylistItem[] = [];
    private recreateReactionTries = 0;
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
    private counter = 0;
    private rgb: number[] = [0, 0, 0];

    constructor(
        private guild: Guild,
        private youtubePlayer: YoutubePlayer,
        private playerUpdateRate: number,
        private suggestReplay: number,
        private reactionButtons: boolean,
        private leaveVoiceChannelAfter: number,
        private waitTimeBetweenTracks: number,
        public language: Language,
        private votePercentage: number,
        private defaultChannel: TextChannel) {
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
            if (users * this.votePercentage < this[type].length) {
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
        if (users * this.votePercentage < this.votePauseResume.length) {
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
        if (!voice) return 0;
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

    destroy(): void {
        this.clearTimeout();
    }

    async fullDestroy(): Promise<void> {
        this.destroy();
        const messages = this.playlist.filter(i => !!i.message).map(i => i.message);

        for (const message of messages) {
            if (message)
                await message.reactions.removeAll().catch((err: any) => message.client.emit('error', err));
        }
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

    async nextTrack() {
        await this.removeAllReactions();
        this.playerLoop();
        this.recreateOrRecreatePlayerButtons();
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

    async replayTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            this.switchToPreviousTrack();
            await this.removeAllReactions()
            this.playerLoop();
            this.recreateOrRecreatePlayerButtons();
        }
    }

    setSong(playlistItem: PlaylistItem) {
        const index = this.playlist.indexOf(playlistItem);
        if (index !== -1) {
            this.playlist.splice(index, 1);
        }
        this.playlist.unshift(playlistItem);

    }

    async previousTrack() {
        const voice = this.guild.voice;
        if (!voice) return;
        const voiceConnection = voice.connection;
        if (voiceConnection && voiceConnection.dispatcher) {
            await this.removeAllReactions();
            this.switchToPreviousTrack();
            this.switchToPreviousTrack();
            this.playerLoop();
            this.recreateOrRecreatePlayerButtons();
        }
    }

    async removeFromPlayListByMessage(message: Message, deleted = false) {
        const playlistItem = this.playlist.find(p => p.message === message);
        if (!playlistItem) return false;
        if (deleted) {
            this.removeItemFromPlaylist(playlistItem, deleted);
            return true;
        }
        const msg = playlistItem.message;
        if (!msg) return false;
        const messageReaction = message.reactions.resolve('❎');
        if (!messageReaction) return false;
        const messageMembers = await this.getGuildMembersFromReactions(messageReaction);
        if (typeof messageMembers === 'boolean') return false;
        const guild = message.guild;
        if (!guild) return false;
        const voice = guild.voice;
        if (!voice) return false;
        const channel = voice.channel;
        if (!channel) return false;

        const voiceGuildMembers = channel.members.map(m => m).filter(m => !m.user.bot);
        const sumGuildMembers = voiceGuildMembers.filter(m => messageMembers.includes(m));
        let shouldContinue = this.canExecute(sumGuildMembers);
        if (!shouldContinue) shouldContinue = !!sumGuildMembers.find(m => m === playlistItem.submitter);
        if (!shouldContinue) {
            const shouldNotReact = messageMembers.filter(m => m !== playlistItem.submitter);
            for (const user of shouldNotReact) {
                await messageReaction.users.remove(user).catch((err: any) => msg.client.emit('error', err));
            }
            return false;
        }
        this.removeItemFromPlaylist(playlistItem, deleted);
        return true;

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
        const users = await messageReaction.users.fetch().catch(err => guild.client.emit('err', err));
        if (typeof users === 'boolean') return [];
        for (const user of users.map(u => u)) {
            const guildMember = await guild.members.fetch(user.id);
            if (guildMember && !guildMember.user.bot) guildMembers.push(guildMember);
        }
        return guildMembers;
    }

    async getFromVoiceAndMessageReactions(messageReaction: MessageReaction) {

        const messageMembers = await this.getGuildMembersFromReactions(messageReaction).catch(err => messageReaction.message.client.emit('err', err));
        if (typeof messageMembers === 'boolean') return [];
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

    async updatePlayer() {
        this.clearTimeout();
        if (!this.guild.available || !this.guild.me) return this.resetPlayerLoop();
        const language = this.language.getLang();
        const textChannel = this.getTextChannel();
        const voice = this.guild.me.voice.channel;
        const currentSong = this.currentPlayListItem;
        const startSongTime = this.getSongProgressionTime();
        if (!textChannel || !startSongTime || !currentSong || !voice) return this.resetPlayerLoop();
        let progress = '';
        const videoTimestamp = parseInt(currentSong.videoInfo.length_seconds) * 1000;
        if (startSongTime.getTime() < videoTimestamp) progress = `${getYoutubeTime(startSongTime.getTime())} / ${getYoutubeTime(videoTimestamp)}`;
        else progress = `${getYoutubeTime(videoTimestamp)} / ${getYoutubeTime(videoTimestamp)}`;
        const embed = new MessageEmbed();
        await addBasicInfo(this.youtubePlayer, embed, currentSong, this.guild);
        if (!embed.description) embed.setDescription(`\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
        else embed.setDescription(`${embed.description}\n\`${sliderGenerator(startSongTime.getTime(), videoTimestamp)}\``);
        embed.setColor(this.rgb as ColorResolvable);
        embed.addField(language.video.progress, progress, true);
        const voteNext = this.voteNextStatus;
        const votePrevious = this.votePreviousStatus;
        const voteReplay = this.voteReplayStatus;
        const votePauseResume = this.votePauseResumeStatus;
        const voteLoopStatus = this.voteLoopStatus;
        const voteReplayStatus = this.voteReplayStatus;
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
        const loadedTracks = this.length > 0 ? ` | ${language.player.loadedTracks.replace(/<NUMBER>/g, this.length.toString())}` : '';
        const trackInfo = `| ${language.player.id.replace(/<ID>/g, index.toString())}${loadedTracks}`;

        if (this.isPaused)
            embed.setFooter(language.player.statusPaused, youtubeLogo);
        else {
            if (this.isLooping) embed.setFooter(`${language.player.statusPlaying} 🔂 ${trackInfo}`, youtubeLogo);
            else if (this.isGoingToReplay) embed.setFooter(`${language.player.statusPlaying} 🔁 ${trackInfo}`, youtubeLogo);
            else embed.setFooter(`${language.player.statusPlaying} ${trackInfo}`, youtubeLogo);
        }
        embed.setThumbnail('');
        if (!this.playerMessage) {
            if (textChannel && canEmbed(textChannel)) {
                const msg = await textChannel.send(embed)
                await this.deletePlayerMessage();
                this.playerMessage = msg;
                this.recreateOrRecreatePlayerButtons();
            } else if (textChannel) {
                const msg = await textChannel.send(await stringifyRichEmbed(embed, this.guild))
                await this.deletePlayerMessage();
                this.playerMessage = msg;
                await this.recreateOrRecreatePlayerButtons();
            }
            return this.resetPlayerLoop();
        }
        try {
            if (this.playerMessage && this.playerMessage.embeds.length !== 0) {
                this.playerMessage.edit('', embed);
            } else if (this.playerMessage) {
                this.playerMessage.edit(await stringifyRichEmbed(embed, this.guild))
            }
        } catch (error) {
            this.deletePlayerMessage();
            this.updatePlayer();
            return;
        }
        if (!this.isGoingToReplay && !this.isLooping && this.playerMessage && this.reactionButtons && videoTimestamp - startSongTime.getTime() < this.suggestReplay) {
            const message = this.playerMessage;
            if (message) {
                const channel = message.channel as TextChannel;
                if (!channel.guild || !channel.guild.me) return;
                const channelPermissions = channel.permissionsFor(channel.guild.me);
                if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES'))
                    message.react('🔁');
            }
        }
        this.resetPlayerLoop();
    }

    resetPlayerLoop() {
        this.clearTimeout();
        this.interval = setTimeout(async () => {
            this.clearTimeout();
            try {
                await this.updatePlayer();
            } catch (error) {
                console.error('function colapsed', error);
                this.resetPlayerLoop();
            }
        }, this.playerUpdateRate);

    }


    playerLoop() {
        if (!this.guild || !this.guild.voice || !this.guild.voice.connection) {
            if (this.guild && this.guild.voice && this.guild.voice.channel) this.guild.voice.channel.leave();
            else this.resetPlayerLoop();
            return;
        }
        const connection = this.guild.voice.connection;
        if (!this.switchToNextTrack()) {
            this.suspend();
            if (this.playerMessage) {
                this.removeAllReactions();
            }
            this.timeOutPlayerLeave = setTimeout(() => {
                connection.channel.leave();
            }, this.leaveVoiceChannelAfter);
            connection.client.emit('debug', `[Youtube Player] [Status] Player suspended in guild ${connection.channel.guild.id}`);
            return this.resetPlayerLoop();
        }
        const playlistItem = this.currentPlayListItem;

        if (!playlistItem) throw new Error('Nothing to play. Should not happen');
        const dispatcher = connection.play(playlistItem.stream, { type: 'opus' });
        //@ts-ignore
        global.dispatcher = dispatcher
        dispatcher.on('end', () => {
            connection.client.emit('debug', `[Youtube Player] [Status] Track ended in guild ${connection.channel.guild.id}`);
            setTimeout(() => {
                this.resetTime();
                this.recreateOrRecreatePlayerButtons();
                this.playerLoop()
            }, this.waitTimeBetweenTracks);
        });
        dispatcher.on('debug', (info: any) => {
            connection.client.emit('debug', `[Dispatcher] [debug] ${info}`);
        });
        dispatcher.on('start', () => {
            connection.client.emit('debug', `[Youtube Player] [Status] Track started in guild ${connection.channel.guild.id}`);
            this.setStartTime();
            this.updatePlayer();
        });
        dispatcher.on('error', (e: any) => {
            connection.client.emit('debug', `[Youtube Player] [Status] Track Error in guild ${connection.channel.guild.id} ${e}`);
            connection.client.emit('error', e);
        });
    }


    async recreateOrRecreatePlayerButtons(start = true) {
        if (this.recreateReactionTries > 5) {
            this.recreateReactionTries = 0;
            return;
        }
        if (start) {
            if (this.recreateReactionTries > 0) {
                this.recreateReactionTries = 0
                return;
            }
        }
        if (!this.playerMessage) return;
        try {

            const currentPlaying = this.currentPlayListItem;
            const videoTimestamp = currentPlaying ? parseInt(currentPlaying.videoInfo.length_seconds) * 1000 : -1;
            const startSongTime = this.getSongProgressionTime();
            const channel = this.playerMessage.channel as TextChannel;
            if (!channel.guild || !channel.guild.me) return;
            const channelPermissions = channel.permissionsFor(channel.guild.me);
            if (channelPermissions && channelPermissions.has('MANAGE_MESSAGES')) {
                if (channelPermissions.has('MANAGE_MESSAGES'))
                    await this.playerMessage.reactions.removeAll();
                else {
                    this.deletePlayerMessage();
                    this.updatePlayer();
                }

                if (this.previous.length > 1)
                    await this.reactIfExist('⏮️');
                if (this.isPaused) await this.reactIfExist('▶️');
                else await this.reactIfExist('⏸️');
                if (this.playlist.length !== 0)
                    await this.reactIfExist('⏭️');
                if (this.loop)
                    await this.reactIfExist('🔂');
                if (!this.isGoingToReplay && !this.isLooping && startSongTime && videoTimestamp - startSongTime.getTime() < this.suggestReplay)
                    await this.reactIfExist('🔁');
                // message.react('🔀').catch(error => message.client.emit('error', error));
            }
            this.recreateReactionTries = 0
        } catch (error) {
            this.recreateReactionTries++;
            setTimeout(() => {
                if (this.recreateReactionTries === 0) return;
                this.recreateOrRecreatePlayerButtons(false)
            }, 500);
        }
    }

    async removeAllReactions() {
        if (this.playerMessage && this.guild.me) {
            const channel = this.playerMessage.channel as TextChannel;
            const permission = channel.permissionsFor(this.guild.me);
            if (permission && permission.has('MANAGE_MESSAGES')) {
                try {
                    await this.playerMessage.reactions.removeAll();
                } catch (error) {
                    channel.client.emit('error', error)
                }
            }
        }
    }

    deletePlayerMessage(shouldReassign = true) {
        if (this.playerMessage && this.playerMessage.deletable) {
            this.playerMessage.delete().catch(() => { });
        }
        this.message = undefined;
    }


    private async reactIfExist(emoji: string) {
        if (this.playerMessage) {
            await this.playerMessage.react(emoji);
            return;
        }
        throw new Error('Message does not exit');
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
                return;
            default:
                return;
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
        if (this.message && this.message !== message) console.error(new Error('Should not happen'));
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