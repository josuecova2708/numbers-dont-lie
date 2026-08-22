import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#8B8FA3' }}>
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all
          placeholder:text-gray-600 focus:ring-2 focus:ring-green-400/50
          ${className}
        `}
        style={{
          backgroundColor: '#22252F',
          border: `1px solid ${error ? '#F87171' : '#2A2D37'}`,
        }}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
