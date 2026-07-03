import React, { useState, useEffect } from 'react';
import { useMeetings } from '../../hooks/useMeetings';
import AppLayout from '../../components/layout/AppLayout';
import MeetingList from './MeetingList';
import { Meeting } from '../../types/meeting';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import authApi from '../../api/auth';

export const ClientDashboard: React.FC = () => {
  const { meetings, stats, loading, refresh, cancelMeeting, rescheduleMeeting, confirmReschedule } = useMeetings();
  const [rescheduleTarget, setRescheduleTarget] = useState<Meeting | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [reason, setReason] = useState('');
  const [additionalTime, setAdditionalTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getMe();
        if (user && user.name) {
          setUserName(user.name);
        }
      } catch (err) {
        console.error('Failed to fetch user in ClientDashboard:', err);
      }
    };
    fetchUser();
  }, []);

  // Checklist prep state
  const [prepChecklist, setPrepChecklist] = useState({
    crm: false,
    metrics: false,
    funnel: false,
    scripts: false
  });

  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState('2 mins ago');

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncTime('Just now');
    }, 1000);
  };

  const handleCancel = async (id: number) => {
    if (window.confirm('Are you sure you want to cancel this mentorship session?')) {
      await cancelMeeting(id);
    }
  };

  const handleAcceptReschedule = async (id: number) => {
    if (window.confirm('Accept the proposed reschedule time?')) {
      await confirmReschedule(id);
    }
  };

  const openRescheduleModal = (meeting: Meeting) => {
    setRescheduleTarget(meeting);
    setReason('');
    setAdditionalTime('');
    setErrorMessage('');
    if (meeting.start_time) {
      setNewDate(meeting.start_time.split('T')[0]);
      const timePart = meeting.start_time.split('T')[1];
      if (timePart) setNewTime(timePart.slice(0, 5));
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget) return;
    if (!newDate || !newTime) {
      setErrorMessage('Please pick a valid date and time.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const startStr = `${newDate}T${newTime}:00`;
      const duration = rescheduleTarget.duration_minutes || 60;
      const [year, month, day] = newDate.split('-').map(Number);
      const [hour, min] = newTime.split(':').map(Number);
      const startDate = new Date(year, month - 1, day, hour, min);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
      const pad = (num: number) => String(num).padStart(2, '0');
      const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

      const formattedReason = `Request: ${reason || 'No reason provided.'} · Additional time: ${additionalTime ? additionalTime + ' mins' : 'None'}`;

      await rescheduleMeeting(rescheduleTarget.id, {
        new_start_time: startStr,
        new_end_time: endStr,
        reason: formattedReason
      });
      setRescheduleTarget(null);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to submit reschedule request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodayFormatted = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return {
      dayName: days[now.getDay()].slice(0, 3),
      monthName: months[now.getMonth()],
      dateNum: now.getDate(),
      fullString: `${days[now.getDay()].slice(0, 3)}, ${months[now.getMonth()]} ${now.getDate()}`
    };
  };

  const getWeekDays = () => {
    const current = new Date();
    const week = [];
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      week.push({
        dayName: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        dateNum: next.getDate(),
        isToday: next.toDateString() === new Date().toDateString()
      });
    }
    return week;
  };

  const todayInfo = getTodayFormatted();
  const weekDays = getWeekDays();
  const focusMeeting = meetings?.find(m => m.status === 'approved' || m.status === 'pending');
  const nextUpMeeting = meetings?.filter(m => m.status === 'approved' || m.status === 'pending')[1];
  const progressPercent = stats?.total ? Math.round(((stats.completed || 0) / stats.total) * 100) : 35;

  return (
    <AppLayout title="Executive Mentorship Dashboard">
      <div className="space-y-8 animate-fade-in font-sans">

        {/* Premium Focus & Progress Header Banner */}
        <div className="rounded-3xl p-8 text-white relative overflow-hidden shadow-lg border border-slate-700/10" style={{ background: 'linear-gradient(135deg, #51758f 0%, #345064 100%)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />

          {/* Header Row: Welcome Banner */}
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                {(() => {
                  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  const now = new Date();
                  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
                })()}
              </p>
              <h2 className="text-4xl font-black tracking-tight mt-2 text-white">
                Hello, {userName ? userName.split(' ')[0] : 'Courtney'}
              </h2>
              <p className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-cyan-200 to-sky-300 mt-1">
                How can I help you today?
              </p>
            </div>
          </div>

          {/* Today's Focus Card */}
          <div className="bg-white rounded-2xl p-8 text-slate-800 shadow-xl border border-slate-200/50 mb-8 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-black text-black uppercase tracking-widest">Up Next</p>
            </div>

            <h3 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-2">
              {focusMeeting ? focusMeeting.title : "No Mentorship Session Today"}
            </h3>

            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-6">
              {focusMeeting ? (focusMeeting.description || "Review strategic growth roadmap and SDR performance.") : "Gain executive mentorship to accelerate your strategic roadmap. Schedule your next session."}
            </p>

            {focusMeeting && focusMeeting.admin_notes && (
              <div className="mb-6 bg-slate-50 border border-slate-200/50 rounded-xl p-4 text-xs leading-relaxed text-slate-700">
                <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block mb-1">Admin Remarks / Notes</span>
                <p className="font-medium text-slate-600">{focusMeeting.admin_notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              {focusMeeting ? (
                <button
                  onClick={() => window.location.href = `/book`}
                  className="bg-black hover:bg-slate-900 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">event</span>
                  Schedule Another
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = `/book`}
                  className="bg-black hover:bg-slate-900 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Book Session
                </button>
              )}
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                <span className="material-symbols-outlined text-base text-slate-400">calendar_month</span>
                <span>
                  Next: {nextUpMeeting ? (
                    nextUpMeeting.display_date || new Date(nextUpMeeting.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  ) : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Calendar & Next Up Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10 border-t border-white/10 pt-6">
            {/* Next Up */}
            <div className="space-y-1">
              <p className="text-xs font-black text-white uppercase tracking-widest">Next Up</p>
              <p className="text-sm font-bold text-white">
                {nextUpMeeting ? nextUpMeeting.title : "No upcoming sessions"}
              </p>
            </div>

            {/* Weekly Strip */}
            <div className="w-full md:w-auto">
              <div className="flex items-center justify-between md:justify-end gap-3 bg-black/10 rounded-2xl p-1.5 border border-white/5">
                {weekDays.map((wd, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center transition-all ${wd.isToday
                        ? 'bg-white text-slate-900 font-bold rounded-xl px-3 py-2.5 shadow-md transform scale-105'
                        : 'text-slate-300 px-2 py-2'
                      }`}
                  >
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400">{wd.dayName}</span>
                    <span className="text-sm mt-0.5">{wd.dateNum}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>



        {/* Dashboard Content split layout */}
        <div className="grid grid-cols-1 gap-8">
          {/* Main Area: Meetings List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-800">Your Sessions</h2>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 font-body text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200/50" />
                <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200/50" />
              </div>
            ) : (
              <MeetingList
                meetings={meetings}
                onCancel={handleCancel}
                onReschedule={openRescheduleModal}
                onAcceptReschedule={handleAcceptReschedule}
              />
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <Modal
          isOpen={true}
          onClose={() => setRescheduleTarget(null)}
          title={`Reschedule: ${rescheduleTarget.title}`}
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-body text-rose-600">
                {errorMessage}
              </div>
            )}
            <Input
              type="date"
              label="Preferred Date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Input
              type="time"
              label="Preferred Time (IST)"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
            <div>
              <label className="mb-1 block font-body text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Reason for Rescheduling
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 font-body text-sm text-slate-600 focus:border-indigo-600 focus:outline-none mb-3"
                rows={3}
                placeholder="e.g. Client conflict or urgent board meeting"
              />
            </div>
            <Input
              type="text"
              label="Additional Time Requested (e.g. +30 mins, optional)"
              placeholder="e.g. +30 mins"
              value={additionalTime}
              onChange={(e) => setAdditionalTime(e.target.value)}
            />
            <div className="flex justify-end gap-2 border-t border-slate-50 pt-4">
              <Button variant="ghost" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleRescheduleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Request Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
};
export default ClientDashboard;
