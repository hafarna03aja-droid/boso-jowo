import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateMcScript, generateSpeech } from '../services/gemini';
import { GenerateIcon, LoadingSpinner, PencilIcon, CheckIcon, ClipboardIcon, PlayIcon, StopIcon, DownloadIcon } from './icons';
import { marked } from 'marked';
import { decode, decodeAudioData, createWavBlob } from '../utils/audio';

interface McTextGeneratorProps {
    mcText: string;
    setMcText: (text: string) => void;
    onGenerateComplete: (text: string) => void;
}

const processAndRenderText = (text: string): string => {
    const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\d]*)/g;
    const processedText = text.replace(arabicRegex, (match) => {
        return `<span class="arabic-text">${match}</span>`;
    });
    return marked.parse(processedText, { breaks: true }) as string;
};

export const McTextGenerator: React.FC<McTextGeneratorProps> = ({ mcText, setMcText, onGenerateComplete }) => {
    const [eventType, setEventType] = useState<string>('Pernikahan Adat Jawi');
    const [tone, setTone] = useState<string>('Formal lan Alus');
    const [agenda, setAgenda] = useState<string>('1. Pambuko\n2. Waosan Ayat Suci Al-Qur\'an\n3. Atur Pambagyaharja\n4. Inti Acara\n5. Doa\n6. Panutup');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editableText, setEditableText] = useState<string>(mcText);
    const [renderedHtml, setRenderedHtml] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [speechState, setSpeechState] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [audioData, setAudioData] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setSpeechState('idle');
    }, []);

    useEffect(() => {
        setEditableText(mcText);
        setAudioData(null); // Reset audio data when text changes
        if (mcText) {
            setRenderedHtml(processAndRenderText(mcText));
        } else {
            setRenderedHtml('');
        }
        stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mcText]);

    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, [stopPlayback]);

    const handleListen = async () => {
        if (speechState === 'playing') {
            stopPlayback();
            return;
        }
        if (speechState === 'generating') {
            return;
        }
        
        setSpeechState('generating');
        setAudioData(null);
        try {
            const audioBase64 = await generateSpeech(mcText);
            if (!audioBase64) {
                throw new Error("Gagal pikantuk data audio saking server.");
            }
            
            setAudioData(audioBase64); // Save audio data for download

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = audioContext;

            const decodedAudio = decode(audioBase64);
            const audioBuffer = await decodeAudioData(decodedAudio, audioContext, 24000, 1);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                if (audioSourceRef.current) { 
                    setSpeechState('idle');
                    audioSourceRef.current = null;
                }
            };
            
            audioSourceRef.current = source;
            source.start();
            setSpeechState('playing');

        } catch (error) {
            console.error("Error generating or playing speech:", error);
            alert(error instanceof Error ? error.message : "Wonten masalah nalika muter audio.");
            setSpeechState('idle');
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setMcText('');
        setIsEditing(false);
        setAudioData(null);
        try {
            const result = await generateMcScript(eventType, tone, agenda);
            setMcText(result);
            onGenerateComplete(result);
        } catch (error) {
            console.error(error);
            setMcText("Nyuwun pangapunten, wonten masalah. Cobi malih.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveEdit = () => {
        setMcText(editableText);
        setIsEditing(false);
        setAudioData(null);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(mcText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert("Gagal nyalin teks.");
        });
    };
    
    const handleDownload = () => {
        if (!audioData) return;
        try {
            const pcmData = decode(audioData);
            // The audio is 16-bit PCM.
            const wavBlob = createWavBlob(pcmData, 24000, 1, 16);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'teks-mc.wav';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Failed to download audio:', error);
            alert('Gagal ngundhuh audio.');
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-b-xl rounded-r-xl shadow-2xl flex flex-col h-full animate-fade-in">
            <h2 className="text-xl font-bold text-teal-300 mb-4">Gawe Teks Pranatacara (MC)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="eventType" className="block text-sm font-medium text-gray-400 mb-1">Jenis Acara</label>
                    <input type="text" id="eventType" value={eventType} onChange={e => setEventType(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                    <label htmlFor="tone-mc" className="block text-sm font-medium text-gray-400 mb-1">Gaya Bahasa</label>
                    <input type="text" id="tone-mc" value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
                </div>
            </div>
             <div className="mb-4">
                <label htmlFor="agenda" className="block text-sm font-medium text-gray-400 mb-1">Rundown Acara (Opsional)</label>
                <textarea id="agenda" value={agenda} onChange={e => setAgenda(e.target.value)} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-teal-800 disabled:cursor-not-allowed"
            >
                {isLoading ? <LoadingSpinner /> : <GenerateIcon />}
                <span className="ml-2">{isLoading ? 'Ndamel...' : 'Gawe Teks MC'}</span>
            </button>

            <div className="mt-6 flex-grow flex flex-col bg-gray-900 rounded-lg p-4 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-300">Hasil Teks</h3>
                    {mcText && !isLoading && (
                        <div className="flex items-center space-x-2">
                            {isEditing ? (
                                <button onClick={handleSaveEdit} className="text-teal-400 hover:text-teal-300 transition-colors p-1" aria-label="Simpen Owahan">
                                    <CheckIcon className="w-5 h-5" />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCopy}
                                        className="text-gray-400 hover:text-white transition-colors p-1"
                                        aria-label="Salin Teks"
                                    >
                                        {isCopied ? <CheckIcon className="w-5 h-5 text-teal-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                    </button>
                                     <button
                                        onClick={handleListen}
                                        disabled={speechState === 'generating'}
                                        className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50 disabled:cursor-wait"
                                        aria-label={speechState === 'playing' ? "Stop Mirengaken" : "Dengarkan Teks"}
                                    >
                                        {speechState === 'generating' ? (
                                            <LoadingSpinner className="w-5 h-5"/>
                                        ) : speechState === 'playing' ? (
                                            <StopIcon className="w-5 h-5" />
                                        ) : (
                                            <PlayIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                    {audioData && speechState !== 'generating' && (
                                         <button onClick={handleDownload} className="text-gray-400 hover:text-white transition-colors p-1" aria-label="Unduh Audio">
                                            <DownloadIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white transition-colors p-1" aria-label="Edit Teks">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex-grow overflow-y-auto text-gray-300">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <LoadingSpinner className="w-8 h-8" />
                        </div>
                    ) : isEditing ? (
                        <textarea
                            value={editableText}
                            onChange={(e) => setEditableText(e.target.value)}
                            className="w-full h-full bg-transparent resize-none focus:outline-none font-serif-javanese"
                            autoFocus
                        />
                    ) : mcText ? (
                        <div
                          className="prose-custom font-serif-javanese"
                          dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        />
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                           <p>Teks MC bakal muncul ing mriki.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};