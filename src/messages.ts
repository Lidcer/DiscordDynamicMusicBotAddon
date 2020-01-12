import { RichEmbed, TextChannel, Message, Guild } from 'discord.js';
import { YoutubePlayer } from './YoutubePlayer';
import { VideoInfo } from './interfaces';
import { PlaylistItem } from './GuildPlayer';
import { escapeRegExp } from 'lodash';
import { playerLanguage } from './language';

export class Embeds {

    static infoEmbed(msg: string, title = 'Info') {
        const embed = basicEmbed();
        embed.setColor('GOLD');
        embed.addField(title, msg);
        return embed;
    }

    static errorEmbed(msg: string, title = 'Error') {
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

export function errorInfo(channel: TextChannel, content: string, title: string, deleteTimeout?: number): Promise<Message | Message[]> {
    return new Promise((resolve, rejects) => {
        sendEmbed(channel, content, 'error', title, deleteTimeout)
            .then(result => resolve(result))
            .catch(err => rejects(err));
    });
}

export function info(channel: TextChannel, content: string, title: string, deleteTimeout?: number): Promise<Message | Message[]> {
    return new Promise((resolve, rejects) => {
        sendEmbed(channel, content, 'info', title, deleteTimeout)
            .then(result => resolve(result))
            .catch(err => rejects(err));
    });
}

export function sendEmbed(channel: TextChannel, content: string, type: 'info' | 'error', title: string, deleteTimeout?: number): Promise<Message | Message[]> {
    return new Promise((resolve, rejects) => {
        let embed: RichEmbed;
        switch (type) {
            case 'error':
                embed = Embeds.errorEmbed(content, title);
                break;
            case 'info':
                embed = Embeds.infoEmbed(content, title);
                break;
            default:
                rejects(new Error('type not specified'));
                return;
        }
        if (canEmbed(channel as TextChannel)) {

            channel.send(embed)
                .then(m => {
                    resolve(m);
                    deleteMsg(m, deleteTimeout);
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        } else {
            channel.send(stringifyRichEmbed(embed, channel.guild))
                .then(m => {
                    resolve(m);
                    deleteMsg(m, deleteTimeout);
                })
                .catch(error => {
                    rejects(error);
                    channel.client.emit('error', error);
                });
        }
    });
}

export function stringifyRichEmbed(richEmbed: RichEmbed, guild: Guild) {
    const content: string[] = [];
    const markUp = '```';
    if (richEmbed.author) {
        content.push(removeMarkup(richEmbed.author.name, guild));
        if (richEmbed.author.url) {
            content.push(richEmbed.author.url);
        }
        content.push('\n');
    }
    if (richEmbed.title) {
        content.push(removeMarkup(richEmbed.title, guild));
        content.push('\n');
    }
    if (richEmbed.description) {
        content.push(removeMarkup(richEmbed.description, guild));
        content.push('\n');
    }
    if (richEmbed.fields) {
        for (const field of richEmbed.fields) {
            content.push(removeMarkup(field.name, guild));
            content.push(`  ${removeMarkup(field.value, guild).split('\n').join('\n  ')}`);
        }
    }
    if (richEmbed.footer && richEmbed.footer.text) {
        content.push(removeMarkup(richEmbed.footer.text, guild));
    }

    return `${markUp}\n${content.join('\n')}${markUp}`;
}

function removeMarkup(text: string, guild: Guild) {
    if (!text) return text;
    const underlines = text.match(/__[\S]*__/gi);
    if (underlines)
        for (const underline of underlines) {
            const removed = underline.slice(2, -2);
            text = text.replace(underline, removed);
        }
    const embedPreventers = text.match(/<[\S]*>/gi);
    if (embedPreventers)
        for (const embedPreventer of embedPreventers) {
            const removed = embedPreventer.slice(1, -1);
            text = text.replace(embedPreventer, removed);
        }

    const codes = text.match(/```[\S\n\t ]*```/gi);
    if (codes)
        for (const code of codes) {
            const removed = code.slice(3, -3);
            text = text.replace(code, removed);
        }

    const codeBlocks = text.match(/`[\S ]*`/gi);
    if (codeBlocks)
        for (const codeBlock of codeBlocks) {
            const removed = codeBlock.slice(1, -1);
            text = text.replace(codeBlock, removed);
        }

    const bolds = text.match(/\*\*[\S]*\*\*/gi);
    if (bolds)
        for (const bold of bolds) {
            const removed = bold.slice(2, -2);
            text = text.replace(bold, removed);
        }
    const italics = text.match(/\*[\S]*\*|_[\S]*_/gi);
    if (italics)
        for (const italic of italics) {
            const removed = italic.slice(1, -1);
            text = text.replace(italic, removed);
        }

    const strikes = text.match(/```[\S]*```/gi);
    if (strikes)
        for (const strike of strikes) {
            const removed = strike.slice(2, -2);
            text = text.replace(strike, removed);
        }
    const links = text.match(/\[[\S ]*\]\([\S]*\)/gi);
    if (links)
        for (const link of links) {
            const removed = link.replace(/[\)\]]/g, '').replace(/[\(\[]/g, '\n');
            text = text.replace(link, removed);
        }
    const users = text.match(/<@[0-9]*>/gi);
    if (users)
        for (const user of users) {
            const id = user.replace(/[<@!>]/g, '');
            const guildUser = guild.members.find(u => u.user.id === id);
            if (guildUser) {
                text = text.replace(user, guildUser.displayName);
            } else {
                const discordUser = guild.client.users.find(u => u.id === id);
                if (discordUser) text = text.replace(user, discordUser.tag);
            }
        }
    const channels = text.match(/<#[0-9]*>/gi);
    if (channels)
        for (const channel of channels) {
            const id = channel.replace(/[<#!\>]/g, '');
            const guildChannel = guild.channels.find(c => c.id === id);
            if (guildChannel)
                text = text.replace(channel, guildChannel.name);
        }
    return text;
}

function deleteMsg(msg: Message | Message[], deleteTimeout: number | undefined) {
    if (deleteTimeout) {
        setTimeout(() => {
            multipleMessagesToOne(msg, on => { on.delete().catch(err => { on.client.emit(err); }); });
        }, deleteTimeout);
    }
}

export function addBasicInfo(playerObject: YoutubePlayer, embed: RichEmbed, playlistItem: PlaylistItem, guild: Guild) {
    const videoInfo = playlistItem.videoData ? playlistItem.videoData : playlistItem.videoInfo;
    const language = playerLanguage.get(playerObject)!.getLang();
    const regExp = /.*\.png$|.*\.jpg$|.*\.jpeg$|.*\.jpe$|.*\.gif$/g;
    if (regExp.test(videoInfo.author.avatar)) {
        embed.setAuthor(videoInfo.author.avatar, removeMarkup(videoInfo.author.name, guild), videoInfo.author.channel_url);
        embed.setTitle(videoInfo.title);
    } else {
        embed.setDescription(`[${removeMarkup(videoInfo.author.name, guild)}](${videoInfo.author.channel_url})\n**[${removeMarkup(videoInfo.title, guild)}](${videoInfo.video_url})**`);
    }
    embed.setColor('RED');
    embed.setURL(videoInfo.video_url);
    if (regExp.test(videoInfo.thumbnail_url)) embed.setThumbnail(videoInfo.thumbnail_url);

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

export function canManageMessage(channel?: TextChannel | undefined): boolean {
    if (!channel) return false;
    const me = channel.permissionsFor(channel.guild.me);
    if (!me) return false;
    return me.has('MANAGE_MESSAGES');
}

export function canAddReaction(channel?: TextChannel | undefined): boolean {
    if (!channel) return false;
    const me = channel.permissionsFor(channel.guild.me);
    if (!me) return false;
    return me.has('ADD_REACTIONS');
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

export function arrayReplace(text: string, character: string) {
    const rexExpEscapedcharacter = escapeRegExp(character);
    const array = text.match(new RegExp(`${rexExpEscapedcharacter}([\\s\\S]+?)${rexExpEscapedcharacter}`));
    if (!array) return text;
    for (const item of array) {
        const removedItem = item.replace(new RegExp(character), character);
        text = text.replace(removedItem, item);
    }
    return text;
}

export function multipleMessagesToOne(messages: Message | Message[], callback: (message: Message) => void) {
    if (Array.isArray(messages)) {
        for (const message of messages) {
            callback(message);
        }
    } else callback(messages);
}

export function deleteManyMessage(message: Message | Message[]) {
    multipleMessagesToOne(message, m => {
        m.delete().catch(error => m.client.emit('error', error));
    });
}
