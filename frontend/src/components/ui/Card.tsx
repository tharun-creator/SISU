import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'selected';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseStyle = 'bg-white border rounded-xl p-6 shadow-sm transition-all';
  
  const variants = {
    default: 'border-slate-200',
    interactive: 'border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer',
    selected: 'border-indigo-500 ring-2 ring-indigo-200',
  };

  return (
    <div className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
export default Card;
