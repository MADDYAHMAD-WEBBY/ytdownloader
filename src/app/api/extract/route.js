import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INNERTUBE_CLIENTS = [
  {
    name: 'ANDROID',
    version: '19.11.38',
    ua: 'com.google.android.youtube/19.11.38 (Linux; U; Android 14; en_US; SM-S918B Build/UP1A.231005.007)'
  },
  {
    name: 'IOS',
    version: '19.45.4',
    ua: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X; en_US)'
  },
  {
    name: 'WEB',
    version: '2.20240901.00.00',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  },
  {
    name: 'TVHTML5',
    version: '7.20240901.00.00',
    ua: 'Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/SmartTV) AppleWebKit/537.42 (KHTML, like Gecko) Safari/537.42'
  }
];

async function fetchFromInnerTube(videoId, clientConfig) {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': clientConfig.ua,
        'X-YouTube-Client-Name': clientConfig.name === 'ANDROID' ? '3' : clientConfig.name === 'IOS' ? '5' : '1',
        'X-YouTube-Client-Version': clientConfig.version
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: clientConfig.name,
            clientVersion: clientConfig.version,
            hl: 'en',
            gl: 'US'
          }
        },
        videoId: videoId
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.playabilityStatus?.status === 'OK' && data.streamingData) {
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
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

    let playerData = null;

    // Try multi-client InnerTube rotators (ANDROID -> IOS -> WEB -> TVHTML5)
    for (const client of INNERTUBE_CLIENTS) {
      playerData = await fetchFromInnerTube(videoId, client);
      if (playerData?.streamingData) break;
    }

    if (!playerData || !playerData.videoDetails) {
      return NextResponse.json({ 
        error: 'Unable to extract video streams. The video may be private, age-restricted, or region-blocked.' 
      }, { status: 404 });
    }

    const title = playerData.videoDetails.title || 'YouTube Video';
    const author = playerData.videoDetails.author || 'YouTube Creator';
    const lengthSeconds = playerData.videoDetails.lengthSeconds || 0;
    const viewCount = playerData.videoDetails.viewCount || 0;
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    const videoDetails = {
      id: videoId,
      title,
      author,
      lengthSeconds,
      viewCount,
      thumbnail
    };

    const combinedFormats = playerData.streamingData.formats || [];
    const adaptiveFormats = playerData.streamingData.adaptiveFormats || [];
    const allRawFormats = [...combinedFormats, ...adaptiveFormats];

    const formats = [];

    allRawFormats.forEach((fmt, idx) => {
      let rawUrl = fmt.url;
      if (!rawUrl && fmt.cipher) {
        const params = new URLSearchParams(fmt.cipher);
        rawUrl = params.get('url');
      }
      if (!rawUrl && fmt.signatureCipher) {
        const params = new URLSearchParams(fmt.signatureCipher);
        rawUrl = params.get('url');
      }

      if (!rawUrl) return;

      const isAudio = fmt.mimeType?.includes('audio');
      const isVideo = fmt.mimeType?.includes('video');

      const qualityText = fmt.qualityLabel 
        ? fmt.qualityLabel 
        : isAudio 
          ? `${Math.round((fmt.bitrate || 128000) / 1000)}kbps` 
          : 'Standard';

      const tokenObj = { u: rawUrl, t: title, q: qualityText };
      const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');

      formats.push({
        itag: fmt.itag || (idx + 1),
        url: rawUrl,
        token: token,
        mimeType: fmt.mimeType || (isAudio ? 'audio/mp4' : 'video/mp4'),
        quality: qualityText,
        container: (fmt.mimeType?.split(';')[0]?.split('/')[1]) || (isAudio ? 'm4a' : 'mp4'),
        hasVideo: Boolean(isVideo),
        hasAudio: Boolean(isAudio || fmt.audioQuality || combinedFormats.includes(fmt)),
        contentLength: fmt.contentLength || null,
        height: fmt.height || null
      });
    });

    return NextResponse.json({ videoDetails, formats });

  } catch (err) {
    console.error('Extraction route error:', err);
    return NextResponse.json({ error: err.message || 'Internal extraction failure' }, { status: 500 });
  }
}

