import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Note } from '../../api/notes';
import Button from '../../components/ui/Button';

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

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
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
  const editorRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Parse HTML content and extract text + todos metadata
  const { initialEditorHtml, initialTodos } = useMemo(() => {
    let html = content || '';
    let todos: TodoItem[] = [];
    const todoMatch = html.match(/<!--TODOS: (.*?)-->/);
    if (todoMatch) {
      try {
        todos = JSON.parse(todoMatch[1]);
        html = html.replace(/<!--TODOS: (.*?)-->/, '');
      } catch (e) {
        console.error('Failed to parse todos', e);
      }
    }
    return { initialEditorHtml: html, initialTodos: todos };
  }, [note?.id]); // Re-parse only when note selection changes

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState('');
  const [prevNoteId, setPrevNoteId] = useState<number | null>(null);

  // Sync editor HTML and local todos on selection of a different note
  useEffect(() => {
    if (note?.id !== prevNoteId) {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialEditorHtml || '<p><br></p>';
      }
      setTodos(initialTodos);
      setPrevNoteId(note?.id || null);
    }
  }, [note?.id, initialEditorHtml, initialTodos, prevNoteId]);

  // Serializes note editor innerHTML and list of todos together
  const triggerContentUpdate = (currentTodos: TodoItem[]) => {
    const editorHtml = editorRef.current ? editorRef.current.innerHTML : '';
    if (currentTodos.length === 0) {
      onContentChange(editorHtml);
    } else {
      onContentChange(`${editorHtml}<!--TODOS: ${JSON.stringify(currentTodos)}-->`);
    }
  };

  const handleEditorInput = () => {
    triggerContentUpdate(todos);
  };

  // Helpers to preserve text selection during prompt displays
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.getRangeAt && sel.rangeCount > 0) {
      return sel.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range | null) => {
    if (range) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  // Document formatting commands (Google Docs actions)
  const executeCmd = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorInput();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoUpload(file);
    }
  };

  // Todo Management
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) return;
    const newTodo: TodoItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: todoInput.trim(),
      done: false,
    };
    const updated = [...todos, newTodo];
    setTodos(updated);
    setTodoInput('');
    triggerContentUpdate(updated);
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTodos(updated);
    triggerContentUpdate(updated);
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    triggerContentUpdate(updated);
  };

  const todoStats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.done).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [todos]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Editor Header / Title bar */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row justify-between gap-4 items-stretch sm:items-center">
        <input
          type="text"
          placeholder="Untitled document"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 border-none bg-transparent font-heading text-lg font-black text-slate-800 focus:outline-none focus:ring-0 placeholder:text-slate-400 p-0"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={onCancel} size="sm" className="text-slate-500 hover:bg-slate-100">
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={isSaving} size="sm" className="shadow-xs">
            <span className="material-symbols-outlined text-sm mr-1.5">cloud_upload</span>
            {isSaving ? 'Saving...' : 'Save Document'}
          </Button>
        </div>
      </div>

      {/* Google Docs Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex flex-wrap gap-1 items-center sticky top-0 z-20">
        <select
          onChange={(e) => executeCmd('formatBlock', e.target.value)}
          className="text-xs font-bold font-mono text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          defaultValue="<p>"
        >
          <option value="<p>">Normal text</option>
          <option value="<h1>">Heading 1</option>
          <option value="<h2>">Heading 2</option>
          <option value="<h3>">Heading 3</option>
          <option value="<blockquote>">Quote</option>
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Text Style Buttons */}
        <button
          type="button"
          onClick={() => executeCmd('bold')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-base">format_bold</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('italic')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <span className="material-symbols-outlined text-base">format_italic</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('underline')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Underline (Ctrl+U)"
        >
          <span className="material-symbols-outlined text-base">format_underlined</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('strikeThrough')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Strikethrough"
        >
          <span className="material-symbols-outlined text-base">strikethrough_s</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Color buttons */}
        <input
          type="color"
          id="foreColorPicker"
          onChange={(e) => executeCmd('foreColor', e.target.value)}
          className="w-6 h-6 border-0 p-0 cursor-pointer rounded overflow-hidden"
          title="Text Color"
        />
        <input
          type="color"
          id="hiliteColorPicker"
          onChange={(e) => executeCmd('hiliteColor', e.target.value)}
          className="w-6 h-6 border-0 p-0 cursor-pointer rounded overflow-hidden"
          title="Highlight Color"
          defaultValue="#ffffff"
        />

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists & Indents */}
        <button
          type="button"
          onClick={() => executeCmd('insertUnorderedList')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Bulleted List"
        >
          <span className="material-symbols-outlined text-base">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('insertOrderedList')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Numbered List"
        >
          <span className="material-symbols-outlined text-base">format_list_numbered</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => executeCmd('justifyLeft')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Align Left"
        >
          <span className="material-symbols-outlined text-base">format_align_left</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('justifyCenter')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Align Center"
        >
          <span className="material-symbols-outlined text-base">format_align_center</span>
        </button>
        <button
          type="button"
          onClick={() => executeCmd('justifyRight')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Align Right"
        >
          <span className="material-symbols-outlined text-base">format_align_right</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Insert link / image */}
        <button
          type="button"
          onClick={() => {
            const savedRange = saveSelection();
            const url = window.prompt('Enter link URL:');
            if (editorRef.current) {
              editorRef.current.focus();
            }
            if (savedRange) {
              restoreSelection(savedRange);
            }
            if (url) executeCmd('createLink', url);
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Insert Link"
        >
          <span className="material-symbols-outlined text-base">link</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const savedRange = saveSelection();
            const url = window.prompt('Enter image URL:');
            if (editorRef.current) {
              editorRef.current.focus();
            }
            if (savedRange) {
              restoreSelection(savedRange);
            }
            if (url) executeCmd('insertImage', url);
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Insert Image by URL"
        >
          <span className="material-symbols-outlined text-base">image</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => executeCmd('removeFormat')}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title="Clear Formatting"
        >
          <span className="material-symbols-outlined text-base">format_clear</span>
        </button>
      </div>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Document Paper */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex justify-center bg-[#f1f5f9]/70">
          <div className="w-full max-w-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-slate-200 rounded-lg p-8 sm:p-12 min-h-[500px] flex flex-col focus-within:ring-1 focus-within:ring-indigo-150 focus-within:border-slate-305 transition-all">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              className="flex-1 outline-none text-slate-700 font-body text-sm leading-relaxed prose prose-indigo max-w-none break-words min-h-[400px]"
              placeholder="Start writing document..."
            />
          </div>
        </div>

        {/* Right Side: Integrated TODO checklist panel */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-white p-5 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <span className="material-symbols-outlined text-indigo-600 text-lg">playlist_add_check</span>
            <h4 className="font-heading text-xs font-bold text-slate-800 uppercase tracking-wider">Document Checklist</h4>
          </div>

          {/* Progress Bar */}
          {todos.length > 0 && (
            <div className="mb-4 shrink-0 space-y-1">
              <div className="flex justify-between text-[10px] font-bold font-mono text-slate-400">
                <span>Progress</span>
                <span>{todoStats.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${todoStats.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Add Todo Form */}
          <form onSubmit={handleAddTodo} className="flex gap-1.5 mb-4 shrink-0">
            <input
              type="text"
              placeholder="Add new task..."
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-body placeholder:text-slate-400 text-slate-700 bg-slate-50/50"
            />
            <button
              type="submit"
              className="w-7 h-7 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
            </button>
          </form>

          {/* Todo list items */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[250px] lg:max-h-none">
            {todos.length === 0 ? (
              <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <span className="material-symbols-outlined text-xl text-slate-350 mb-1 block">checklist</span>
                <p className="text-[10px] font-semibold">No tasks added yet.</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border transition-colors ${
                    todo.done ? 'bg-slate-50/50 border-slate-100 text-slate-400' : 'bg-slate-50/10 border-slate-200/50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo.id)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {todo.done ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                  <span className={`text-xs flex-1 break-words font-body ${todo.done ? 'line-through' : ''}`}>
                    {todo.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="shrink-0 text-slate-350 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer attachment & sharing */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Media Attachments & Sharing Options */}
        <div className="flex flex-wrap gap-6 items-center w-full md:w-auto">
          {/* Share links */}
          {note && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="share-toggle"
                  checked={isShared}
                  onChange={(e) => onShareChange(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                />
                <label htmlFor="share-toggle" className="font-body text-xs font-semibold text-slate-600 cursor-pointer">
                  Public Share Link
                </label>
              </div>
              {isShared && shareToken && (
                <Button variant="ghost" size="sm" onClick={copySharedLink} className="border border-slate-200">
                  <span className="material-symbols-outlined text-xs mr-1.5">content_copy</span>
                  Copy Link
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Delete note */}
        {note && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting} className="shrink-0 self-end md:self-auto">
            <span className="material-symbols-outlined text-sm mr-1">delete</span>
            Delete Document
          </Button>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
