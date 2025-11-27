import React from 'react';
import { Input } from '../ui/Input';
import { Info } from 'lucide-react';

interface CardProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, tooltip, children }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
      {tooltip && (
        <div className="group relative">
          <Info className="w-4 h-4 text-slate-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-lg">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tooltip?: string;
  isCurrency?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({ label, tooltip, isCurrency, className, ...props }) => (
  <div className="mb-4">
    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}
      {tooltip && (
        <span className="ml-2 group relative">
          <Info className="w-3 h-3 text-slate-400 cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
            {tooltip}
          </span>
        </span>
      )}
    </label>
    <div className="relative">
      {isCurrency && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">R$</span>
      )}
      <input
        type="number"
        className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${isCurrency ? 'pl-9' : ''} ${className}`}
        {...props}
      />
    </div>
  </div>
);

interface TextInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tooltip?: string;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({ label, tooltip, ...props }) => (
  <div className="mb-4">
    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}
      {tooltip && (
        <span className="ml-2 group relative">
          <Info className="w-3 h-3 text-slate-400 cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
            {tooltip}
          </span>
        </span>
      )}
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
      {...props}
    />
  </div>
);

interface SliderFieldProps {
  label: string;
  id: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({ label, id, value, onChange, min = 0, max = 100, step = 1, tooltip }) => (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-2">
      <label htmlFor={id} className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {tooltip && (
          <span className="ml-2 group relative">
            <Info className="w-3 h-3 text-slate-400 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
              {tooltip}
            </span>
          </span>
        )}
      </label>
      <span className="text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded">
        {value}%
      </span>
    </div>
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
    />
  </div>
);

interface DaySelectorProps {
  workingDays: { [key: string]: boolean };
  onDayToggle: (day: any) => void;
  tooltip?: string;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ workingDays, onDayToggle, tooltip }) => {
  const days = [
    { key: 'mon', label: 'Seg' },
    { key: 'tue', label: 'Ter' },
    { key: 'wed', label: 'Qua' },
    { key: 'thu', label: 'Qui' },
    { key: 'fri', label: 'Sex' },
    { key: 'sat', label: 'Sáb' },
  ];

  return (
    <div className="mb-6">
      <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Dias de Funcionamento
        {tooltip && (
          <span className="ml-2 group relative">
            <Info className="w-3 h-3 text-slate-400 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
              {tooltip}
            </span>
          </span>
        )}
      </label>
      <div className="flex gap-2 flex-wrap">
        {days.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onDayToggle(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              workingDays[key]
                ? 'bg-brand-500 text-white shadow-md shadow-brand-200 dark:shadow-none'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};