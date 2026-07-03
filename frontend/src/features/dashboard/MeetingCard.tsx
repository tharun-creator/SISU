import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Meeting } from '../../types/meeting';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from './StatusBadge';

export const STATUS_HELPER_CONFIG: Record<string, { text: string; bg: string; border: string; color: string; icon: string }> = {
  approved: {
    text: "Your session is officially confirmed. A calendar invite and verification email have been dispatched to your inbox.",
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
    color: 'text-emerald-700',
    icon: 'mail_outline'
  },
  rescheduled: {
    text: "This session has been successfully rescheduled. A revised calendar confirmation has been sent to your inbox.",
    bg: 'bg-sky-50/50',
    border: 'border-sky-100',
    color: 'text-sky-700',
    icon: 'update'
  },
  pending: {
    text: "Your scheduling request is awaiting review. Our operations team will verify details and approve your slot shortly.",
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    color: 'text-amber-700',
    icon: 'pending'
  },
  reschedule_requested: {
    text: "A reschedule request for this session is pending review. We will notify you once the new slot is approved.",
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    color: 'text-amber-700',
    icon: 'history'
  },
  reschedule_proposed: {
    text: "The admin has proposed a new date and time for this session. Review details below to Accept & Block or call to negotiate.",
    bg: 'bg-amber-50/50',
    border: 'border-amber-200',
    color: 'text-amber-700',
    icon: 'pending'
  },
  cancelled: {
    text: "This session has been cancelled. Please schedule a new slot if you would like to reconnect.",
    bg: 'bg-slate-50',
    border: 'border-slate-100',
    color: 'text-slate-500',
    icon: 'cancel'
  },
  rejected: {
    text: "This request could not be accommodated due to schedule conflicts. Please select an alternative slot.",
    bg: 'bg-rose-50/50',
    border: 'border-rose-100',
    color: 'text-rose-700',
    icon: 'block'
  },
  completed: {
    text: "This session is marked as completed. Follow-up action items have been synchronized to your Outbound Roadmap.",
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-100',
    color: 'text-indigo-700',
    icon: 'task_alt'
  }
};

interface MeetingCardProps {
  meeting: Meeting;
  onCancel: (id: number) => void;
  onReschedule: (meeting: Meeting) => void;
  onAcceptReschedule: (id: number) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onCancel, onReschedule, onAcceptReschedule }) => {
  const statusLower = meeting.status.toLowerCase();
  const helper = STATUS_HELPER_CONFIG[statusLower];
  const dateObj = parseISO(meeting.start_time);
  
  const showCancelBtn = ['pending', 'approved', 'rescheduled', 'reschedule_proposed'].includes(statusLower);
  const showRescheduleBtn = ['pending', 'approved', 'rescheduled'].includes(statusLower);
  const showAcceptBtn = statusLower === 'reschedule_proposed';

  return (
    <Card className="p-6 transition-all hover:shadow-md border border-slate-100 bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/session/${meeting.id}`} className="hover:text-indigo-600 transition-colors">
              <h3 className="font-heading text-lg font-bold">{meeting.title}</h3>
            </Link>
            <StatusBadge status={meeting.status} />
          </div>
          <p className="font-body text-xs font-semibold text-slate-400 uppercase tracking-wider">{meeting.meeting_type}</p>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-body text-sm font-medium">
          <span className="material-symbols-outlined text-lg">calendar_today</span>
          <span>{format(dateObj, 'eeee, MMMM d, yyyy')}</span>
          <span className="mx-1 h-3 w-px bg-slate-200" />
          <span className="material-symbols-outlined text-lg">schedule</span>
          <span>{format(dateObj, 'h:mm a')} ({meeting.duration_minutes} mins)</span>
        </div>
      </div>

      {meeting.description && (
        <p className="font-body text-sm text-slate-600 mt-3 border-l-2 border-slate-200 pl-3 italic">
          {meeting.description}
        </p>
      )}

      {/* Status Helper Notice */}
      {helper && (
        <div className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-body leading-relaxed ${helper.bg} ${helper.border} ${helper.color}`}>
          <span className="material-symbols-outlined shrink-0 text-base">{helper.icon}</span>
          <p>{helper.text}</p>
        </div>
      )}

      {meeting.admin_notes && (
        <div className="mt-3.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 text-xs leading-relaxed text-slate-700">
          <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block mb-1">Admin Remarks / Notes</span>
          <p className="font-medium text-slate-600">{meeting.admin_notes}</p>
        </div>
      )}

      {/* Meeting actions & Join buttons */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-4">
        <div className="flex items-center gap-2">
          {meeting.preferred_communication === 'video' && meeting.status === 'approved' && (
            <a 
              href="https://meet.google.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-body text-xs font-bold text-white shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-base">video_call</span>
              <span>Join Google Meet</span>
            </a>
          )}
          {meeting.preferred_communication?.startsWith('custom_location:') && (
            <div className="flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
              <span className="material-symbols-outlined text-base text-slate-400">location_on</span>
              <span>Location: {meeting.preferred_communication.replace('custom_location:', '').trim()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const url = `${window.location.origin}/session/${meeting.id}`;
              if (navigator.share) {
                try {
                  await navigator.share({ title: 'SISU Session', text: meeting.title, url });
                } catch {
                  navigator.clipboard.writeText(url);
                }
              } else {
                navigator.clipboard.writeText(url);
              }
            }}
            title="Copy Session Link"
            className="flex items-center gap-1 text-slate-500"
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>Share</span>
          </Button>

          <Link to={`/session/${meeting.id}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-indigo-600">
              <span className="material-symbols-outlined text-base">visibility</span>
              <span>View</span>
            </Button>
          </Link>

          {showAcceptBtn && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => onAcceptReschedule(meeting.id)}
            >
              Accept Proposed Time
            </Button>
          )}
          {showRescheduleBtn && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onReschedule(meeting)}
            >
              Reschedule
            </Button>
          )}
          {showCancelBtn && (
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => onCancel(meeting.id)}
            >
              Cancel Session
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
export default MeetingCard;
