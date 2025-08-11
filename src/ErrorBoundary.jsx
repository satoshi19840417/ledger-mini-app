import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const message = `${this.state.error?.message ?? ''}\n${this.state.error?.stack ?? ''}`;
      const copy = () => navigator.clipboard.writeText(message);
      return (
        <div className='error-boundary'>
          <p>予期せぬエラーが発生しました。</p>
          <pre>{message}</pre>
          <button onClick={copy}>内容コピー</button>
        </div>
      );
    }
    return this.props.children;
  }
}

