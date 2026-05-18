import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';
import OtterMeetingNotesModal from '../components/OtterMeetingNotesModal';

const STATUS_CONFIG = {
  pending:              { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Pending Approval', border: 'rgba(251,146,60,0.2)' },
  approved:             { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Confirmed', border: 'rgba(34,197,94,0.2)' },
  rejected:             { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Declined', border: 'rgba(239,68,68,0.2)' },
  cancelled:            { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Cancelled', border: 'rgba(100,116,139,0.15)' },
  rescheduled:          { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Rescheduled', border: 'rgba(56,189,248,0.2)' },
  reschedule_requested: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Reschedule Requested', border: 'rgba(251,146,60,0.3)' },
  completed:            { color: '#6C63FF', bg: 'rgba(108, 99, 255, 0.12)', label: 'Completed', border: 'rgba(108, 99, 255, 0.2)' },
};

const SESSION_TYPES = [
  { id: 'strategy', label: '30 Min Strategy', duration: 30, desc: 'Tactical alignment & roadmap quick-wins.', icon: 'bolt' },
  { id: 'mentorship', label: '60 Min Mentorship', duration: 60, desc: 'Deep strategic dive & playbook audit.', icon: 'hub' },
  { id: 'vip', label: '2hr Executive VIP', duration: 120, desc: 'SOP audits & growth blueprint mapping.', icon: 'diamond' },
  { id: 'custom', label: 'Custom Duration / Time (IST)', duration: 60, desc: 'Specify custom duration and slot.', icon: 'more_time' }
];

const parseCustomTimeToSlot = (timeStr, duration = 60) => {
  if (!timeStr) return null;
  let match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  let minutes = match[2] ? parseInt(match[2], 10) : 0;
  let ampm = match[3] ? match[3].toLowerCase() : null;
  
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  
  const startStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
  let endMinutes = minutes + parseInt(duration, 10);
  let endHours = hours + Math.floor(endMinutes / 60);
  endMinutes = endMinutes % 60;
  endHours = endHours % 24;
  
  const endStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  
  return {
    label: `${timeStr} IST`,
    start: startStr,
    end: endStr
  };
};

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otterMeeting, setOtterMeeting] = useState(null);

  // Layout View State: 'book' or 'sessions'
  const [activeView, setActiveView] = useState('book');
  const [mobileView, setMobileView] = useState('center'); // 'center', 'left', or 'right'

  // Google Calendar Integration states
  const [googleConnected, setGoogleConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState('2 mins ago');
  const [syncingEvents, setSyncingEvents] = useState(false);

  // Today's Google Calendar Mock Schedule
  const [todaySchedule, setTodaySchedule] = useState([
    { time: '10:00 AM', title: 'Team Outbound Pipeline Review', busy: true },
    { time: '01:00 PM', title: 'Client SDR Training Prep', busy: true },
    { time: '03:00 PM', title: 'Focus Work Block', busy: false },
    { time: '06:00 PM', title: 'Available Strategy Window', busy: false }
  ]);

  // Unified Booking States (Original Apple Layout)
  const [agenda, setAgenda] = useState('');
  const [sessionType, setSessionType] = useState(SESSION_TYPES[1]); // Default 60m
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [description, setDescription] = useState('');
  const [meetType, setMeetType] = useState('video'); // 'video' (Google Meet) or 'in_person' (Office)
  const [priority, setPriority] = useState('normal');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Dynamic Sidebar Checklist states
  const [prepChecklist, setPrepChecklist] = useState({
    crm: false,
    metrics: false,
    funnel: false,
    scripts: false
  });

  // Outbound Sales Growth Roadmap tasks
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Draft cold outbound outreach script', completed: true },
    { id: 2, text: 'Define compensation parameters for 2 SDRs', completed: true },
    { id: 3, text: 'Submit qual template script notes to Tharun', completed: true }
  ]);

  // Executive resources
  const resources = [
    { id: 1, title: 'SISU $10M Outbound Template.docx', type: 'doc', icon: 'description' },
    { id: 2, title: 'SDR Compensation SOP Model.xlsx', type: 'sheet', icon: 'table_chart' },
    { id: 3, title: 'Outbound SDR Hiring Playbook.mp4', type: 'video', icon: 'play_circle' }
  ];

  // Available slots states
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reschedule modal states
  const [rescheduleMeeting, setRescheduleMeeting] = useState(null);
  const [newDateTime, setNewDateTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  // Floating Notification Dropdown State
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Floating AI Chatbot Widget State
  const [showChatbot, setShowChatbot] = useState(false);

  // AI Concierge Chat State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello Vikas — I'm your SISU AI Concierge. 🌟 To book a mentorship session with Tharun, here is the seamless procedure:
      
1️⃣ Define your challenge in the **Agenda** field.
2️⃣ Choose a duration, pick a date on our Smart Calendar, and select an available slot.
3️⃣ Complete final details and click **Request Mentorship Session**!

How can I help you scale today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  // Fetch upcoming and existing meetings
  const fetchData = useCallback(async () => {
    try {
      const [meetingsData, notifsData] = await Promise.all([
        api.getMeetings(),
        api.getNotifications(),
      ]);
      setMeetings(meetingsData);
      setNotifications(notifsData.filter(n => !n.is_read));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sync Google Calendar Animation
  const handleSyncCalendar = () => {
    setSyncingEvents(true);
    setTimeout(() => {
      setSyncingEvents(false);
      const now = new Date();
      setLastSyncTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} IST`);
    }, 1200);
  };

  // Load available time slots when date or duration changes
  useEffect(() => {
    if (selectedDate && sessionType) {
      const dur = sessionType.id === 'custom' ? (parseInt(customDuration, 10) || 60) : sessionType.duration;
      loadSlots(selectedDate, dur);
    }
  }, [selectedDate, sessionType, customDuration]);

  const loadSlots = async (d, duration) => {
    setLoadingSlots(true);
    try {
      const dateStr = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const slots = await api.getFreeSlots(dateStr, duration);
      setAvailableSlots(slots);
    } catch {
      // Offline fallback slots
      const mock = [];
      const base = new Date(d.year, d.month, d.day, 15, 0);
      for (let i = 0; i < 5; i++) {
        const start = new Date(base.getTime() + i * 60 * 60 * 1000);
        const end = new Date(start.getTime() + duration * 60 * 1000);
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

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const triggerAiReply = (userMsg, aiReply, delay = 600) => {
    addMessage('user', userMsg);
    setIsAiTyping(true);
    setShowChatbot(true); 
    setTimeout(() => {
      setIsAiTyping(false);
      addMessage('ai', aiReply);
    }, delay);
  };

  const handleSuggestionClick = (type) => {
    if (type === 'how_to_book') {
      triggerAiReply(
        "How do I book a session?",
        `To book a session with Tharun, follow this quick procedure:
        
1️⃣ **Define Agenda**: Enter your focus topic inside the booking form.
2️⃣ **Pick Duration**: Choose between 30m, 60m, or 2h.
3️⃣ **Choose Date & Slot**: Select an available day on the Apple Calendar grid and pick a time capsule.
4️⃣ **Request Session**: Review details in the summary on the right and submit. Tharun will sync calendars instantly!`
      );
    } else if (type === 'roadmap') {
      triggerAiReply(
        "Tell me about Phase 2 of my Outbound Roadmap",
        `Your Outbound Sales roadmap is currently 100% completed!
        
📝 *Draft cold outbound outreach script* (Done)
📝 *Define compensation parameters for 2 SDRs* (Done)
📝 *Submit qual template script notes to Tharun* (Done)

Ready to launch Phase 3 during your next call!`
      );
    }
  };

  // Gibberish and Keyboard Spam Detector
  const isGibberish = (str) => {
    const clean = str.trim().toLowerCase();
    if (clean.length < 4) return false;
    
    // Check if it's keyboard drumming (single words with too many consecutive consonants or keys like asdf)
    if (!clean.includes(' ')) {
      const vowels = (clean.match(/[aeiou]/g) || []).length;
      if (clean.length > 7 && vowels <= 1) return true;
      if (/asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwerty|zxcv|yuiop|xcvb/i.test(clean)) return true;
    }
    
    // Check vowel ratio
    const vowelsCount = (clean.match(/[aeiou]/g) || []).length;
    const consonantsCount = (clean.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    if (clean.length > 10 && vowelsCount === 0) return true;
    if (clean.length > 12 && consonantsCount / (vowelsCount || 1) > 5) return true;
    
    return false;
  };

  // Trash Talk / Bad Behavior Detector
  const isTrashTalk = (str) => {
    const clean = str.trim().toLowerCase();
    const toxicWords = [
      'fuck', 'shit', 'asshole', 'bitch', 'idiot', 'stupid', 'dumb', 'bastard', 'crap', 'garbage',
      'trash', 'useless', 'suck', 'dick', 'pussy', 'nonsense', 'hell', 'hate', 'worst'
    ];
    return toxicWords.some(word => clean.includes(word));
  };

  // Real-time Assistant chat submit
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');

    addMessage('user', text);
    setIsAiTyping(true);

    setTimeout(() => {
      setIsAiTyping(false);
      
      // Gibberish scenario
      if (isGibberish(text)) {
        addMessage('ai', "funny now lets get to the point how can i help you");
        return;
      }

      // Trash talk scenario
      if (isTrashTalk(text)) {
        addMessage('ai', "sry i cant help you on that");
        return;
      }
      
      const lower = text.toLowerCase();
      if (lower.includes('agenda') || lower.includes('focus') || lower.includes('topic')) {
        const extracted = text.replace(/agenda|focus|topic/gi, '').replace(/set|to|my|is/gi, '').trim();
        if (extracted) {
          setAgenda(extracted);
          addMessage('ai', `I've updated your Session Agenda to: "${extracted}" inside the booking form!`);
          return;
        }
      }

      api.chat(text, messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })))
        .then(data => {
          addMessage('ai', data.response || "I am synchronizing your executive scheduling variables live.");
        })
        .catch(() => {
          addMessage('ai', "I'm monitoring your calendar selection live. Let me know if you need booking tips!");
        });
    }, 800);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSelectType = (type) => {
    setSessionType(type);
    setSelectedSlot(null);
    setCustomTime('');
    setCustomDuration('');
  };

  const handleSelectDate = (year, month, day) => {
    setSelectedDate({ year, month, day });
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
  };

  const handleFinalSubmit = async () => {
    if (!agenda.trim()) {
      alert("Please provide an Agenda topic first.");
      return;
    }
    if (!selectedDate || !selectedSlot) {
      alert("Please lock in a coaching date and slot.");
      return;
    }
    setSubmitting(true);
    
    const startStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}T${selectedSlot.start}:00`;
    const endStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}T${selectedSlot.end}:00`;

    const dur = sessionType.id === 'custom' ? (parseInt(customDuration, 10) || 60) : sessionType.duration;
    const typeLabel = sessionType.id === 'custom' ? `Custom: ${dur} mins` : sessionType.label;

    try {
      const res = await api.createMeeting({
        title: agenda,
        description: description || 'Booked via Executive Mentorship Workspace',
        reason: `Topic: ${agenda}. Custom Slot: ${selectedSlot.label}`,
        meeting_type: typeLabel,
        priority: priority,
        start_time: startStr,
        end_time: endStr,
        duration_minutes: dur,
        preferred_communication: meetType,
        phone: phone || 'N/A'
      });

      if (res && res.success === false) {
        alert(res.message || "This booking already exists!");
        return;
      }

      setBookingSuccess(true);
      await fetchData();
    } catch (err) {
      alert(`Booking conflict or sync error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetBooking = () => {
    setBookingSuccess(false);
    setAgenda('');
    setSelectedDate(null);
    setSelectedSlot(null);
    setDescription('');
    setPrepChecklist({ crm: false, metrics: false, funnel: false, scripts: false });
  };

  const handleCancelMeeting = async (id) => {
    if (!window.confirm('Cancel this mentorship session? This will update the status live.')) return;
    try {
      await api.cancelMeeting(id);
      await fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRescheduleClick = (meeting) => {
    setRescheduleMeeting(meeting);
    const defaultTime = meeting.start_time ? meeting.start_time.slice(0, 16) : '';
    setNewDateTime(defaultTime);
    setRescheduleReason('');
    setRescheduleError('');
  };

  const submitReschedule = async () => {
    if (!newDateTime) {
      setRescheduleError('Please choose a valid reschedule slot.');
      return;
    }
    setSubmitting(true);
    setRescheduleError('');
    try {
      const duration = rescheduleMeeting.duration_minutes || 60;
      const startDt = new Date(newDateTime);
      const endDt = new Date(startDt.getTime() + duration * 60 * 1000);
      
      await api.requestReschedule(rescheduleMeeting.id, {
        new_start_time: startDt.toISOString(),
        new_end_time: endDt.toISOString(),
        reason: rescheduleReason,
      });

      setRescheduleMeeting(null);
      await fetchData();
    } catch (e) {
      setRescheduleError(e.message || 'Failed to submit reschedule request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.markRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllRead();
      setNotifications([]);
      await fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ background: '#070B14', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', 'Inter', sans-serif", color: '#F8FAFC' }}>
      
      {/* ── TOP NAVIGATION NAVBAR ─────────────────────────────────────────── */}
      <nav style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #5B5FFF, #00C2FF)', boxShadow: '0 0 12px #5B5FFF' }} />
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px', color: 'white' }}>SISU</span>
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: 3, borderRadius: 10 }}>
          <button
            onClick={() => setActiveView('book')}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: activeView === 'book' ? 'white' : 'transparent', color: activeView === 'book' ? '#070B14' : '#94A3B8', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Book Mentorship
          </button>
          <button
            onClick={() => setActiveView('sessions')}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: activeView === 'sessions' ? 'white' : 'transparent', color: activeView === 'sessions' ? '#070B14' : '#94A3B8', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            My Scheduled calls
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              style={{ background: 'none', border: 'none', position: 'relative', display: 'flex', alignItems: 'center', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }} />
              )}
            </button>

            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{ position: 'absolute', top: 40, right: -10, width: 320, background: '#0F1725', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 200 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={handleMarkAllNotificationsRead} style={{ background: 'none', border: 'none', color: '#5B5FFF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Mark all read</button>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>All caught up!</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkNotificationRead(n.id)}
                          style={{ padding: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer' }}
                        >
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{n.title}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 0, lineHeight: 1.4 }}>{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #5B5FFF, #00C2FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>
              {user?.name ? user.name[0].toUpperCase() : 'V'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0' }}>{user?.name || 'Vikas Mohan'}</span>
          </div>

          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span> Sign Out
          </button>
        </div>
      </nav>

      {/* ── CORE GRID WORKSPACE LAYOUT ──────────────────────────────────────── */}
      <div className={`guided-workspace view-${mobileView}`}>
        
        {/* COLUMN 1: LEFT SIDEBAR (CONSOLIDATED SAAS SCHEDULING CONTEXT & STATUS WIDGETS) */}
        <div className="workspace-column left-chat-pane" style={{ padding: 20, gap: 16, overflowY: 'auto' }}>
          
          {/* Back button for mobile */}
          <div className="mobile-back-row" style={{ marginBottom: 12 }}>
            <button onClick={() => setMobileView('center')} className="mobile-back-btn">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Planner</span>
            </button>
          </div>
          
          {/* 1. Connected Calendar Status */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0 }}>G-Cal Sync Connected</p>
                <p style={{ fontSize: 9.5, color: '#64748B', margin: 0, marginTop: 2 }}>Last sync: {lastSyncTime}</p>
              </div>
              
              <button
                onClick={handleSyncCalendar}
                disabled={syncingEvents}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '5px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <span className={`material-symbols-outlined ${syncingEvents ? 'spin' : ''}`} style={{ fontSize: 11 }}>sync</span>
                {syncingEvents ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>

          {/* 2. Today's G-Cal Schedule */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Today's G-Cal Schedule</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todaySchedule.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>{item.time}</span>
                  <span style={{ fontSize: 10.5, color: '#E2E8F0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 130 }}>{item.title}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: item.busy ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', color: item.busy ? '#ef4444' : '#22c55e' }}>{item.busy ? 'Busy' : 'Free'}</span>
                </div>
              ))}
            </div>
          </div>



          {/* 4. Pre-Session Prep Checklist */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Pre-Session Preparation</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div onClick={() => setPrepChecklist(prev => ({ ...prev, crm: !prev.crm }))} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${prepChecklist.crm ? '#5B5FFF' : 'rgba(255,255,255,0.2)'}`, background: prepChecklist.crm ? '#5B5FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prepChecklist.crm && <span className="material-symbols-outlined" style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>done</span>}
                </div>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>CRM screenshots ready</span>
              </div>

              <div onClick={() => setPrepChecklist(prev => ({ ...prev, metrics: !prev.metrics }))} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${prepChecklist.metrics ? '#5B5FFF' : 'rgba(255,255,255,0.2)'}`, background: prepChecklist.metrics ? '#5B5FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prepChecklist.metrics && <span className="material-symbols-outlined" style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>done</span>}
                </div>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>Key metrics spreadsheet complete</span>
              </div>

              <div onClick={() => setPrepChecklist(prev => ({ ...prev, funnel: !prev.funnel }))} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${prepChecklist.funnel ? '#5B5FFF' : 'rgba(255,255,255,0.2)'}`, background: prepChecklist.funnel ? '#5B5FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prepChecklist.funnel && <span className="material-symbols-outlined" style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>done</span>}
                </div>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>Funnel leakage analysis screens</span>
              </div>

              <div onClick={() => setPrepChecklist(prev => ({ ...prev, scripts: !prev.scripts }))} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${prepChecklist.scripts ? '#5B5FFF' : 'rgba(255,255,255,0.2)'}`, background: prepChecklist.scripts ? '#5B5FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prepChecklist.scripts && <span className="material-symbols-outlined" style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>done</span>}
                </div>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>Outreach cold templates ready</span>
              </div>
            </div>
          </div>

          {/* 5. Sync & Meet Status Tracker */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Sync & Meet Status</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>task_alt</span>
                <span>✓ Session Request Sent</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>task_alt</span>
                <span>✓ G-Cal Calendar Synced</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>task_alt</span>
                <span>✓ Google Meet link generated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: (prepChecklist.crm && prepChecklist.metrics) ? '#22c55e' : '#fb923c' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{(prepChecklist.crm && prepChecklist.metrics) ? 'task_alt' : 'pending'}</span>
                <span>{(prepChecklist.crm && prepChecklist.metrics) ? '✓ Prep Complete' : '⏳ Prep Pending'}</span>
              </div>
            </div>
          </div>

          {/* 6. What Happens Next Timeline */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>What Happens Next</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', paddingLeft: 10 }}>
              <div style={{ position: 'absolute', left: 3, top: 4, bottom: 4, width: 1, background: 'rgba(255,255,255,0.06)' }} />
              
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5B5FFF', position: 'absolute', left: 1, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'white', margin: 0 }}>1. Calendar Invite Sent</p>
                  <p style={{ fontSize: 9, color: '#64748B', margin: 0, marginTop: 1 }}>Direct invite synced in inbox.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5B5FFF', position: 'absolute', left: 1, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'white', margin: 0 }}>2. Google Meet Room Ready</p>
                  <p style={{ fontSize: 9, color: '#64748B', margin: 0, marginTop: 1 }}>Dedicated secure video room generated.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#64748B', position: 'absolute', left: 1, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>3. Reminder Schedule</p>
                  <p style={{ fontSize: 9, color: '#64748B', margin: 0, marginTop: 1 }}>Instant Slack ping 10m before kickoff.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 2: CENTER PANEL (UNIFIED ONE-STEP APPLE BOOKING FORM) */}
        <div className="workspace-column center-booking-pane">
          {/* Mobile Navigation Header: Only visible on mobile devices */}
          <div className="mobile-nav-bar">
            <button onClick={() => setMobileView('left')} className="mobile-nav-btn">
              <span className="material-symbols-outlined">analytics</span>
              <span>Prep & Schedule</span>
            </button>
            <button onClick={() => setMobileView('right')} className="mobile-nav-btn">
              <span className="material-symbols-outlined">receipt_long</span>
              <span>Summary & Vault</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            
            {activeView === 'sessions' ? (
              
              /* CONFIRMED MEETINGS VIEW */
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ background: '#0F1725', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px', color: 'white' }}>My Scheduled Mentorship Calls</h3>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>Track approvals, access video room links, or reschedule slots.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {loading ? (
                    <p style={{ color: '#64748B' }}>Fetching live sessions...</p>
                  ) : meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 14 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>No Scheduled Sessions</p>
                      <p style={{ fontSize: 12 }}>Toggle to 'Book Mentorship' at the top to draft your first session!</p>
                    </div>
                  ) : (
                    meetings.map(m => {
                      const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
                      return (
                        <div key={m.id} style={{ padding: 18, background: 'rgba(255,255,255,0.02)', border: `1px solid ${cfg.border}`, borderRadius: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <h4 style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>{m.title}</h4>
                            <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 100, border: `1px solid ${cfg.border}`, textTransform: 'uppercase' }}>{cfg.label}</span>
                          </div>

                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                            <p style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_today</span>
                              {m.start_time ? format(parseISO(m.start_time), 'MMM d, yyyy · h:mm a') : '—'}
                            </p>
                            <p style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>assignment</span>
                              {m.meeting_type} ({m.duration_minutes}m)
                            </p>
                            {m.phone && m.phone !== 'N/A' && (
                              <p style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>phone</span>
                                {m.phone}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                            {m.meet_link ? (
                              <a href={m.meet_link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'rgba(91,95,255,0.1)', border: '1px solid rgba(91,95,255,0.2)', borderRadius: 6, color: '#5B5FFF', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span> Join Google Meet
                              </a>
                            ) : (
                              <span style={{ fontSize: 11, color: '#64748B' }}>Meet room generating...</span>
                            )}

                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setOtterMeeting(m)} style={{ background: 'rgba(0,194,255,0.08)', border: '1px solid rgba(0,194,255,0.15)', color: '#00C2FF', padding: '5px 10px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>graphic_eq</span> Otter Notes
                              </button>
                              {(m.status === 'pending' || m.status === 'approved') && (
                                <>
                                  <button onClick={() => handleRescheduleClick(m)} style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', color: '#fb923c', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Reschedule</button>
                                  <button onClick={() => handleCancelMeeting(m.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>

            ) : bookingSuccess ? (

              /* SUCCESS STATE */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center', background: '#0F1725', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 0 16px rgba(34,197,94,0.15)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#22c55e' }}>done</span>
                </div>
                
                <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px', color: 'white' }}>Coaching Slot Requested</h2>
                <p style={{ color: '#94A3B8', fontSize: 13.5, maxWidth: 320, lineHeight: 1.6, marginBottom: 28 }}>
                  Your session request for "{agenda}" has been queued. Tharun will align schedules and trigger Google Meet links.
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setActiveView('sessions'); setBookingSuccess(false); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer' }}>
                    View Scheduled Calls
                  </button>
                  <button onClick={handleResetBooking} style={{ background: '#5B5FFF', padding: '10px 20px', borderRadius: 8, border: 'none', color: 'white', cursor: 'pointer' }}>
                    Book Another Call
                  </button>
                </div>
              </motion.div>

            ) : (

              /* ORIGINAL UNIFIED SINGLE-STEP BOOKING CARD */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="apple-booking-card"
              >
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1D1D1F', marginBottom: 4, letterSpacing: '-0.5px' }}>Mentorship Booking Planner</h3>
                <p style={{ fontSize: 13, color: '#86868B', marginBottom: 24 }}>Complete the booking parameters in a single step to secure your executive slot.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 800, marginBottom: 8 }}>1. Agenda</label>
                    <input
                      className="apple-input"
                      type="text"
                      placeholder="e.g. Auditing outbound sales pipeline and optimizing customer SOPs..."
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                    />
                  </div>

                  <div className="apple-form-header-grid">
                    <div>
                      <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 800, marginBottom: 8 }}>2. Mentorship Duration</label>
                      <select className="apple-select" value={sessionType.id} onChange={(e) => handleSelectType(SESSION_TYPES.find(s => s.id === e.target.value))}>
                        {SESSION_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.label} ({t.duration} mins)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 800, marginBottom: 8 }}>3. Coaching Channel</label>
                      <select className="apple-select" value={meetType} onChange={(e) => setMeetType(e.target.value)}>
                        <option value="video">Google Meet (Online Video)</option>
                        <option value="in_person">Spi Edge (Inoffice Meet)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #D2D2D7', paddingTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 800, marginBottom: 12 }}>4. Pick Coaching Date & Time Slot</label>
                    
                    <div className="apple-calendar-grid-container">
                      
                      <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #E5E5E7', borderRadius: 12, padding: 12 }}>
                        <AppleCalendarWidget
                          onDateSelect={handleSelectDate}
                          selectedDate={selectedDate}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: 11.5, fontWeight: 700, color: '#1D1D1F', marginBottom: 10, textAlign: 'center' }}>
                          {selectedDate ? (sessionType.id === 'custom' ? 'Custom Time & Duration' : `Available slots (${sessionType.duration}m)`) : 'Choose a date first'}
                        </p>

                        <div className="apple-slots-grid" style={{ flex: 1, overflowY: 'auto', maxHeight: 220, paddingRight: 4 }}>
                          {!selectedDate ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#86868B', textAlign: 'center', border: '1px dashed #D2D2D7', borderRadius: 10, padding: 12 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 20, marginBottom: 6 }}>event_available</span>
                              <span style={{ fontSize: 11, lineHeight: 1.4 }}>Pick a date on the calendar to unlock coaching slots.</span>
                            </div>
                          ) : sessionType.id === 'custom' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 10, color: '#86868B', fontWeight: 700, marginBottom: 4 }}>Custom Time (IST)</label>
                                <input
                                  type="text"
                                  className="apple-input"
                                  style={{ height: 36, background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', color: '#1D1D1F', outline: 'none' }}
                                  placeholder="e.g. 5:30 PM or 17:30"
                                  value={customTime}
                                  onChange={(e) => {
                                    setCustomTime(e.target.value);
                                    const parsedSlot = parseCustomTimeToSlot(e.target.value, customDuration || 60);
                                    if (parsedSlot) {
                                      setSelectedSlot(parsedSlot);
                                    } else {
                                      setSelectedSlot(null);
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 10, color: '#86868B', fontWeight: 700, marginBottom: 4 }}>Custom Duration (minutes)</label>
                                <input
                                  type="number"
                                  className="apple-input"
                                  style={{ height: 36, background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', color: '#1D1D1F', outline: 'none' }}
                                  placeholder="e.g. 60"
                                  value={customDuration}
                                  onChange={(e) => {
                                    const dur = e.target.value;
                                    setCustomDuration(dur);
                                    const parsedSlot = parseCustomTimeToSlot(customTime, dur || 60);
                                    if (parsedSlot) {
                                      setSelectedSlot(parsedSlot);
                                    }
                                  }}
                                />
                              </div>
                              {selectedSlot && (
                                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginTop: 4 }}>
                                  ✓ Slot parsed: {selectedSlot.start} to {selectedSlot.end} IST
                                </div>
                              )}
                            </div>
                          ) : loadingSlots ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, color: '#86868B' }}>
                              <div className="apple-spinner" />
                              <span style={{ fontSize: 11 }}>Syncing...</span>
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '16px 8px', color: '#86868B', fontSize: 11, fontStyle: 'italic' }}>
                              No slots left. Pick another date.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {availableSlots.map((slot) => {
                                const isSelected = selectedSlot?.label === slot.label;
                                return (
                                  <button
                                    key={slot.label}
                                    onClick={() => handleSelectSlot(slot)}
                                    className={`apple-slot-pill ${isSelected ? 'selected' : ''}`}
                                  >
                                    <span>{slot.label}</span>
                                    {isSelected && <span style={{ fontSize: 9, fontWeight: 800, background: '#1D1D1F', color: 'white', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>Locked</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="apple-form-footer-grid">
                    <div>
                      <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 700, marginBottom: 6 }}>5. Description</label>
                      <textarea
                        className="apple-input"
                        style={{ height: 38, minHeight: 38, maxHeight: 120, background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', color: '#1D1D1F', outline: 'none', resize: 'vertical' }}
                        placeholder="e.g. Discussing outbound roadmap & scaling SDR metrics..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86868B', fontWeight: 700, marginBottom: 6 }}>6. Callback Phone Number</label>
                      <input
                        type="tel"
                        className="apple-input"
                        style={{ height: 38, background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', color: '#1D1D1F', outline: 'none' }}
                        placeholder="e.g. +91 9876543210..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Mobile-only Submit Action Button */}
                  <div className="mobile-submit-container">
                    <button
                      onClick={handleFinalSubmit}
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #5B5FFF, #00C2FF)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, cursor: 'pointer', boxShadow: '0 8px 24px rgba(91,95,255,0.3)', color: 'white', fontWeight: 700, fontSize: 14 }}
                    >
                      {submitting ? (
                        <span className="spinner" style={{ width: 16, height: 16 }} />
                      ) : (
                        <>
                          <span>Request Mentorship Session</span>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* COLUMN 3: RIGHT SIDEBAR (SUMMARY, SALES GROWTH ROADMAP & RESOURCE VAULT) */}
        <div className="workspace-column right-checkout-pane" style={{ padding: 0, gap: 20, overflowY: 'auto' }}>
          
          {/* Back button for mobile */}
          <div className="mobile-back-row" style={{ padding: '20px 20px 0 20px' }}>
            <button onClick={() => setMobileView('center')} className="mobile-back-btn">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Planner</span>
            </button>
          </div>
          
          {/* Mentorship Call Summary Card */}
          <div style={{ background: '#0F1725', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 800, marginBottom: 16 }}>Mentorship Call Summary</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Executive Focus</span>
                <span style={{ fontWeight: 600, color: 'white', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agenda.trim() ? `"${agenda}"` : 'Awaiting Agenda...'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Session Duration</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{sessionType.id === 'custom' ? `${customDuration || 60} mins (Custom)` : sessionType.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Proposed Slot</span>
                <span style={{ fontWeight: 600, color: '#00C2FF' }}>
                  {selectedDate && selectedSlot ? (
                    `${new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedSlot.label}`
                  ) : (
                    'Awaiting selection...'
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Format Type</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{meetType === 'video' ? 'Google Meet' : 'Spi Edge (Inoffice Meet)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Callback Phone</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{phone || 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span style={{ color: '#64748B' }}>Description</span>
                <span style={{ fontWeight: 500, color: 'white', fontSize: 12, lineHeight: 1.4 }}>{description.trim() ? description : 'No description provided'}</span>
              </div>
            </div>

            {agenda.trim() && selectedDate && selectedSlot && !bookingSuccess && (
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 24, padding: 12, background: '#5B5FFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, cursor: 'pointer', boxShadow: '0 8px 24px rgba(91,95,255,0.3)', color: 'white', fontWeight: 700 }}
              >
                {submitting ? (
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                ) : (
                  <>
                    <span>Request Mentorship Session</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Reschedule Request Modal */}
      {rescheduleMeeting && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(4,4,8,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifySelf: 'center', zIndex: 1000, padding: 20 }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: '#0F1725', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.3px' }}>Request Reschedule</h3>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>Proposed for "{rescheduleMeeting.title}"</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Select New Date & Time</label>
              <input
                className="input"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Reason for Change (Optional)</label>
              <textarea
                rows={3}
                placeholder="Write back to Tharun..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                style={{ resize: 'none', width: '100%', padding: '10px 12px', background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', outline: 'none' }}
              />
            </div>

            {rescheduleError && (
              <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{rescheduleError}</p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setRescheduleMeeting(null)} disabled={submitting} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={submitReschedule} disabled={submitting} style={{ background: '#5B5FFF', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Otter Meeting Notes Modal */}
      <AnimatePresence>
        {otterMeeting && (
          <OtterMeetingNotesModal
            meeting={otterMeeting}
            onClose={() => {
              setOtterMeeting(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FLOATING APPLE-STYLE AI CHATBOT CONCIERGE WIDGET ──────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="apple-chatbot-trigger"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>
            {showChatbot ? 'close' : 'smart_toy'}
          </span>
          {!showChatbot && messages.length > 0 && (
            <span className="pulse-dot" />
          )}
        </button>

        <AnimatePresence>
          {showChatbot && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="apple-chatbot-bubble"
            >
              <div className="chatbot-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#00C2FF' }}>smart_toy</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 800, margin: 0, color: 'white' }}>SISU AI Concierge</p>
                    <p style={{ fontSize: 9.5, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 5, height: 5, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} /> Live Agent
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowChatbot(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div ref={chatRef} className="chatbot-messages">
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', gap: 8, maxWidth: '85%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: msg.sender === 'user' ? '#5B5FFF' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {msg.sender === 'user' ? (
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>{user?.name?.[0] || 'V'}</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#94A3B8' }}>smart_toy</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, lineHeight: 1.4, background: msg.sender === 'user' ? '#5B5FFF' : '#1E293B', border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)', color: '#E2E8F0', whiteSpace: 'pre-line' }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#94A3B8' }}>smart_toy</span>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: '#1E293B', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 3, alignItems: 'center' }}>
                      <span className="typing-dot" style={{ width: 4, height: 4 }} />
                      <span className="typing-dot" style={{ width: 4, height: 4, animationDelay: '0.2s' }} />
                      <span className="typing-dot" style={{ width: 4, height: 4, animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto', background: '#0F1725' }}>
                <button
                  onClick={() => handleSuggestionClick('how_to_book')}
                  style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  📖 How to book?
                </button>
                <button
                  onClick={() => handleSuggestionClick('roadmap')}
                  style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  🗺️ Outbound Roadmap
                </button>
              </div>

              <form onSubmit={handleChatSubmit} style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0F1725' }}>
                <div style={{ display: 'flex', background: '#070B14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '3px 3px 3px 10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type custom details or ask AI..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: 12 }}
                  />
                  <button type="submit" disabled={!chatInput.trim() || isAiTyping} style={{ width: 24, height: 24, borderRadius: 6, background: '#5B5FFF', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .mobile-nav-bar {
          display: none;
          gap: 10px;
          margin-bottom: 16px;
        }
        .mobile-nav-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #94A3B8;
          padding: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mobile-nav-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: white;
        }
        
        .mobile-back-row {
          display: none;
        }
        .mobile-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: white;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mobile-back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .apple-form-header-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .apple-calendar-grid-container {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
        }

        .apple-form-footer-grid {
          border-top: 1px solid #D2D2D7;
          padding-top: 20px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }

        .mobile-submit-container {
          display: none;
          margin-top: 24px;
        }

        @media (max-width: 640px) {
          .apple-form-header-grid,
          .apple-calendar-grid-container,
          .apple-form-footer-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 1024px) {
          .mobile-nav-bar {
            display: flex;
          }
          .mobile-back-row {
            display: block;
          }
          .guided-workspace {
            grid-template-columns: 1fr !important;
            padding: 12px !important;
            gap: 12px !important;
            height: auto !important;
            overflow: visible !important;
          }
          .workspace-column {
            max-height: none !important;
            height: auto !important;
          }
          .guided-workspace.view-center .left-chat-pane,
          .guided-workspace.view-center .right-checkout-pane {
            display: none !important;
          }
          .guided-workspace.view-left .center-booking-pane,
          .guided-workspace.view-left .right-checkout-pane {
            display: none !important;
          }
          .guided-workspace.view-right .center-booking-pane,
          .guided-workspace.view-right .left-chat-pane {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          nav {
            padding: 0 12px !important;
            flex-wrap: wrap;
            height: auto !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            gap: 10px;
          }
          nav > div {
            width: 100%;
            justify-content: space-between;
          }
        }

        .guided-workspace {
          flex: 1;
          display: grid;
          grid-template-columns: 310px 1fr 330px;
          gap: 24px;
          padding: 24px;
          height: calc(100vh - 64px);
          overflow: hidden;
          background: #070B14;
        }

        .workspace-column {
          height: 100%;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 112px);
        }

        .left-chat-pane {
          background: #0F1725;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow-y: auto;
        }

        .center-booking-pane {
          overflow-y: auto;
          padding-right: 4px;
        }

        .right-checkout-pane {
          gap: 20px;
          overflow-y: auto;
          padding-right: 4px;
        }

        /* Apple-style Premium Light-Glass card */
        .apple-booking-card {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          padding: 24px;
          color: #1D1D1F;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .apple-input {
          width: 100%;
          background: #F5F5F7;
          border: 1px solid #D2D2D7;
          border-radius: 8px;
          color: #1D1D1F;
          padding: 12px 14px;
          font-size: 13.5px;
          font-family: inherit;
          transition: all 0.2s;
          outline: none;
        }

        .apple-input:focus {
          border-color: #0071E3;
          background: white;
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
        }

        .apple-select {
          width: 100%;
          background: #F5F5F7;
          border: 1px solid #D2D2D7;
          border-radius: 8px;
          color: #1D1D1F;
          padding: 11px 14px;
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apple-select:focus {
          border-color: #0071E3;
          background: white;
        }

        /* Time slot selection cards as soft light grey capsules */
        .apple-slot-pill {
          width: 100%;
          padding: 10px 14px;
          border-radius: 20px;
          border: 1px solid #E5E5E7;
          background: rgba(255, 255, 255, 0.9);
          color: #1D1D1F;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 12.5px;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.04);
        }

        .apple-slot-pill:hover {
          background: #F5F5F7;
          border-color: #D2D2D7;
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
        }

        .apple-slot-pill.selected {
          border-color: #1D1D1F !important;
          background: #1D1D1F !important;
          color: white !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        /* Apple loading spinner */
        .apple-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 113, 227, 0.1);
          border-top-color: #0071E3;
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
        }

        /* Sync spinner rotation */
        .spin {
          animation: rotation 1.2s infinite linear;
        }
        @keyframes rotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Floating AI Chatbot trigger button */
        .apple-chatbot-trigger {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5B5FFF, #00C2FF);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(91, 95, 255, 0.35);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .apple-chatbot-trigger:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 12px 40px rgba(91, 95, 255, 0.5);
        }

        .apple-chatbot-trigger:active {
          transform: scale(0.95);
        }

        .pulse-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #070B14;
          animation: pulse-glow 1.5s infinite;
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        /* Chatbot bubble window styles */
        .apple-chatbot-bubble {
          position: fixed;
          bottom: 88px;
          right: 24px;
          width: 330px;
          height: 440px;
          background: rgba(13, 14, 25, 0.9);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
        }

        .chatbot-header {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .typing-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #94A3B8;
          animation: dot-bounce 1.2s infinite alternate;
        }

        @keyframes dot-bounce {
          to { transform: translateY(-3px); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
        }

        /* ── RESPONSIVE MOBILE STYLING ── */
        @media (max-width: 1024px) {
          .guided-workspace {
            grid-template-columns: 1fr !important;
            height: auto !important;
            overflow: visible !important;
            gap: 20px !important;
            padding: 16px !important;
          }
          .workspace-column {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>

    </div>
  );
}

// ── APPLE CALENDAR WIDGET (With professional availability indicators) ──
function AppleCalendarWidget({ onDateSelect, selectedDate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getAvailabilityState = (day) => {
    if (viewMonth === 4 && [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(day)) return 'booked'; // greyed out
    if (day % 6 === 0) return 'busy';     // Red busy
    if (day % 4 === 0) return 'booked';   // Gray booked
    if (day % 3 === 0) return 'limited';  // Orange limited
    return 'available';                   // Green available
  };

  return (
    <div className="apple-cal">
      <div className="apple-cal-nav">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}>
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <p className="apple-month-title">{monthName}</p>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="apple-cal-grid">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="apple-header-day">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="empty-day" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isPast = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today;
          const isCurrentToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
          const isSelected = selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day;

          const state = getAvailabilityState(day);
          
          let dotColor = '#22c55e'; // Green available
          if (state === 'limited') dotColor = '#fb923c'; // Orange limited
          if (state === 'busy') dotColor = '#ef4444'; // Red busy
          if (state === 'booked') dotColor = '#64748b'; // Gray fully booked

          return (
            <button
              key={day}
              disabled={isPast || state === 'booked'}
              onClick={() => onDateSelect(viewYear, viewMonth, day)}
              className={`apple-day-btn ${isPast || state === 'booked' ? 'past' : ''} ${isCurrentToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
            >
              <span className="apple-day-number">{day}</span>
              {!isPast && state !== 'booked' && !isSelected && (
                <span className="apple-dot" style={{ background: dotColor }} />
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .apple-cal {
          width: 100%;
        }

        .apple-cal-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 0 2px;
        }

        .apple-cal-nav button {
          background: #F5F5F7;
          border: 1px solid #D2D2D7;
          color: #86868B;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apple-cal-nav button:hover {
          border-color: #1D1D1F;
          color: #1D1D1F;
          background: #E5E5E7;
        }

        .apple-cal-nav button span {
          font-size: 16px;
        }

        .apple-month-title {
          font-size: 12.5px;
          font-weight: 800;
          color: #1D1D1F;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .apple-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .apple-header-day {
          font-size: 9.5px;
          font-weight: 800;
          color: #86868B;
          text-transform: uppercase;
          padding-bottom: 6px;
          text-align: center;
        }

        .apple-day-btn {
          aspect-ratio: 1.15;
          border: 1px solid transparent;
          background: transparent;
          color: #1D1D1F;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .apple-day-btn:hover:not(.past) {
          background: #F5F5F7;
          border-color: #D2D2D7;
        }

        .apple-day-btn.past {
          color: #D2D2D7;
          cursor: default;
          opacity: 0.35;
        }

        .apple-day-btn.today {
          border-color: #0071E3;
          color: #0071E3;
          font-weight: 800;
        }

        .apple-day-btn.selected {
          background: #1D1D1F !important;
          color: white !important;
          border-color: transparent !important;
          font-weight: 800;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
        }

        .apple-dot {
          width: 3.5px;
          height: 3.5px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
