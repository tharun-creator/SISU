import React from 'react';
import { User } from '../../types/user';
import { ChatMessage as ChatMessageType } from '../../hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
  user: User | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, user }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold border ${
        isUser 
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
          : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}>
        {isUser ? (user?.name?.[0] || 'U') : 'AI'}
      </div>
      <div className="flex flex-col">
        <div className={`rounded-2xl px-4 py-2.5 text-sm font-body leading-relaxed border ${
          isUser 
            ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none shadow-sm' 
            : 'bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-sm'
        }`}>
          {message.text}
        </div>
        <span className={`text-[9px] font-semibold text-slate-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.time}
        </span>
      </div>
    </div>
  );
};
export default ChatMessage;
