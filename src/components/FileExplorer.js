import React from 'react';

const FileExplorer = ({ files }) => {
  // A simple recursive component to render the file tree
  const renderTree = (nodes) => (
    <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
      {nodes.map(node => (
        <li key={node.id}>
          <span>{node.type === 'folder' ? '📁' : '📄'} {node.name}</span>
          {node.children && renderTree(node.children)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="left-panel">
      <h2 className="panel-title">EFS File Explorer</h2>
      {renderTree([files])} 
    </div>
  );
};

export default FileExplorer;
