import { GuildMember } from 'discord.js';
import { GuildPlayer } from './playlist';

export interface VideoData {
	id: string;
	url: string;
	title: string;
	duration: number;
	channel: Channel;
	thumbnail: string;
	publishedAt: Date;
	statistics: VideoStatistic;
}

export interface VideoStatistic {
	commentCount: number;
	dislikeCount: number;
	favoriteCount: number;
	likeCount: number;
	viewCount: number;

}

export interface Channel {
	id: string;
	title: string;
	thumbnail: string;
}

export interface PlayerLanguage {
	notInVoiceChannel: string;
	cannotConnect: string;
	onlyYoutubeLinks: string;
	incorrectUse: string;
	videoAdded: string;
	luckSearch: string;
	alreadyOnPlaylist: string;
	missingPermission: string;
	video: VideoLanguage;
	player: Player;
	help: Help;
	commands: Commands;
	prefix: string;
}

export interface Player {
	helpCommand: string;
	searching: string;
	created: string;
	destroy: string;
	paused: string;
	resumed: string;
	shuffled: string;
	brokenUrl: string;
	replay: string;
	forceReplay: string;
	alreadyOnReplay: string;
	nothingToShuffle: string;
	statusPlaying: string;
	statusPaused: string;
	loopingOn: string;
	loopingOff: string;
	skip: string;
	error: string;
}

export interface Commands {
	destroy: string[];
	next: string[];
	previous: string[];
	help: string[];
	loop: string[];
	shuffle: string[];
	pause: string[];
	replay: string[];
	resume: string[];
	playerCommands: string[];

}

export interface Help {
	url: string;
	skip: string;
	replay: string;
	destroy: string;
	search: string;
	pause: string;
	resume: string;
}

export interface VideoLanguage {
	views: string;
	upVote: string;
	downVote: string;
	comments: string;
	published: string;
	ratting: string;
	duration: string;
	progress: string;
	monthsName: string[];
}

export interface GuildQueue {
	video: VideoData;
	submitter: GuildMember;
	submitted: Date;
}
export interface GuildData {
	[guildID: string]: GuildPlayer;
}


// export interface GuildData {
//     paused?: Date;
//     looping: boolean;
//     startSongTime?: Date;
//     textChannel?: TextChannel;
//     playerMessage?: Message;
//     currentSong?: GuildQueue;
//     color: number[];
//     queue: GuildQueue[];
//     setTimeout?: NodeJS.Timeout;
// }
