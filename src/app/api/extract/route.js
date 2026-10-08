import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Provider 1: Edge Stream Resolver (Mudassir Engine - 100% Shorts & Music Resolution)
async function fetchFromEdgeEngine(targetUrl) {
  try {
    const res = await fetch('https://yt.mudassirasghar.dev/api/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.title && (data.videos?.length || data.audios?.length)) {
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Provider 2: Cobalt High-Speed Engine
async function fetchFromCobalt(targetUrl) {
  const instances = [
    'https://api.cobalt.tools',
    'https://cobalt.api.scie.dev',
    'https://co.wuk.sh/api/json'
  ];

  for (const inst of instances) {
    try {
      const res = await fetch(inst, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ url: targetUrl, videoQuality: 'max', youtubeVideoCodec: 'h264' }),
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url || data.status === 'stream' || data.status === 'redirect') {
          return { streamUrl: data.url, filename: data.filename };
        }
      }
    } catch (e) {}
  }
  return null;
}

// Provider 3: Piped API Network
async function fetchFromPiped(videoId) {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.tokhmi.xyz'
  ];

  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.title && (data.videoStreams?.length || data.audioStreams?.length)) {
          return data;
        }
      }
    } catch (e) {}
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    let videoId = body.videoId;

    if (!videoId && body.url) {
      const match = body.url.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Valid YouTube Video ID or URL is required' }, { status: 400 });
    }

    const targetUrl = body.url || `https://www.youtube.com/watch?v=${videoId}`;

    // 1. Try Mudassir Edge Engine (Handles 100% Shorts & Music Videos)
    const edgeData = await fetchFromEdgeEngine(targetUrl);
    if (edgeData) {
      const videoDetails = {
        id: videoId || edgeData.id,
        title: edgeData.title,
        author: edgeData.uploader || 'YouTube Creator',
        lengthSeconds: edgeData.duration || 0,
        viewCount: 0,
        thumbnail: edgeData.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      };

      const formats = [];

      (edgeData.videos || []).forEach((v, idx) => {
        const rawUrl = v.downloadUrl?.startsWith('http')
          ? v.downloadUrl
          : `https://yt.mudassirasghar.dev${v.downloadUrl}`;

        const qualityText = v.qualityLabel || `${v.height || 720}p`;
        const tokenObj = { u: rawUrl, t: edgeData.title, q: qualityText };
        const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

        formats.push({
          itag: v.itag || (1000 + idx),
          url: rawUrl,
          token: token,
          mimeType: v.mime || 'video/mp4',
          quality: qualityText,
          container: v.ext || 'mp4',
          hasVideo: true,
          hasAudio: Boolean(v.hasAudio),
          contentLength: v.filesizeApprox || null,
          height: v.height || null
        });
      });

      (edgeData.audios || []).forEach((a, idx) => {
        const rawUrl = a.downloadUrl?.startsWith('http')
          ? a.downloadUrl
          : `https://yt.mudassirasghar.dev${a.downloadUrl}`;

        const qualityText = a.qualityLabel || '128kbps';
        const tokenObj = { u: rawUrl, t: edgeData.title, q: qualityText };
        const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

        formats.push({
          itag: a.itag || (2000 + idx),
          url: rawUrl,
          token: token,
          mimeType: a.mime || 'audio/mp4',
          quality: qualityText,
          container: a.ext || 'm4a',
          hasVideo: false,
          hasAudio: true,
          contentLength: a.filesizeApprox || null
        });
      });

      if (formats.length > 0) {
        return NextResponse.json({ videoDetails, formats });
      }
    }

    // 2. Try Cobalt Engine
    const cobaltRes = await fetchFromCobalt(targetUrl);
    if (cobaltRes?.streamUrl) {
      const videoDetails = {
        id: videoId,
        title: cobaltRes.filename || 'YouTube Video',
        author: 'YouTube Creator',
        lengthSeconds: 0,
        viewCount: 0,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      };

      const tokenObj = { u: cobaltRes.streamUrl, t: videoDetails.title, q: '1080p Full HD' };
      const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

      const formats = [
        {
          itag: 1080,
          url: cobaltRes.streamUrl,
          token: token,
          mimeType: 'video/mp4',
          quality: '1080p Full HD',
          container: 'mp4',
          hasVideo: true,
          hasAudio: true,
          contentLength: null
        }
      ];

      return NextResponse.json({ videoDetails, formats });
    }

    // 3. Try Piped API Instances
    const pipedData = await fetchFromPiped(videoId);
    if (pipedData) {
      const title = pipedData.title || 'YouTube Video';
      const author = pipedData.uploader || 'YouTube Creator';
      const lengthSeconds = pipedData.duration || 0;
      const viewCount = pipedData.views || 0;
      const thumbnail = pipedData.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      const videoDetails = { id: videoId, title, author, lengthSeconds, viewCount, thumbnail };
      const formats = [];

      (pipedData.videoStreams || []).forEach((v, idx) => {
        if (!v.url) return;
        const qualityText = v.quality || (v.height ? `${v.height}p` : 'HD');
        const tokenObj = { u: v.url, t: title, q: qualityText };
        const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

        formats.push({
          itag: 3000 + idx,
          url: v.url,
          token: token,
          mimeType: v.mimeType || 'video/mp4',
          quality: qualityText,
          container: v.format || 'mp4',
          hasVideo: true,
          hasAudio: !v.videoOnly,
          contentLength: v.contentLength || null,
          height: v.height || null
        });
      });

      (pipedData.audioStreams || []).forEach((a, idx) => {
        if (!a.url) return;
        const qualityText = a.quality || '128kbps';
        const tokenObj = { u: a.url, t: title, q: qualityText };
        const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

        formats.push({
          itag: 4000 + idx,
          url: a.url,
          token: token,
          mimeType: a.mimeType || 'audio/mp4',
          quality: qualityText,
          container: a.format || 'm4a',
          hasVideo: false,
          hasAudio: true,
          contentLength: a.contentLength || null
        });
      });

      if (formats.length > 0) {
        return NextResponse.json({ videoDetails, formats });
      }
    }

    return NextResponse.json({ 
      error: 'Unable to extract video streams. The video may be private or region-restricted.' 
    }, { status: 404 });

  } catch (err) {
    console.error('Extraction route error:', err);
    return NextResponse.json({ error: err.message || 'Internal extraction failure' }, { status: 500 });
  }
}


