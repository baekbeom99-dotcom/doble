import { render, screen } from '@testing-library/react';
import { SoloHud } from './SoloHud';

const m = { timeLeft: 12400, score: 37, correct: 9, streak: 0, roundAt: 0, feverUntil: 5000, doubleUntil: 0, timeStopUntil: 0, perfect: 0, great: 0, good: 0, fevers: 1, target: 16 };

test('서바이벌: 남은 초, 점수, 고스트, 피버, 판정', () => {
  render(<SoloHud mode={m} kind="soloSurvival" now={1000} best={50} lastGrade="perfect" />);
  expect(screen.getByText('13초')).toBeInTheDocument();
  expect(screen.getByText('37점')).toBeInTheDocument();
  expect(screen.getByText('최고 50점')).toBeInTheDocument();
  expect(screen.getByLabelText('최고 기록 대비 74%')).toBeInTheDocument();
  expect(screen.getByText('피버!')).toBeInTheDocument();
  expect(screen.getByText('Perfect')).toBeInTheDocument();
});
test('최고 기록이 없으면 고스트를 숨기고, 피버가 끝나면 표시하지 않는다', () => {
  render(<SoloHud mode={m} kind="soloSurvival" now={9000} best={null} lastGrade={null} />);
  expect(screen.queryByText(/최고/)).not.toBeInTheDocument();
  expect(screen.queryByText('피버!')).not.toBeInTheDocument();
});
test('고스트 막대는 100%를 넘지 않는다', () => {
  render(<SoloHud mode={{ ...m, score: 80 }} kind="soloSurvival" now={9000} best={50} lastGrade={null} />);
  expect(screen.getByLabelText('최고 기록 대비 100%')).toBeInTheDocument();
});
test('스테이지: 진행 수, 2배와 시간 정지 표시', () => {
  render(<SoloHud mode={{ ...m, doubleUntil: 20000, timeStopUntil: 20000 }} kind="soloStage" now={9000} best={null} lastGrade="good" />);
  expect(screen.getByText('9/16')).toBeInTheDocument();
  expect(screen.getByText('×2')).toBeInTheDocument();
  expect(screen.getByText('⏸️')).toBeInTheDocument();
  expect(screen.getByText('Good')).toBeInTheDocument();
});
