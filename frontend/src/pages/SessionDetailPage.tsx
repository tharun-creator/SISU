import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import meetingsApi from '../api/meetings';
import { Meeting } from '../types/meeting';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await meetingsApi.getMeeting(parseInt(id, 10));
        setMeeting(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [id]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out details for our mentorship session: "${meeting?.title}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SISU Mentorship Session',
          text: shareText,
          url: shareUrl,
        });
        toast.show('Session shared successfully!', 'success');
      } catch (err) {
        // Fallback to clipboard if sharing is cancelled or fails
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.show('Session link copied to clipboard!', 'success');
  };

  const getLocationLabel = (comm: string | undefined) => {
    if (!comm) return 'N/A';
    if (comm.startsWith('custom_location:')) {
      return comm.replace('custom_location:', '').trim();
    }
    return comm;
  };

  if (loading) {
    return (
      <AppLayout title="Session Details">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (error || !meeting) {
    return (
      <AppLayout title="Session Details">
        <div className="max-w-3xl mx-auto text-center py-12 space-y-4">
          <div className="text-rose-500 text-lg font-bold">{error || 'Session not found'}</div>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  const dateObj = parseISO(meeting.start_time);

  return (
    <AppLayout title="Session Details">
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Navigation & Share */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Back</span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300"
          >
            <span className="material-symbols-outlined text-base text-indigo-600">share</span>
            <span>Share Session</span>
          </Button>
        </div>

        {/* Main Details Card */}
        <Card className="p-8 border border-slate-100 bg-white shadow-sm space-y-6">
          {/* Header Section */}
          <div className="border-b border-slate-100 pb-6 space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 uppercase tracking-wide">
              {meeting.meeting_type}
            </span>
            <h1 className="text-2xl font-bold font-heading text-slate-800 leading-tight">
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500 text-sm font-medium pt-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>{format(dateObj, 'eeee, MMMM d, yyyy')}</span>
              </div>
              <span className="hidden sm:inline h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>{format(dateObj, 'h:mm a')} ({meeting.duration_minutes} mins)</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left side details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold capitalize ${
                  meeting.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  meeting.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-slate-50 text-slate-500 border border-slate-100'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    meeting.status === 'approved' ? 'bg-emerald-500' :
                    meeting.status === 'pending' ? 'bg-amber-500' :
                    'bg-slate-450'
                  }`} />
                  {meeting.status}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location / Channel</h3>
                <div className="flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
                  <span className="material-symbols-outlined text-base text-slate-400">location_on</span>
                  <span>{getLocationLabel(meeting.preferred_communication)}</span>
                </div>
              </div>
            </div>

            {/* Right side participants */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Participants</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      CL
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{meeting.client_name}</div>
                      <div className="text-xs text-slate-500">{meeting.client_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      AD
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">SISU Operations Admin</div>
                      <div className="text-xs text-slate-500">ops@sisu.io</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {meeting.description && (
            <div className="border-t border-slate-100 pt-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {meeting.description}
              </p>
            </div>
          )}

          {/* Notes / Action Items Section */}
          {meeting.notes && (
            <div className="border-t border-slate-100 pt-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Notes</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {meeting.notes}
              </p>
            </div>
          )}

          {/* Connected Transcripts (Otter/Fireflies/Fathom) */}
          {(meeting.otter_notes || meeting.meet_link) && (
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notetaker & Sync Integrations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meeting.meet_link && (
                  <a
                    href={meeting.meet_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-indigo-50 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/30 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">videocam</span>
                    <div className="text-left">
                      <div className="text-xs font-bold">Google Meet Link</div>
                      <div className="text-[10px] text-indigo-500">Join virtual meeting room</div>
                    </div>
                  </a>
                )}
                {meeting.otter_notes && (
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="material-symbols-outlined text-lg text-slate-400">description</span>
                      <span className="text-xs font-bold text-slate-700">Sync Transcript (Notetaker)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                      {meeting.otter_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default SessionDetailPage;
