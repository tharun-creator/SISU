import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; colorClass: string; bgClass: string }> = {
  booking_received: { icon: 'calendar_today', colorClass: 'text-indigo-600', bgClass: 'bg-indigo-50' },
  approved: { icon: 'check_circle', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  rejected: { icon: 'close', colorClass: 'text-rose-600', bgClass: 'bg-rose-50' },
  rescheduled: { icon: 'update', colorClass: 'text-sky-600', bgClass: 'bg-sky-50' },
  cancelled: { icon: 'close', colorClass: 'text-slate-500', bgClass: 'bg-slate-100' },
  reminder: { icon: 'schedule', colorClass: 'text-amber-600', bgClass: 'bg-amber-50' },
};

export const NotificationsPage: React.FC = () => {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await client.get<any, Notification[]>('/notifications');
      setNotifications(data);
    } catch {
      toast.show('Failed to fetch notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await client.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      toast.show('Failed to mark notification read', 'error');
    }
  };

  const handleMarkAll = async () => {
    try {
      await client.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.show('All notifications marked read', 'success');
    } catch {
      toast.show('Action failed', 'error');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout title="Notifications" notifCount={unreadCount}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-800">Notifications</h1>
            <p className="font-body text-xs text-slate-400 mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification(s).` : 'Your inbox is clear.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAll}>
              Mark All Read
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
              <div className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No Notifications"
              description="Confirmations and reschedule requests will appear here."
              icon="notifications_off"
            />
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || { icon: 'notifications', colorClass: 'text-indigo-600', bgClass: 'bg-indigo-50' };
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    n.is_read 
                      ? 'bg-white border-slate-100 hover:border-indigo-100' 
                      : 'bg-indigo-50/20 border-indigo-100 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bgClass} ${cfg.colorClass}`}>
                    <span className="material-symbols-outlined text-xl">{cfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0 font-body text-xs space-y-1">
                    <p className={`text-slate-800 font-heading text-sm ${n.is_read ? 'font-semibold' : 'font-bold'}`}>
                      {n.title}
                    </p>
                    <p className="text-slate-500 leading-relaxed">{n.message}</p>
                    <p className="text-slate-400 font-mono text-[10px] pt-1">
                      {n.created_at ? formatDistanceToNow(parseISO(n.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};
export default NotificationsPage;
