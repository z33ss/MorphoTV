import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import type { Artplayer as ArtplayerType } from 'artplayer';

function SimplePlayerPage() {
  const [searchParams] = useSearchParams();
  const artRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ArtplayerType | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const url = searchParams.get('url');

  // 清理播放器实例（防止内存泄漏）
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
    if (!url || !artRef.current) return;

    // 先清理旧实例
    cleanupPlayer();

    const art = new Artplayer({
      container: artRef.current,
      url: url,
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
        m3u8: function playM3u8(video: HTMLVideoElement, url: string, art: ArtplayerType) {
          if (Hls.isSupported()) {
            // 清理旧的 hls 实例
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
            // @ts-ignore （Artplayer 允许动态添加属性）
            art.hls = hls;

            // 监听 Artplayer 销毁事件，同步清理 hls
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

    // 组件卸载或 url 变化时清理
    return () => {
      cleanupPlayer();
    };
  }, [url]);

  // 额外保险清理（组件完全卸载时）
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  if (!url) {
    return <div>无效的视频地址</div>;
  }

  return (
    <div
      ref={artRef}
      style={{ width: '100%', height: '100vh', backgroundColor: '#000' }}
    />
  );
}

export default SimplePlayerPage;
