import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  pending: 'var(--color-amber)',
  approved: 'var(--color-green)',
  rejected: 'var(--color-red)',
  cancelled: 'var(--color-text-muted)',
  rescheduled: 'var(--color-accent-orange)',
  reschedule_requested: 'var(--color-accent-orange)',
  completed: 'var(--color-accent)'
};

const TIME_SLOTS = [
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
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
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
];

export default function BookingModal({ meeting, onClose, onAction }) {
  const [status, setStatus] = useState(meeting.status === 'reschedule_requested' ? 'rescheduled' : 'approved');
  const [notes] = useState('');
  const [meetLink] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(meeting.priority || 'medium');
  
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

  const [rescheduleDate, setRescheduleDate] = useState(getInitialDate());
  const [rescheduleTime, setRescheduleTime] = useState(getInitialTime());
  const [loading, setLoading] = useState(false);

  if (!meeting) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalNewStart = undefined;
      let finalNewEnd = undefined;
      
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
        
        const pad = (num) => String(num).padStart(2, '0');
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
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 500, 
        background: 'rgba(0, 0, 0, 0.4)', 
        backdropFilter: 'blur(8px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px',
        overflowY: 'auto'
      }} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        style={{ 
          width: '100%', 
          maxWidth: 500, 
          padding: 24, 
          borderRadius: 16,
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Review Request</h2>
          <button 
            onClick={onClose} 
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-text-secondary)' }}>close</span>
          </button>
        </div>

        {/* Meeting Details Summary */}
        <div style={{ 
          background: 'var(--color-surface-2)', 
          border: '1px solid var(--color-border)', 
          borderRadius: 12, 
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{meeting.title}</p>
            <span style={{ fontSize: 11, padding: '4px 8px', background: 'var(--color-surface-3)', borderRadius: 6, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {meeting.meeting_type}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>person</span> 
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{meeting.client_name}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>· {meeting.client_email}</span>
            </div>
            
            {meeting.phone && meeting.phone !== 'N/A' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>phone</span> 
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{meeting.phone}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>schedule</span> 
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {meeting.display_date || (meeting.start_time ? format(parseISO(meeting.start_time), 'MMM dd, yyyy') : 'TBD')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                · {meeting.display_time || (meeting.start_time ? format(parseISO(meeting.start_time), 'hh:mm a') : 'TBD')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
                {meeting.preferred_communication === 'video' ? 'videocam' : 
                 meeting.preferred_communication === 'in_person' ? 'home_pin' : 'location_on'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {meeting.preferred_communication === 'video' ? 'Google Meet (Online Video)' : 
                 meeting.preferred_communication === 'in_person' ? 'Spi Edge (In-Office Meet)' : 
                 meeting.preferred_communication?.startsWith('custom_location:') ? meeting.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'}
              </span>
            </div>
          </div>
          
          {meeting.reason && (
            <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{meeting.reason}"</p>
            </div>
          )}
          {meeting.description && meeting.description !== 'Booked via Executive Mentorship Workspace' && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dotted var(--color-border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{meeting.description}</p>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Decision</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {['approved', 'rejected', 'rescheduled', 'cancelled'].map(s => {
              const isActive = status === s;
              const col = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isActive ? col : 'var(--color-border)'}`,
                    background: isActive ? `${col}15` : 'var(--color-surface-2)',
                    color: isActive ? col : 'var(--color-text-primary)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textTransform: 'capitalize'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: isActive ? col : 'var(--color-text-muted)' }}>
                    {s === 'approved' ? 'check_circle' : 
                     s === 'rejected' ? 'cancel' : 
                     s === 'cancelled' ? 'block' : 'update'}
                  </span>
                  {s === 'rescheduled' ? 'Reschedule' : s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Priority</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['low', 'medium', 'high'].map(p => {
              const isActive = selectedPriority === p;
              const col = p === 'low' ? 'var(--color-green)' : p === 'medium' ? 'var(--color-amber)' : 'var(--color-red)';
              const icon = p === 'low' ? 'south' : p === 'medium' ? 'horizontal_rule' : 'north';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  style={{
                    padding: '8px',
                    borderRadius: 8,
                    border: `1px solid ${isActive ? col : 'var(--color-border)'}`,
                    background: isActive ? `${col}15` : 'var(--color-surface-2)',
                    color: isActive ? col : 'var(--color-text-primary)',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textTransform: 'capitalize'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: isActive ? col : 'var(--color-text-muted)' }}>{icon}</span>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {status === 'rescheduled' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>New Date</label>
                <input 
                  className="input-premium" 
                  type="date" 
                  value={rescheduleDate} 
                  onChange={(e) => setRescheduleDate(e.target.value)} 
                  style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>New Time (IST)</label>
                <select 
                  className="input-premium" 
                  value={rescheduleTime} 
                  onChange={(e) => setRescheduleTime(e.target.value)} 
                  style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}
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

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: 8, 
              border: 'none',
              background: STATUS_COLORS[status] || 'var(--color-primary)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Processing...' : `Confirm`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
