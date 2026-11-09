import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('홈 화면 제목을 보여준다', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '도블 놀이' })).toBeInTheDocument();
});
test('같이 하기 → 설정 화면 → 처음으로 → 홈', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '같이 하기' }));
  expect(screen.getByRole('heading', { name: '같이 하기' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
  expect(screen.getByRole('heading', { name: '도블 놀이' })).toBeInTheDocument();
});
test('팀 대결 → 팀 대결 설정 화면', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '팀 대결' }));
  expect(screen.getByRole('heading', { name: '팀 대결' })).toBeInTheDocument();
});
