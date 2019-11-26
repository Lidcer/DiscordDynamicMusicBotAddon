import { Message, Guild, RichEmbed, TextChannel, VoiceChannel, } from 'discord.js';
import { Embeds } from './embeds';
import * as ytdl from 'ytdl-core-discord';
import { Youtube, sliderGenerator } from './Youtube';
import { PlayerLanguage, GuildData, GuildQueue, VideoData } from './interfaces';
import { Language } from './language';
import { isArray } from 'util';
import { GuildPlayer, PlaylistItem } from './playlist';
import { getVideoInfoPlusStream } from './yt-code-discord';
import { resolve } from 'dns';

const youtubeLogo = 'https://s.ytimg.com/yts/img/favicon_144-vfliLAfaB.png'; // Youtube icon
const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);
export
	const urlTester = new RegExp(/https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}/g);
const defaultPlayerUpdate = 1000 * 5;
const defaultWaitTimeBetweenTracks = 1000 * 2;
const defaultSelfDeleteTime = 1000 * 5;

const guildPlayer = new WeakMap<YoutubePlayer, GuildData>();
const messageUpdateRate = new WeakMap<YoutubePlayer, number>();
const selfDeleteTime = new WeakMap<YoutubePlayer, number>();
const leaveVoiceChannelAfter = new WeakMap<YoutubePlayer, number>();
const usePatch = new WeakMap<YoutubePlayer, boolean>();
const youtubeKey = new WeakMap<YoutubePlayer, string>();
const secondCommand = new WeakMap<YoutubePlayer, boolean>();
const waitTimeBetweenTracks = new WeakMap<YoutubePlayer, number>();
const deleteUserMessage = new WeakMap<YoutubePlayer, boolean>();
const playerLanguage = new WeakMap<YoutubePlayer, Language>();

const patch = {
	filter: "audioonly",
	highWaterMark: 1 << 25

}

export class YoutubePlayer {

    /**
    * Returns the sum of a and b
    * @param {string} string youtube api key
    * @param {PlayerLanguage} PlayerLanguage PlayerLanguage
    */
	constructor(youtubeApiKey: string, language?: PlayerLanguage) {
		if (language && typeof language !== 'object') throw new Error('language must be an object!');
		if (!language) language = {} as any;
		if (!youtubeApiKey) throw new Error('Youtube api key cannot be empty');
		if (typeof youtubeApiKey !== 'string') throw new Error(`Expected string got ${typeof youtubeApiKey}`);
		youtubeKey.set(this, youtubeApiKey);
		messageUpdateRate.set(this, defaultPlayerUpdate);
		guildPlayer.set(this, {});
		secondCommand.set(this, true);
		selfDeleteTime.set(this, defaultSelfDeleteTime);
		waitTimeBetweenTracks.set(this, defaultWaitTimeBetweenTracks);
		deleteUserMessage.set(this, true);
		playerLanguage.set(this, new Language(language));
	}

    /**
     * Allow <prefix>p command
     * @param {boolean} boolean
     */
	set secondsCommand(trueFalse: boolean) {
		if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
		secondCommand.set(this, trueFalse);
	}

    /**
    * Should delete user messages?
    * @param {boolean} boolean if set to true if possible the messages are going to be deleted.
    */
	set deleteUserMessages(trueFalse: boolean) {
		if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
		deleteUserMessage.set(this, trueFalse);
	}

    /**
    * Should fix where stream is terminated 10 - 15 seconds before the end of the video
    * @param {boolean} boolean Enables/disables patch
    */
	set usePatch(trueFalse: boolean) {
		if (typeof trueFalse !== 'boolean') throw new Error(`Expected boolean got ${typeof trueFalse}`);
		usePatch.set(this, trueFalse);
	}

    /**
    * Set wait time between tracks
    * @param {number} number how much should player wait.
    */
	set waitTimeBetweenTracks(seconds: number) {
		if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
		waitTimeBetweenTracks.set(this, seconds * 1000);
	}

    /**
    * Set player edit/update rate
    * @param {number} number how fast/slow should player message be updated.
    */
	set playerUpdateRate(seconds: number) {
		if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
		if (seconds < 5) throw new Error('update rate cannot be lover than 5 seconds');
		messageUpdateRate.set(this, seconds * 1000);
	}

	/**
  * When bot runs out of songs how long should wait before disconnecting voice channel
  * @param {number} number in seconds. If set to 0 it will leave immediately.
  */
	set leaveVoiceChannelAfter(seconds: number) {
		if (typeof seconds !== 'number') throw new Error(`Expected number got ${typeof seconds}`);
		leaveVoiceChannelAfter.set(this, seconds * 1000);
	}

    /**
    * @param {Message} Message Discord message
    * @param {string} String prefix
    * @returns {boolean} It's going to return true if command is valid.
    */
	onMessagePrefix(message: Message, prefix: string): boolean {
		if (!prefix) throw new Error('Prefix cannot be undefined');
		if (typeof prefix !== 'string') throw new Error('Prefix must be string');
		return this.onMessage(message, message.cleanContent.slice(prefix.length).trim(), prefix);
	}

    /**
    * @param {Message} Message Discord message
    * @param {string} String Discord message without prefix
    * @param {string} String Optional just for help command
    * @returns {boolean} It's going to return true if command is valid.
    */
	onMessage(message: Message, messageContentWithOutPrefix: string, prefix?: string): boolean {
		const language = playerLanguage.get(this)!.getLang();
		if (!message.guild || message.author.bot) return false;
		const channel = message.channel as TextChannel;
		const me = channel.permissionsFor(message.guild.me);
		if (!me) return false;
		if (!me.has('SEND_MESSAGES')) return false;

		const checker = messageContentWithOutPrefix.toLowerCase();

		if (checker === 'player') {
			playerHelp(this, message, prefix);
			return true;
		}

		else if (secondCommand.get(this) && checker === 'p') {
			playerHelp(this, message, prefix);
			return true;
		}

		if (checker.toLowerCase().startsWith('player '))
			messageContentWithOutPrefix = messageContentWithOutPrefix.slice(6).replace(/  /g, ' ').trim();
		else if (secondCommand.get(this) && checker.toLowerCase().startsWith('p '))
			messageContentWithOutPrefix = messageContentWithOutPrefix.slice(1).replace(/  /g, ' ').trim();
		else
			return false;

		// just to throw object out of stack so we can return boolean value to the user
		setTimeout((): any => {
			const voiceChannel = message.member.voiceChannel;

			if (!voiceChannel) {
				const reply = language.notInVoiceChannel;
				return message.channel.send(Embeds.errorEmbed(reply))
					.catch(() => message.channel.send(reply).catch(() => { }));
			}
			else if (!voiceChannel.joinable) {
				const reply = language.cannotConnect;
				return message.channel.send(Embeds.errorEmbed(reply))
					.catch(() => message.channel.send(reply).catch(() => { }));
			}

            /*
            if (checker.includes('replay') || checker.includes('<>') || checker.includes('rewind')) {
                //  return replaySong(message, language);
            }*/

			if (messageContentWithOutPrefix.toLowerCase() !== 'yt' && messageContentWithOutPrefix.toLowerCase().startsWith('yt')) {
				messageContentWithOutPrefix = messageContentWithOutPrefix.slice(2).trim();
				youtubeLuckSearch(this, message, messageContentWithOutPrefix);
				return true;
			}
			if (messageContentWithOutPrefix.toLowerCase() !== 'youtube' && messageContentWithOutPrefix.toLowerCase().startsWith('youtube')) {
				messageContentWithOutPrefix = messageContentWithOutPrefix.slice(7).trim();
				youtubeLuckSearch(this, message, messageContentWithOutPrefix);
				return true;
			}
			if (messageContentWithOutPrefix.toLowerCase() !== 'search' && messageContentWithOutPrefix.toLowerCase().startsWith('search')) {
				messageContentWithOutPrefix = messageContentWithOutPrefix.slice(7).trim();
				youtubeLuckSearch(this, message, messageContentWithOutPrefix);
				return true;
			}

			switch (messageContentWithOutPrefix.toLowerCase()) {
				case 'destroy':
				case 'leave':
				case 'kill':
					destroyPlayer(this, message.guild);
					message.delete().catch(() => { });
					break;
				case 'skip':
				case 'next':
				case '>>':
					skipTrack(this, message);
					message.delete().catch(() => { });
					break;
				case 'help':
				case '?':
					playerHelp(this, message);
					break;
				case 'pause':
					pauseTrack(this, message);
					break;
				case 'resume':
					resumeTrack(this, message);
					break;
				case 'replay':
				case '<>':
				case 'rewind':
					replayTrack(this, message);
					break;
				case 'loop':
					loopTrack(this, message);
					break;
				case 'shuffle':
				case 'mix':
					shuffleQueue(this, message);
					message.delete().catch(() => { });
					break;
				default:

					let urls: RegExpMatchArray | null = null;
					if (urls = messageContentWithOutPrefix.match(youtubeTester)) addYoutubeToQueue(this, message, urls);
					else if (messageContentWithOutPrefix.match(urlTester)) {

						if (canEmbed(message.channel as TextChannel))
							return message.channel.send(Embeds.errorEmbed(playerLanguage.get(this)!.getLang().onlyYoutubeLinks))
								.catch(error => message.client.emit('error', error));
						else
							return message.channel.send(playerLanguage.get(this)!.getLang().onlyYoutubeLinks)
								.catch(error => message.client.emit('error', error));
					}
					else {

						youtubeLuckSearch(this, message, messageContentWithOutPrefix);
                        /*
                        if (canEmbed(message.channel as TextChannel))
                            return message.channel.send(Embeds.errorEmbed(playerLanguage.get(this).getLang().incorrectUse))
                                .catch(error => message.client.emit('error', error))
                        else
                            return message.channel.send(playerLanguage.get(this).getLang().incorrectUse)
                                .catch(error => message.client.emit('error', error))
                                */
					}
					break;
			}
		}, 0);
		return true;
	}
}

async function addYoutubeToQueue(youtubePlayer: YoutubePlayer, message: Message, urls: RegExpMatchArray) {
	const player = getGuildPlayer(youtubePlayer, message.guild.id);
	const language = playerLanguage.get(youtubePlayer)!.getLang();

	if (deleteUserMessage.get(youtubePlayer) && message.deletable)
		message.delete().catch(error => message.client.emit('error', error));

	let playlistItems: PlaylistItem[] = [];
	for (const url of urls) {
		const apiKey = youtubeKey.get(youtubePlayer)!;
		const title = player.isAlreadyOnPlaylistByUrl(url);
		if (title) {
			errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n<${title}>`, selfDeleteTime.get(youtubePlayer)!);
			break;
		}
		try {
			const playlistItem: PlaylistItem = {
				stream: await getVideoInfoPlusStream(url),
				videoData: await Youtube.getVideoInfo(apiKey, url),
				submitted: new Date(Date.now()),
				submitter: message.member
			}
			if (player.push(playlistItem)) {
				playlistItems.push(playlistItem);
			}
		} catch (error) {

		}
	}

	if (playlistItems.length === 0) return;
	startPlayer(youtubePlayer, message);
	sendQueueVideoInfo(youtubePlayer, message, playlistItems);
}

async function youtubeLuckSearch(youtubePlayer: YoutubePlayer, message: Message, query: string) {
	const player = getGuildPlayer(youtubePlayer, message.guild.id);
	const language = playerLanguage.get(youtubePlayer)!.getLang();
	const keyYoutube = youtubeKey.get(youtubePlayer)!;

	if (deleteUserMessage.get(youtubePlayer) && message.deletable)
		message.delete().catch(error => message.client.emit('error', error));

	let playlistItem: PlaylistItem;
	try {
		const result = await Youtube.searchOnLuck(keyYoutube, query);
		const title = player.isAlreadyOnPlaylistById(result.id);
		if (title) {
			errorInfo(message.channel as TextChannel, `${message.author} ${language.alreadyOnPlaylist}\n<${title}>`, selfDeleteTime.get(youtubePlayer)!);
			return;
		}
		playlistItem = {
			stream: await getVideoInfoPlusStream(result.url),
			videoData: result,
			submitted: new Date(Date.now()),
			submitter: message.member
		}
		if (!player.push(playlistItem)) {
			errorInfo(message.channel as TextChannel, `Unable to add to playlist`, selfDeleteTime.get(youtubePlayer));
			return;
		}
	} catch (error) {
		errorInfo(message.channel as TextChannel, error.toString(), selfDeleteTime.get(youtubePlayer));
		return;
	}

	startPlayer(youtubePlayer, message);
	sendQueueVideoInfo(youtubePlayer, message, [playlistItem], true);
}


function playerHelp(playerObject: YoutubePlayer, message: Message, prefix?: string) {
	const helps = playerLanguage.get(playerObject)!.help(prefix);
	const language = playerLanguage.get(playerObject)!.getLang();
	const helpInfo: string[] = [];
	for (const help of Object.keys(helps)) {
		helpInfo.push(helps[help]);
	}

	if (canEmbed(message.channel as TextChannel)) {
		const embed = new RichEmbed();
		embed.addField(language.player.helpCommand, helpInfo.join('\n'));
		embed.setColor("GREEN");
		message.channel.send(embed).catch(() => { });
	} else {
		message.channel.send(`\`\`\`${helpInfo.join('\n')}\`\`\``).catch(() => { });
	}
}

function getGuildPlayer(youtubePlayer: YoutubePlayer, guildID: string) {
	const guildData = guildPlayer.get(youtubePlayer)!;
	if (!guildData[guildID]) guildData[guildID] = new GuildPlayer;
	return guildData[guildID];
}

function loopTrack(youtubePlayer: YoutubePlayer, message: Message) {
	const guildPlayer = getGuildPlayer(youtubePlayer, message.guild.id);
	const language = playerLanguage.get(youtubePlayer)!.getLang();

	if (!verifyUser(youtubePlayer, message)) return;

	if (guildPlayer.loop) {
		guildPlayer.loop = false;
		message.channel.send(language.player.loopingOff).catch(() => { });
	} else {
		guildPlayer.loop = true;
		message.channel.send(language.player.loopingOn).catch(() => { });
	}
}


function canEmbed(channel?: TextChannel): boolean {
	if (!channel) return false;
	const me = channel.permissionsFor(channel.guild.me);
	if (!me) return false;
	return me.has('EMBED_LINKS');
}



function errorInfo(channel: TextChannel, content: string, deleteNumber?: number) {
	if (canEmbed(channel as TextChannel)) {
		channel.send(Embeds.errorEmbed(content))
			.then(m => {
				if (deleteNumber) {
					setTimeout(() => {
						if (!isArray(m)) m.delete();
						else m.forEach(m => m.delete());
					}, deleteNumber);
				}
			})
			.catch(error => channel.client.emit('error', error));
	} else {
		channel.send(content)
			.then(m => {
				if (deleteNumber) {
					setTimeout(() => {
						if (!isArray(m)) m.delete();
						else m.forEach(m => m.delete());
					}, deleteNumber);
				}
			})
			.catch(error => channel.client.emit('error', error));
	}
}

function sendQueueVideoInfo(playerObject: YoutubePlayer, message: Message, playlistItems: PlaylistItem[], search = false) {
	const language = playerLanguage.get(playerObject)!.getLang();
	for (const playlistItem of playlistItems) {
		if (canEmbed(message.channel as TextChannel)) {
			const embed = new RichEmbed();
			addBasicInfo(playerObject, embed, playlistItem.videoData);
			if (search) embed.setDescription(`${language.videoAdded} ${playlistItem.submitter} ${language.luckSearch}`);
			else embed.setDescription(`${language.videoAdded} ${playlistItem.submitter}`);
			embed.addField(language.video.duration, getYoutubeTime(new Date(playlistItem.videoData.duration)));
			message.channel.send(embed).catch(error => message.client.emit('error', error));
		} else {
			message.channel.send(`\`${playlistItem.videoData.url}\` ${language.videoAdded} ${playlistItem.submitter}`).catch(error => message.client.emit('error', error));
		}
	}
	updatePlayer(playerObject, message.guild, true);
}

function addBasicInfo(playerObject: YoutubePlayer, embed: RichEmbed, video: VideoData) {
	const language = playerLanguage.get(playerObject)!.getLang();
	embed.setAuthor(video.channel.title, video.channel.thumbnail, `https://www.youtube.com/channel/${video.channel.id}`);
	embed.setTitle(video.title);
	embed.setColor('RED');
	embed.setURL(video.url);
	embed.setThumbnail(video.thumbnail);

	const date = video.publishedAt;

	const day = date.getDate();
	const month = language.video.monthsName[date.getMonth()];
	const year = date.getFullYear();
	embed.addField(language.video.published, `${day} ${month} ${year}`, true);

	/* tslint:disable */
	const viewCount = video.statistics.viewCount.toString().match(/.{1,3}/g)//.join(',')
	const views = video.statistics.viewCount < 10000 ? video.statistics.viewCount : viewCount ? viewCount.join(',') : viewCount;
	const commentCount = video.statistics.viewCount.toString().match(/.{1,3}/g)
	const comments = video.statistics.commentCount < 10000 ? video.statistics.commentCount : commentCount ? commentCount.join(',') : commentCount;
	let likes = video.statistics.likeCount < 1000 ? video.statistics.likeCount.toString() : (video.statistics.likeCount / 1000).toFixed(1) + 'K';
	let disLike = video.statistics.dislikeCount < 1000 ? video.statistics.dislikeCount.toString() : (video.statistics.dislikeCount / 1000).toFixed(1) + 'K';
	/* tslint:enable */

	if (likes.includes('K') && likes.slice(likes.length - 3, likes.length - 1) === '.0') {
		likes = likes.slice(0, likes.length - 3) + 'K';
	}
	if (disLike.includes('K') && disLike.slice(disLike.length - 3, disLike.length - 1) === '.0') {
		disLike = disLike.slice(0, disLike.length - 3) + 'K';
	}

	embed.addField(language.video.views, views, true);
	embed.addField(language.video.ratting, `${language.video.upVote}${likes}  ${language.video.downVote}${disLike}`, true);
	embed.addField(language.video.comments, comments, true);
	return embed;
}


function getYoutubeTime(date: Date) {
	let seconds: any = date.getSeconds();
	let minutes: any = date.getMinutes();
	let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

	seconds = seconds < 10 ? `0${seconds}` : seconds;
	minutes = minutes < 10 ? `0${minutes}` : minutes;

	if (hours)
		hours = hours < 10 ? `0${hours}:` : `${hours}:`;
	else
		hours = '';

	return `${hours}${minutes}:${seconds}`;
}

function startPlayer(youtubePlayer: YoutubePlayer, message: Message): any {
	const language = playerLanguage.get(youtubePlayer)!.getLang();
	const guildPlayer = getGuildPlayer(youtubePlayer, message.guild.id);
	const track = guildPlayer.switchToNextSong();

	if (message.guild.me.voiceChannel && message.guild.me.voiceChannel.connection) {
		if (!track) return destroyPlayer(youtubePlayer, message.guild);
	} //return this.updatePlayer(message.guild);
	if (guildPlayer.length === 0) return destroyPlayer(youtubePlayer, message.guild);

	const voiceChannel = message.member.voiceChannel;
	if (!voiceChannel) return destroyPlayer(youtubePlayer, message.guild);

	if (!message.guild.me.voiceChannel) {
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.created))
				.catch(error => message.client.emit('error', error));
		} else {
			message.channel.send(language.player.created)
				.catch(error => message.client.emit('error', error));
		}
	}

	voiceChannel.join()
		.then(async () => {
			guildPlayer.setTextChannel(message.channel as TextChannel);
			const updateRate = messageUpdateRate.get(youtubePlayer);
			guildPlayer.on('update', () => {
				updatePlayer(youtubePlayer, message.guild);
			});

			if (!guildData.currentSong)
				nextTrack(youtubePlayer, message);
		}).catch(error => {
			message.client.emit('error', error);
			if (canEmbed(message.channel as TextChannel))
				message.channel.send(Embeds.errorEmbed(language.cannotConnect))
					.catch(error => message.client.emit('error', error));
			else
				message.channel.send(language.cannotConnect)
					.catch(error => message.client.emit('error', error));
		});
}

async function destroyPlayer(playerObject: YoutubePlayer, guild: Guild) {
	const language = playerLanguage.get(playerObject)!.getLang();
	const guildData = data.get(playerObject)[guild.id] as GuildData;

	if (!guildData) return;
	if (guildData.setTimeout)
		clearInterval(guildData.setTimeout);
	guildData.setTimeout = undefined;

	if (guild.me.voiceChannel) {
		const connection = guild.voiceConnection;
		const channel = guildData.textChannel as TextChannel;
		guildData.queue = [];
		if (guildData.playerMessage) {
			guildData.playerMessage.delete().catch(e => guild.client.emit('error', e));
			guildData.playerMessage = undefined;
		}
		await connection.disconnect();
		if (channel) {
			if (canEmbed(channel))
				await channel.send(Embeds.infoEmbed(language.player.destroy))
					.catch(e => guild.client.emit('error', e)) as Message;
			else {
				await channel.send(language.player.destroy)
					.catch(e => guild.client.emit('error', e)) as Message;
			}


		}
	}
	if (guildData) delete data.get(playerObject)[guild.id];
	guild.client.emit('debug', `[Youtube Player] [Status] Player destroyed in guild ${guild.id}`);

}

async function updatePlayer(playerObject: YoutubePlayer, guild: Guild, fullUpdate = false) {
	const language = playerLanguage.get(playerObject)!.getLang();
	const guildData = data.get(playerObject)[guild.id] as GuildData;

	const channel = guildData.textChannel;
	let voice: VoiceChannel | undefined = undefined;
	if (guild.voiceConnection) voice = guild.me.voiceChannel;
	const currentSong = guildData.currentSong;
	const startSongTime = guildData.startSongTime;

	if (!startSongTime) return;
	if (!currentSong) return;
	if (!voice) return;

	if (fullUpdate) {
		if (guildData.playerMessage)
			await guildData.playerMessage.delete().catch(e => guild.client.emit('error', e));
		guildData.playerMessage = undefined;
	}

	if (voice && voice.members.size === 1) return destroyPlayer(playerObject, guild);

	let add = 0;
	if (guildData.paused) {
		add = Date.now() - guildData.paused.getTime();
	}


	let date = new Date(Date.now() - startSongTime.getTime() + add);

	let progress = `${getYoutubeTime(date)} / ${getYoutubeTime(new Date(currentSong.video.duration))}`;

	guildData.color = colorFader(guildData.color);

	const embed = new RichEmbed();
	embed.setDescription(`\`${sliderGenerator(date.getTime(), currentSong.video.duration)}\``);
	addBasicInfo(playerObject, embed, currentSong.video);
	//@ts-ignore
	embed.setColor(guildData.color);
	embed.addField(language.video.progress, progress, true);
	if (guildData.paused)
		embed.setFooter(language.player.statusPaused, youtubeLogo);
	else {
		if (guildData.looping)
			embed.setFooter(language.player.statusPlaying + ' 🔄', currentSong.video.thumbnail);
		else
			embed.setFooter(language.player.statusPlaying, currentSong.video.thumbnail);
	}
	embed.setThumbnail('');
	if (!guildData.playerMessage) {

		if (canEmbed(channel) && channel)
			channel.send(embed)
				.then(msg => {
					guildData.playerMessage = msg as Message;
				})
				.catch(e => guild.client.emit('error', e));
		else if (channel)
			channel.send(`${currentSong.video.url}\n${currentSong.video.title}\n${progress} ${guildData.paused ? 'Paused' : ''}`)
				.then(msg => {
					guildData.playerMessage = msg as Message;
				})
				.catch(e => guild.client.emit('error', e));
		return;
	}

	if (guildData.playerMessage.embeds.length !== 0) {
		guildData.playerMessage.edit(embed).catch(e => guild.client.emit('error', e));
	} else {
		guildData.playerMessage.edit(`${currentSong.video.url}\n${currentSong.video.title}\n${progress} ${guildData.paused ? 'Paused' : ''}`)
			.catch(e => guild.client.emit('error', e));
	}

}

function nextTrack(playerObject: YoutubePlayer, message: Message, force = false): any {
	const language = playerLanguage.get(playerObject)!.getLang();
	const shouldPatch = usePatch.get(playerObject) ? patch : {};
	const guildData = data.get(playerObject)[message.guild.id] as GuildData;
	if (!guildData) return;
	if (deleteUserMessage.get(playerObject))
		message.delete().catch(() => { });

	if (!guildData.looping && guildData.queue.length === 0) return destroyPlayer(playerObject, message.guild);
	if (!message.guild.voiceConnection) return destroyPlayer(playerObject, message.guild);

	let currentSong = guildData.currentSong;

	const connection = message.guild.voiceConnection;

	if (!force) {
		if (!guildData.looping) {
			currentSong = guildData.queue.shift();
			guildData.currentSong = currentSong;
		}
	}

	if (!currentSong) return destroyPlayer(playerObject, message.guild);
	ytdl(currentSong.video.url, shouldPatch)
		.then(stream => {
			const dispatcher = connection.playOpusStream(stream);

			updatePlayer(playerObject, message.guild);

			dispatcher.on('end', () => {
				message.client.emit('debug', `[Youtube Player] [Status] Track ended in guild ${message.guild.id}`);
				setTimeout(() => {
					nextTrack(playerObject, message);
				}, waitTimeBetweenTracks.get(playerObject));
			});
			dispatcher.on('start', () => {
				message.client.emit('debug', `[Youtube Player] [Status] Track started in guild ${message.guild.id}`);
				guildData.startSongTime = new Date(Date.now());
				updatePlayer(playerObject, message.guild);
			});
			dispatcher.on('error', async e => {
				message.client.emit('debug', `[Youtube Player] [Status] Track Error in guild ${message.guild.id} ${e}`);
				message.client.emit('error', e);

				const channel = guildData.textChannel as TextChannel;
				if (channel) {

					if (canEmbed(channel) && currentSong)
						await channel.send(Embeds.errorEmbed(`${e} \`${currentSong.video.url}\``))
							.catch(error => message.client.emit('error', error));
					else if (currentSong)
						await channel.send(`${e} \`${currentSong.video.url}\``)
							.catch(error => message.client.emit('error', error));
				}
				nextTrack(playerObject, message);
			});
		})
		.catch(s => {
			message.client.emit('error', s);
			if (guildData.textChannel) {
				const channel = guildData.textChannel;
				const reply = language.player.brokenUrl;

				if (canEmbed(channel) && currentSong)
					channel.send(Embeds.errorEmbed(`${reply} \`${currentSong.video.url}\``))
						.catch(error => message.client.emit('error', error));
				else if (currentSong) {
					channel.send(`${reply} \`${currentSong.video.url}\``)
						.catch(error => message.client.emit('error', error));
				}
			}
			nextTrack(playerObject, message);
		});
}


function skipTrack(playerObject: YoutubePlayer, message: Message) {
	const guildData = data.get(playerObject)[message.guild.id] as GuildData;
	const language = playerLanguage.get(playerObject)!.getLang();

	if (deleteUserMessage.get(playerObject))
		message.delete().catch(() => { });

	if (!guildData) return;
	if (!verifyUser(playerObject, message)) return;

	message.client.emit('debug', `[Youtube Player] [Status] Track has been skipped by use ${message.author.id} guild ${message.guild.id}`);
	message.guild.voiceConnection.dispatcher.end();
	if (canEmbed(message.channel as TextChannel)) {
		message.channel.send(Embeds.infoEmbed(`${language.player.skip} ${message.author}`))
			.catch(error => message.client.emit('error', error));
	}
	else {
		message.channel.send(`${language.player.skip} ${message.author}`)
			.catch(error => message.client.emit('error', error));
	}
}

function pauseTrack(playerObject: YoutubePlayer, message: Message) {
	const guildData = data.get(playerObject)[message.guild.id] as GuildData;
	const language = playerLanguage.get(playerObject)!.getLang();
	if (!guildData) return;
	if (!message.guild.voiceConnection) return;

	if (deleteUserMessage.get(playerObject))
		message.delete().catch(() => { });

	message.client.emit('debug', `[Youtube Player] [Status] Track has been paused by use ${message.author.id} guild ${message.guild.id}`);
	if (!message.guild.voiceConnection.dispatcher.paused) {
		message.guild.voiceConnection.dispatcher.pause();
		guildData.paused = new Date(Date.now());
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(`${language.player.paused} ${message.author}`))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(`${language.player.paused} ${message.author}`)
				.catch(error => message.client.emit('error', error));
		}
	}
	if (guildData.setTimeout)
		clearInterval(guildData.setTimeout);
	guildData.setTimeout = undefined;

	updatePlayer(playerObject, message.guild, true);
}

function resumeTrack(playerObject: YoutubePlayer, message: Message) {
	const guildData = data.get(playerObject)[message.guild.id] as GuildData;
	const language = playerLanguage.get(playerObject)!.getLang();
	if (!guildData) return;
	if (!message.guild.voiceConnection) return;

	if (deleteUserMessage.get(playerObject))
		message.delete().catch(() => { });

	message.client.emit('debug', `[Youtube Player] [Status] Track has been resumed by use ${message.author.id} guild ${message.guild.id}`);
	if (message.guild.voiceConnection.dispatcher.paused) {
		message.guild.voiceConnection.dispatcher.resume();

		const paused = guildData.paused as Date;
		const timeNow = new Date(Date.now());
		const pausedTime = new Date(timeNow.getTime() - paused.getTime());
		const startTime = guildData.startSongTime as Date;
		guildData.startSongTime = new Date(startTime.getTime() + pausedTime.getTime());
		guildData.paused = new Date(Date.now());
		guildData.paused = undefined;
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(`${language.player.resumed} ${message.author}`))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(`${language.player.resumed} ${message.author}`)
				.catch(error => message.client.emit('error', error));
		}
		//@ts-ignore will it deal with later
		guildData.setTimeout = setInterval(() => {
			updatePlayer(playerObject, message.guild);
		}, messageUpdateRate.get(playerObject));
		updatePlayer(playerObject, message.guild, true);
	}
}

function replayTrack(playerObject: YoutubePlayer, message: Message, force = false) {
	const guildData = data.get(playerObject)[message.guild.id] as GuildData;
	const language = playerLanguage.get(playerObject)!.getLang();
	if (!guildData) return;
	if (!guildData.currentSong) return;

	if (force) {
		guildData.queue.unshift(guildData.currentSong);

		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.forceReplay))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.player.forceReplay)
				.catch(error => message.client.emit('error', error));
		}

		nextTrack(playerObject, message);
		return;
	}

	if (guildData.currentSong !== guildData.queue[0]) {
		guildData.queue.unshift(guildData.currentSong);
		message.client.emit('debug', `[Youtube Player] [Status] ${message.author.id} execute force replay in guild ${message.guild.id}`);
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.replay))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.player.replay)
				.catch(error => message.client.emit('error', error));
		}
		message.client.emit('debug', `[Youtube Player] [Status] Track has is going to be replayed set by use ${message.author.id} guild ${message.guild.id}`);
	}

	else {
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.alreadyOnReplay))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.player.shuffled)
				.catch(error => message.client.emit('error', error));
		}
	}
}

function shuffleQueue(playerObject: YoutubePlayer, message) {
	const guildData = data.get(playerObject) as GuildData;
	const language = playerLanguage.get(playerObject)!.getLang();

	if (guildData.queue && guildData.queue.length > 1) {
		guildData.queue.sort(() => Math.random() - 0.5);
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.shuffled))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.player.shuffled)
				.catch(error => message.client.emit('error', error));
		}
		message.client.emit('debug', `[Youtube Player] [Status] Playlist has been shuffled by ${message.author.id} guild ${message.guild.id}`);
	} else {
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.player.nothingToShuffle))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.player.nothingToShuffle)
				.catch(error => message.client.emit('error', error));
		}
	}
}

function verifyUser(playerObject: YoutubePlayer, message: Message): boolean {
	const memberRoles = message.member.roles.filter(r => r.name.toLowerCase() === 'dj' || r.name.toLowerCase() === 'mod' || r.name.toLowerCase() === 'moderator').map(r => r);
	const language = playerLanguage.get(playerObject)!.getLang();

	if (message.guild.voiceConnection && message.guild.voiceConnection.channel.members.size <= 2) return true;
	if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS') || memberRoles.length !== 0) return true;

	else {
		if (canEmbed(message.channel as TextChannel)) {
			message.channel.send(Embeds.infoEmbed(language.missingPermission!))
				.catch(error => message.client.emit('error', error));
		}
		else {
			message.channel.send(language.missingPermission)
				.catch(error => message.client.emit('error', error));
		}
		return false;
	}
}

function colorFader(number: number[]) {

	const increaser = 11;

	if (number[0] > 0 && number[1] <= 0) {
		number[0] -= increaser;
		number[2] += increaser;
	}
	if (number[2] > 0 && number[0] <= 0) {
		number[2] -= increaser;
		number[1] += increaser;
	}
	if (number[1] > 0 && number[2] <= 0) {
		number[0] += increaser;
		number[1] -= increaser;
	}

	if (number[0] < 0) number[0] = 0;
	if (number[1] < 0) number[1] = 0;
	if (number[2] < 0) number[2] = 0;
	if (number[0] > 255) number[0] = 255;
	if (number[1] > 255) number[1] = 255;
	if (number[2] > 255) number[2] = 255;
	return number;
}
