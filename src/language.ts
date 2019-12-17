import { PlayerLanguage } from './interfaces';

export class Language {
    lang: PlayerLanguage = {
        notInVoiceChannel: 'You have to be in voice channel in order to use player commands!',
        cannotConnect: 'Im unable to connect to this channel! 😐',
        onlyYoutubeLinks: 'Sorry but only Youtube links are supported',
        incorrectUse: 'You are using player command incorrectly. Type `player help` to get more info',
        videoAdded: 'Added by',
        luckSearch: 'with luck search',
        missingPermission: 'Missing permission you need to have role DJ to use command or being alone in channel also works.',
        alreadyOnPlaylist: 'Requested track is already on playlist!',
        prefix: '',
        toLongTrack: 'Requested track <trackurl> to long. Max length of track <maxlength> minutes',
        toLongTrackLuckSearch: 'Track <trackname> is to long to be played. Max length of track <maxlength> minutes',
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
            searching: `🔎 Searching... (URL)`,
            created: 'Player has been created',
            destroy: 'Player has been destroyed',
            brokenUrl: 'Broken link',
            paused: 'Player has been paused by',
            resumed: 'Player has been resumed by',
            shuffled: 'Playlist has been shuffled',
            replay: 'Your song is going to be replayed when this song ends',
            forceReplay: 'Executing force replay',
            alreadyOnReplay: 'This song is already on list for replay',
            skip: 'Track has been skipped',
            nothingToShuffle: 'Playlist does not have enough song to shuffle',
            statusPaused: 'Paused',
            statusPlaying: 'Playing',
            loopingOn: '🔁 Looping this song is now enabled ✔️',
            loopingOff: '🔁 Looping this song is not disabled ❌',
            error: 'Error',
            previous: 'Track switched to previous track',
        },
        help: {
            destroy: '<prefix>player destroy - to destroy player',
            replay: '<prefix>player replay - to replay track',
            pause: '<prefix>player pause - to pause the track',
            resume: '<prefix>player resume - to resumes paused track',
            search: '<prefix>player search [search query] - to search youtube',
            skip: '<prefix>player skip - to skips track',
            url: '<prefix>player <youtube url> - to player url',
        },
        commands: {
            destroy: ['destroy', 'kill', 'leave'],
            loop: ['loop', 'repeat'],
            help: ['help', '?'],
            shuffle: ['shuffle', 'mix'],
            next: ['next', '>>', 'skip', 'forward'],
            previous: ['previous', '<<', 'backwards'],
            pause: ['pause'],
            replay: ['replay'],
            resume: ['resume'],
            playerCommands: ['player', 'p'],
        },
        vote: {
            voteNext: 'You vote for switch to next song (VOTED_USERS)/(TOTAL_USERS)',
            votePrevious: 'You vote for switch to previous song (VOTED_USERS)/(TOTAL_USERS)',
            removedVote: 'Your vote has been removed',
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
            if (player.searching) this.lang.player.searching = player.searching;
            if (player.helpCommand) this.lang.player.helpCommand = player.helpCommand;
            if (player.created) this.lang.player.created = player.created;
            if (player.destroy) this.lang.player.destroy = player.destroy;
            if (player.brokenUrl) this.lang.player.brokenUrl = player.brokenUrl;
            if (player.paused) this.lang.player.paused = player.paused;
            if (player.resumed) this.lang.player.resumed = player.resumed;
            if (player.shuffled) this.lang.player.shuffled = player.shuffled;
            if (player.replay) this.lang.player.replay = player.replay;
            if (player.forceReplay) this.lang.player.forceReplay = player.forceReplay;
            if (player.alreadyOnReplay) this.lang.player.alreadyOnReplay = player.alreadyOnReplay;
            if (player.skip) this.lang.player.skip = player.skip;
            if (player.nothingToShuffle) this.lang.player.nothingToShuffle = player.nothingToShuffle;
            if (player.statusPaused) this.lang.player.statusPaused = player.statusPaused;
            if (player.statusPlaying) this.lang.player.statusPlaying = player.statusPlaying;
            if (player.loopingOn) this.lang.player.loopingOn = player.loopingOn;
            if (player.loopingOff) this.lang.player.loopingOff = player.loopingOff;
            if (player.error) this.lang.player.error = player.error;
        }
        if (language.help) {
            const { help } = language;
            if (help.destroy) this.lang.help.destroy = help.destroy;
            if (help.replay) this.lang.help.replay = help.replay;
            if (help.pause) this.lang.help.pause = help.pause;
            if (help.resume) this.lang.help.resume = help.resume;
            if (help.search) this.lang.help.search = help.search;
            if (help.skip) this.lang.help.skip = help.skip;
            if (help.url) this.lang.help.url = help.url;
        }
        if (language.commands) {
            const { commands } = language;
            if (commands.destroy && Array.isArray(commands.loop)) this.lang.commands.destroy = commands.destroy;
            if (commands.loop && Array.isArray(commands.loop)) this.lang.commands.loop = commands.loop;
            if (commands.help && Array.isArray(commands.help)) this.lang.commands.help = commands.help;
            if (commands.shuffle && Array.isArray(commands.shuffle)) this.lang.commands.shuffle = commands.shuffle;
            if (commands.playerCommands && Array.isArray(commands.playerCommands)) this.lang.commands.playerCommands = commands.playerCommands;
            if (commands.pause && Array.isArray(commands.pause)) this.lang.commands.pause = commands.pause;
            if (commands.replay && Array.isArray(commands.replay)) this.lang.commands.replay = commands.replay;
            if (commands.resume && Array.isArray(commands.resume)) this.lang.commands.resume = commands.resume;
        }
    }
    setPrefix(prefix: string) {
        this.lang.prefix = prefix;
    }

    getLang() {
        return this.lang;
    }

    help(prefix?: string) {
        const prefixToChange = prefix ? prefix : this.lang.prefix;
        const object = { ...this.lang.help };
        const keys = Object.keys(object);
        for (const key of keys) {
            // @ts-ignore // FIXME : FIX THAT
            object[key] = object[key].replace(/<prefix>/g, prefixToChange);
        }
        return object;
    }
}
