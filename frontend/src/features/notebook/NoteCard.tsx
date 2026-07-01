import React from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Note } from '../../api/notes';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, isSelected, onClick }) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border ${
        isSelected 
          ? 'bg-indigo-50/50 border-indigo-200' 
          : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10'
      }`}
    >
      <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
        {note.photo_url ? (
          <img 
            src={`${apiUrl}${note.photo_url}`} 
            alt={note.title} 
            className="w-10 h-10 object-cover"
          />
        ) : (
          <span className="material-symbols-outlined text-slate-400 text-lg">description</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="font-heading text-xs font-bold text-slate-800 truncate">{note.title}</h4>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className="font-body text-[9px] text-slate-400 font-medium">
            {note.updated_at ? formatDistanceToNow(parseISO(note.updated_at), { addSuffix: true }) : ''}
          </span>
          {note.is_shared && (
            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[8px] font-bold text-emerald-700">Shared</span>
          )}
        </div>
      </div>
    </div>
  );
};
export default NoteCard;
