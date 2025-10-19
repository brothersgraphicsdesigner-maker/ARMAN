export type AssistantStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'thinking';

export interface Message {
  id: string;
  author: 'user' | 'jarvis';
  text: string;
}
