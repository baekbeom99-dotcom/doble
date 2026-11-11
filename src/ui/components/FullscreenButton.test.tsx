import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FullscreenButton } from './FullscreenButton';

type Loose = { requestFullscreen?: unknown; exitFullscreen?: unknown; fullscreenElement?: unknown };
const root = document.documentElement as unknown as Loose;
const doc = document as unknown as Loose;

function setFullscreen(el: Element | null) {
  Object.defineProperty(doc, 'fullscreenElement', { configurable: true, value: el });
  act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
}

afterEach(() => {
  delete root.requestFullscreen;
  delete doc.exitFullscreen;
  delete doc.fullscreenElement;
});

test('전체 화면을 지원하지 않는 기기에서는 버튼을 보여주지 않는다', () => {
  render(<FullscreenButton />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('누르면 전체 화면으로 바꾸고, 전체 화면에서는 끝내기 버튼이 된다', () => {
  const request = vi.fn(() => Promise.resolve());
  const exit = vi.fn(() => Promise.resolve());
  root.requestFullscreen = request;
  doc.exitFullscreen = exit;
  render(<FullscreenButton />);

  fireEvent.click(screen.getByRole('button', { name: '전체 화면' }));
  expect(request).toHaveBeenCalledTimes(1);

  setFullscreen(document.documentElement);
  fireEvent.click(screen.getByRole('button', { name: '전체 화면 끝내기' }));
  expect(exit).toHaveBeenCalledTimes(1);

  setFullscreen(null);
  expect(screen.getByRole('button', { name: '전체 화면' })).toBeInTheDocument();
});
