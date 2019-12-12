import { RichEmbed, TextChannel, Message } from 'discord.js';
import { YoutubePlayer, playerLanguage } from './YoutubePlayer';
import { VideoInfo } from './interfaces';
import { PlaylistItem } from './playlist';

export class Embeds {

    static infoEmbed(msg: string, title = 'Info') {
        const embed = basicEmbed();
        embed.setColor('GOLD');
        embed.addField(title, msg);
        return embed;
    }

    static errorEmbed(msg: string, title = 'Info') {
        const embed = basicEmbed();
        embed.setColor('RED');
        embed.addField(title, msg);
        return embed;
    }

}

function basicEmbed() {
    const embed = new RichEmbed();
    embed.setTimestamp(Date.now());
    return embed;
}

export function errorInfo(channel: TextChannel, content: string, deleteNumber?: number): Promise<Message | Message[]> {
    return new Promise((resolve, rejects) => {
        if (canEmbed(channel as TextChannel)) {
            channel.send(Embeds.errorEmbed(content))
                .then(m => {
                    if (deleteNumber) {
                        setTimeout(() => {
                            if (!Array.isArray(m)) m.delete().catch(() => { });
                            else m.forEach(m => m.delete().catch(() => { }));
                        }, deleteNumber);
                    }
                    resolve(m);
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        } else {
            channel.send(content)
                .then(m => {
                    if (deleteNumber) {
                        setTimeout(() => {
                            if (!Array.isArray(m)) m.delete().catch(() => { });
                            else m.forEach(m => m.delete().catch(() => { }));
                        }, deleteNumber);
                    }
                    resolve(m);
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        }
    });
}

export function info(channel: TextChannel, content: string, deleteNumber?: number): Promise<Message | Message[]> {
    return new Promise((resolve, rejects) => {
        if (canEmbed(channel as TextChannel)) {
            channel.send(Embeds.infoEmbed(content))
                .then(m => {
                    resolve(m);
                    if (deleteNumber) {
                        setTimeout(() => {
                            if (!Array.isArray(m)) m.delete().catch(() => { });
                            else m.forEach(m => m.delete().catch(() => { }));
                        }, deleteNumber);
                    }
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        } else {
            channel.send(content)
                .then(m => {
                    resolve(m);
                    if (deleteNumber) {
                        setTimeout(() => {
                            if (!Array.isArray(m)) m.delete().catch(() => { });
                            else m.forEach(m => m.delete().catch(() => { }));
                        }, deleteNumber);
                    }
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        }
    });
}

export function addBasicInfo(playerObject: YoutubePlayer, embed: RichEmbed, playlistItem: PlaylistItem) {
    const videoInfo = playlistItem.videoData ? playlistItem.videoData : playlistItem.videoInfo;
    const language = playerLanguage.get(playerObject)!.getLang();
    embed.setAuthor(videoInfo.author.avatar, videoInfo.author.name, videoInfo.author.channel_url);
    embed.setTitle(videoInfo.title);
    embed.setColor('RED');
    embed.setURL(videoInfo.video_url);
    embed.setThumbnail(videoInfo.thumbnail_url);

    const date = new Date(videoInfo.published);

    const day = date.getDate();
    const month = language.video.monthsName[date.getMonth()];
    const year = date.getFullYear();
    embed.addField(language.video.published, `${day} ${month} ${year}`, true);

    const richVideoInfo = videoInfo as VideoInfo;
    if (richVideoInfo.statistics) {
        const viewCount = richVideoInfo.statistics.viewCount.toString().match(/.{1,3}/g); // .join(',')
        const views = richVideoInfo.statistics.viewCount < 10000 ? richVideoInfo.statistics.viewCount : viewCount ? viewCount.join(',') : viewCount;
        const commentCount = richVideoInfo.statistics.viewCount.toString().match(/.{1,3}/g);
        const comments = richVideoInfo.statistics.commentCount < 10000 ? richVideoInfo.statistics.commentCount : commentCount ? commentCount.join(',') : commentCount;
        let likes = richVideoInfo.statistics.likeCount < 1000 ? richVideoInfo.statistics.likeCount.toString() : (richVideoInfo.statistics.likeCount / 1000).toFixed(1) + 'K';
        let disLike = richVideoInfo.statistics.dislikeCount < 1000 ? richVideoInfo.statistics.dislikeCount.toString() : (richVideoInfo.statistics.dislikeCount / 1000).toFixed(1) + 'K';

        if (likes.includes('K') && likes.slice(likes.length - 3, likes.length - 1) === '.0') {
            likes = likes.slice(0, likes.length - 3) + 'K';
        }
        if (disLike.includes('K') && disLike.slice(disLike.length - 3, disLike.length - 1) === '.0') {
            disLike = disLike.slice(0, disLike.length - 3) + 'K';
        }

        embed.addField(language.video.views, views, true);
        embed.addField(language.video.ratting, `${language.video.upVote}${likes}  ${language.video.downVote}${disLike}`, true);
        embed.addField(language.video.comments, comments, true);
    }
    return embed;
}

export function canEmbed(channel?: TextChannel | undefined): boolean {
    if (!channel) return false;
    const me = channel.permissionsFor(channel.guild.me);
    if (!me) return false;
    return me.has('EMBED_LINKS');
}

// TODO : Fix it **test** *
export function discordEscapedCharacters(text: string) {
    return text
        .replace(/`/g, '\`')
        .replace(/\*/g, '\*')
        .replace(/\*/g, '\_');
}
