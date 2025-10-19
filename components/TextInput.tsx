import React, { useState } from 'react';
import { Icon } from './Icon';

interface TextInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center space-x-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-grow bg-slate-800 border border-slate-700 rounded-full py-3 px-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
        aria-label="Text input for Jarvis"
      />
      <button
        type="submit"
        disabled={disabled}
        className="flex-shrink-0 w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center transition-colors hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
        aria-label="Send message"
      >
        <Icon name="send" className="w-6 h-6 text-white" />
      </button>
    </form>
  );
};
