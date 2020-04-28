// @ts-ignore no types
import * as ytdl from 'ytdl-core';
// @ts-ignore no types
import ytsr from 'ytsr';
// @ts-ignore no types
import ytpl from 'ytpl';
// @ts-ignore
import { FFmpeg, opus } from 'prism-media';

function filter(format: ytdl.videoFormat) {
    return format.codecs === 'opus' &&
        format.container === 'webm' &&
        format.audioSampleRate ? parseInt(format.audioSampleRate) === 48000 : false;
}

function nextBestFormat(formats: ytdl.videoFormat[]) {
    formats = formats
        .filter(format => format.audioSampleRate)
        .sort((a, b) => parseInt(b.audioSampleRate!) - parseInt(a.audioSampleRate!));
    return formats.find(format => !format.bitrate) || formats[0];
}

export async function getYTInfo(url: string) {
    return await ytdl.getInfo(url);
}

export function getStream(info: ytdl.videoInfo, options = {}): opus.Encoder | opus.WebmDemuxer {
    const lengthSeconds = parseInt(info.length_seconds);
    const format = info.formats.find(filter);
    const canDemux = format && lengthSeconds !== 0;
    if (canDemux) options = { ...options, filter, highWaterMark: 1 << 25 };
    else if (lengthSeconds !== 0) options = { filter: 'audioonly' };
    if (canDemux) {
        const demuxer = new opus.WebmDemuxer();
        const webmDemuxer = ytdl.downloadFromInfo(info, options)
            .pipe(demuxer)
            .on('end', () => demuxer.destroy());
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

export async function getVideoInfoPlusStream(url: string, options = {}) {
    const videoInfo = await getYTInfo(url);
    return getStream(videoInfo, options);
}

export async function searchYTVideo(query: string) {
    let results = await ytsr(query, { limit: 10 });
    results = results.items.filter((r: any) => r.type === 'video');
    if (results[0]) {
        const result = await getYTInfo(results[0].link);
        if (!result.length_seconds) throw new Error('Missing data fetched from video.');
        if (!result.title) throw new Error('Missing data fetched from video.');
        return result;
    } else {
        throw new Error('Nothing found');
    }
}

export async function parsePlaylist(IDorURL: string) {
    return await ytpl(IDorURL);
}
