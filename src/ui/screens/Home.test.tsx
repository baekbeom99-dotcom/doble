import { fireEvent, render, screen } from '@testing-library/react';
import { Home } from './Home';

test('사용 방법 버튼을 누르면 안내 창이 열리고, 닫기를 누르면 닫힌다', () => {
  render(<Home onPick={() => {}} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '사용 방법' }));
  const dialog = screen.getByRole('dialog', { name: '사용 방법' });
  expect(dialog).toHaveTextContent('내 카드와 가운데 카드에 똑같은 글자가 딱 하나 있어요');
  for (const mode of ['혼자 하기', '대결하기', '팀 대결', '같이 하기']) {
    expect(screen.getByRole('heading', { name: mode })).toBeInTheDocument();
  }

  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('안내 창 바깥을 누르거나 Esc를 눌러도 닫힌다', () => {
  render(<Home onPick={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '사용 방법' }));
  fireEvent.click(screen.getByTestId('help-backdrop'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '사용 방법' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
