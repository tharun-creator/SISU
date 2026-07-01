import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { session_date: string; session_type: string; discussed_items: string[]; action_items: { id: string; text: string; completed: boolean }[] }) => Promise<void>;
}

export const SessionLogModal: React.FC<SessionLogModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 16));
  const [sessionType, setSessionType] = useState('60 min mentorship');
  
  // Discussed items list
  const [discussedInput, setDiscussedInput] = useState('');
  const [discussedItems, setDiscussedItems] = useState<string[]>([]);
  
  // Action items list
  const [actionInput, setActionInput] = useState('');
  const [actionItems, setActionItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addDiscussedItem = () => {
    if (discussedInput.trim()) {
      setDiscussedItems([...discussedItems, discussedInput.trim()]);
      setDiscussedInput('');
    }
  };

  const removeDiscussedItem = (index: number) => {
    setDiscussedItems(discussedItems.filter((_, idx) => idx !== index));
  };

  const addActionItem = () => {
    if (actionInput.trim()) {
      const newItem = {
        id: Math.random().toString(36).substring(2, 9),
        text: actionInput.trim(),
        completed: false
      };
      setActionItems([...actionItems, newItem]);
      setActionInput('');
    }
  };

  const removeActionItem = (id: string) => {
    setActionItems(actionItems.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (discussedItems.length === 0 && actionItems.length === 0) {
      setError('Please add at least one discussed point or action item to save.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        session_date: new Date(sessionDate).toISOString(),
        session_type: sessionType,
        discussed_items: discussedItems,
        action_items: actionItems
      });
      // Reset form
      setDiscussedItems([]);
      setActionItems([]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create session log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Mentorship Session">
      <form onSubmit={handleSubmit} className="space-y-5 font-body">
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Session Date & Time *"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 focus:border-indigo-600 focus:outline-none"
            >
              <option value="60 min mentorship">60 Min Mentorship</option>
              <option value="30 min strategy">30 Min Strategy</option>
              <option value="90 min audit">90 Min Playbook Audit</option>
              <option value="120 min custom">120 Min Board Session</option>
            </select>
          </div>
        </div>

        {/* Discussed Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            What was discussed?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Series A pitch deck structure"
              value={discussedInput}
              onChange={(e) => setDiscussedInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            <Button type="button" onClick={addDiscussedItem} variant="ghost" size="sm">
              Add Point
            </Button>
          </div>
          {discussedItems.length > 0 && (
            <ul className="space-y-1.5 border border-slate-100 bg-slate-50/50 rounded-xl p-3 max-h-40 overflow-y-auto">
              {discussedItems.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-xs text-slate-600 p-1.5 hover:bg-white rounded-lg transition-colors">
                  <span className="flex-1 mr-2">{item}</span>
                  <button type="button" onClick={() => removeDiscussedItem(index)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Items Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Action Items / Todos
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Reach out to 3 warm investor leads"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            <Button type="button" onClick={addActionItem} variant="ghost" size="sm">
              Add Todo
            </Button>
          </div>
          {actionItems.length > 0 && (
            <ul className="space-y-1.5 border border-slate-100 bg-slate-50/50 rounded-xl p-3 max-h-40 overflow-y-auto">
              {actionItems.map((item) => (
                <li key={item.id} className="flex justify-between items-center text-xs text-slate-600 p-1.5 hover:bg-white rounded-lg transition-colors">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        setActionItems(actionItems.map(ai => ai.id === item.id ? { ...ai, completed: e.target.checked } : ai));
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={item.completed ? 'text-slate-400 line-through' : ''}>{item.text}</span>
                  </label>
                  <button type="button" onClick={() => removeActionItem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Logging...' : 'Save Logged Session'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default SessionLogModal;
