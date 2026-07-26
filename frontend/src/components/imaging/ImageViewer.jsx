import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';

const DEFAULTS = { zoom: 1, panX: 0, panY: 0, brightness: 1, contrast: 1 };
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.15;

export default function ImageViewer({ src, alt = '', className = '' }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [loading, setLoading] = useState(!src);
  const [error, setError] = useState(!src);
  const [zoom, setZoom] = useState(DEFAULTS.zoom);
  const [panX, setPanX] = useState(DEFAULTS.panX);
  const [panY, setPanY] = useState(DEFAULTS.panY);
  const [brightness, setBrightness] = useState(DEFAULTS.brightness);
  const [contrast, setContrast] = useState(DEFAULTS.contrast);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (src) {
      setLoading(true);
      setError(false);
    } else {
      setLoading(false);
      setError(true);
    }
  }, [src]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(prev + delta).toFixed(2)));
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
  }, [panX, panY]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanX(dragStart.current.panX + dx);
    setPanY(dragStart.current.panY + dy);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const reset = useCallback(() => {
    setZoom(DEFAULTS.zoom);
    setPanX(DEFAULTS.panX);
    setPanY(DEFAULTS.panY);
    setBrightness(DEFAULTS.brightness);
    setContrast(DEFAULTS.contrast);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-bone rounded-xl border border-silver ${className}`}>
        <p className="text-body text-slate">No image to display</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 overflow-hidden rounded-xl border border-silver bg-obsidian cursor-grab select-none"
        style={{ minHeight: 300 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bone">
            <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-bone">
            <p className="text-body text-red-500">Failed to load image</p>
          </div>
        )}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className="absolute top-1/2 left-1/2 max-w-none select-none"
          style={{
            transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
            filter: `brightness(${brightness}) contrast(${contrast})`,
            transition: dragging ? 'none' : 'transform 0.1s ease-out',
          }}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 px-1">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}>+</Button>
          <span className="text-caption text-slate w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}>−</Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-caption text-slate whitespace-nowrap">B</label>
          <input type="range" min="0.5" max="2" step="0.05" value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-20 accent-lilac-bloom" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-caption text-slate whitespace-nowrap">C</label>
          <input type="range" min="0.5" max="2" step="0.05" value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-20 accent-lilac-bloom" />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit Full' : 'Fullscreen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
