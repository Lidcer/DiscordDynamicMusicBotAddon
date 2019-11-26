import { VideoData } from "./interfaces";
import { opus } from 'prism-media';
import * as getVideoId from 'get-video-id'
import { GuildMember, TextChannel } from "discord.js";
import { EventEmitter } from "events";

export interface PlaylistItem {
	videoData: VideoData;
	stream: opus.Encoder | opus.WebmDemuxer;
	submitter: GuildMember;
	submitted: Date;
}

export declare interface GuildPlayer {
	on(event: 'update', listener: () => void): this;
}

export class GuildPlayer extends EventEmitter {

	private previous: PlaylistItem[] = []
	private playlist: PlaylistItem[] = []
	private currentlyPlaying?: PlaylistItem;
	private textChannel?: TextChannel;
	private interval?: NodeJS.Timeout;
	loop = false;

	push(item: PlaylistItem): boolean {
		if (this.playlist.find(v => v.videoData.id === item.videoData.id)) {
			return false;
		}
		else {
			this.playlist.push(item);
			return true;
		}
	}

	switchToNextSong() {
		if (this.loop) return this.currentlyPlaying;
		this.currentlyPlaying = this.playlist.shift();
		if (this.currentlyPlaying)
			this.previous.push(this.currentlyPlaying);
		return this.currentlyPlaying;
	}

	switchToPreviousSong() {
		if (this.loop) return this.currentlyPlaying;
		this.currentlyPlaying = this.previous.shift();
		if (this.currentlyPlaying)
			this.playlist.unshift(this.currentlyPlaying);
		return this.currentlyPlaying;
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

	setTextChannel(textChannel: TextChannel) {
		this.textChannel = textChannel;
	}
	getTextChannel() {
		return this.textChannel;
	}
	setTimeout(number: number) {
		this.interval = setTimeout(() => {
			this.emit('update');
		}, number);

	}
	clearTimeout() {
		if (this.interval) {
			clearTimeout(this.interval);
		}
		this.interval = undefined;
	}

}
