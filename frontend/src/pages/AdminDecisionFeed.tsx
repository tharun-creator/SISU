import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';
import { Meeting } from '../features/booking/BookingModal';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',              // Amber
  approved: '#22C55E',             // Green
  rejected: '#EF4444',             // Red
  cancelled: '#64748B',            // Slate-500
  rescheduled: '#F97316',          // Orange
  reschedule_requested: '#F97316', // Orange
  completed: '#4F46E5',            // Indigo
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  normal: '#4F46E5',
  low: '#22C55E'
};

const TIME_SLOTS = [
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' }
];

export default function AdminDecisionFeed() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // Action states for the top card
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reschedule' | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [meetLink, setMeetLink] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  const [processing, setProcessing] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      const [allMeetings, notifs] = await Promise.all([
        api.adminGetMeetings(),
        api.getNotifications(),
      ]);
      setMeetings(allMeetings || []);
      setNotifications((notifs || []).filter((n: any) => !n.is_read));
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter requests that need decisions
  const decisionRequests = meetings.filter(
    m => m.status === 'pending' || m.status === 'reschedule_requested'
  );

  // Filter approved/completed meetings for conflict checks
  const approvedMeetings = meetings.filter(
    m => m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed'
  );

  // Active meeting on top of the stack
  const activeMeeting = decisionRequests[activeIndex];

  // Check for calendar conflicts
  const getConflict = (meeting: Meeting) => {
    if (!meeting || !meeting.start_time || !meeting.end_time) return null;
    const currentStart = new Date(meeting.start_time).getTime();
    const currentEnd = new Date(meeting.end_time).getTime();

    return approvedMeetings.find(m => {
      if (!m.start_time || !m.end_time || m.id === meeting.id) return false;
      const mStart = new Date(m.start_time).getTime();
      const mEnd = new Date(m.end_time).getTime();
      return currentStart < mEnd && currentEnd > mStart;
    });
  };

  // Find client total sessions count
  const getClientSessionCount = (clientEmail: string) => {
    return meetings.filter(
      m => m.client_email === clientEmail && (m.status === 'approved' || m.status === 'completed')
    ).length;
  };

  const handleDecision = async (id: string | number, status: string, details: any = {}) => {
    setProcessing(true);
    try {
      await api.adminUpdateStatus(id, {
        status,
        admin_notes: details.notes || undefined,
        meet_link: details.meetLink || undefined,
        new_start_time: details.newStart || undefined,
        new_end_time: details.newEnd || undefined
      });
      
      // Clear inputs
      setActionType(null);
      setNotes('');
      setMeetLink('');
      setRescheduleDate('');
      setRescheduleTime('11:00');
      
      // Fetch latest meetings to update lists
      await fetchData();
      
      // If we processed the last card, reset index or handle boundary
      if (activeIndex >= decisionRequests.length - 1) {
        setActiveIndex(0);
      }
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = () => {
    if (decisionRequests.length <= 1) return;
    
    // Cycle the skipped item to the end of the stack
    if (activeIndex >= decisionRequests.length - 1) {
      setActiveIndex(0);
    } else {
      setActiveIndex(activeIndex + 1);
    }
    
    setActionType(null);
  };

  return (
    <AppLayout title="Decision Feed">
      <div className="relative min-h-[calc(100vh-120px)] flex flex-col space-y-6">
        {/* Decorative Background Radial Glow */}
        <div className="absolute top-[10%] left-[50%] -translate-x-[50%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)] rounded-full filter blur-[60px] pointer-events-none z-0" />

        {/* Header Summary */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900 font-heading">Pending Decisions</h3>
            <p className="text-slate-500 text-xs mt-1">
              {decisionRequests.length === 0 
                ? "No pending requests remaining" 
                : `${decisionRequests.length} meeting request${decisionRequests.length > 1 ? 's' : ''} require your decision`
              }
            </p>
          </div>
          
          {decisionRequests.length > 0 && (
            <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-600 flex items-center gap-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              STACKED VIEW ({activeIndex + 1}/{decisionRequests.length})
            </div>
          )}
        </div>

        {/* Main Stack Area */}
        <div className="flex-1 flex items-center justify-center relative z-10 pb-10">
          {loading ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-[480px]">
              <div className="animate-pulse bg-slate-200 h-[450px] w-full rounded-3xl" />
            </div>
          ) : decisionRequests.length === 0 ? (
            /* Celebration Screen (Satisfying Inbox Zero State) */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xl w-full max-w-[480px]"
            >
              <div className="w-[72px] h-[72px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <span className="material-symbols-outlined text-3xl text-emerald-600">done_all</span>
              </div>
              <h4 className="text-xl font-extrabold text-slate-800 mb-2 font-heading">Decision Feed Cleared!</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                All pending client meeting requests and reschedule tickets have been resolved. You are completely caught up!
              </p>
              <div className="flex gap-3">
                <Link to="/admin" className="flex-1 py-3 text-center bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm rounded-xl cursor-pointer transition-colors">
                  Go to Dashboard
                </Link>
                <Link to="/admin/meetings" className="flex-1 py-3 text-center border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors">
                  View Calendar
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Split layout: Queue on left, Card detail on right */
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 w-full relative z-10 items-start">
              {/* Left Column: Queue/List of requests */}
              <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {decisionRequests.map((meeting, idx) => {
                  const isActive = idx === activeIndex;
                  const priorityColor = PRIORITY_COLORS[meeting.priority || 'normal'] || '#4F46E5';
                  
                  return (
                    <div
                      key={meeting.id}
                      onClick={() => {
                        setActiveIndex(idx);
                        setActionType(null); // Reset action fields
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isActive 
                          ? 'border-[#4F46E5] bg-[#4F46E5]/[0.06] shadow-md' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                          {meeting.client_name}
                        </h4>
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: meeting.status === 'reschedule_requested' ? '#F97316' : '#F59E0B' }} 
                        />
                      </div>
                      <p className="text-[12px] text-slate-500 font-semibold mb-2 truncate">
                        {meeting.title}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>{meeting.display_date}</span>
                        <span className="uppercase font-bold" style={{ color: priorityColor }}>{meeting.priority || 'normal'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Active Card Detail */}
              <div className="relative w-full">
                {activeMeeting && (
                  <div
                    key={activeMeeting.id}
                    className={`relative w-full rounded-3xl p-7 flex flex-col justify-between overflow-hidden shadow-2xl bg-white border ${
                      activeMeeting.client_is_priority ? 'border-amber-400 bg-amber-500/[0.01]' : 'border-slate-200'
                    }`}
                  >
                    {/* Card Accent Glow based on priority */}
                    <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{
                      background: activeMeeting.client_is_priority
                        ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
                        : (activeMeeting.priority === 'urgent' || activeMeeting.priority === 'high' 
                            ? 'linear-gradient(90deg, #EF4444 0%, #F97316 100%)'
                            : 'linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)')
                    }} />

                    {/* Card Content Wrapper */}
                    <div className="flex flex-col h-full relative z-10 space-y-6">
                      
                      {/* Header Details */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10.5 h-10.5 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0 shadow-sm"
                            style={{
                              background: activeMeeting.client_is_priority 
                                ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' 
                                : 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)'
                            }}
                          >
                            {activeMeeting.client_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 leading-snug flex items-center gap-2 flex-wrap">
                              {activeMeeting.client_name}
                              {activeMeeting.client_is_priority && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-mono">⭐ PRIORITY</span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{activeMeeting.client_email}</span>
                              {activeMeeting.phone && activeMeeting.phone !== 'N/A' && (
                                <>
                                  <span>·</span>
                                  <span>{activeMeeting.phone}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${
                          activeMeeting.priority === 'high' || activeMeeting.priority === 'urgent'
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                        }`}>
                          {activeMeeting.priority}
                        </span>
                      </div>

                      {/* Action forms */}
                      <AnimatePresence mode="wait">
                        {actionType === null ? (
                          /* Core Details View */
                          <motion.div 
                            key="details"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 space-y-4"
                          >
                            {/* Request Type Indicator */}
                            <div className="flex items-center gap-2">
                              <span 
                                className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono"
                                style={{ 
                                  backgroundColor: `${STATUS_COLORS[activeMeeting.status]}10`, 
                                  color: STATUS_COLORS[activeMeeting.status], 
                                  borderColor: `${STATUS_COLORS[activeMeeting.status]}20` 
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[activeMeeting.status] }} />
                                {activeMeeting.status === 'reschedule_requested' ? 'Reschedule Requested' : 'New Request'}
                              </span>
                              {getClientSessionCount(activeMeeting.client_email) > 0 && (
                                <span className="bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-[9px] font-bold text-slate-500 font-mono uppercase">
                                  {getClientSessionCount(activeMeeting.client_email)} PAST SESSION{getClientSessionCount(activeMeeting.client_email) > 1 ? 'S' : ''}
                                </span>
                              )}
                            </div>

                            {/* Title / Description */}
                            <h2 className="text-base font-extrabold text-slate-800 leading-snug">{activeMeeting.title}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                              {activeMeeting.meeting_type} · {activeMeeting.duration_minutes} Mins · {
                                activeMeeting.preferred_communication === 'video' ? 'Google Meet' : 
                                activeMeeting.preferred_communication === 'in_person' ? 'Spi Edge (In-Office)' : 
                                activeMeeting.preferred_communication?.startsWith('custom_location:') ? activeMeeting.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'
                              }
                            </p>

                            {/* Proposed Slot Info */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                              <div className="flex items-center gap-3 text-slate-700">
                                <span className="material-symbols-outlined text-lg text-[#4F46E5]">calendar_today</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{activeMeeting.display_date || (activeMeeting.start_time ? format(parseISO(activeMeeting.start_time), 'EEEE, MMM dd, yyyy') : 'TBD')}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{activeMeeting.display_time || (activeMeeting.start_time ? format(parseISO(activeMeeting.start_time), 'hh:mm a') : 'TBD')} IST</p>
                                </div>
                              </div>
                            </div>

                            {/* Calendar Conflict Warning */}
                            {getConflict(activeMeeting) && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">warning</span>
                                <span>Time Conflict: Overlaps with "{getConflict(activeMeeting)!.title}"</span>
                              </div>
                            )}

                            {/* Client Description */}
                            <div className="flex-1 overflow-y-auto max-h-[85px] pr-1 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Description:</span>
                              <p className="text-xs text-slate-500 leading-relaxed italic">
                                "{activeMeeting.description && activeMeeting.description.trim() !== '' && activeMeeting.description !== 'Booked via Executive Mentorship Workspace' ? activeMeeting.description : 'no description'}"
                              </p>
                            </div>
                          </motion.div>
                        ) : actionType === 'approve' ? (
                          /* Approve Panel */
                          <motion.div 
                            key="approve"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 space-y-4"
                          >
                            <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 font-heading">
                              <span className="material-symbols-outlined text-lg">check_circle</span> Confirm Approval
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Are you sure you want to approve this mentorship session?
                            </p>
                            <div className="flex gap-2 pt-4">
                              <button className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer" onClick={() => setActionType(null)}>Back</button>
                              <button 
                                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                onClick={() => handleDecision(activeMeeting.id, 'approved', { notes: '', meetLink: '' })} 
                                disabled={processing}
                              >
                                {processing ? 'Processing...' : 'Confirm Approve'}
                              </button>
                            </div>
                          </motion.div>
                        ) : actionType === 'reject' ? (
                          /* Reject Panel */
                          <motion.div 
                            key="reject"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 space-y-4"
                          >
                            <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5 font-heading">
                              <span className="material-symbols-outlined text-lg">cancel</span> Decline Request
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Are you sure you want to decline this mentorship request?
                            </p>
                            <div className="flex gap-2 pt-4">
                              <button className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer" onClick={() => setActionType(null)}>Back</button>
                              <button 
                                className="flex-[2] py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                onClick={() => handleDecision(activeMeeting.id, 'rejected', { notes: '' })} 
                                disabled={processing}
                              >
                                {processing ? 'Processing...' : 'Confirm Decline'}
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          /* Reschedule Panel */
                          <motion.div 
                            key="reschedule"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 space-y-4"
                          >
                            <h3 className="text-sm font-bold text-orange-600 flex items-center gap-1.5 font-heading">
                              <span className="material-symbols-outlined text-lg">schedule</span> Reschedule Meeting
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">New Date</label>
                                <input 
                                  type="date" 
                                  value={rescheduleDate} 
                                  onChange={(e) => setRescheduleDate(e.target.value)} 
                                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">New Start Time (IST)</label>
                                <select 
                                  value={rescheduleTime} 
                                  onChange={(e) => setRescheduleTime(e.target.value)} 
                                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all cursor-pointer"
                                >
                                  {TIME_SLOTS.map(slot => (
                                    <option key={slot.value} value={slot.value}>
                                      {slot.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                              <button className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer" onClick={() => setActionType(null)}>Back</button>
                              <button 
                                className="flex-[2] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                onClick={() => {
                                  if (!rescheduleDate || !rescheduleTime) return;
                                  const startStr = `${rescheduleDate}T${rescheduleTime}:00`;
                                  const duration = activeMeeting.duration_minutes || 60;
                                  const [year, month, day] = rescheduleDate.split('-').map(Number);
                                  const [hour, min] = rescheduleTime.split(':').map(Number);
                                  const startDate = new Date(year, month - 1, day, hour, min);
                                  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                                  const pad = (num: number) => String(num).padStart(2, '0');
                                  const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
                                  
                                  handleDecision(activeMeeting.id, 'rescheduled', { notes: '', newStart: startStr, newEnd: endStr });
                                }}
                                disabled={processing || !rescheduleDate || !rescheduleTime}
                              >
                                {processing ? 'Processing...' : 'Confirm Reschedule'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Bar */}
                      {actionType === null && (
                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => setActionType('reject')}
                            className="flex-1 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span> Decline
                          </button>
                          <button 
                            onClick={() => {
                              setActionType('reschedule');
                              if (activeMeeting.start_time) {
                                setRescheduleDate(activeMeeting.start_time.split('T')[0]);
                                const timePart = activeMeeting.start_time.split('T')[1];
                                if (timePart) {
                                  setRescheduleTime(timePart.slice(0, 5));
                                }
                              }
                            }}
                            className="flex-[1.2] py-2.5 border border-orange-200 text-orange-500 hover:bg-orange-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">update</span> Reschedule
                          </button>
                          <button 
                            onClick={() => setActionType('approve')}
                            className="flex-[1.4] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
