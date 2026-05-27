import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';

const TIME_SLOTS = [
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
];

const STATUS_CONFIG = {
  pending:              { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Pending Approval', border: 'rgba(251,146,60,0.2)' },
  approved:             { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Confirmed', border: 'rgba(34,197,94,0.2)' },
  rejected:             { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Declined', border: 'rgba(239,68,68,0.2)' },
  cancelled:            { color: '#8e8e93', bg: 'rgba(142,142,147,0.1)', label: 'Cancelled', border: 'rgba(142,142,147,0.15)' },
  rescheduled:          { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Rescheduled', border: 'rgba(56,189,248,0.2)' },
  reschedule_requested: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Reschedule Requested', border: 'rgba(251,146,60,0.3)' },
  reschedule_proposed:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Proposed Reschedule', border: 'rgba(251,146,60,0.3)' },
  completed:            { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', label: 'Completed', border: 'rgba(168,85,247,0.2)' },
};

const STATUS_HELPER_CONFIG = {
  approved: {
    text: "Your session is officially confirmed. A calendar invite and verification email have been dispatched to your inbox.",
    bg: 'rgba(34, 197, 94, 0.05)',
    border: '1px solid rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    icon: 'mail_outline'
  },
  rescheduled: {
    text: "This session has been successfully rescheduled. A revised calendar confirmation has been sent to your inbox.",
    bg: 'rgba(56, 189, 248, 0.05)',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    icon: 'update'
  },
  pending: {
    text: "Your scheduling request is awaiting review. Our operations team will verify details and approve your slot shortly.",
    bg: 'rgba(251, 146, 60, 0.05)',
    border: '1px solid rgba(251, 146, 60, 0.15)',
    color: '#fb923c',
    icon: 'pending'
  },
  reschedule_requested: {
    text: "A reschedule request for this session is pending review. We will notify you once the new slot is approved.",
    bg: 'rgba(251, 146, 60, 0.05)',
    border: '1px solid rgba(251, 146, 60, 0.15)',
    color: '#fb923c',
    icon: 'history'
  },
  reschedule_proposed: {
    text: "The admin has proposed a new date and time for this session. Review details below to Accept & Block or call to negotiate.",
    bg: 'rgba(251, 146, 60, 0.05)',
    border: '1px solid rgba(251, 146, 60, 0.25)',
    color: '#fb923c',
    icon: 'pending'
  },
  cancelled: {
    text: "This session has been cancelled. Please schedule a new slot if you would like to reconnect.",
    bg: 'rgba(142, 142, 147, 0.05)',
    border: '1px solid rgba(142, 142, 147, 0.15)',
    color: '#8e8e93',
    icon: 'cancel'
  },
  rejected: {
    text: "This request could not be accommodated due to schedule conflicts. Please select an alternative slot.",
    bg: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    icon: 'block'
  },
  completed: {
    text: "This session is marked as completed. Follow-up action items have been synchronized to your Outbound Roadmap.",
    bg: 'rgba(168, 85, 247, 0.05)',
    border: '1px solid rgba(168, 85, 247, 0.15)',
    color: '#a855f7',
    icon: 'task_alt'
  }
};

const SESSION_TYPES = [
  { id: 'strategy', label: '30 Min Strategy', duration: 30, desc: 'Tactical alignment & playbook quick-wins.', icon: 'bolt' },
  { id: 'mentorship', label: '60 Min Mentorship', duration: 60, desc: 'Deep strategic dive & playbook audit.', icon: 'hub' },
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
  const { user, logout, updateUser, isAdmin } = useAuth();
  if (isAdmin) {
    window.location.href = '/admin';
    return null;
  }
  const [meetings, setMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Layout View State: 'book' or 'sessions'
  const [activeView, setActiveView] = useState('book');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

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

  // Unified Booking States
  const [agenda, setAgenda] = useState('');
  const [sessionType, setSessionType] = useState(SESSION_TYPES[1]); // Default 60m
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [description, setDescription] = useState('');
  const [meetType, setMeetType] = useState('video'); // 'video' (Google Meet) or 'in_person' (Office)
  const [customLocationAddress, setCustomLocationAddress] = useState('');
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
  const [clientRescheduleDate, setClientRescheduleDate] = useState('');
  const [clientRescheduleTime, setClientRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Profile Customization States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileCompany, setProfileCompany] = useState(user?.company || '');
  const [profileJobTitle, setProfileJobTitle] = useState(user?.job_title || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Changing States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Sync user details to edit form
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileCompany(user.company || '');
      setProfileJobTitle(user.job_title || '');
    }
  }, [user]);
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
      text: "Hi, how can I help you?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatRef = useRef(null);

  // Mouse hover glow logic for luxury feel (Linear/Tesla)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.glow-card, .glass-premium');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      const dur = sessionType.id === 'custom' ? (parseFloat(customDuration) * 60 || 60) : sessionType.duration;
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
    
    if (!clean.includes(' ')) {
      const vowels = (clean.match(/[aeiou]/g) || []).length;
      if (clean.length > 7 && vowels <= 1) return true;
      if (/asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwerty|zxcv|yuiop|xcvb/i.test(clean)) return true;
    }
    
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
    setValidationError('');
    if (!agenda.trim()) {
      setValidationError("Please provide an Agenda topic first.");
      return;
    }
    if (!selectedDate || !selectedSlot) {
      setValidationError("Please lock in a coaching date and slot.");
      return;
    }
    if (meetType === 'custom_location' && !customLocationAddress.trim()) {
      setValidationError("Please specify your Preferred Location Address.");
      return;
    }
    setSubmitting(true);
    
    const startStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}T${selectedSlot.start}:00`;
    const endStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}T${selectedSlot.end}:00`;

    const dur = sessionType.id === 'custom' ? (parseFloat(customDuration) * 60 || 60) : sessionType.duration;
    const typeLabel = sessionType.id === 'custom' ? `Custom: ${customDuration} hrs` : sessionType.label;

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
        preferred_communication: meetType === 'custom_location' ? `custom_location: ${customLocationAddress.trim()}` : meetType,
        phone: phone || 'N/A'
      });

      if (res && res.success === false) {
        setValidationError(res.message || "This booking already exists!");
        return;
      }

      setBookingSuccess(true);
      await fetchData();
    } catch (err) {
      setValidationError(`Booking conflict or sync error: ${err.message}`);
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
    setMeetType('video');
    setCustomLocationAddress('');
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

  const handleAcceptReschedule = async (id) => {
    if (!window.confirm('Accept this proposed reschedule time and block the slot?')) return;
    setSubmitting(true);
    try {
      await api.confirmReschedule(id);
      alert('Reschedule confirmed! Calendar synced and slot blocked.');
      await fetchData();
    } catch (e) {
      alert(e.message || 'Failed to accept reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRescheduleClick = (meeting) => {
    setRescheduleMeeting(meeting);
    setRescheduleReason('');
    setRescheduleError('');
    if (meeting.start_time) {
      setClientRescheduleDate(meeting.start_time.split('T')[0]);
      const timePart = meeting.start_time.split('T')[1];
      if (timePart) {
        setClientRescheduleTime(timePart.slice(0, 5));
      }
    } else {
      setClientRescheduleDate('');
      setClientRescheduleTime('09:00');
    }
  };

  const submitReschedule = async () => {
    if (!clientRescheduleDate || !clientRescheduleTime) {
      setRescheduleError('Please choose a valid reschedule date and time.');
      return;
    }
    setSubmitting(true);
    setRescheduleError('');
    try {
      const duration = rescheduleMeeting.duration_minutes || 60;
      const startStr = `${clientRescheduleDate}T${clientRescheduleTime}:00`;
      
      const [year, month, day] = clientRescheduleDate.split('-').map(Number);
      const [hour, min] = clientRescheduleTime.split(':').map(Number);
      const startDate = new Date(year, month - 1, day, hour, min);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
      
      const pad = (num) => String(num).padStart(2, '0');
      const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

      await api.requestReschedule(rescheduleMeeting.id, {
        new_start_time: startStr,
        new_end_time: endStr,
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess(false);
    setProfileError('');
    try {
      const updatedUser = await api.updateProfile({
        name: profileName,
        phone: profilePhone,
        company: profileCompany,
        job_title: profileJobTitle
      });
      updateUser(updatedUser);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    setUpdatingPassword(true);
    setPwdSuccess(false);
    setPwdError('');
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="guided-workspace-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', fontFamily: "var(--font-body)", color: 'var(--color-text-primary)' }}>
      
      {/* ── VERTICAL FLOATING SIDEBAR ─────────────────────────────────────── */}
      <aside className={`sisu-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">SISU</h1>
          <p className="sidebar-subtitle">ELITE MENTORSHIP</p>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => { setActiveView('sessions'); setIsSidebarOpen(false); }}
            className={`sidebar-link ${activeView === 'sessions' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => { setActiveView('book'); setIsSidebarOpen(false); }}
            className={`sidebar-link ${activeView === 'book' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">calendar_today</span>
            <span>Schedule</span>
          </button>
          
          <button
            onClick={() => { setActiveView('settings'); setIsSidebarOpen(false); }}
            className={`sidebar-link ${activeView === 'settings' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="avatar-box" style={{ fontWeight: 800, fontSize: '13px' }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="profile-info">
              <p className="profile-name" style={{ textTransform: 'capitalize' }}>{user?.name || 'User'}</p>
              <p className="profile-role" style={{ textTransform: 'uppercase' }}>{user?.job_title || user?.role || 'CLIENT'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer toggle */}
      {isSidebarOpen && (
        <div className="sidebar-drawer-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── MAIN WORKSPACE AREA ───────────────────────────────────────────── */}
      <div className="main-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
        
        {/* HEADER BAR */}
        <header className="main-header glass-premium" style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="header-title" style={{ fontFamily: "var(--font-heading)", letterSpacing: '-0.02em', fontSize: 18 }}>
              {activeView === 'book' && 'Mentorship Planner'}
              {activeView === 'sessions' && 'Dashboard'}
              {activeView === 'settings' && 'Settings'}
            </h2>
          </div>

          <div className="header-actions">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="header-icon-btn"
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              {notifications.length > 0 && <span className="notif-badge" style={{ background: 'var(--color-red)' }} />}
            </button>

            <button onClick={logout} className="signout-btn" style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEW CONTENT */}
        <main style={{ flex: 1, padding: 'clamp(16px, 3vw, 32px)', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          <AnimatePresence mode="wait">
            
            {activeView === 'sessions' ? (
              /* DASHBOARD VIEW (SCHEDULED CALLS + G-CAL STATUS & PREP WIDGETS) */
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="dashboard-grid"
              >
                {/* Confirmed calls side */}
                <div className="dashboard-main-side" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="glass-premium" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}>Scheduled Mentorship Calls</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>Track approvals, access video room links, or request reschedule changes.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="skeleton-pulse" style={{ height: 100 }} />
                          <div className="skeleton-pulse" style={{ height: 100 }} />
                        </div>
                      ) : meetings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 16 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 12 }}>calendar_today</span>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>No Scheduled Sessions</p>
                          <p style={{ fontSize: 13, maxWidth: 300, margin: '0 auto' }}>Navigate to 'Schedule' in the sidebar to lock in your coaching slot!</p>
                        </div>
                      ) : (
                        meetings.map(m => {
                          const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
                          return (
                            <div key={m.id} className="glow-card" style={{ background: 'rgba(255,255,255,0.01)', border: `1px solid var(--color-border)`, borderRadius: 16, padding: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                <h4 style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>{m.title}</h4>
                                <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 100, border: `1px solid ${cfg.border}`, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                              </div>

                              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>calendar_today</span>
                                  {m.start_time ? format(parseISO(m.start_time), 'MMM d, yyyy · h:mm a') : '—'}
                                </p>
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>schedule</span>
                                  {m.meeting_type} ({m.duration_minutes}m)
                                </p>
                                {m.phone && m.phone !== 'N/A' && (
                                  <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>phone</span>
                                    {m.phone}
                                  </p>
                                )}
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
                                    {m.preferred_communication === 'video' ? 'videocam' : 
                                     m.preferred_communication === 'in_person' ? 'home_pin' : 'location_on'}
                                  </span>
                                  <span>
                                    {m.preferred_communication === 'video' ? 'Google Meet' : 
                                     m.preferred_communication === 'in_person' ? 'Spi Edge (In-Office)' : 
                                     m.preferred_communication?.startsWith('custom_location:') ? m.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'}
                                  </span>
                                </p>
                              </div>

                              {STATUS_HELPER_CONFIG[m.status] && (
                                <div style={{
                                  fontSize: '12.5px',
                                  color: 'var(--color-text-secondary)',
                                  marginBottom: '16px',
                                  padding: '10px 14px',
                                  borderRadius: '10px',
                                  background: STATUS_HELPER_CONFIG[m.status].bg,
                                  border: STATUS_HELPER_CONFIG[m.status].border,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: STATUS_HELPER_CONFIG[m.status].color }}>
                                    {STATUS_HELPER_CONFIG[m.status].icon}
                                  </span>
                                  <span>
                                    {STATUS_HELPER_CONFIG[m.status].text}
                                  </span>
                                </div>
                              )}

                              {(m.description || m.reason || m.admin_notes) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                                  {m.description && (
                                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                                      <strong>Description:</strong> {m.description}
                                    </p>
                                  )}
                                  {m.reason && (
                                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                                      <strong>Reason/Agenda:</strong> {m.reason}
                                    </p>
                                  )}
                                  {m.admin_notes && (
                                    <p style={{ fontSize: 13, color: 'var(--color-accent-cyan)', margin: 0 }}>
                                      <strong>Admin Feedback/Notes:</strong> {m.admin_notes}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 14, flexWrap: 'wrap', gap: 12 }}>
                                {m.meet_link ? (
                                  <a href={m.meet_link} target="_blank" rel="noreferrer" className="btn-premium btn-premium-primary" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, textDecoration: 'none' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span> Join Google Meet
                                  </a>
                                ) : (
                                  <div />
                                )}

                                <div style={{ display: 'flex', gap: 8 }}>
                                  {(m.status === 'pending' || m.status === 'approved') && (
                                    <>
                                      <button onClick={() => handleRescheduleClick(m)} className="btn-premium btn-premium-secondary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, color: 'var(--color-accent-orange)', borderColor: 'rgba(255, 122, 0, 0.15)' }}>Reschedule</button>
                                      <button onClick={() => handleCancelMeeting(m.id)} className="btn-premium btn-premium-danger" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}>Cancel</button>
                                    </>
                                  )}
                                  {m.status === 'reschedule_proposed' && (
                                    <>
                                      <button 
                                        onClick={() => handleAcceptReschedule(m.id)} 
                                        disabled={submitting}
                                        className="btn-premium btn-premium-primary" 
                                        style={{ 
                                          padding: '6px 14px', 
                                          fontSize: 12, 
                                          borderRadius: 8, 
                                          background: 'var(--color-green)', 
                                          borderColor: 'var(--color-green)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                        Accept & Block
                                      </button>
                                      <a 
                                        href="tel:+919876543210" 
                                        className="btn-premium btn-premium-secondary" 
                                        style={{ 
                                          padding: '6px 12px', 
                                          fontSize: 12, 
                                          borderRadius: 8, 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: 4, 
                                          textDecoration: 'none', 
                                          color: 'var(--color-accent-orange)', 
                                          borderColor: 'rgba(255, 122, 0, 0.15)' 
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
                                        Call (+91 98765 43210)
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Live G-Cal Status & checklist widgets */}
                <div className="dashboard-widgets-side">
                  
                  {/* 1. Connected Calendar Status */}
                  <div className="glass-premium" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#84CC16', boxShadow: '0 0 12px #84CC16', display: 'inline-block' }} />
                          G-Cal Sync Connected
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, marginTop: 4 }}>Last sync: {lastSyncTime}</p>
                      </div>
                      
                      <button
                        onClick={handleSyncCalendar}
                        disabled={syncingEvents}
                        className="btn-premium btn-premium-secondary"
                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8 }}
                      >
                        <span className={`material-symbols-outlined ${syncingEvents ? 'spin' : ''}`} style={{ fontSize: 14 }}>sync</span>
                        {syncingEvents ? 'Syncing...' : 'Sync'}
                      </button>
                    </div>
                  </div>

                  {/* 2. Today's G-Cal Schedule */}
                  <div className="glass-premium" style={{ padding: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>Today's G-Cal Schedule</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {todaySchedule.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.time}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 140, fontWeight: 500 }}>{item.title}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: item.busy ? 'rgba(239,68,68,0.08)' : 'rgba(132,204,22,0.08)', color: item.busy ? '#ef4444' : '#84CC16', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{item.busy ? 'Busy' : 'Free'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Pre-Session Prep Checklist */}
                  <div className="glass-premium" style={{ padding: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>Pre-Session Preparation</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div onClick={() => setPrepChecklist(prev => ({ ...prev, crm: !prev.crm }))} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${prepChecklist.crm ? 'var(--color-accent)' : 'var(--color-border)'}`, background: prepChecklist.crm ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)' }}>
                          {prepChecklist.crm && <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>done</span>}
                        </div>
                        <span style={{ fontSize: 13, color: prepChecklist.crm ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>CRM screenshots ready</span>
                      </div>

                      <div onClick={() => setPrepChecklist(prev => ({ ...prev, metrics: !prev.metrics }))} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${prepChecklist.metrics ? 'var(--color-accent)' : 'var(--color-border)'}`, background: prepChecklist.metrics ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)' }}>
                          {prepChecklist.metrics && <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>done</span>}
                        </div>
                        <span style={{ fontSize: 13, color: prepChecklist.metrics ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>Metrics spreadsheet complete</span>
                      </div>

                      <div onClick={() => setPrepChecklist(prev => ({ ...prev, funnel: !prev.funnel }))} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${prepChecklist.funnel ? 'var(--color-accent)' : 'var(--color-border)'}`, background: prepChecklist.funnel ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)' }}>
                          {prepChecklist.funnel && <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>done</span>}
                        </div>
                        <span style={{ fontSize: 13, color: prepChecklist.funnel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>Funnel leakage analysis screens</span>
                      </div>

                      <div onClick={() => setPrepChecklist(prev => ({ ...prev, scripts: !prev.scripts }))} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${prepChecklist.scripts ? 'var(--color-accent)' : 'var(--color-border)'}`, background: prepChecklist.scripts ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)' }}>
                          {prepChecklist.scripts && <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>done</span>}
                        </div>
                        <span style={{ fontSize: 13, color: prepChecklist.scripts ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'var(--transition-fast)' }}>Outreach cold templates ready</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Sync & Meet Status Tracker */}
                  <div className="glass-premium" style={{ padding: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>Sync & Meet Status</span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#84CC16', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span>
                        <span>Session Request Sent</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#84CC16', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span>
                        <span>G-Cal Calendar Synced</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#84CC16', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span>
                        <span>Google Meet link generated</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: (prepChecklist.crm && prepChecklist.metrics) ? '#84CC16' : 'var(--color-accent-orange)', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{(prepChecklist.crm && prepChecklist.metrics) ? 'task_alt' : 'pending'}</span>
                        <span>{(prepChecklist.crm && prepChecklist.metrics) ? 'Prep Complete' : 'Prep Pending'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

            ) : bookingSuccess ? (
              /* SUCCESS STATE */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ maxWidth: 540, margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', textAlign: 'center' }}
                className="glass-premium"
              >
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(132,204,22,0.1)', border: '2px solid var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 0 24px rgba(132,204,22,0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-green)' }}>done</span>
                </div>
                
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}>Coaching Slot Requested</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, maxWidth: 360, lineHeight: 1.6, marginBottom: 32 }}>
                  Your session request for "{agenda}" has been queued. Tharun will align schedules and trigger Google Meet links.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
                  <button onClick={() => { setActiveView('sessions'); setBookingSuccess(false); }} className="btn-premium btn-premium-secondary" style={{ flex: 1, minWidth: 160 }}>
                    View Scheduled Calls
                  </button>
                  <button onClick={handleResetBooking} className="btn-premium btn-premium-primary" style={{ flex: 1, minWidth: 160 }}>
                    Book Another Call
                  </button>
                </div>
              </motion.div>

            ) : activeView === 'settings' ? (
              /* SETTINGS VIEW */
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="settings-container"
              >
                <div className="settings-card glass-premium">
                  <h3 className="settings-card-title" style={{ fontFamily: 'var(--font-heading)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent-cyan)', fontSize: 20 }}>sync</span>
                    Google Calendar Integration
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: 20, borderRadius: 12, border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Sync Account Connected</p>
                      <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0, marginTop: 4 }}>Linked with G-Suite calendar: <strong>{user?.email || 'vikas@sisu.elite'}</strong></p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-green)', background: 'rgba(132,204,22,0.1)', padding: '4px 12px', borderRadius: 100, border: '1px solid rgba(132,204,22,0.2)', fontFamily: 'var(--font-mono)' }}>CONNECTED</span>
                  </div>
                </div>

                {/* Profile Customization Section */}
                <div className="settings-card glass-premium">
                  <h3 className="settings-card-title" style={{ fontFamily: 'var(--font-heading)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: 20 }}>person</span>
                    Profile Customization
                  </h3>
                  {profileSuccess && (
                    <div style={{ color: '#22c55e', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                      <span>Profile updated successfully!</span>
                    </div>
                  )}
                  {profileError && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                      <span>{profileError}</span>
                    </div>
                  )}
                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Full Name</label>
                        <input type="text" className="input-premium" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Phone Number</label>
                        <input type="text" className="input-premium" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Company</label>
                        <input type="text" className="input-premium" value={profileCompany} onChange={(e) => setProfileCompany(e.target.value)} placeholder="e.g. Sisu Enterprises" />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Job Title</label>
                        <input type="text" className="input-premium" value={profileJobTitle} onChange={(e) => setProfileJobTitle(e.target.value)} placeholder="e.g. Managing Director" />
                      </div>
                    </div>
                    <button type="submit" disabled={updatingProfile} className="btn-premium btn-premium-primary" style={{ alignSelf: 'flex-start', minWidth: 140 }}>
                      {updatingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>
                </div>

                {/* Password Customization Section */}
                <div className="settings-card glass-premium">
                  <h3 className="settings-card-title" style={{ fontFamily: 'var(--font-heading)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fb923c', fontSize: 20 }}>lock</span>
                    Change Password
                  </h3>
                  {pwdSuccess && (
                    <div style={{ color: '#22c55e', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                      <span>Password changed successfully!</span>
                    </div>
                  )}
                  {pwdError && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                      <span>{pwdError}</span>
                    </div>
                  )}
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Current Password</label>
                        <input type="password" className="input-premium" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>New Password</label>
                        <input type="password" className="input-premium" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Confirm New Password</label>
                        <input type="password" className="input-premium" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" disabled={updatingPassword} className="btn-premium btn-premium-primary" style={{ alignSelf: 'flex-start', minWidth: 140 }}>
                      {updatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </motion.div>

            ) : (
              /* ORIGINAL UNIFIED SINGLE-STEP BOOKING CARD */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="apple-booking-card-wrapper"
              >
                <div className="apple-booking-card glass-premium" style={{ width: '100%', padding: 'clamp(20px, 4vw, 32px)', color: 'var(--color-text-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 20, marginBottom: 24 }}>
                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}>Mentorship Booking Planner</h3>
                      <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', margin: 0, marginTop: 6 }}>Complete parameters in a single screen to secure your executive coaching slot.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.2)', padding: '6px 12px', borderRadius: 20, color: 'var(--color-green)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync_saved_locally</span>
                      <span>G-Cal Connected</span>
                    </div>
                  </div>

                  {validationError && (
                    <div className="error-banner" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="booking-card-grid">
                    {/* LEFT SIDE: INPUT FORM FIELDS */}
                    <div className="booking-form-side">
                      <div>
                        <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>1. Agenda</label>
                        <input
                          className="input-premium"
                          type="text"
                          placeholder="e.g. Auditing outbound sales pipeline and optimizing customer SOPs..."
                          value={agenda}
                          onChange={(e) => setAgenda(e.target.value)}
                        />
                      </div>

                      <div className="apple-form-header-grid">
                        <div>
                          <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>2. Duration</label>
                          <select className="input-premium" value={sessionType.id} onChange={(e) => handleSelectType(SESSION_TYPES.find(s => s.id === e.target.value))} style={{ appearance: 'none', cursor: 'pointer' }}>
                            {SESSION_TYPES.map(t => (
                              <option key={t.id} value={t.id} style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>{t.label} {t.id === 'custom' ? '' : `(${t.duration} mins)`}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 800, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>3. Channel</label>
                          <select className="input-premium" value={meetType} onChange={(e) => setMeetType(e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
                            <option value="video" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>Google Meet (Online Video)</option>
                            <option value="in_person" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>Spi Edge (Inoffice Meet)</option>
                            <option value="custom_location" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>Preferred Location</option>
                          </select>
                          {meetType === 'custom_location' && (
                            <div style={{ marginTop: 12 }}>
                              <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 800, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Address / Location Name *</label>
                              <input
                                type="text"
                                className="input-premium"
                                placeholder="e.g. Starbucks, Jubilee Hills, Hyderabad..."
                                value={customLocationAddress}
                                onChange={(e) => setCustomLocationAddress(e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                        <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 800, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>4. Select Coaching Date & Time Slot</label>
                        
                        <div className="apple-calendar-grid-container">
                          
                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
                            <AppleCalendarWidget
                              onDateSelect={handleSelectDate}
                              selectedDate={selectedDate}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: 'center', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                              {selectedDate ? (sessionType.id === 'custom' ? 'Custom Time & Duration' : `Available slots (${sessionType.duration}m)`) : 'Choose a date first'}
                            </p>

                            <div className="apple-slots-grid" style={{ flex: 1, overflowY: 'auto', maxHeight: 220, paddingRight: 4 }}>
                              {!selectedDate ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 10, padding: 16 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 24, marginBottom: 8 }}>event_available</span>
                                  <span style={{ fontSize: 12, lineHeight: 1.5 }}>Pick a date on the calendar to unlock coaching slots.</span>
                                </div>
                              ) : sessionType.id === 'custom' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Custom Time (IST)</label>
                                    <input
                                      type="text"
                                      className="input-premium"
                                      placeholder="e.g. 5:30 PM or 17:30"
                                      value={customTime}
                                      onChange={(e) => {
                                        setCustomTime(e.target.value);
                                        const parsedSlot = parseCustomTimeToSlot(e.target.value, (parseFloat(customDuration) * 60) || 60);
                                        if (parsedSlot) {
                                          setSelectedSlot(parsedSlot);
                                        } else {
                                          setSelectedSlot(null);
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Custom Duration (hours)</label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      className="input-premium"
                                      placeholder="e.g. 1 or 1.5"
                                      value={customDuration}
                                      onChange={(e) => {
                                        const dur = e.target.value;
                                        setCustomDuration(dur);
                                        const parsedSlot = parseCustomTimeToSlot(customTime, (parseFloat(dur) * 60) || 60);
                                        if (parsedSlot) {
                                          setSelectedSlot(parsedSlot);
                                        }
                                      }}
                                    />
                                  </div>
                                  {selectedSlot && (
                                    <div style={{ fontSize: 12, color: 'var(--color-green)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span>
                                      Slot parsed: {selectedSlot.start} to {selectedSlot.end} IST
                                    </div>
                                  )}
                                </div>
                              ) : loadingSlots ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--color-text-muted)' }}>
                                  <div className="apple-spinner" />
                                  <span style={{ fontSize: 12 }}>Syncing...</span>
                                </div>
                              ) : availableSlots.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--color-text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                                  No slots left. Pick another date.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {availableSlots.map((slot) => {
                                    const isSelected = selectedSlot?.label === slot.label;
                                    return (
                                      <button
                                        key={slot.label}
                                        type="button"
                                        onClick={() => handleSelectSlot(slot)}
                                        className={`apple-slot-pill ${isSelected ? 'selected' : ''}`}
                                      >
                                        <span>{slot.label}</span>
                                        {isSelected && <span style={{ fontSize: 9, fontWeight: 800, background: 'white', color: 'black', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Locked</span>}
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
                          <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>5. Description</label>
                          <textarea
                            className="input-premium"
                            style={{ height: 38, minHeight: 38, maxHeight: 120, resize: 'vertical' }}
                            placeholder="e.g. Discussing outbound roadmap & scaling SDR metrics..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>6. Phone Number</label>
                          <input
                            type="tel"
                            className="input-premium"
                            placeholder="e.g. +91 9876543210..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE: LIVE SUMMARY & ACTION BUTTON */}
                    <div className="booking-summary-side">
                      <div className="summary-sticky-card glass-premium">
                        <p className="summary-title" style={{ fontFamily: 'var(--font-mono)' }}>Mentorship Call Summary</p>
                        
                        <div className="summary-details">
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, gap: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Focus</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agenda.trim() ? `"${agenda}"` : 'Awaiting Agenda...'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, gap: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Duration</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{sessionType.id === 'custom' ? `${customDuration || '1'} hrs (Custom)` : sessionType.label}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, gap: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Slot</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-accent-cyan)' }}>
                              {selectedDate && selectedSlot ? (
                                `${new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedSlot.label}`
                              ) : (
                                'Awaiting selection...'
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, gap: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Channel</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {meetType === 'video' ? 'Google Meet' : 
                               meetType === 'in_person' ? 'Spi Edge (In-Office)' : 
                               `Custom: ${customLocationAddress || 'Preferred Location'}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, gap: 12 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Phone</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{phone || 'Not provided'}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Description</span>
                            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 12, lineHeight: 1.4, wordBreak: 'break-all' }}>{description.trim() ? description : 'No description provided'}</span>
                          </div>
                        </div>

                        <button
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                          className="summary-submit-btn btn-premium btn-premium-primary"
                          style={{ margin: 0, marginTop: 24 }}
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
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Reschedule Request Modal */}
      {rescheduleMeeting && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal glass-premium-strong"
            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', maxWidth: 440, padding: 28 }}
          >
            <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Request Reschedule</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Proposed for "{rescheduleMeeting.title}"</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>New Date</label>
                <input
                  className="input-premium"
                  type="date"
                  value={clientRescheduleDate}
                  onChange={(e) => setClientRescheduleDate(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>New Start Time (IST)</label>
                <select
                  className="input-premium"
                  value={clientRescheduleTime}
                  onChange={(e) => setClientRescheduleTime(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', appearance: 'none', cursor: 'pointer' }}
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot.value} value={slot.value} style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Reason for Change (Optional)</label>
              <textarea
                rows={3}
                placeholder="Write back to Tharun..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="input-premium"
                style={{ resize: 'none', width: '100%', background: 'rgba(0,0,0,0.2)' }}
              />
            </div>

            {rescheduleError && (
              <p style={{ color: '#ef4444', fontSize: 12.5, marginBottom: 16, fontWeight: 600 }}>{rescheduleError}</p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button onClick={() => setRescheduleMeeting(null)} disabled={submitting} className="btn-premium btn-premium-ghost" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={submitReschedule} disabled={submitting} className="btn-premium btn-premium-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── FLOATING APPLE-STYLE AI CHATBOT CONCIERGE WIDGET ──────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="apple-chatbot-trigger"
          style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>
            {showChatbot ? 'close' : 'smart_toy'}
          </span>
          {!showChatbot && messages.length > 0 && (
            <span className="pulse-dot" style={{ background: 'var(--color-red)' }} />
          )}
        </button>

        <AnimatePresence>
          {showChatbot && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="apple-chatbot-bubble glass-premium-strong"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', width: 340, height: 460 }}
            >
              <div className="chatbot-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent-cyan)' }}>smart_toy</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>SISU AI Concierge</p>
                    <p style={{ fontSize: 10, color: '#84CC16', margin: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ width: 6, height: 6, background: '#84CC16', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #84CC16' }} /> Live Agent
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowChatbot(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div ref={chatRef} className="chatbot-messages">
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', gap: 8, maxWidth: '85%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: msg.sender === 'user' ? 'var(--color-accent)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {msg.sender === 'user' ? (
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>{user?.name?.[0] || 'V'}</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>smart_toy</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, lineHeight: 1.4, background: msg.sender === 'user' ? 'var(--color-accent)' : 'var(--color-surface-3)', border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)', color: 'var(--color-text-primary)', whiteSpace: 'pre-line' }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>smart_toy</span>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', display: 'flex', gap: 3, alignItems: 'center' }}>
                      <span className="typing-dot" style={{ width: 4, height: 4 }} />
                      <span className="typing-dot" style={{ width: 4, height: 4, animationDelay: '0.2s' }} />
                      <span className="typing-dot" style={{ width: 4, height: 4, animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto', background: 'var(--color-surface-2)' }}>
                <button
                  onClick={() => handleSuggestionClick('how_to_book')}
                  style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  📖 How to book?
                </button>
                <button
                  onClick={() => handleSuggestionClick('roadmap')}
                  style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  🗺️ Outbound Roadmap
                </button>
              </div>

              <form onSubmit={handleChatSubmit} style={{ padding: 12, borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '3px 3px 3px 10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Type custom details or ask AI..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', outline: 'none', fontSize: 12 }}
                  />
                  <button type="submit" disabled={!chatInput.trim() || isAiTyping} style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--color-accent)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNotificationsDropdown && (
          <>
            <div className="notifications-backdrop" onClick={() => setShowNotificationsDropdown(false)} />
            <motion.div
              className="notifications-dropdown glass-premium-strong"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: 18 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Notifications</span>
                {notifications.length > 0 && (
                  <button onClick={handleMarkAllNotificationsRead} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Mark all read</button>
                )}
              </div>
              
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>All caught up!</p>
                ) : (
                  notifications.map(n => (
                    <div
                       key={n.id}
                       onClick={() => handleMarkNotificationRead(n.id)}
                       style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', transition: 'var(--transition-fast)' }}
                       onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-border-hover)'}
                       onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{n.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0, lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        /* ── SISU vertical sidebar styles ── */
        .sisu-sidebar {
          width: var(--sidebar-width);
          background: var(--color-surface-3);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: 28px 0;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 250;
          transition: transform 0.4s var(--ease-out-expo);
          font-family: var(--font-mono);
        }

        .sidebar-header {
          padding: 0 24px;
          margin-bottom: 36px;
        }

        .sidebar-logo {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.05em;
          color: var(--color-text-primary);
          margin: 0;
        }

        .sidebar-subtitle {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin: 6px 0 0 0;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 13.5px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: var(--transition-fast);
          border-left: 3px solid transparent;
          font-family: inherit;
        }

        .sidebar-link:hover {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        html.light .sidebar-link:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .sidebar-link.active {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.04);
          border-left: 3px solid var(--color-accent);
          font-weight: 700;
        }
        html.light .sidebar-link.active {
          background: rgba(0, 0, 0, 0.04);
        }

        .sidebar-link span.material-symbols-outlined {
          font-size: 20px;
        }

        .sidebar-footer {
          padding: 20px 24px 0 24px;
          border-top: 1px solid var(--color-border);
        }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-box {
          width: 36px;
          height: 36px;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          font-weight: 800;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
        }

        .profile-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .profile-role {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin: 2px 0 0 0;
        }

        /* ── Header bar styles ── */
        .main-header {
          height: var(--header-height);
          background: var(--color-surface-3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .sidebar-toggle-btn {
          display: none;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          display: none;
          align-items: center;
          justify-content: center;
        }

        .header-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-icon-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          transition: var(--transition-fast);
        }

        .header-icon-btn:hover {
          color: var(--color-text-primary);
        }

        .notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 0 8px var(--color-red);
        }

        .signout-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 13px;
          padding: 7px 14px;
          border-radius: 8px;
          transition: var(--transition-fast);
        }

        .signout-btn:hover {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--color-border-hover);
        }

        .notifications-backdrop {
          position: fixed;
          inset: 0;
          z-index: 290;
          background: transparent;
        }

        .notifications-dropdown {
          position: fixed;
          top: calc(var(--header-height) - 4px);
          right: 28px;
          width: 320px;
          box-shadow: var(--shadow-lg);
          z-index: 300;
        }

        @media (max-width: 768px) {
          .notifications-backdrop {
            background: rgba(4, 4, 8, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .notifications-dropdown {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: auto !important;
            width: calc(100% - 32px) !important;
            max-width: 360px !important;
            height: fit-content !important;
            max-height: 80vh !important;
          }
        }

        /* ── Sidebar Mobile Drawer Styles ── */
        @media (max-width: 1024px) {
          .sisu-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            z-index: 250;
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.7);
          }

          .sisu-sidebar.open {
            transform: translateX(0);
          }

          .sidebar-toggle-btn {
            display: flex;
          }

          .sidebar-drawer-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 240;
          }

          .main-content-area {
            margin-left: 0 !important;
          }
        }

        /* ── Booking Form side-by-side styles ── */
        .booking-card-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 32px;
        }

        .booking-form-side {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .booking-summary-side {
          position: relative;
        }

        .summary-sticky-card {
          border-radius: var(--radius-lg);
          padding: 24px;
          position: sticky;
          top: 24px;
        }

        .summary-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          font-weight: 800;
          margin-top: 0;
          margin-bottom: 16px;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-submit-btn {
          width: 100%;
          margin-top: 24px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 10px;
          cursor: pointer;
        }

        /* ── Dashboard Grid ── */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
        }

        .dashboard-main-side {
          display: flex;
          flex-direction: column;
        }

        .dashboard-widgets-side {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── Settings View ── */
        .settings-container {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-card {
          border-radius: 16px;
          padding: 24px;
        }

        .settings-card-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-top: 0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .apple-booking-card-wrapper {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apple-booking-card {
          border-radius: var(--radius-xl);
          padding: 32px;
          box-shadow: var(--shadow-lg);
        }

        .apple-slot-pill {
          width: 100%;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: rgba(255, 255, 255, 0.01);
          color: var(--color-text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: var(--transition-fast);
        }

        .apple-slot-pill:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--color-border-hover);
          color: var(--color-text-primary);
        }

        .apple-slot-pill.selected {
          border-color: var(--color-accent) !important;
          background: var(--color-accent) !important;
          color: white !important;
        }

        .apple-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
        }

        .spin {
          animation: rotation 1.2s infinite linear;
        }
        @keyframes rotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .apple-chatbot-trigger {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s var(--ease-out-expo);
          position: relative;
        }

        .apple-chatbot-trigger:hover {
          transform: scale(1.08) translateY(-2px);
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
          border-radius: 50%;
          border: 2px solid var(--color-bg);
          animation: pulse-glow 1.5s infinite;
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .apple-chatbot-bubble {
          position: fixed;
          bottom: 88px;
          right: 24px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          border-radius: var(--radius-lg);
        }

        .chatbot-header {
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.01);
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
          width: 4.5px;
          height: 4.5px;
          border-radius: 50%;
          background: var(--color-text-muted);
          animation: dot-bounce 1.2s infinite alternate;
        }

        @keyframes dot-bounce {
          to { transform: translateY(-3.5px); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
        }

        /* ── RESPONSIVENESS OVERRIDES ── */
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
          border-top: 1px solid var(--color-border);
          padding-top: 20px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .booking-card-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .apple-form-header-grid,
          .apple-calendar-grid-container,
          .apple-form-footer-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .booking-summary-side {
            order: 2; /* flows submit button below */
          }
          .booking-form-side {
            order: 1;
          }
        }
      `}</style>

    </div>
  );
}

// ── APPLE CALENDAR WIDGET ──
function AppleCalendarWidget({ onDateSelect, selectedDate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [signals, setSignals] = useState({});

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    api.getCalendarSignals()
      .then(data => {
        setSignals(data || {});
      })
      .catch(err => console.error("Failed to fetch calendar signals:", err));
  }, [viewMonth, viewYear]);

  const getAvailabilityState = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateData = signals[dateStr];
    if (dateData) {
      if (dateData.signal === "red") return 'booked';
      if (dateData.signal === "yellow") return 'limited';
      if (dateData.signal === "green") return 'available';
    }
    return 'available';
  };

  return (
    <div className="apple-cal">
      <div className="apple-cal-nav">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} type="button">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <p className="apple-month-title">{monthName}</p>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} type="button">
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
          
          // If date is set to red/booked, we do not show the date at all!
          if (state === 'booked') {
            return <div key={day} style={{ aspectRatio: 1.1 }} />;
          }
          
          let dotColor = '#84CC16'; // Green available
          if (state === 'limited') dotColor = '#fb923c'; // Orange limited
          if (state === 'busy') dotColor = '#ef4444'; // Red busy

          return (
            <button
              key={day}
              disabled={isPast}
              onClick={() => onDateSelect(viewYear, viewMonth, day)}
              className={`apple-day-btn ${isPast ? 'past' : ''} ${isCurrentToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              type="button"
            >
              <span className="apple-day-number">{day}</span>
              {!isPast && !isSelected && (
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
          margin-bottom: 16px;
          padding: 0 4px;
        }

        .apple-cal-nav button {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .apple-cal-nav button:hover {
          border-color: var(--color-border-hover);
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .apple-cal-nav button span {
          font-size: 16px;
        }

        .apple-month-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
          font-family: var(--font-heading);
        }

        .apple-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .apple-header-day {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          padding-bottom: 8px;
          text-align: center;
          font-family: var(--font-mono);
        }

        .apple-day-btn {
          aspect-ratio: 1.1;
          border: 1px solid transparent;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 12.5px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .apple-day-btn:hover:not(.past) {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--color-border);
          color: var(--color-text-primary);
        }

        .apple-day-btn.past {
          color: var(--color-text-muted);
          cursor: default;
          opacity: 0.25;
        }

        .apple-day-btn.today {
          border-color: var(--color-accent);
          color: var(--color-accent);
          font-weight: 800;
        }

        .apple-day-btn.selected {
          background: var(--color-text-primary) !important;
          color: var(--color-bg) !important;
          border-color: transparent !important;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
        }

        .apple-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
