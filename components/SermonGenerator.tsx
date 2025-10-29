// FIX: Import 'useCallback' from 'react'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSermon, generateSpeech } from '../services/gemini';
import { GenerateIcon, LoadingSpinner, PencilIcon, CheckIcon, PlayIcon, StopIcon, ClipboardIcon, DownloadIcon } from './icons';
import { marked } from 'marked';
import { decode, decodeAudioData, createWavBlob } from '../utils/audio';

interface SermonGeneratorProps {
    sermonText: string;
    setSermonText: (text: string) => void;
    onGenerateComplete: (text: string) => void;
}

const processAndRenderText = (text: string): string => {
    // Regex to find Arabic script characters
    const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\d]*)/g;
    const processedText = text.replace(arabicRegex, (match) => {
        // Wrap detected Arabic text in a span with a specific class for styling
        return `<span class="arabic-text">${match}</span>`;
    });
    // Parse the entire text (with wrapped Arabic) as Markdown
    return marked.parse(processedText, { breaks: true }) as string;
};


export const SermonGenerator: React.FC<SermonGeneratorProps> = ({ sermonText, setSermonText, onGenerateComplete }) => {
    const [topic, setTopic] = useState<string>('Kesabaran');
    const [tone, setTone] = useState<string>('Inspiratif lan Alus');
    const [audience, setAudience] = useState<string>('Umum');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editableText, setEditableText] = useState<string>(sermonText);
    const [renderedHtml, setRenderedHtml] = useState<string>('');
    const [speechState, setSpeechState] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [isCopied, setIsCopied] = useState<boolean>(false);
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
        setEditableText(sermonText);
        setAudioData(null); // Reset audio data when text changes
        if (sermonText) {
            setRenderedHtml(processAndRenderText(sermonText));
        } else {
            setRenderedHtml('');
        }
        // Stop any ongoing speech if the text changes
        stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sermonText]);

    // Cleanup audio on component unmount
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
            return; // Button is disabled, but as a safeguard
        }
        
        setSpeechState('generating');
        setAudioData(null);
        try {
            const audioBase64 = await generateSpeech(sermonText);
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
                // Check if it was stopped manually, to avoid setting state if already idle
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
        setSermonText('');
        setIsEditing(false);
        setAudioData(null);
        try {
            const result = await generateSermon(topic, tone, audience);
            setSermonText(result);
            onGenerateComplete(result);
        } catch (error) {
            console.error(error);
            setSermonText("Nyuwun pangapunten, wonten masalah. Cobi malih.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveEdit = () => {
        setSermonText(editableText);
        setIsEditing(false);
        setAudioData(null);
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(sermonText).then(() => {
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
            // The audio is 16-bit PCM, which is why bitsPerSample is 16.
            const wavBlob = createWavBlob(pcmData, 24000, 1, 16);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'kultum.wav';
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
            <h2 className="text-xl font-bold text-teal-300 mb-4">Gawe Teks Kultum</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-400 mb-1">Topik</label>
                    <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-gray-400 mb-1">Gaya Bahasa</label>
                    <input type="text" id="tone" value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div>
                    <label htmlFor="audience" className="block text-sm font-medium text-gray-400 mb-1">Kanggo</label>
                    <input type="text" id="audience" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500" />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-teal-800 disabled:cursor-not-allowed"
            >
                {isLoading ? <LoadingSpinner /> : <GenerateIcon />}
                <span className="ml-2">{isLoading ? 'Ndamel...' : 'Gawe Kultum'}</span>
            </button>

            <div className="mt-6 flex-grow flex flex-col bg-gray-900 rounded-lg p-4 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-300">Hasil Teks</h3>
                    {sermonText && !isLoading && (
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
                    ) : sermonText ? (
                        <div
                          className="prose-custom font-serif-javanese"
                          dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        />
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                           <p>Teks kultum bakal muncul ing mriki.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};