import { PlayerLanguage, Commands } from './interfaces';
import { YoutubePlayer } from './YoutubePlayer';

export const playerLanguage = new WeakMap<YoutubePlayer, Language>();

export class Language {

    readonly commands: Commands = {
        destroy: ['destroy', 'kill', 'leave'],
        loop: ['loop', 'repeat'],
        help: ['help'],
        next: ['next', 'skip', 'forward'],
        previous: ['previous', 'backwards'],
        pause: ['pause'],
        replay: ['replay'],
        resume: ['resume'],
        playerCommands: ['player'],
        url: ['url', 'link'],
        search: ['search', 'query'],
        playlist: ['playlist'],
        playlistCommands: {
            parse: ['parse'],
            remove: ['remove'],
            shuffle: ['shuffle', 'mix'],
            sort: ['sort'],
            force: ['play'],
        },
    };

    lang: PlayerLanguage = {
        notInVoiceChannel: 'You have to be in voice channel in order to use player commands!',
        cannotConnect: 'I am unable to connect to this channel! 😐',
        playlistNotFound: 'I am unable to parse playlists please check link',
        onlyYoutubeLinks: 'Sorry but only Youtube links are supported',
        playListParseFail: 'Something went wrong while trying to parse playlist',
        incorrectUse: 'You are using player command incorrectly. Type `<PREFIX><PLAYER> <HELP>` to get more info',
        videoAdded: 'Added by',
        luckSearch: 'with luck search',
        missingPermission: 'Missing permission you need to MANGE_CHANNELS permission to use command or being alone in channel also works.',
        alreadyOnPlaylist: 'Requested track is already on playlist!',
        isCurrentlyPlaying: 'Requested track is currently playing!',
        prefix: '',
        foundVideoUnavailable: 'Found video is unavailable',
        toLongTrack: 'Requested track <TRACK_URL> to long. Max length of track <MAX_LENGTH> minutes',
        sendingMessageToQuickly: 'Hold up you are sending message to fast but there is a cooldown. You have to wait <TIME> seconds',
        error: 'Error',
        info: 'Info',
        video: {
            comments: 'Comments',
            downVote: '👎',
            upVote: '👍',
            ratting: 'Ratting',
            views: 'Views',
            published: 'Published',
            duration: 'Duration',
            progress: 'Progress',
            monthsName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        },
        player: {
            helpCommand: 'Help',
            nothingPlaying: 'Nothing is playing',
            loadedTracks: 'Tracks in playlist: <NUMBER>',
            searching: `🔎 Searching... <URL>`,
            parsingPlaylist: `🔎 Parsing playlist... <URL>`,
            created: 'Player has been created',
            destroy: 'Player has been destroyed',
            destroyUnexpected: 'Player has been destroyed by unknown force',
            brokenUrl: 'Broken link',
            paused: 'Player has been paused by',
            resumed: 'Player has been resumed by',
            replay: 'Your track is going to be replayed when this track ends',
            forceReplay: 'Initiating force replay',
            alreadyOnReplay: 'This track is already on list for replay',
            skip: 'Track has been skipped',
            statusPaused: 'Paused',
            statusPlaying: 'Playing',
            loopingOn: '🔁 Looping this track is now enabled ✔️',
            loopingOff: '🔁 Looping this track is not disabled ❌',
            previous: 'Track switched to previous track',
            playlistFull: 'Playlist is full',
            wrongChannelNoPermissions: "You can only execute this command in channel where player has been created. But you don't have permission to send messages there. <CHANNEL>",
            wrongChannelNoAccess: 'Sorry you do no have access to channel where player has been created.',
            wrongChannel: 'You can only execute this command in channel where player has been created. <CHANNEL>',
            toManyUserTracks: 'You have to many tracks in the play list. Try removing some of them and try again.',
            toManyUserTracksLimitExceeded: 'You have exceeded the playlist limit',
            id: 'ID : <ID>',
            playlistNothingToShuffle: 'There is not enough tracks in playlist',
            playlistRemove: 'Track has been removed from playlist',
            playlistShuffled: 'Playlist has been shuffled',
            playlistAlreadySorted: 'Playlist is already tidy',
            playlistSorted: 'Playlist has been sorted',
            playlistUnableToFindItem: 'Unable to Find this track',
            featureDisabled: 'Sorry but this is disabled',
            vote: {
                vote: 'Vote',
                next: 'Next',
                previous: 'Previous',
                replay: 'Replay',
                pauseResume: 'Pause or Resume',
                loop: 'Loop',
                noPreviousTrack: 'There are no previous tracks',
                emptyPlaylist: 'Playlist is empty',
                alreadyVoted: 'You already voted',
                voteSuccessful: 'You have voted',
                notAllowed: 'You are not allowed to vote sorry',
            },
        },
        help: {
            destroy: '<PREFIX><PLAYER> <DESTROY> - to destroy player',
            replay: '<PREFIX><PLAYER> <REPLAY> - to replay track',
            loop: '<PREFIX><PLAYER> <LOOP> - to loop track',
            help: '<PREFIX><PLAYER> <HELP> - this message',
            pause: '<PREFIX><PLAYER> <PAUSE> - to pause the track',
            resume: '<PREFIX><PLAYER> <RESUME> - to resumes paused track',
            search: '<PREFIX><PLAYER> <SEARCH> [search query] - to search youtube',
            url: '<PREFIX><PLAYER> <youtube_url> - to player url',
            next: '<PREFIX><PLAYER> <NEXT> - switches to next track in playlist',
            previous: '<PREFIX><PLAYER> <PREVIOUS> - switches to previous track in playlist',
            playlistParse: '<PREFIX><PLAYER> <PLAYLIST> <PPARSE> <youtube_playlist_url> - parses youtube playlist',
            playlistRemove: '<PREFIX><PLAYER> <PLAYLIST> <PREMOVE> <id url> - remove item from playlist',
            playlistShuffle: '<PREFIX><PLAYER> <PLAYLIST> <PSHUFFLE> - shuffles playlist',
            playlistSort: '<PREFIX><PLAYER> <PLAYLIST> <PSORT> - sorts playlist if it was shuffled.',
            playlistPlay: '<PREFIX><PLAYER> <PLAYLIST> <PPLAY> <ID> - forcefully plays item',
        },
        commands: {
            destroy: ['destroy', 'kill', 'leave', 'getout'],
            loop: ['loop', 'repeat'],
            help: ['help', '?', 'what'],
            next: ['next', '>>', 'skip', 'forward'],
            previous: ['previous', '<<', 'backwards'],
            pause: ['pause'],
            replay: ['replay'],
            resume: ['resume'],
            playerCommands: ['player', 'p'],
            url: ['url', 'link'],
            search: ['youtube', 'search', 'query'],
            playlist: ['playlist', 'queue'],
            playlistCommands: {
                parse: ['parse', 'get'],
                remove: ['remove', 'delete', 'purge'],
                shuffle: ['shuffle', 'mix'],
                sort: ['sort', 'unshuffle', 'order'],
                force: ['play', 'force', 'inject'],
            },
        },
    };

    constructor(language?: PlayerLanguage) {
        this.updateLanguage(language);
    }
    updateLanguage(language?: PlayerLanguage) {

        if (!language) return;
        if (language.prefix) this.lang.prefix = language.prefix;
        if (language.notInVoiceChannel) this.lang.notInVoiceChannel = language.notInVoiceChannel;
        if (language.cannotConnect) this.lang.cannotConnect = language.cannotConnect;
        if (language.onlyYoutubeLinks) this.lang.onlyYoutubeLinks = language.onlyYoutubeLinks;
        if (language.incorrectUse) this.lang.incorrectUse = language.incorrectUse;
        if (language.videoAdded) this.lang.videoAdded = language.videoAdded;
        if (language.luckSearch) this.lang.luckSearch = language.luckSearch;
        if (language.missingPermission) this.lang.missingPermission = language.missingPermission;
        if (language.alreadyOnPlaylist) this.lang.alreadyOnPlaylist = language.alreadyOnPlaylist;
        if (language.isCurrentlyPlaying) this.lang.isCurrentlyPlaying = language.isCurrentlyPlaying;
        if (language.playlistNotFound) this.lang.playlistNotFound = language.playlistNotFound;
        if (language.playListParseFail) this.lang.playListParseFail = language.playListParseFail;
        if (language.foundVideoUnavailable) this.lang.foundVideoUnavailable = language.foundVideoUnavailable;
        if (language.toLongTrack) this.lang.toLongTrack = language.toLongTrack;
        if (language.sendingMessageToQuickly) this.lang.sendingMessageToQuickly = language.sendingMessageToQuickly;
        if (language.error) this.lang.error = language.error;
        if (language.info) this.lang.info = language.info;

        if (language.video) {
            const { video } = language;

            if (video.comments) this.lang.video.comments = video.comments;
            if (video.upVote) this.lang.video.upVote = video.upVote;
            if (video.downVote) this.lang.video.downVote = video.downVote;
            if (video.views) this.lang.video.views = video.views;
            if (video.published) this.lang.video.published = video.published;
            if (video.duration) this.lang.video.duration = video.duration;
            if (video.progress) this.lang.video.progress = video.progress;
            if (video.monthsName && video.monthsName.length === 12)
                this.lang.video.monthsName = video.monthsName;
        }
        if (language.player) {
            const { player } = language;
            if (player.helpCommand) this.lang.player.helpCommand = player.helpCommand;
            if (player.nothingPlaying) this.lang.player.nothingPlaying = player.nothingPlaying;
            if (player.searching) this.lang.player.searching = player.searching;
            if (player.parsingPlaylist) this.lang.player.parsingPlaylist = player.parsingPlaylist;
            if (player.created) this.lang.player.created = player.created;
            if (player.loadedTracks) this.lang.player.loadedTracks = player.loadedTracks;
            if (player.destroy) this.lang.player.destroy = player.destroy;
            if (player.destroyUnexpected) this.lang.player.destroyUnexpected = player.destroyUnexpected;
            if (player.brokenUrl) this.lang.player.brokenUrl = player.brokenUrl;
            if (player.paused) this.lang.player.paused = player.paused;
            if (player.resumed) this.lang.player.resumed = player.resumed;
            if (player.replay) this.lang.player.replay = player.replay;
            if (player.forceReplay) this.lang.player.forceReplay = player.forceReplay;
            if (player.alreadyOnReplay) this.lang.player.alreadyOnReplay = player.alreadyOnReplay;
            if (player.skip) this.lang.player.skip = player.skip;
            if (player.statusPaused) this.lang.player.statusPaused = player.statusPaused;
            if (player.statusPlaying) this.lang.player.statusPlaying = player.statusPlaying;
            if (player.loopingOn) this.lang.player.loopingOn = player.loopingOn;
            if (player.loopingOff) this.lang.player.loopingOff = player.loopingOff;
            if (player.previous) this.lang.player.previous = player.previous;
            if (player.wrongChannelNoPermissions) this.lang.player.wrongChannelNoPermissions = player.wrongChannelNoPermissions;
            if (player.wrongChannelNoAccess) this.lang.player.wrongChannelNoAccess = player.wrongChannelNoAccess;
            if (player.wrongChannel) this.lang.player.wrongChannel = player.wrongChannel;
            if (player.toManyUserTracks) this.lang.player.toManyUserTracks = player.toManyUserTracks;
            if (player.toManyUserTracksLimitExceeded) this.lang.player.toManyUserTracksLimitExceeded = player.toManyUserTracksLimitExceeded;

            if (player.playlistFull) this.lang.player.playlistFull = player.playlistFull;
            if (player.playlistAlreadySorted) this.lang.player.playlistAlreadySorted = player.playlistAlreadySorted;
            if (player.playlistShuffled) this.lang.player.playlistShuffled = player.playlistShuffled;
            if (player.playlistSorted) this.lang.player.playlistSorted = player.playlistSorted;
            if (player.playlistUnableToFindItem) this.lang.player.playlistUnableToFindItem = player.playlistUnableToFindItem;
            if (player.playlistRemove) this.lang.player.playlistRemove = player.playlistRemove;

            if (player.vote) {
                const { vote } = player;
                if (vote.vote) this.lang.player.vote.vote = vote.vote;
                if (vote.next) this.lang.player.vote.next = vote.next;
                if (vote.previous) this.lang.player.vote.previous = vote.previous;
                if (vote.replay) this.lang.player.vote.replay = vote.replay;
                if (vote.emptyPlaylist) this.lang.player.vote.emptyPlaylist = vote.emptyPlaylist;
                if (vote.noPreviousTrack) this.lang.player.vote.noPreviousTrack = vote.noPreviousTrack;
                if (vote.pauseResume) this.lang.player.vote.pauseResume = vote.pauseResume;
                if (vote.loop) this.lang.player.vote.loop = vote.loop;
                if (vote.alreadyVoted) this.lang.player.vote.alreadyVoted = vote.alreadyVoted;
                if (vote.voteSuccessful) this.lang.player.vote.voteSuccessful = vote.voteSuccessful;
                if (vote.notAllowed) this.lang.player.vote.notAllowed = vote.notAllowed;
            }
        }
        if (language.help) {
            const { help } = language;
            if (help.help) this.lang.help.help = help.help;
            if (help.destroy) this.lang.help.destroy = help.destroy;
            if (help.replay) this.lang.help.replay = help.replay;
            if (help.pause) this.lang.help.pause = help.pause;
            if (help.help) this.lang.help.help = help.help;
            if (help.loop) this.lang.help.loop = help.loop;
            if (help.resume) this.lang.help.resume = help.resume;
            if (help.search) this.lang.help.search = help.search;
            if (help.url) this.lang.help.url = help.url;
            if (help.next) this.lang.help.next = help.next;
            if (help.previous) this.lang.help.previous = help.previous;

            if (help.playlistParse) this.lang.help.playlistParse = help.playlistParse;
            if (help.playlistRemove) this.lang.help.playlistRemove = help.playlistRemove;
            if (help.playlistShuffle) this.lang.help.playlistShuffle = help.playlistShuffle;
            if (help.playlistPlay) this.lang.help.playlistPlay = help.playlistPlay;
            if (help.playlistSort) this.lang.help.playlistSort = help.playlistSort;

        }
        if (language.commands) {
            const { commands } = language;
            if (commands.destroy && Array.isArray(commands.loop)) this.lang.commands.destroy = [...commands.destroy, ...this.commands.destroy];
            if (commands.loop && Array.isArray(commands.loop)) this.lang.commands.loop = [...commands.loop, ...this.commands.loop];
            if (commands.help && Array.isArray(commands.help)) this.lang.commands.help = [...commands.help, ...this.commands.help];
            if (commands.next && Array.isArray(commands.next)) this.lang.commands.next = [...commands.next, ...this.commands.next];
            if (commands.previous && Array.isArray(commands.previous)) this.lang.commands.previous = [...commands.previous, ...this.commands.previous];
            if (commands.pause && Array.isArray(commands.pause)) this.lang.commands.pause = [...commands.pause, ...this.commands.pause];
            if (commands.replay && Array.isArray(commands.replay)) this.lang.commands.replay = [...commands.replay, ...this.commands.replay];
            if (commands.resume && Array.isArray(commands.resume)) this.lang.commands.resume = [...commands.resume, ...this.commands.resume];
            if (commands.playerCommands && Array.isArray(commands.playerCommands)) this.lang.commands.playerCommands = [...commands.playerCommands, ...this.commands.playerCommands];
            if (commands.url && Array.isArray(commands.url)) this.lang.commands.url = [...commands.url, ...this.commands.url];
            if (commands.search && Array.isArray(commands.search)) this.lang.commands.search = [...commands.search, ...this.commands.search];
            if (commands.playlist && Array.isArray(commands.playlist)) this.lang.commands.playlist = [...commands.playlist, ...this.commands.playlist];
            if (commands.playlistCommands) {
                const { playlistCommands } = commands;
                if (playlistCommands.parse && Array.isArray(playlistCommands.parse)) this.lang.commands.playlistCommands.parse = [...commands.playlistCommands.parse, ...this.commands.playlistCommands.parse];
                if (playlistCommands.remove && Array.isArray(playlistCommands.remove)) this.lang.commands.playlistCommands.remove = [...commands.playlistCommands.remove, ...this.commands.playlistCommands.remove];
                if (playlistCommands.shuffle && Array.isArray(playlistCommands.shuffle)) this.lang.commands.playlistCommands.shuffle = [...commands.playlistCommands.shuffle, ...this.commands.playlistCommands.shuffle];
                if (playlistCommands.sort && Array.isArray(playlistCommands.sort)) this.lang.commands.playlistCommands.sort = [...commands.playlistCommands.sort, ...this.commands.playlistCommands.sort];
                if (playlistCommands.force && Array.isArray(playlistCommands.force)) this.lang.commands.playlistCommands.force = [...commands.playlistCommands.force, ...this.commands.playlistCommands.force];
            }

        }
    }
    setPrefix(prefix: string) {
        this.lang.prefix = prefix;
    }

    getLang() {
        return this.lang;
    }

    incorrectUse() {
        return this.lang.incorrectUse
            .replace(/<PLAYER>/g, this.lang.commands.playerCommands[0])
            .replace(/<HELP>/g, this.lang.commands.playerCommands[0])
            .replace(/<PREFIX>/g, this.lang.commands.playerCommands[0]);
    }

    help(prefix?: string) {
        const prefixToChange = prefix ? prefix : this.lang.prefix;
        const help: string[] = [];
        for (const k of Object.entries(this.lang.help)) {
            help.push(k[1]
                .replace(/<PREFIX>/g, prefixToChange)
                .replace(/<PLAYER>/g, this.lang.commands.playerCommands[0])
                .replace(/<DESTROY>/g, this.lang.commands.destroy[0])
                .replace(/<REPLAY>/g, this.lang.commands.replay[0])
                .replace(/<LOOP>/g, this.lang.commands.loop[0])
                .replace(/<HELP>/g, this.lang.commands.help[0])
                .replace(/<PAUSE>/g, this.lang.commands.pause[0])
                .replace(/<RESUME>/g, this.lang.commands.resume[0])
                .replace(/<SEARCH>/g, this.lang.commands.search[0])
                .replace(/<URL>/g, this.lang.commands.url[0])
                .replace(/<NEXT>/g, this.lang.commands.next[0])
                .replace(/<PREVIOUS>/g, this.lang.commands.previous[0])
                .replace(/<PLAYLIST>/g, this.lang.commands.playlist[0])
                .replace(/<PPARSE>/g, this.lang.commands.playlistCommands.parse[0])
                .replace(/<PREMOVE>/g, this.lang.commands.playlistCommands.remove[0])
                .replace(/<PSHUFFLE>/g, this.lang.commands.playlistCommands.shuffle[0])
                .replace(/<PPLAY>/g, this.lang.commands.playlistCommands.force[0])
                .replace(/<PSORT>/g, this.lang.commands.playlistCommands.sort[0]));
        }
        return help;
    }
}
