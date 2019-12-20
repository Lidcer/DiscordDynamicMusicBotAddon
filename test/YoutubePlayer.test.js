
const ypp = require('../dist/YoutubePlayer');

let config = {};
try {
    config = require('./testConfig.json');
} catch (_) {/*do nothing */ }

const mockGuild = {
    id: '0000',
    name: 'Test Guild',
    iconUrl: null,
    me: {
        has: (permission) => {
            if (permission === "EMBED_LINKS") return true;
            return false;
        }
    }
}
const mockUser = {
    id: '0000000',
    tag: 'test#000',
    bot: false,
    discriminator: '00000',
    username: 'test',
    avatar: null,
    toString: '<@0000000>'
}

const mockMessage = {
    author: mockUser,
    member: {
        user: this.author,
        nickname: 'nickname',
        displayedName: 'nickname'
    },
    guild: mockGuild,
    me: mockUser,
    channel: {
        guild: mockGuild,
        send: () => {
            return {
                resolve: () => null,
                "catch": () => null,
            }
        },
        permissionsFor: (guildMember) => {
            return {
                has: (string) => {
                    return true;
                }
            }
        },
    },
    guild: mockGuild,
    client: {
        on: (string, something) => { }
    },
    content: '',
    cleanContent: this.content
}


describe('Test Youtube Player', () => {

    const youtube = new ypp.YoutubePlayer(config.YOUTUBE_API_KEY);

    it('should throw if deleteUserMessages property is not boolean', () => {
        expect(() => {
            youtube.deleteUserMessages = {};
        }).toThrow();
    });

    it('should throw if leaveVoiceChannelAfter property is not number', () => {
        expect(() => {
            youtube.leaveVoiceChannelAfter = {};
        }).toThrow();
    });

    it('should throw if maxTrackLength property is not number', () => {
        expect(() => {
            youtube.maxTrackLength = {};
        }).toThrow();
    });

    it('should throw if maxTrackLength it s less than 5 second', () => {
        expect(() => {
            youtube.maxTrackLength = 0;
        }).toThrow();
    });

    it('should throw if playerUpdateRate property is not number', () => {
        expect(() => {
            youtube.playerUpdateRate = {};
        }).toThrow();
    });

    it('should throw if playerUpdateRate it s less than 5 second', () => {
        expect(() => {
            youtube.playerUpdateRate = 0;
        }).toThrow();
    });

    it('should throw if leaveVoiceChannelAfter property is not number', () => {
        expect(() => {
            youtube.leaveVoiceChannelAfter = {};
        }).toThrow();
    });

    it('should throw if usePatch property is not number', () => {
        expect(() => {
            youtube.usePatch = {};
        }).toThrow();
    });

    it('should throw if waitTimeBetweenTracks property is not number', () => {
        expect(() => {
            youtube.waitTimeBetweenTracks = {};
        }).toThrow();
    });

    it('should throw if languagePack is not object', () => {
        expect(() => {
            youtube.languagePack = 0;
        }).toThrow();
    });

    it('should throw if maxItemsInPlaylist is not number', () => {
        expect(() => {
            youtube.maxItemsInPlaylist = {};
        }).toThrow();
    });

    it('should throw if maxItemsInPlaylist is less than 1', () => {
        expect(() => {
            youtube.maxItemsInPlaylist = 0;
        }).toThrow();
    });

    it('should throw if maxUsersItemsInPlaylist is not number', () => {
        expect(() => {
            youtube.maxUsersItemsInPlaylist = {};
        }).toThrow();
    });

    it('should throw if maxUsersItemsInPlaylist is less than 1', () => {
        expect(() => {
            youtube.maxUsersItemsInPlaylist = 0;
        }).toThrow();
    });

    it('should throw if languagePack is not object', () => {
        expect(() => {
            youtube.languagePack = 0;
        }).toThrow();
    });

    it('should works', () => {
        const msg = { ...mockMessage };
        msg.content = '!p';
        msg.cleanContent = '!p';
        youtube.onMessagePrefix(msg, '!')
    });
});