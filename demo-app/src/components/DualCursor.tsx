import React from 'react';
import type { CursorPosition } from '../hooks/useDualHandGesture';

interface DualCursorProps {
  rightCursor: CursorPosition;
  leftCursor: CursorPosition; // 호환성을 위해 유지하나 사용안함
  rightClickState: 'idle' | 'click' | 'double_click' | 'drag_start' | 'dragging' | 'drag_end';
  leftClickState: 'idle' | 'click' | 'double_click' | 'drag_start' | 'dragging' | 'drag_end'; // 호환성을 위해 유지하나 사용안함
}

const DualCursor: React.FC<DualCursorProps> = ({ 
  rightCursor, 
  rightClickState 
}) => {
  const getCursorStyle = (cursor: CursorPosition, clickState: string, isRight: boolean) => {
    // 손이 감지되지 않으면 커서 숨김
    if (!cursor.isVisible) return { display: 'none' };

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
      transition: 'all 0.05s ease', // 더 빠른 반응
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold'
    };

    const primaryColor = isRight ? '#ff4444' : '#44ff44'; // 오른손: 빨간색, 왼손: 녹색
    const activeColor = isRight ? '#ff0000' : '#00ff00';

    switch (clickState) {
      case 'click':
        return {
          ...baseStyle,
          backgroundColor: '#44ff44',
          transform: 'scale(1.3)',
          boxShadow: '0 0 16px rgba(68,255,68,0.8)',
        };
      case 'double_click':
        return {
          ...baseStyle,
          backgroundColor: '#ffff44',
          transform: 'scale(1.4)',
          boxShadow: '0 0 20px rgba(255,255,68,0.8)',
        };
      case 'drag_start':
        return {
          ...baseStyle,
          backgroundColor: activeColor,
          transform: 'scale(1.2)',
          boxShadow: `0 0 16px ${activeColor}`,
        };
      case 'dragging':
        return {
          ...baseStyle,
          backgroundColor: '#4444ff',
          transform: 'scale(1.2)',
          boxShadow: '0 0 16px rgba(68,68,255,0.8)',
        };
      case 'drag_end':
        return {
          ...baseStyle,
          backgroundColor: '#44ff44',
          transform: 'scale(1.4)',
          boxShadow: '0 0 20px rgba(68,255,68,0.8)',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: primaryColor,
          transform: 'scale(1.0)',
        };
    }
  };

  const getCursorIcon = (clickState: string, isRight: boolean) => {
    switch (clickState) {
      case 'click':
        return '●';
      case 'double_click':
        return '●●';
      case 'drag_start':
        return '⊕';
      case 'dragging':
        return '⇄';
      case 'drag_end':
        return '✓';
      default:
        return isRight ? 'R' : 'L';
    }
  };

  return (
    <>
      {/* 오른손 커서만 표시 */}
      <div style={getCursorStyle(rightCursor, rightClickState, true)}>
        {getCursorIcon(rightClickState, true)}
      </div>
    </>
  );
};

export default DualCursor;