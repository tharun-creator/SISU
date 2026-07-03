import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import BookingModal, { Meeting } from '../features/booking/BookingModal';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';

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
  high: '#EF4444',
  medium: '#F59E0B',
  normal: '#F59E0B',
  low: '#22C55E'
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  delta?: string | null;
  color?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, delta, color = '#4F46E5', delay = 0 }) => {
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
        {delta && (
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-600 font-mono">
            {delta}
          </span>
        )}
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

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }
  const [stats, setStats] = useState<any>({});
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pendingMeetings, setPendingMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all time');

  const approvedMeetings = meetings.filter(
    m => m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed'
  );

  const fetchData = useCallback(async () => {
    try {
      const [statsData, allMeetings, pending, notifs] = await Promise.all([
        api.getStats(),
        api.adminGetMeetings(),
        api.adminGetMeetings('pending'),
        api.getNotifications(),
      ]);
      setStats(statsData);
      setMeetings(allMeetings || []);
      setPendingMeetings(pending || []);
      setNotifications((notifs || []).filter((n: any) => !n.is_read));
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

  const filteredMeetings = meetings.filter(m => {
    if (activeTab === 'all') {
      if (m.status !== 'approved' && m.status !== 'rescheduled' && m.status !== 'completed') return false;
    } else if (activeTab === 'pending') {
      if (m.status !== 'pending' && m.status !== 'reschedule_requested' && m.status !== 'rejected') return false;
    } else {
      if (m.status !== activeTab) return false;
    }
    if (dateFilter !== 'all time' && m.start_time) {
      const date = parseISO(m.start_time);
      if (dateFilter === 'today' && !isToday(date)) return false;
      if (dateFilter === 'this week' && !isThisWeek(date)) return false;
      if (dateFilter === 'this month' && !isThisMonth(date)) return false;
    }
    return true;
  });

  return (
    <AppLayout title="Executive Dashboard">
      <AnimatePresence>
        {selectedMeeting && (
          <BookingModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onAction={handleAction} />
        )}
      </AnimatePresence>

      <div className="relative space-y-6">
        {/* Background radial glow */}
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_65%)] rounded-full filter blur-[80px] pointer-events-none z-0" />

        {/* Date / Pending Widget Header Row */}
        <div className="flex justify-between items-center flex-wrap gap-4 relative z-10">
          <div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          {pendingMeetings.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-600 flex items-center gap-2 font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingMeetings.length} PENDING REQUESTS
            </motion.div>
          )}
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <StatCard icon="assessment" label="Total Meetings" value={stats.total_meetings ?? 0} color="#4F46E5" delay={0} />
          <StatCard icon="pending_actions" label="Pending Approval" value={stats.pending_requests ?? 0} color="#F59E0B" delta={stats.pending_requests > 0 ? `${stats.pending_requests} new` : null} delay={0.05} />
          <StatCard icon="check_circle" label="Approved Sessions" value={stats.approved_meetings ?? 0} color="#22C55E" delay={0.1} />
        </div>

        {/* Responsive Dashboard Core Grid */}
        <div className="space-y-6 relative z-10">
          <div className="flex justify-between items-center flex-wrap gap-4">
            
            {/* Tab Pills */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize font-mono ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Date Filters */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['all time', 'today', 'this week', 'this month'].map(filter => {
                const isActive = dateFilter === filter;
                return (
                  <button 
                    key={filter} 
                    onClick={() => setDateFilter(filter)} 
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer capitalize font-mono ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meetings Table Card */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Client</th>
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Meeting Details</th>
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date & Time</th>
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Priority</th>
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</th>
                      <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-4"><div className="h-8 w-8 rounded-full bg-slate-200 inline-block align-middle" /><div className="h-4 w-20 bg-slate-200 ml-2 inline-block align-middle" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-200" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200" /></td>
                          <td className="px-5 py-4"><div className="h-5 w-12 rounded bg-slate-200" /></td>
                          <td className="px-5 py-4"><div className="h-5 w-16 rounded bg-slate-200" /></td>
                          <td className="px-5 py-4 text-right"><div className="h-7 w-14 rounded-lg bg-slate-200 inline-block" /></td>
                        </tr>
                      ))
                    ) : filteredMeetings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                          <span className="material-symbols-outlined text-3xl mb-2 block text-slate-300">calendar_today</span>
                          No scheduled mentorship meetings found.
                        </td>
                      </tr>
                    ) : filteredMeetings.map((m) => {
                      const priorityColor = PRIORITY_COLORS[m.priority || 'medium'] || '#4F46E5';
                      const statusColor = STATUS_COLORS[m.status] || '#64748B';
                      return (
                        <tr 
                          key={m.id} 
                          onClick={() => setSelectedMeeting(m)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${m.client_is_priority ? 'bg-amber-500/[0.02]' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 shadow-sm"
                                style={{
                                  background: m.client_is_priority 
                                    ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' 
                                    : 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)'
                                }}
                              >
                                {m.client_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  {m.client_name}
                                  {m.client_is_priority && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-bold font-mono">⭐ PRIORITY</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">{m.client_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-800">{m.title}</p>
                            <p className="text-[10px] text-slate-400">{m.meeting_type}</p>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">{m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')}</span>
                            <span className="text-slate-300 mx-1.5">·</span>
                            <span className="font-semibold text-slate-800">{m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}</span>
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <span 
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono"
                              style={{ 
                                borderColor: `${priorityColor}24`, 
                                backgroundColor: `${priorityColor}12`, 
                                color: priorityColor 
                              }}
                            >
                              {m.priority || 'medium'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <span 
                              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono"
                              style={{ 
                                backgroundColor: `${statusColor}10`, 
                                color: statusColor, 
                                borderColor: `${statusColor}20` 
                              }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor }} />
                              {m.status === 'reschedule_requested' ? 'reschedule requested' : m.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {(m.status === 'pending' || m.status === 'reschedule_requested') ? (
                              <button 
                                onClick={() => setSelectedMeeting(m)}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
                              >
                                Review
                              </button>
                            ) : (
                              <button 
                                onClick={() => setSelectedMeeting(m)}
                                className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
                    <div className="flex gap-3 items-center">
                      <div className="h-9 w-9 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-[40%] bg-slate-200" />
                        <div className="h-3 w-[60%] bg-slate-200" />
                      </div>
                    </div>
                    <div className="h-4 w-[80%] bg-slate-200" />
                    <div className="h-3.5 w-[50%] bg-slate-200" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-5 w-14 rounded bg-slate-200" />
                      <div className="h-8 w-16 rounded-lg bg-slate-200" />
                    </div>
                  </div>
                ))
              ) : filteredMeetings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-3xl mb-2 block text-slate-300">calendar_today</span>
                  No scheduled mentorship meetings found.
                </div>
              ) : filteredMeetings.map((m) => {
                const priorityColor = PRIORITY_COLORS[m.priority || 'medium'] || '#4F46E5';
                const statusColor = STATUS_COLORS[m.status] || '#64748B';
                return (
                  <div 
                    key={m.id} 
                    onClick={() => setSelectedMeeting(m)}
                    className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:border-slate-300 transition-colors relative cursor-pointer ${m.client_is_priority ? 'border-amber-400 bg-amber-500/[0.01]' : 'border-slate-200'}`}
                  >
                    {m.client_is_priority && (
                      <div className="absolute top-0 left-0 right-0 h-0.75 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-t-2xl" />
                    )}
                    
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
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
                          </p>
                          <p className="text-[10px] text-slate-400">{m.client_email}</p>
                        </div>
                      </div>
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
                    </div>

                    <div className="border-t border-slate-100 pt-2.5">
                      <h4 className="text-xs font-bold text-slate-800 leading-tight">{m.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.meeting_type}</p>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500">
                      <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                      <span className="font-semibold text-slate-600">
                        {m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')}
                        <span className="text-slate-300 mx-1">·</span>
                        {m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-2.5" onClick={(e) => e.stopPropagation()}>
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono"
                        style={{ 
                          backgroundColor: `${statusColor}10`, 
                          color: statusColor, 
                          borderColor: `${statusColor}20` 
                        }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor }} />
                        {m.status === 'reschedule_requested' ? 'reschedule requested' : m.status}
                      </span>
                      
                      {(m.status === 'pending' || m.status === 'reschedule_requested') ? (
                        <button 
                          onClick={() => setSelectedMeeting(m)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedMeeting(m)}
                          className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
