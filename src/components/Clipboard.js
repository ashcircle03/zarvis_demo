import React from 'react';

const Clipboard = ({ clipboardItems }) => {
  return (
    <div className="right-panel">
      <h2 className="panel-title">Clipboard</h2>
      {clipboardItems.length === 0 ? (
        <p>Clipboard is empty.</p>
      ) : (
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          {clipboardItems.map(item => (
            <li key={item.id} style={{ marginBottom: '0.5rem' }}>
              <span>{item.type === 'folder' ? '📁' : '📄'} {item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Clipboard;
