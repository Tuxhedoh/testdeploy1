
import React, { useRef, useEffect, useState } from 'react';
import { MemeState } from '../types';

interface Props {
  state: MemeState;
  onUpdateState?: (newState: Partial<MemeState>) => void;
}

const SNAP_THRESHOLD = 3; // percentage
const SNAP_POINTS_X = [5, 50, 95]; // Left, Center, Right

const MemeCanvas: React.FC<Props> = ({ state, onUpdateState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState<'top' | 'bottom' | 'image' | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>({});
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state.imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.imageUrl;
    img.onload = () => {
      // Helper to wrap text
      const getWrappedLines = (text: string, maxWidth: number, font: string) => {
        if (!text) return []; // Handle empty text
        ctx.save();
        ctx.font = font;
        const manualLines = text.toUpperCase().split('\n');
        const wrappedLines: string[] = [];

        manualLines.forEach(l => {
          if (l.trim() === '') {
            wrappedLines.push('');
            return;
          }
          const words = l.split(' ');
          let currentLine = words[0];
          for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
              currentLine += " " + word;
            } else {
              wrappedLines.push(currentLine);
              currentLine = word;
            }
          }
          wrappedLines.push(currentLine);
        });
        ctx.restore();
        return wrappedLines;
      };

      const maxWidth = 800;
      const scale = maxWidth / img.width;
      const textMaxWidth = maxWidth * 0.9;
      const imgScale = state.imageScale || 1;

      // Prepare fonts for measuring
      const topFont = state.style === 'modern'
        ? `600 ${state.topFontSize * 0.8}px Inter, sans-serif`
        : (state.style === 'demotivational' ? `${state.topFontSize}px "Times New Roman", serif` : `900 ${state.topFontSize}px ${state.fontFamily}`);

      const bottomFont = state.style === 'demotivational'
        ? `${state.bottomFontSize * 0.6}px "Times New Roman", serif`
        : `900 ${state.bottomFontSize}px ${state.fontFamily}`;

      const topLines = getWrappedLines(state.topText, textMaxWidth, topFont);
      const bottomLines = getWrappedLines(state.bottomText, textMaxWidth, bottomFont);

      // Calculate canvas height based on style
      let canvasWidth = maxWidth;
      let canvasHeight = img.height * scale;
      let imageYOffset = 0;

      if (state.style === 'modern') {
        const boxHeight = 100 + (topLines.length * state.topFontSize * 0.6);
        canvasHeight += boxHeight;
        imageYOffset = boxHeight;
      } else if (state.style === 'demotivational') {
        canvasWidth += 100;
        canvasHeight += 250;
        imageYOffset = 50;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill background
      if (state.style === 'modern') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (state.style === 'demotivational') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, (canvas.width - 96), (img.height * scale) + 4);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw image with scale and offset
      const imgX = (state.style === 'demotivational' ? 50 : 0) + (state.imageXOffset || 0);
      const imgY = imageYOffset + (state.imageYOffset || 0);
      const drawWidth = maxWidth * imgScale;
      const drawHeight = (img.height * scale) * imgScale;

      ctx.save();
      if (state.style === 'demotivational') {
        // Clip to legal image area for demotivational
        ctx.beginPath();
        ctx.rect(50, 50, maxWidth, img.height * scale);
        ctx.clip();
      }
      ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
      ctx.restore();

      // ... rest of draw guides and lines ...
      if (isDragging && isDragging !== 'image') {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        if (activeGuides.x !== undefined) {
          const gx = (canvas.width * activeGuides.x) / 100;
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
        }
        if (activeGuides.y !== undefined) {
          const gy = (canvas.height * activeGuides.y) / 100;
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
        }
        ctx.restore();
      }

      const drawTextLines = (lines: string[], xPercent: number, yPercent: number, isBottom: boolean, font: string, fontSize: number) => {
        const x = (canvas.width * xPercent) / 100;
        const y = (canvas.height * yPercent) / 100;
        ctx.save(); ctx.font = font;

        if (state.style === 'modern' && !isBottom) {
          ctx.fillStyle = 'black'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          lines.forEach((line, i) => ctx.fillText(line, 20, 20 + i * (fontSize * 1.1)));
        } else if (state.style === 'demotivational') {
          ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          const textY = isBottom ? (img.height * scale) + imageYOffset + 20 : (img.height * scale) + imageYOffset + 70;
          lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, textY + i * (fontSize * 1.2)));
        } else {
          ctx.fillStyle = state.textColor; ctx.strokeStyle = 'black'; ctx.lineWidth = Math.max(2, fontSize / 10);
          let textAlign: CanvasTextAlign = 'center';
          if (xPercent <= 10) textAlign = 'left'; else if (xPercent >= 90) textAlign = 'right';
          ctx.textAlign = textAlign; ctx.textBaseline = isBottom ? 'bottom' : 'top';
          let drawX = x; const horizontalMargin = (canvas.width * 5) / 100;
          if (textAlign === 'left') drawX = horizontalMargin; if (textAlign === 'right') drawX = canvas.width - horizontalMargin;
          lines.forEach((line, i) => {
            const lineY = !isBottom ? y + i * (fontSize * 1.1) : y - (lines.length - 1 - i) * (fontSize * 1.1);
            ctx.strokeText(line, drawX, lineY); ctx.fillText(line, drawX, lineY);
          });
        }
        ctx.restore();
      };

      if (state.topText) drawTextLines(topLines, state.topX ?? 50, state.topOffset, false, topFont, state.topFontSize);
      if (state.bottomText) drawTextLines(bottomLines, state.bottomX ?? 50, state.bottomOffset, true, bottomFont, state.bottomFontSize);
    };
  }, [state, isDragging, activeGuides]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (state.style === 'classic') {
      const topY = (canvas.height * state.topOffset) / 100;
      const bottomY = (canvas.height * state.bottomOffset) / 100;
      if (Math.abs(y - topY) < 60) { setIsDragging('top'); return; }
      if (Math.abs(y - bottomY) < 60) { setIsDragging('bottom'); return; }
    }

    // Default to image dragging if not on text
    setIsDragging('image');
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onUpdateState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging === 'image' && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      onUpdateState({
        imageXOffset: (state.imageXOffset || 0) + dx,
        imageYOffset: (state.imageYOffset || 0) + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    const active: { x?: number; y?: number } = {};
    for (const snapX of SNAP_POINTS_X) {
      if (Math.abs(x - snapX) < SNAP_THRESHOLD) { x = snapX; active.x = snapX; break; }
    }
    const otherX = isDragging === 'top' ? (state.bottomX ?? 50) : (state.topX ?? 50);
    if (Math.abs(x - otherX) < SNAP_THRESHOLD) { x = otherX; active.x = otherX; }
    if (Math.abs(y - 50) < SNAP_THRESHOLD) { y = 50; active.y = 50; }
    setActiveGuides(active);
    onUpdateState({
      [isDragging === 'top' ? 'topOffset' : 'bottomOffset']: y,
      [isDragging === 'top' ? 'topX' : 'bottomX']: x
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    if (state.style === 'classic') {
      const topY = (canvas.height * state.topOffset) / 100;
      const bottomY = (canvas.height * state.bottomOffset) / 100;
      if (Math.abs(y - topY) < 60) { setIsDragging('top'); e.preventDefault(); return; }
      if (Math.abs(y - bottomY) < 60) { setIsDragging('bottom'); e.preventDefault(); return; }
    }

    setIsDragging('image');
    setDragStart({ x: touch.clientX, y: touch.clientY });
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onUpdateState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];

    if (isDragging === 'image' && dragStart) {
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      onUpdateState({
        imageXOffset: (state.imageXOffset || 0) + dx,
        imageYOffset: (state.imageYOffset || 0) + dy
      });
      setDragStart({ x: touch.clientX, y: touch.clientY });
      e.preventDefault();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    let y = ((touch.clientY - rect.top) / rect.height) * 100;
    let x = ((touch.clientX - rect.left) / rect.width) * 100;
    const active: { x?: number; y?: number } = {};
    for (const snapX of SNAP_POINTS_X) {
      if (Math.abs(x - snapX) < SNAP_THRESHOLD) { x = snapX; active.x = snapX; break; }
    }
    const otherX = isDragging === 'top' ? (state.bottomX ?? 50) : (state.topX ?? 50);
    if (Math.abs(x - otherX) < SNAP_THRESHOLD) { x = otherX; active.x = otherX; }
    if (Math.abs(y - 50) < SNAP_THRESHOLD) { y = 50; active.y = 50; }
    setActiveGuides(active);
    onUpdateState({
      [isDragging === 'top' ? 'topOffset' : 'bottomOffset']: y,
      [isDragging === 'top' ? 'topX' : 'bottomX']: x
    });
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const handleMouseUp = () => {
    if (isDragging && onUpdateState) {
      onUpdateState(state);
    }
    setIsDragging(null);
    setActiveGuides({});
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `meme-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert("Copied to clipboard!");
        } catch (err) {
          console.error("Failed to copy", err);
        }
      }
    }, 'image/png');
  };

  if (!state.imageUrl) {
    return (
      <div className="w-full aspect-[4/3] bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-700 shadow-inner">
        <div className="bg-slate-700/50 p-4 rounded-full mb-4 animate-pulse">
          <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Waiting for inspiration...</p>
      </div>
    );
  }

  return (
    <div className="relative group rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`max-w-full h-auto mx-auto block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        <button
          onClick={handleCopy}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>
        <button
          onClick={handleDownload}
          className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save
        </button>
      </div>
    </div>
  );
};

export default MemeCanvas;
