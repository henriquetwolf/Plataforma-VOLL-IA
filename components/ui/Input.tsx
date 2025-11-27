import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="flex flex-col gap-1 mb-4">
      {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input
        className={`px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder:text-slate-400 ${className}`}
        {...props}
      />
    </div>
  );
};