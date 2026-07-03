import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';

const TIME_SLOTS = [
  { value: "11:00-12:00", label: "11:00 AM - 12:00 PM" },
  { value: "12:00-13:00", label: "12:00 PM - 01:00 PM" },
  { value: "13:00-14:00", label: "01:00 PM - 02:00 PM" },
  { value: "14:00-15:00", label: "02:00 PM - 03:00 PM" },
  { value: "15:00-16:00", label: "03:00 PM - 04:00 PM" },
  { value: "16:00-17:00", label: "04:00 PM - 05:00 PM" },
  { value: "17:00-18:00", label: "05:00 PM - 06:00 PM" },
  { value: "18:00-19:00", label: "06:00 PM - 07:00 PM" },
];

interface DateSignal {
  signal: string;
  custom_slots?: string[];
}

export default function AdminCalendarSlotsPage() {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [signals, setSignals] = useState<Record<string, DateSignal>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editing state for selected date
  const [signalType, setSignalType] = useState<string>('green'); // 'green' | 'yellow' | 'red'
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fetchSignals = async () => {
    try {
      const data = await api.getCalendarSignals(viewMonth, viewYear);
      setSignals(data || {});
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to fetch calendar settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [viewMonth, viewYear]);

  const handleDateClick = (day: number) => {
    const clickedDate = { year: viewYear, month: viewMonth, day };
    setSelectedDate(clickedDate);
    
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const sig = signals[dateStr];
    
    if (sig) {
      setSignalType(sig.signal || 'green');
      setSelectedSlots(sig.custom_slots || []);
    } else {
      setSignalType('green');
      setSelectedSlots([]);
    }
    setMessage(null);
  };

  const handleSlotToggle = (slotValue: string) => {
    setSelectedSlots(prev => 
      prev.includes(slotValue) 
        ? prev.filter(v => v !== slotValue) 
        : [...prev, slotValue]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setSaving(true);
    setMessage(null);
    
    const dateStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
    
    try {
      await api.adminSetDateSignal({
        date: dateStr,
        signal: signalType,
        custom_slots: signalType === 'yellow' ? selectedSlots.join(',') : null
      });
      setMessage({ text: 'Availability settings successfully updated!', type: 'success' });
      await fetchSignals();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getDateStr = (day: number) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <AppLayout title="Calendar Slots">
      <div className="relative space-y-6">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_65%)] rounded-full filter blur-[80px] pointer-events-none z-0" />

        {/* Page Header */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">Coaching Calendar Dashboard</h1>
            <p className="text-slate-500 text-xs mt-1">Configure daily availability signals. Define custom slots for clients or block dates completely.</p>
          </div>
        </div>

        {/* Status messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl text-sm flex items-center gap-2 border relative z-10 ${
                message.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 relative z-10">
          {/* Left Side: Big Calendar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-800 font-heading">
                {monthName}
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear(y => y - 1);
                    } else setViewMonth(m => m - 1);
                    setSelectedDate(null);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear(y => y + 1);
                    } else setViewMonth(m => m + 1);
                    setSelectedDate(null);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-[10px] font-bold text-slate-400 uppercase text-center pb-2.5 font-mono">
                  {d}
                </div>
              ))}
              
              {/* Empty padding blocks */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isPast = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today;
                const isCurrentToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
                const isSelected = selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day;
                
                const dateStr = getDateStr(day);
                const sigData = signals[dateStr];
                const sig = sigData ? sigData.signal : 'green';

                let bgGlow = 'transparent';
                let borderColor = '#E2E8F0';
                let dotColor = '#22C55E'; // Green dot

                if (sig === 'red') {
                  bgGlow = 'bg-red-500/[0.03]';
                  borderColor = '#FCA5A5';
                  dotColor = '#EF4444';
                } else if (sig === 'yellow') {
                  bgGlow = 'bg-amber-500/[0.03]';
                  borderColor = '#FCD34D';
                  dotColor = '#F59E0B';
                } else {
                  bgGlow = 'bg-green-500/[0.01]';
                  borderColor = '#E2E8F0';
                  dotColor = '#22C55E';
                }

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-[1.1] border rounded-xl cursor-pointer flex flex-col items-center justify-center relative gap-1 transition-all ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : `${bgGlow} hover:border-slate-400 text-slate-800`
                    }`}
                    style={{ borderColor: isSelected ? '#0F172A' : undefined }}
                  >
                    <span className={`text-xs ${isSelected || isCurrentToday ? 'font-bold' : 'font-medium'}`}>
                      {day}
                    </span>
                    
                    {/* Signal status dot */}
                    {!isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-6 p-3.5 border border-slate-200 rounded-xl flex-wrap bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-slate-500 font-semibold">Green (Available)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-slate-500 font-semibold">Yellow (Custom / Limited)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-slate-500 font-semibold">Red (Blocked / Closed)</span>
              </div>
            </div>
          </div>

          {/* Right Side: Config Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            {!selectedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-10 border border-dashed border-slate-200 rounded-xl">
                <span className="material-symbols-outlined text-3xl mb-3 text-slate-300">touch_app</span>
                <p className="text-sm font-bold text-slate-800 mb-1">Select a Date</p>
                <p className="text-xs max-w-[200px] leading-relaxed">Click any date on the calendar to change its availability state.</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex flex-col h-full space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">
                    Configure Date Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Selected: <strong>{new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </p>
                </div>

                {/* State selector pills */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
                    Choose Signal State
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'green', label: 'Green', color: '#22C55E', icon: 'check_circle' },
                      { type: 'yellow', label: 'Yellow', color: '#F59E0B', icon: 'pending' },
                      { type: 'red', label: 'Red', color: '#EF4444', icon: 'block' }
                    ].map((s) => {
                      const isActive = signalType === s.type;
                      return (
                        <button
                          key={s.type}
                          type="button"
                          onClick={() => setSignalType(s.type)}
                          className="py-2.5 px-2 rounded-xl border cursor-pointer text-xs font-bold flex flex-col items-center gap-1 transition-all"
                          style={{
                            borderColor: isActive ? s.color : '#E2E8F0',
                            backgroundColor: isActive ? `${s.color}10` : 'transparent',
                            color: isActive ? s.color : '#64748B'
                          }}
                        >
                          <span className="material-symbols-outlined text-base">{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional yellow options (custom slots selection) */}
                {signalType === 'yellow' && (
                  <div className="flex-1 flex flex-col min-h-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
                      Checked time slots will be hidden
                    </label>
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
                      {TIME_SLOTS.map((slot) => {
                        const isChecked = selectedSlots.includes(slot.value);
                        return (
                          <div
                            key={slot.value}
                            onClick={() => handleSlotToggle(slot.value)}
                            className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-amber-500/[0.04] border-amber-500/30' 
                                : 'bg-transparent border-slate-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-[#F59E0B] border-[#F59E0B]' : 'border-slate-300'
                            }`}>
                              {isChecked && <span className="material-symbols-outlined text-[10px] text-white font-bold">done</span>}
                            </div>
                            <span className={`text-xs font-semibold ${isChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                              {slot.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Info Text */}
                <div className="p-3 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed bg-slate-50/50">
                  {signalType === 'green' && "🟢 Clients can book any standard time slot for this date."}
                  {signalType === 'yellow' && "🟡 Checked time slots will be hidden and blocked from the client booking view."}
                  {signalType === 'red' && "🔴 This date will be blocked and hidden from the client booking view."}
                </div>

                <div className="flex gap-3 pt-2 mt-auto">
                  <button 
                    type="button" 
                    onClick={() => setSelectedDate(null)} 
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Signal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
