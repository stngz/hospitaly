import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary] Caught error in section "${this.props.sectionName || 'unknown'}":`,
      error,
      errorInfo
    );
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          data-testid={`error-boundary-${(this.props.sectionName || 'section').replace(/\s+/g, '-')}`}
          className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs text-center my-4 space-y-3"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">
              Something went wrong loading this section &mdash; Retry
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {this.props.sectionName
                ? `The ${this.props.sectionName} section encountered an unexpected error. Other sections remain fully operational.`
                : 'An unexpected error occurred while loading this section.'}
            </p>
          </div>
          <button
            type="button"
            data-testid="error-boundary-retry-btn"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C3A31] text-[#E0B973] rounded-xl text-xs font-semibold hover:bg-[#142923] active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
