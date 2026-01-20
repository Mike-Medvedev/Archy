import { useState, useRef, useEffect, useCallback } from 'react';

type UseResizableOptions = {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
    direction?: 'left' | 'right'; // Resize from which edge
};

/**
 * Hook for creating a resizable panel with drag-to-resize functionality
 */
export default function useResizable({
    initialWidth,
    minWidth,
    maxWidth,
    direction = 'right'
}: UseResizableOptions) {
    const [width, setWidth] = useState(initialWidth);
    const isDraggingRef = useRef(false);

    const handleMouseDown = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;

        // Calculate new width based on direction
        const newWidth = direction === 'right'
            ? window.innerWidth - e.clientX  // Resize from right edge
            : e.clientX;                      // Resize from left edge

        // Constrain to min/max
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        setWidth(constrainedWidth);
    }, [direction, minWidth, maxWidth]);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    // Add global mouse event listeners
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return {
        width,
        handleMouseDown,
    };
}
