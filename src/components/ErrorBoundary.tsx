import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Something went wrong loading this page.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="rounded-lg bg-muted p-4 text-xs text-muted-foreground overflow-auto max-h-40">
                {this.state.error?.message}
              </pre>
              <div className="flex gap-3">
                <Button onClick={() => location.reload()}>Retry</Button>
                <Button variant="outline" asChild>
                  <Link to="/deals">Back to deals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
