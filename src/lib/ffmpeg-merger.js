import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg = null;
let isLoaded = false;

export async function initFFmpeg(onProgress) {
  if (isLoaded && ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg WASM Log]:', message);
  });

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Direct same-origin URLs for local binaries
    await ffmpeg.load({
      coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
    });
    
    isLoaded = true;
    return ffmpeg;
  } catch (err) {
    console.error('FFmpeg load error:', err);
    throw new Error(`FFmpeg WASM error (${err.message || 'Browser isolation'}). Use Instant Download button for 1-click download.`);
  }
}

export async function mergeVideoAndAudio(videoUrl, audioUrl, outputFilename, onStatusUpdate) {
  try {
    if (onStatusUpdate) onStatusUpdate('Initializing WebAssembly Engine...', 5);
    const instance = await initFFmpeg((percent) => {
      if (onStatusUpdate) onStatusUpdate(`Merging Audio & Video: ${percent}%`, 50 + Math.round(percent / 2));
    });

    if (onStatusUpdate) onStatusUpdate('Fetching High-Res Video Stream...', 15);
    const videoData = await fetchFile(videoUrl);

    if (onStatusUpdate) onStatusUpdate('Fetching Audio Stream...', 35);
    const audioData = await fetchFile(audioUrl);

    if (onStatusUpdate) onStatusUpdate('Writing stream files to browser memory...', 48);
    await instance.writeFile('input_video.mp4', videoData);
    await instance.writeFile('input_audio.mp4', audioData);

    if (onStatusUpdate) onStatusUpdate('Merging Video & Audio (Muxing)...', 55);
    await instance.exec([
      '-i', 'input_video.mp4',
      '-i', 'input_audio.mp4',
      '-c', 'copy',
      'output.mp4'
    ]);

    if (onStatusUpdate) onStatusUpdate('Preparing final video download...', 95);
    const data = await instance.readFile('output.mp4');

    await instance.deleteFile('input_video.mp4');
    await instance.deleteFile('input_audio.mp4');
    await instance.deleteFile('output.mp4');

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(blob);

    if (onStatusUpdate) onStatusUpdate('Complete!', 100);

    return {
      blobUrl,
      filename: outputFilename || 'download.mp4'
    };
  } catch (err) {
    console.error('Merge error:', err);
    throw new Error(err?.message || 'Failed to merge streams.');
  }
}

export async function convertToMp3(audioUrl, outputFilename, onStatusUpdate) {
  try {
    if (onStatusUpdate) onStatusUpdate('Initializing FFmpeg Audio Engine...', 10);
    const instance = await initFFmpeg((percent) => {
      if (onStatusUpdate) onStatusUpdate(`Converting to MP3: ${percent}%`, 40 + Math.round(percent * 0.6));
    });

    if (onStatusUpdate) onStatusUpdate('Downloading audio stream...', 25);
    const audioData = await fetchFile(audioUrl);

    await instance.writeFile('input_audio', audioData);

    if (onStatusUpdate) onStatusUpdate('Converting Audio to High Quality MP3 (320kbps)...', 50);
    await instance.exec([
      '-i', 'input_audio',
      '-vn',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '320k',
      'output.mp3'
    ]);

    const data = await instance.readFile('output.mp3');
    await instance.deleteFile('input_audio');
    await instance.deleteFile('output.mp3');

    const blob = new Blob([data.buffer], { type: 'audio/mp3' });
    const blobUrl = URL.createObjectURL(blob);

    if (onStatusUpdate) onStatusUpdate('Complete!', 100);
    return {
      blobUrl,
      filename: outputFilename || 'audio.mp3'
    };
  } catch (err) {
    console.error('Audio conversion error:', err);
    throw new Error(err?.message || 'Failed to convert audio to MP3.');
  }
}
