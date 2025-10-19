
import React from 'react';
import type { AssistantStatus } from '../types';

interface AssistantAvatarProps {
  status: AssistantStatus;
  onClick: () => void;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ status, onClick }) => {
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isConnecting = status === 'connecting';

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer ring */}
      <div
        className={`absolute w-full h-full rounded-full border-2 border-cyan-500/30 transition-all duration-500 ${
          isListening || isSpeaking || isConnecting ? 'animate-spin-slow' : ''
        }`}
      />
      {/* Middle pulsing ring */}
      <div
        className={`absolute w-5/6 h-5/6 rounded-full bg-cyan-500/10 transition-all duration-500 ${
          isListening ? 'animate-pulse' : 'opacity-0'
        }`}
      />
      {/* Inner sound wave-like rings for speaking */}
       <div
        className={`absolute w-2/3 h-2/3 rounded-full border-2 border-cyan-400 transition-all duration-300 ${
          isSpeaking ? 'animate-ping opacity-70' : 'opacity-0'
        }`}
        style={{ animationDuration: '1.5s' }}
      />
        <div
        className={`absolute w-1/2 h-1/2 rounded-full border-2 border-cyan-300 transition-all duration-300 ${
          isSpeaking ? 'animate-ping opacity-50' : 'opacity-0'
        }`}
        style={{ animationDuration: '2s' }}
      />

      {/* Core button */}
      <button
        onClick={onClick}
        className="relative w-40 h-40 bg-slate-800 rounded-full cursor-pointer transition-all duration-300 hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 shadow-lg shadow-cyan-500/10"
        aria-label="Start session"
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
           <svg className="w-16 h-16 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12 7.5v-1.5a6 6 0 00-6-6m-6 6v-1.5a6 6 0 016-6m0 0a6 6 0 016 6m-6-6a6 6 0 00-6 6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12.75a3 3 0 003-3v-1.5a3 3 0 00-6 0v1.5a3 3 0 003 3z" />
            </svg>
        </div>
      </button>

      {/* Loading spinner */}
      {isConnecting && (
         <div className="absolute w-full h-full flex items-center justify-center">
            <div className="w-44 h-44 border-t-2 border-cyan-400 rounded-full animate-spin"/>
        </div>
      )}
    </div>
  );
};
