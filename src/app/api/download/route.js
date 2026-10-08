import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const directUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'video.mp4';
    const mime = searchParams.get('mime') || 'video/mp4';

    let targetUrl = directUrl;

    if (token) {
      try {
        const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
        const tokenObj = JSON.parse(decodedStr);
        if (tokenObj.u) {
          targetUrl = tokenObj.u;
        }
      } catch (e) {
        targetUrl = decodeURIComponent(token);
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'Download URL or token is required' }, { status: 400 });
    }

    // Serverless streaming fetch from YouTube CDN to client browser
    const cdnResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    if (!cdnResponse.ok) {
      // Fallback: Redirect client directly to CDN URL if proxy fails
      return NextResponse.redirect(targetUrl);
    }

    const headers = new Headers();
    headers.set('Content-Type', mime);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const contentLength = cdnResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(cdnResponse.body, {
      status: 200,
      headers
    });

  } catch (err) {
    console.error('Download stream error:', err);
    return NextResponse.json({ error: err.message || 'Failed to stream download' }, { status: 500 });
  }
}
