import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import Sidebar from '../components/Sidebar';
import { api } from '../lib/api';

const weeklyData = [
  { week: 'W1', approved: 8, rejected: 2, pending: 3 },
  { week: 'W2', approved: 12, rejected: 1, pending: 5 },
  { week: 'W3', approved: 9, rejected: 3, pending: 2 },
  { week: 'W4', approved: 15, rejected: 2, pending: 4 },
];

const trendData = [
  { month: 'Jan', meetings: 18 },
  { month: 'Feb', meetings: 24 },
  { month: 'Mar', meetings: 20 },
  { month: 'Apr', meetings: 32 },
  { month: 'May', meetings: 28 },
];

const peakData = [
  { hour: '9am', requests: 5 }, { hour: '10am', requests: 14 }, { hour: '11am', requests: 11 },
  { hour: '12pm', requests: 7 }, { hour: '1pm', requests: 4 }, { hour: '2pm', requests: 9 },
  { hour: '3pm', requests: 13 }, { hour: '4pm', requests: 8 }, { hour: '5pm', requests: 3 },
];

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name || p.dataKey}: {p.value}</p>)}
    </div>
  );
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const topMetrics = [
    { label: 'Total Meetings', value: stats.total_meetings ?? 0, icon: '📊', color: '#818cf8', delta: '+18%' },
    { label: 'Approval Rate', value: stats.approval_rate ?? '0%', icon: '✅', color: '#10b981', delta: '+4%' },
    { label: 'Avg. Response Time', value: '2.4h', icon: '⚡', color: '#f59e0b', delta: '-12%' },
    { label: 'Cancellation Rate', value: stats.cancelled_meetings ? `${((stats.cancelled_meetings / (stats.total_meetings || 1)) * 100).toFixed(1)}%` : '0%', icon: '📉', color: '#fb923c', delta: '-2%' },
  ];

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="main-content">
        <div className="ambient-bg" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Meeting trends, performance metrics, and booking insights</p>
          </div>

          {/* Top metrics */}
          <div className="grid-4" style={{ marginBottom: 28 }}>
            {topMetrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</div>
                  <span className={`stat-delta ${m.delta.startsWith('+') ? 'stat-delta-up' : 'stat-delta-down'}`}>{m.delta}</span>
                </div>
                <div className="stat-value" style={{ color: m.color }}>{loading ? '—' : m.value}</div>
                <div className="stat-label">{m.label}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Monthly trend */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Meeting Trend</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>Monthly booking volume over time</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip content={customTooltip} />
                  <Area type="monotone" dataKey="meetings" stroke="#818cf8" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Peak hours */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Peak Booking Hours</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>Request volume by hour</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={peakData} barSize={20}>
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="requests" fill="#c084fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Weekly breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Weekly Breakdown</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Approved vs rejected vs pending by week</p>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                {[{ label: 'Approved', color: '#10b981' }, { label: 'Rejected', color: '#ef4444' }, { label: 'Pending', color: '#f59e0b' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} barSize={24} barGap={4}>
                <XAxis dataKey="week" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={customTooltip} />
                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
