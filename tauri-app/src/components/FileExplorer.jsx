import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readDir, exists } from '@tauri-apps/plugin-fs'
import './FileExplorer.css'

const FileExplorer = forwardRef(({ onFileSelect, onRootPathChange, onContextMenu, currentFile, refreshTrigger, isDarkMode }, ref) => {
  const [rootPath, setRootPath] = useState(null)
  const [fileTree, setFileTree] = useState([])
  const [expandedDirs, setExpandedDirs] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingDirs, setLoadingDirs] = useState(new Set()) // Track which directories are loading

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    selectRootFolder,
    refreshFileTree,
    findAndOpenFile,
    expandDirectoryByName
  }))

  // Helper function to properly join paths
  const joinPath = (dir, name) => {
    if (!dir || !name) return name || dir || ''
    
    // Normalize both directory and name to use forward slashes
    const normalizedDir = dir.replace(/\\/g, '/').replace(/\/+$/, '')
    const normalizedName = name.replace(/\\/g, '/')
    
    // Join with forward slash (Tauri handles this internally)
    return `${normalizedDir}/${normalizedName}`
  }

  // Helper function to normalize paths consistently
  const normalizePath = (path) => {
    if (!path) return path
    return path.replace(/\\/g, '/')
  }

  const selectRootFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder'
      })
      
      if (selected) {
        console.log('Selected folder:', selected)
        
        // Test if we can access the selected directory
        try {
          const testEntries = await readDir(selected)
          console.log(`Successfully accessed root directory, found ${testEntries.length} entries`)
          
          // Test accessing a subdirectory if one exists
          const subdirs = testEntries.filter(entry => entry.isDirectory)
          if (subdirs.length > 0) {
            const testSubdir = subdirs[0]
            const subdirPath = normalizePath(testSubdir.path || joinPath(selected, testSubdir.name))
            console.log(`Testing subdirectory access: ${subdirPath}`)
            
            try {
              const subEntries = await readDir(subdirPath)
              console.log(`Successfully accessed subdirectory, found ${subEntries.length} entries`)
            } catch (subError) {
              console.error(`Failed to access subdirectory: ${subError.message}`)
              console.error('This indicates a permission scope issue')
            }
          }
        } catch (rootError) {
          console.error(`Failed to access root directory: ${rootError.message}`)
        }
        
        setRootPath(selected)
        onRootPathChange(selected)
        // The useEffect will handle loading the directory
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
    }
  }

  const loadDirectory = async (dirPath) => {
    try {
      const normalizedDirPath = normalizePath(dirPath)
      console.log(`Loading directory: ${normalizedDirPath}`)
      
      // Check if directory exists first
      const dirExists = await exists(normalizedDirPath)
      if (!dirExists) {
        console.error(`Directory does not exist: ${normalizedDirPath}`)
        return []
      }

      const entries = await readDir(normalizedDirPath)
      console.log(`Found ${entries.length} entries in ${normalizedDirPath}:`, entries)
      
      return entries.map(entry => {
        // Construct the full path properly and normalize it
        const fullPath = normalizePath(entry.path || joinPath(normalizedDirPath, entry.name))
        
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory,
          children: entry.isDirectory ? [] : undefined
        }
      }).sort((a, b) => {
        // Sort directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
    } catch (error) {
      console.error(`Error loading directory ${dirPath}:`, error)
      // Add more specific error handling
      if (error.message && error.message.includes('permission')) {
        console.error('Permission denied. This might be a Tauri capability issue.')
      }
      return []
    }
  }

  // Refresh file tree function
  const refreshFileTree = async () => {
    if (rootPath) {
      setLoading(true)
      const tree = await loadDirectory(rootPath)
      setFileTree(tree)
      
      // Refresh expanded directories
      const refreshExpandedDirs = async (items, expandedPaths) => {
        for (const item of items) {
          if (item.isDirectory && expandedPaths.has(item.path)) {
            const children = await loadDirectory(item.path)
            item.children = children
            if (children.length > 0) {
              await refreshExpandedDirs(children, expandedPaths)
            }
          }
        }
      }
      
      await refreshExpandedDirs(tree, expandedDirs)
      setLoading(false)
    }
  }

  // Load root directory when path changes
  useEffect(() => {
    if (rootPath) {
      refreshFileTree()
    }
  }, [rootPath])

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && rootPath) {
      refreshFileTree()
    }
  }, [refreshTrigger])

  // Load subdirectory contents
  const loadSubdirectory = async (dirPath) => {
    setLoadingDirs(prev => new Set([...prev, dirPath]))
    
    try {
      const children = await loadDirectory(dirPath)
      
      // Update the file tree with the loaded children
      const updateTree = (items) => {
        return items.map(item => {
          if (item.path === dirPath && item.isDirectory) {
            return { ...item, children }
          } else if (item.children) {
            return { ...item, children: updateTree(item.children) }
          }
          return item
        })
      }
      
      setFileTree(prev => updateTree(prev))
    } catch (error) {
      console.error(`Error loading subdirectory ${dirPath}:`, error)
    } finally {
      setLoadingDirs(prev => {
        const newSet = new Set(prev)
        newSet.delete(dirPath)
        return newSet
      })
    }
  }

  // Handle directory click (expand/collapse)
  const handleDirectoryClick = async (dirPath) => {
    console.log('Directory clicked:', dirPath)
    
    if (expandedDirs.has(dirPath)) {
      // Collapse directory
      setExpandedDirs(prev => {
        const newSet = new Set(prev)
        newSet.delete(dirPath)
        return newSet
      })
    } else {
      // Expand directory
      setExpandedDirs(prev => new Set([...prev, dirPath]))
      
      // Check if we need to load children
      const findItem = (items, path) => {
        for (const item of items) {
          if (item.path === path) return item
          if (item.children) {
            const found = findItem(item.children, path)
            if (found) return found
          }
        }
        return null
      }
      
      const dirItem = findItem(fileTree, dirPath)
      if (dirItem && dirItem.children && dirItem.children.length === 0) {
        // Load children if not already loaded
        await loadSubdirectory(dirPath)
      }
    }
  }

  const handleItemClick = (item) => {
    console.log('Click:', item.name, item.isDirectory ? '(folder)' : '(file)')
    
    if (!item.path || item.path.startsWith('fallback-')) {
      console.error('Invalid path for:', item.name)
      alert(`Cannot open "${item.name}": Invalid file path.`)
      return
    }
    
    if (item.isDirectory) {
      handleDirectoryClick(item.path)
    } else {
      onFileSelect(item.path)
    }
  }

  const getFileIcon = (filename, isDirectory) => {
    if (isDirectory) return '📁'
    
    const extension = filename.split('.').pop()?.toLowerCase()
    const iconMap = {
      'js': '🟨',
      'jsx': '⚛️',
      'ts': '🔷',
      'tsx': '⚛️',
      'py': '🐍',
      'rs': '🦀',
      'go': '🐹',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'cs': '💜',
      'php': '🐘',
      'rb': '💎',
      'swift': '🧡',
      'kt': '💜',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'json': '📋',
      'xml': '📄',
      'md': '📝',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🎨'
    }
    
    return iconMap[extension] || '📄'
  }

  // Find and open a file by name (voice command support)
  const findAndOpenFile = async (fileName) => {
    const searchTree = async (items) => {
      for (const item of items) {
        if (!item.isDirectory && item.name.toLowerCase().includes(fileName.toLowerCase())) {
          console.log(`Found file: ${item.name} at ${item.path}`)
          try {
            await onFileSelect(item.path)
            return true
          } catch (error) {
            console.error('Error opening file:', error)
            return false
          }
        }
        if (item.children && item.children.length > 0) {
          if (await searchTree(item.children)) return true
        }
      }
      return false
    }

    try {
      return await searchTree(fileTree)
    } catch (error) {
      console.error('Error finding/opening file:', error)
      return false
    }
  }

  // Expand a directory by name (voice command support)
  const expandDirectoryByName = async (directoryName) => {
    const searchAndExpandTree = async (items) => {
      for (const item of items) {
        if (item.isDirectory && item.name.toLowerCase().includes(directoryName.toLowerCase())) {
          console.log(`Found directory: ${item.name} at ${item.path}`)
          await handleDirectoryClick(item.path)
          return true
        }
        if (item.children && item.children.length > 0) {
          if (await searchAndExpandTree(item.children)) return true
        }
      }
      return false
    }

    try {
      return await searchAndExpandTree(fileTree)
    } catch (error) {
      console.error('Error expanding directory:', error)
      return false
    }
  }

  const renderTree = (items, level = 0) => {
    if (!items || items.length === 0) return null
    
    return items.map((item, index) => {
      if (!item || !item.path) {
        return null
      }
      
      const isLoadingThisDir = loadingDirs.has(item.path)
      
      return (
        <div key={item.path || `${item.name}-${level}-${index}`}>
          <div
            className={`tree-item ${item.path === currentFile ? 'selected' : ''} ${isLoadingThisDir ? 'loading' : ''}`}
            style={{ paddingLeft: `${level * 20 + 10}px` }}
            onClick={() => handleItemClick(item)}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item.isDirectory ? item.path : item.path.substring(0, item.path.lastIndexOf('/')), item.isDirectory)}
          >
            {item.isDirectory && (
              <span className="tree-toggle">
                {isLoadingThisDir ? '⏳' : (expandedDirs.has(item.path) ? '▼' : '▶')}
              </span>
            )}
            <span className="file-icon">
              {getFileIcon(item.name, item.isDirectory)}
            </span>
            <span className="file-name">{item.name}</span>
          </div>
          {item.isDirectory && expandedDirs.has(item.path) && item.children && (
            <div className="tree-children">
              {item.children.length === 0 && !isLoadingThisDir ? (
                <div className="empty-folder" style={{ paddingLeft: `${(level + 1) * 20 + 10}px` }}>
                  Empty folder
                </div>
              ) : (
                renderTree(item.children, level + 1)
              )}
            </div>
          )}
        </div>
      )
    }).filter(Boolean) // Remove null items
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h3>Explorer</h3>
        <button onClick={selectRootFolder} className="select-folder-btn">
          📁 Open Folder
        </button>
      </div>
      
      {loading && (
        <div className="loading">Loading...</div>
      )}
      
      {rootPath && !loading && (
        <div className="file-tree">
          <div className="root-path">{rootPath.split('/').pop() || rootPath.split('\\').pop()}</div>
          {renderTree(fileTree)}
        </div>
      )}
      
      {!rootPath && !loading && (
        <div className="no-folder">
          <p>No folder selected</p>
          <p>Click "Open Folder" to get started</p>
        </div>
      )}
    </div>
  )
})

FileExplorer.displayName = 'FileExplorer'

export default FileExplorer 