import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ 
  isVisible, 
  position, 
  onClose, 
  onCreateFile, 
  onCreateFolder, 
  onDelete, 
  onRename,
  targetPath,
  isDirectory 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleAction = (action) => {
    switch (action) {
      case 'createFile':
        onCreateFile(targetPath);
        break;
      case 'createFolder':
        onCreateFolder(targetPath);
        break;
      case 'delete':
        onDelete(targetPath);
        break;
      case 'rename':
        onRename(targetPath);
        break;
    }
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="context-menu"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="context-menu-item" onClick={() => handleAction('createFile')}>
        <span className="context-menu-icon">📄</span>
        New File
      </div>
      <div className="context-menu-item" onClick={() => handleAction('createFolder')}>
        <span className="context-menu-icon">📁</span>
        New Folder
      </div>
      <div className="context-menu-separator"></div>
      <div className="context-menu-item" onClick={() => handleAction('rename')}>
        <span className="context-menu-icon">✏️</span>
        Rename
      </div>
      <div className="context-menu-item danger" onClick={() => handleAction('delete')}>
        <span className="context-menu-icon">🗑️</span>
        Delete
      </div>
    </div>
  );
};

export default ContextMenu; 