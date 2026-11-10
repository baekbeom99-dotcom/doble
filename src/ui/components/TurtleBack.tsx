import { useEffect, useRef, useState } from 'react';
import type { Ellipse } from '../../engine/geometry';
import { paperShades } from '../../engine/seats';
import { TURTLE_HEAD } from '../../engine/sky';

/** 혼자 하기 거북이 등껍질 색 (초록 계열) */
export const TURTLE_SHELL = '#86b77e';
const SKIN = '#f1dcc0';
const SKIN_SHADE = '#e2c59f';
/** 맞혔을 때 뒤통수 홍조 (분홍 사선) */
const BLUSH = '#f08aa0';
/** 홍조 사선 묶음의 가운데 x (양쪽), 사선 3개씩 */
const BLUSH_X = [-0.2, 0.2];
/** 홍조가 남아 있는 시간 */
const BLUSH_MS = 1200;

/** 짧은 분홍 사선 하나 (뒤통수 가운데 높이) */
function blushLine(x: number): string {
  const y = -(TURTLE_HEAD.top + 0.9) / 2;
  return `M${(x - 0.025).toFixed(3)} ${(y + 0.04).toFixed(3)} L${(x + 0.025).toFixed(3)} ${(y - 0.04).toFixed(3)}`;
}
/** 영역 타원 반지름의 몇 배까지 그림을 그릴지 (머리·다리가 영역 밖으로 나온다) */
const PAD = 1.5;
/** 등껍질 격자 무늬 간격 (타원 반지름 1 기준) */
const GRID = 0.3;

/**
 * 끝이 둥근 기둥(엄지) 모양 경로. 가로 반폭 w, 꼭대기 높이 top (등껍질 아래 끝 기준 반지름 배수).
 * 화면에서 둥글게 보이도록 위쪽 반원의 세로 반지름을 가로세로 비율(aspect = rx/ry)만큼 줄인다. shift만큼 오른쪽으로 옮긴다.
 */
function thumb(w: number, top: number, aspect: number, shift = 0): string {
  const capH = w * aspect;
  const f = (v: number) => v.toFixed(3);
  return `M${f(shift - w)} -0.9 L${f(shift - w)} ${f(-top + capH)} A${f(w)} ${f(capH)} 0 0 1 ${f(shift + w)} ${f(-top + capH)} L${f(shift + w)} -0.9 Z`;
}

interface Props {
  index: number;
  ellipse: Ellipse;
  /** under: 등껍질 뒤 목·머리·다리, over: 등껍질 위 격자 무늬 */
  layer: 'under' | 'over';
  /** 방금 맞혔다: 머리가 들썩이고 뒤통수에 홍조 */
  cheer?: boolean;
}

/**
 * 혼자 하기 자리: 바다를 헤엄치는 귀여운 거북이를 뒤에서 본 모습.
 * 영역 타원이 초록 등껍질이고, 등껍질 위로 긴 목과 동그란 뒤통수가 빼꼼 나온다.
 * 좌표는 타원 반지름을 1로 둔 값이다 (y = -1이 등껍질 꼭대기).
 */
export function TurtleBack({ index, ellipse, layer, cheer = false }: Props) {
  // 맞힐 때마다 홍조를 잠시 띄운다
  // (정답 강조가 먼저 끝나도 홍조 타이머는 지우지 않고, 화면을 떠날 때만 지운다)
  const [blush, setBlush] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!cheer) return;
    setBlush(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBlush(false), BLUSH_MS);
  }, [cheer]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const { cx, cy, rx, ry } = ellipse;
  const [mid, dark] = paperShades(TURTLE_SHELL);
  const style = { left: cx - PAD * rx, top: cy - PAD * ry, width: 2 * PAD * rx, height: 2 * PAD * ry };
  const line = { vectorEffect: 'non-scaling-stroke' as const, strokeLinecap: 'round' as const };
  const clipId = `turtle-shell-${index}`;
  const diagonals = Array.from({ length: 13 }, (_, i) => (i - 6) * GRID);
  return (
    <svg
      className={`turtle-back turtle-back--${layer}`}
      data-testid={layer === 'over' ? `turtle-back-${index}` : undefined}
      style={style}
      viewBox={`${-PAD} ${-PAD} ${2 * PAD} ${2 * PAD}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {layer === 'under' ? (
        <>
          {/* 뒷다리: 등껍질 양옆 아래로 통통한 발 */}
          <ellipse cx="-1.04" cy="-0.12" rx="0.16" ry="0.12" fill={SKIN_SHADE} />
          <ellipse cx="-1.03" cy="-0.14" rx="0.14" ry="0.1" fill={SKIN} />
          <ellipse cx="1.04" cy="-0.12" rx="0.16" ry="0.12" fill={SKIN_SHADE} />
          <ellipse cx="1.03" cy="-0.14" rx="0.14" ry="0.1" fill={SKIN} />
          {/* 뒤통수: 엄지손가락처럼 굵고 끝이 둥근 기둥. 얼굴은 앞을 보고 있어 보이지 않는다. 머리만 살랑살랑 움직인다 */}
          <g className={cheer ? 'turtle-back__head is-cheer' : 'turtle-back__head'}>
            <path d={thumb(TURTLE_HEAD.halfWidth, TURTLE_HEAD.top, rx / ry)} fill={SKIN} />
            {(cheer || blush) && (
              <g data-testid={`turtle-blush-${index}`} stroke={BLUSH} strokeWidth="4" strokeLinecap="round">
                {BLUSH_X.map(x => [0, 1, 2].map(k => (
                  <path key={`${x}-${k}`} d={blushLine(x + Math.sign(x) * k * 0.07)} vectorEffect="non-scaling-stroke" />
                )))}
              </g>
            )}
          </g>
        </>
      ) : (
        <>
          <defs>
            <clipPath id={clipId}>
              <ellipse cx="0" cy="0" rx="0.9" ry="0.9" />
            </clipPath>
          </defs>
          {/* 등껍질 격자 무늬 (그림 2처럼 엇갈린 선) */}
          {/* vector-effect는 상속되지 않으므로 선마다 붙인다 */}
          <g clipPath={`url(#${clipId})`} stroke={dark} strokeWidth="4" opacity=".45">
            {diagonals.map(d => <path key={`a${d}`} d={`M${d - 1} -1 L${d + 1} 1`} {...line} />)}
            {diagonals.map(d => <path key={`b${d}`} d={`M${d + 1} -1 L${d - 1} 1`} {...line} />)}
          </g>
          {/* 등껍질 아랫단 띠 */}
          <ellipse cx="0" cy="0" rx="0.94" ry="0.94" fill="none" stroke={mid} strokeWidth="10" {...line} />
        </>
      )}
    </svg>
  );
}
