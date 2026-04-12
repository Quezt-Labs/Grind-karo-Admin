import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/Button";
import { Dumbbell, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-100 flex-col items-center justify-center p-8">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20">
              <Dumbbell className="h-10 w-10 text-primary-500" />
            </div>
            <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              !
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dropped the Weights!
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
            {this.state.error?.message ||
              "Something unexpected happened. Even the best lifters fail a rep sometimes."}
          </p>

          <Button
            variant="primary"
            className="mt-6"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RotateCcw className="h-4 w-4" />
            Try Another Rep
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
