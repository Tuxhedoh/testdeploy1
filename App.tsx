
import React, { useState, useEffect, useCallback } from 'react';
import { MemeState, Suggestion, MemeTemplate } from './types';
import { TRENDING_TEMPLATES, DEFAULT_FONT_SIZE, AVAILABLE_FONTS, DEFAULT_FONT_FAMILY } from './constants';
import MemeCanvas from './components/MemeCanvas';
import RecentMemes from './components/RecentMemes';
import { suggestCaptions, editMemeImage, generateMemeBackground } from './services/geminiService';

const App: React.FC = () => {
  const [memeState, setMemeState] = useState<MemeState>({
    imageUrl: null,
    topText: 'ENTER TOP TEXT',
    bottomText: 'ENTER BOTTOM TEXT',
    fontSize: DEFAULT_FONT_SIZE,
    textColor: '#ffffff',
    fontFamily: DEFAULT_FONT_FAMILY,
    topOffset: 5,
    bottomOffset: 95,
    style: 'classic',
  });

  const [past, setPast] = useState<MemeState[]>([]);
  const [future, setFuture] = useState<MemeState[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [dreamPrompt, setDreamPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('sarcastic');
  const [gallery, setGallery] = useState<MemeState[]>([]);

  // Load gallery from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memegenie_gallery');
    if (saved) {
      try {
        setGallery(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load gallery", e);
      }
    }
  }, []);

  const saveToGallery = () => {
    if (!memeState.imageUrl) return;
    const newGallery = [memeState, ...gallery].slice(0, 20); // Keep last 20
    setGallery(newGallery);
    localStorage.setItem('memegenie_gallery', JSON.stringify(newGallery));
  };

  const clearGallery = () => {
    setGallery([]);
    localStorage.removeItem('memegenie_gallery');
  };

  // Helper to update state and record history
  const pushState = useCallback((newState: MemeState | ((prev: MemeState) => MemeState)) => {
    setPast(prev => [...prev, memeState].slice(-50)); // Limit history to 50 steps
    if (typeof newState === 'function') {
      setMemeState(prev => newState(prev));
    } else {
      setMemeState(newState);
    }
    setFuture([]);
  }, [memeState]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture(prev => [memeState, ...prev]);
    setMemeState(previous);
    setPast(newPast);
  }, [past, memeState]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, memeState]);
    setMemeState(next);
    setFuture(newFuture);
  }, [future, memeState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  /**
   * Helper to convert a remote URL to base64.
   * Required because Gemini API expects base64 data, not image URLs.
   */
  const getAsBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        pushState(prev => ({ ...prev, imageUrl: event.target?.result as string }));
        setSuggestions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDreamGenerate = async () => {
    if (!dreamPrompt) return;
    setIsGenerating(true);
    try {
      const url = await generateMemeBackground(dreamPrompt);
      if (url) {
        pushState(prev => ({ ...prev, imageUrl: url }));
        setDreamPrompt('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMagicCaption = async () => {
    if (!memeState.imageUrl) return;
    setIsAnalyzing(true);
    try {
      const base64Data = await getAsBase64(memeState.imageUrl);
      const res = await suggestCaptions(base64Data, selectedTone);
      setSuggestions(res);
      if (res.length > 0) {
        pushState(prev => ({
          ...prev,
          topText: res[0].top,
          bottomText: res[0].bottom,
          textColor: res[0].suggestedColor || '#ffffff'
        }));
      }
    } catch (err) {
      console.error(err);
      alert("AI was unable to process this image. Try uploading a different file or a template.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIEdit = async () => {
    if (!memeState.imageUrl || !editPrompt) return;
    setIsEditing(true);
    try {
      const base64Data = await getAsBase64(memeState.imageUrl);
      const editedUrl = await editMemeImage(base64Data, editPrompt);
      if (editedUrl) {
        pushState(prev => ({ ...prev, imageUrl: editedUrl }));
        setEditPrompt('');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to modify the image. The prompt might be too complex or restricted.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-['Inter']">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-500 p-2 rounded-xl shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">MemeGenie <span className="text-indigo-500">2.0</span></h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1 mr-2">
              <button
                onClick={undo}
                disabled={past.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                title="Redo (Ctrl+Y)"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
              </button>
            </div>

            <label className="cursor-pointer bg-white/5 hover:bg-white/10 transition px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Upload
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">

        {/* Left Section: Visuals */}
        <div className="lg:col-span-7 space-y-8">
          <MemeCanvas
            state={memeState}
            onUpdateState={(update) => setMemeState(prev => ({ ...prev, ...update }))}
          />

          {/* AI Generation Bar */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-2xl">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
              </svg>
              Dream it into existence
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={dreamPrompt}
                onChange={e => setDreamPrompt(e.target.value)}
                placeholder="Describe a scene: 'A penguin riding a surfing cat'..."
                className="flex-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600 transition-all"
                onKeyDown={e => e.key === 'Enter' && handleDreamGenerate()}
              />
              <button
                onClick={handleDreamGenerate}
                disabled={isGenerating || !dreamPrompt}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : "Generate Background"}
              </button>
            </div>
          </div>

          {/* Templates Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Trending Classics</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {TRENDING_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => pushState(prev => ({ ...prev, imageUrl: t.url }))}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${memeState.imageUrl === t.url ? 'border-indigo-500 scale-95 shadow-lg shadow-indigo-500/20' : 'border-white/5 hover:border-white/20'
                    }`}
                >
                  <img src={t.url} alt={t.name} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" />
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <RecentMemes
            memes={gallery}
            onSelect={(m) => pushState(m)}
            onClear={clearGallery}
          />
        </div>

        {/* Right Section: Controls */}
        <div className="lg:col-span-5 space-y-6">

          {/* Main Action */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['sarcastic', 'wholesome', 'gen-z', 'brainrot', 'edgy'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTone(t)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${selectedTone === t
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/40'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={handleMagicCaption}
              disabled={!memeState.imageUrl || isAnalyzing}
              className={`w-full group relative py-4 rounded-2xl font-black text-lg overflow-hidden transition-all shadow-2xl ${isAnalyzing
                ? 'bg-slate-800 cursor-not-allowed text-slate-500'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:scale-[1.02] active:scale-95'
                }`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.047a1 1 0 01.897.95l.1 2.21 2.21.1a1 1 0 01.95.897L17 5.2a1 1 0 01-.95.897l-2.21.1-.1 2.21a1 1 0 01-.897.95l-.1-2.21-2.21-.1a1 1 0 01-.95-.897L9 5.2a1 1 0 01.95-.897l2.21-.1.1-2.21z" clipRule="evenodd" />
                      <path d="M5 4a1 1 0 011 1v5h5a1 1 0 110 2H6v5a1 1 0 11-2 0v-5H1a1 1 0 110-2h3V5a1 1 0 011-1z" />
                    </svg>
                    MAGIC CAPTION
                  </>
                )}
              </div>
              {!isAnalyzing && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>

            <button
              onClick={saveToGallery}
              disabled={!memeState.imageUrl}
              className="w-full py-3 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save to My Gallery
            </button>
          </div>

          {/* AI Variations Sidebar */}
          {suggestions.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  AI Suggestions
                </p>
                <button onClick={() => setSuggestions([])} className="text-slate-600 hover:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => pushState(prev => ({
                      ...prev,
                      topText: s.top,
                      bottomText: s.bottom,
                      textColor: s.suggestedColor || prev.textColor
                    }))}
                    className="group text-left bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all border border-transparent hover:border-indigo-500/30 active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Option #{idx + 1}</span>
                      <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: s.suggestedColor }} />
                    </div>
                    <p className="text-xs text-white font-black uppercase truncate">{s.top}</p>
                    <p className="text-xs text-indigo-400 font-black uppercase truncate">{s.bottom}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-white/5 space-y-8 shadow-inner">

            {/* Style Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meme Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['classic', 'modern', 'demotivational'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => pushState(prev => ({ ...prev, style: s }))}
                    className={`px-2 py-3 rounded-xl text-[9px] font-bold uppercase transition-all border ${memeState.style === s
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Inputs with Offsets */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Caption</label>
                  <span className="text-[9px] text-slate-600">{Math.round(memeState.topOffset)}%</span>
                </div>
                <input
                  value={memeState.topText}
                  onChange={e => {
                    const val = e.target.value;
                    setMemeState(prev => ({ ...prev, topText: val }));
                  }}
                  onBlur={() => pushState(memeState)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="TOP TEXT"
                />
                <input
                  type="range" min="0" max="100" step="1"
                  value={memeState.topOffset}
                  onChange={e => setMemeState(prev => ({ ...prev, topOffset: parseInt(e.target.value) }))}
                  onMouseUp={() => pushState(memeState)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bottom Caption</label>
                  <span className="text-[9px] text-slate-600">{Math.round(memeState.bottomOffset)}%</span>
                </div>
                <input
                  value={memeState.bottomText}
                  onChange={e => {
                    const val = e.target.value;
                    setMemeState(prev => ({ ...prev, bottomText: val }));
                  }}
                  onBlur={() => pushState(memeState)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="BOTTOM TEXT"
                />
                <input
                  type="range" min="0" max="100" step="1"
                  value={memeState.bottomOffset}
                  onChange={e => setMemeState(prev => ({ ...prev, bottomOffset: parseInt(e.target.value) }))}
                  onMouseUp={() => pushState(memeState)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Styling */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Typeface</label>
                <select
                  value={memeState.fontFamily}
                  onChange={e => pushState(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Size ({memeState.fontSize}px)</label>
                <input
                  type="range" min="12" max="140" step="1"
                  value={memeState.fontSize}
                  onChange={e => setMemeState(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  onMouseUp={() => pushState(memeState)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={memeState.textColor}
                    onChange={e => setMemeState(prev => ({ ...prev, textColor: e.target.value }))}
                    onBlur={() => pushState(memeState)}
                    className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer p-0"
                  />
                  <div className="flex-1 flex gap-1">
                    {['#ffffff', '#ffff00', '#ff00ff', '#00ffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => pushState(prev => ({ ...prev, textColor: c }))}
                        className="w-6 h-6 rounded-full border border-white/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image Transformer */}
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-md rounded-3xl p-6 border border-indigo-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Image AI Transform</p>
            </div>
            <div className="relative group">
              <input
                type="text"
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                placeholder="Modify pixels: 'Add sunglasses'..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-5 pr-14 py-4 text-base sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                onKeyDown={e => e.key === 'Enter' && handleAIEdit()}
              />
              <button
                onClick={handleAIEdit}
                disabled={!memeState.imageUrl || !editPrompt || isEditing}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 flex items-center justify-center transition-all shadow-lg"
              >
                {isEditing ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Retro", "Noir", "Vibrant", "Glow"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setEditPrompt(`Make the image feel more ${tag.toLowerCase()}`)}
                  className="text-[9px] font-bold text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors uppercase"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full px-8 py-12 flex flex-col md:flex-row items-center justify-between border-t border-white/5 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <span className="text-slate-400">Gemini Pro Vision</span>
          <span className="w-1 h-1 bg-slate-800 rounded-full" />
          <span className="text-slate-400">Gemini 2.5 Flash Image</span>
        </div>
        <div>MemeGenie AI &copy; 2025 Creative Intelligence</div>
      </footer>
    </div>
  );
};

export default App;
