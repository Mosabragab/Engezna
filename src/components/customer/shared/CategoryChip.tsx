'use client';

import { ReactNode } from 'react';

interface CategoryChipProps {
  icon?: ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CategoryChip({
  icon,
  label,
  isActive = false,
  onClick,
  className = '',
}: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
        isActive
          ? 'bg-primary text-white shadow-md'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
      } ${className}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
