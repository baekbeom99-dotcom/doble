import { BADGES } from '../../content/badges';
import { createSymbolSet } from '../../content/registry';
import type { SetConfig } from '../../content/types';
import type { Records } from '../../services/records';

const MODE_NAMES: Record<string, { name: string; unit: (n: number) => string }> = {
  soloSurvival: { name: '서바이벌', unit: n => `${n}점` },
  coop: { name: '몬스터 사냥', unit: n => `${n}단계` },
};

/** 저장된 세트 id(JSON)로 세트 이름을 만든다. 알 수 없으면 '알 수 없는 세트' */
function setName(setId: string): string {
  try {
    return createSymbolSet(JSON.parse(setId) as SetConfig).name;
  } catch {
    return '알 수 없는 세트';
  }
}

interface Props { records: Records; onBack: () => void }

export function Collection({ records, onBack }: Props) {
  const masters = records.badges.filter(id => id.startsWith('master:'));
  const bests = Object.entries(records.best);
  const stageSets = Object.keys(records.unlocked);
  const empty = records.badges.length === 0 && bests.length === 0 && stageSets.length === 0;

  return (
    <main className="screen">
      <h1 className="title">수집함</h1>
      {empty && <p className="note">아직 기록이 없어요. 혼자 하기로 시작해 보세요</p>}

      <section className="field collection__badges" aria-label="배지">
        {BADGES.map(b => (
          <div key={b.id} className={records.badges.includes(b.id) ? 'badge-card' : 'badge-card is-locked'} title={b.description}>
            <b>{b.name}</b>
            <small>{b.description}</small>
          </div>
        ))}
        {masters.map(id => (
          <div key={id} className="badge-card badge-card--master">
            <b>{`${setName(id.slice('master:'.length))} 마스터`}</b>
          </div>
        ))}
      </section>

      {bests.length > 0 && (
        <section className="field collection__list" aria-label="최고 기록">
          {bests.map(([key, value]) => {
            const [mode, ...rest] = key.split('|');
            const info = MODE_NAMES[mode];
            if (!info) return null;
            return <p key={key}>{`${info.name} · ${setName(rest.join('|'))}: ${info.unit(value)}`}</p>;
          })}
        </section>
      )}

      {stageSets.length > 0 && (
        <section className="field collection__list" aria-label="스테이지 별">
          {stageSets.map(id => {
            const total = (records.stars[id] ?? []).reduce((a, b) => a + b, 0);
            return <p key={id}>{`${setName(id)}: ★ ${total}개 · ${records.unlocked[id]}단계까지`}</p>;
          })}
        </section>
      )}

      <div className="actions">
        <button className="btn" onClick={onBack}>처음으로</button>
      </div>
    </main>
  );
}
