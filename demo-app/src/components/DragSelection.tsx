import React from 'react';
import type { CursorPosition } from '../hooks/useDualHandGesture';

interface DragSelectionProps {
  isActive: boolean;
  startPosition: CursorPosition | null;
  endPosition: CursorPosition | null;
}

const DragSelection: React.FC<DragSelectionProps> = ({
  isActive,
  startPosition,
  endPosition
}) => {
  if (!isActive || !startPosition || !endPosition) {
    return null;
  }

  const left = Math.min(startPosition.x, endPosition.x);
  const top = Math.min(startPosition.y, endPosition.y);
  const width = Math.abs(endPosition.x - startPosition.x);
  const height = Math.abs(endPosition.y - startPosition.y);

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width,
        height,
        backgroundColor: 'rgba(33, 150, 243, 0.2)', // 투명한 파란색
        border: '2px dashed #2196f3',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 999,
        transition: 'all 0.05s ease'
      }}
    >
      {/* 선택 영역 모서리 표시 */}
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          width: 8,
          height: 8,
          backgroundColor: '#2196f3',
          borderRadius: '50%'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 8,
          height: 8,
          backgroundColor: '#2196f3',
          borderRadius: '50%'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: -4,
          width: 8,
          height: 8,
          backgroundColor: '#2196f3',
          borderRadius: '50%'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          right: -4,
          width: 8,
          height: 8,
          backgroundColor: '#2196f3',
          borderRadius: '50%'
        }}
      />
      
    </div>
  );
};

export default DragSelection;