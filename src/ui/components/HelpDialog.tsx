import { useEffect } from 'react';

const STEPS = [
  '내 카드와 가운데 카드에 똑같은 글자가 딱 하나 있어요.',
  '그 글자를 찾아서 내 카드에서 눌러요.',
  '틀리면 잠깐 누를 수 없으니 잘 보고 눌러요.',
];

const MODES: { title: string; lines: string[] }[] = [
  {
    title: '혼자 하기',
    lines: [
      '서바이벌: 시간이 다 되기 전까지 많이 맞혀요. 맞히면 3초가 늘고 틀리면 줄어요.',
      '스테이지 도전: 단계를 하나씩 깨요.',
      '몬스터 사냥: 불 공격을 막으면서 악당 거북이를 물리쳐요.',
    ],
  },
  {
    title: '대결하기',
    lines: [
      '점수제: 먼저 맞힌 사람이 점수를 얻어요.',
      '폭탄 돌리기: 맞히면 내 카드를 친구에게 넘겨요. 카드가 먼저 0장이 되면 이겨요.',
    ],
  },
  { title: '팀 대결', lines: ['두 팀으로 나눠 점수를 모아요. 같은 팀 점수는 더해져요.'] },
  {
    title: '같이 하기',
    lines: [
      '모두 힘을 모아 악당 거북이의 체력을 깎아요. 하트 3개가 다 없어지면 끝나요.',
      '거북이가 친구에게 불을 뿜으면 다른 친구들이 2번 맞혀서 구해 줘요.',
    ],
  },
];

const TIPS = [
  '모드를 고르면 설정 화면이 나와요. 인원, 글자 종류, 글자 수를 정하고 시작을 눌러요.',
  '글자 수를 줄이면 쉬워져요. 사람마다 다르게 정할 수 있어요.',
  '게임을 그만하려면 나가기를 눌러요.',
];

/** 첫 화면의 사용 방법 안내 창 */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" data-testid="help-backdrop" onClick={onClose}>
      <div className="dialog help" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()}>
        <h2 id="help-title">사용 방법</h2>
        <div className="help__body">
          <section className="help__how">
            <h3>이렇게 놀아요</h3>
            <ol>{STEPS.map(s => <li key={s}>{s}</li>)}</ol>
          </section>
          <div className="help__modes">
            {MODES.map(m => (
              <section key={m.title}>
                <h3>{m.title}</h3>
                <ul>{m.lines.map(l => <li key={l}>{l}</li>)}</ul>
              </section>
            ))}
          </div>
          <section>
            <h3>알아 두면 좋아요</h3>
            <ul>{TIPS.map(t => <li key={t}>{t}</li>)}</ul>
          </section>
        </div>
        <div className="actions">
          <button className="btn btn--primary" onClick={onClose} autoFocus>닫기</button>
        </div>
      </div>
    </div>
  );
}
