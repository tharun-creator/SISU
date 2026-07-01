import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || React.useId();
  
  return (
    <div className="w-full mb-4">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-200 transition-all ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
};
export default Select;
