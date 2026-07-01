import React, { useRef } from 'react';
import { Note } from '../../api/notes';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface NoteEditorProps {
  note: Note | null;
  title: string;
  content: string;
  photoUrl: string;
  isShared: boolean;
  shareToken: string;
  isSaving: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onPhotoUpload: (file: File) => void;
  onRemovePhoto: () => void;
  onShareChange: (shared: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  copySharedLink: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  title,
  content,
  photoUrl,
  isShared,
  shareToken,
  isSaving,
  isUploading,
  isDeleting,
  onTitleChange,
  onContentChange,
  onPhotoUpload,
  onRemovePhoto,
  onShareChange,
  onSave,
  onDelete,
  onCancel,
  copySharedLink,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoUpload(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Title */}
      <input
        type="text"
        placeholder="Note Title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full border-b border-slate-200 bg-transparent pb-2 font-heading text-xl font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
      />

      {/* Note Content Textarea */}
      <textarea
        placeholder="Type your notes here..."
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className="flex-1 w-full bg-transparent font-body text-sm text-slate-600 placeholder-slate-400 focus:outline-none resize-none leading-relaxed min-h-[150px]"
      />

      {/* Media Attachments */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h5 className="font-heading text-xs font-bold text-slate-800">Media Attachment</h5>
        {photoUrl ? (
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
              <img src={`${apiUrl}${photoUrl}`} alt="Attached" className="h-full w-full object-cover" />
            </div>
            <Button variant="danger" size="sm" onClick={onRemovePhoto} disabled={isUploading}>
              <span className="material-symbols-outlined text-xs mr-1">delete</span>
              Remove Photo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => note && fileInputRef.current?.click()}
              disabled={!note || isUploading}
              className={`flex items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-xs font-semibold ${
                note 
                  ? 'border-indigo-200 text-indigo-600 bg-indigo-50/20 hover:border-indigo-400' 
                  : 'border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
              <span>{isUploading ? 'Uploading...' : 'Attach Photo'}</span>
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {!note && (
              <p className="font-body text-[10px] text-slate-400 mt-1">Save the note first to attach photos.</p>
            )}
          </div>
        )}
      </div>

      {/* Link Sharing */}
      {note && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h5 className="font-heading text-xs font-bold text-slate-800">Public Sharing Options</h5>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="share-toggle"
              checked={isShared}
              onChange={(e) => onShareChange(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
            />
            <label htmlFor="share-toggle" className="font-body text-xs font-semibold text-slate-600 cursor-pointer">
              Enable Public Link Sharing
            </label>
          </div>

          {isShared && shareToken && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/10 p-2 w-full font-body text-xs">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/notes/shared/${shareToken}`}
                className="flex-1 bg-transparent text-indigo-600 font-mono focus:outline-none"
              />
              <Button variant="ghost" size="sm" onClick={copySharedLink}>
                <span className="material-symbols-outlined text-xs mr-1">content_copy</span>
                Copy Link
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Save / Delete / Cancel Actions */}
      <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
        <div>
          {note && (
            <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting}>
              <span className="material-symbols-outlined text-sm mr-1">delete</span>
              Delete Note
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {note && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button variant="primary" onClick={onSave} disabled={isSaving}>
            <span className="material-symbols-outlined text-sm mr-1">save</span>
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default NoteEditor;
