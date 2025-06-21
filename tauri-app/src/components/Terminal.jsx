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
      return process.env.USERPROFILE || 'C:\\Users\\' + process.env.USERNAME || 'C:\\';
    } else {
      return process.env.HOME || '~/';
    }
  };

  useEffect(() => {
    if (isVisible && terminalRef.current && !xtermRef.current) {
      const detectedShell = detectShell();
      setShellType(detectedShell);

      // Set working directory - use provided workingDirectory or fallback to default
      const initialDir = workingDirectory || getDefaultDirectory();
      setCurrentDir(initialDir);

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
      
      // Show initial prompt
      showPrompt(terminal);

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
    }
  }, [workingDirectory]);

  const showPrompt = (terminal) => {
    const prompt = shellType === 'powershell' ? 'PS> ' : '$ ';
    terminal.write(prompt);
  };

  const executeCommand = async (command, terminal) => {
    try {
      // Handle built-in commands
      if (command === 'clear' || command === 'cls') {
        terminal.clear();
        showPrompt(terminal);
        return;
      }

      if (command.startsWith('cd ')) {
        const newDir = command.substring(3).trim();
        if (newDir) {
          setCurrentDir(newDir);
        }
      }

      // Execute command using Tauri shell
      let cmd;
      let args;
      let options = {};

      // Set working directory if available
      if (currentDir) {
        options.cwd = currentDir;
      }

      if (shellType === 'powershell') {
        cmd = Command.create('powershell', ['-Command', command], options);
      } else if (shellType === 'cmd') {
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
      terminal.writeln(`\x1b[31mError: ${error.message || 'Command execution failed'}\x1b[0m`);
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