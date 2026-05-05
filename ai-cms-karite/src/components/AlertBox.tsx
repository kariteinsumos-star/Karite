import type * as React from 'react';
interface AlertBoxProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
}

export function AlertBox({ type = 'info', title, children }: AlertBoxProps) {
  return (
    <div className={`alert alert-${type}`}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
