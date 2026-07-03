import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';
import { Meeting } from '../features/booking/BookingModal';

const STATUS_ACCENT: Record<string, string> = {
  approved: '#84CC16',
  rescheduled: '#FF7A00',
  completed: '#3b82f6',
};

function formatTime12(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function getDateKey(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCommIcon(comm?: string) {
  if (comm === 'video') return 'videocam';
  if (comm === 'in_person') return 'home_pin';
  return 'location_on';
}

function getCommLabel(comm?: string) {
  if (comm === 'video') return 'Google Meet (Online Video)';
  if (comm === 'in_person') return 'Spi Edge (In-Office Meet)';
  if (comm?.startsWith('custom_location:')) return comm.replace('custom_location:', '').trim();
  return 'In-Person';
}

export default function AdminSlotsBookedPage() {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fetchMeetings = useCallback(async () => {
    try {
      const all = await api.adminGetMeetings();
      setMeetings(all || []);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 30000);
    return () => clearInterval(interval);
  }, [fetchMeetings]);

  // Only approved / rescheduled / completed
  const bookedMeetings = useMemo(() => {
    return meetings.filter(
      m => m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed'
    );
  }, [meetings]);

  // Group by date key
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    bookedMeetings.forEach(m => {
      if (!m.start_time) return;
      const key = getDateKey(m.start_time);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    // Sort each day's meetings by start_time
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return timeA - timeB;
      });
    });
    return map;
  }, [bookedMeetings]);

  const getDateStr = (day: number) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const selectedMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : [];

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDateLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  return (
    <AppLayout title="Slots Booked">
      <div className="relative space-y-6">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_65%)] rounded-full filter blur-[80px] pointer-events-none z-0" />

        {/* Page Header */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">Slots Booked</h1>
            <p className="text-slate-500 text-xs mt-1">View all approved and confirmed meeting slots on the calendar.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-full text-xs font-bold text-lime-600 font-mono">
              {bookedMeetings.length} BOOKED
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 relative z-10">
          {/* Left Side: Calendar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-800 font-heading">
                {monthName}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  onClick={handleNext}
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

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = getDateStr(day);
                const dayMeetings = meetingsByDate[dateStr] || [];
                const count = dayMeetings.length;
                const isSelected = selectedDate === dateStr;
                const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
                const isPast = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth()) || (viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-[1.1] border rounded-xl cursor-pointer flex flex-col items-center justify-center relative gap-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : count > 0
                          ? 'border-lime-300 bg-lime-500/[0.03] text-slate-800 hover:border-lime-500'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                    }`}
                    style={{ borderColor: isSelected ? '#4F46E5' : undefined }}
                  >
                    <span className={`text-xs ${isSelected || isToday ? 'font-bold' : 'font-medium'}`}>
                      {day}
                    </span>

                    {/* Slot count indicator */}
                    {count > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono leading-none ${
                        isSelected 
                          ? 'bg-white text-indigo-600' 
                          : 'bg-lime-500/12 text-lime-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-6 p-3.5 border border-slate-200 rounded-xl flex-wrap bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                <span className="text-slate-500 font-semibold">Approved</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                <span className="text-slate-500 font-semibold">Rescheduled</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span className="text-slate-500 font-semibold">Completed</span>
              </div>
            </div>
          </div>

          {/* Right Side: Day Detail Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
            {loading ? (
              /* Skeleton loader */
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-5 w-[60%] bg-slate-200 rounded" />
                <div className="h-4 w-[40%] bg-slate-200 rounded" />
                <div className="mt-4 flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-200 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : !selectedDate ? (
              /* No date selected */
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-10 border border-dashed border-slate-200 rounded-xl">
                <span className="material-symbols-outlined text-3xl mb-3 text-slate-300">calendar_month</span>
                <p className="text-sm font-bold text-slate-800 mb-1">Select a Date</p>
                <p className="text-xs max-w-[200px] leading-relaxed">Click any date on the calendar to view booked meeting slots for that day.</p>
              </div>
            ) : (
              /* Date selected — show meetings */
              <>
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-slate-800 font-heading">
                    {selectedDateLabel}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {selectedMeetings.length === 0
                      ? 'No booked slots for this date.'
                      : `${selectedMeetings.length} meeting${selectedMeetings.length > 1 ? 's' : ''} scheduled`}
                  </p>
                </div>

                {selectedMeetings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">
                    <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">event_busy</span>
                    <p className="text-xs font-bold text-slate-500">No meetings booked</p>
                    <p className="text-[11px] text-slate-400 max-w-[180px] leading-relaxed mt-1">This day has no approved, rescheduled, or completed meetings.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
                    <AnimatePresence mode="popLayout">
                      {selectedMeetings.map((m, idx) => {
                        const accent = STATUS_ACCENT[m.status] || '#3b82f6';
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: idx * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="p-4 bg-white border border-slate-200 rounded-xl relative hover:border-slate-300 transition-colors shadow-sm"
                            style={{
                              borderLeft: m.client_is_priority ? '4px solid #eab308' : `4px solid ${accent}`,
                            }}
                          >
                            {/* Time Header */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <span className="material-symbols-outlined text-base" style={{ color: accent }}>schedule</span>
                                <span className="text-xs font-extrabold font-mono tracking-tight">
                                  {formatTime12(m.start_time)} – {formatTime12(m.end_time)}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono whitespace-nowrap" style={{
                                backgroundColor: `${accent}15`,
                                borderColor: `${accent}30`,
                                color: accent
                              }}>
                                {m.status}
                              </span>
                            </div>

                            {/* Title */}
                            <p className="text-xs font-bold text-slate-800 mb-2">
                              {m.title}
                            </p>

                            {/* Details Grid */}
                            <div className="flex flex-col gap-2.5 text-xs text-slate-500">
                              {/* Client */}
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-slate-400">person</span>
                                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                  {m.client_name}
                                  {m.client_is_priority && (
                                    <span className="text-[8px] px-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-bold font-mono">⭐ PRIORITY</span>
                                  )}
                                </span>
                                {m.client_email && (
                                  <span className="text-[10px] text-slate-400">({m.client_email})</span>
                                )}
                              </div>

                              {/* Meeting Type & Duration */}
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-slate-400">assignment</span>
                                <span>{m.meeting_type}</span>
                                <span className="text-slate-300">·</span>
                                <span>{m.duration_minutes} mins</span>
                              </div>

                              {/* Communication */}
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-slate-400">
                                  {getCommIcon(m.preferred_communication)}
                                </span>
                                <span>
                                  {getCommLabel(m.preferred_communication)}
                                </span>
                              </div>

                              {/* Meet Link */}
                              {m.meet_link && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-base text-[#4F46E5]">link</span>
                                  <a
                                    href={m.meet_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#4F46E5] font-bold hover:underline truncate max-w-[200px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {m.meet_link}
                                  </a>
                                </div>
                              )}

                              {/* Description */}
                              <div className="mt-1 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[10.5px] text-slate-400 italic leading-normal">
                                "{m.description && m.description.trim() !== '' && m.description !== 'Booked via Executive Mentorship Workspace' ? m.description : 'no description'}"
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
