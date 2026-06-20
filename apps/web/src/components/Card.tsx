import type { HTMLAttributes, PropsWithChildren } from "react";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-white p-0 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`border-b border-border px-4 py-3 ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ className = "", ...props }: CardProps) {
  return <h2 className={`text-sm font-semibold ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: CardProps) {
  return (
    <div className={`px-4 py-4 text-sm text-muted ${className}`} {...props} />
  );
}
