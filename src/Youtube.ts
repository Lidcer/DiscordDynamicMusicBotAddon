import { VideoInfo } from './interfaces';
// @ts-ignore Declaration files does not exist.
const SimpleYoutubeApi = require('simple-youtube-api');

export class Youtube {

    private simpleYoutubeApi: any;

    constructor(key: string) {
        this.simpleYoutubeApi = new SimpleYoutubeApi(key);
    }

    public getVideoInfo(url: string): Promise<VideoInfo> {
        return new Promise(async (resolve, reject) => {
            await this.simpleYoutubeApi.getVideo(url, { 'part': ['statistics', 'id', 'snippet', 'contentDetails'] })
                .then(async (video: any) => {
                    resolve(await this.formatVideo(video));
                })
                .catch((error: any) => {
                    reject(error);
                });
        });
    }

    public searchOnLuck(searchQuery: string): Promise<VideoInfo> {
        return new Promise((resolve, reject) => {
            this.simpleYoutubeApi.searchVideos(searchQuery, 1)
                .then((video: any) => {
                    if (video.length === 0) return reject(new Error('Nothing found'));

                    this.simpleYoutubeApi.getVideoByID(video[0].id, { 'part': ['statistics', 'id', 'snippet', 'contentDetails'] })
                        .then(async (video: any) => {
                            resolve(await this.formatVideo(video));
                        })
                        .catch((error: any) => {
                            reject(error);
                        });

                })
                .catch((error: any) => {
                    reject(error);
                });
        });
    }

    private async formatVideo(video: any) {
        const channel = await this.simpleYoutubeApi.getChannelByID(video.channel.id).catch(() => console.error);
        const length = ((parseInt(video.duration.hours) * 60 * 60) + (parseInt(video.duration.minutes) * 60) + parseInt(video.duration.seconds)) * 1000;

        let videoThumbnail = '';
        if (video.thumbnails.high) videoThumbnail = video.thumbnails.high.url;
        else if (video.thumbnails.medium) videoThumbnail = video.thumbnails.medium.url;
        else if (video.thumbnails.default) videoThumbnail = video.thumbnails.default.url;
        else if (video.thumbnails.standard) videoThumbnail = video.thumbnails.standard.url;

        let channelThumbnail = '';
        if (channel.thumbnails.medium) channelThumbnail = channel.thumbnails.default.url;
        else if (channel.thumbnails.default) channelThumbnail = channel.thumbnails.standard.url;
        else if (channel.thumbnails.standard) channelThumbnail = channel.thumbnails.medium.url;
        const videoData: VideoInfo = {
            id: video.id,
            video_url: `https://youtu.be/${video.id}`,
            thumbnail_url: videoThumbnail,
            title: video.title,
            duration: length / 60 / 60,
            published: video.publishedAt,
            statistics: {
                commentCount: parseInt(video.raw.statistics.commentCount),
                dislikeCount: parseInt(video.raw.statistics.dislikeCount),
                favoriteCount: parseInt(video.raw.statistics.favoriteCount),
                likeCount: parseInt(video.raw.statistics.likeCount),
                viewCount: parseInt(video.raw.statistics.viewCount),
            },
            author: {
                id: channel.id,
                name: channel.title,
                avatar: channelThumbnail,
                channel_url: `https://www.youtube.com/channel/${channel.id}`,
            },
        };
        return videoData;
    }
}
