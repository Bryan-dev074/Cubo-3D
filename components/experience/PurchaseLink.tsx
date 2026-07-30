import type { ReactNode } from "react";

interface PurchaseLinkProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly href: string;
}

export function PurchaseLink({
  children,
  className,
  href,
}: PurchaseLinkProps) {
  return (
    <a
      className={className}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
