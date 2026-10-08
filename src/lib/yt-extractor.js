/**
 * YouTube Video Extractor - Client-side parsing & extraction utility
 */

export function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const sec = parseInt(seconds, 10);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return 'N/A';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function fetchVideoData(videoId, rawUrl = '') {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, url: rawUrl })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not fetch video metadata from server.');
  }

  const data = await res.json();
  if (data.videoDetails && data.formats?.length) {
    return categorizeFormats(data.videoDetails, data.formats);
  }

  throw new Error('No playable stream formats were found for this video.');
}

function parsePlayerResponse(data) {
  const details = data.videoDetails;
  const streamingData = data.streamingData || {};

  const videoDetails = {
    id: details.videoId,
    title: details.title,
    author: details.author,
    lengthSeconds: details.lengthSeconds,
    viewCount: details.viewCount,
    thumbnail: `https://i.ytimg.com/vi/${details.videoId}/maxresdefault.jpg`
  };

  const rawFormats = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || [])
  ];

  const processedFormats = [];

  rawFormats.forEach(fmt => {
    if (!fmt.url) return;

    const isAudio = fmt.mimeType?.includes('audio');
    const isVideo = fmt.mimeType?.includes('video');

    processedFormats.push({
      itag: fmt.itag,
      url: fmt.url,
      mimeType: fmt.mimeType,
      quality: fmt.qualityLabel || (isAudio ? `${Math.round((fmt.bitrate || 128000) / 1000)}kbps` : 'Standard'),
      container: (fmt.mimeType ? fmt.mimeType.split(';')[0].split('/')[1] : 'mp4'),
      hasVideo: isVideo,
      hasAudio: isAudio || Boolean(fmt.audioQuality),
      contentLength: fmt.contentLength ? parseInt(fmt.contentLength, 10) : null,
      height: fmt.height || null,
      width: fmt.width || null,
      fps: fmt.fps || null
    });
  });

  return categorizeFormats(videoDetails, processedFormats);
}

function categorizeFormats(videoDetails, formats) {
  const combined = [];
  const videoOnly = [];
  const audioOnly = [];

  const seenQualities = new Set();

  formats.forEach(fmt => {
    if (fmt.hasVideo && fmt.hasAudio) {
      if (!seenQualities.has(`combined-${fmt.quality}`)) {
        seenQualities.add(`combined-${fmt.quality}`);
        combined.push(fmt);
      }
    } else if (fmt.hasVideo && !fmt.hasAudio) {
      const key = `video-${fmt.height || fmt.quality}`;
      if (!seenQualities.has(key)) {
        seenQualities.add(key);
        videoOnly.push(fmt);
      }
    } else if (!fmt.hasVideo && fmt.hasAudio) {
      const key = `audio-${fmt.quality}`;
      if (!seenQualities.has(key)) {
        seenQualities.add(key);
        audioOnly.push(fmt);
      }
    }
  });

  videoOnly.sort((a, b) => (b.height || 0) - (a.height || 0));
  combined.sort((a, b) => (b.height || 0) - (a.height || 0));

  const bestAudio = audioOnly[0] || null;

  return {
    videoDetails,
    combined,
    videoOnly,
    audioOnly,
    bestAudio
  };
}
