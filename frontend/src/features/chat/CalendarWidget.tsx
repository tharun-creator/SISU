import React, { useState } from 'react';

interface CalendarWidgetProps {
  onDateSelect: (year: number, month: number, day: number) => void;
  selectedDate: { year: number; month: number; day: number } | null;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ onDateSelect, selectedDate }) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isPrevMonthDisabled = () => {
    const todayDate = new Date();
    return viewYear < todayDate.getFullYear() || (viewYear === todayDate.getFullYear() && viewMonth <= todayDate.getMonth());
  };

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled()) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3 px-1">
        <button 
          onClick={handlePrevMonth}
          disabled={isPrevMonthDisabled()}
          className={`border w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isPrevMonthDisabled() 
              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' 
              : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        <p className="font-heading text-xs font-bold text-slate-800">{monthName}</p>
        <button 
          onClick={handleNextMonth}
          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-body">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-slate-400 uppercase pb-1.5">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const dateOfSlot = new Date(viewYear, viewMonth, day);
          const isPast = dateOfSlot < todayDate;
          const isCurrentToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
          const isSelected = selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day;

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => onDateSelect(viewYear, viewMonth, day)}
              className={`aspect-square text-[11px] font-semibold rounded-lg border transition-all flex items-center justify-center ${
                isPast 
                  ? 'text-slate-300 border-transparent bg-transparent opacity-40 cursor-default' 
                  : isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-100' 
                    : isCurrentToday 
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/20 text-slate-700 bg-white'
              }`}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default CalendarWidget;
