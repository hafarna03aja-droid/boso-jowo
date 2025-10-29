import React, { useState, useEffect, useCallback } from 'react';
import { SermonGenerator } from './components/SermonGenerator';
import { McTextGenerator } from './components/McTextGenerator';
import { PracticeSession } from './components/PracticeSession';
import { History, HistoryItem } from './components/History';

type ActiveTab = 'sermon' | 'mc' | 'history';

const App: React.FC = () => {
  const [sermonText, setSermonText] = useState<string>('');
  const [mcText, setMcText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('sermon');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('wicaraJawiHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
      setHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('wicaraJawiHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage:", error);
    }
  }, [history]);

  const addToHistory = useCallback((type: 'sermon' | 'mc', text: string) => {
    const newItem: HistoryItem = {
      id: Date.now(),
      type,
      text,
    };
    // Add to the beginning of the array and keep the last 50 items
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm("Punapa panjenengan yakin badhe mbusak sedaya riwayat?")) {
        setHistory([]);
    }
  }, []);

  const loadFromHistory = useCallback((item: HistoryItem) => {
    if (item.type === 'sermon') {
      setSermonText(item.text);
      setActiveTab('sermon');
    } else {
      setMcText(item.text);
      setActiveTab('mc');
    }
  }, []);

  const TabButton: React.FC<{ tabName: ActiveTab; label: string }> = ({ tabName, label }) => {
    const isActive = activeTab === tabName;
    return (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
                isActive
                    ? 'bg-gray-800 text-teal-300'
                    : 'bg-transparent text-gray-400 hover:text-white'
            }`}
            style={isActive ? { borderBottom: '2px solid #2dd4bf'} : {}}
        >
            {label}
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-400 tracking-wider">
            Asisten Wicara Jawi
          </h1>
          <p className="text-sm text-gray-400 hidden md:block">24 Learning Centre</p>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left Panel with Tabs */}
          <div>
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <TabButton tabName="sermon" label="Teks Kultum" />
                    <TabButton tabName="mc" label="Teks MC" />
                    <TabButton tabName="history" label="Riwayat" />
                </nav>
            </div>
            <div className="mt-[-1px]">
              {activeTab === 'sermon' && (
                <SermonGenerator sermonText={sermonText} setSermonText={setSermonText} onGenerateComplete={(text) => addToHistory('sermon', text)} />
              )}
              {activeTab === 'mc' && (
                <McTextGenerator mcText={mcText} setMcText={setMcText} onGenerateComplete={(text) => addToHistory('mc', text)} />
              )}
              {activeTab === 'history' && (
                  <History history={history} onLoad={loadFromHistory} onClear={clearHistory} />
              )}
            </div>
          </div>

          {/* Right Panel */}
          <PracticeSession />
        </div>
      </main>
    </div>
  );
};

export default App;