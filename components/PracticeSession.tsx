import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ConversationTurn } from '../types';
import { startLiveSession } from '../services/gemini';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { MicrophoneIcon, StopIcon, LoadingSpinner } from './icons';
import { LiveServerMessage, LiveSession } from '@google/genai';


const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-500';
    if (status === 'Aktif') color = 'bg-green-500';
    if (status === 'Nyambung...') color = 'bg-yellow-500';
    if (status === 'Error') color = 'bg-red-500';

    return (
        <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color} ${status !== 'Mati' ? 'animate-pulse' : ''}`}></span>
            <span className="text-sm font-medium text-gray-300">{status}</span>
        </div>
    );
};

export const PracticeSession: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Mati');
    const [conversation, setConversation] = useState<ConversationTurn[]>([]);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);


    const stopSession = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        setIsSessionActive(false);
        setStatus('Mati');
    }, []);

    const handleMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription?.text) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        }
        if (message.serverContent?.inputTranscription?.text) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        }
        if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscriptionRef.current.trim();
            const fullOutput = currentOutputTranscriptionRef.current.trim();

            setConversation(prev => {
                const newConversation = [...prev];
                if (fullInput) newConversation.push({ speaker: 'user', text: fullInput });
                if (fullOutput) newConversation.push({ speaker: 'model', text: fullOutput });
                return newConversation;
            });

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            const audioContext = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);

            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }

        if (message.serverContent?.interrupted) {
            for (const source of audioSourcesRef.current.values()) {
                source.stop();
            }
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
        }
    };

    const handleToggleSession = async () => {
        if (isSessionActive) {
            stopSession();
            return;
        }

        setIsSessionActive(true);
        setStatus('Nyambung...');
        setConversation([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            sessionPromiseRef.current = startLiveSession({
                onopen: () => {
                    setStatus('Aktif');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                    mediaStreamSourceRef.current = source;
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        if (sessionPromiseRef.current) {
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: handleMessage,
                onerror: (e) => {
                    console.error('Session error:', e);
                    setStatus('Error');
                    stopSession();
                },
                onclose: () => {
                    stopSession();
                },
            });
            await sessionPromiseRef.current;

        } catch (err) {
            console.error('Failed to start session:', err);
            setStatus('Error');
            setIsSessionActive(false);
            stopSession();
        }
    };
    
    useEffect(() => {
        return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col h-[80vh] lg:h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-teal-300">Latihan Wicara</h2>
                <StatusIndicator status={status} />
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 flex-grow overflow-y-auto mb-4 min-h-[300px]">
                {conversation.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Pencet tombol "Mulai" kanggo latihan.</p>
                    </div>
                )}
                <div className="space-y-4">
                    {conversation.map((turn, index) => (
                        <div key={index} className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${turn.speaker === 'user' ? 'bg-teal-700 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                <p className="text-sm font-bold capitalize mb-1">{turn.speaker === 'user' ? 'Panjenengan' : 'AI'}</p>
                                <p>{turn.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </div>
            </div>

            <button
                onClick={handleToggleSession}
                className={`w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:cursor-not-allowed ${isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
                {status === 'Nyambung...' ? (
                    <LoadingSpinner />
                ) : isSessionActive ? (
                    <StopIcon className="w-6 h-6" />
                ) : (
                    <MicrophoneIcon className="w-6 h-6" />
                )}
                <span className="ml-2">
                    {status === 'Nyambung...' ? 'Nyambung...' : isSessionActive ? 'Stop Latihan' : 'Mulai Latihan'}
                </span>
            </button>
        </div>
    );
};