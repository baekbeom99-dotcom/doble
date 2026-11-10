import { render, screen } from '@testing-library/react';
import { createSymbolSet } from '../../content/registry';
import { EMPTY_RECORDS } from '../../services/records';
import { Collection } from './Collection';

const SET = createSymbolSet({ kind: 'syllable', initial: 'ㄱ', batchim: false }).id;

test('배지는 받은 것과 못 받은 것을 구분한다', () => {
  render(<Collection records={{ ...EMPTY_RECORDS, badges: ['first', `master:${SET}`] }} onBack={() => {}} />);
  expect(screen.getByText('첫 게임').closest('.badge-card')).not.toHaveClass('is-locked');
  expect(screen.getByText('피버 타임').closest('.badge-card')).toHaveClass('is-locked');
  expect(screen.getByText('ㄱ 글자 마스터')).toBeInTheDocument();
});
test('최고 기록과 스테이지 별을 보여준다', () => {
  render(<Collection records={{ ...EMPTY_RECORDS, best: { [`soloSurvival|${SET}`]: 42, [`coop|${SET}`]: 3 }, stars: { [SET]: [3, 2] }, unlocked: { [SET]: 3 } }} onBack={() => {}} />);
  expect(screen.getByText('서바이벌 · ㄱ 글자: 42점')).toBeInTheDocument();
  expect(screen.getByText('몬스터 사냥 · ㄱ 글자: 3단계')).toBeInTheDocument();
  expect(screen.getByText('ㄱ 글자: ★ 5개 · 3단계까지')).toBeInTheDocument();
});
test('기록이 없으면 안내 문구', () => {
  render(<Collection records={EMPTY_RECORDS} onBack={() => {}} />);
  expect(screen.getByText('아직 기록이 없어요. 혼자 하기로 시작해 보세요')).toBeInTheDocument();
});
test('알 수 없는 세트 id도 화면을 깨뜨리지 않는다', () => {
  render(<Collection records={{ ...EMPTY_RECORDS, best: { 'soloSurvival|not-json': 5 } }} onBack={() => {}} />);
  expect(screen.getByText('서바이벌 · 알 수 없는 세트: 5점')).toBeInTheDocument();
});
