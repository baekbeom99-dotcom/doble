import { useEffect, useState } from 'react';

/** 표준 이름과 사파리(webkit) 이름을 함께 다룬다 */
type FsRoot = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDoc = Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };

const FS_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'];

function isFullscreen(): boolean {
  const doc = document as FsDoc;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

function isSupported(): boolean {
  const root = document.documentElement as FsRoot;
  return Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
}

/** 전체 화면으로 바꾸거나 되돌리는 버튼. 지원하지 않는 기기에서는 그리지 않는다 */
export function FullscreenButton({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(isFullscreen);

  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    FS_EVENTS.forEach(e => document.addEventListener(e, sync));
    return () => FS_EVENTS.forEach(e => document.removeEventListener(e, sync));
  }, []);

  if (!isSupported()) return null;

  const toggle = () => {
    const root = document.documentElement as FsRoot;
    const doc = document as FsDoc;
    const done = on
      ? (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc)
      : (root.requestFullscreen ?? root.webkitRequestFullscreen)?.call(root);
    // 기기가 거절해도 게임은 그대로 이어진다
    if (done) void Promise.resolve(done).catch(() => {});
  };

  const label = on ? '전체 화면 끝내기' : '전체 화면';
  return (
    <button type="button" className={`btn fullscreen-btn ${className}`.trim()} aria-label={label} aria-pressed={on} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {on
          ? <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
          : <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />}
      </svg>
    </button>
  );
}
