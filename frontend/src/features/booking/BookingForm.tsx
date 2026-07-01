import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import meetingsApi from '../../api/meetings';
import authApi from '../../api/auth';

interface Slot {
  start: string;
  end: string;
  label: string;
}

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const label = `${h12}:${mm} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
};

export const BookingForm: React.FC = () => {
  const navigate = useNavigate();

  // Form fields state
  const [agenda, setAgenda] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [duration, setDuration] = useState<number | 'custom'>(60);
  const [channel, setChannel] = useState('Google Meet');
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // Fetch logged in user company/role details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await authApi.getMe();
        if (user) {
          if (user.company) setCompany(user.company);
          if (user.job_title) setJobTitle(user.job_title);
          if (user.phone) setPhone(user.phone);
        }
      } catch (err) {
        console.error('Failed to fetch user data for booking:', err);
      }
    };
    fetchUserData();
  }, []);

  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  const calculateCustomDurationMinutes = () => {
    if (!customStartTime || !customEndTime) return 0;
    const [startH, startM] = customStartTime.split(':').map(Number);
    const [endH, endM] = customEndTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    return endMins - startMins;
  };

  // Calendar state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Available slots & signals
  const [signals, setSignals] = useState<Record<string, { signal: string; custom_slots: string[] }>>({});
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleWordLimitChange = (text: string, setter: (val: string) => void) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > 50) {
      setter(text.split(/\s+/).slice(0, 50).join(' '));
    } else {
      setter(text);
    }
  };

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Fetch calendar signals for dots
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await meetingsApi.getCalendarSignals(viewMonth, viewYear);
        setSignals(res || {});
      } catch (err) {
        console.error('Failed to fetch calendar signals:', err);
      }
    };
    fetchSignals();
  }, [viewMonth, viewYear]);

  // Fetch free slots when date or duration changes
  useEffect(() => {
    if (selectedDay !== null && duration !== 'custom') {
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setSelectedSlot(null);
        try {
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
          const res = await meetingsApi.getFreeSlots(dateStr, duration);
          setSlots(res || []);
        } catch (err) {
          console.error('Failed to fetch free slots:', err);
          setSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    } else {
      setSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDay, viewMonth, viewYear, duration]);

  const isPrevMonthDisabled = () => {
    const todayDate = new Date();
    return viewYear < todayDate.getFullYear() || (viewYear === todayDate.getFullYear() && viewMonth <= todayDate.getMonth());
  };

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled()) return;
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedAgenda = agenda.trim();
    if (!trimmedAgenda) {
      setError('Please fill in the meeting agenda');
      return;
    }
    if (trimmedAgenda.length > 150) {
      setError('Meeting title/agenda cannot exceed 150 characters');
      return;
    }
    const wordCount = trimmedAgenda.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) {
      setError(`Meeting title/agenda cannot exceed 30 words (currently ${wordCount} words)`);
      return;
    }

    if (duration !== 'custom' && (!selectedDay || !selectedSlot)) {
      setError('Please select a date and time slot');
      return;
    }

    if (duration === 'custom') {
      if (!selectedDay) {
        setError('Please select a date');
        return;
      }
      if (!customStartTime || !customEndTime) {
        setError('Please select start and end times');
        return;
      }
      const customDuration = calculateCustomDurationMinutes();
      if (customDuration <= 0) {
        setError('End time must be after start time');
        return;
      }
    }

    if (selectedDay) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const selectedDate = new Date(viewYear, viewMonth, selectedDay);
      if (selectedDate < todayDate) {
        setError('Cannot book a slot in the past');
        return;
      }
    }

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    try {
      // Save/update company and job title in user profile
      try {
        await authApi.updateProfile({
          company: company.trim(),
          job_title: jobTitle.trim(),
          phone: phone.trim()
        });
      } catch (profileErr) {
        console.error('Failed to update profile during booking:', profileErr);
      }

      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      const startIso = duration === 'custom'
        ? new Date(`${dateStr}T${customStartTime}:00`).toISOString()
        : new Date(`${dateStr}T${selectedSlot!.start}:00`).toISOString();
      const endIso = duration === 'custom'
        ? new Date(`${dateStr}T${customEndTime}:00`).toISOString()
        : new Date(`${dateStr}T${selectedSlot!.end}:00`).toISOString();
      const finalDuration = duration === 'custom' ? calculateCustomDurationMinutes() : duration;

      const finalComm = channel === 'custom_location' ? `custom_location: ${customLocation}` : channel;

      await meetingsApi.createMeeting({
        title: trimmedAgenda,
        description: description,
        reason: 'Client booking via scheduler',
        meeting_type: 'Mentorship Session',
        priority: 'medium',
        start_time: startIso,
        end_time: endIso,
        duration_minutes: finalDuration,
        preferred_communication: finalComm,
        phone_number: phone, // Pass custom phone if supported
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl text-emerald-600 animate-bounce">check</span>
        </div>
        <h1 className="text-2xl font-bold font-heading text-slate-800 mb-2">Request Submitted!</h1>
        <p className="font-body text-sm text-slate-500 leading-relaxed mb-8">
          Your meeting request has been sent. You will receive an email confirmation once the admin reviews your request.
        </p>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => navigate('/')} 
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-sm text-slate-600 transition-all"
          >
            Back to Dashboard
          </button>
          <button 
            type="button"
            onClick={() => {
              setSuccess(false);
              setAgenda('');
              setDescription('');
              setPhone('');
              setSelectedDay(null);
              setSelectedSlot(null);
            }} 
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 font-sans text-slate-800">
      {/* Left Column - Main Booking Steps (Colspan 2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Section 0: Company & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp..."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Role in Company
            </label>
            <input
              type="text"
              placeholder="e.g. Founder, Product Manager..."
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Section 1: Agenda */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              1. Agenda
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              {getWordCount(agenda)}/50 words
            </span>
          </div>
          <input
            type="text"
            placeholder="e.g. name, company name x meeting purpose"
            value={agenda}
            onChange={(e) => handleWordLimitChange(e.target.value, setAgenda)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Section 2 & 3: Duration & Channel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              2. Duration
            </label>
            <select
              value={duration}
              onChange={(e) => {
                const val = e.target.value;
                setDuration(val === 'custom' ? 'custom' : Number(val));
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value={30}>30 Min Mentorship (30 mins)</option>
              <option value={60}>60 Min Mentorship (60 mins)</option>
              <option value="custom">Custom Duration</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              3. Channel / Location
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="Google Meet">Google Meet</option>
              <option value="Spi edge office">Spi edge office</option>
              <option value="custom_location">Custom Location / In-Person</option>
            </select>
            {channel === 'custom_location' && (
              <input
                type="text"
                placeholder="Specify preferred location..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 mt-2 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
              />
            )}
          </div>
        </div>

        {/* Section 4: Coaching Date & Time Slot */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
            4. Select Coaching Date & Time Slot
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="border border-slate-100 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled()}
                  className={`p-2 rounded-xl transition-all ${
                    isPrevMonthDisabled() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-slate-700">{monthName}</span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const todayDate = new Date();
                  todayDate.setHours(0, 0, 0, 0);
                  const currentDate = new Date(viewYear, viewMonth, day);
                  const isPast = currentDate < todayDate;

                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const sigData = signals[dateStr];
                  const sig = sigData ? sigData.signal : 'green';
                  const isSelected = selectedDay === day;

                  let dotColor = 'bg-emerald-500';
                  if (sig === 'red') dotColor = 'bg-rose-500';
                  else if (sig === 'yellow') dotColor = 'bg-amber-500';

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={sig === 'red' || isPast}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold relative transition-all ${
                        isSelected 
                          ? 'border-2 border-sky-500 text-sky-600 font-extrabold bg-sky-50/20' 
                          : (sig === 'red' || isPast)
                            ? 'text-slate-300 cursor-not-allowed opacity-40'
                            : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{day}</span>
                      {!isSelected && sig !== 'red' && (
                        <span className={`w-1 h-1 rounded-full ${dotColor} absolute bottom-1.5`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-center">
              {selectedDay === null ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <span className="text-xs font-bold text-slate-500 tracking-wider">CHOOSE A DATE FIRST</span>
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400 text-xl">event</span>
                  </div>
                  <p className="text-xs leading-relaxed max-w-[200px]">
                    Pick a date on the calendar to unlock coaching slots.
                  </p>
                </div>
              ) : duration === 'custom' ? (
                <div className="space-y-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    CUSTOM TIME SLOT
                  </span>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
                      <select
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                      >
                        {generateTimeOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                      <select
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                      >
                        {generateTimeOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Loading slots...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-400">
                  No slots available for this date.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    AVAILABLE TIME SLOTS
                  </span>
                  {slots.map((slot, index) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left rounded-xl p-3 border text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'border-sky-500 bg-sky-50/40 text-sky-600' 
                            : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Right Column - Secondary Settings & Live Summary */}
      <div className="space-y-6">
        
        {/* Section 5: Description */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              5. Description
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              {getWordCount(description)}/50 words
            </span>
          </div>
          <textarea
            rows={4}
            placeholder="e.g. Discussing outbound roadmap & scaling SDR metrics..."
            value={description}
            onChange={(e) => handleWordLimitChange(e.target.value, setDescription)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all resize-none"
          />
        </div>

        {/* Section 6: Phone Number */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
            6. Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="e.g. +919876543210..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Mentorship Call Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Mentorship Call Summary
            </span>
          </div>

          <div className="p-6 space-y-4 flex-1 text-xs">
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Focus</span>
              <span className="text-slate-700 font-bold text-right truncate max-w-[160px]">
                {agenda.trim() ? agenda.trim() : 'Awaiting Agenda...'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Company</span>
              <span className="text-slate-700 font-bold text-right truncate max-w-[160px]">
                {company.trim() ? company.trim() : 'Not specified'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Role</span>
              <span className="text-slate-700 font-bold text-right truncate max-w-[160px]">
                {jobTitle.trim() ? jobTitle.trim() : 'Not specified'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Duration</span>
              <span className="text-slate-700 font-bold">
                {duration === 'custom' ? (
                  `${calculateCustomDurationMinutes()} Min Mentorship (Custom)`
                ) : (
                  `${duration} Min Mentorship`
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Slot</span>
              <span className="text-slate-700 font-bold text-right">
                {selectedDay ? (
                  duration === 'custom' ? (
                    `${monthName.split(' ')[0]} ${selectedDay} at ${formatTime12h(customStartTime)} - ${formatTime12h(customEndTime)}`
                  ) : selectedSlot ? (
                    `${monthName.split(' ')[0]} ${selectedDay} at ${selectedSlot.label.split(' IST')[0]}`
                  ) : (
                    'Awaiting slot selection...'
                  )
                ) : (
                  'Awaiting date selection...'
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Channel</span>
              <span className="text-slate-700 font-bold">
                {channel}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Phone</span>
              <span className="text-slate-700 font-bold">
                {phone.trim() ? phone.trim() : 'Not provided'}
              </span>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-50">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Description</span>
              <p className="text-slate-600 italic leading-relaxed line-clamp-3">
                {description.trim() ? description.trim() : 'No description provided'}
              </p>
            </div>
          </div>

          {error && (
            <div className="px-6 py-3 bg-rose-50 border-t border-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{error}</span>
            </div>
          )}

          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-sky-100"
            >
              <span>{loading ? 'Requesting...' : 'Request Mentorship Session'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>
    </form>
  );
};

export default BookingForm;
