/** 크림색 바탕에 음각으로 새긴 무늬 4종. 정답마다 다음 무늬로 바뀌고, 무늬는 천천히 흐른다 */
export const PATTERNS = ['wave', 'dot', 'zigzag', 'grid'] as const;

export function PatternBackdrop({ index }: { index: number }) {
  const active = ((index % PATTERNS.length) + PATTERNS.length) % PATTERNS.length;
  return (
    <div className="patterns" data-testid="patterns" aria-hidden="true">
      {PATTERNS.map((p, i) => (
        <div key={p} data-testid={`pattern-${p}`} className={i === active ? `pattern pattern--${p} is-on` : `pattern pattern--${p}`} />
      ))}
    </div>
  );
}
