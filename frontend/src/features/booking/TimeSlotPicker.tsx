import React from 'react';

export interface Slot {
  start_time: string;
  end_time: string;
  display_time: string;
  display_date: string;
}

interface TimeSlotPickerProps {
  slots: Slot[];
  onSelect: (slot: Slot) => void;
  title?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ slots, onSelect, title = 'Available Slots' }) => {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center font-body text-xs text-slate-500">
        No slots available. Try selecting a different duration or date range.
      </div>
    );
  }

  const getMentorAvatar = (idx: number) => {
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
    ];
    return avatars[idx % avatars.length];
  };

  return (
    <div className="space-y-3 font-sans">
      <label className="block font-body text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </label>
      <div className="space-y-2 max-w-xl">
        {slots.map((slot, idx) => {
          const displayTimeStr = slot.display_time.split(' IST')[0];
          // We can split time to show start -> end or similar
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(slot)}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/50 p-4 transition-all hover:border-indigo-600 active:scale-[0.99] group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-indigo-600 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-indigo-600 transition-colors" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-slate-800">
                    {displayTimeStr}
                  </p>
                  <p className="font-body text-[10px] text-slate-500 mt-0.5">
                    {slot.display_date}
                  </p>
                </div>
              </div>

              {/* Host Avatars */}
              <div className="flex -space-x-2">
                <img 
                  src={getMentorAvatar(idx)} 
                  alt="mentor avatar" 
                  className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm"
                />
                <img 
                  src={getMentorAvatar(idx + 1)} 
                  alt="mentor avatar" 
                  className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default TimeSlotPicker;
