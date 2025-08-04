import { useState, useCallback } from 'react';
import FileExplorer from './components/FileExplorer';
import FileView from './components/FileView';
import Clipboard from './components/Clipboard';
import CameraView from './components/CameraView';
import DualHandTracker from './components/DualHandTracker';
import DualCursor from './components/DualCursor';
import DragSelection from './components/DragSelection';
import type { DualHandGestureResult, CursorPosition, DragMode } from './hooks/useDualHandGesture';
import { mockFileSystem } from './types/FileSystem';
import './App.css';

function App() {
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clipboardItems, setClipboardItems] = useState<Set<string>>(new Set());
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [gestureLog, setGestureLog] = useState<DualHandGestureResult[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [rightCursor, setRightCursor] = useState<CursorPosition>({ x: 0, y: 0, isVisible: false });
  const [rightClickState, setRightClickState] = useState<'idle' | 'click' | 'double_click' | 'drag_start' | 'dragging' | 'drag_end'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<CursorPosition | null>(null);
  const [dragEndPosition, setDragEndPosition] = useState<CursorPosition | null>(null);
  const [selectedInDrag, setSelectedInDrag] = useState<Set<string>>(new Set());
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [draggedItems, setDraggedItems] = useState<Set<string>>(new Set()); // 이동할 아이템들
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root'])); // 폴더 트리 확장 상태

  // 특정 위치에 파일/폴더가 있는지 확인
  const checkItemAtPosition = useCallback((x: number, y: number): boolean => {
    const fileItems = document.querySelectorAll('[data-file-id]');
    for (const element of fileItems) {
      const rect = element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
    return false;
  }, []);

  // 클립보드 아이템 위치 확인
  const checkClipboardItemAtPosition = useCallback((x: number, y: number): boolean => {
    const clipboardItems = document.querySelectorAll('[data-clipboard-item-id]');
    for (const element of clipboardItems) {
      const rect = element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
    return false;
  }, []);


  // 왼손 기능 제거로 인해 클립보드/파일뷰 영역 확인 불필요

  // 커서 위치 기반 hover 감지 (파일 영역, 폴더 트리, 클립보드)
  const updateHoveredItem = useCallback((cursorX: number, cursorY: number) => {
    // 파일 영역, 폴더 트리, 클립보드 아이템 모두 확인
    const allItems = document.querySelectorAll('[data-file-id], [data-clipboard-item-id]');
    let foundHover = false;
    
    allItems.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (cursorX >= rect.left && cursorX <= rect.right && 
          cursorY >= rect.top && cursorY <= rect.bottom) {
        const fileId = element.getAttribute('data-file-id') || element.getAttribute('data-clipboard-item-id');
        if (fileId) {
          setHoveredItemId(fileId);
          foundHover = true;
        }
      }
    });
    
    if (!foundHover) {
      setHoveredItemId(null);
    }
  }, []);


  // 드래그 영역 내 파일들 선택
  const updateDragSelection = useCallback((startPos: CursorPosition, endPos: CursorPosition) => {
    const fileItems = document.querySelectorAll('[data-file-id]');
    const selected = new Set<string>();
    
    const minX = Math.min(startPos.x, endPos.x);
    const maxX = Math.max(startPos.x, endPos.x);
    const minY = Math.min(startPos.y, endPos.y);
    const maxY = Math.max(startPos.y, endPos.y);
    
    fileItems.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
        const fileId = element.getAttribute('data-file-id');
        if (fileId) {
          selected.add(fileId);
        }
      }
    });
    
    setSelectedInDrag(selected);
  }, []);


  const handleVideoReady = useCallback((videoElement: HTMLVideoElement) => {
    setVideo(videoElement);
  }, []);

  const handleDualHandGesture = useCallback((result: DualHandGestureResult) => {
    // Add to gesture log (keep only last 5)
    setGestureLog(prev => [result, ...prev.slice(0, 4)]);

    // 오른손 커서 위치 및 상태 업데이트
    setRightCursor(result.rightCursor);
    setRightClickState(result.rightClickState);
    
    // 드래그 모드 업데이트
    if (result.dragMode) {
      setDragMode(result.dragMode);
    }

    // 오른손 커서 기반 hover 업데이트
    if (result.rightCursor.isVisible) {
      updateHoveredItem(result.rightCursor.x, result.rightCursor.y);
    }

    // 오른손 제스처 처리
    switch (result.rightClickState) {
      case 'click':
        // 클릭 처리
        if (hoveredItemId) {
          const hoveredItem = mockFileSystem[hoveredItemId];
          const hoveredElement = document.querySelector(`[data-file-id="${hoveredItemId}"], [data-clipboard-item-id="${hoveredItemId}"]`);
          const itemType = hoveredElement?.getAttribute('data-item-type');

          if (itemType === 'folder-tree') {
            // 폴더 트리에서 클릭 - 폴더 확장/축소
            setExpandedFolders(prev => {
              const newExpanded = new Set(prev);
              if (newExpanded.has(hoveredItemId)) {
                newExpanded.delete(hoveredItemId);
              } else {
                newExpanded.add(hoveredItemId);
              }
              return newExpanded;
            });
            console.log(`Folder tree click - Toggle folder: ${hoveredItem?.name}`);
          } else if (hoveredElement?.hasAttribute('data-clipboard-item-id')) {
            // 클립보드 아이템 클릭 - 클립보드에서 제거
            setClipboardItems(prev => {
              const newClipboard = new Set(prev);
              newClipboard.delete(hoveredItemId);
              return newClipboard;
            });
            console.log(`Clipboard click - Removed from clipboard: ${hoveredItem?.name}`);
          } else if (hoveredItem) {
            // 파일 영역에서 클릭
            if (hoveredItem.type === 'file') {
              setSelectedItems(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(hoveredItemId)) {
                  newSelection.delete(hoveredItemId);
                } else {
                  newSelection.add(hoveredItemId);
                }
                return newSelection;
              });
              console.log(`Click - Selected file: ${hoveredItem.name}`);
            } else if (hoveredItem.type === 'folder') {
              setSelectedFolder(hoveredItemId);
              console.log(`Click - Opened folder: ${hoveredItem.name}`);
            }
          }
        }
        break;

      case 'double_click':
        // 더블클릭 처리
        if (hoveredItemId) {
          const hoveredItem = mockFileSystem[hoveredItemId];
          const hoveredElement = document.querySelector(`[data-file-id="${hoveredItemId}"], [data-clipboard-item-id="${hoveredItemId}"]`);
          const itemType = hoveredElement?.getAttribute('data-item-type');

          if (itemType === 'folder-tree') {
            // 폴더 트리에서 더블클릭 - 파일 영역에 내용 표시
            if (hoveredItem && hoveredItem.type === 'folder') {
              setSelectedFolder(hoveredItemId);
              console.log(`Folder tree double click - Show contents: ${hoveredItem.name}`);
            }
          } else if (hoveredItem && hoveredItem.type === 'folder') {
            // 파일 영역에서 더블클릭 - 폴더 열기
            setSelectedFolder(hoveredItemId);
            console.log(`Double click - Opened folder: ${hoveredItem.name}`);
          }
        }
        break;
        
      case 'drag_start':
        if (result.dragStart) {
          setDragStartPosition(result.dragStart);
          setDragEndPosition(result.rightCursor);
          
          // 드래그 시작 위치에 따라 모드 결정
          if (hoveredItemId && result.dragMode === 'item_move') {
            // 파일/폴더 이동 모드 (파일 영역)
            let itemsToMove: Set<string>;
            if (selectedItems.has(hoveredItemId)) {
              // 이미 선택된 아이템들을 드래그
              itemsToMove = new Set(selectedItems);
            } else {
              // 호버된 아이템만 드래그
              itemsToMove = new Set([hoveredItemId]);
            }
            setDraggedItems(itemsToMove);
            console.log(`Drag start - Moving items: ${itemsToMove.size} (${Array.from(itemsToMove).map(id => mockFileSystem[id]?.name).join(', ')})`);
          } else if (hoveredItemId && result.dragMode === 'clipboard_item_move') {
            // 클립보드 아이템 이동 모드
            const itemsToMove = new Set([hoveredItemId]);
            setDraggedItems(itemsToMove);
            console.log(`Drag start - Moving from clipboard: ${mockFileSystem[hoveredItemId]?.name}`);
          } else {
            // 영역 선택 모드
            setDraggedItems(new Set());
            console.log('Drag start - Area selection mode');
          }
        }
        break;
        
      case 'dragging':
        if (!isDragging) {
          setIsDragging(true);
        }
        setDragEndPosition(result.rightCursor);
        
        if (result.dragMode === 'item_move' || result.dragMode === 'clipboard_item_move') {
          // 파일/폴더 이동 중 - 드래그 영역 표시하지 않음
          // FileView에서 draggedItems로 스타일링됨
        } else if (result.dragMode === 'area_selection') {
          // 영역 선택 중에만 드래그 영역 표시
          if (dragStartPosition) {
            updateDragSelection(dragStartPosition, result.rightCursor);
          }
        }
        break;
        
      case 'drag_end':
        if (isDragging) {
          if ((result.dragMode === 'item_move' || result.dragMode === 'clipboard_item_move') && draggedItems.size > 0) {
            // 파일/폴더 이동 완료 처리
            const dropElement = document.elementFromPoint(result.rightCursor.x, result.rightCursor.y);
            const clipboardArea = dropElement?.closest('.clipboard');
            const fileViewArea = dropElement?.closest('.file-view');
            const dropTarget = dropElement?.closest('[data-file-id], [data-clipboard-item-id]');
            const dropId = dropTarget?.getAttribute('data-file-id') || dropTarget?.getAttribute('data-clipboard-item-id');
            
            console.log(`Drop detected at (${result.rightCursor.x}, ${result.rightCursor.y})`);
            console.log(`Drop element:`, dropElement);
            console.log(`Clipboard area:`, clipboardArea);
            console.log(`File view area:`, fileViewArea);
            console.log(`Drop target:`, dropTarget);
            
            if (result.dragMode === 'clipboard_item_move') {
              // 클립보드에서 시작된 드래그
              if (fileViewArea && !clipboardArea) {
                // 파일 영역에 드롭 - 클립보드에서 제거하고 파일 영역에 표시 (시각적으로만)
                setClipboardItems(prev => {
                  const newClipboard = new Set(prev);
                  draggedItems.forEach(itemId => newClipboard.delete(itemId));
                  return newClipboard;
                });
                // 파일 영역에 선택된 것으로 표시
                setSelectedItems(prev => new Set([...prev, ...draggedItems]));
                console.log(`✅ Moved ${draggedItems.size} items from clipboard to file area: ${Array.from(draggedItems).map(id => mockFileSystem[id]?.name).join(', ')}`);
              }
            } else if (result.dragMode === 'item_move') {
              // 파일 영역에서 시작된 드래그
              if (clipboardArea || dropTarget?.hasAttribute('data-clipboard-item-id')) {
                // 클립보드에 드롭 - 클립보드에 추가
                setClipboardItems(prev => new Set([...prev, ...draggedItems]));
                console.log(`✅ Moved ${draggedItems.size} items to clipboard: ${Array.from(draggedItems).map(id => mockFileSystem[id]?.name).join(', ')}`);
              } else if (dropId && mockFileSystem[dropId]?.type === 'folder') {
                // 폴더에 드롭 - 실제 이동은 모의로만 처리
                console.log(`📁 Moved ${draggedItems.size} items to folder: ${mockFileSystem[dropId].name}`);
              } else {
                console.log(`❌ No valid drop target found`);
              }
            }
            
            setDraggedItems(new Set());
          } else {
            // 영역 선택 완료: 선택된 파일들을 일반 선택으로 설정
            setSelectedItems(new Set(selectedInDrag));
            console.log(`Drag selection - selected ${selectedInDrag.size} items`);
            setSelectedInDrag(new Set());
          }
          
          setIsDragging(false);
        }
        
        setDragStartPosition(null);
        setDragEndPosition(null);
        setDragMode(null);
        break;
    }

  }, [
    hoveredItemId, 
    isDragging, 
    dragStartPosition, 
    selectedInDrag,
    updateHoveredItem, 
    updateDragSelection
  ]);


  const handleItemSelect = (itemId: string, isMultiple = false) => {
    if (isMultiple) {
      setSelectedItems(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        return newSelection;
      });
    } else {
      setSelectedItems(new Set([itemId]));
    }
  };

  const handleClearClipboard = () => {
    setClipboardItems(new Set());
  };

  const handleRemoveFromClipboard = (itemId: string) => {
    setClipboardItems(prev => {
      const newClipboard = new Set(prev);
      newClipboard.delete(itemId);
      return newClipboard;
    });
  };

  const handleFolderToggle = (folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  };

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', position: 'relative' }}>
      {/* Main Content */}
      <FileExplorer 
        onFolderSelect={setSelectedFolder}
        onFolderToggle={handleFolderToggle}
        selectedFolder={selectedFolder}
        expandedFolders={expandedFolders}
      />
      
      <FileView
        folderId={selectedFolder}
        selectedItems={selectedItems}
        onItemSelect={handleItemSelect}
        dragSelectedItems={selectedInDrag}
        draggedItems={draggedItems}
        dragMode={dragMode}
      />
      
      <Clipboard
        clipboardItems={clipboardItems}
        onClearClipboard={handleClearClipboard}
        onRemoveFromClipboard={handleRemoveFromClipboard}
      />

      {/* Camera and Dual Hand Tracking */}
      <CameraView onVideoReady={handleVideoReady} />
      {video && (
        <DualHandTracker 
          video={video} 
          onGestureDetected={handleDualHandGesture}
          checkItemAtPosition={checkItemAtPosition}
          checkClipboardItemAtPosition={checkClipboardItemAtPosition}
        />
      )}
      
      {/* Right Hand Cursor */}
      <DualCursor 
        rightCursor={rightCursor} 
        leftCursor={{ x: 0, y: 0, isVisible: false }}
        rightClickState={rightClickState}
        leftClickState="idle"
      />
      
      {/* Drag Selection Area - 영역 선택 모드일 때만 표시 */}
      <DragSelection 
        isActive={isDragging && dragMode === 'area_selection'}
        startPosition={dragStartPosition}
        endPosition={dragEndPosition}
      />

      {/* Gesture Status Panel */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: '220px',
        zIndex: 10
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          👋 Right Hand Controls
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>오른손 제스처:</strong>
        </div>
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px' }}>
          <li>👆 검지: 커서 이동</li>
          <li>🤏 핀치: 파일 선택 / 폴더 열기</li>
          <li>🤏🤏 더블 핀치: 폴더 열기</li>
          <li>🤏➡️ 핀치+드래그: 영역 선택</li>
        </ul>
        
        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          <strong>상태:</strong> {rightClickState}
          {isDragging && draggedItems.size > 0 && ` | 이동 중: ${draggedItems.size}개`}
          {isDragging && selectedInDrag.size > 0 && ` | 영역 선택: ${selectedInDrag.size}개`}
          {dragMode && ` | 모드: ${dragMode}`}
        </div>
        
        {gestureLog.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #444', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Recent Actions:</div>
            {gestureLog.slice(0, 2).map((result, index) => (
              <div key={index} style={{ fontSize: '10px', opacity: 1 - (index * 0.3) }}>
                <span style={{ color: '#ff4444' }}>
                  👉 {result.rightClickState}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '11px',
        zIndex: 10
      }}>
        Selected: {selectedItems.size} | Clipboard: {clipboardItems.size}
        {hoveredItemId && (
          <span style={{ marginLeft: '8px', color: '#FFD700' }}>
            | Hover: {mockFileSystem[hoveredItemId]?.name}
          </span>
        )}
      </div>
    </div>
  );
}

export default App
