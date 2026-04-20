import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

function PlayerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const artRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);           // 使用 any 避免 Artplayer 类型导入问题
  const hlsRef = useRef<Hls | null>(null);

  const url = searchParams.get('url');
  const title = searchParams.get('title') || '视频播放';

  // 清理播放器实例，防止内存泄漏
  const cleanupPlayer = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('hls destroy error:', e);
      }
      hlsRef.current = null;
    }

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('artplayer destroy error:', e);
      }
      playerRef.current = null;
    }
  };

  useEffect(() => {
    if (!url || !artRef.current) {
      return;
    }

    // 先清理旧实例
    cleanupPlayer();

    const art = new Artplayer({
      container: artRef.current,
      url: url,
      title: title,
      setting: true,
      autoplay: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      hotkey: true,
      playbackRate: true,
      lock: true,
      fastForward: true,
      theme: '#23ade5',
      customType: {
        m3u8: function playM3u8(video: HTMLVideoElement, url: string, art: any) {
          if (Hls.isSupported()) {
            // 清理旧 hls 实例
            if (hlsRef.current) {
              try {
                hlsRef.current.destroy();
              } catch (e) {
                console.warn('previous hls destroy error:', e);
              }
              hlsRef.current = null;
            }

            const hls = new Hls();
            const proxyUrl = localStorage.getItem('m3u8ProxySelected');
            const finalUrl = proxyUrl ? `\( {proxyUrl} \){url}` : url;

            hls.loadSource(finalUrl);
            hls.attachMedia(video);

            hlsRef.current = hls;
            (art as any).hls = hls;

            // 监听销毁事件同步清理 hls
            art.on('destroy', () => {
              if (hlsRef.current) {
                try {
                  hlsRef.current.destroy();
                } catch (e) {
                  console.warn('hls destroy on art destroy error:', e);
                }
                hlsRef.current = null;
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            const proxyUrl = localStorage.getItem('m3u8ProxySelected');
            const finalUrl = proxyUrl ? `\( {proxyUrl} \){url}` : url;
            video.src = finalUrl;
          } else {
            art.notice.show = '不支持的播放格式: m3u8';
          }
        }
      }
    });

    playerRef.current = art;

    // url 变化或组件卸载时清理
    return () => {
      cleanupPlayer();
    };
  }, [url, title]);

  // 额外保险清理
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  if (!url) {
    return <div>无效的视频地址</div>;
  }

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#000' }}>
      <div ref={artRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default PlayerPage;
