import os
import sys
import datetime
import re
from typing import Annotated, TypedDict, List, Optional
from dotenv import load_dotenv
from contextvars import ContextVar

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

# Force UTF-8 encoding for standard output
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

# API Key check
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not set")

# Context variable for request-scoped user ID
current_user_id_var = ContextVar("current_user_id_var", default=None)

# ---------------------------------------------------------------------------
# SYSTEM PROMPT - More premium, active booking assistant
# ---------------------------------------------------------------------------
SYSTEM_CONTEXT = """
You are SISU Booking & Support Assistant - a warm, professional, and highly capable guide for the SISU mentorship program.

YOUR MISSION:
Help clients solve booking-related questions, check their existing meetings, schedule new meetings, cancel them, or request a reschedule directly in chat.

CORE KNOWLEDGE:
- Price: Rs. 15,000/month (1-year commitment).
- Focus: 1-on-1 business mentorship for founders/entrepreneurs to help them scale.
- Method: RATS Framework for structured growth.
- Timezone: All booking times are processed and displayed in Indian Standard Time (IST).
- Date: {current_date}.

AVAILABLE TOOLS:
- `get_availability(date_str)`: Fetch free slots for a specific date (YYYY-MM-DD).
- `book_meeting(title, start_time_str, reason, phone)`: Directly book a slot for the user.
- `get_my_meetings()`: List all the user's current bookings/meetings.
- `cancel_my_meeting(meeting_id)`: Cancel an existing meeting for the user.
- `reschedule_my_meeting(meeting_id, new_start_time_str, reason)`: Request reschedule for a meeting.

POLICIES:
- Rescheduling/Cancellation: Clients can cancel or request reschedule directly. Advise them of standard professional courtesy (doing so at least 24 hours in advance if possible).

GUIDELINES:
1. Empathy & Professionalism: Always be encouraging, respectful, and founder-focused. Use the user's name ({user_name}) where it adds warmth.
2. Direct Action: When a client asks to book, list meetings, cancel, or reschedule, ALWAYS call the corresponding tool first rather than just explaining how to do it.
3. Concise Responses: Keep your explanations direct and user-friendly. Summarize tool results clearly.
4. [SHOW_CALENDAR] Trigger: If the user says they want to select from a visual calendar or book a date visually, append '[SHOW_CALENDAR]' at the very end of your response.
"""


# ---------------------------------------------------------------------------
# TOOLS
# ---------------------------------------------------------------------------

@tool
def get_availability(date_str: str) -> str:
    """Fetch available meeting slots for a specific date (YYYY-MM-DD)."""
    try:
        import meeting_booking_service
        from database import SessionLocal
        import datetime as dt

        # Parse date and set to start of day in IST
        after = dt.datetime.strptime(date_str, "%Y-%m-%d")
        
        with SessionLocal() as db:
            slots = meeting_booking_service.find_next_available_slots(db, after=after, count=5)
        
        if not slots:
            return f"I'm sorry, there are no available slots on {date_str}. Would you like to check another day?"
            
        slot_texts = [f"{s['display_time']} ({s['display_date']})" for s in slots]
        return f"Here are some available slots on {date_str}: " + "; ".join(slot_texts) + ". Which one works for you?"
    except Exception as e:
        return f"I had trouble checking the schedule: {str(e)}. Please try again."


@tool
def book_meeting(title: str, start_time_str: str, reason: Optional[str] = None, phone: Optional[str] = None) -> str:
    """
    Directly book a new meeting slot for the current client.
    
    Args:
        title: The title or topic of the meeting (e.g. "SISU Mentorship Session").
        start_time_str: The start time of the meeting in ISO 8601 format (e.g. "2026-05-20T14:00:00").
        reason: Optional brief context or business goals for the session.
        phone: Optional phone number to contact the client.
    """
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        from database import SessionLocal, Meeting, User
        import meeting_booking_service
        import datetime as dt
        import email_service
        
        # 1. Agenda word and character limit checks
        if len(title.strip()) > 50:
            return "Error: The meeting title/agenda cannot exceed 50 characters."
        if len([w for w in title.split() if w]) > 10:
            return "Error: The meeting title/agenda exceeds the 10-word limit. Please keep it to 10 words or less."

        # Parse time and calculate end time (60 min default)
        start = meeting_booking_service._to_ist_naive(dt.datetime.fromisoformat(start_time_str.replace('Z', '')))
        end = start + dt.timedelta(minutes=60)

        # 2. Working hours check (11:00 AM - 07:00 PM IST)
        if start.time() < dt.time(11, 0) or end.time() > dt.time(19, 0):
            return "Error: Meetings must be booked between 11:00 AM and 07:00 PM IST."
        
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return "Error: Authenticated user not found in database."
                
            # Duplicate check
            existing = db.query(Meeting).filter(
                Meeting.client_id == user_id,
                Meeting.start_time == start,
                Meeting.deleted_at == None,
            ).first()
            if existing:
                return f" You already have a booking at this time! Meeting ID: {existing.id} (Status: {existing.status})."
                
            # Conflict check
            if not meeting_booking_service.check_slot_available(db, start, end):
                alternatives = meeting_booking_service.find_next_available_slots(db, start, duration_minutes=60, count=3)
                alt_texts = [f"{a['display_time']} on {a['display_date']}" for a in alternatives]
                return f" Conflicting Slot: This slot is already booked. Here are some alternative slots:\n" + "\n".join(alt_texts)
                
            # Create meeting
            meeting = Meeting(
                client_id=user_id,
                title=title,
                reason=reason,
                meeting_type="Mentorship Session",
                start_time=start,
                end_time=end,
                duration_minutes=60,
                preferred_communication="video",
                phone=phone or user.phone,
                status="pending"
            )
            db.add(meeting)
            db.commit()
            db.refresh(meeting)
            
            # Log status
            meeting_booking_service.log_booking_action(db, meeting.id, None, "pending", user.email, "Booked via Chatbot")
            
            # Create Notification
            from database import Notification
            notif = Notification(
                user_id=user_id,
                type="booking_received",
                title="Meeting Booked via Chatbot",
                message=f"Your request for '{meeting.title}' has been received and is pending review.",
                meeting_id=meeting.id
            )
            db.add(notif)
            db.commit()
            
            # Send email
            try:
                meeting_dict = {
                    "title": meeting.title,
                    "date": start.strftime("%B %d, %Y"),
                    "time": start.strftime("%I:%M %p"),
                    "type": meeting.meeting_type,
                    "duration": "60 mins",
                    "priority": "normal"
                }
                email_service.send_booking_received(user.email, user.name, meeting_dict)
            except Exception as email_err:
                print(f"[Email Error in Chatbot Book] {email_err}")
                
            return (
                f"🎉 Meeting successfully requested!\n"
                f"- **Meeting ID**: {meeting.id}\n"
                f"- **Title**: {meeting.title}\n"
                f"- **Scheduled Time**: {start.strftime('%B %d, %Y at %I:%M %p')} IST\n"
                f"- **Status**: Pending Admin Approval\n\n"
                f"I've sent a confirmation email to {user.email} and notified our admin."
            )
            
    except Exception as e:
        return f"Error booking the meeting: {str(e)}"


@tool
def get_my_meetings() -> str:
    """Get a list of all current, upcoming, and past meetings booked by the active client."""
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        from database import SessionLocal, Meeting
        
        with SessionLocal() as db:
            meetings = (
                db.query(Meeting)
                .filter(Meeting.client_id == user_id, Meeting.deleted_at == None)
                .order_by(Meeting.start_time.desc())
                .all()
            )
            
        if not meetings:
            return "You don't have any registered meetings yet."
            
        lines = []
        for m in meetings:
            communication = f" (via {m.preferred_communication})" if m.preferred_communication else ""
            lines.append(
                f"- **ID #{m.id}**: \"{m.title}\" on {m.start_time.strftime('%B %d, %Y at %I:%M %p')} IST\n"
                f"  - **Status**: {m.status.upper()}\n"
                f"  - **Duration**: {m.duration_minutes} mins{communication}"
            )
        return "Here are your booked meetings:\n\n" + "\n".join(lines)
        
    except Exception as e:
        return f"Error retrieving meetings: {str(e)}"


@tool
def cancel_my_meeting(meeting_id: int) -> str:
    """Cancel an existing meeting using its meeting ID."""
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        from database import SessionLocal, Meeting, User, Notification
        import meeting_booking_service
        import datetime as dt
        import email_service
        
        with SessionLocal() as db:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.client_id == user_id, Meeting.deleted_at == None).first()
            if not meeting:
                return f"Error: Meeting ID #{meeting_id} was not found among your bookings."
                
            user = db.query(User).filter(User.id == user_id).first()
            
            old_status = meeting.status
            meeting.status = "cancelled"
            meeting.deleted_at = dt.datetime.utcnow()
            db.commit()
            
            # Log audit
            meeting_booking_service.log_booking_action(db, meeting.id, old_status, "cancelled", user.email, "Cancelled via Chatbot")
            
            # Notification
            notif = Notification(
                user_id=user_id,
                type="cancelled",
                title="Meeting Cancelled via Chatbot",
                message=f"Your meeting '{meeting.title}' has been successfully cancelled.",
                meeting_id=meeting.id
            )
            db.add(notif)
            db.commit()
            
            # Delete from Google Calendar synchronously
            if meeting.google_event_id:
                try:
                    import calendar_service
                    calendar_service.delete_event(meeting.google_event_id)
                except Exception as cal_err:
                    print(f"[Calendar Error in Chatbot Cancel] {cal_err}")
                    
            try:
                meeting_dict = {
                    "title": meeting.title,
                    "date": meeting.start_time.strftime("%B %d, %Y"),
                    "time": meeting.start_time.strftime("%I:%M %p"),
                    "type": meeting.meeting_type,
                    "duration": f"{meeting.duration_minutes} mins"
                }
                email_service.send_cancellation(user.email, user.name, meeting_dict)
            except Exception as email_err:
                print(f"[Email Error in Chatbot Cancel] {email_err}")
                
            return f" Meeting ID #{meeting_id} (\"{meeting.title}\") has been successfully cancelled. A cancellation email has been sent to {user.email}."
            
    except Exception as e:
        return f"Error cancelling meeting: {str(e)}"


@tool
def reschedule_my_meeting(meeting_id: int, new_start_time_str: str, reason: Optional[str] = None) -> str:
    """
    Request to reschedule an existing meeting to a new start time.
    
    Args:
        meeting_id: The ID of the meeting to reschedule.
        new_start_time_str: The new start time in ISO 8601 format (e.g. "2026-05-20T14:00:00").
        reason: Optional reason for the reschedule request.
    """
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        from database import SessionLocal, Meeting, User, Notification
        import meeting_booking_service
        import datetime as dt
        
        start = meeting_booking_service._to_ist_naive(dt.datetime.fromisoformat(new_start_time_str.replace('Z', '')))
        
        if start < dt.datetime.now():
            return "Error: Cannot reschedule a meeting to a past date/time."
            
        with SessionLocal() as db:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.client_id == user_id, Meeting.deleted_at == None).first()
            if not meeting:
                return f"Error: Meeting ID #{meeting_id} was not found among your bookings."
                
            user = db.query(User).filter(User.id == user_id).first()
            
            duration = meeting.duration_minutes or 60
            if duration > 120:
                return "Error: Meeting duration cannot exceed 2 hours."
                
            end = start + dt.timedelta(minutes=duration)

            # 2. Working hours check (11:00 AM - 07:00 PM IST)
            if start.time() < dt.time(11, 0) or end.time() > dt.time(19, 0):
                return "Error: Meetings must be booked between 11:00 AM and 07:00 PM IST."
            
            # Conflict check
            if not meeting_booking_service.check_slot_available(db, start, end, exclude_meeting_id=meeting.id):
                alternatives = meeting_booking_service.find_next_available_slots(db, start, duration_minutes=meeting.duration_minutes or 60, count=3)
                alt_texts = [f"{a['display_time']} on {a['display_date']}" for a in alternatives]
                return f" Conflict: The proposed time conflicts with an existing booking. Here are some alternatives:\n" + "\n".join(alt_texts)
                
            old_status = meeting.status
            old_start = meeting.start_time
            old_end = meeting.end_time
            
            meeting.start_time = start
            meeting.end_time = end
            meeting.status = "reschedule_requested"
            
            orig_time_str = f"[Reschedule Request via Chatbot] Original: {old_start.strftime('%b %d, %Y at %I:%M %p')} IST"
            reason_str = f"Reason: {reason}" if reason else "No reason provided."
            resched_note = f"{orig_time_str} · {reason_str}"
            if meeting.notes:
                meeting.notes = f"{resched_note}\n\n{meeting.notes}"
            else:
                meeting.notes = resched_note
                
            db.commit()
            
            # Log audit
            meeting_booking_service.log_booking_action(db, meeting.id, old_status, "reschedule_requested", user.email, f"Reschedule requested via Chatbot: {reason_str}")
            
            # Notify Client
            notif = Notification(
                user_id=user_id,
                type="reschedule_requested",
                title="Reschedule Requested via Chatbot",
                message=f"Requested reschedule of '{meeting.title}' to {start.strftime('%B %d at %I:%M %p')}.",
                meeting_id=meeting.id
            )
            db.add(notif)
            
            # Notify Admins
            admins = db.query(User).filter(User.role == "admin").all()
            for admin in admins:
                admin_notif = Notification(
                    user_id=admin.id,
                    type="reschedule_requested",
                    title="Reschedule Requested by Client",
                    message=f"{user.name} requested to reschedule '{meeting.title}' to {start.strftime('%B %d at %I:%M %p')}.",
                    meeting_id=meeting.id
                )
                db.add(admin_notif)
                
            db.commit()
            
            return (
                f" Reschedule requested successfully!\n"
                f"- **Meeting ID**: {meeting.id}\n"
                f"- **Proposed New Time**: {start.strftime('%B %d, %Y at %I:%M %p')} IST\n"
                f"- **Status**: Pending Admin Confirmation\n\n"
                f"The admin has been notified to review and approve your reschedule request."
            )
            
    except Exception as e:
        return f"Error rescheduling meeting: {str(e)}"


tools = [get_availability, book_meeting, get_my_meetings, cancel_my_meeting, reschedule_my_meeting]
tool_node = ToolNode(tools)


# ---------------------------------------------------------------------------
# LANGGRAPH STATE & WORKFLOW - Unchanged architecture
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]


# Initialize model once
model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=api_key,
    temperature=0.7,
    max_output_tokens=512,
)
model_with_tools = model.bind_tools(tools)


async def call_model(state: AgentState):
    messages = state["messages"]
    response = await model_with_tools.ainvoke(messages)
    return {"messages": [response]}


def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "continue"
    return "end"


workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("action", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"continue": "action", "end": END},
)
workflow.add_edge("action", "agent")
app = workflow.compile()


# ---------------------------------------------------------------------------
# NAME EXTRACTION - Pattern matches
# ---------------------------------------------------------------------------

NAME_PATTERNS = [
    re.compile(
        r"\b(?:my name is|i am|i'm|call me|this is|it's|its)\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,2})",
        re.IGNORECASE,
    ),
    re.compile(
        r"^([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)?)(?:\s+here)?\s*[.,!]?\s*$",
        re.IGNORECASE,
    ),
]

NAME_STOPWORDS = {
    "not", "sure", "here", "ready", "good", "fine", "ok", "okay",
    "interested", "looking", "trying", "just", "also", "already",
    "back", "new", "now", "available", "done", "there", "the",
}

# ---------------------------------------------------------------------------
# TOPIC CLASSIFICATION
# ---------------------------------------------------------------------------

SISU_TOPICS = {
    "sisu", "mentorship", "mentor", "mentoring", "business", "entrepreneur",
    "entrepreneurship", "startup", "founder", "pricing", "price", "cost",
    "fee", "fees", "monthly", "goal", "goals", "rats", "framework",
    "book", "booking", "schedule", "meeting", "meet", "slot", "slots",
    "time", "timing", "availability", "calendar", "session", "program",
    "programme", "advice", "coaching", "coach", "scale", "scaling",
    "growth", "revenue", "invest", "investment", "roi", "value",
    "commitment", "year", "monthly", "one-on-one", "1-on-1",
}

CHAT_CONTEXT_TOPICS = {
    "who am i", "what is my name", "whats my name", "who are you",
    "my name", "call me", "this is", "your name", "hello", "hi",
    "hey", "thanks", "thank you", "good morning", "good afternoon",
    "good evening", "help", "how are you", "what can you do",
    "what do you do", "what can i ask",
}

CLEARLY_UNRELATED_TOPICS = {
    "weather", "movie", "film", "recipe", "cricket", "football",
    "song", "lyrics", "joke", "coding", "python", "javascript",
    "math", "homework", "news", "politics", "election", "sport",
    "game", "gaming", "stock", "crypto", "meme", "celebrity",
    "horoscope", "astrology", "travel", "hotel", "flight",
}


# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------

def extract_user_name(user_input: str, history: list = None, fallback: str = "Client") -> str:
    """Extract user's name from current input or conversation history."""
    texts = []
    if history:
        texts.extend(h.get("content", "") for h in history if h.get("role") == "user")
    texts.append(user_input)

    for text in reversed(texts):
        for pattern in NAME_PATTERNS:
            match = pattern.search(text.strip())
            if match:
                raw_name = match.group(1).strip(" .,!?:;")
                words = raw_name.split()
                if any(w.lower() in NAME_STOPWORDS for w in words):
                    continue
                if len(words) == 1 and len(words[0]) < 3:
                    continue
                return " ".join(part.capitalize() for part in words)

    return fallback or "Client"


def is_sisu_or_chat_context(user_input: str) -> bool:
    """Returns True if the message relates to SISU or normal chat context."""
    text = user_input.lower().strip()
    if len(text.split()) <= 3:
        return True
    return any(topic in text for topic in SISU_TOPICS | CHAT_CONTEXT_TOPICS)


def is_clearly_unrelated(user_input: str) -> bool:
    """Returns True if the message is clearly off-topic with no SISU relevance."""
    text = user_input.lower().strip()
    has_sisu_context = any(topic in text for topic in SISU_TOPICS | CHAT_CONTEXT_TOPICS)
    has_unrelated_topic = any(topic in text for topic in CLEARLY_UNRELATED_TOPICS)
    return has_unrelated_topic and not has_sisu_context


def asks_for_user_name(user_input: str) -> bool:
    """Detects if the user is asking what their name is."""
    text = user_input.lower().strip()
    name_questions = [
        "what is my name", "what's my name", "whats my name",
        "who am i", "do you know my name", "tell me my name",
        "do you remember my name",
    ]
    return any(q in text for q in name_questions)


def introduces_user_name(user_input: str) -> str | None:
    """Returns extracted name if the user is introducing themselves, else None."""
    detected = extract_user_name(user_input, history=None, fallback="")
    return detected if detected else None


def get_direct_context_response(user_input: str, user_name: str) -> str | None:
    """
    Handle simple context-aware replies locally without hitting the LLM.
    Returns a string if handled, None if it should go to the LLM.
    """
    text = user_input.lower().strip()

    # Greeting shortcuts
    if text in {"hi", "hello", "hey", "hii", "helo"}:
        name_part = f", {user_name}" if user_name and user_name.lower() != "client" else ""
        return (
            f"Hey{name_part}! Great to have you here. "
            "I'm SISU Assistant - ask me anything about our mentorship program, "
            "pricing, or go ahead and book a session. What's on your mind?"
        )

    # Name introduction
    detected_name = introduces_user_name(user_input)
    if detected_name and detected_name.lower() != "client":
        return (
            f"Great to meet you, {detected_name}! "
            "I'm SISU Assistant. Whether you have questions about our mentorship program, "
            "pricing, or want to book a discovery session, I'm here for it. "
            "What would you like to know?"
        )

    # Name recall
    if asks_for_user_name(user_input):
        if user_name and user_name.lower() != "client":
            return f"You're {user_name} - I've got you! Anything else I can help you with?"
        return (
            "I don't have your name just yet. Feel free to tell me by saying "
            "'My name is [Your Name]'."
        )

    # Identity questions
    if any(phrase in text for phrase in ["who are you", "what are you", "your name", "what can you do"]):
        return (
            "I'm SISU Assistant - your guide to the SISU mentorship program. "
            "I can tell you about our program, pricing, what to expect, "
            "or help you schedule a free discovery session. What would you like to explore?"
        )

    # Pricing info
    if any(phrase in text for phrase in ["how much", "price", "cost", "fee", "pricing"]):
        return (
            "SISU mentorship is Rs. 15,000 per month, all-inclusive, with a minimum 1-year commitment. "
            "It's a premium experience designed for founders serious about scaling. "
            "Would you like to book a discovery call to see if it's the right fit?"
        )

    # Gratitude
    if any(phrase in text for phrase in ["thank you", "thanks", "thank u", "thx", "ty"]):
        name_part = f", {user_name}" if user_name and user_name.lower() != "client" else ""
        return (
            f"You're welcome{name_part}! "
            "Feel free to reach out anytime. Is there anything else about SISU I can help you with?"
        )

    return None


def off_topic_response(user_input: str = "") -> str:
    """Return a warm, redirecting response for off-topic queries."""
    return (
        "That's a bit outside my area - I'm focused on everything SISU: "
        "mentorship, business growth, pricing, and booking sessions. "
        "Is there something along those lines I can help you with?"
    )


def get_mock_response(user_input: str) -> str:
    """Fallback response when the LLM call fails."""
    text = user_input.lower()
    if is_clearly_unrelated(user_input) or not is_sisu_or_chat_context(user_input):
        return off_topic_response(user_input)
    if any(k in text for k in ["book", "schedule", "meet", "time", "slot", "available", "when"]):
        return (
            "I'd love to help you book a session. "
            "Please pick a date from the calendar below. [SHOW_CALENDAR]"
        )
    if any(k in text for k in ["price", "cost", "fee", "how much", "pricing"]):
        return (
            "SISU mentorship is Rs. 15,000 per month, with a minimum 1-year commitment. "
            "It's a serious investment for serious founders. "
            "Want to learn more about what's included, or book a discovery call?"
        )
    return (
        "I'm SISU Assistant - here to help with anything related to our mentorship program. "
        "What would you like to know?"
    )


# ---------------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------------

async def generate_chat_response(user_input: str, history: list = None, user_name: str = "Client", user_id: int = None) -> str:
    """
    Generate a dynamic, client-friendly response.

    Args:
        user_input: The user's latest message.
        history: List of dicts with 'role' and 'content' keys.
        user_name: Account name or name extracted from previous sessions.
        user_id: The ID of the authenticated user to bind request-scoped tools.

    Returns:
        A string response to display to the user.
    """
    if not user_input.strip():
        return ""

    # Set the user context in the ContextVar for use inside tools
    token = current_user_id_var.set(user_id)
    try:
        # Step 1: Extract or remember the user's name
        remembered_name = extract_user_name(user_input, history, user_name)

        # Step 2: Handle simple context responses locally (fast path)
        direct_response = get_direct_context_response(user_input, remembered_name)
        if direct_response:
            return direct_response

        # Step 3: Reject clearly off-topic queries before hitting LLM
        if is_clearly_unrelated(user_input):
            return off_topic_response(user_input)

        # Step 4: Build LLM messages
        current_date = datetime.datetime.now().strftime("%Y-%m-%d")
        sys_msg = SystemMessage(
            content=SYSTEM_CONTEXT.format(
                user_name=remembered_name,
                current_date=current_date,
            )
        )

        formatted_history: list[BaseMessage] = []
        if history:
            for h in history:
                if h["role"] == "user":
                    formatted_history.append(HumanMessage(content=h["content"]))
                else:
                    formatted_history.append(AIMessage(content=h["content"]))

        input_messages = [sys_msg] + formatted_history + [HumanMessage(content=user_input)]

        # Step 5: Run LangGraph agent
        config = {"recursion_limit": 15}
        final_state = await app.ainvoke({"messages": input_messages}, config=config)
        response = final_state["messages"][-1].content

        if not response or not response.strip():
            return get_mock_response(user_input)

        return response

    except Exception as e:
        print(f"[SISU Agent Error] {str(e)}")
        return get_mock_response(user_input)
    finally:
        current_user_id_var.reset(token)
