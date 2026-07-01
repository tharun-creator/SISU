import { useState, useRef, useEffect } from 'react';
import chatApi, { ChatMessagePayload } from '../api/chat';

export interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

const isGibberish = (str: string) => {
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

const isTrashTalk = (str: string) => {
  const clean = str.trim().toLowerCase();
  const toxicWords = [
    'fuck', 'shit', 'asshole', 'bitch', 'idiot', 'stupid', 'dumb', 'bastard', 'crap', 'garbage',
    'trash', 'useless', 'suck', 'dick', 'pussy', 'nonsense', 'hell', 'hate', 'worst'
  ];
  return toxicWords.some(word => clean.includes(word));
};

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'ai',
      text: "Hi, how can I help you?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  const addMessage = (sender: 'user' | 'ai', text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const sendMessage = async (text: string, onAgendaUpdate?: (agenda: string) => void) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setIsAiTyping(true);

    setTimeout(async () => {
      if (isGibberish(text)) {
        setIsAiTyping(false);
        addMessage('ai', "funny now lets get to the point how can i help you");
        return;
      }

      if (isTrashTalk(text)) {
        setIsAiTyping(false);
        addMessage('ai', "sry i cant help you on that");
        return;
      }

      const lower = text.toLowerCase();
      if (lower.includes('agenda') || lower.includes('focus') || lower.includes('topic')) {
        const extracted = text.replace(/agenda|focus|topic/gi, '').replace(/set|to|my|is/gi, '').trim();
        if (extracted && onAgendaUpdate) {
          onAgendaUpdate(extracted);
          setIsAiTyping(false);
          addMessage('ai', `I've updated your Session Agenda to: "${extracted}" inside the booking form!`);
          return;
        }
      }

      try {
        const history: ChatMessagePayload[] = messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));
        const data = await chatApi.chat(text, history);
        setIsAiTyping(false);
        addMessage('ai', data.response || "I am synchronizing your executive scheduling variables live.");
      } catch {
        setIsAiTyping(false);
        addMessage('ai', "I'm monitoring your calendar selection live. Let me know if you need booking tips!");
      }
    }, 800);
  };

  return {
    messages,
    isAiTyping,
    chatRef,
    sendMessage,
    addMessage
  };
};
export default useChat;
