import { VideoInfo } from './interfaces';
// @ts-ignore Declaration files does not exist.
import SimpleYoutubeApi from 'simple-youtube-api';

export class Youtube {

    private simpleYoutubeApi: any;

    constructor(key: string) {
        this.simpleYoutubeApi = new SimpleYoutubeApi(key);
    }

    public async getVideoInfo(url: string) {
        const video = await this.simpleYoutubeApi.getVideo(url, { 'part': ['statistics', 'id', 'snippet', 'contentDetails'] })
        return await this.formatVideo(video);
    }

    public async searchOnLuck(searchQuery: string) {
        const videos = await this.simpleYoutubeApi.searchVideos(searchQuery, 1);
        if (videos.length === 0) throw new Error('Nothing found');
        const video = await this.simpleYoutubeApi.getVideoByID(videos[0].id, { 'part': ['statistics', 'id', 'snippet', 'contentDetails'] })
        return await this.formatVideo(video);
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
            // eslint-disable-next-line @typescript-eslint/camelcase
            video_id: video.id,
            // eslint-disable-next-line @typescript-eslint/camelcase
            video_url: `https://youtu.be/${video.id}`,
            // eslint-disable-next-line @typescript-eslint/camelcase
            thumbnail_url: videoThumbnail,
            title: video.title,
            // eslint-disable-next-line @typescript-eslint/camelcase
            length_seconds: length / 60 / 60,
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
                // eslint-disable-next-line @typescript-eslint/camelcase
                channel_url: `https://www.youtube.com/channel/${channel.id}`,
            },
        };
        return videoData;
    }
}
