import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',              // Amber
  approved: '#22C55E',             // Green
  rejected: '#EF4444',             // Red
  cancelled: '#64748B',            // Slate-500
  rescheduled: '#F97316',          // Orange
  reschedule_requested: '#F97316', // Orange
  completed: '#4F46E5',            // Indigo
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

export interface Meeting {
  id: string | number;
  title: string;
  meeting_type: string;
  client_name: string;
  client_email: string;
  client_is_priority?: boolean;
  phone?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  preferred_communication?: string;
  description?: string;
  notes?: string;
  admin_notes?: string;
  meet_link?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | string;
  display_date?: string;
  display_time?: string;
}

interface BookingModalProps {
  meeting: Meeting;
  onClose: () => void;
  onAction: (id: string | number, data: any) => Promise<void> | void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ meeting, onClose, onAction }) => {
  const [status, setStatus] = useState<string>(meeting.status === 'reschedule_requested' ? 'rescheduled' : 'approved');
  const [notes, setNotes] = useState<string>(meeting.admin_notes || '');
  const [meetLink, setMeetLink] = useState<string>(meeting.meet_link || '');
  const [selectedPriority, setSelectedPriority] = useState<string>(meeting.priority || 'medium');
  
  const getInitialDate = () => {
    if (meeting.start_time) {
      return meeting.start_time.split('T')[0];
    }
    return '';
  };

  const getInitialTime = () => {
    if (meeting.start_time) {
      const timePart = meeting.start_time.split('T')[1];
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }
    return '09:00';
  };

  const [rescheduleDate, setRescheduleDate] = useState<string>(getInitialDate());
  const [rescheduleTime, setRescheduleTime] = useState<string>(getInitialTime());
  const [loading, setLoading] = useState<boolean>(false);

  if (!meeting) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalNewStart: string | undefined = undefined;
      let finalNewEnd: string | undefined = undefined;
      
      if (status === 'rescheduled') {
        if (!rescheduleDate || !rescheduleTime) {
          alert('Please select both a date and time for rescheduling.');
          setLoading(false);
          return;
        }
        
        const startStr = `${rescheduleDate}T${rescheduleTime}:00`;
        finalNewStart = startStr;
        
        const duration = meeting.duration_minutes || 60;
        const [year, month, day] = rescheduleDate.split('-').map(Number);
        const [hour, min] = rescheduleTime.split(':').map(Number);
        const startDate = new Date(year, month - 1, day, hour, min);
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        
        const pad = (num: number) => String(num).padStart(2, '0');
        const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
        finalNewEnd = endStr;
      }
      
      await onAction(meeting.id, { 
        status, 
        admin_notes: notes, 
        meet_link: meetLink, 
        new_start_time: finalNewStart, 
        new_end_time: finalNewEnd,
        priority: selectedPriority
      });
      onClose();
    } catch (e: any) {
      alert(e.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedColor = STATUS_COLORS[status] || '#4F46E5';

  return (
    <div 
      className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-request-title"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[500px] p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <h2 id="review-request-title" className="text-lg font-bold text-slate-900">Review Request</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Meeting Details Summary */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-start gap-4">
            <p className="font-bold text-slate-900 leading-snug">{meeting.title}</p>
            <span className="text-[11px] px-2.5 py-1 bg-slate-200/60 rounded-md font-semibold text-slate-600 whitespace-nowrap">
              {meeting.meeting_type}
            </span>
          </div>
          
          <div className="flex flex-col gap-2 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-slate-400">person</span> 
              <span className="font-medium text-slate-800">{meeting.client_name}</span>
              <span className="text-slate-400">· {meeting.client_email}</span>
            </div>
            
            {meeting.phone && meeting.phone !== 'N/A' && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-slate-400">phone</span> 
                <span className="font-medium text-slate-800">{meeting.phone}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-slate-400">schedule</span> 
              <span className="font-medium text-slate-800">
                {meeting.display_date || (meeting.start_time ? format(parseISO(meeting.start_time), 'MMM dd, yyyy') : 'TBD')}
              </span>
              <span className="text-slate-400">
                · {meeting.display_time || (meeting.start_time ? format(parseISO(meeting.start_time), 'hh:mm a') : 'TBD')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-slate-400">
                {meeting.preferred_communication === 'video' ? 'videocam' : 
                 meeting.preferred_communication === 'in_person' ? 'home_pin' : 'location_on'}
              </span>
              <span>
                {meeting.preferred_communication === 'video' ? 'Google Meet (Online Video)' : 
                 meeting.preferred_communication === 'in_person' ? 'Spi Edge (In-Office Meet)' : 
                 meeting.preferred_communication?.startsWith('custom_location:') ? meeting.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'}
              </span>
            </div>
          </div>
          
          <div className="mt-1 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 italic leading-relaxed">
              "{meeting.description && meeting.description.trim() !== '' && meeting.description !== 'Booked via Executive Mentorship Workspace' ? meeting.description : 'no description'}"
            </p>
          </div>

          {meeting.notes && (meeting.status === 'reschedule_requested' || meeting.status === 'rescheduled') && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reschedule Request Details</h4>
              <p className="text-xs text-slate-700 leading-relaxed white-space-pre-wrap">
                {meeting.notes}
              </p>
            </div>
          )}
        </div>

        {/* Decision controls */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Decision</label>
          <div className="grid grid-cols-2 gap-2">
            {['approved', 'rejected', 'rescheduled', 'cancelled'].map(s => {
              const isActive = status === s;
              const col = STATUS_COLORS[s] || '#4F46E5';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer"
                  style={{
                    borderColor: isActive ? col : '#E2E8F0',
                    backgroundColor: isActive ? `${col}10` : '#F8FAFC',
                    color: isActive ? col : '#0F172A',
                  }}
                >
                  <span className="material-symbols-outlined text-base" style={{ color: isActive ? col : '#64748B' }}>
                    {s === 'approved' ? 'check_circle' : 
                     s === 'rejected' ? 'cancel' : 
                     s === 'cancelled' ? 'block' : 'update'}
                  </span>
                  <span className="capitalize">{s === 'rescheduled' ? 'Reschedule' : s}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {['low', 'medium', 'high'].map(p => {
              const isActive = selectedPriority === p;
              const col = p === 'low' ? '#22C55E' : p === 'medium' ? '#F59E0B' : '#EF4444';
              const icon = p === 'low' ? 'south' : p === 'medium' ? 'horizontal_rule' : 'north';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer capitalize"
                  style={{
                    borderColor: isActive ? col : '#E2E8F0',
                    backgroundColor: isActive ? `${col}10` : '#F8FAFC',
                    color: isActive ? col : '#0F172A',
                  }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: isActive ? col : '#64748B' }}>{icon}</span>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Notes */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Admin Notes</label>
            <textarea 
              placeholder="Write any administrative notes..."
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all min-h-[60px] resize-vertical"
            />
          </div>
        </div>

        {/* Reschedule Date/Time Picker */}
        <div className="flex flex-col gap-3">
          {status === 'rescheduled' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New Date</label>
                <input 
                  type="date" 
                  value={rescheduleDate} 
                  onChange={(e) => setRescheduleDate(e.target.value)} 
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New Time (IST)</label>
                <select 
                  value={rescheduleTime} 
                  onChange={(e) => setRescheduleTime(e.target.value)} 
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={loading} 
            className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: selectedColor }}
          >
            {loading ? 'Processing...' : `Confirm`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;
