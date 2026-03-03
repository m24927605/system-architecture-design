import { ReactNode } from "react";

export default function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-accent-start to-accent-end bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}
