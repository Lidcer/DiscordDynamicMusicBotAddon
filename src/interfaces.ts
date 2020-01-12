import { GuildPlayer } from './GuildPlayer';

export interface VideoInfo {
    video_id: string;
    video_url: string;
    title: string;
    length_seconds: number;
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
    playlistNotFound: string;
    playListParseFail: string;
    incorrectUse: string;
    videoAdded: string;
    luckSearch: string;
    alreadyOnPlaylist: string;
    isCurrentlyPlaying: string;
    missingPermission: string;
    foundVideoUnavailable: string;
    video: VideoLanguage;
    player: Player;
    help: Help;
    commands: Commands;
    prefix: string;
    toLongTrack: string;
    sendingMessageToQuickly: string;
    error: string;
    info: string;
}

export interface Player {
    nothingPlaying: string;
    featureDisabled: string;
    loadedTracks: string;
    helpCommand: string;
    searching: string;
    parsingPlaylist: string;
    created: string;
    destroyUnexpected: string;
    destroy: string;
    previous: string;
    wrongChannel: string;
    wrongChannelNoPermissions: string;
    wrongChannelNoAccess: string;
    paused: string;
    resumed: string;
    brokenUrl: string;
    replay: string;
    forceReplay: string;
    alreadyOnReplay: string;
    statusPlaying: string;
    statusPaused: string;
    loopingOn: string;
    loopingOff: string;
    skip: string;
    playlistFull: string;
    toManyUserTracks: string;
    toManyUserTracksLimitExceeded: string;
    vote: VoteStats;
    id: string;
    playlistShuffled: string;
    playlistNothingToShuffle: string;
    playlistSorted: string;
    playlistAlreadySorted: string;
    playlistRemove: string;
    playlistUnableToFindItem: string;

}
export interface VoteStats {
    vote: string;
    next: string;
    previous: string;
    replay: string;
    pauseResume: string;
    loop: string;
    notAllowed: string;
    noPreviousTrack: string;
    emptyPlaylist: string;
    alreadyVoted: string;
    voteSuccessful: string;
}

export interface Commands {
    destroy: string[];
    next: string[];
    previous: string[];
    help: string[];
    loop: string[];
    pause: string[];
    replay: string[];
    resume: string[];
    playerCommands: string[];
    search: string[];
    url: string[];
    playlist: string[];
    playlistCommands: {
        remove: string[];
        shuffle: string[];
        parse: string[];
        sort: string[];
        force: string[];
    };

}

export interface Help {
    destroy: string;
    loop: string;
    help: string;
    next: string;
    previous: string;
    replay: string;
    pause: string;
    url: string;
    search: string;
    resume: string;
    playlistParse: string;
    playlistShuffle: string;
    playlistSort: string;
    playlistRemove: string;
    playlistPlay: string;

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

export interface GuildData {
    [guildID: string]: GuildPlayer;
}
