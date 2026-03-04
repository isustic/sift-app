import { useState, useEffect, useCallback } from 'react';

interface UseResizableSidebarOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  storageKey: string;
}

interface UseResizableSidebarReturn {
  sidebarWidth: number;
  isDragging: boolean;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

export function useResizableSidebar({
  minWidth,
  maxWidth,
  defaultWidth,
  storageKey,
}: UseResizableSidebarOptions): UseResizableSidebarReturn {
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          setSidebarWidth(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load sidebar width from localStorage:', error);
    }
  }, [storageKey, minWidth, maxWidth]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth]);

  // Save to localStorage when width changes (and not dragging)
  useEffect(() => {
    if (!isDragging) {
      try {
        localStorage.setItem(storageKey, sidebarWidth.toString());
      } catch (error) {
        console.warn('Failed to save sidebar width to localStorage:', error);
      }
    }
  }, [sidebarWidth, isDragging, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  return {
    sidebarWidth,
    isDragging,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
    },
  };
}