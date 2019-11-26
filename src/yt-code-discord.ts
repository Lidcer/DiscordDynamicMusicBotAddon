import * as ytdl from 'ytdl-core';
import { FFmpeg, opus } from 'prism-media';

export interface ytdlCache {
	[key: string]: {
		timeout: NodeJS.Timeout
		videoInfo: ytdl.videoInfo
	};
}

const cache: ytdlCache = {};
const timeoutTime = 1000 * 60 * 10; //10 minutes 

function filter(format) {
	return format.audioEncoding === 'opus' &&
		format.container === 'webm' &&
		format.audio_sample_rate == 48000;
}

function nextBestFormat(formats) {
	formats = formats
		.filter(format => format.audioBitrate)
		.sort((a, b) => b.audioBitrate - a.audioBitrate);
	return formats.find(format => !format.bitrate) || formats[0];
}

export function getYTInfo(url: string): Promise<ytdl.videoInfo> {
	return new Promise((resolve, reject) => {
		resetTimeout(url)

		if (cache[url]) {
			resolve(cache[url].videoInfo);
			return;
		}

		ytdl.getInfo(url, (err, info) => {
			if (err) return reject(err);
			resetTimeout(url)

			cache[url] = {
				videoInfo: info,
				timeout: setTimeout(() => {
					delete cache[url];
				}, timeoutTime)
			};
			resolve(cache[url].videoInfo);
		});
	});
}

function resetTimeout(url: string) {
	if (cache[url] && cache[url].timeout) {
		clearTimeout(cache[url].timeout);
	}
	if (cache[url]) {
		cache[url].timeout = setTimeout(() => {
			delete cache[url];
		}, timeoutTime)
	}
}

export function garbageCollect(id: string) {
	if (cache[id]) delete cache[id];
}

export function getStream(info: ytdl.videoInfo): opus.Encoder | opus.WebmDemuxer {
	let options;

	const lengthSeconds = parseInt(info.length_seconds)
	// Prefer opus
	const format = info.formats.find(filter);
	const canDemux = format && lengthSeconds !== 0;
	if (canDemux) options = { ...options, filter, highWaterMark: 1 << 25 };
	else if (lengthSeconds !== 0) options = { filter: 'audioonly', };
	if (canDemux) {
		const demuxer = new opus.WebmDemuxer();
		const webmDemuxer = ytdl.downloadFromInfo(info, options)
			.pipe(demuxer)
			.on('end', () => demuxer.destroy())
		return webmDemuxer;
	} else {
		const transcoder = new FFmpeg({
			args: [
				'-reconnect', '1',
				'-reconnect_streamed', '1',
				'-reconnect_delay_max', '5',
				'-i', nextBestFormat(info.formats).url,
				'-analyzeduration', '0',
				'-loglevel', '0',
				'-f', 's16le',
				'-ar', '48000',
				'-ac', '2',
			],
		});
		const opusEncoder = new opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
		const stream = transcoder.pipe(opusEncoder);
		stream.on('close', () => {
			transcoder.destroy();
			opusEncoder.destroy();
		});
		return stream;
	}

}

export function getVideoInfoPlusStream(url: string): Promise<opus.Encoder | opus.WebmDemuxer> {
	return new Promise(async (resolve, rejects) => {
		try {
			const videoInfo = await getYTInfo(url);
			resolve(getStream(videoInfo));
			return;
		} catch (error) {
			rejects(error);
			return;
		}
	});
}
