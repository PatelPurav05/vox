// import React, { useState, useEffect, useRef } from 'react'
// import Editor from '@monaco-editor/react'
// import FileExplorer from './components/FileExplorer'
// import { readTextFile, writeTextFile, exists, create, mkdir, remove, rename } from '@tauri-apps/plugin-fs'
// import { open } from '@tauri-apps/plugin-dialog'
// import Terminal from './components/Terminal'
// import ContextMenu from './components/ContextMenu'
// import NewFileDialog from './components/NewFileDialog'
// import VoiceAssistant from './components/VoiceAssistant'
// import './App.css'

// function App() {
//   const [currentFile, setCurrentFile] = useState(null)
//   const [fileContent, setFileContent] = useState('')
//   const [unsavedChanges, setUnsavedChanges] = useState(false)
//   const [isAutoSaving, setIsAutoSaving] = useState(false)
//   const [rootPath, setRootPath] = useState(null)
//   const [showDebug, setShowDebug] = useState(false)
//   const [fileTreeRefresh, setFileTreeRefresh] = useState(0)
//   const [debugLogs, setDebugLogs] = useState([])
//   const [debugPanelWidth, setDebugPanelWidth] = useState(300)
//   const [sidebarWidth, setSidebarWidth] = useState(250)
//   const autoSaveTimeoutRef = useRef(null)
//   const [isTerminalVisible, setIsTerminalVisible] = useState(false)
//   const [contextMenu, setContextMenu] = useState({
//     isVisible: false,
//     position: { x: 0, y: 0 },
//     targetPath: null,
//     isDirectory: false
//   })
//   const [newFileDialog, setNewFileDialog] = useState({
//     isVisible: false,
//     targetPath: null
//   })
//   const [editorInstance, setEditorInstance] = useState(null)

//   const sidebarRef = useRef(null)
//   const debugRef = useRef(null)

//   // Simple debug logging function without console override
//   const addDebugLog = (message, type = 'info') => {
//     const timestamp = new Date().toLocaleTimeString()
//     setDebugLogs(prev => [...prev.slice(-30), { timestamp, message, type }]) // Keep last 30 logs
//     console.log(`[${timestamp}] ${message}`)
//   }

//   // Auto-save functionality
//   useEffect(() => {
//     if (unsavedChanges && currentFile) {
//       // Clear existing timeout
//       if (autoSaveTimeoutRef.current) {
//         clearTimeout(autoSaveTimeoutRef.current)
//       }

//       // Set new timeout for auto-save
//       autoSaveTimeoutRef.current = setTimeout(async () => {
//         await handleSave(true)
//       }, 2000) // Auto-save after 2 seconds of inactivity
//     }

//     return () => {
//       if (autoSaveTimeoutRef.current) {
//         clearTimeout(autoSaveTimeoutRef.current)
//       }
//     }
//   }, [unsavedChanges, fileContent, currentFile])

//   // Resizing functionality for debug panel
//   const handleDebugResize = (e) => {
//     e.preventDefault()
//     const startX = e.clientX
//     const startWidth = debugPanelWidth

//     const doDrag = (e) => {
//       const newWidth = startWidth + (startX - e.clientX) // Reversed direction
//       setDebugPanelWidth(Math.max(200, Math.min(600, newWidth)))
//     }

//     const stopDrag = () => {
//       document.removeEventListener('mousemove', doDrag)
//       document.removeEventListener('mouseup', stopDrag)
//     }

//     document.addEventListener('mousemove', doDrag)
//     document.addEventListener('mouseup', stopDrag)
//   }

//   // Resizing functionality for sidebar
//   const handleSidebarResize = (e) => {
//     e.preventDefault()
//     const startX = e.clientX
//     const startWidth = sidebarWidth

//     const doDrag = (e) => {
//       const newWidth = startWidth + (e.clientX - startX) // This direction is correct
//       setSidebarWidth(Math.max(200, Math.min(500, newWidth)))
//     }

//     const stopDrag = () => {
//       document.removeEventListener('mousemove', doDrag)
//       document.removeEventListener('mouseup', stopDrag)
//     }

//     document.addEventListener('mousemove', doDrag)
//     document.addEventListener('mouseup', stopDrag)
//   }

//   const handleFileSelect = async (filePath) => {
//     try {
//       addDebugLog(`Opening file: ${filePath}`)
      
//       // Normalize the file path to handle mixed separators
//       const normalizedPath = filePath.replace(/\\/g, '/')
      
//       // Check if file exists first
//       const fileExists = await exists(normalizedPath)
//       if (!fileExists) {
//         addDebugLog(`File does not exist: ${normalizedPath}`, 'error')
//         return
//       }
      
//       const content = await readTextFile(normalizedPath)
//       setFileContent(content)
//       setCurrentFile(filePath) // Keep original path for display
//       setUnsavedChanges(false)
      
//       // Clear any existing auto-save timeout
//       if (autoSaveTimeoutRef.current) {
//         clearTimeout(autoSaveTimeoutRef.current)
//         autoSaveTimeoutRef.current = null
//       }
//     } catch (error) {
//       addDebugLog(`Error reading file: ${error.message || error}`, 'error')
//       console.error('Error reading file:', error)
//     }
//   }

//   const handleEditorChange = (value) => {
//     setFileContent(value || '')
//     setUnsavedChanges(true)
//   }

//   const handleSave = async (isAutoSave = false) => {
//     if (!currentFile || !unsavedChanges) {
//       return
//     }

//     try {
//       addDebugLog(`${isAutoSave ? 'Auto-' : 'Manual '}saving: ${currentFile}`)
      
//       if (isAutoSave) {
//         setIsAutoSaving(true)
//       }

//       await writeTextFile(currentFile, fileContent)
//       setUnsavedChanges(false)
      
//       addDebugLog('File saved successfully')

//       if (isAutoSave) {
//         setTimeout(() => setIsAutoSaving(false), 1000)
//       }
//     } catch (error) {
//       addDebugLog(`Error saving file: ${error.message}`, 'error')
//       alert(`Error saving file: ${error.message}`)
      
//       if (isAutoSave) {
//         setIsAutoSaving(false)
//       }
//     }
//   }

//   const handleKeyDown = (event) => {
//     if (event.ctrlKey && event.key === 's') {
//       event.preventDefault()
//       handleSave(false)
//     }
//     if (event.ctrlKey && event.shiftKey && event.key === 'D') {
//       event.preventDefault()
//       setShowDebug(!showDebug)
//     }
//     if (event.ctrlKey && event.key === '`') {
//       event.preventDefault()
//       setIsTerminalVisible(!isTerminalVisible)
//     }
//   }

//   useEffect(() => {
//     document.addEventListener('keydown', handleKeyDown)
//     return () => {
//       document.removeEventListener('keydown', handleKeyDown)
//     }
//   }, [currentFile, fileContent, unsavedChanges])

//   // Context menu handlers
//   const handleContextMenu = (event, targetPath, isDirectory) => {
//     event.preventDefault()
//     setContextMenu({
//       isVisible: true,
//       position: { x: event.clientX, y: event.clientY },
//       targetPath,
//       isDirectory
//     })
//   }

//   const handleCreateFile = (targetPath) => {
//     setNewFileDialog({
//       isVisible: true,
//       targetPath: targetPath
//     })
//   }

//   const handleCreateFileWithContent = async (filePath, content = '') => {
//     try {
//       // Create the file using Tauri's create function
//       await create(filePath)
      
//       // If there's content, write it to the file
//       if (content) {
//         await writeTextFile(filePath, content)
//       }
      
//       addDebugLog(`Created file: ${filePath}`)
      
//       // Refresh the file explorer
//       setFileTreeRefresh(prev => prev + 1)
      
//       // Automatically open the new file
//       await handleFileSelect(filePath)
//     } catch (error) {
//       addDebugLog(`Error creating file: ${error.message}`, 'error')
//       alert(`Error creating file: ${error.message}`)
//     }
//   }

//   const handleCreateFolder = async (targetPath) => {
//     const folderName = prompt('Enter folder name:')
//     if (!folderName) return

//     try {
//       const folderPath = `${targetPath}/${folderName}`.replace(/\\/g, '/')
      
//       // Create the directory using Tauri's mkdir function
//       await mkdir(folderPath, { recursive: true })
//       addDebugLog(`Created folder: ${folderPath}`)
      
//       // Refresh the file explorer
//       setFileTreeRefresh(prev => prev + 1)
//     } catch (error) {
//       addDebugLog(`Error creating folder: ${error.message}`, 'error')
//       alert(`Error creating folder: ${error.message}`)
//     }
//   }

//   const handleDelete = async (targetPath) => {
//     const itemName = targetPath.split('/').pop() || targetPath.split('\\').pop()
//     if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return

//     try {
//       // Use Tauri's remove function
//       await remove(targetPath, { recursive: true })
//       addDebugLog(`Deleted: ${targetPath}`)
      
//       // If the deleted file was currently open, close it
//       if (currentFile === targetPath) {
//         setCurrentFile(null)
//         setFileContent('')
//         setUnsavedChanges(false)
//       }
      
//       // Refresh the file explorer
//       setFileTreeRefresh(prev => prev + 1)
//     } catch (error) {
//       addDebugLog(`Error deleting: ${error.message}`, 'error')
//       alert(`Error deleting: ${error.message}`)
//     }
//   }

//   const handleRename = async (targetPath) => {
//     const currentName = targetPath.split('/').pop() || targetPath.split('\\').pop()
//     const newName = prompt('Enter new name:', currentName)
//     if (!newName || newName === currentName) return

//     try {
//       const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
//       const newPath = `${parentPath}/${newName}`.replace(/\\/g, '/')
      
//       // Use Tauri's rename function
//       await rename(targetPath, newPath)
//       addDebugLog(`Renamed: ${targetPath} -> ${newPath}`)
      
//       // If the renamed file was currently open, update the current file path
//       if (currentFile === targetPath) {
//         setCurrentFile(newPath)
//       }
      
//       // Refresh the file explorer
//       setFileTreeRefresh(prev => prev + 1)
//     } catch (error) {
//       addDebugLog(`Error renaming: ${error.message}`, 'error')
//       alert(`Error renaming: ${error.message}`)
//     }
//   }

//   const getLanguageFromFilename = (filename) => {
//     const extension = filename.split('.').pop()?.toLowerCase()
//     const languageMap = {
//       'js': 'javascript',
//       'jsx': 'javascript',
//       'ts': 'typescript',
//       'tsx': 'typescript',
//       'py': 'python',
//       'rs': 'rust',
//       'go': 'go',
//       'java': 'java',
//       'cpp': 'cpp',
//       'c': 'c',
//       'cs': 'csharp',
//       'php': 'php',
//       'rb': 'ruby',
//       'swift': 'swift',
//       'kt': 'kotlin',
//       'scala': 'scala',
//       'sh': 'shell',
//       'bash': 'shell',
//       'zsh': 'shell',
//       'fish': 'shell',
//       'ps1': 'powershell',
//       'html': 'html',
//       'htm': 'html',
//       'css': 'css',
//       'scss': 'scss',
//       'sass': 'sass',
//       'less': 'less',
//       'json': 'json',
//       'xml': 'xml',
//       'yaml': 'yaml',
//       'yml': 'yaml',
//       'toml': 'toml',
//       'ini': 'ini',
//       'cfg': 'ini',
//       'conf': 'ini',
//       'md': 'markdown',
//       'markdown': 'markdown',
//       'sql': 'sql',
//       'dockerfile': 'dockerfile',
//       'gitignore': 'text',
//       'txt': 'text'
//     }
//     return languageMap[extension] || 'text'
//   }

//   return (
//     <div className="app">
//       <div className="app-header">
//         <h1>Vox IDE</h1>
//         <div className="header-controls">
//           <button 
//             onClick={() => setIsTerminalVisible(!isTerminalVisible)}
//             className={`header-button ${isTerminalVisible ? 'active' : ''}`}
//             title="Toggle Terminal (Ctrl+`)"
//           >
//             Terminal
//           </button>
//           <button 
//             onClick={() => setShowDebug(!showDebug)}
//             className={`header-button ${showDebug ? 'active' : ''}`}
//             title="Toggle Debug Panel (Ctrl+Shift+D)"
//           >
//             Debug
//           </button>
//         </div>
//       </div>
      
//       <div className="app-content">
//         <div 
//           className="sidebar" 
//           ref={sidebarRef}
//           style={{ width: sidebarWidth, flexShrink: 0 }}
//         >
//           <FileExplorer 
//             onFileSelect={handleFileSelect}
//             onRootPathChange={setRootPath}
//             onContextMenu={handleContextMenu}
//             currentFile={currentFile}
//             refreshTrigger={fileTreeRefresh}
//           />
//         </div>
        
//         <div 
//           className="sidebar-resizer"
//           onMouseDown={handleSidebarResize}
//         ></div>
        
//         <div className="main-content">
//           <div className="editor-container">
//             <div className="editor-header">
//               <div className="file-info">
//                 {currentFile && (
//                   <>
//                     <span className="file-name">
//                       {currentFile.split('/').pop() || currentFile.split('\\').pop()}
//                     </span>
//                     {unsavedChanges && <span className="unsaved-indicator">●</span>}
//                   </>
//                 )}
//               </div>
//               <div className="status-bar">
//                 {isAutoSaving && <span className="auto-save-indicator">Auto-saving...</span>}
//                 {!isAutoSaving && unsavedChanges && <span className="changes-indicator">Unsaved changes</span>}
//               </div>
//             </div>
            
//             <div className="editor-wrapper">
//               {currentFile ? (
//                 <Editor
//                   height="100%"
//                   language={getLanguageFromFilename(currentFile)}
//                   value={fileContent}
//                   onChange={handleEditorChange}
//                   onMount={(editor) => setEditorInstance(editor)}
//                   theme="vs-dark"
//                   options={{
//                     minimap: { enabled: false },
//                     fontSize: 14,
//                     wordWrap: 'on',
//                     automaticLayout: true,
//                     scrollBeyondLastLine: false,
//                     renderWhitespace: 'selection',
//                     tabSize: 2,
//                     insertSpaces: true,
//                   }}
//                 />
//               ) : (
//                 <div className="no-file-selected">
//                   <h2>Welcome to Vox IDE</h2>
//                   <p>Select a folder from the file explorer to get started.</p>
//                   <p>Press <kbd>Ctrl+Shift+D</kbd> to toggle debug panel</p>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {showDebug && (
//             <>
//               <div 
//                 className="debug-resizer"
//                 onMouseDown={handleDebugResize}
//               ></div>
//               <div 
//                 className="debug-panel"
//                 ref={debugRef}
//                 style={{ width: debugPanelWidth, flexShrink: 0 }}
//               >
//                 <div className="debug-header">
//                   <h3>Debug Console</h3>
//                   <button onClick={() => setDebugLogs([])} className="clear-logs">Clear</button>
//                 </div>
//                 <div className="debug-logs">
//                   {debugLogs.map((log, index) => (
//                     <div key={index} className={`debug-log ${log.type}`}>
//                       <span className="log-time">{log.timestamp}</span>
//                       <span className="log-message">{log.message}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       <Terminal 
//         isVisible={isTerminalVisible}
//         onToggle={() => setIsTerminalVisible(!isTerminalVisible)}
//         workingDirectory={rootPath}
//       />

//       <ContextMenu
//         isVisible={contextMenu.isVisible}
//         position={contextMenu.position}
//         onClose={() => setContextMenu(prev => ({ ...prev, isVisible: false }))}
//         onCreateFile={handleCreateFile}
//         onCreateFolder={handleCreateFolder}
//         onDelete={handleDelete}
//         onRename={handleRename}
//         targetPath={contextMenu.targetPath}
//         isDirectory={contextMenu.isDirectory}
//       />

//       <NewFileDialog
//         isVisible={newFileDialog.isVisible}
//         onClose={() => setNewFileDialog(prev => ({ ...prev, isVisible: false }))}
//         onCreateFile={handleCreateFileWithContent}
//         targetPath={newFileDialog.targetPath}
//       />

//       <VoiceAssistant editor={editorInstance} />
//     </div>
//   )
// }

// export default App 

import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import FileExplorer from './components/FileExplorer'
import { readTextFile, writeTextFile, exists, create, mkdir, remove, rename } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import Terminal from './components/Terminal'
import ContextMenu from './components/ContextMenu'
import NewFileDialog from './components/NewFileDialog'
import VoiceAssistant from './components/VoiceAssistant'
import './App.css'

function App() {
  const [currentFile, setCurrentFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [rootPath, setRootPath] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const [fileTreeRefresh, setFileTreeRefresh] = useState(0)
  const [debugLogs, setDebugLogs] = useState([])
  const [debugPanelWidth, setDebugPanelWidth] = useState(300)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const autoSaveTimeoutRef = useRef(null)
  const [isTerminalVisible, setIsTerminalVisible] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true) // Default to dark for IDE
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    targetPath: null,
    isDirectory: false
  })
  const [newFileDialog, setNewFileDialog] = useState({
    isVisible: false,
    targetPath: null
  })
  const [editorInstance, setEditorInstance] = useState(null)

  const sidebarRef = useRef(null)
  const debugRef = useRef(null)

  // Theme management
  useEffect(() => {
    // Load theme preference from localStorage on component mount
    const savedTheme = localStorage.getItem('vox-ide-theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    } else {
      // Check system preference, but default to dark for IDE
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(prefersDark !== false) // Default to dark unless explicitly light
    }
  }, [])

  // Apply theme to document and save preference
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('vox-ide-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    addDebugLog(`Theme switched to ${!isDarkMode ? 'dark' : 'light'} mode`)
  }

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
    if (event.ctrlKey && event.key === '`') {
      event.preventDefault()
      setIsTerminalVisible(!isTerminalVisible)
    }
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault()
      toggleTheme()
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentFile, fileContent, unsavedChanges, isDarkMode])

  // Context menu handlers
  const handleContextMenu = (event, targetPath, isDirectory) => {
    event.preventDefault()
    setContextMenu({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      targetPath,
      isDirectory
    })
  }

  const handleCreateFile = (targetPath) => {
    setNewFileDialog({
      isVisible: true,
      targetPath: targetPath
    })
  }

  const handleCreateFileWithContent = async (filePath, content = '') => {
    try {
      // Create the file using Tauri's create function
      await create(filePath)
      
      // If there's content, write it to the file
      if (content) {
        await writeTextFile(filePath, content)
      }
      
      addDebugLog(`Created file: ${filePath}`)
      
      // Refresh the file explorer
      setFileTreeRefresh(prev => prev + 1)
      
      // Automatically open the new file
      await handleFileSelect(filePath)
    } catch (error) {
      addDebugLog(`Error creating file: ${error.message}`, 'error')
      alert(`Error creating file: ${error.message}`)
    }
  }

  const handleCreateFolder = async (targetPath) => {
    const folderName = prompt('Enter folder name:')
    if (!folderName) return

    try {
      const folderPath = `${targetPath}/${folderName}`.replace(/\\/g, '/')
      
      // Create the directory using Tauri's mkdir function
      await mkdir(folderPath, { recursive: true })
      addDebugLog(`Created folder: ${folderPath}`)
      
      // Refresh the file explorer
      setFileTreeRefresh(prev => prev + 1)
    } catch (error) {
      addDebugLog(`Error creating folder: ${error.message}`, 'error')
      alert(`Error creating folder: ${error.message}`)
    }
  }

  const handleDelete = async (targetPath) => {
    const itemName = targetPath.split('/').pop() || targetPath.split('\\').pop()
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return

    try {
      // Use Tauri's remove function
      await remove(targetPath, { recursive: true })
      addDebugLog(`Deleted: ${targetPath}`)
      
      // If the deleted file was currently open, close it
      if (currentFile === targetPath) {
        setCurrentFile(null)
        setFileContent('')
        setUnsavedChanges(false)
      }
      
      // Refresh the file explorer
      setFileTreeRefresh(prev => prev + 1)
    } catch (error) {
      addDebugLog(`Error deleting: ${error.message}`, 'error')
      alert(`Error deleting: ${error.message}`)
    }
  }

  const handleRename = async (targetPath) => {
    const currentName = targetPath.split('/').pop() || targetPath.split('\\').pop()
    const newName = prompt('Enter new name:', currentName)
    if (!newName || newName === currentName) return

    try {
      const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
      const newPath = `${parentPath}/${newName}`.replace(/\\/g, '/')
      
      // Use Tauri's rename function
      await rename(targetPath, newPath)
      addDebugLog(`Renamed: ${targetPath} -> ${newPath}`)
      
      // If the renamed file was currently open, update the current file path
      if (currentFile === targetPath) {
        setCurrentFile(newPath)
      }
      
      // Refresh the file explorer
      setFileTreeRefresh(prev => prev + 1)
    } catch (error) {
      addDebugLog(`Error renaming: ${error.message}`, 'error')
      alert(`Error renaming: ${error.message}`)
    }
  }

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
      <div className="app-header">
        <h1>Vox IDE</h1>
        <div className="header-controls">
          <button 
            onClick={toggleTheme}
            className="header-button theme-toggle"
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode (Ctrl+Shift+T)`}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button 
            onClick={() => setIsTerminalVisible(!isTerminalVisible)}
            className={`header-button ${isTerminalVisible ? 'active' : ''}`}
            title="Toggle Terminal (Ctrl+`)"
          >
            Terminal
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`header-button ${showDebug ? 'active' : ''}`}
            title="Toggle Debug Panel (Ctrl+Shift+D)"
          >
            Debug
          </button>
        </div>
      </div>
      
      <div className="app-content">
        <div 
          className="sidebar" 
          ref={sidebarRef}
          style={{ width: sidebarWidth, flexShrink: 0 }}
        >
          <FileExplorer 
            onFileSelect={handleFileSelect}
            onRootPathChange={setRootPath}
            onContextMenu={handleContextMenu}
            currentFile={currentFile}
            refreshTrigger={fileTreeRefresh}
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
              </div>
            </div>
            
            <div className="editor-wrapper">
              {currentFile ? (
                <Editor
                  height="100%"
                  language={getLanguageFromFilename(currentFile)}
                  value={fileContent}
                  onChange={handleEditorChange}
                  onMount={(editor) => setEditorInstance(editor)}
                  theme={isDarkMode ? "vs-dark" : "vs-light"}
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
                  <p>Press <kbd>Ctrl+Shift+T</kbd> to toggle theme</p>
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
                ref={debugRef}
                style={{ width: debugPanelWidth, flexShrink: 0 }}
              >
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
            </>
          )}
        </div>
      </div>

      <Terminal 
        isVisible={isTerminalVisible}
        onToggle={() => setIsTerminalVisible(!isTerminalVisible)}
        workingDirectory={rootPath}
      />

      <ContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={() => setContextMenu(prev => ({ ...prev, isVisible: false }))}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onDelete={handleDelete}
        onRename={handleRename}
        targetPath={contextMenu.targetPath}
        isDirectory={contextMenu.isDirectory}
      />

      <NewFileDialog
        isVisible={newFileDialog.isVisible}
        onClose={() => setNewFileDialog(prev => ({ ...prev, isVisible: false }))}
        onCreateFile={handleCreateFileWithContent}
        targetPath={newFileDialog.targetPath}
      />

      <VoiceAssistant editor={editorInstance} />
    </div>
  )
}

export default App