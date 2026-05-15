import os
import sys
import datetime
import re
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv

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

# ---------------------------------------------------------------------------
# SYSTEM PROMPT - more natural, empathetic, and client-friendly
# ---------------------------------------------------------------------------
SYSTEM_CONTEXT = """
You are SISU Assistant - a warm, professional guide for the SISU mentorship program.

CORE KNOWLEDGE:
- Price: Rs. 15,000/month (1-year commitment).
- Focus: 1-on-1 business mentorship for founders/entrepreneurs.
- Method: RATS Framework for structured growth.
- Identity: Warm, empathetic, and natural. Use the user's name ({user_name}) where it adds warmth.
- Date: {current_date}.

RULES:
1. Be concise. Keep replies under 3-4 sentences.
2. Call `get_availability` tool for ANY timing/booking questions.
3. Include [SHOW_CALENDAR] at the very end if the user wants to book.
4. If unsure, be honest. Redirect off-topic queries politely.
"""


# ---------------------------------------------------------------------------
# TOOLS
# ---------------------------------------------------------------------------

@tool
def get_availability(date_str: str):
    """Fetch available meeting slots for a specific date (YYYY-MM-DD)."""
    try:
        import meeting_booking_service
        import datetime as dt

        # We look for slots starting from the beginning of that day
        from_time = dt.datetime.strptime(date_str, "%Y-%m-%d").isoformat()
        slots = meeting_booking_service.find_next_available_slots(from_time=from_time, count=5)
        
        if not slots:
            return f"I'm sorry, there are no available slots on {date_str}. Would you like to check another day?"
            
        slot_texts = [f"{s['display_time']} ({s['display_date']})" for s in slots]
        return f"Here are some available slots on {date_str}: " + "; ".join(slot_texts) + ". Which one works for you?"
    except Exception as e:
        return f"I had trouble checking the schedule: {str(e)}. Please try again."


tools = [get_availability]
tool_node = ToolNode(tools)


# ---------------------------------------------------------------------------
# LANGGRAPH STATE & WORKFLOW - unchanged architecture
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
# NAME EXTRACTION - improved patterns
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

# Stop words that should not be treated as names
NAME_STOPWORDS = {
    "not", "sure", "here", "ready", "good", "fine", "ok", "okay",
    "interested", "looking", "trying", "just", "also", "already",
    "back", "new", "now", "available", "done", "there", "the",
}

# ---------------------------------------------------------------------------
# TOPIC CLASSIFICATION - expanded and nuanced
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
# HELPER FUNCTIONS - improved
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

    # Booking shortcut
    if any(phrase in text for phrase in ["book", "schedule", "appointment", "slot"]):
        return (
            "I'd be happy to help you schedule a session! "
            "Please pick a date from the calendar below to see available slots. [SHOW_CALENDAR]"
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

async def generate_chat_response(user_input: str, history: list = None, user_name: str = "Client") -> str:
    """
    Generate a dynamic, client-friendly response.

    Args:
        user_input: The user's latest message.
        history: List of dicts with 'role' and 'content' keys.
        user_name: Account name or name extracted from previous sessions.

    Returns:
        A string response to display to the user.
    """
    if not user_input.strip():
        return ""

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
    try:
        config = {"recursion_limit": 10}
        final_state = await app.ainvoke({"messages": input_messages}, config=config)
        response = final_state["messages"][-1].content

        if not response or not response.strip():
            return get_mock_response(user_input)

        return response

    except Exception as e:
        print(f"[SISU Agent Error] {str(e)}")
        return get_mock_response(user_input)
