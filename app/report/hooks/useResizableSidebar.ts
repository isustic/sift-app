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
  // Initialize width from localStorage to avoid flash of incorrect width
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // SSR safety: only access localStorage on client
    if (typeof window === 'undefined') return defaultWidth;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load sidebar width from localStorage:', error);
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Note: Using e.clientX directly works because sidebar is at left edge of viewport
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
  // This optimization prevents excessive localStorage writes during drag
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