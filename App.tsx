import React, { useEffect, useRef } from 'react';
import { useJarvis } from './hooks/useJarvis';
import { AssistantAvatar } from './components/AssistantAvatar';
import { ChatMessage } from './components/ChatMessage';
import { Icon } from './components/Icon';
import { TextInput } from './components/TextInput';

function App() {
  const { status, messages, error, handleToggleSession, sendTextMessage } = useJarvis();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const isSessionActive = status !== 'idle' && status !== 'error';
  const isTextInputDisabled = status !== 'idle';

  const getStatusText = () => {
    if (status === 'speaking') return 'Jarvis is speaking...';
    if (status === 'thinking') return 'Jarvis is thinking...';
    if (isSessionActive) return `Session is ${status}...`;
    return 'Idle';
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen flex flex-col font-sans">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Icon name="jarvis" className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-semibold text-slate-200">Jarvis Assistant</h1>
        </div>
        <div className="text-sm text-slate-400 capitalize">{getStatusText()}</div>
      </header>

      <main className="flex-grow flex flex-col p-4 overflow-y-auto">
        <div className="flex-grow space-y-6">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/50">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}
      </main>

      <footer className="flex-shrink-0 flex flex-col items-center justify-center p-6 space-y-4 bg-slate-950/80 backdrop-blur-sm">
         <div className="w-full max-w-2xl">
            <TextInput onSendMessage={sendTextMessage} disabled={isTextInputDisabled} />
         </div>
         <div className="flex flex-col items-center">
            <AssistantAvatar status={status} onClick={handleToggleSession} />
            <p className="mt-4 text-slate-400 text-sm">
                {isSessionActive ? "Tap to end voice session" : "Tap for voice session"}
            </p>
         </div>
      </footer>
    </div>
  );
}

export default App;
