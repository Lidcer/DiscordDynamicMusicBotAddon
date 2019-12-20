const yt = require('../dist/Youtube');
let config = {};
try {
    config = require('./testConfig.json');
} catch (_) {/*do nothing */ }


describe('Test Youtube', () => {

    it('should throw if youtube api key is empty', () => {
        expect(() => {
            new yt.Youtube();
        }).toThrow();
    });

    //     it('Should throw if youtube api key is not correct', async () => {
    //         expect(async () => {
    //             const youtube = new yt.Youtube('abc');
    //            const query = 'me in zoo';

    //             await youtube.searchOnLuck(query);
    //         }).toThrow();
    //    });

    if (config.YOUTUBE_API_KEY) {

        it('Should fetch video info from youtube', async () => {
            const youtube = new yt.Youtube(config.YOUTUBE_API_KEY);
            const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // First video ever uploaded to youtube

            const firstVideoOnYoutube = await youtube.getVideoInfo(url);
            expect(firstVideoOnYoutube).toHaveProperty('statistics');
        });

        it('Should search for random video then output it as info from youtube', async () => {
            const youtube = new yt.Youtube(config.YOUTUBE_API_KEY);
            const query = 'me in zoo';

            const firstVideoOnYoutube = await youtube.searchOnLuck(query);
            expect(firstVideoOnYoutube).toHaveProperty('statistics');
        });
    } else {
        console.warn(`Unable to fully test youtube. Youtube key is missing.`);
    }
});