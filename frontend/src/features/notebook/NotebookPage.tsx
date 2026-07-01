import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import notesApi, { Note } from '../../api/notes';
import NoteCard from './NoteCard';
import NoteEditor from './NoteEditor';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export const NotebookPage: React.FC = () => {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async (selectId: number | null = null) => {
    try {
      setLoading(true);
      const data = await notesApi.getNotes();
      setNotes(data);
      if (data.length > 0) {
        if (selectId) {
          const match = data.find(n => n.id === selectId);
          if (match) handleSelectNote(match);
        } else if (!selectedNote) {
          handleSelectNote(data[0]);
        } else {
          const match = data.find(n => n.id === selectedNote.id);
          if (match) handleSelectNote(match);
        }
      } else {
        clearEditor();
      }
    } catch {
      toast.show('Failed to retrieve notebook notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setPhotoUrl(note.photo_url || '');
    setIsShared(note.is_shared || false);
    setShareToken(note.share_token || '');
  };

  const clearEditor = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setPhotoUrl('');
    setIsShared(false);
    setShareToken('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.show('Note title is required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      if (selectedNote) {
        await notesApi.updateNote(selectedNote.id, { title, content });
        toast.show('Note saved successfully.', 'success');
        await fetchNotes(selectedNote.id);
      } else {
        const created = await notesApi.createNote({ title, content });
        toast.show('Note created successfully.', 'success');
        await fetchNotes(created.id);
      }
    } catch (err: any) {
      toast.show(err.message || 'Failed to save note.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm('Delete this notebook note?')) return;
    setIsDeleting(true);
    try {
      await notesApi.deleteNote(selectedNote.id);
      toast.show('Note deleted successfully.', 'success');
      clearEditor();
      await fetchNotes();
    } catch {
      toast.show('Failed to delete note.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!selectedNote) return;
    setIsUploading(true);
    try {
      const res = await notesApi.uploadNotePhoto(selectedNote.id, file);
      setPhotoUrl(res.photo_url || '');
      toast.show('Photo uploaded successfully.', 'success');
      await fetchNotes(selectedNote.id);
    } catch {
      toast.show('Photo upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!selectedNote) return;
    setIsUploading(true);
    try {
      await notesApi.deleteNotePhoto(selectedNote.id);
      setPhotoUrl('');
      toast.show('Photo removed.', 'success');
      await fetchNotes(selectedNote.id);
    } catch {
      toast.show('Failed to remove photo.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleShareChange = async (shared: boolean) => {
    if (!selectedNote) return;
    setIsShared(shared);
    try {
      await notesApi.updateNote(selectedNote.id, { title, content });
      await fetchNotes(selectedNote.id);
    } catch {
      toast.show('Failed to update sharing settings.', 'error');
    }
  };

  const copySharedLink = () => {
    if (!shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/notes/shared/${shareToken}`);
    toast.show('Share link copied to clipboard!', 'success');
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout title="Executive Notebook">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-10rem)]">
        {/* Sidebar Notes list */}
        <div className="flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <button
              onClick={clearEditor}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 font-body text-xs font-bold text-white shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Note</span>
            </button>
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && notes.length === 0 ? (
              <div className="space-y-2">
                <div className="h-14 w-full bg-slate-50 animate-pulse rounded-xl" />
                <div className="h-14 w-full bg-slate-50 animate-pulse rounded-xl" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <p className="text-slate-400 font-body text-xs italic text-center py-8">No notes found.</p>
            ) : (
              filteredNotes.map(n => (
                <NoteCard
                  key={n.id}
                  note={n}
                  isSelected={selectedNote?.id === n.id}
                  onClick={() => handleSelectNote(n)}
                />
              ))
            )}
          </div>
        </div>

        {/* Editor workspace */}
        <div className="h-full">
          <NoteEditor
            note={selectedNote}
            title={title}
            content={content}
            photoUrl={photoUrl}
            isShared={isShared}
            shareToken={shareToken}
            isSaving={isSaving}
            isUploading={isUploading}
            isDeleting={isDeleting}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onPhotoUpload={handlePhotoUpload}
            onRemovePhoto={handleRemovePhoto}
            onShareChange={handleShareChange}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={clearEditor}
            copySharedLink={copySharedLink}
          />
        </div>
      </div>
    </AppLayout>
  );
};
export default NotebookPage;
