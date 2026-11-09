import { render, screen } from '@testing-library/react';
import App from './App';

test('홈 화면 제목을 보여준다', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '도블 놀이' })).toBeInTheDocument();
});
