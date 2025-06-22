import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Command } from '@tauri-apps/plugin-shell';
import 'xterm/css/xterm.css';
import './Terminal.css';

const Terminal = ({ isVisible, onToggle, workingDirectory }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [currentDir, setCurrentDir] = useState('');
  const currentDirRef = useRef(''); // Use ref for immediate updates
  const [shellType, setShellType] = useState('');

  // Detect OS and set appropriate shell
  const detectShell = () => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      return 'powershell';
    } else if (platform.includes('mac')) {
      return 'zsh';
    } else {
      return 'bash';
    }
  };

  // Get default directory based on OS
  const getDefaultDirectory = () => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      // For Windows, default to user profile directory
      return '%USERPROFILE%';
    } else {
      // For Unix-like systems (Mac, Linux), default to home directory
      return '~';
    }
  };

  useEffect(() => {
    if (isVisible && terminalRef.current && !xtermRef.current) {
      const detectedShell = detectShell();
      setShellType(detectedShell);

      // Set working directory - use provided workingDirectory or fallback to default
      const initialDir = workingDirectory || getDefaultDirectory();
      setCurrentDir(initialDir);
      currentDirRef.current = initialDir;
      
      console.log('Terminal initialized with directory:', initialDir);

      // Create terminal instance
      const terminal = new XTerm({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          selection: '#3a3d41',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        },
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        tabStopWidth: 4
      });

      // Create fit addon
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      // Open terminal
      terminal.open(terminalRef.current);
      fitAddon.fit();

      // Store references
      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Welcome message
      terminal.writeln(`Vox IDE Terminal - ${detectedShell.toUpperCase()}`);
      terminal.writeln('Connected to system shell');
      terminal.writeln(`Working directory: ${initialDir}`);
      terminal.writeln('');
      
      // Show initial prompt with a small delay to ensure everything is ready
      setTimeout(() => {
        showPrompt(terminal);
      }, 100);

      // Handle input
      let currentLine = '';
      let cursorPosition = 0;
      
      terminal.onData((data) => {
        const code = data.charCodeAt(0);
        
        if (code === 13) { // Enter
          terminal.writeln('');
          if (currentLine.trim()) {
            executeCommand(currentLine.trim(), terminal);
          } else {
            showPrompt(terminal);
          }
          currentLine = '';
          cursorPosition = 0;
        } else if (code === 127) { // Backspace
          if (cursorPosition > 0) {
            currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
            cursorPosition--;
            terminal.write('\b \b');
          }
        } else if (code === 27) { // Escape sequences (arrow keys, etc.)
          // Handle escape sequences for arrow keys, etc.
          // This is a simplified version - full implementation would be more complex
          return;
        } else if (code >= 32 && code <= 126) { // Printable characters
          currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition);
          cursorPosition++;
          terminal.write(data);
        }
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (xtermRef.current) {
          xtermRef.current.dispose();
          xtermRef.current = null;
        }
      };
    }
  }, [isVisible]);

  // Update working directory when workingDirectory prop changes
  useEffect(() => {
    if (workingDirectory) {
      setCurrentDir(workingDirectory);
      currentDirRef.current = workingDirectory;
    }
  }, [workingDirectory]);

  // Listen for terminal command events from voice assistant
  useEffect(() => {
    const handleTerminalCommand = (event) => {
      const { command } = event.detail;
      console.log('📟 Terminal received voice command:', command);
      
      if (xtermRef.current && isVisible) {
        // Write the command to the terminal with visual indicators
        xtermRef.current.writeln('');
        xtermRef.current.writeln('\x1b[36m🎤 Voice Command:\x1b[0m ' + command);
        xtermRef.current.writeln('');
        
        // Execute the command
        executeCommand(command, xtermRef.current);
      } else {
        console.log('⚠️ Terminal not available for voice command execution');
      }
    };

    // Add event listener
    document.addEventListener('terminalCommand', handleTerminalCommand);

    // Cleanup
    return () => {
      document.removeEventListener('terminalCommand', handleTerminalCommand);
    };
  }, [isVisible]);

  const showPrompt = (terminal) => {
    // Show current directory in prompt for better visual feedback - use ref for immediate updates
    const currentDirectory = currentDirRef.current || currentDir;
    const shortDir = currentDirectory.length > 30 ? '...' + currentDirectory.slice(-27) : currentDirectory;
    const prompt = shellType === 'powershell' 
      ? `PS ${shortDir}> ` 
      : `${shortDir}$ `;
    terminal.write(prompt);
  };

  const handleChangeDirectory = async (newDir, terminal) => {
    try {
      // Handle special cases
      let targetDir = newDir;
      
      if (targetDir === '~' || targetDir === '') {
        targetDir = getDefaultDirectory();
      } else if (targetDir === '..') {
        // Go up one directory
        const currentPath = currentDirRef.current.replace(/\\/g, '/');
        const pathParts = currentPath.split('/').filter(part => part.length > 0);
        if (pathParts.length > 0) {
          pathParts.pop();
          targetDir = pathParts.length > 0 ? pathParts.join('/') : '/';
        } else {
          targetDir = '/';
        }
      } else if (targetDir === '.') {
        // Stay in current directory
        targetDir = currentDirRef.current;
      } else if (!targetDir.includes('/') && !targetDir.includes('\\')) {
        // Relative path - append to current directory
        targetDir = `${currentDirRef.current}/${targetDir}`.replace(/\\/g, '/');
      }

      // Normalize path separators for Windows
      if (shellType === 'powershell') {
        targetDir = targetDir.replace(/\//g, '\\');
      }

      // Test if directory exists by trying to list it
      const testCommand = shellType === 'powershell' 
        ? `Test-Path -Path "${targetDir}" -PathType Container`
        : `test -d "${targetDir}"`;

      let cmd;
      if (shellType === 'powershell') {
        cmd = Command.create('powershell', ['-Command', testCommand], { cwd: currentDirRef.current });
      } else {
        cmd = Command.create('sh', ['-c', testCommand], { cwd: currentDirRef.current });
      }

      const result = await cmd.execute();
      
      // Check if directory exists
      let directoryExists = false;
      if (shellType === 'powershell') {
        // PowerShell Test-Path returns 'True' or 'False'
        directoryExists = result.stdout.trim() === 'True';
      } else {
        // For bash/sh, exit code 0 means directory exists
        directoryExists = result.code === 0;
      }

      if (directoryExists) {
        // Update both state and ref for immediate use
        console.log('Changing directory from:', currentDirRef.current, 'to:', targetDir);
        setCurrentDir(targetDir);
        currentDirRef.current = targetDir;
        console.log('Directory updated. Ref now:', currentDirRef.current);
        terminal.writeln(`Directory changed to: ${targetDir}`);
        return targetDir; // Return the new directory
      } else {
        terminal.writeln(`\x1b[31mcd: Directory not found: ${targetDir}\x1b[0m`);
        return currentDirRef.current; // Return current directory if change failed
      }
    } catch (error) {
      console.error('Error changing directory:', error);
      terminal.writeln(`\x1b[31mcd: Error accessing directory: ${newDir}\x1b[0m`);
      return currentDirRef.current; // Return current directory if error
    }
  };

  const executeCommand = async (command, terminal) => {
    try {
      console.log('Executing command:', command);
      console.log('Current directory (ref):', currentDirRef.current);
      console.log('Current directory (state):', currentDir);
      console.log('Working directory prop:', workingDirectory);
      
      // Handle built-in commands
      if (command === 'clear' || command === 'cls') {
        terminal.clear();
        showPrompt(terminal);
        return;
      }

      if (command === 'pwd') {
        terminal.writeln(currentDirRef.current);
        showPrompt(terminal);
        return;
      }

      if (command.startsWith('cd ')) {
        const newDir = command.substring(3).trim();
        if (newDir) {
          await handleChangeDirectory(newDir, terminal);
        } else {
          // cd with no arguments - go to home directory
          const homeDir = getDefaultDirectory();
          await handleChangeDirectory(homeDir, terminal);
        }
        showPrompt(terminal);
        return;
      }

      // Execute command using Tauri shell
      let cmd;
      let args;
      let options = {};

      // Ensure we have a working directory - use ref for immediate access
      const workDir = currentDirRef.current || workingDirectory || getDefaultDirectory();
      
      // Set working directory
      options.cwd = workDir;
      
      // Ensure we have a shell type set
      const currentShell = shellType || detectShell();

      if (currentShell === 'powershell') {
        cmd = Command.create('powershell', ['-Command', command], options);
      } else if (currentShell === 'cmd') {
        cmd = Command.create('cmd', ['/C', command], options);
      } else {
        // Default to sh for bash/zsh/other shells
        cmd = Command.create('sh', ['-c', command], options);
      }

      // Execute command and get result
      const output = await cmd.execute();
      
      // Display output
      if (output.stdout) {
        const lines = output.stdout.split('\n');
        lines.forEach(line => {
          if (line.trim().length > 0) {
            terminal.writeln(line);
          }
        });
      }
      
      if (output.stderr) {
        const lines = output.stderr.split('\n');
        lines.forEach(line => {
          if (line.trim().length > 0) {
            terminal.writeln(`\x1b[31m${line}\x1b[0m`); // Red color for errors
          }
        });
      }

      showPrompt(terminal);
          } catch (error) {
        console.error('Shell command error:', error);
        console.error('Working directory was:', workDir);
        console.error('Shell type was:', shellType);
        
        // More detailed error message
        let errorMessage = 'Command execution failed';
        if (error.message) {
          if (error.message.includes('No such file or directory')) {
            errorMessage = `Directory not found: ${workDir}`;
          } else if (error.message.includes('permission')) {
            errorMessage = `Permission denied. Check directory access: ${workDir}`;
          } else {
            errorMessage = error.message;
          }
        }
        
        terminal.writeln(`\x1b[31mError: ${errorMessage}\x1b[0m`);
        showPrompt(terminal);
      }
    };

  if (!isVisible) return null;

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span className="terminal-title">Terminal ({shellType.toUpperCase()})</span>
        <div className="terminal-controls">
          <span className="terminal-cwd">{currentDir}</span>
          <button className="terminal-close" onClick={onToggle}>×</button>
        </div>
      </div>
      <div className="terminal-content" ref={terminalRef}></div>
    </div>
  );
};

export default Terminal; 