import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner" role="status" aria-label={message}>
      <div className="loading-spinner__dots">
        <span className="loading-spinner__dot" />
        <span className="loading-spinner__dot" />
        <span className="loading-spinner__dot" />
      </div>
      <span className="loading-spinner__message">{message}</span>
    </div>
  );
}
