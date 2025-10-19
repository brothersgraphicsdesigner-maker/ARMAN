
import React from 'react';
import { Icon } from './Icon';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isJarvis = message.author === 'jarvis';

  return (
    <div className={`flex items-start space-x-4 ${isJarvis ? 'justify-start' : 'justify-end'}`}>
      {isJarvis && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-cyan-500/50">
          <Icon name="jarvis" />
        </div>
      )}

      <div
        className={`rounded-lg p-3 max-w-lg ${
          isJarvis
            ? 'bg-slate-800 text-slate-200'
            : 'bg-cyan-600 text-white'
        }`}
      >
        <p>{message.text}</p>
      </div>

      {!isJarvis && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <Icon name="user" />
        </div>
      )}
    </div>
  );
};
