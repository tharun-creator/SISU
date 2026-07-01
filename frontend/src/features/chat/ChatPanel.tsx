import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useChat } from '../../hooks/useChat';
import meetingsApi from '../../api/meetings';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatBookingForm, { BookingFormState } from './ChatBookingForm';
import CalendarWidget from './CalendarWidget';

interface ChatPanelProps {
  onMeetingBooked?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onMeetingBooked }) => {
  const { user } = useAuth();
  const { messages, isAiTyping, chatRef, sendMessage, addMessage } = useChat();

  const [form, setForm] = useState<BookingFormState>({
    agenda: '',
    date: null,
    slot: null,
    communicationType: 'video',
    phone: user?.phone || '',
    priority: 'normal',
    description: ''
  });

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync phone from user when user is loaded
  useEffect(() => {
    if (user && user.phone) {
      const userPhone = user.phone;
      setForm(prev => ({ ...prev, phone: userPhone }));
    }
  }, [user]);

  // Load slots when date changes
  useEffect(() => {
    if (form.date) {
      const loadSlots = async () => {
        setLoadingSlots(true);
        try {
          const dateStr = `${form.date!.year}-${String(form.date!.month + 1).padStart(2, '0')}-${String(form.date!.day).padStart(2, '0')}`;
          const slots = await meetingsApi.getFreeSlots(dateStr, 60);
          setAvailableSlots(slots);
        } catch {
          // Fallback slots
          const mock = [];
          const base = new Date(form.date!.year, form.date!.month, form.date!.day, 11, 0);
          for (let i = 0; i < 8; i++) {
            const start = new Date(base.getTime() + i * 60 * 60 * 1000);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            mock.push({
              label: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST`,
              start: start.toTimeString().slice(0, 5),
              end: end.toTimeString().slice(0, 5)
            });
          }
          setAvailableSlots(mock);
        } finally {
          setLoadingSlots(false);
        }
      };
      loadSlots();
    }
  }, [form.date]);

  const handleSend = (text: string) => {
    sendMessage(text, (agenda) => setForm(prev => ({ ...prev, agenda })));
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    const formatted = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    setForm(prev => ({ ...prev, date: { year, month, day }, slot: null }));
    addMessage('ai', `Selected date: ${formatted}. Feel free to pick a time slot from the list on the right, or ask me directly to book it for you!`);
  };

  const handleSlotSelect = (slot: any) => {
    setForm(prev => ({ ...prev, slot }));
    addMessage('ai', `Drafted time slot: ${slot.label}. You can review and confirm your booking on the right panel, or ask me directly to book it!`);
  };

  const submitForm = async () => {
    if (!form.agenda.trim()) {
      addMessage('ai', "Please enter an Agenda or Topic for the meeting in the right card so we know what to prepare!");
      return;
    }
    if (form.agenda.trim().length > 50) {
      addMessage('ai', `⚠️ The meeting agenda exceeds the 50-character limit. Please keep it to 50 characters or less.`);
      return;
    }
    if (!form.date || !form.slot) {
      addMessage('ai', "Please pick a date and time slot from the scheduling calendar!");
      return;
    }

    setSubmitting(true);
    const startStr = `${form.date.year}-${String(form.date.month + 1).padStart(2, '0')}-${String(form.date.day).padStart(2, '0')}T${form.slot.start}:00`;
    const endStr = `${form.date.year}-${String(form.date.month + 1).padStart(2, '0')}-${String(form.date.day).padStart(2, '0')}T${form.slot.end}:00`;

    try {
      await meetingsApi.createMeeting({
        title: form.agenda,
        description: form.description || 'Booked via conversational concierge',
        reason: `Conversational booking. Phone: ${form.phone || 'N/A'}. Priority: ${form.priority.toUpperCase()}`,
        meeting_type: 'Mentorship Session',
        priority: form.priority,
        start_time: startStr,
        end_time: endStr,
        duration_minutes: 60,
        preferred_communication: form.communicationType,
        phone: form.phone
      });

      addMessage('ai', `🎉 Success! Your mentorship session '${form.agenda}' has been successfully requested! Tharun will review and sync your calendar.`);
      if (onMeetingBooked) onMeetingBooked();
      setForm({
        agenda: '',
        date: null,
        slot: null,
        communicationType: 'video',
        phone: user?.phone || '',
        priority: 'normal',
        description: ''
      });
    } catch (err: any) {
      addMessage('ai', `⚠️ Failed to save booking: ${err.message || 'Time slot already taken or conflict detected.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-slate-50">
      {/* Left Chat Screen */}
      <div className="w-full lg:w-[45%] flex flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4 bg-slate-50/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-heading text-white shadow-md">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-slate-800">SISU AI Booking Guide</p>
            <span className="flex items-center gap-1.5 font-body text-[10px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> LiveGuided Concierge
            </span>
          </div>
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} user={user} />
          ))}
          {isAiTyping && (
            <div className="flex gap-3 max-w-[85%] self-start">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-tl-none flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce delay-75" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce delay-150" />
              </div>
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isAiTyping} />
      </div>

      {/* Right Planner Screen */}
      <div className="w-full lg:w-[55%] flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
        <ChatBookingForm
          formState={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSubmit={submitForm}
          isSubmitting={submitting}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <CalendarWidget onDateSelect={handleDateSelect} selectedDate={form.date} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
            <p className="font-heading text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
              {form.date ? `Slots for ${new Date(form.date.year, form.date.month, form.date.day).toLocaleDateString()}` : 'Select a date'}
            </p>
            {loadingSlots ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="font-body text-xs font-semibold">Syncing free slots...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-slate-400 font-body text-xs italic text-center py-12">No slots available on this date.</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                {availableSlots.map(slot => {
                  const isSelected = form.slot?.label === slot.label;
                  return (
                    <button
                      key={slot.label}
                      onClick={() => handleSlotSelect(slot)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-body font-semibold transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold' 
                          : 'border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/20 text-slate-600 bg-slate-50'
                      }`}
                      type="button"
                    >
                      <span>{slot.label}</span>
                      <span>→</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChatPanel;
