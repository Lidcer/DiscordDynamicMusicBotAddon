import { GuildMember, TextChannel, Message } from 'discord.js';

export interface VideoData {
    id: string;
    url: string;
    title: string;
    duration: number;
    channel: Channel;
    thumbnail: string;
    publishedAt: Date;
    statistics: VideoStatistic;
    //  statistics: VideoStatistic
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
    notInVoiceChannel?: string;
    cannotConnect?: string;
    onlyYoutubeLinks?: string;
    incorrectUse?: string;
    videoAdded?: string;
    luckSearch?: string;
    alreadyOnPlaylist?: string;
    missingPermission?: string;
    video: VideoLanguge;
    player: Player;
    help: Help;
    prefix?: string;
}

export interface Player {
    created: string;
    destroy: string;
    paused: string;
    resumed: string;
    suffled: string;
    brokenUrl: string;
    replay: string;
    forceReplay: string;
    alredyOnReplay: string;
    nothingToSuffle: string;
    statusPlaying: string;
    statusPaused: string;
    loopingOn: string;
    loopingOff: string;
    skip: string;
    error: string;
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

export interface VideoLanguge {
    views?: string;
    upvote?: string;
    downvote?: string;
    comments?: string;
    published?: string;
    rateing?: string;
    duration?: string;
    progress?: string;
    monthsName?: string[];
}

export interface GuildQueue {
    video: VideoData;
    submitter: GuildMember;
    submited: Date;
}

export interface GuildData {
    paused?: Date;
    looping: boolean;
    startSongTime?: Date;
    textChannel?: TextChannel;
    playerMessage?: Message;
    currentSong?: GuildQueue;
    color: number[];
    queue: GuildQueue[];
    setTimeout?: NodeJS.Timeout;
}
