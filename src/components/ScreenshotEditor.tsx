import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Type,
  Circle,
  Highlighter,
  Eye,
  EyeOff,
  Download,
  Trash2,
  X,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Sparkles,
  Square,
} from 'lucide-react';
import type { Screenshot, Annotation } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type Props = {
  screenshot: Screenshot;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (shot: Screenshot) => void;
};

type Tool = 'select' | 'arrow' | 'text' | 'number' | 'highlight' | 'blur';

const wallpapers = [
  { id: 'none', name: 'None', color: 'transparent' },
  { id: 'silk', name: 'Silk', color: 'linear-gradient(135deg, #1e3a5f, #2d5a87)' },
  { id: 'miami', name: 'Miami', color: 'linear-gradient(135deg, #ff6b6b, #feca57)' },
  { id: 'aurora', name: 'Aurora', color: 'linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)' },
  { id: 'satin', name: 'Satin', color: 'linear-gradient(135deg, #2c2c3e, #3e3e5e)' },
  { id: 'frost', name: 'Frost', color: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' },
  { id: 'dark', name: 'Dark', color: '#1a1a2e' },
  { id: 'light', name: 'Light', color: '#f4f4f5' },
  { id: 'ocean', name: 'Ocean', color: 'linear-gradient(135deg, #0c4a6e, #0891b2)' },
  { id: 'forest', name: 'Forest', color: 'linear-gradient(135deg, #14532d, #22c55e)' },
  { id: 'sunset', name: 'Sunset', color: 'linear-gradient(135deg, #f97316, #ef4444)' },
  { id: 'mono', name: 'Mono', color: '#0a0a0f' },
];

const tilts = [
  { id: 'flat', name: 'Flat', rotateY: 0, rotateX: 0 },
  { id: 'left', name: 'Left', rotateY: -8, rotateX: 0 },
  { id: 'right', name: 'Right', rotateY: 8, rotateX: 0 },
  { id: 'float', name: 'Float', rotateY: 4, rotateX: -3 },
  { id: 'tilt-down', name: 'Tilt Down', rotateY: 0, rotateX: 6 },
  { id: 'tilt-up', name: 'Tilt Up', rotateY: 0, rotateX: -6 },
];

const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#06b6d4', '#a855f7', '#ffffff', '#000000'];

export default function ScreenshotEditor({ screenshot, onClose, onDelete, onUpdate }: Props) {
  const [tool, setTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>(screenshot.annotations || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState('#ef4444');
  const [wallpaper, setWallpaper] = useState(screenshot.wallpaper || 'none');
  const [padding, setPadding] = useState(screenshot.padding);
  const [cornerRadius, setCornerRadius] = useState(screenshot.corner_radius);
  const [shadow, setShadow] = useState(screenshot.shadow);
  const [tilt, setTilt] = useState(screenshot.tilt_preset || 'flat');
  const [numberCounter, setNumberCounter] = useState(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
  const [redactMode, setRedactMode] = useState(false);
  const [redactRegions, setRedactRegions] = useState<{ x: number; y: number; w: number; h: number }[]>([]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (imgRef.current) {
      const updateSize = () => {
        setImgSize({ w: imgRef.current!.offsetWidth, h: imgRef.current!.offsetHeight });
      };
      updateSize();
      const observer = new ResizeObserver(updateSize);
      observer.observe(imgRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const persist = useCallback(
    (newAnnotations: Annotation[], extra?: Partial<Screenshot>) => {
      setAnnotations(newAnnotations);
      const updates: Partial<Screenshot> = {
        annotations: newAnnotations,
        wallpaper,
        padding,
        corner_radius: cornerRadius,
        shadow,
        tilt_preset: tilt,
        ...extra,
      };
      supabase.from('screenshots').update(updates).eq('id', screenshot.id);
      onUpdate({ ...screenshot, ...updates });
    },
    [screenshot, wallpaper, padding, cornerRadius, shadow, tilt, onUpdate]
  );

  const pushHistory = (ann: Annotation[]) => {
    setHistory((h) => [...h, annotations]);
    setRedoStack([]);
    setAnnotations(ann);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, annotations]);
    setHistory((h) => h.slice(0, -1));
    setAnnotations(prev);
    persist(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, annotations]);
    setRedoStack((r) => r.slice(0, -1));
    setAnnotations(next);
    persist(next);
  };

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * imgSize.w,
      y: ((e.clientY - rect.top) / rect.height) * imgSize.h,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    const pos = getRelativePos(e);
    setDragStart(pos);
    setDragEnd(pos);

    if (tool === 'text') {
      const id = `ann-${Date.now()}`;
      const newAnn: Annotation = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'Click to edit',
        color,
        fontSize: 24,
      };
      pushHistory([...annotations, newAnn]);
      setEditingTextId(id);
      setTool('select');
      setDragStart(null);
    } else if (tool === 'number') {
      const id = `ann-${Date.now()}`;
      const newAnn: Annotation = {
        id,
        type: 'number',
        x: pos.x,
        y: pos.y,
        value: numberCounter,
        color,
      };
      pushHistory([...annotations, newAnn]);
      setNumberCounter((n) => n + 1);
      setTool('select');
      setDragStart(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    setDragEnd(getRelativePos(e));
  };

  const handleMouseUp = () => {
    if (!dragStart || !dragEnd) return;

    const id = `ann-${Date.now()}`;
    if (tool === 'arrow') {
      const newAnn: Annotation = {
        id,
        type: 'arrow',
        x1: dragStart.x,
        y1: dragStart.y,
        x2: dragEnd.x,
        y2: dragEnd.y,
        color,
      };
      pushHistory([...annotations, newAnn]);
    } else if (tool === 'highlight') {
      const x = Math.min(dragStart.x, dragEnd.x);
      const y = Math.min(dragStart.y, dragEnd.y);
      const w = Math.abs(dragEnd.x - dragStart.x);
      const h = Math.abs(dragEnd.y - dragStart.y);
      if (w > 5 && h > 5) {
        const newAnn: Annotation = {
          id,
          type: 'highlight',
          x,
          y,
          width: w,
          height: h,
          color,
        };
        pushHistory([...annotations, newAnn]);
      }
    } else if (tool === 'blur') {
      const x = Math.min(dragStart.x, dragEnd.x);
      const y = Math.min(dragStart.y, dragEnd.y);
      const w = Math.abs(dragEnd.x - dragStart.x);
      const h = Math.abs(dragEnd.y - dragStart.y);
      if (w > 5 && h > 5) {
        const newAnn: Annotation = {
          id,
          type: 'blur',
          x,
          y,
          width: w,
          height: h,
        };
        pushHistory([...annotations, newAnn]);
      }
    }

    setDragStart(null);
    setDragEnd(null);
    setTool('select');
  };

  const deleteAnnotation = (id: string) => {
    pushHistory(annotations.filter((a) => a.id !== id));
    setSelectedId(null);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? ({ ...a, ...updates } as Annotation) : a))
    );
  };

  const smartRedact = () => {
    // Simulate smart redact by adding blur regions over detected areas
    // In a real app this would use OCR/ML to find emails, cards, etc.
    const regions = [
      { x: imgSize.w * 0.1, y: imgSize.h * 0.1, w: imgSize.w * 0.3, h: 30 },
      { x: imgSize.w * 0.5, y: imgSize.h * 0.5, w: imgSize.w * 0.3, h: 30 },
    ];
    const newAnns = regions.map((r, i) => ({
      id: `redact-${Date.now()}-${i}`,
      type: 'blur' as const,
      x: r.x,
      y: r.y,
      width: r.w,
      height: r.h,
    }));
    pushHistory([...annotations, ...newAnns]);
  };

  const exportImage = () => {
    // Create canvas with wallpaper, padding, shadow, annotations
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const pad = padding;
      const tiltData = tilts.find((t) => t.id === tilt) || tilts[0];
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext('2d')!;

      // Wallpaper
      const wp = wallpapers.find((w) => w.id === wallpaper);
      if (wp && wp.color !== 'transparent') {
        if (wp.color.startsWith('#') || wp.color === 'transparent') {
          ctx.fillStyle = wp.color;
        } else {
          // Gradient
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          grad.addColorStop(0, '#1e3a5f');
          grad.addColorStop(1, '#2d5a87');
          ctx.fillStyle = grad;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw image with rounded corners
      ctx.save();
      const r = cornerRadius;
      ctx.beginPath();
      ctx.moveTo(pad + r, pad);
      ctx.lineTo(pad + img.width - r, pad);
      ctx.quadraticCurveTo(pad + img.width, pad, pad + img.width, pad + r);
      ctx.lineTo(pad + img.width, pad + img.height - r);
      ctx.quadraticCurveTo(pad + img.width, pad + img.height, pad + img.width - r, pad + img.height);
      ctx.lineTo(pad + r, pad + img.height);
      ctx.quadraticCurveTo(pad, pad + img.height, pad, pad + img.height - r);
      ctx.lineTo(pad, pad + r);
      ctx.quadraticCurveTo(pad, pad, pad + r, pad);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, pad, pad);
      ctx.restore();

      // Draw annotations
      annotations.forEach((ann) => drawAnnotation(ctx, ann, pad));

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${screenshot.title}-edited.png`;
      link.click();
    };
    img.src = screenshot.image_data;
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation, offset: number) => {
    ctx.save();
    if (ann.type === 'arrow') {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ann.x1 + offset, ann.y1 + offset);
      ctx.lineTo(ann.x2 + offset, ann.y2 + offset);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(ann.y2 - ann.y1, ann.x2 - ann.x1);
      const headLen = 12;
      ctx.beginPath();
      ctx.moveTo(ann.x2 + offset, ann.y2 + offset);
      ctx.lineTo(
        ann.x2 - headLen * Math.cos(angle - Math.PI / 6) + offset,
        ann.y2 - headLen * Math.sin(angle - Math.PI / 6) + offset
      );
      ctx.lineTo(
        ann.x2 - headLen * Math.cos(angle + Math.PI / 6) + offset,
        ann.y2 - headLen * Math.sin(angle + Math.PI / 6) + offset
      );
      ctx.closePath();
      ctx.fill();
    } else if (ann.type === 'text') {
      ctx.fillStyle = ann.color;
      ctx.font = `${ann.fontSize}px -apple-system, system-ui, sans-serif`;
      ctx.fillText(ann.text, ann.x + offset, ann.y + offset + ann.fontSize);
    } else if (ann.type === 'number') {
      ctx.fillStyle = ann.color;
      ctx.beginPath();
      ctx.arc(ann.x + offset, ann.y + offset, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ann.value), ann.x + offset, ann.y + offset);
    } else if (ann.type === 'highlight') {
      ctx.fillStyle = ann.color + '40';
      ctx.fillRect(ann.x + offset, ann.y + offset, ann.width, ann.height);
    } else if (ann.type === 'blur') {
      // Pixelate effect
      ctx.filter = 'blur(8px)';
      // Can't easily blur part of canvas, so use solid color
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(120,120,130,0.8)';
      ctx.fillRect(ann.x + offset, ann.y + offset, ann.width, ann.height);
    }
    ctx.restore();
  };

  const tools: { id: Tool; icon: typeof ArrowRight; label: string; key?: string }[] = [
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', key: 'A' },
    { id: 'text', icon: Type, label: 'Text', key: 'T' },
    { id: 'number', icon: Circle, label: 'Number', key: 'N' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight', key: 'H' },
    { id: 'blur', icon: EyeOff, label: 'Blur', key: 'B' },
  ];

  const wp = wallpapers.find((w) => w.id === wallpaper);
  const tiltData = tilts.find((t) => t.id === tilt) || tilts[0];

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#26262f] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-white ml-2">{screenshot.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] disabled:opacity-30 transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] disabled:opacity-30 transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#26262f] mx-1" />
          <button
            onClick={smartRedact}
            className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Redact
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={exportImage}
            className="px-3 py-1.5 rounded-lg text-xs bg-blue-500 hover:bg-blue-600 text-white transition-all flex items-center gap-1.5 font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool sidebar */}
        <div className="w-16 flex-shrink-0 border-r border-[#26262f] bg-[#0d0d12] flex flex-col items-center py-3 gap-1">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  tool === t.id
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-zinc-500 hover:text-white hover:bg-[#1c1c26]'
                }`}
                title={t.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <div className="w-8 h-px bg-[#26262f] my-1" />
          {/* Color picker */}
          <div className="flex flex-col gap-1.5 py-1">
            {colors.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${
                  color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d12]' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8"
          style={{ background: '#08080c' }}
        >
          <div
            style={{
              background: wp?.color || 'transparent',
              padding: padding ? `${padding}px` : undefined,
              borderRadius: '16px',
              boxShadow: shadow ? '0 20px 60px rgba(0,0,0,0.5)' : undefined,
              transform: `perspective(1000px) rotateY(${tiltData.rotateY}deg) rotateX(${tiltData.rotateX}deg)`,
              transition: 'transform 0.3s ease',
            }}
          >
            <div
              ref={canvasRef}
              className="relative inline-block cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                borderRadius: `${cornerRadius}px`,
                overflow: 'hidden',
              }}
            >
              <img
                ref={imgRef}
                src={screenshot.image_data}
                alt={screenshot.title}
                className="block max-w-full select-none"
                style={{ maxHeight: '60vh' }}
                draggable={false}
              />

              {/* Annotations overlay */}
              {annotations.map((ann) => (
                <AnnotationView
                  key={ann.id}
                  ann={ann}
                  imgSize={imgSize}
                  selected={selectedId === ann.id}
                  editing={editingTextId === ann.id}
                  onSelect={() => setSelectedId(ann.id)}
                  onDelete={() => deleteAnnotation(ann.id)}
                  onUpdate={(updates) => updateAnnotation(ann.id, updates)}
                  onEditEnd={() => setEditingTextId(null)}
                />
              ))}

              {/* Drag preview */}
              {dragStart && dragEnd && tool === 'arrow' && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={imgSize.w}
                  height={imgSize.h}
                  style={{ overflow: 'visible' }}
                >
                  <line
                    x1={dragStart.x}
                    y1={dragStart.y}
                    x2={dragEnd.x}
                    y2={dragEnd.y}
                    stroke={color}
                    strokeWidth="3"
                  />
                </svg>
              )}
              {dragStart && dragEnd && (tool === 'highlight' || tool === 'blur') && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: Math.min(dragStart.x, dragEnd.x),
                    top: Math.min(dragStart.y, dragEnd.y),
                    width: Math.abs(dragEnd.x - dragStart.x),
                    height: Math.abs(dragEnd.y - dragStart.y),
                    background: tool === 'blur' ? 'rgba(120,120,130,0.7)' : color + '40',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right panel: styling */}
        <div className="w-64 flex-shrink-0 border-l border-[#26262f] bg-[#0d0d12] overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Wallpaper */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">
                Wallpaper
              </label>
              <div className="grid grid-cols-4 gap-2">
                {wallpapers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setWallpaper(w.id);
                      supabase.from('screenshots').update({ wallpaper: w.id }).eq('id', screenshot.id);
                    }}
                    className={`aspect-square rounded-lg border-2 transition-all ${
                      wallpaper === w.id ? 'border-blue-500' : 'border-transparent hover:border-[#3a3a4a]'
                    }`}
                    style={{ background: w.color === 'transparent' ? '#13131a' : w.color }}
                    title={w.name}
                  />
                ))}
              </div>
            </div>

            {/* Padding */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">
                Padding · {padding}px
              </label>
              <input
                type="range"
                min="0"
                max="120"
                value={padding}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPadding(v);
                  supabase.from('screenshots').update({ padding: v }).eq('id', screenshot.id);
                }}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Corner radius */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">
                Corners · {cornerRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="40"
                value={cornerRadius}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCornerRadius(v);
                  supabase.from('screenshots').update({ corner_radius: v }).eq('id', screenshot.id);
                }}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Shadow */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Shadow</span>
                <button
                  onClick={() => {
                    const v = !shadow;
                    setShadow(v);
                    supabase.from('screenshots').update({ shadow: v }).eq('id', screenshot.id);
                  }}
                  className={`w-9 h-5 rounded-full transition-all relative ${
                    shadow ? 'bg-blue-500' : 'bg-[#26262f]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      shadow ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* 3D Tilt */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">
                3D Tilt
              </label>
              <div className="grid grid-cols-3 gap-2">
                {tilts.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTilt(t.id);
                      supabase.from('screenshots').update({ tilt_preset: t.id }).eq('id', screenshot.id);
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs transition-all ${
                      tilt === t.id
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40'
                        : 'bg-[#13131a] text-zinc-400 border border-[#26262f] hover:border-[#3a3a4a]'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Annotations list */}
            {annotations.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">
                  Annotations · {annotations.length}
                </label>
                <div className="space-y-1">
                  {annotations.map((a, i) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#13131a] text-xs text-zinc-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {a.type} #{i + 1}
                      </span>
                      <button
                        onClick={() => deleteAnnotation(a.id)}
                        className="text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnotationView({
  ann,
  imgSize,
  selected,
  editing,
  onSelect,
  onDelete,
  onUpdate,
  onEditEnd,
}: {
  ann: Annotation;
  imgSize: { w: number; h: number };
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  onEditEnd: () => void;
}) {
  const scale = imgSize.w > 0 ? 1 : 1; // Already in image coordinates

  if (ann.type === 'arrow') {
    return (
      <svg
        className={`absolute inset-0 ${selected ? 'cursor-move' : 'cursor-pointer'}`}
        width={imgSize.w}
        height={imgSize.h}
        style={{ overflow: 'visible' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <defs>
          <marker
            id={`arrowhead-${ann.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={ann.color} />
          </marker>
        </defs>
        <line
          x1={ann.x1}
          y1={ann.y1}
          x2={ann.x2}
          y2={ann.y2}
          stroke={ann.color}
          strokeWidth="3"
          markerEnd={`url(#arrowhead-${ann.id})`}
        />
        {selected && (
          <g>
            <circle cx={ann.x1} cy={ann.y1} r="5" fill="white" stroke="blue" strokeWidth="2" />
            <circle cx={ann.x2} cy={ann.y2} r="5" fill="white" stroke="blue" strokeWidth="2" />
            <text x={ann.x2 + 10} y={ann.y2 - 10} fill="red" fontSize="14" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              ✕
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (ann.type === 'text') {
    return (
      <div
        className={`absolute cursor-pointer ${selected ? 'ring-1 ring-blue-500' : ''}`}
        style={{
          left: ann.x,
          top: ann.y - ann.fontSize,
          color: ann.color,
          fontSize: ann.fontSize,
          fontWeight: 600,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
          if (!editing) {
            // could start editing on double click
          }
        }}
      >
        {editing ? (
          <input
            type="text"
            value={ann.text}
            autoFocus
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={onEditEnd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditEnd();
            }}
            className="bg-transparent border-b border-blue-500 focus:outline-none"
            style={{ color: ann.color, fontSize: ann.fontSize, fontWeight: 600 }}
          />
        ) : (
          ann.text
        )}
        {selected && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-4 -right-4 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (ann.type === 'number') {
    return (
      <div
        className={`absolute cursor-pointer flex items-center justify-center rounded-full font-bold ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: ann.x - 16,
          top: ann.y - 16,
          width: 32,
          height: 32,
          backgroundColor: ann.color,
          color: '#fff',
          fontSize: 16,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {ann.value}
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (ann.type === 'highlight') {
    return (
      <div
        className={`absolute cursor-pointer ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: ann.x,
          top: ann.y,
          width: ann.width,
          height: ann.height,
          backgroundColor: ann.color + '40',
          border: `2px solid ${ann.color}80`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (ann.type === 'blur') {
    return (
      <div
        className={`absolute cursor-pointer ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: ann.x,
          top: ann.y,
          width: ann.width,
          height: ann.height,
          backdropFilter: 'blur(10px)',
          background: 'rgba(120,120,130,0.4)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return null;
}
