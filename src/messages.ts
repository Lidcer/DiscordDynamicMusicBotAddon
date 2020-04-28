import { TextChannel, Message, Guild, MessageEmbed } from 'discord.js';
import { YoutubePlayer } from './YoutubePlayer';
import { VideoInfo } from './interfaces';
import { PlaylistItem } from './GuildPlayer';
import { escapeRegExp } from 'lodash';
import { playerLanguage } from './language';

export class Embeds {

    static infoEmbed(msg: string, title = 'Info') {
        return basicEmbed().setColor('GOLD').addField(title, msg);
    }

    static errorEmbed(msg: string, title = 'Error') {
        return basicEmbed().setColor('RED').addField(title, msg);
    }
}

function basicEmbed() {
    return new MessageEmbed().setTimestamp(Date.now());
}

export async function errorInfo(channel: TextChannel, content: string, title: string, deleteTimeout?: number) {
    return await sendEmbed(channel, content, 'error', title, deleteTimeout);
}

export async function info(channel: TextChannel, content: string, title: string, deleteTimeout?: number) {
    return await sendEmbed(channel, content, 'info', title, deleteTimeout);
}

export async function sendEmbed(channel: TextChannel, content: string, type: 'info' | 'error', title: string, deleteTimeout?: number) {
    let embed: MessageEmbed;
    switch (type) {
        case 'error':
            embed = Embeds.errorEmbed(content, title);
            break;
        case 'info':
            embed = Embeds.infoEmbed(content, title);
            break;
        default:
            throw new Error('type not specified');
    }
    if (canEmbed(channel as TextChannel)) {
        const message = await channel.send(embed);
        deleteMsg(message, deleteTimeout);
        return message;
    } else {
        const message = await channel.send(await stringifyRichEmbed(embed, channel.guild));
        deleteMsg(message, deleteTimeout);
        return message;
    }
}

export async function stringifyRichEmbed(richEmbed: MessageEmbed, guild: Guild) {
    const content: string[] = [];
    const markUp = '```';
    if (richEmbed.author) {
        content.push(await removeMarkup(richEmbed.author.name || '', guild));
        if (richEmbed.author.url) {
            content.push(richEmbed.author.url);
        }
        content.push('\n');
    }
    if (richEmbed.title) {
        content.push(await removeMarkup(richEmbed.title, guild));
        content.push('\n');
    }
    if (richEmbed.description) {
        content.push(await removeMarkup(richEmbed.description, guild));
        content.push('\n');
    }
    if (richEmbed.fields) {
        for (const field of richEmbed.fields) {
            content.push(await removeMarkup(field.name, guild));
            const value = await removeMarkup(field.value, guild);
            content.push(`  ${value.split('\n').join('\n  ')}`);
        }
    }
    if (richEmbed.footer && richEmbed.footer.text) {
        content.push(await removeMarkup(richEmbed.footer.text, guild));
    }

    return `${markUp}\n${content.join('\n')}${markUp}`;
}

async function removeMarkup(text: string, guild: Guild) {
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
            const removed = link.replace(/[)\]]/g, '').replace(/[([]/g, '\n');
            text = text.replace(link, removed);
        }
    const users = text.match(/<@[0-9]*>/gi);
    if (users)
        for (const user of users) {
            const id = user.replace(/[<@!>]/g, '');
            const guildUser = await guild.members.fetch(id);
            if (guildUser) {
                text = text.replace(user, guildUser.displayName);
            } else {
                const discordUser = await guild.client.users.fetch(id);
                if (discordUser) text = text.replace(user, discordUser.tag);
            }
        }
    const channels = text.match(/<#[0-9]*>/gi);
    if (channels)
        for (const channel of channels) {
            const id = channel.replace(/[<#!>]/g, '');
            const guildChannel = await guild.channels.resolve(id);
            if (guildChannel)
                text = text.replace(channel, guildChannel.name);
        }
    return text;
}

function deleteMsg(msg: Message, deleteTimeout: number | undefined) {
    if (deleteTimeout) {
        setTimeout(() => {
            msg.delete().catch((e) => { msg.client.emit('error', e); });
        }, deleteTimeout);
    }
}

export async function addBasicInfo(playerObject: YoutubePlayer, embed: MessageEmbed, playlistItem: PlaylistItem, guild: Guild) {
    const videoInfo = playlistItem.videoData ? playlistItem.videoData : playlistItem.videoInfo;
    const language = playerLanguage.get(playerObject)!.getLang();
    const regExp = /.*\.png$|.*\.jpg$|.*\.jpeg$|.*\.jpe$|.*\.gif$/g;
    if (regExp.test(videoInfo.author.avatar)) {
        try {
            embed.setAuthor(videoInfo.author.avatar, await removeMarkup(videoInfo.author.name, guild), videoInfo.author.channel_url);
        } catch (_) {
            embed.setAuthor(videoInfo.author.avatar, await removeMarkup(videoInfo.author.name, guild));
        }
        if (videoInfo.title) embed.setTitle(videoInfo.title);
    } else {
        const author = videoInfo.author.name ? `[${await removeMarkup(videoInfo.author.name, guild)}](${videoInfo.author.channel_url})\n` : '';
        embed.setDescription(`${author}**[${await removeMarkup(videoInfo.title, guild)}](${videoInfo.video_url})**`);
    }
    embed.setColor('RED');
    try {
        embed.setURL(videoInfo.video_url);
    } catch (_) { /* ignored */ }

    if (regExp.test(videoInfo.thumbnail_url)) embed.setThumbnail(videoInfo.thumbnail_url);

    const date = new Date(videoInfo.published);

    const day = date.getDate();
    const month = language.video.monthsName[date.getMonth()];
    const year = date.getFullYear();
    if (day || month || year)
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
    if (!channel || !channel.guild || !channel.guild.me) return false;
    const me = channel.permissionsFor(channel.guild.me);
    if (!me) return false;
    return me.has('EMBED_LINKS');
}

export function canManageMessage(channel?: TextChannel | undefined): boolean {
    if (!channel || !channel.guild || !channel.guild.me) return false;
    const me = channel.permissionsFor(channel.guild.me);
    if (!me) return false;
    return me.has('MANAGE_MESSAGES');
}

export function canAddReaction(channel?: TextChannel | undefined): boolean {
    if (!channel || !channel.guild || !channel.guild.me) return false;
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
