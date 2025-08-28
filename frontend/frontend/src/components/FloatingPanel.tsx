import React, { useState, useRef, useEffect, useCallback } from 'react';

interface FloatingPanelProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  isOpen: boolean;
  onClose: () => void;
}

interface PanelState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
}

export default function FloatingPanel({
  id,
  title,
  icon,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 300, height: 400 },
  minSize = { width: 200, height: 150 },
  isOpen,
  onClose
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Load saved panel state from localStorage or use defaults
  const [panelState, setPanelState] = useState<PanelState>({
    position: defaultPosition,
    size: defaultSize,
    isMinimized: false
  });

  // Load from localStorage after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`pv3-panel-${id}`);
      if (saved) {
        try {
          const savedState = JSON.parse(saved);
          setPanelState(savedState);
        } catch (e) {
          console.error('Failed to parse saved panel state:', e);
        }
      }
    }
  }, [id]);

  // Save panel state to localStorage whenever it changes (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pv3-panel-${id}`, JSON.stringify(panelState));
    }
  }, [id, panelState]);

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && panelRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep panel within viewport bounds
      const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1920) - panelState.size.width;
      const maxY = (typeof window !== 'undefined' ? window.innerHeight : 1080) - panelState.size.height;
      
      setPanelState(prev => ({
        ...prev,
        position: {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        }
      }));
    } else if (isResizing && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      let newWidth = panelState.size.width;
      let newHeight = panelState.size.height;
      let newX = panelState.position.x;
      let newY = panelState.position.y;

      if (resizeHandle.includes('e')) {
        newWidth = e.clientX - rect.left;
      }
      if (resizeHandle.includes('w')) {
        newWidth = rect.right - e.clientX;
        newX = e.clientX;
      }
      if (resizeHandle.includes('s')) {
        newHeight = e.clientY - rect.top;
      }
      if (resizeHandle.includes('n')) {
        newHeight = rect.bottom - e.clientY;
        newY = e.clientY;
      }

      // Apply minimum size constraints
      newWidth = Math.max(minSize?.width || 200, newWidth);
      newHeight = Math.max(minSize?.height || 150, newHeight);

      setPanelState(prev => ({
        ...prev,
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight }
      }));
    }
  }, [isDragging, isResizing, dragOffset, panelState.size, resizeHandle, minSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  }, []);

  // Resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    setIsResizing(true);
    setResizeHandle(handle);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Global mouse event listeners
  useEffect(() => {
    if ((isDragging || isResizing) && typeof window !== 'undefined') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'grabbing' : 'resizing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const toggleMinimize = () => {
    setPanelState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized
    }));
  };

  // Add smooth entrance animation (must be before early return)
  const [hasEntered, setHasEntered] = useState(false);
  useEffect(() => {
    if (isOpen && !hasEntered) {
      setTimeout(() => setHasEntered(true), 10);
    } else if (!isOpen) {
      setHasEntered(false);
    }
  }, [isOpen, hasEntered]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed bg-bg-elevated border-2 rounded-lg shadow-2xl z-50 overflow-hidden transition-all duration-200 ${
        !hasEntered 
          ? 'opacity-0 scale-95 translate-y-2' 
          : 'opacity-100 scale-100 translate-y-0'
      } ${
        isDragging 
          ? 'border-accent-primary shadow-accent-primary/20 shadow-2xl scale-105' 
          : isResizing 
            ? 'border-yellow-400 shadow-yellow-400/20 shadow-2xl' 
            : 'border-border hover:border-accent-primary/50 hover:shadow-accent-primary/10'
      }`}
      style={{
        left: panelState.position.x,
        top: panelState.position.y,
        width: panelState.size.width,
        height: panelState.isMinimized ? 'auto' : panelState.size.height,
        minWidth: minSize?.width || 200,
        minHeight: panelState.isMinimized ? 'auto' : (minSize?.height || 150),
        transform: `translateZ(0) ${isDragging ? 'rotate(1deg)' : ''}`,
        filter: isDragging ? 'brightness(1.1)' : ''
      }}
    >
      {/* Drag Handle / Header - Much Larger Hit Area */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className="bg-bg-card border-b border-border px-4 py-4 cursor-move select-none flex items-center justify-between hover:bg-bg-hover transition-colors group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xl">{icon}</span>
          <span className="font-audiowide text-base text-text-primary truncate">{title}</span>
          <div className="hidden group-hover:flex items-center gap-1 text-xs text-text-secondary ml-2">
            <span>📍</span>
            <span>Drag to move</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-md transition-colors text-lg font-bold"
            title={panelState.isMinimized ? "Restore" : "Minimize"}
          >
            {panelState.isMinimized ? '⬜' : '➖'}
          </button>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors text-lg font-bold"
            title="Close panel"
          >
            ✖️
          </button>
        </div>
      </div>

      {/* Panel Content */}
      {!panelState.isMinimized && (
        <div className="p-4 h-full overflow-auto bg-bg-main/50 relative">
          <div className="relative z-10">
            {children}
          </div>
          
          {/* Content area visual indicator */}
          <div className="absolute top-2 right-2 text-xs text-text-secondary/50 pointer-events-none">
            📄
          </div>
        </div>
      )}

      {/* Resize Handles - Much Larger & More Visible */}
      {!panelState.isMinimized && (
        <>
          {/* Corner handles - Larger and more visible */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            className="absolute -top-1 -left-1 w-6 h-6 cursor-nw-resize bg-accent-primary/20 hover:bg-accent-primary/40 rounded-tl-lg transition-colors group"
            title="Resize from top-left corner"
          >
            <div className="absolute top-1 left-1 w-1 h-1 bg-accent-primary rounded-full opacity-60 group-hover:opacity-100"></div>
          </div>
          <div
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            className="absolute -top-1 -right-1 w-6 h-6 cursor-ne-resize bg-accent-primary/20 hover:bg-accent-primary/40 rounded-tr-lg transition-colors group"
            title="Resize from top-right corner"
          >
            <div className="absolute top-1 right-1 w-1 h-1 bg-accent-primary rounded-full opacity-60 group-hover:opacity-100"></div>
          </div>
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            className="absolute -bottom-1 -left-1 w-6 h-6 cursor-sw-resize bg-accent-primary/20 hover:bg-accent-primary/40 rounded-bl-lg transition-colors group"
            title="Resize from bottom-left corner"
          >
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-accent-primary rounded-full opacity-60 group-hover:opacity-100"></div>
          </div>
          <div
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize bg-accent-primary/20 hover:bg-accent-primary/40 rounded-br-lg transition-colors group"
            title="Resize from bottom-right corner"
          >
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-accent-primary rounded-full opacity-60 group-hover:opacity-100"></div>
            <div className="absolute bottom-2 right-2 text-xs text-accent-primary opacity-60 group-hover:opacity-100">⤡</div>
          </div>
          
          {/* Edge handles - Thicker and more responsive */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            className="absolute -top-1 left-6 right-6 h-3 cursor-n-resize bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
            title="Resize from top edge"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 's')}
            className="absolute -bottom-1 left-6 right-6 h-3 cursor-s-resize bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
            title="Resize from bottom edge"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            className="absolute -left-1 top-6 bottom-6 w-3 cursor-w-resize bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
            title="Resize from left edge"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            className="absolute -right-1 top-6 bottom-6 w-3 cursor-e-resize bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
            title="Resize from right edge"
          />

          {/* Visual resize indicator - shows on hover */}
          <div className="absolute bottom-0 right-0 pointer-events-none">
            <div className="w-4 h-4 border-r-2 border-b-2 border-accent-primary/30"></div>
          </div>
        </>
      )}
    </div>
  );
} 