'use client';

import { useState } from 'react';
import { 
  Zap, ShieldCheck, Gauge, Youtube, Clipboard, X, CloudDownload, 
  Loader2, Play, UserCheck, Eye, Film, Sparkles, Music, 
  ArrowDown, Headphones, ShieldAlert, Cpu, HelpCircle, Download 
} from 'lucide-react';

import { extractVideoId, formatDuration, formatBytes, fetchVideoData } from '@/lib/yt-extractor';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [videoData, setVideoData] = useState(null);
  const [activeTab, setActiveTab] = useState('video');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        triggerExtract(text);
      }
    } catch (err) {
      setError({ title: 'Clipboard Permission', message: 'Could not read clipboard. Please paste manually.' });
    }
  };

  const triggerExtract = async (targetUrl = url) => {
    setError(null);
    const videoId = extractVideoId(targetUrl);

    if (!videoId) {
      setError({ title: 'Invalid YouTube Link', message: 'Please enter a valid YouTube video or Shorts URL.' });
      return;
    }

    setLoading(true);

    try {
      const data = await fetchVideoData(videoId, targetUrl);
      setVideoData(data);
      setActiveTab('video');
    } catch (err) {
      setError({ title: 'Extraction Failed', message: err.message || 'Could not parse video metadata.' });
    } finally {
      setLoading(false);
    }
  };

  const cleanFilename = (title) => {
    return (title || 'youtube_video')
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 60);
  };

  const buildDownloadUrl = (fmt, defaultExt = 'mp4', defaultMime = 'video/mp4') => {
    const safeTitle = cleanFilename(videoData?.videoDetails?.title);
    const ext = fmt.container || defaultExt;
    const mime = fmt.mimeType || defaultMime;
    const filename = `${safeTitle}_${fmt.quality}.${ext}`;

    if (fmt.token) {
      return `/api/download?token=${fmt.token}&filename=${encodeURIComponent(filename)}&mime=${encodeURIComponent(mime)}`;
    }
    return `/api/download?url=${encodeURIComponent(fmt.url)}&filename=${encodeURIComponent(filename)}&mime=${encodeURIComponent(mime)}`;
  };

  return (
    <>
      {/* Navbar Header */}
      <header className="site-header">
        <div className="header-container">
          <a href="#" className="brand-logo">
            <div className="logo-icon">
              <Zap size={20} />
            </div>
            <span className="logo-text">YT<span className="highlight">StreamHub</span> <span style={{fontSize: '0.75rem', opacity: 0.7, fontWeight: 500}}>(Pro)</span></span>
          </a>
          <div className="header-badges">
            <span className="badge badge-edge"><ShieldCheck size={14} /> Anti-IP Ban Engine</span>
            <span className="badge badge-zero"><Gauge size={14} /> 0 Server Bandwidth</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <Sparkles size={16} /> Instant High-Speed Direct Stream Downloader
          </div>
          <h1 className="hero-title">Download YouTube Videos <br /><span className="gradient-text">In Ultra 1080p, 4K & MP3</span></h1>
          <p className="hero-subtitle">Fast, free online YouTube downloader. Save videos in Full HD or extract studio-quality MP3 audio with 1-click.</p>

          {/* URL Input Box */}
          <div className="input-card glass-panel">
            <div className="input-wrapper">
              <Youtube size={22} className="input-icon" />
              <input 
                type="text" 
                className="video-url-input"
                placeholder="Paste YouTube video or Shorts URL here..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerExtract()}
                id="videoUrlInput"
              />
              {url ? (
                <button type="button" className="btn-action" onClick={() => setUrl('')} title="Clear">
                  <X size={16} />
                </button>
              ) : (
                <button type="button" className="btn-action" onClick={handlePaste} title="Paste Clipboard">
                  <Clipboard size={16} /> Paste
                </button>
              )}
            </div>
            <button type="button" className="btn-submit" onClick={() => triggerExtract()} disabled={loading} id="btnExtract">
              {loading ? (
                <><Loader2 className="animate-spin" size={18} /> Processing...</>
              ) : (
                <><CloudDownload size={18} /> Get Downloads</>
              )}
            </button>
          </div>

          {/* Quick Examples */}
          <div className="quick-examples">
            <span className="quick-label">Try Example:</span>
            <button className="tag-btn" onClick={() => { setUrl('https://www.youtube.com/watch?v=aqz-KE-bpKQ'); triggerExtract('https://www.youtube.com/watch?v=aqz-KE-bpKQ'); }}>Big Buck Bunny (4K)</button>
            <button className="tag-btn" onClick={() => { setUrl('https://www.youtube.com/watch?v=L_LUpnjgPso'); triggerExtract('https://www.youtube.com/watch?v=L_LUpnjgPso'); }}>Music Video</button>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="error-panel glass-panel">
            <ShieldAlert size={24} className="error-icon" />
            <div className="error-content">
              <h4>{error.title}</h4>
              <p>{error.message}</p>
            </div>
            <button className="error-close" onClick={() => setError(null)}><X size={18} /></button>
          </div>
        )}

        {/* Video Preview & Download Options */}
        {videoData && (
          <section className="results-section">
            <div className="video-preview-card glass-panel">
              {/* Thumbnail */}
              <div className="thumbnail-wrapper">
                <img src={videoData.videoDetails.thumbnail} alt={videoData.videoDetails.title} className="thumbnail-img" />
                <span className="duration-badge">{formatDuration(videoData.videoDetails.lengthSeconds)}</span>
                <a href={`https://www.youtube.com/watch?v=${videoData.videoDetails.id}`} target="_blank" rel="noreferrer" className="play-overlay" title="Watch on YouTube">
                  <Play size={40} />
                </a>
              </div>

              {/* Info */}
              <div className="video-info">
                <h2 className="video-title">{videoData.videoDetails.title}</h2>
                <div className="video-meta">
                  <span className="meta-item"><UserCheck size={16} /> {videoData.videoDetails.author}</span>
                  <span className="meta-item"><Eye size={16} /> {Number(videoData.videoDetails.viewCount || 0).toLocaleString()} views</span>
                  <span className="badge-hd"><Film size={14} /> Full HD / 4K Ready</span>
                </div>

                {/* Tabs */}
                <div className="format-tabs">
                  <button className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>
                    <Film size={16} /> Video Downloads (MP4)
                  </button>
                  <button className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
                    <Music size={16} /> Audio Only (MP3 / M4A)
                  </button>
                </div>

                {/* Tab Content Panes */}
                <div className="tab-contents">
                  {/* Video Downloads Pane */}
                  {activeTab === 'video' && (
                    <div className="tab-pane active">
                      <div className="pane-header">
                        <Zap size={16} /> Instant 1-click high-speed stream downloads powered by Edge Token Architecture.
                      </div>
                      <div className="options-list">
                        {[...videoData.combined, ...videoData.videoOnly].map((fmt, idx) => {
                          const sizeText = fmt.contentLength ? formatBytes(fmt.contentLength) : 'Direct Stream';
                          const dlUrl = buildDownloadUrl(fmt, 'mp4', 'video/mp4');

                          return (
                            <div className="option-row" key={idx}>
                              <div className="option-meta">
                                <span className="quality-badge">{fmt.quality}</span>
                                <div className="option-details">
                                  <span className="option-name">{fmt.quality} MP4 Video</span>
                                  <span className="option-size"><Zap size={12} /> Instant Stream • {sizeText}</span>
                                </div>
                              </div>
                              <a href={dlUrl} download className="btn-download">
                                <Download size={16} /> Download {fmt.quality}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Audio Downloads Pane */}
                  {activeTab === 'audio' && (
                    <div className="tab-pane active">
                      <div className="pane-header">
                        <Music size={16} /> Extract original studio-quality audio streams directly.
                      </div>
                      <div className="options-list">
                        {videoData.audioOnly.map((fmt, idx) => {
                          const sizeText = fmt.contentLength ? formatBytes(fmt.contentLength) : 'Direct Stream';
                          const dlUrl = buildDownloadUrl(fmt, 'm4a', 'audio/mp4');

                          return (
                            <div className="option-row" key={idx}>
                              <div className="option-meta">
                                <span className="quality-badge badge-audio">{fmt.quality}</span>
                                <div className="option-details">
                                  <span className="option-name">Audio Stream ({fmt.container.toUpperCase()})</span>
                                  <span className="option-size"><Music size={12} /> Direct High Quality Audio • {sizeText}</span>
                                </div>
                              </div>
                              <a href={dlUrl} download className="btn-download">
                                <Headphones size={16} /> Download Audio
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Feature Cards Grid */}
        <section className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon glow-cyan">
              <ShieldCheck size={28} />
            </div>
            <h3>Anti-IP Ban Protection</h3>
            <p>Stream URLs are resolved using client-side JavaScript and Edge proxies. YouTube sees requests from your personal IP, completely eliminating server IP bans.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon glow-purple">
              <Gauge size={28} />
            </div>
            <h3>Zero Server Bandwidth</h3>
            <p>Video bytes travel straight from YouTube's CDN to your browser. No middleman server bandwidth overhead or speed throttling.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon glow-emerald">
              <Cpu size={28} />
            </div>
            <h3>1-Click Direct Downloads</h3>
            <p>Uses Edge Encrypted Token Streaming to trigger instant native browser downloads for 1080p, 4K, and MP3 audio files.</p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section glass-panel">
          <h3 className="section-title"><HelpCircle size={22} /> Frequently Asked Questions</h3>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Why is this downloader so fast?</h4>
              <p>It uses Next.js serverless streaming proxies. The multi-gigabyte video stream passes directly between YouTube CDN and your browser download manager at maximum ISP speed.</p>
            </div>
            <div className="faq-item">
              <h4>Does it work on mobile phones?</h4>
              <p>Yes! It works 100% on iOS iPhone Safari, Android Chrome, and all desktop browsers.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <p>© 2026 YT StreamHub. Built with Next.js App Router, Edge Stream Proxies & Zero-Bandwidth Architecture.</p>
      </footer>
    </>
  );
}
