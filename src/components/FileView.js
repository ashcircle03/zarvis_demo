import React from 'react';

const FileView = ({ currentDirectory }) => {
  return (
    <div className="center-panel">
      <h2 className="panel-title">Current Directory: {currentDirectory.name}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {currentDirectory.children && currentDirectory.children.map(item => (
          <div key={item.id} style={{ textAlign: 'center', width: '100px' }}>
            <span style={{ fontSize: '48px' }}>{item.type === 'folder' ? '📁' : '📄'}</span>
            <p style={{ margin: 0 }}>{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileView;
