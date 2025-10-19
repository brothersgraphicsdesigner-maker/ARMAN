import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Chat } from '@google/genai';
import type { AssistantStatus, Message } from '../types';

// Fix: `LiveSession` is not an exported member of '@google/genai', so a local interface is defined for type safety.
interface LiveSession {
  sendRealtimeInput(input: { media: Blob }): void;
  close(): void;
}

// Helper functions for audio encoding/decoding as per guidelines
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const useJarvis = () => {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const initializeApi = useCallback(() => {
    if (!aiRef.current) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiRef.current;
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
    }
    const outputAudioContext = outputAudioContextRef.current;
    
    return new Promise<void>(async (resolve) => {
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContext,
            24000,
            1,
        );
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.addEventListener('ended', () => {
            sourcesRef.current.delete(source);
            resolve();
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        sourcesRef.current.add(source);
    });
  }, []);

  const stopAudioProcessing = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    inputAudioContextRef.current?.close().catch(console.error);

    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current = null;
  }, []);

  const stopSession = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    
    stopAudioProcessing();

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    
    setStatus('idle');
  }, [stopAudioProcessing]);

  const startSession = useCallback(async () => {
    setError(null);
    setMessages([]);
    setStatus('connecting');

    try {
      const ai = initializeApi();

      if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
      }
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            setStatus('listening');
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaStreamRef.current = stream;

              const context = inputAudioContextRef.current!;
              const source = context.createMediaStreamSource(stream);
              mediaStreamSourceRef.current = source;
              const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    int16[i] = inputData[i] * 32768;
                }
                const pcmBlob: Blob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(context.destination);
            } catch (err) {
              console.error('Microphone access denied or error:', err);
              setError('Microphone access was denied. Please allow microphone access in your browser settings.');
              setStatus('error');
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.outputTranscription) {
              setStatus('speaking');
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64EncodedAudioString) {
              setStatus('speaking');
              await playAudio(base64EncodedAudioString);
              if (statusRef.current === 'speaking' && sourcesRef.current.size === 0) {
                 setStatus('listening');
              }
            }

            if (message.serverContent?.turnComplete) {
                const userInput = currentInputTranscriptionRef.current.trim();
                const jarvisResponse = currentOutputTranscriptionRef.current.trim();

                const newMessages: Message[] = [];
                if (userInput) {
                    newMessages.push({ id: `user-${Date.now()}`, author: 'user', text: userInput });
                }
                if (jarvisResponse) {
                    newMessages.push({ id: `jarvis-${Date.now()}`, author: 'jarvis', text: jarvisResponse });
                }

                if (newMessages.length > 0) {
                    setMessages(prev => [...prev, ...newMessages]);
                }
                
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                
                if (sourcesRef.current.size === 0) {
                    setStatus('listening');
                }
            }

            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('listening');
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`An error occurred: ${e.message}`);
            setStatus('error');
            stopAudioProcessing();
          },
          onclose: () => {
            stopAudioProcessing();
            setStatus('idle');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
      });

      await sessionPromiseRef.current;

    } catch (err) {
      console.error('Failed to start session:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to start session: ${errorMessage}`);
      setStatus('error');
    }
  }, [stopSession, stopAudioProcessing, initializeApi, playAudio]);
  
  const handleToggleSession = useCallback(() => {
    if (status === 'idle' || status === 'error') {
      startSession();
    } else {
      stopSession();
    }
  }, [status, startSession, stopSession]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (status !== 'idle') return;

    setError(null);
    const userMessage: Message = { id: `user-${Date.now()}`, author: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setStatus('thinking');

    try {
        const ai = initializeApi();
        if (!chatRef.current) {
            chatRef.current = ai.chats.create({ model: 'gemini-2.5-flash' });
        }

        const response = await chatRef.current.sendMessage({ message: text });
        const jarvisText = response.text;
        const jarvisMessage: Message = { id: `jarvis-${Date.now()}`, author: 'jarvis', text: jarvisText };
        setMessages(prev => [...prev, jarvisMessage]);
        
        // Generate and play audio
        const ttsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: jarvisText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
            },
        });
        
        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            setStatus('speaking');
            await playAudio(base64Audio);
        }

    } catch (err) {
        console.error('Failed to send text message:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to get response: ${errorMessage}`);
        setStatus('error');
    } finally {
        if (statusRef.current !== 'error') {
            setStatus('idle');
        }
    }
  }, [status, initializeApi, playAudio]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return { status, messages, error, handleToggleSession, sendTextMessage };
};