import * as SimpleYoutubeApi from 'simple-youtube-api';

export interface VideoData {
    id: string
    url: string
    title: string
    duration: number
    channel: Channel
    thumbnail: string
    publishedAt: Date
    statistics: VideoStatistic
    //  statistics: VideoStatistic
}

interface VideoStatistic {
    commentCount: number
    dislikeCount: number
    favoriteCount: number
    likeCount: number
    viewCount: number

}

interface Channel {
    id: string
    title: string
    thumbnail: string
}




export class Youtube {

    static getVideoInfo(youtubeApiKey: string, url) {
        return new Promise(async (resolve, reject) => {
            const youtube = new SimpleYoutubeApi(youtubeApiKey)

            await youtube.getVideo(url, { "part": ["statistics", "id", "snippet", "contentDetails"] })
                .then(async video => {
                    resolve(formatVideo(video, youtube));
                })
                .catch(error => {
                    reject(error as Error);
                })
        })
    }
    static searchOnLuck(youtubeApiKey: string, searchQuerry: string) {
        return new Promise((resolve, reject) => {

            const youtube = new SimpleYoutubeApi(youtubeApiKey)

            youtube.searchVideos(searchQuerry, 1)
                .then(video => {
                    if (video.length === 0) return reject(new Error("Nothing found"))

                    youtube.getVideoByID(video[0].id, { "part": ["statistics", "id", "snippet", "contentDetails"] })
                        .then(async video => {
                            resolve(formatVideo(video, youtube));
                        })
                        .catch(error => {
                            reject(error as Error);
                        })

                })
                .catch(error => {
                    reject(error as Error);
                })
        })
    }
}

async function formatVideo(video, youtube) {
    const channel = await youtube.getChannelByID(video.channel.id).catch(() => { })
    const length = ((parseInt(video.duration.hours) * 60 * 60) + (parseInt(video.duration.minutes) * 60) + parseInt(video.duration.seconds)) * 1000

    let videoThumbnail = null;
    if (video.thumbnails.high) videoThumbnail = video.thumbnails.high.url
    else if (video.thumbnails.medium) videoThumbnail = video.thumbnails.medium.url
    else if (video.thumbnails.default) videoThumbnail = video.thumbnails.default.url
    else if (video.thumbnails.standard) videoThumbnail = video.thumbnails.standard.url

    let channelThumbnail = null;
    if (channel.thumbnails.medium) channelThumbnail = channel.thumbnails.default.url
    else if (channel.thumbnails.default) channelThumbnail = channel.thumbnails.standard.url
    else if (channel.thumbnails.standard) channelThumbnail = channel.thumbnails.medium.url

    const videoData: VideoData = {
        id: video.id,
        url: `https://youtu.be/${video.id}`,
        thumbnail: videoThumbnail,
        title: video.title,
        duration: length,
        publishedAt: video.publishedAt,
        statistics: {
            commentCount: parseInt(video.raw.statistics.commentCount),
            dislikeCount: parseInt(video.raw.statistics.dislikeCount),
            favoriteCount: parseInt(video.raw.statistics.favoriteCount),
            likeCount: parseInt(video.raw.statistics.likeCount),
            viewCount: parseInt(video.raw.statistics.viewCount)
        },
        channel: {
            id: channel.id,
            title: channel.title,
            thumbnail: channelThumbnail
        }
    }

    return videoData as VideoData

}