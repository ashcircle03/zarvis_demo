import React from 'react';
import type { FileSystemItem } from '../types/FileSystem';
import type { DragMode } from '../hooks/useDualHandGesture';
import { mockFileSystem } from '../types/FileSystem';

interface FileViewProps {
  folderId: string;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, isMultiple?: boolean) => void;
  dragSelectedItems?: Set<string>;
  draggedItems?: Set<string>;
  dragMode?: DragMode | null;
}

const FileView: React.FC<FileViewProps> = ({ 
  folderId, 
  selectedItems, 
  onItemSelect, 
  dragSelectedItems = new Set(), 
  draggedItems = new Set()
}) => {
  const folder = mockFileSystem[folderId];
  
  if (!folder || folder.type !== 'folder') {
    return (
      <div className="file-view" style={{ flex: 1, padding: '16px' }}>
        <p>Select a folder to view its contents</p>
      </div>
    );
  }

  const items = folder.children?.map(childId => mockFileSystem[childId]).filter(Boolean) || [];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
    <div className="file-view" style={{
      flex: 1,
      padding: '16px',
      backgroundColor: '#fff',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>{folder.name}</h3>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="file-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {items.map(item => (
          <div
            key={item.id}
            className={`file-item ${selectedItems.has(item.id) ? 'selected' : ''}`}
            data-file-id={item.id}
            onClick={(e) => onItemSelect(item.id, e.ctrlKey || e.metaKey)}
            style={{
              padding: '12px',
              border: selectedItems.has(item.id) ? '2px solid #2196f3' : 
                      dragSelectedItems.has(item.id) ? '2px solid #ff9800' : 
                      draggedItems.has(item.id) ? '2px solid #9c27b0' : '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedItems.has(item.id) ? '#e3f2fd' : 
                              dragSelectedItems.has(item.id) ? '#fff3e0' : 
                              draggedItems.has(item.id) ? '#f3e5f5' : '#fff',
              transition: 'all 0.1s ease',
              boxShadow: dragSelectedItems.has(item.id) ? '0 2px 8px rgba(255, 152, 0, 0.3)' : 
                        draggedItems.has(item.id) ? '0 2px 8px rgba(156, 39, 176, 0.3)' : 'none',
              opacity: draggedItems.has(item.id) ? 0.7 : 1
            }}
          >
            <div style={{
              fontSize: '32px',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              {getFileIcon(item)}
            </div>
            
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px',
              textAlign: 'center',
              wordBreak: 'break-word'
            }}>
              {item.name}
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center'
            }}>
              {item.type === 'file' && item.size ? formatFileSize(item.size) : ''}
            </div>
            
            <div style={{
              fontSize: '11px',
              color: '#999',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              {formatDate(item.modified)}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#999',
          marginTop: '40px'
        }}>
          This folder is empty
        </div>
      )}
    </div>
  );
};

export default FileView;