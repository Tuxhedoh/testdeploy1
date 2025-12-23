
import React from 'react';
import { MemeState } from '../types';

interface Props {
    memes: MemeState[];
    onSelect: (meme: MemeState) => void;
    onClear: () => void;
}

const RecentMemes: React.FC<Props> = ({ memes, onSelect, onClear }) => {
    if (memes.length === 0) return null;

    return (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Your Hall of Fame</h3>
                <button
                    onClick={onClear}
                    className="text-[10px] font-bold text-slate-600 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                    Reset Gallery
                </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {memes.map((m, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(m)}
                        className="flex-shrink-0 w-32 aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/5 hover:border-indigo-500/50 transition-all group relative"
                    >
                        {m.imageUrl && (
                            <img src={m.imageUrl} alt="Meme" className="w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all" />
                        )}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-all flex items-end p-2">
                            <p className="text-[8px] font-black text-white uppercase truncate drop-shadow-md">{m.topText}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RecentMemes;
