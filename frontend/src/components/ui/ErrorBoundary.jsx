import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-paper dark:text-obsidian">Something went wrong</h2>
          <p className="text-sm text-slate max-w-md text-center">
            {this.state.error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); }}
            className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
