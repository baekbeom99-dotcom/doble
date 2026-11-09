import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never { throw new Error('boom'); }

test('자식이 오류를 던지면 안내와 처음으로 버튼을 보여준다', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const onReset = vi.fn();
  render(<ErrorBoundary onReset={onReset}><Boom /></ErrorBoundary>);
  expect(screen.getByText('문제가 생겼어요')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
  expect(onReset).toHaveBeenCalled();
});
