import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';


export default function Chat({ onMeetingBooked }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! I'm your SISU Booking & Support Assistant. I can answer questions about our mentorship program and pricing, list your scheduled sessions, or book, reschedule, and cancel meetings for you directly. What can I do for you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Interactive Booking Form state (filled dynamically via Chat or UI interaction)
  const [form, setForm] = useState({
    agenda: '',
    date: null, // { year, month, day }
    slot: null, // { label, start, end }
    communicationType: 'video', // 'video' (online) or 'in_person'
    phone: user?.phone || '',
    priority: 'normal', // 'low', 'normal', 'high'
    description: ''
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const chatRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping, form]);

  // Load slots when date changes
  useEffect(() => {
    if (form.date) {
      loadSlotsForDate(form.date);
    }
  }, [form.date]);

  const loadSlotsForDate = async (d) => {
    setLoadingSlots(true);
    try {
      const dateStr = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const slots = await api.getFreeSlots(dateStr, 60);
      setAvailableSlots(slots);
    } catch {
      // Fallback slots if network error
      const mock = [];
      const base = new Date(d.year, d.month, d.day, 9, 0);
      for (let i = 0; i < 8; i++) {
        const start = new Date(base.getTime() + i * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        mock.push({
          label: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          start: start.toTimeString().slice(0, 5),
          end: end.toTimeString().slice(0, 5)
        });
      }
      setAvailableSlots(mock);
    } finally {
      setLoadingSlots(false);
    }
  };

  const addMsg = (sender, text) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Process free text input and run cognitive assistant
  const handleSend = async (customText = null) => {
    const text = (customText || input).trim();
    if (!text) return;
    if (!customText) setInput('');

    // Add user message
    addMsg('user', text);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await api.chat(text, history);
      setIsTyping(false);
      addMsg('ai', res.response || "I am here to guide you with booking slots and RATS scaling strategies!");
      
      // If a meeting was successfully updated/created in chat, trigger update to re-fetch on parent
      if (res.response && (
        res.response.includes('successfully requested') || 
        res.response.includes('successfully requested') || 
        res.response.includes('successfully requested') || 
        res.response.includes('successfully requested') || 
        res.response.includes('successfully requested') || 
        res.response.includes('successfully requested') || 
        res.response.includes('successfully') || 
        res.response.includes('cancelled') || 
        res.response.includes('rescheduled')
      )) {
        if (onMeetingBooked) onMeetingBooked();
      }
    } catch (err) {
      setIsTyping(false);
      addMsg('ai', "I'm having trouble connecting to my cognitive services. Feel free to click on the calendar slots on the right to instantly request a call!");
    }
  };

  // Handle right-side UI interactions and dynamically update AI conversation!
  const selectDateFromCalendar = (year, month, day) => {
    const formatted = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    setForm(prev => ({ ...prev, date: { year, month, day }, slot: null }));
    addMsg('ai', `Selected date: ${formatted}. Feel free to pick a time slot from the list on the right, or ask me directly to book it for you!`);
  };

  const selectSlotFromCalendar = (slot) => {
    setForm(prev => ({ ...prev, slot }));
    addMsg('ai', `Drafted time slot: ${slot.label}. You can review and confirm your booking on the right panel, or ask me directly to book it!`);
  };

  const submitFormDirectly = async () => {
    if (!form.agenda) {
      addMsg('ai', "Please enter an Agenda or Topic for the meeting in the right card so we know what to prepare!");
      return;
    }
    if (!form.date || !form.slot) {
      addMsg('ai', "Please pick a date and time slot from the scheduling calendar!");
      return;
    }

    setIsTyping(true);
    const startStr = `${form.date.year}-${String(form.date.month + 1).padStart(2, '0')}-${String(form.date.day).padStart(2, '0')}T${form.slot.start}:00`;
    const endStr = `${form.date.year}-${String(form.date.month + 1).padStart(2, '0')}-${String(form.date.day).padStart(2, '0')}T${form.slot.end}:00`;

    try {
      await api.createMeeting({
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

      addMsg('ai', `🎉 Success! Your mentorship session '${form.agenda}' has been successfully requested for ${form.slot.label} on ${new Date(form.date.year, form.date.month, form.date.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}! You will receive an instant email notification once Tharun reviews and approves the slot.`);
      if (onMeetingBooked) onMeetingBooked();
      
      // Reset form
      setForm({
        agenda: '',
        date: null,
        slot: null,
        communicationType: 'video',
        phone: user?.phone || '',
        priority: 'normal',
        description: ''
      });

    } catch (err) {
      addMsg('ai', `⚠️ Failed to save booking: ${err.message || 'Time slot already taken or conflict detected.'}`);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-split-container">
      {/* Left Chat Screen: Guided Conversational Helper */}
      <div className="chat-left-pane">
        {/* Assistant Header */}
        <div className="pane-header">
          <div className="ai-badge">
            <span className="material-symbols-outlined icon">smart_toy</span>
          </div>
          <div>
            <p className="title">SISU AI Booking Guide</p>
            <div className="subtitle-row">
              <span className="dot active" />
              <span className="subtitle">Live Guided Concierge</span>
            </div>
          </div>
          {form.agenda && (
            <span className="live-fill-badge">Filling Live...</span>
          )}
        </div>

        {/* Messages Body */}
        <div ref={chatRef} className="chat-messages-box">
          {messages.map((msg) => (
            <div key={msg.id} className={`msg-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
              <div className="avatar">
                {msg.sender === 'user' ? (
                  <span className="avatar-initial">{user?.name?.[0] || 'U'}</span>
                ) : (
                  <span className="material-symbols-outlined av-icon">smart_toy</span>
                )}
              </div>
              <div className="bubble-wrapper">
                <div className="bubble">{msg.text}</div>
                <span className="time">{msg.time}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="msg-row ai-row">
              <div className="avatar">
                <span className="material-symbols-outlined av-icon">smart_toy</span>
              </div>
              <div className="bubble typing-bubble">
                <span className="dot-pulse" />
                <span className="dot-pulse" />
                <span className="dot-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="chat-input-footer">
          <div className="quick-buttons">
            <button className="q-btn" onClick={() => handleSend("What is your pricing?")}>💰 Pricing Info</button>
            <button className="q-btn" onClick={() => handleSend("Check my scheduled meetings")}>📅 List My Meetings</button>
            <button className="q-btn" onClick={() => handleSend("I want to book a mentorship session")}>✨ Book Session</button>
            <button className="q-btn" onClick={() => handleSend("Can you show me available slots tomorrow?")}>🔍 Check Slots</button>
          </div>
          <div className="input-bar">
            <input
              type="text"
              placeholder="Ask about pricing, check slots, book, or reschedule sessions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Screen: Fatima Sy Inspired Premium Calendly Interactive Board */}
      <div className="chat-right-pane">
        <div className="board-header">
          <p className="board-title">FATIMA SY CLIENT CHECK-IN</p>
          <p className="board-subtitle">Interactive Real-time Planner</p>
        </div>

        <div className="board-body">
          {/* Top Live Progress / Sync Card */}
          <div className="sync-progress-card">
            <div className="sync-header">
              <span className="material-symbols-outlined icon">sync</span>
              <p className="sync-title">Live Booking Draft Summary</p>
            </div>
            
            <div className="draft-grid">
              <div className="draft-item">
                <span className="label">1. Agenda Topic</span>
                <span className="val">{form.agenda ? `"${form.agenda}"` : <span className="placeholder">Awaiting input...</span>}</span>
              </div>
              <div className="draft-item">
                <span className="label">2. Date & Time</span>
                <span className="val">
                  {form.date && form.slot ? (
                    <span className="highlight-val">
                      {new Date(form.date.year, form.date.month, form.date.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {form.slot.label}
                    </span>
                  ) : <span className="placeholder">Awaiting calendar click...</span>}
                </span>
              </div>
              <div className="draft-item">
                <span className="label">3. Meet Type</span>
                <span className="val" style={{ textTransform: 'capitalize' }}>
                  {form.communicationType === 'video' ? '📹 Online Google Meet' : '🏢 In-Person Office Meet'}
                </span>
              </div>
              <div className="draft-item">
                <span className="label">4. Phone No</span>
                <input
                  type="tel"
                  className="draft-input-phone"
                  placeholder="Enter phone..."
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="draft-item">
                <span className="label">5. Priority</span>
                <span className={`val badge-${form.priority}`}>{form.priority.toUpperCase()}</span>
              </div>
            </div>

            {form.agenda && form.date && form.slot && (
              <motion.button
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="confirm-booking-btn"
                onClick={submitFormDirectly}
              >
                <span className="material-symbols-outlined">check_circle</span> Confirm & Book Slot
              </motion.button>
            )}
          </div>

          {/* Side-by-side Calendar + Time Slots view */}
          <div className="scheduler-split">
            {/* Inline Mini-Calendar (Fatima Sy style) */}
            <div className="calendar-box">
              <CalendarWidget onDateSelect={selectDateFromCalendar} selectedDate={form.date} />
            </div>

            {/* Time Slot List (Fatima Sy style) */}
            <div className="slots-box">
              <p className="slots-title">
                {form.date ? `Slots for ${new Date(form.date.year, form.date.month, form.date.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Choose a date first'}
              </p>
              
              {loadingSlots ? (
                <div className="loading-slots">
                  <span className="spinner" />
                  <p>Syncing slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="no-slots-msg">No slots available. Try selecting another date on the calendar.</p>
              ) : (
                <div className="slots-list">
                  {availableSlots.map((slot) => {
                    const isSelected = form.slot?.label === slot.label;
                    return (
                      <button
                        key={slot.label}
                        onClick={() => selectSlotFromCalendar(slot)}
                        className={`slot-chip-btn ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="time-text">{slot.label}</span>
                        {isSelected ? (
                          <span className="confirm-badge">Selected</span>
                        ) : (
                          <span className="select-arrow">→</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .draft-input-phone {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #1F2232;
          border-radius: 6px;
          color: white;
          padding: 4px 8px;
          font-size: 12px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .draft-input-phone:focus {
          border-color: #6C63FF;
          background: rgba(108, 99, 255, 0.08);
        }

        .chat-split-container {
          display: flex;
          height: calc(100vh - 65px);
          background: #0D0E15;
          font-family: 'Inter', sans-serif;
          color: #E2E8F0;
        }

        .chat-left-pane {
          width: 45%;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1F2232;
          background: #0E0F19;
        }

        .chat-right-pane {
          width: 55%;
          display: flex;
          flex-direction: column;
          background: #0A0A10;
        }

        .pane-header {
          padding: 16px 24px;
          border-bottom: 1px solid #1F2232;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #0D0E17;
        }

        .ai-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6C63FF, #00C2FF);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(108, 99, 255, 0.25);
        }

        .ai-badge .icon {
          color: white;
          font-size: 22px;
        }

        .pane-header .title {
          font-weight: 700;
          font-size: 15px;
          color: #FFFFFF;
          margin: 0;
        }

        .subtitle-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .subtitle-row .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .subtitle-row .dot.active {
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
        }

        .subtitle-row .subtitle {
          font-size: 11px;
          color: #8A91A5;
        }

        .live-fill-badge {
          margin-left: auto;
          font-size: 11px;
          font-weight: 600;
          color: #6C63FF;
          background: rgba(108, 99, 255, 0.12);
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid rgba(108, 99, 255, 0.2);
          animation: pulse 2s infinite;
        }

        .chat-messages-box {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .msg-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          max-width: 85%;
        }

        .msg-row.user-row {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .msg-row.ai-row {
          align-self: flex-start;
        }

        .msg-row .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .msg-row.user-row .avatar {
          background: linear-gradient(135deg, #6C63FF, #00C2FF);
        }

        .msg-row.ai-row .avatar {
          background: #1E1F30;
          border: 1px solid #2B2D42;
        }

        .avatar-initial {
          color: white;
          font-weight: 700;
          font-size: 13px;
        }

        .av-icon {
          font-size: 18px;
          color: #8A91A5;
        }

        .bubble-wrapper {
          display: flex;
          flex-direction: column;
        }

        .msg-row.user-row .bubble-wrapper {
          align-items: flex-end;
        }

        .msg-row.ai-row .bubble-wrapper {
          align-items: flex-start;
        }

        .bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.55;
        }

        .msg-row.user-row .bubble {
          background: linear-gradient(135deg, #6C63FF, #5A51E6);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(108, 99, 255, 0.15);
        }

        .msg-row.ai-row .bubble {
          background: #191B28;
          color: #E2E8F0;
          border-bottom-left-radius: 4px;
          border: 1px solid #24273C;
        }

        .msg-row .time {
          font-size: 10px;
          color: #64748B;
          margin-top: 4px;
        }

        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 14px 18px !important;
        }

        .dot-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6C63FF;
          animation: bounce-pulse 1.2s infinite alternate;
        }

        .dot-pulse:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot-pulse:nth-child(3) {
          animation-delay: 0.4s;
        }

        .chat-input-footer {
          padding: 16px 20px;
          border-top: 1px solid #1F2232;
          background: #0E0F19;
        }

        .quick-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .q-btn {
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #2B2D42;
          background: #191B28;
          color: #8A91A5;
          cursor: pointer;
          transition: all 0.2s;
        }

        .q-btn:hover {
          border-color: #6C63FF;
          color: white;
          background: rgba(108, 99, 255, 0.08);
        }

        .q-btn.low:hover { border-color: #10B981; color: #10B981; }
        .q-btn.medium:hover { border-color: #F59E0B; color: #F59E0B; }
        .q-btn.high:hover { border-color: #EF4444; color: #EF4444; }

        .input-bar {
          display: flex;
          background: #141522;
          border: 1px solid #1F2232;
          border-radius: 14px;
          padding: 6px 6px 6px 14px;
          align-items: center;
          transition: all 0.2s;
        }

        .input-bar:focus-within {
          border-color: rgba(108, 99, 255, 0.5);
          box-shadow: 0 0 8px rgba(108, 99, 255, 0.15);
        }

        .input-bar input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          outline: none;
          font-size: 13.5px;
          font-family: inherit;
        }

        .send-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6C63FF, #00C2FF);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }

        /* Right Panel Board Styles */
        .board-header {
          padding: 16px 24px;
          border-bottom: 1px solid #1F2232;
          background: #0A0A10;
        }

        .board-title {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 2px;
          color: #00C2FF;
          margin: 0;
        }

        .board-subtitle {
          font-size: 11px;
          color: #64748B;
          margin-top: 2px;
        }

        .board-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sync-progress-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid #1F2232;
          border-radius: 16px;
          padding: 18px;
          position: relative;
        }

        .sync-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .sync-header .icon {
          color: #6C63FF;
          font-size: 18px;
        }

        .sync-title {
          font-weight: 700;
          font-size: 13px;
          color: #FFFFFF;
          margin: 0;
        }

        .draft-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .draft-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .draft-item .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748B;
          font-weight: 700;
        }

        .draft-item .val {
          font-size: 13px;
          color: #E2E8F0;
          font-weight: 600;
        }

        .draft-item .placeholder {
          color: #475569;
          font-style: italic;
          font-size: 12px;
        }

        .highlight-val {
          color: #00C2FF !important;
          font-weight: 700;
        }

        .badge-high { color: #EF4444 !important; font-weight: 700 !important; }
        .badge-normal { color: #6C63FF !important; font-weight: 700 !important; }
        .badge-low { color: #10B981 !important; font-weight: 700 !important; }

        .confirm-booking-btn {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6C63FF, #00C2FF);
          border: none;
          color: white;
          font-weight: 700;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(108, 99, 255, 0.2);
          transition: all 0.2s;
        }

        .confirm-booking-btn:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 14px 24px rgba(108, 99, 255, 0.35);
        }

        .scheduler-split {
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .calendar-box {
          flex: 1.1;
          background: rgba(255,255,255,0.01);
          border: 1px solid #151824;
          border-radius: 16px;
          padding: 12px;
        }

        .slots-box {
          flex: 0.9;
          background: rgba(255,255,255,0.01);
          border: 1px solid #151824;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .slots-title {
          font-size: 12.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 12px;
          text-align: center;
        }

        .loading-slots {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748B;
          gap: 8px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(108, 99, 255, 0.1);
          border-top-color: #6C63FF;
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }

        .no-slots-msg {
          font-size: 11.5px;
          color: #64748B;
          text-align: center;
          margin: auto 0;
          font-style: italic;
        }

        .slots-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          max-height: 240px;
          padding-right: 4px;
        }

        .slot-chip-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #1A1C2C;
          background: #0E0F1A;
          color: #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .slot-chip-btn:hover {
          border-color: #6C63FF;
          background: rgba(108, 99, 255, 0.08);
          transform: translateX(1px);
        }

        .slot-chip-btn.selected {
          border-color: #00C2FF;
          background: rgba(0, 194, 255, 0.1);
          color: #00C2FF;
        }

        .slot-chip-btn .time-text {
          font-weight: 700;
          font-size: 13px;
        }

        .confirm-badge {
          font-size: 10px;
          font-weight: 800;
          background: #00C2FF;
          color: #0A0A10;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .select-arrow {
          font-size: 13px;
          color: #64748B;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes bounce-pulse {
          to { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// Reusable custom calendar widget inspired by Fatima Sy screen
function CalendarWidget({ onDateSelect, selectedDate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="cal-widget">
      <div className="cal-nav">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}>
          <span className="material-symbols-outlined nav-icon">chevron_left</span>
        </button>
        <p className="month-title">{monthName}</p>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}>
          <span className="material-symbols-outlined nav-icon">chevron_right</span>
        </button>
      </div>

      <div className="cal-grid">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="grid-header-day">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="empty-day" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isPast = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today;
          const isCurrentToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
          
          const isSelected = selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day;

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => onDateSelect(viewYear, viewMonth, day)}
              className={`day-btn ${isPast ? 'past' : ''} ${isCurrentToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <style>{`
        .cal-widget {
          width: 100%;
          font-family: inherit;
        }

        .cal-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 0 4px;
        }

        .cal-nav button {
          background: #141522;
          border: 1px solid #1F2232;
          color: #8A91A5;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .cal-nav button:hover {
          border-color: #6C63FF;
          color: white;
        }

        .cal-nav .nav-icon {
          font-size: 16px;
        }

        .month-title {
          font-size: 12.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          text-align: center;
        }

        .grid-header-day {
          font-size: 9.5px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          padding-bottom: 6px;
        }

        .day-btn {
          aspect-ratio: 1.15;
          border: 1px solid #121320;
          background: #0D0E17;
          color: #E2E8F0;
          font-size: 11.5px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .day-btn:hover:not(.past) {
          border-color: #6C63FF;
          background: rgba(108, 99, 255, 0.08);
        }

        .day-btn.past {
          color: #334155;
          background: #090A10;
          border-color: transparent;
          cursor: default;
          opacity: 0.4;
        }

        .day-btn.today {
          border-color: #6C63FF;
          color: #6C63FF;
          font-weight: 800;
        }

        .day-btn.selected {
          background: linear-gradient(135deg, #6C63FF, #00C2FF) !important;
          color: white !important;
          border-color: transparent !important;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(108, 99, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
