import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import notesApi, { Note } from '../api/notes';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Card from '../components/ui/Card';

export const SharedNoteView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedNote() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await notesApi.getSharedNote(token);
        setNote(data);
      } catch (err: any) {
        setError(err.message || 'Shared note not found or no longer shared.');
      } finally {
        setLoading(false);
      }
    }
    fetchSharedNote();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-body">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading shared note...</p>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <Card className="max-w-md p-8 bg-white border border-slate-200 space-y-6">
          <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
          <h2 className="font-heading text-lg font-bold text-slate-800">Unable to load note</h2>
          <p className="font-body text-sm text-slate-500 leading-relaxed">{error || 'Unknown error'}</p>
          <Link to="/login" className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-body text-xs font-bold px-5 py-2.5 shadow-sm">
            Go to Portal Login
          </Link>
        </Card>
      </div>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 sm:p-12 flex justify-center">
      <Card className="w-full max-w-3xl p-8 bg-white border border-slate-200 shadow-md flex flex-col gap-6">
        {/* Header branding */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-800">SISU</h1>
            <p className="font-body text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">Shared Executive Note</p>
          </div>
          <span className="font-mono text-xs text-slate-400 font-medium">
            Shared {note.updated_at ? formatDistanceToNow(parseISO(note.updated_at), { addSuffix: true }) : ''}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <h2 className="font-heading text-2xl font-extrabold text-slate-800 leading-tight">{note.title}</h2>
          
          {note.photo_url && (
            <div className="w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center max-h-96">
              <img 
                src={`${apiUrl}${note.photo_url}`} 
                alt="Attached visual" 
                className="max-h-96 w-full object-contain"
              />
            </div>
          )}

          <div 
            className="font-body text-sm text-slate-600 leading-relaxed prose max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: note.content || '<span class="italic text-slate-400">No text content.</span>' }}
          />
        </div>

        {/* Footer branding */}
        <div className="border-t border-slate-100 pt-6 mt-6 flex justify-between items-center text-xs font-body text-slate-400">
          <p>This note was shared via Sisu Booking System.</p>
          <Link to="/login" className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-4 py-2">
            Login to Sisu
          </Link>
        </div>
      </Card>
    </div>
  );
};
export default SharedNoteView;
