import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import BookingModal, { Meeting } from '../features/booking/BookingModal';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#EF4444',
  medium: '#F59E0B',
  normal: '#F59E0B',
  low: '#22C55E'
};

const STATUS_COLORS: Record<string, string> = {
  rescheduled: '#F97316',          // Orange
  reschedule_requested: '#F97316' // Orange
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = '#4F46E5', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-slate-300 transition-all duration-200"
      whileHover={{ y: -4 }}
    >
      <div 
        className="absolute top-[-20%] right-[-20%] w-[100px] h-[100px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}10 0%, transparent 70%)` }}
      />
      <div className="flex justify-between items-center mb-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center border"
          style={{ backgroundColor: `${color}12`, borderColor: `${color}24` }}
        >
          <span className="material-symbols-outlined text-lg" style={{ color }}>{icon}</span>
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 tracking-tight mb-1 font-heading">
          {value}
        </div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminReschedulePage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'rescheduled' | 'reschedule_requested'

  const fetchData = useCallback(async () => {
    try {
      const allMeetings = await api.adminGetMeetings();
      setMeetings(allMeetings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (id: string | number, data: any) => {
    await api.adminUpdateStatus(id, data);
    await fetchData();
  };

  // Filter only rescheduled & reschedule_requested
  const rescheduleList = useMemo(() => {
    return meetings.filter(m => m.status === 'rescheduled' || m.status === 'reschedule_requested');
  }, [meetings]);

  const filteredReschedules = useMemo(() => {
    return rescheduleList.filter(m => {
      const matchesSearch = 
        m.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.client_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rescheduleList, searchQuery, statusFilter]);

  // Stats calculations
  const totalRescheduled = rescheduleList.filter(m => m.status === 'rescheduled').length;
  const pendingRequests = rescheduleList.filter(m => m.status === 'reschedule_requested').length;

  return (
    <AppLayout title="Rescheduled Meetings">
      <AnimatePresence>
        {selectedMeeting && (
          <BookingModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onAction={handleAction} />
        )}
      </AnimatePresence>

      <div className="relative space-y-6">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(249,115,22,0.04)_0%,transparent_65%)] rounded-full filter blur-[80px] pointer-events-none z-0" />

        {/* Page Header */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">Reschedules</h1>
            <p className="text-slate-500 text-xs mt-1">Manage confirmed rescheduled bookings and incoming client reschedule request tickets.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <StatCard icon="update" label="Rescheduled Confirmed" value={totalRescheduled} color="#F97316" delay={0} />
          <StatCard icon="pending_actions" label="Pending Reschedule Requests" value={pendingRequests} color="#F59E0B" delay={0.05} />
        </div>

        {/* Filter Controls Row */}
        <div className="flex justify-between items-center flex-wrap gap-4 relative z-10">
          {/* Search bar */}
          <div className="relative w-full max-w-[300px]">
            <span className="material-symbols-outlined absolute left-3 top-[50%] -translate-y-[50%] text-slate-400 text-lg">search</span>
            <input 
              type="text" 
              placeholder="Search reschedules..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['all', 'rescheduled', 'reschedule_requested'].map(f => {
              const isActive = statusFilter === f;
              const label = f === 'reschedule_requested' ? 'Pending Requests' : f === 'rescheduled' ? 'Confirmed' : 'All';
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize font-mono ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="relative z-10 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Client</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Meeting Details</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date & Time</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Priority</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-3.5"><div className="h-8 w-8 rounded-full bg-slate-200 inline-block align-middle" /><div className="h-4 w-16 bg-slate-200 ml-2 inline-block align-middle" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-28 bg-slate-200" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-20 bg-slate-200" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-12 rounded bg-slate-200" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-16 rounded bg-slate-200" /></td>
                      <td className="px-5 py-3.5 text-right"><div className="h-7 w-12 rounded bg-slate-200 inline-block" /></td>
                    </tr>
                  ))
                ) : filteredReschedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                      <span className="material-symbols-outlined text-3xl mb-2 block text-slate-300">update</span>
                      No rescheduled sessions or requests found.
                    </td>
                  </tr>
                ) : filteredReschedules.map((m) => {
                  const priorityColor = PRIORITY_COLORS[m.priority || 'medium'] || '#4F46E5';
                  const statusColor = STATUS_COLORS[m.status] || '#64748B';
                  const statusLabel = m.status === 'reschedule_requested' ? 'Pending Request' : 'Rescheduled';
                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => setSelectedMeeting(m)}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${m.client_is_priority ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                            style={{
                              background: m.client_is_priority 
                                ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' 
                                : 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)'
                            }}
                          >
                            {m.client_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {m.client_name}
                              {m.client_is_priority && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-bold font-mono">⭐ PRIORITY</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{m.client_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-slate-800">{m.title}</p>
                        <p className="text-[10px] text-slate-400">{m.meeting_type}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">{m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')}</span>
                        <span className="text-slate-300 mx-1">·</span>
                        <span className="font-semibold text-slate-800">{m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span 
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono"
                          style={{ 
                            borderColor: `${priorityColor}24`, 
                            backgroundColor: `${priorityColor}12`, 
                            color: priorityColor 
                          }}
                        >
                          {m.priority || 'medium'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span 
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono"
                          style={{ 
                            backgroundColor: `${statusColor}10`, 
                            color: statusColor, 
                            borderColor: `${statusColor}20` 
                          }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor }} />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedMeeting(m)}
                          className="px-2.5 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          {m.status === 'reschedule_requested' ? 'Review' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
