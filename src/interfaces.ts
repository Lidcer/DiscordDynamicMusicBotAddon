import { GuildMember } from 'discord.js';
import { GuildPlayer } from './GuildPlayer';

export interface VideoInfo {
    id: string;
    video_url: string;
    title: string;
    duration: number;
    author: Channel;
    thumbnail_url: string;
    published: number;
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
    name: string;
    avatar: string;
    channel_url: string;
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
    vote: Vote;
    prefix: string;
    toLongTrack: string;
    toLongTrackLuckSearch: string;
}

export interface Vote {
    voteNext: string;
    votePrevious: string;
    removedVote: string;
}

export interface Player {
    nothingPlaying: string;
    helpCommand: string;
    searching: string;
    created: string;
    destroy: string;
    previous: string;
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
    playlistFull: string;
    toManyUserSongs: string;
    vote: VoteStats;
}
export interface VoteStats {
    vote: string;
    next: string;
    previous: string;
    replay: string;
    pauseResume: string;
    loop: string;
    notAllowed: string;
    alreadyVoted: string;
    notVoted: string;
    voteSuccessful: string;
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
    video: VideoInfo;
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
