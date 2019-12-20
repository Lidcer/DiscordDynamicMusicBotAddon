import { RichEmbed, TextChannel, Message } from 'discord.js';
import { YoutubePlayer, playerLanguage } from './YoutubePlayer';
import { VideoInfo } from './interfaces';
import { PlaylistItem } from './GuildPlayer';
import { escapeRegExp } from 'lodash';

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
                            if (!Array.isArray(m)) m.delete()
                                .catch(err => {
                                    channel.client.emit(err);
                                });
                            else m.forEach(m => m.delete().catch(err => {
                                channel.client.emit(err);
                            }));
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
                            if (!Array.isArray(m)) m.delete().catch(err => {
                                channel.client.emit(err);
                            });
                            else m.forEach(m => m.delete().catch(err => {
                                channel.client.emit(err);
                            }));
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
                            if (!Array.isArray(m)) m.delete().catch(err => {
                                channel.client.emit(err);
                            });
                            else m.forEach(m => m.delete().catch(err => {
                                channel.client.emit(err);
                            }));
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
                            if (!Array.isArray(m)) m.delete().catch(err => {
                                channel.client.emit(err);
                            });
                            else m.forEach(m => m.delete().catch(err => {
                                channel.client.emit(err);
                            }));
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
    if (playlistItem.videoData) {
        console.log(playlistItem.videoData.author.avatar)
        embed.setAuthor(playlistItem.videoData.author.avatar, videoInfo.author.name, videoInfo.author.channel_url);
        embed.setTitle(videoInfo.title);
    } else {
        embed.setDescription(`[${videoInfo.author.name}](${videoInfo.author.channel_url})\n**[${videoInfo.title}](${videoInfo.video_url})**`);
    }
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
        const viewCount = richVideoInfo.statistics.viewCount.toString().match(/.{1,3}/g);
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

export function sliderGenerator(pos: number, maxPos: number) {
    let slider = '';
    const radioButtonPos = Math.floor(pos * 30 / maxPos);
    for (let i = 0; i < 30; i++) {
        if (radioButtonPos === i) slider += '🔘';
        else slider += '▬';
    }
    return slider;
}

// TODO : Fix it **test** *
export function discordEscapedCharacters(text: string) {
    const strikeThroughs = text.match(/~~([\s\S]+?)~~(?!_)/g);
    const spoilers = text.match(/||([\s\S]+?)||(?!_)/g);
    const graveAccents = text.match(/`([\s\S]+?)`(?!_)/g);
    const graveAccentTripples = text.match(/```([\s\S]+?)```(?!_)/g);
    const bolds = text.match(/\*\*([\s\S]+?)\*\*(?!_)/g);
    const italics = text.match(/\*([\s\S]+?)\*(?!_)/g);
    const underlines = text.match(/__([\s\S]+?)__(?!_)/g);

    if (strikeThroughs) text = arrayReplace(strikeThroughs, text, __)

    if (graveAccents) {
        for (const graveAccent of graveAccents) {
            const removedgraveAccent = graveAccent.replace(/`/g, '\\`');
            text = text.replace(graveAccent, removedgraveAccent);
        }
    }
    if (graveAccentTripples) {
        for (const graveAccentTripple of graveAccentTripples) {
            const removedgraveAccentTripple = graveAccentTripple.replace(/`/g, '\\`\\`\\`');
            text = text.replace(graveAccentTripple, removedgraveAccentTripple);
        }
    }

    if (spoilers) {
        for (const spoiler of spoilers) {
            const removedSpoiler = spoiler.replace(/~~/g, '\\|\\|');
            text = text.replace(spoiler, removedSpoiler);
        }
    }
    if (bolds) {
        for (const bold of bolds) {
            const removedbold = bold.replace(/\*\*/g, '\\*\\*');
            text = text.replace(bold, removedbold);
        }
    }
    if (italics) {
        for (const italic of italics) {
            const removeditalic = italic.replace(/\*/g, '\\*');
            text = text.replace(italic, removeditalic);
        }
    }
    if (underlines) {
        for (const underline of underlines) {
            const removedunderline = underline.replace(/__/g, '\\_\\_');
            text = text.replace(underline, removedunderline);
        }
    }
    return text;

}

export function arrayReplace(text: string, character: string) {
    const rexExpEscapedcharacter = escapeRegExp(character);
    console.log(rexExpEscapedcharacter)
    const array = text.match(new RegExp(`${rexExpEscapedcharacter}([\\s\\S]+?)${rexExpEscapedcharacter}`));
    console.log(array)
    if (!array) return text;
    for (const item of array) {
        const removedItem = item.replace(new RegExp(character), character);
        text = text.replace(removedItem, item);
    }
    return text;
}
