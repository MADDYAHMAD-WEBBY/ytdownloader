import './globals.css';

export const metadata = {
  title: 'YT StreamHub - Next.js 4K YouTube Video Downloader (Zero Bandwidth Cost)',
  description: 'Download YouTube videos in 4K, 1080p, 60fps and MP3 audio instantly. Powered by Next.js, Client-Side WebAssembly & Edge API Routes — 100% Free & Private.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="dark-theme">
        <div className="ambient-glow glow-1"></div>
        <div className="ambient-glow glow-2"></div>
        <div className="ambient-glow glow-3"></div>
        {children}
      </body>
    </html>
  );
}
