import React from 'react';
import type { FileSystemItem } from '../types/FileSystem';
import { mockFileSystem } from '../types/FileSystem';

interface ClipboardProps {
  clipboardItems: Set<string>;
  onClearClipboard: () => void;
  onRemoveFromClipboard: (itemId: string) => void;
}

const Clipboard: React.FC<ClipboardProps> = ({ 
  clipboardItems, 
  onClearClipboard, 
  onRemoveFromClipboard 
}) => {
  const items = Array.from(clipboardItems).map(id => mockFileSystem[id]).filter(Boolean);

  const getFileIcon = (item: FileSystemItem): string => {
    if (item.type === 'folder') return '📁';
    
    const extension = item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'json': return '📄';
      case 'dcm': return '🏥';
      case 'cad': return '⚙️';
      case 'csv': return '📊';
      case 'xlsx': return '📊';
      case 'docx': return '📝';
      case 'exe': return '⚙️';
      case 'jar': return '☕';
      default: return '📄';
    }
  };

  return (
    <div className="clipboard" style={{
      width: '250px',
      height: '100%',
      backgroundColor: '#f9f9f9',
      padding: '16px',
      paddingTop: '180px', // Start below camera (16px + 150px + 14px)
      borderLeft: '2px solid #2196f3', // 더 눈에 띄는 파란색 테두리
      overflowY: 'auto',
      position: 'relative'
    }}>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        marginTop: '0px' // 카메라 바로 아래 위치
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#2196f3' }}>
          📋 Clipboard
        </h3>
        {items.length > 0 && (
          <button
            onClick={onClearClipboard}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '14px',
          marginTop: '40px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          No items in clipboard
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            Use gesture to add items for moving
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '12px'
          }}>
            {items.length} item{items.length !== 1 ? 's' : ''} ready to move
          </div>
          
          {items.map(item => (
            <div
              key={item.id}
              className="clipboard-item"
              data-clipboard-item-id={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
            >
              <span style={{ marginRight: '8px', fontSize: '16px' }}>
                {getFileIcon(item)}
              </span>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666'
                }}>
                  {item.type}
                </div>
              </div>
              
              <button
                onClick={() => onRemoveFromClipboard(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px'
                }}
                title="Remove from clipboard"
              >
                ×
              </button>
            </div>
          ))}
          
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#2e7d32'
          }}>
            💡 Use the "Paste" gesture in a destination folder to move these items
          </div>
        </div>
      )}
    </div>
  );
};

export default Clipboard;