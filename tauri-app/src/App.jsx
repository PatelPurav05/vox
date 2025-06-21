import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import FileExplorer from './components/FileExplorer'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import './App.css'

function App() {
  const [currentFile, setCurrentFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [rootPath, setRootPath] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState([])
  const [debugPanelWidth, setDebugPanelWidth] = useState(300)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const autoSaveTimeoutRef = useRef(null)

  // Simple debug logging function without console override
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev.slice(-30), { timestamp, message, type }]) // Keep last 30 logs
    console.log(`[${timestamp}] ${message}`)
  }

  // Auto-save functionality
  useEffect(() => {
    if (unsavedChanges && currentFile) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await handleSave(true)
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [unsavedChanges, fileContent, currentFile])

  // Resizing functionality for debug panel
  const handleDebugResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = debugPanelWidth

    const doDrag = (e) => {
      const newWidth = startWidth + (startX - e.clientX) // Reversed direction
      setDebugPanelWidth(Math.max(200, Math.min(600, newWidth)))
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  // Resizing functionality for sidebar
  const handleSidebarResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const doDrag = (e) => {
      const newWidth = startWidth + (e.clientX - startX) // This direction is correct
      setSidebarWidth(Math.max(200, Math.min(500, newWidth)))
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const handleFileSelect = async (filePath) => {
    try {
      addDebugLog(`Opening file: ${filePath}`)
      
      // Normalize the file path to handle mixed separators
      const normalizedPath = filePath.replace(/\\/g, '/')
      
      // Check if file exists first
      const fileExists = await exists(normalizedPath)
      if (!fileExists) {
        addDebugLog(`File does not exist: ${normalizedPath}`, 'error')
        return
      }
      
      const content = await readTextFile(normalizedPath)
      setFileContent(content)
      setCurrentFile(filePath) // Keep original path for display
      setUnsavedChanges(false)
      
      // Clear any existing auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
    } catch (error) {
      addDebugLog(`Error reading file: ${error.message || error}`, 'error')
      console.error('Error reading file:', error)
    }
  }

  const handleEditorChange = (value) => {
    setFileContent(value || '')
    setUnsavedChanges(true)
  }

  const handleSave = async (isAutoSave = false) => {
    if (!currentFile || !unsavedChanges) {
      return
    }

    try {
      addDebugLog(`${isAutoSave ? 'Auto-' : 'Manual '}saving: ${currentFile}`)
      
      if (isAutoSave) {
        setIsAutoSaving(true)
      }

      await writeTextFile(currentFile, fileContent)
      setUnsavedChanges(false)
      
      addDebugLog('File saved successfully')

      if (isAutoSave) {
        setTimeout(() => setIsAutoSaving(false), 1000)
      }
    } catch (error) {
      addDebugLog(`Error saving file: ${error.message}`, 'error')
      alert(`Error saving file: ${error.message}`)
      
      if (isAutoSave) {
        setIsAutoSaving(false)
      }
    }
  }

  const handleKeyDown = (event) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault()
      handleSave(false)
    }
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault()
      setShowDebug(!showDebug)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentFile, fileContent, unsavedChanges])

  const getLanguageFromFilename = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'md': 'markdown',
      'markdown': 'markdown',
      'sql': 'sql',
      'dockerfile': 'dockerfile',
      'gitignore': 'text',
      'txt': 'text'
    }
    return languageMap[extension] || 'text'
  }

  return (
    <div className="app">
      <div 
        className="sidebar" 
        style={{ width: `${sidebarWidth}px` }}
      >
        <FileExplorer 
          onFileSelect={handleFileSelect}
          onRootPathChange={setRootPath}
          currentFile={currentFile}
        />
      </div>
      
      <div 
        className="sidebar-resizer"
        onMouseDown={handleSidebarResize}
      ></div>
      
      <div className="main-content">
        <div className="editor-container">
          <div className="editor-header">
            <div className="file-info">
              {currentFile && (
                <>
                  <span className="file-name">
                    {currentFile.split('/').pop() || currentFile.split('\\').pop()}
                  </span>
                  {unsavedChanges && <span className="unsaved-indicator">●</span>}
                </>
              )}
            </div>
            <div className="status-bar">
              {isAutoSaving && <span className="auto-save-indicator">Auto-saving...</span>}
              {!isAutoSaving && unsavedChanges && <span className="changes-indicator">Unsaved changes</span>}
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className="debug-toggle"
                title="Toggle Debug Panel (Ctrl+Shift+D)"
              >
                🐛
              </button>
            </div>
          </div>
          
          <div className="editor-wrapper">
            {currentFile ? (
              <Editor
                height="100%"
                language={getLanguageFromFilename(currentFile)}
                value={fileContent}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  renderWhitespace: 'selection',
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            ) : (
              <div className="no-file-selected">
                <h2>Welcome to Vox IDE</h2>
                <p>Select a folder from the file explorer to get started.</p>
                <p>Press <kbd>Ctrl+Shift+D</kbd> to toggle debug panel</p>
              </div>
            )}
          </div>
        </div>
        
        {showDebug && (
          <>
            <div 
              className="debug-resizer"
              onMouseDown={handleDebugResize}
            ></div>
            <div 
              className="debug-panel"
              style={{ width: `${debugPanelWidth}px` }}
            >
              <div className="debug-content">
                <div className="debug-header">
                  <h3>Debug Console</h3>
                  <button onClick={() => setDebugLogs([])} className="clear-logs">Clear</button>
                </div>
                <div className="debug-logs">
                  {debugLogs.map((log, index) => (
                    <div key={index} className={`debug-log ${log.type}`}>
                      <span className="log-time">{log.timestamp}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App 