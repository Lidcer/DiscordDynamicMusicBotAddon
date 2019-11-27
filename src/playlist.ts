import { VideoData } from "./interfaces";
import { opus } from 'prism-media';
import * as getVideoId from 'get-video-id'
import { GuildMember, TextChannel, Message } from "discord.js";
import { EventEmitter } from "events";
import { random } from "lodash";
import { getStream } from "./yt-code-discord";
import ytdl = require("ytdl-core");
export interface PlaylistItem {
	videoData: VideoData;
	steamOptions: any;
	videoInfo: ytdl.videoInfo;
	stream: opus.Encoder | opus.WebmDemuxer;
	submitter: GuildMember;
	submitted: Date;
}

export declare interface GuildPlayer {
	on(event: 'update', listener: () => void): this;
	on(event: 'start', listener: () => void): this;
}

export class GuildPlayer extends EventEmitter {

	readonly previous: PlaylistItem[] = []
	readonly playlist: PlaylistItem[] = []
	private currentlyPlaying?: PlaylistItem;
	private textChannel?: TextChannel;
	private interval?: NodeJS.Timeout;
	private trackStartTime?: Date;
	private paused?: Date;
	private message?: Message;
	private suspended = false;
	private rgb: number[] = [0, 0, 0];
	buttons = false;
	waitForUpdate = false;
	loop = false;

	constructor() {
		super();
		this.rgb = [random(0, 225), random(0, 225), random(0, 225)]
	}

	push(item: PlaylistItem): boolean {
		if (this.playlist.find(v => v.videoData.id === item.videoData.id)) {
			return false;
		}
		else {
			this.playlist.push(item);
			if (this.suspended) {
				this.suspended = false;
				this.emit('start');
			}
			return true;
		}
	}

	switchToNextSong() {
		if (this.loop) return this.getNewStream(this.currentlyPlaying);
		this.currentlyPlaying = this.playlist.shift();
		if (this.currentlyPlaying)
			this.previous.push(this.currentlyPlaying);
		return this.getNewStream(this.currentlyPlaying);
	}

	switchToPreviousSong() {
		if (this.loop) return this.getNewStream(this.currentlyPlaying);

		this.currentlyPlaying = this.previous.pop();
		if (this.currentlyPlaying)
			this.playlist.unshift(this.currentlyPlaying);
		return this.getNewStream(this.currentlyPlaying)
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

	isAlreadyOnPlaylistByUrl(url: string) {
		const data = getVideoId(url);
		if (data.id && data.service === 'youtube') {
			return this.isAlreadyOnPlaylistByUrl(data.id);
		}
		return null;
	}

	isAlreadyOnPlaylistById(id: string) {
		const playlistItem = this.playlist.find(v => v.videoData.id === id);
		if (playlistItem) {
			return playlistItem.videoData.title;
		} else {
			return false;
		}
	}

	get length() {
		return this.playlist.length;
	}
	setStartTime() {
		this.trackStartTime = new Date(Date.now());
	}
	get startTime() {
		return this.trackStartTime
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

	updateRate(number: number) {
		this.clearTimeout();
		this.interval = setInterval(() => {
			this.colorFader();

			if (!this.waitForUpdate) {
				this.emit('update');
			}
		}, number);
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
		if (this.paused) {
			return new Date(Date.now() - this.startTime.getTime()); // FIXME: fix time calculation
		}
		return new Date(Date.now() - this.startTime.getTime());
	}

	destroy() {
		this.clearTimeout();
	}

	pause() {
		this.paused = new Date(Date.now());
	}

	unpause() {
		if (this.paused && this.trackStartTime) {
			this.trackStartTime = new Date(this.trackStartTime.getTime() - this.paused.getTime()); // FIXME: fix time calculation  
		}

		this.paused = undefined;
	}

	shuffle() {
		this.playlist.sort(() => Math.random() - 0.5);
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
