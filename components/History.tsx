import React from 'react';
import { HistoryIcon, TrashIcon } from './icons';

export interface HistoryItem {
    id: number;
    type: 'sermon' | 'mc';
    text: string;
}

interface HistoryProps {
    history: HistoryItem[];
    onLoad: (item: HistoryItem) => void;
    onClear: () => void;
}

export const History: React.FC<HistoryProps> = ({ history, onLoad, onClear }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-b-xl rounded-r-xl shadow-2xl flex flex-col h-full animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-teal-300">Riwayat Teks</h2>
                 {history.length > 0 && (
                    <button
                        onClick={onClear}
                        className="flex items-center text-sm text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Hapus Sedaya Riwayat"
                    >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Hapus Riwayat
                    </button>
                 )}
            </div>

            <div className="flex-grow bg-gray-900 rounded-lg overflow-y-auto">
                {history.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Daftar riwayat teks bakal muncul ing mriki.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-700">
                        {history.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => onLoad(item)}
                                    className="w-full text-left p-4 hover:bg-gray-700/50 transition-colors duration-200"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 pt-1">
                                            <HistoryIcon className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                    item.type === 'sermon' ? 'bg-blue-600 text-blue-100' : 'bg-purple-600 text-purple-100'
                                                }`}>
                                                    {item.type === 'sermon' ? 'Kultum' : 'MC'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(item.id).toLocaleString('sv-SE')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2">
                                                {item.text.replace(/#+\s*/g, '').substring(0, 150)}...
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
