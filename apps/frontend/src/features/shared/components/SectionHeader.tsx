import type { ReactNode } from 'react';

interface SectionHeaderProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function SectionHeader({ children, className, id }: SectionHeaderProps) {
  return (
    <h2 id={id} className={`section-header${className ? ` ${className}` : ''}`}>
      {children}
    </h2>
  );
}
