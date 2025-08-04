import React from 'react';
import type { FileSystemItem } from '../types/FileSystem';
import { mockFileSystem } from '../types/FileSystem';

interface FileExplorerProps {
  onFolderSelect: (folderId: string) => void;
  onFolderToggle: (folderId: string) => void;
  selectedFolder: string;
  expandedFolders: Set<string>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFolderSelect, onFolderToggle, selectedFolder, expandedFolders }) => {

  const renderTreeItem = (item: FileSystemItem, level: number = 0) => {
    if (item.type !== 'folder') return null;

    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFolder === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} style={{ marginLeft: level * 20 }}>
        <div
          className={`tree-item ${isSelected ? 'selected' : ''}`}
          data-file-id={item.id}
          data-item-type="folder-tree"
          onClick={() => {
            // 마우스 클릭으로만 동작 (제스처는 App에서 처리)
            onFolderSelect(item.id);
            if (hasChildren) {
              onFolderToggle(item.id);
            }
          }}
          style={{
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
            borderRadius: '4px',
            margin: '2px 0'
          }}
        >
          {hasChildren && (
            <span style={{ marginRight: '8px', fontSize: '12px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span style={{ marginRight: '8px' }}>📁</span>
          <span>{item.name}</span>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {item.children!.map(childId => {
              const childItem = mockFileSystem[childId];
              if (childItem && childItem.type === 'folder') {
                return renderTreeItem(childItem, level + 1);
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-explorer" style={{
      width: '300px',
      height: '100%',
      backgroundColor: '#f5f5f5',
      padding: '16px',
      borderRight: '1px solid #ddd',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
        EFS File Tree
      </h3>
      {renderTreeItem(mockFileSystem['root'])}
    </div>
  );
};

export default FileExplorer;