import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

// Helper to generate context-relevant transcripts and takeaways dynamically based on the meeting title
function getSimulatedOtterData(title = "") {
  const t = title.toLowerCase();
  
  if (t.includes("sales") || t.includes("marketing") || t.includes("customer") || t.includes("growth")) {
    return {
      takeaways: [
        "Focus on building a scalable 3-step outbound sales funnel.",
        "Implement a tiered commission plan for the new hires: 10% base + 5% accelerator.",
        "Set up HubSpot CRM pipeline with standard stages: Lead, Demo, Proposal, Closed.",
        "Target mid-market SaaS companies in the Southeast region as prime ICP."
      ],
      transcript: [
        { speaker: "Tharun (Mentor)", time: "01:22", text: "To really scale sales, you cannot rely on founders doing all closing. We must establish a clear playbook." },
        { speaker: "Client", time: "02:40", text: "Right now, I am spending 80% of my day in sales demos. How do I transition out of it?" },
        { speaker: "Tharun (Mentor)", time: "03:15", text: "First, document every single question you get. Build an internal FAQ. Next, hire an SDR to filter leads and do first-level qualification." },
        { speaker: "Client", time: "05:10", text: "What about the commission structure? What standard rate should I use?" },
        { speaker: "Tharun (Mentor)", time: "06:05", text: "We use a 10% base commission. If they hit 120% of quota, accelerate it to 15%. This keeps high-performers incentivized." }
      ]
    };
  } else if (t.includes("product") || t.includes("tech") || t.includes("code") || t.includes("mvp")) {
    return {
      takeaways: [
        "Simplify the MVP to only one core feature: the interactive slot booking scheduler.",
        "Use React + TailwindCSS + FastAPI for fast iteration cycles.",
        "Host database on Managed MySQL instead of self-hosting to prevent scaling lags.",
        "Prepare for user onboarding tests next Monday with 5 key pilot entrepreneur clients."
      ],
      transcript: [
        { speaker: "Tharun (Mentor)", time: "00:45", text: "Your product has 10 features, but your clients only use one. Cut the noise and focus on the core value." },
        { speaker: "Client", time: "01:30", text: "But our clients said they want dashboard notes and calendar widgets too!" },
        { speaker: "Tharun (Mentor)", time: "02:10", text: "Yes, but those are supplementary. Make the booking flow bulletproof first. Keep notes simple and highly integrated." },
        { speaker: "Client", time: "03:40", text: "Got it. We will host on AWS with automated deployment scripts." },
        { speaker: "Tharun (Mentor)", time: "04:15", text: "Keep hosting cheap. A simple VPS is enough for the first 100 paid users. Save resources for marketing." }
      ]
    };
  }

  // General fallback mentorship data
  return {
    takeaways: [
      "Review pricing structure: shift from hourly consulting to monthly Rs. 15,000 package.",
      "Incorporate standard RATS (Relevance, Authority, Trust, Scale) steps in all client proposals.",
      "Block off three hours every Wednesday morning for high-focus strategy planning.",
      "Send updated client list and monthly MRR goals before the next strategic call."
    ],
    transcript: [
      { speaker: "Tharun (Mentor)", time: "01:05", text: "Welcome to today's review session. Let's start with your current pricing model. Are you still billing by the hour?" },
      { speaker: "Client", time: "01:50", text: "Yes, we bill Rs. 2,500 per hour. But clients keep questioning our timesheets." },
      { speaker: "Tharun (Mentor)", time: "02:30", text: "Stop doing that immediately. Switch to a fixed Rs. 15,000 monthly package. Focus on results and value, not hours spent." },
      { speaker: "Client", time: "04:12", text: "That makes complete sense. It also helps project monthly recurring revenues far better." },
      { speaker: "Tharun (Mentor)", time: "05:00", text: "Exactly. It aligns your incentives with theirs. Go back and update all current proposals using this framework." }
    ]
  };
}

export default function OtterMeetingNotesModal({ meeting, onClose }) {
  const [activeTab, setActiveTab] = useState('takeaways'); // 'takeaways', 'transcript', 'notes'
  const [notesText, setNotesText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const data = getSimulatedOtterData(meeting?.title);

  useEffect(() => {
    if (meeting) {
      setNotesText(meeting.otter_notes || '');
      setSaveSuccess(false);
    }
  }, [meeting]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateOtterNotes(meeting.id, notesText);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      // Update meeting object locally
      meeting.otter_notes = notesText;
    } catch (e) {
      alert("Failed to save notes: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!meeting) return null;

  return (
    <div className="otter-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="otter-modal"
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      >
        {/* Modal Header */}
        <div className="otter-header">
          <div className="otter-title-row">
            <span className="material-symbols-outlined otter-main-icon">graphic_eq</span>
            <div>
              <h2 className="title">Otter AI Meeting Companion</h2>
              <p className="subtitle">Real-time Call Notes & Action Items</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Audio Visualizer Card ( premium aesthetic) */}
        <div className="audio-visualizer-card">
          <div className="viz-header">
            <div className="pulsing-red-dot" />
            <p className="status-label">{meeting.status === 'completed' ? 'CALL COMPLETED · AI TRANSCRIPTION SYNCED' : 'LIVE TRANSCRIPTION READY'}</p>
          </div>
          <div className="waveforms-row">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((bar) => (
              <div
                key={bar}
                className="wave-bar"
                style={{
                  height: `${10 + Math.random() * 35}px`,
                  animationDelay: `${bar * 0.08}s`
                }}
              />
            ))}
          </div>
          <p className="meeting-summary-info">
            Meeting: <strong>{meeting.title}</strong> · {meeting.duration_minutes} mins · {meeting.display_date || 'N/A'}
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="otter-tabs">
          {[
            { id: 'takeaways', label: 'AI Key Takeaways', icon: 'auto_awesome' },
            { id: 'transcript', label: 'Chronological Transcript', icon: 'receipt_long' },
            { id: 'notes', label: 'Interactive Meeting Notes', icon: 'edit_note' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="otter-tab-content">
          {activeTab === 'takeaways' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="takeaways-list">
              <h3 className="section-title">Smart Action Items & Priorities</h3>
              {data.takeaways.map((item, i) => (
                <div key={i} className="takeaway-card">
                  <div className="takeaway-bullet">
                    <span className="material-symbols-outlined check-icon">assignment_turned_in</span>
                  </div>
                  <p className="takeaway-text">{item}</p>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'transcript' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transcript-box">
              <h3 className="section-title">Simulated Call Transcript</h3>
              <div className="messages-list">
                {data.transcript.map((line, i) => (
                  <div key={i} className="transcript-line">
                    <div className="line-meta">
                      <span className="speaker">{line.speaker}</span>
                      <span className="timestamp">{line.time}</span>
                    </div>
                    <p className="line-text">{line.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="notes-box">
              <div className="notes-header">
                <h3 className="section-title">Personal Session Notes</h3>
                <span className="sync-status-label">
                  <span className="material-symbols-outlined cloud-icon">cloud_sync</span>
                  Auto-sync Enabled
                </span>
              </div>
              <textarea
                className="notes-textarea"
                placeholder="Type your strategic focus areas, personal goals, or feedback here during or after your mentorship call..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
              <div className="notes-footer">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="save-success-badge"
                    >
                      <span className="material-symbols-outlined icon">check_circle</span> Saved to Dashboard!
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  className="save-btn"
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                >
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? 'Saving Notes...' : 'Save Notes'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <style>{`
        .otter-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 8, 14, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .otter-modal {
          width: 100%;
          maxWidth: 620px;
          background: #0E0F1A;
          border: 1px solid #1F2232;
          borderRadius: 24px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-height: 90vh;
          overflow-y: auto;
          color: #E2E8F0;
          font-family: 'Inter', sans-serif;
        }

        .otter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .otter-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .otter-main-icon {
          font-size: 28px;
          color: #00C2FF;
          background: rgba(0, 194, 255, 0.1);
          padding: 8px;
          border-radius: 12px;
        }

        .otter-header .title {
          font-size: 16.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .otter-header .subtitle {
          font-size: 11px;
          color: #64748B;
          margin-top: 2px;
        }

        .close-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid #1F2232;
          color: #64748B;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: white;
          border-color: #EF4444;
          background: rgba(239, 68, 68, 0.1);
        }

        /* Audio Visualizer Styles */
        .audio-visualizer-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid #1C1E2D;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .viz-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pulsing-red-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #EF4444;
          box-shadow: 0 0 8px #EF4444;
          animation: pulse-dot 1.5s infinite;
        }

        .status-label {
          font-size: 10px;
          letter-spacing: 1px;
          font-weight: 800;
          color: #EF4444;
        }

        .waveforms-row {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .wave-bar {
          width: 4px;
          background: linear-gradient(to top, #6C63FF, #00C2FF);
          border-radius: 100px;
          animation: waveform-jump 0.6s ease-in-out infinite alternate;
        }

        .meeting-summary-info {
          font-size: 11.5px;
          color: #64748B;
          margin: 0;
        }

        /* Tabs Styles */
        .otter-tabs {
          display: flex;
          gap: 6px;
          background: #090A11;
          padding: 4px;
          border-radius: 14px;
          border: 1px solid #191B29;
        }

        .tab-btn {
          flex: 1;
          padding: 10px 0;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #8A91A5;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: white;
        }

        .tab-btn.active {
          background: #141624;
          color: #00C2FF;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        .tab-btn .icon {
          font-size: 16px;
        }

        /* Tab Content Styles */
        .otter-tab-content {
          background: #090A11;
          border: 1px solid #1C1E2D;
          border-radius: 18px;
          padding: 18px;
          min-height: 250px;
          max-height: 380px;
          overflow-y: auto;
        }

        .section-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 16px;
          letter-spacing: 0.2px;
        }

        /* Takeaways list styles */
        .takeaways-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .takeaway-card {
          display: flex;
          gap: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid #191B29;
          padding: 12px 14px;
          border-radius: 12px;
          align-items: center;
        }

        .takeaway-bullet {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .takeaway-bullet .check-icon {
          font-size: 15px;
          color: #10B981;
        }

        .takeaway-text {
          font-size: 12.5px;
          color: #E2E8F0;
          margin: 0;
          line-height: 1.45;
        }

        /* Transcript list styles */
        .transcript-box {
          display: flex;
          flex-direction: column;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .transcript-line {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.02);
        }

        .transcript-line:last-child {
          border-bottom: none;
        }

        .line-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .line-meta .speaker {
          font-size: 12px;
          font-weight: 700;
          color: #00C2FF;
        }

        .line-meta .timestamp {
          font-size: 10px;
          color: #64748B;
        }

        .line-text {
          font-size: 13px;
          color: #BAC2DE;
          line-height: 1.5;
          margin: 0;
        }

        /* Notes Box Styles */
        .notes-box {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .sync-status-label {
          font-size: 11px;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .cloud-icon {
          font-size: 14px;
          color: #00C2FF;
        }

        .notes-textarea {
          width: 100%;
          min-height: 160px;
          background: #0E0F1A;
          border: 1px solid #1F2232;
          border-radius: 12px;
          color: white;
          padding: 14px;
          font-size: 13px;
          font-family: inherit;
          resize: none;
          box-sizing: border-box;
          outline: none;
          line-height: 1.6;
        }

        .notes-textarea:focus {
          border-color: #6C63FF;
        }

        .notes-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
        }

        .save-btn {
          padding: 10px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6C63FF, #00C2FF);
          border: none;
          color: white;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(108, 99, 255, 0.2);
        }

        .save-btn:hover {
          transform: translateY(-0.5px);
        }

        .save-success-badge {
          font-size: 11.5px;
          font-weight: 600;
          color: #10B981;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .save-success-badge .icon {
          font-size: 14px;
        }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }

        @keyframes waveform-jump {
          to { height: 10px; opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
