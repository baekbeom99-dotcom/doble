import { useCallback, useState, type CSSProperties } from 'react';
import { SEAT_COLORS } from '../../engine/seats';
import { FullscreenButton } from '../components/FullscreenButton';
import { HelpDialog } from '../components/HelpDialog';
import { paperStack } from '../paper';
import type { SetupKind } from './Setup';

export const APP_TITLE = 'Turtle Dobble';

/** 해의 종이 고리: 바깥에서 안쪽으로 겹친다 (지름 비율, 색) */
const SUN_RINGS: [number, string][] = [
  [1, '#eea04f'], [0.9, '#f3ac5a'], [0.8, '#f5b665'], [0.7, '#f7c070'],
  [0.6, '#f8c97c'], [0.5, '#f9d188'], [0.4, '#fad894'], [0.3, '#fbdfa0'],
];

/** 언덕 종이 (화면 1000×750 기준): 기준 높이, 물결 크기, 물결 길이, 위상, 색 */
const HILLS: [number, number, number, number, string][] = [
  [360, 26, 620, 0.4, '#a9d48c'],
  [420, 30, 520, 2.2, '#c6e3a2'],
  [490, 24, 700, 1.1, '#93c57a'],
  [560, 28, 560, 3.4, '#b5da92'],
  [640, 22, 640, 0.2, '#84b96d'],
];

const MODES: { kind: SetupKind; title: string; desc: string; color: keyof typeof SEAT_COLORS }[] = [
  { kind: 'solo', title: '혼자 하기', desc: '바다에서 혼자 연습해요', color: 'yellow' },
  { kind: 'versus', title: '같이 하기', desc: '누가 먼저 찾나 겨뤄요', color: 'pink' },
  { kind: 'team', title: '팀 대결', desc: '두 팀으로 점수를 모아요', color: 'sky' },
  { kind: 'coop', title: '협동', desc: '악당 거북이를 물리쳐요', color: 'lime' },
];

function hill(base: number, amp: number, len: number, phase: number): string {
  let d = `M0 750 L0 ${base}`;
  for (let x = 0; x <= 1000; x += 20) d += ` L${x} ${(base + amp * Math.sin((x / len) * Math.PI * 2 + phase)).toFixed(1)}`;
  return `${d} L1000 750 Z`;
}

/** 종이 구름: 뒤쪽 회색 한 장 + 앞쪽 흰 한 장 */
function Cloud({ style }: { style: CSSProperties }) {
  const puff = 'M14 52 Q2 52 4 40 Q6 28 22 30 Q26 10 48 14 Q62 0 80 12 Q104 6 108 28 Q126 30 124 44 Q122 52 110 52 Z';
  return (
    <svg className="title__cloud" viewBox="0 0 130 60" style={style} aria-hidden="true">
      <path d={puff} fill="#e3efeb" transform="translate(6 4)" />
      <path d={puff} fill="#ffffff" />
    </svg>
  );
}

/** 언덕에 선 하얀 종이 거북이 (옆모습) */
function PaperTurtle() {
  return (
    <svg className="title__turtle" viewBox="0 0 140 90" aria-hidden="true">
      <ellipse cx="40" cy="74" rx="11" ry="10" fill="#e9eeec" />
      <ellipse cx="96" cy="74" rx="11" ry="10" fill="#e9eeec" />
      <path d="M112 58 L132 64 L112 66 Z" fill="#e9eeec" />
      <path d="M22 50 Q10 18 26 12 Q42 8 42 30 L46 56 Z" fill="#ffffff" />
      <path d="M22 18 Q28 16 30 20" stroke="#9db0aa" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M28 66 Q30 26 70 24 Q110 26 116 66 Z" fill="#ffffff" />
      <path d="M44 40 Q70 30 98 40 M38 54 Q70 44 106 54" stroke="#dfe8e5" strokeWidth="3" fill="none" />
      <rect x="26" y="62" width="92" height="9" rx="4.5" fill="#eef3f1" />
    </svg>
  );
}

/** 모드 카드 위쪽 그림 */
function ModeIcon({ kind }: { kind: SetupKind }) {
  if (kind === 'solo') {
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M33 26 L33 12 A7 7 0 0 1 47 12 L47 26 Z" fill="#f1dcc0" />
        <path d="M8 58 Q8 22 40 22 Q72 22 72 58 Z" fill="#86b77e" />
        <path d="M22 34 L50 58 M40 24 L70 50 M58 34 L30 58 M40 24 L12 50" stroke="#5f8a58" strokeWidth="2" opacity=".6" />
      </svg>
    );
  }
  if (kind === 'versus') {
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <circle cx="28" cy="32" r="20" fill={SEAT_COLORS.pink} />
        <circle cx="52" cy="28" r="20" fill={SEAT_COLORS.sky} opacity=".95" />
      </svg>
    );
  }
  if (kind === 'team') {
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <circle cx="18" cy="22" r="12" fill={SEAT_COLORS.pink} />
        <circle cx="30" cy="40" r="12" fill={SEAT_COLORS.purple} />
        <circle cx="62" cy="22" r="12" fill={SEAT_COLORS.sky} />
        <circle cx="50" cy="40" r="12" fill={SEAT_COLORS.lime} />
      </svg>
    );
  }
  const spikes = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 18 : 25;
    return `${(40 + r * Math.cos(a)).toFixed(1)},${(30 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <polygon points={spikes} fill="#3f4a24" />
      <circle cx="40" cy="30" r="16" fill="#6b7a3a" />
      <circle cx="40" cy="30" r="11" fill="#eef3dc" />
    </svg>
  );
}

export function Home({ onPick, onCollection }: { onPick: (kind: SetupKind) => void; onCollection?: () => void }) {
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);
  return (
    <main className="title-screen">
      <svg className="title__sky" viewBox="0 0 1000 750" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="1000" height="750" fill="#8fd3c3" />
      </svg>
      <Cloud style={{ left: '-2%', top: '6%', width: '17%' }} />
      <Cloud style={{ left: '24%', top: '22%', width: '14%', animationDelay: '-12s' }} />
      <Cloud style={{ right: '4%', top: '4%', width: '15%', animationDelay: '-6s' }} />
      <Cloud style={{ right: '-3%', top: '24%', width: '21%', animationDelay: '-18s' }} />

      <div className="title__sun" aria-hidden="true">
        {SUN_RINGS.map(([size, color]) => (
          <i key={size} style={{ width: `${size * 100}%`, height: `${size * 100}%`, background: color }} />
        ))}
      </div>
      <h1 className="title__name" aria-label={APP_TITLE}>
        <span>Turtle</span>
        <span>Dobble</span>
      </h1>

      <svg className="title__hills" viewBox="0 0 1000 750" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {HILLS.map(([base, amp, len, phase, color]) => <path key={base} d={hill(base, amp, len, phase)} fill={color} />)}
      </svg>
      <PaperTurtle />

      {onCollection && <button className="btn title__collection" onClick={onCollection}>수집함</button>}
      <div className="title__tools">
        <button className="btn" onClick={() => setHelp(true)}>사용 방법</button>
        <FullscreenButton />
      </div>

      <nav className="title__modes" aria-label="모드 고르기">
        {MODES.map(m => (
          <button key={m.kind} className="mode-card" aria-label={m.title} onClick={() => onPick(m.kind)}>
            <span className="mode-card__art" style={paperStack(SEAT_COLORS[m.color])}><ModeIcon kind={m.kind} /></span>
            <b className="mode-card__title">{m.title}</b>
            <small className="mode-card__desc">{m.desc}</small>
          </button>
        ))}
      </nav>
      {help && <HelpDialog onClose={closeHelp} />}
    </main>
  );
}
