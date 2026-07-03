import os
import datetime
import re
from typing import Annotated, TypedDict, List, Optional
from contextvars import ContextVar

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.database import SessionLocal
from app.models.meeting import Meeting, MeetingStatusLog
from app.models.notification import Notification
from app.models.user import User
from app.services.meeting_service import MeetingService
from app.services.email_service import EmailService
from app.config import settings
from app.core.logging import logger

current_user_id_var = ContextVar("current_user_id_var", default=None)

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

@tool
def get_availability(date_str: str) -> str:
    """Fetch available meeting slots for a specific date (YYYY-MM-DD)."""
    try:
        after = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        with SessionLocal() as db:
            slots = MeetingService.find_next_available_slots(db, after=after, count=5)
        
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
    """
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        if len(title.strip()) > 150:
            return "Error: The meeting title/agenda cannot exceed 150 characters."
        if len([w for w in title.split() if w]) > 20:
            return "Error: The meeting title/agenda exceeds the 20-word limit. Please keep it to 20 words or less."

        start = MeetingService.to_ist_naive(datetime.datetime.fromisoformat(start_time_str.replace('Z', '')))
        end = start + datetime.timedelta(minutes=60)

        if start.time() < datetime.time(11, 0) or end.time() > datetime.time(19, 0):
            return "Error: Meetings must be booked between 11:00 AM and 07:00 PM IST."
        
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return "Error: Authenticated user not found in database."
                
            existing = db.query(Meeting).filter(
                Meeting.client_id == user_id,
                Meeting.start_time == start,
                Meeting.deleted_at == None,
            ).first()
            if existing:
                return f" You already have a booking at this time! Meeting ID: {existing.id} (Status: {existing.status})."
                
            if not MeetingService.check_slot_available(db, start, end):
                alternatives = MeetingService.find_next_available_slots(db, start, duration_minutes=60, count=3)
                alt_texts = [f"{a['display_time']} on {a['display_date']}" for a in alternatives]
                return f" Conflicting Slot: This slot is already booked. Here are some alternative slots:\n" + "\n".join(alt_texts)
                
            meeting = Meeting(
                client_id=user_id,
                title=title,
                description="This is a mentorship session booked through the Sisu executive virtual assistant for strategic business review and scaling roadmap discussion to optimize performance and align organizational goals for growth today.",
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
            
            # Log audit
            log = MeetingStatusLog(
                meeting_id=meeting.id,
                old_status=None,
                new_status="pending",
                changed_by=user.email,
                note="Booked via Chatbot"
            )
            db.add(log)
            
            notif = Notification(
                user_id=user_id,
                type="booking_received",
                title="Meeting Booked via Chatbot",
                message=f"Your request for '{meeting.title}' has been received and is pending review.",
                meeting_id=meeting.id
            )
            db.add(notif)
            db.commit()
            
            try:
                meeting_dict = {
                    "title": meeting.title,
                    "date": start.strftime("%B %d, %Y"),
                    "time": start.strftime("%I:%M %p"),
                    "type": meeting.meeting_type,
                    "duration": "60 mins",
                    "priority": "normal"
                }
                EmailService.send_booking_received(user.email, user.name, meeting_dict)
            except Exception as email_err:
                logger.error(f"[Email Error in Chatbot Book] {email_err}")
                
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
        with SessionLocal() as db:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.client_id == user_id, Meeting.deleted_at == None).first()
            if not meeting:
                return f"Error: Meeting ID #{meeting_id} was not found among your bookings."
                
            user = db.query(User).filter(User.id == user_id).first()
            
            old_status = meeting.status
            meeting.status = "cancelled"
            meeting.deleted_at = datetime.datetime.utcnow()
            db.commit()
            
            log = MeetingStatusLog(
                meeting_id=meeting.id,
                old_status=old_status,
                new_status="cancelled",
                changed_by=user.email,
                note="Cancelled via Chatbot"
            )
            db.add(log)
            
            notif = Notification(
                user_id=user_id,
                type="cancelled",
                title="Meeting Cancelled via Chatbot",
                message=f"Your meeting '{meeting.title}' has been successfully cancelled.",
                meeting_id=meeting.id
            )
            db.add(notif)
            db.commit()
            
            if meeting.google_event_id:
                try:
                    from app.services.calendar_service import CalendarService
                    CalendarService.delete_event(meeting.google_event_id)
                except Exception as cal_err:
                    logger.error(f"[Calendar Error in Chatbot Cancel] {cal_err}")
                    
            try:
                meeting_dict = {
                    "title": meeting.title,
                    "date": meeting.start_time.strftime("%B %d, %Y"),
                    "time": meeting.start_time.strftime("%I:%M %p"),
                    "type": meeting.meeting_type,
                    "duration": f"{meeting.duration_minutes} mins"
                }
                EmailService.send_cancellation(user.email, user.name, meeting_dict)
            except Exception as email_err:
                logger.error(f"[Email Error in Chatbot Cancel] {email_err}")
                
            return f" Meeting ID #{meeting_id} (\"{meeting.title}\") has been successfully cancelled. A cancellation email has been sent to {user.email}."
            
    except Exception as e:
        return f"Error cancelling meeting: {str(e)}"

@tool
def reschedule_my_meeting(meeting_id: int, new_start_time_str: str, reason: Optional[str] = None) -> str:
    """
    Request to reschedule an existing meeting to a new start time.
    """
    user_id = current_user_id_var.get()
    if not user_id:
        return "Error: User is not authenticated. Please log in first."
        
    try:
        start = MeetingService.to_ist_naive(datetime.datetime.fromisoformat(new_start_time_str.replace('Z', '')))
        if start < datetime.datetime.now():
            return "Error: Cannot reschedule a meeting to a past date/time."
            
        with SessionLocal() as db:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.client_id == user_id, Meeting.deleted_at == None).first()
            if not meeting:
                return f"Error: Meeting ID #{meeting_id} was not found among your bookings."
                
            user = db.query(User).filter(User.id == user_id).first()
            duration = meeting.duration_minutes or 60
            if duration > 120:
                return "Error: Meeting duration cannot exceed 2 hours."
                
            end = start + datetime.timedelta(minutes=duration)

            if start.time() < datetime.time(11, 0) or end.time() > datetime.time(19, 0):
                return "Error: Meetings must be booked between 11:00 AM and 07:00 PM IST."
            
            if not MeetingService.check_slot_available(db, start, end, exclude_meeting_id=meeting.id):
                alternatives = MeetingService.find_next_available_slots(db, start, duration_minutes=duration, count=3)
                alt_texts = [f"{a['display_time']} on {a['display_date']}" for a in alternatives]
                return f" Conflict: The proposed time conflicts with an existing booking. Here are some alternatives:\n" + "\n".join(alt_texts)
                
            old_status = meeting.status
            old_start = meeting.start_time
            
            meeting.start_time = start
            meeting.end_time = end
            meeting.status = "reschedule_requested"
            
            orig_time_str = f"[Reschedule Request via Chatbot] Original: {old_start.strftime('%b %d, %Y at %I:%M %p')} IST"
            reason_str = f"Reason: {reason}" if reason else "No reason provided."
            resched_note = f"{orig_time_str} · {reason_str}"
            meeting.notes = f"{resched_note}\n\n{meeting.notes}" if meeting.notes else resched_note
                
            db.commit()
            
            log = MeetingStatusLog(
                meeting_id=meeting.id,
                old_status=old_status,
                new_status="reschedule_requested",
                changed_by=user.email,
                note=f"Reschedule requested via Chatbot: {reason_str}"
            )
            db.add(log)
            
            notif = Notification(
                user_id=user_id,
                type="reschedule_requested",
                title="Reschedule Requested via Chatbot",
                message=f"Requested reschedule of '{meeting.title}' to {start.strftime('%B %d at %I:%M %p')}.",
                meeting_id=meeting.id
            )
            db.add(notif)
            
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
                f"The admin has been notified to review your reschedule request."
            )
            
    except Exception as e:
        return f"Error rescheduling meeting: {str(e)}"

tools = [get_availability, book_meeting, get_my_meetings, cancel_my_meeting, reschedule_my_meeting]
tool_node = ToolNode(tools)

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]

class AIService:
    _app = None

    @classmethod
    def get_agent_app(cls):
        if cls._app is not None:
            return cls._app

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("GEMINI_API_KEY not configured. Running without LLM chatbot.")
            return None

        try:
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
            cls._app = workflow.compile()
            return cls._app
        except Exception as e:
            logger.error(f"Failed to initialize LangGraph agent: {e}")
            return None

    @classmethod
    async def generate_chat_response(
        cls, 
        user_input: str, 
        history: list = None, 
        user_name: str = "Client", 
        user_id: int = None
    ) -> str:
        if not user_input.strip():
            return ""

        token = current_user_id_var.set(user_id)
        try:
            remembered_name = cls.extract_user_name(user_input, history, user_name)
            
            # Fast Local replies
            direct_response = cls.get_direct_context_response(user_input, remembered_name)
            if direct_response:
                return direct_response

            if cls.is_clearly_unrelated(user_input):
                return cls.off_topic_response(user_input)

            app = cls.get_agent_app()
            if not app:
                return cls.get_mock_response(user_input)

            current_date = datetime.datetime.now().strftime("%Y-%m-%d")
            sys_msg = SystemMessage(
                content=SYSTEM_CONTEXT.format(
                    user_name=remembered_name,
                    current_date=current_date,
                )
            )

            formatted_history: List[BaseMessage] = []
            if history:
                for h in history:
                    if h["role"] == "user":
                        formatted_history.append(HumanMessage(content=h["content"]))
                    else:
                        formatted_history.append(AIMessage(content=h["content"]))

            input_messages = [sys_msg] + formatted_history + [HumanMessage(content=user_input)]
            final_state = await app.ainvoke({"messages": input_messages}, config={"recursion_limit": 15})
            response = final_state["messages"][-1].content

            if not response or not response.strip():
                return cls.get_mock_response(user_input)

            return response
        except Exception as e:
            logger.error(f"[AIService Error] {e}")
            return cls.get_mock_response(user_input)
        finally:
            current_user_id_var.reset(token)

    @staticmethod
    def extract_user_name(user_input: str, history: list = None, fallback: str = "Client") -> str:
        NAME_PATTERNS = [
            re.compile(r"\b(?:my name is|i am|i'm|call me|this is|it's|its)\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,2})", re.IGNORECASE),
            re.compile(r"^([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)?)(?:\s+here)?\s*[.,!]?\s*$", re.IGNORECASE),
        ]
        NAME_STOPWORDS = {"not", "sure", "here", "ready", "good", "fine", "ok", "okay", "interested", "looking"}
        
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
                    return " ".join(part.capitalize() for part in words)
        return fallback

    @staticmethod
    def is_clearly_unrelated(user_input: str) -> bool:
        text = user_input.lower().strip()
        CLEARLY_UNRELATED_TOPICS = {"weather", "movie", "recipe", "cricket", "politics", "news", "horoscope"}
        return any(topic in text for topic in CLEARLY_UNRELATED_TOPICS)

    @classmethod
    def get_direct_context_response(cls, user_input: str, user_name: str) -> Optional[str]:
        text = user_input.lower().strip()
        if text in {"hi", "hello", "hey"}:
            name_part = f", {user_name}" if user_name and user_name.lower() != "client" else ""
            return f"Hey{name_part}! Great to have you here. Ask me anything about SISU mentorship, pricing, or let's book a session."
        if "pricing" in text or "how much" in text or "cost" in text:
            return "SISU mentorship is Rs. 15,000 per month, all-inclusive, with a minimum 1-year commitment. Designing premium strategies to help you scale."
        return None

    @classmethod
    def off_topic_response(cls, user_input: str) -> str:
        return "That's outside my area — I am here to help with SISU mentorship, pricing, and scheduling sessions. Ask away!"

    @classmethod
    def get_mock_response(cls, user_input: str) -> str:
        text = user_input.lower()
        if cls.is_clearly_unrelated(user_input):
            return cls.off_topic_response(user_input)
        if any(k in text for k in ["book", "schedule", "meet", "time"]):
            return "I'd love to help you book a session. Please pick a date from the calendar below. [SHOW_CALENDAR]"
        return "I'm SISU Assistant. How can I help you with your mentorship bookings today?"
