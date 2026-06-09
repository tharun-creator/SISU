import React, { useState } from 'react';

export default function CalendarWidget({ onDateSelect }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const handleSelect = (day) => {
    setSelectedDay(day);
    if (onDateSelect) {
      onDateSelect(day);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-lg animate-fade-in my-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-headline-sm text-headline-sm font-bold">November 2024</h2>
        <div className="flex gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="font-label-sm text-label-sm text-on-surface-variant py-2">{day}</div>
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square flex items-center justify-center text-body-sm text-on-surface-variant opacity-20">{28 + i}</div>
        ))}
        {Array.from({ length: 17 }).map((_, i) => {
          const day = i + 1;
          const isSelected = selectedDay === day;
          return (
            <div 
              key={`day-${i}`} 
              onClick={() => handleSelect(day)}
              className={`aspect-square flex items-center justify-center text-body-sm rounded-full cursor-pointer transition-all ${isSelected ? 'bg-primary text-on-primary font-bold shadow-md scale-110' : 'hover:bg-surface-container-high'} relative`}
            >
              {day}
              {[3, 6, 12].includes(i) && !isSelected && <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></span>}
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-on-surface-variant text-center italic mt-2">Select a date to see available slots</p>
    </div>
  );
}
