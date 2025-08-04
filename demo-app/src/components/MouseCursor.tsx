import React from 'react';
import type { CursorPosition } from '../hooks/useMouseGesture';

interface MouseCursorProps {
  cursor: CursorPosition;
  clickState: 'idle' | 'click_start' | 'dragging' | 'click_end';
}

const MouseCursor: React.FC<MouseCursorProps> = ({ cursor, clickState }) => {
  if (!cursor.isVisible) {
    return null;
  }

  const getCursorStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: cursor.x - 12,
      top: cursor.y - 12,
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: '2px solid #fff',
      boxShadow: '0 0 8px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      zIndex: 1000,
      transition: 'all 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px'
    };

    switch (clickState) {
      case 'click_start':
        return {
          ...baseStyle,
          backgroundColor: '#ff4444',
          transform: 'scale(1.2)',
          boxShadow: '0 0 12px rgba(255,68,68,0.8)',
        };
      case 'dragging':
        return {
          ...baseStyle,
          backgroundColor: '#4444ff',
          transform: 'scale(1.1)',
          boxShadow: '0 0 12px rgba(68,68,255,0.8)',
        };
      case 'click_end':
        return {
          ...baseStyle,
          backgroundColor: '#44ff44',
          transform: 'scale(1.3)',
          boxShadow: '0 0 16px rgba(68,255,68,0.8)',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#00ff00',
          transform: 'scale(1.0)',
        };
    }
  };

  const getCursorIcon = () => {
    switch (clickState) {
      case 'click_start':
        return '●';
      case 'dragging':
        return '⇄';
      case 'click_end':
        return '✓';
      default:
        return '●';
    }
  };

  return (
    <div style={getCursorStyle()}>
      {getCursorIcon()}
    </div>
  );
};

export default MouseCursor;