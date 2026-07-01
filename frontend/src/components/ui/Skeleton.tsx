import React from 'react';

interface SkeletonProps {
  variant?: 'circle' | 'text' | 'card' | 'list';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  className = '',
}) => {
  const base = 'animate-pulse bg-slate-200';
  
  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />;
  }

  if (variant === 'text') {
    return <div className={`${base} h-4 rounded w-3/4 ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-3 w-full ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`${base} w-10 h-10 rounded-full`} />
          <div className="flex-1 flex flex-col gap-2">
            <div className={`${base} h-4 rounded w-1/3`} />
            <div className={`${base} h-3 rounded w-1/4`} />
          </div>
        </div>
        <div className={`${base} h-12 rounded w-full mt-2`} />
      </div>
    );
  }

  // list variant
  return (
    <div className={`flex flex-col gap-3 w-full ${className}`}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white">
          <div className="flex items-center gap-3 flex-1">
            <div className={`${base} w-10 h-10 rounded-lg`} />
            <div className="flex-1 flex flex-col gap-2">
              <div className={`${base} h-4 rounded w-1/4`} />
              <div className={`${base} h-3 rounded w-1/3`} />
            </div>
          </div>
          <div className={`${base} h-8 rounded w-20`} />
        </div>
      ))}
    </div>
  );
};
export default Skeleton;
