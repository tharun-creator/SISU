import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleSuggestion = (text: string) => {
    if (disabled) return;
    onSend(text);
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4 space-y-3">
      {/* Quick suggest chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: '💰 Pricing Info', text: 'What is your pricing?' },
          { label: '📅 List My Meetings', text: 'Check my scheduled meetings' },
          { label: '✨ Book Session', text: 'I want to book a mentorship session' },
          { label: '🔍 Check Slots', text: 'Can you show me available slots tomorrow?' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => handleSuggestion(item.text)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-body text-xs font-semibold text-slate-500 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all"
            type="button"
            disabled={disabled}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Ask about pricing, check slots, book, or reschedule sessions..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-body text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </form>
    </div>
  );
};
export default ChatInput;
