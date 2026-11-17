import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-rose-50 text-rose-700 border-rose-200',
    upcoming: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-brand-50 text-brand-700 border-brand-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const selectedStyle = styles[variant] || styles.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedStyle} ${className}`}
    >
      {children}
    </span>
  );
};
