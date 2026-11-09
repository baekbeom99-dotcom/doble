import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; onReset: () => void }

/** 화면 그리기 중 오류가 나도 흰 화면에 멈추지 않고 처음으로 돌아갈 수 있게 한다 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen screen--center">
        <h1 className="title">문제가 생겼어요</h1>
        <button
          className="btn btn--primary"
          onClick={() => { this.setState({ failed: false }); this.props.onReset(); }}
        >
          처음으로
        </button>
      </main>
    );
  }
}
