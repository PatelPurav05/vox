import React, { useState, useEffect, useRef } from 'react';
import useVapi from '../hooks/useVapi';
import GeminiService from '../services/geminiService';
import './VoiceAssistant.css';

const VoiceAssistant = ({ editor, fileExplorerRef }) => {
  const [vapiKey, setVapiKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [status, setStatus] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Search state for voice navigation
  const [searchState, setSearchState] = useState({
    query: '',
    results: [],
    currentIndex: -1,
    totalResults: 0
  });

  // Store decoration IDs for proper cleanup
  const searchDecorationsRef = useRef([]);

  const geminiService = useRef(null);
  const statusTimeout = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const processingTimeout = useRef(null);

  // Auto-hide status after 3 seconds
  const showStatus = (message) => {
    setStatus(message);
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
    }
    statusTimeout.current = setTimeout(() => {
      setStatus('');
    }, 3000);
  };

  // Load config and get microphones
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const module = await import('../config/voiceAssistant.js');
        if (module.voiceAssistantConfig) {
          setVapiKey(module.voiceAssistantConfig.vapi?.publicKey || '');
          setAssistantId(module.voiceAssistantConfig.vapi?.assistantId || '');
          setGeminiKey(module.voiceAssistantConfig.gemini?.apiKey || '');
        }
      } catch (e) {
        console.log('Config not found. Create src/config/voiceAssistant.js');
      }
    };
    
    loadConfig();
  }, []);

  // Initialize Gemini
  useEffect(() => {
    if (geminiKey) {
      geminiService.current = new GeminiService(geminiKey);
    }
  }, [geminiKey]);

  // Cleanup search decorations on unmount or editor change
  useEffect(() => {
    return () => {
      if (editor && searchDecorationsRef.current.length > 0) {
        try {
          editor.deltaDecorations(searchDecorationsRef.current, []);
        } catch (e) {
          // Editor might be disposed, ignore
        }
      }
    };
  }, [editor]);

  const { isListening, transcript, error, toggleListening, testAudioCapture } = useVapi(vapiKey, assistantId);

  // Get rich editor context
  const getEditorContext = () => {
    if (!editor || !editor.getModel()) {
      return {
        fileName: 'untitled',
        language: 'javascript',
        cursorLine: 1,
        totalLines: 0,
        currentContent: '',
        selectedText: '',
        cursorColumn: 1,
        hasEditor: false
      };
    }

    const model = editor.getModel();
    const position = editor.getPosition();
    const selection = editor.getSelection();
    
    // Get current content (limit to avoid API limits)
    const currentContent = model.getValue();
    
    // Get selected text if any
    const selectedText = selection && !selection.isEmpty() 
      ? model.getValueInRange(selection) 
      : '';

    // Get surrounding context (current line + 5 lines before/after)
    const currentLine = position.lineNumber;
    const startContextLine = Math.max(1, currentLine - 5);
    const endContextLine = Math.min(model.getLineCount(), currentLine + 5);
    const contextRange = {
      startLineNumber: startContextLine,
      startColumn: 1,
      endLineNumber: endContextLine,
      endColumn: model.getLineMaxColumn(endContextLine)
    };
    const surroundingContext = model.getValueInRange(contextRange);

    return {
      fileName: model.uri?.path || 'untitled',
      language: model.getLanguageId() || 'javascript',
      cursorLine: currentLine,
      cursorColumn: position.column,
      totalLines: model.getLineCount(),
      currentContent: currentContent.length > 3000 ? currentContent.substring(0, 3000) + '...' : currentContent,
      selectedText: selectedText,
      surroundingContext: surroundingContext,
      hasSelection: selectedText.length > 0,
      hasEditor: true
    };
  };

  // Process new transcripts with debouncing
  useEffect(() => {
    if (transcript && transcript !== lastTranscript && !isProcessing) {
      setLastTranscript(transcript);
      
      // Clear any existing timeout
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
      
      // Debounce processing to avoid multiple rapid calls
      processingTimeout.current = setTimeout(() => {
        console.log('🎯 Processing transcript after debounce:', transcript);
        processVoiceCommand(transcript);
      }, 500); // Wait 500ms to ensure user finished speaking
    }
  }, [transcript, isProcessing]);

  // Text-to-speech functionality
  const speakText = (text) => {
    return new Promise((resolve) => {
      // Cancel any existing speech
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }

      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;
      
      // Configure voice settings
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Find a good voice (prefer English)
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && !voice.name.includes('Google')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('🗣️ Started speaking:', text.substring(0, 50) + '...');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('✅ Finished speaking');
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('❌ Speech error:', event.error);
        resolve();
      };

      // Ensure voices are loaded
      if (voices.length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => {
          speechSynthesis.speak(utterance);
        }, { once: true });
      } else {
        speechSynthesis.speak(utterance);
      }
    });
  };

  // Real-time audio level monitoring
  const startAudioMonitoring = async () => {
    try {
      console.log('🎤 Starting real-time audio monitoring...');
      
      // First, list all available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log('🎤 Available audio input devices:', audioInputs);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      streamRef.current = stream;
      
      // Show detailed info about the selected track
      const track = stream.getAudioTracks()[0];
      console.log('🎵 Using audio track:', {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings(),
        capabilities: track.getCapabilities ? track.getCapabilities() : 'Not supported'
      });
      
      showStatus(`🎤 Using: ${track.label || 'Default microphone'}`);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.1;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsMonitoring(true);
      
      const monitorLevels = () => {
        if (!analyserRef.current || !isMonitoring) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const peak = Math.max(...dataArray);
        
        // Also try time domain
        const timeArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeArray);
        const rms = Math.sqrt(timeArray.reduce((sum, value) => sum + Math.pow((value - 128) / 128, 2), 0) / timeArray.length);
        
        const level = Math.max(average, peak, rms * 100);
        setAudioLevel(level);
        
        // Log if we detect any activity
        if (level > 1) {
          console.log('🔊 Audio detected:', { average: Math.round(average), peak: Math.round(peak), rms: Math.round(rms * 100) });
        }
        
        animationFrameRef.current = requestAnimationFrame(monitorLevels);
      };
      
      monitorLevels();
      
    } catch (err) {
      console.error('❌ Failed to start audio monitoring:', err);
      showStatus(`❌ Audio monitoring failed: ${err.message}`);
    }
  };

  const diagnoseAudioIssues = async () => {
    showStatus('🔍 Running audio diagnostics...');
    console.log('🔍 === AUDIO DIAGNOSTICS ===');
    
    try {
      // Check browser support
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasEnumerateDevices = !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
      
      console.log('🌐 Browser support:', {
        getUserMedia: hasGetUserMedia,
        enumerateDevices: hasEnumerateDevices,
        audioContext: !!(window.AudioContext || window.webkitAudioContext)
      });
      
      if (!hasGetUserMedia) {
        showStatus('❌ Browser does not support microphone access');
        return;
      }
      
      // List all devices before permission
      let devicesBefore = [];
      try {
        devicesBefore = await navigator.mediaDevices.enumerateDevices();
        console.log('🎤 Devices before permission:', devicesBefore.filter(d => d.kind === 'audioinput'));
      } catch (e) {
        console.log('ℹ️ Cannot list devices before permission');
      }
      
      // Request permission and test each available microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        
        console.log('✅ Permission granted for:', {
          label: track.label,
          deviceId: track.getSettings().deviceId,
          groupId: track.getSettings().groupId,
          settings: track.getSettings()
        });
        
        // List all devices after permission
        const devicesAfter = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devicesAfter.filter(d => d.kind === 'audioinput');
        
        console.log('🎤 Available microphones after permission:');
        audioInputs.forEach((device, index) => {
          console.log(`  ${index + 1}. ${device.label || 'Unnamed'} (ID: ${device.deviceId.slice(0, 8)}...)`);
        });
        
        stream.getTracks().forEach(track => track.stop());
        
        // Show results
        showStatus(`✅ Found ${audioInputs.length} microphones. Using: ${track.label || 'Default'}`);
        
        // Provide system-specific instructions
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) {
          console.log('💡 Windows troubleshooting:');
          console.log('1. Right-click speaker icon → Sounds → Recording');
          console.log('2. Check if your microphone is set as default');
          console.log('3. Right-click microphone → Properties → Levels → Set to 70-100%');
          console.log('4. Check "Listen to this device" to hear if it\'s working');
        } else if (platform.includes('mac')) {
          console.log('💡 macOS troubleshooting:');
          console.log('1. System Preferences → Sound → Input');
          console.log('2. Select your microphone and check input level');
          console.log('3. Speak and watch the input level meter');
        }
        
      } catch (permErr) {
        console.error('❌ Permission denied:', permErr);
        showStatus(`❌ Microphone permission denied: ${permErr.message}`);
      }
      
    } catch (err) {
      console.error('❌ Diagnostics failed:', err);
      showStatus(`❌ Diagnostics failed: ${err.message}`);
    }
  };

  const stopAudioMonitoring = () => {
    console.log('🛑 Stopping audio monitoring...');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsMonitoring(false);
    setAudioLevel(0);
    showStatus('🔇 Audio monitoring stopped');
  };

  const processVoiceCommand = async (command) => {
    if (!geminiService.current) {
      console.log('⚠️ Cannot process - Gemini service not available');
      return;
    }

    // Allow file explorer commands even when no editor is open
    const isFileExplorerCommand = command.toLowerCase().includes('open') || 
                                 command.toLowerCase().includes('folder') || 
                                 command.toLowerCase().includes('file') ||
                                 command.toLowerCase().includes('expand') ||
                                 command.toLowerCase().includes('refresh');

    if (!editor && !isFileExplorerCommand) {
      console.log('⚠️ Cannot process - no editor available and not a file explorer command');
      showStatus('❌ Please open a file first or use file explorer commands');
      return;
    }

    // Prevent multiple concurrent processing
    if (isProcessing) {
      console.log('⏳ Already processing a command, skipping...');
      return;
    }

    setIsProcessing(true);
    showStatus(`🤔 Processing: "${command}"`);

    // Get rich editor context
    const context = getEditorContext();
    console.log('📄 Rich editor context:', context);

    try {
      // Process with enhanced Gemini service with retry logic
      let action;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          action = await geminiService.current.processCommand(command, context);
          console.log('🎬 Action to execute:', action);
          break;
        } catch (error) {
          retryCount++;
          console.log(`⚠️ Attempt ${retryCount} failed:`, error.message);
          
          if (retryCount <= maxRetries) {
            showStatus(`🔄 Retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          } else {
            throw error;
          }
        }
      }
      
      // Execute the action
      if (action) {
        await executeAction(action);
      }
    } catch (error) {
      console.error('❌ Error processing voice command after retries:', error);
      
      // More helpful error messages
      let errorMessage = 'Something went wrong';
      if (error.message?.includes('API key')) {
        errorMessage = 'API key issue - check your Gemini configuration';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error - check your connection';
      } else if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded - try again later';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      showStatus(`❌ ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Search functionality with voice navigation
  const performSearch = async (searchText) => {
    if (!editor || !searchText) return;

    const model = editor.getModel();
    const fullText = model.getValue();
    
    // Find all matches
    const results = [];
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    
    while ((match = regex.exec(fullText)) !== null) {
      const position = model.getPositionAt(match.index);
      results.push({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column + match[0].length,
        text: match[0]
      });
      
      // Prevent infinite loop with zero-width matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    // Update search state
    setSearchState({
      query: searchText,
      results: results,
      currentIndex: results.length > 0 ? 0 : -1,
      totalResults: results.length
    });

    if (results.length > 0) {
      // Clear any existing decorations first
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, []);
      
      // Highlight all results
      const decorations = results.map((result, index) => ({
        range: result,
        options: {
          className: index === 0 ? 'current-search-result' : 'search-result',
          isWholeLine: false
        }
      }));
      
      // Store decoration IDs for later cleanup
      searchDecorationsRef.current = editor.deltaDecorations([], decorations);
      
      // Jump to first result
      editor.setPosition({ 
        lineNumber: results[0].startLineNumber, 
        column: results[0].startColumn 
      });
      editor.revealLineInCenter(results[0].startLineNumber);
      
      showStatus(`🔍 Found ${results.length} results for "${searchText}" - showing result 1`);
      
      // Provide voice feedback
      if (!isListening) {
        await speakText(`Found ${results.length} results for ${searchText}. Currently at result 1.`);
      }
    } else {
      // Clear any existing decorations if no results found
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, []);
      
      showStatus(`🔍 No results found for "${searchText}"`);
      if (!isListening) {
        await speakText(`No results found for ${searchText}`);
      }
    }
  };

  // Navigate between search results
  const navigateSearchResults = (direction) => {
    if (searchState.results.length === 0) {
      showStatus('❌ No search results to navigate');
      return;
    }

    let newIndex = searchState.currentIndex;
    
    switch (direction) {
      case 'next':
        newIndex = (searchState.currentIndex + 1) % searchState.results.length;
        break;
      case 'previous':
        newIndex = searchState.currentIndex > 0 ? searchState.currentIndex - 1 : searchState.results.length - 1;
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = searchState.results.length - 1;
        break;
    }

    // Update current index
    setSearchState(prev => ({ ...prev, currentIndex: newIndex }));

    // Jump to the result
    const result = searchState.results[newIndex];
    editor.setPosition({ 
      lineNumber: result.startLineNumber, 
      column: result.startColumn 
    });
    editor.revealLineInCenter(result.startLineNumber);

    // Update decorations to highlight current result
    const decorations = searchState.results.map((res, index) => ({
      range: res,
      options: {
        className: index === newIndex ? 'current-search-result' : 'search-result',
        isWholeLine: false
      }
    }));
    
    // Update decorations properly
    searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, decorations);

    const resultNumber = newIndex + 1;
    showStatus(`🔍 Result ${resultNumber} of ${searchState.totalResults} for "${searchState.query}"`);
    
    // Provide voice feedback
    if (!isListening) {
      speakText(`Result ${resultNumber} of ${searchState.totalResults}`);
         }
   };

  // Clear search results and highlights
  const clearSearchResults = () => {
    if (!editor) return;
    
    // Clear decorations properly using stored IDs
    searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, []);
    
    // Reset search state
    setSearchState({
      query: '',
      results: [],
      currentIndex: -1,
      totalResults: 0
    });
    
    showStatus('🔍 Search results cleared');
    
    if (!isListening) {
      speakText('Search results cleared');
    }
  };

  // File Explorer interactions
  const openFolderDialog = () => {
    if (fileExplorerRef?.current?.selectRootFolder) {
      fileExplorerRef.current.selectRootFolder();
      showStatus('📁 Opening folder dialog');
      if (!isListening) {
        speakText('Opening folder dialog');
      }
    } else {
      showStatus('❌ File explorer not available');
      if (!isListening) {
        speakText('File explorer not available');
      }
    }
  };

  const openFileByName = (fileName) => {
    if (!fileExplorerRef?.current?.findAndOpenFile) {
      showStatus('❌ File explorer not available');
      if (!isListening) {
        speakText('File explorer not available');
      }
      return;
    }

    // This will need to be implemented in FileExplorer
    const found = fileExplorerRef.current.findAndOpenFile(fileName);
    
    if (found) {
      showStatus(`📄 Opened ${fileName}`);
      if (!isListening) {
        speakText(`Opened ${fileName}`);
      }
    } else {
      showStatus(`❌ File "${fileName}" not found`);
      if (!isListening) {
        speakText(`File ${fileName} not found`);
      }
    }
  };

  const expandDirectoryByName = async (directoryName) => {
    if (!fileExplorerRef?.current?.expandDirectoryByName) {
      showStatus('❌ File explorer not available');
      if (!isListening) {
        speakText('File explorer not available');
      }
      return;
    }

    try {
      const found = await fileExplorerRef.current.expandDirectoryByName(directoryName);
      
      if (found) {
        showStatus(`📁 Expanded ${directoryName} directory`);
        if (!isListening) {
          speakText(`Expanded ${directoryName} directory`);
        }
      } else {
        showStatus(`❌ Directory "${directoryName}" not found`);
        if (!isListening) {
          speakText(`Directory ${directoryName} not found`);
        }
      }
    } catch (error) {
      console.error('Error expanding directory:', error);
      showStatus(`❌ Error expanding ${directoryName} directory`);
      if (!isListening) {
        speakText(`Error expanding ${directoryName} directory`);
      }
    }
  };

  const refreshFileExplorer = () => {
    if (fileExplorerRef?.current?.refreshFileTree) {
      fileExplorerRef.current.refreshFileTree();
      showStatus('🔄 Refreshing file explorer');
      if (!isListening) {
        speakText('Refreshing file explorer');
      }
    } else {
      showStatus('❌ File explorer not available');
      if (!isListening) {
        speakText('File explorer not available');
      }
    }
  };

  const executeAction = async (action) => {
    if (!editor) return;

    switch (action.action) {
      case 'voiceResponse':
        // Handle voice-only responses
        showStatus(`🗣️ ${action.response.substring(0, 50)}...`);
        // Disable local TTS when VAPI is active to prevent feedback loops
        if (action.shouldSpeak && !isListening) {
          await speakText(action.response);
        } else if (isListening) {
          console.log('🔇 Skipping TTS - VAPI is active (preventing feedback loop)');
        }
        break;

      case 'goToLine':
        editor.setPosition({ lineNumber: action.line, column: 1 });
        editor.revealLineInCenter(action.line);
        showStatus(`📍 Moved to line ${action.line}`);
        break;

      case 'goToTop':
        editor.setPosition({ lineNumber: 1, column: 1 });
        editor.revealLineInCenter(1);
        showStatus('⬆️ Moved to top');
        break;

      case 'goToBottom':
        const model = editor.getModel();
        const lastLine = model.getLineCount();
        editor.setPosition({ lineNumber: lastLine, column: 1 });
        editor.revealLineInCenter(lastLine);
        showStatus('⬇️ Moved to bottom');
        break;

      case 'findText':
        await performSearch(action.searchText);
        break;

      case 'insertCode':
        const insertLine = action.line || editor.getPosition().lineNumber;
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: insertLine,
            startColumn: 1,
            endLineNumber: insertLine,
            endColumn: 1
          },
          text: action.code + '\n'
        }]);
        showStatus(`✅ ${action.description || 'Code inserted'}`);
        break;

      case 'deleteLines':
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: action.startLine,
            startColumn: 1,
            endLineNumber: action.endLine + 1,
            endColumn: 1
          },
          text: ''
        }]);
        showStatus(`🗑️ Deleted lines ${action.startLine}-${action.endLine}`);
        break;

      case 'replaceCode':
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: action.startLine,
            startColumn: 1,
            endLineNumber: action.endLine,
            endColumn: editor.getModel().getLineMaxColumn(action.endLine)
          },
          text: action.newCode
        }]);
        showStatus(`🔄 ${action.description || 'Code replaced'}`);
        break;

      // Precise cursor movement
      case 'moveCursor':
        const currentPos = editor.getPosition();
        let newPos = { ...currentPos };
        
        switch (action.direction) {
          case 'up':
            newPos.lineNumber = Math.max(1, currentPos.lineNumber - (action.count || 1));
            break;
          case 'down':
            newPos.lineNumber = Math.min(editor.getModel().getLineCount(), currentPos.lineNumber + (action.count || 1));
            break;
          case 'left':
            newPos.column = Math.max(1, currentPos.column - (action.count || 1));
            break;
          case 'right':
            newPos.column = currentPos.column + (action.count || 1);
            break;
          case 'start':
            newPos.column = 1;
            break;
          case 'end':
            newPos.column = editor.getModel().getLineMaxColumn(currentPos.lineNumber);
            break;
        }
        
        editor.setPosition(newPos);
        showStatus(`↔️ ${action.description || 'Cursor moved'}`);
        break;

      // Indentation control
      case 'indent':
        const indentStart = action.startLine || editor.getPosition().lineNumber;
        const indentEnd = action.endLine || indentStart;
        const indentLevels = action.levels || 1;
        const indentString = '    '.repeat(indentLevels); // 4 spaces per level
        
        for (let line = indentStart; line <= indentEnd; line++) {
          editor.executeEdits('voice-assistant', [{
            range: {
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: 1
            },
            text: indentString
          }]);
        }
        showStatus(`➡️ Indented ${indentEnd - indentStart + 1} line(s)`);
        break;

      case 'outdent':
        const outdentStart = action.startLine || editor.getPosition().lineNumber;
        const outdentEnd = action.endLine || outdentStart;
        const outdentLevels = action.levels || 1;
        const spacesToRemove = 4 * outdentLevels;
        
        for (let line = outdentStart; line <= outdentEnd; line++) {
          const lineContent = editor.getModel().getLineContent(line);
          const leadingSpaces = lineContent.match(/^ */)[0].length;
          const toRemove = Math.min(spacesToRemove, leadingSpaces);
          
          if (toRemove > 0) {
            editor.executeEdits('voice-assistant', [{
              range: {
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: toRemove + 1
              },
              text: ''
            }]);
          }
        }
        showStatus(`⬅️ Outdented ${outdentEnd - outdentStart + 1} line(s)`);
        break;

      // Insert at specific line
      case 'insertAt':
        const targetLine = action.line || editor.getPosition().lineNumber;
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: targetLine,
            startColumn: 1,
            endLineNumber: targetLine,
            endColumn: 1
          },
          text: action.code + '\n'
        }]);
        showStatus(`📝 ${action.description || 'Code inserted at line ' + targetLine}`);
        break;

      // Add new line
      case 'addNewLine':
        const baseLine = action.line || editor.getPosition().lineNumber;
        const newLinePosition = action.position === 'before' ? baseLine : baseLine + 1;
        
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: newLinePosition,
            startColumn: 1,
            endLineNumber: newLinePosition,
            endColumn: 1
          },
          text: '\n'
        }]);
        
        // Move cursor to the new line
        editor.setPosition({ lineNumber: newLinePosition, column: 1 });
        showStatus(`📄 Added new line ${action.position || 'after'} line ${baseLine}`);
        break;

      // Format code
      case 'formatCode':
        editor.getAction('editor.action.formatDocument').run();
        showStatus('🎨 Code formatted');
        break;

      // Move lines (basic implementation)
      case 'moveLines':
        showStatus('📋 Line moving - feature coming soon!');
        break;

      // Undo/Redo (can be triggered from edit category too)
      case 'undo':
        if (editor.getModel().canUndo()) {
          editor.trigger('voice-assistant', 'undo', null);
          showStatus('↩️ Undid last action');
          if (!isListening) {
            speakText('Undid last action');
          }
        } else {
          showStatus('❌ Nothing to undo');
          if (!isListening) {
            speakText('Nothing to undo');
          }
        }
        break;

      case 'redo':
        if (editor.getModel().canRedo()) {
          editor.trigger('voice-assistant', 'redo', null);
          showStatus('↪️ Redid last action');
          if (!isListening) {
            speakText('Redid last action');
          }
        } else {
          showStatus('❌ Nothing to redo');
          if (!isListening) {
            speakText('Nothing to redo');
          }
        }
        break;

      // Search navigation
      case 'nextSearchResult':
        navigateSearchResults('next');
        break;

      case 'previousSearchResult':
        navigateSearchResults('previous');
        break;

      case 'firstSearchResult':
        navigateSearchResults('first');
        break;

      case 'lastSearchResult':
        navigateSearchResults('last');
        break;

      case 'clearSearch':
        clearSearchResults();
        break;

      // File Explorer operations
      case 'openFolder':
        openFolderDialog();
        break;

      case 'openFile':
        if (action.fileName) {
          openFileByName(action.fileName);
        } else {
          showStatus('❌ No filename specified');
          if (!isListening) {
            speakText('No filename specified');
          }
        }
        break;

      case 'expandDirectory':
        if (action.directoryName) {
          await expandDirectoryByName(action.directoryName);
        } else {
          showStatus('❌ No directory name specified');
          if (!isListening) {
            speakText('No directory name specified');
          }
        }
        break;

      case 'refreshExplorer':
        refreshFileExplorer();
        break;

      // Undo/Redo functionality
      case 'undo':
        if (editor.getModel().canUndo()) {
          editor.trigger('voice-assistant', 'undo', null);
          showStatus('↩️ Undid last action');
          if (!isListening) {
            speakText('Undid last action');
          }
        } else {
          showStatus('❌ Nothing to undo');
          if (!isListening) {
            speakText('Nothing to undo');
          }
        }
        break;

      case 'redo':
        if (editor.getModel().canRedo()) {
          editor.trigger('voice-assistant', 'redo', null);
          showStatus('↪️ Redid last action');
          if (!isListening) {
            speakText('Redid last action');
          }
        } else {
          showStatus('❌ Nothing to redo');
          if (!isListening) {
            speakText('Nothing to redo');
          }
        }
        break;

      case 'error':
        showStatus(`❌ Error: ${action.message}`);
        break;

      default:
        showStatus(`❓ Unknown action: ${action.action}`);
    }

    // Focus editor after any action
    if (action.action !== 'voiceResponse') {
      editor.focus();
    }
  };

  const handleMicClick = () => {
    if (!vapiKey) {
      alert('Please configure your VAPI public key in src/config/voiceAssistant.js');
      return;
    }
    
    if (!assistantId || assistantId === 'YOUR_ASSISTANT_ID_HERE') {
      alert('Please create an assistant at https://dashboard.vapi.ai and add the assistant ID to src/config/voiceAssistant.js');
      return;
    }
    
    if (!geminiKey) {
      alert('Please configure your Gemini API key in src/config/voiceAssistant.js');
      return;
    }
    
    // Get editor context and pass it to VAPI
    const editorContext = getEditorContext();
    toggleListening(editorContext);
  };

  const testMicrophone = async () => {
    showStatus('Testing microphone...');
    const result = await testAudioCapture();
    if (result) {
      showStatus('✅ Microphone is working! Try the voice assistant now.');
    } else {
      showStatus('❌ Microphone test failed. Check permissions and hardware.');
    }
  };

  const toggleAudioMonitoring = () => {
    if (isMonitoring) {
      stopAudioMonitoring();
    } else {
      startAudioMonitoring();
    }
  };

  // Stop speaking if needed
  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      showStatus('🤐 Stopped speaking');
    }
  };

  return (
    <div className="voice-assistant">
      <button 
        className={`mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleMicClick}
        title={isListening ? 'Stop listening' : isProcessing ? 'Processing command...' : 'Start voice command'}
        disabled={isProcessing}
        style={{
          backgroundColor: isListening ? '#4CAF50' : isSpeaking ? '#FF9800' : isProcessing ? '#2196F3' : '#333',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          animation: isListening ? 'pulse 1.5s infinite' : isSpeaking ? 'glow 2s infinite' : isProcessing ? 'spin 1s linear infinite' : 'none',
          opacity: isProcessing ? 0.8 : 1
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          {isSpeaking ? (
            // Speaker icon when speaking
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          ) : (
            // Microphone icon when listening/idle
            <>
              <path d="M12 14.5C13.66 14.5 15 13.16 15 11.5V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V11.5C9 13.16 10.34 14.5 12 14.5Z" />
              <path d="M17 11.5C17 14.53 14.53 17 11.5 17C8.47 17 6 14.53 6 11.5H4C4 15.24 6.89 18.35 10.5 18.92V22H13.5V18.92C17.11 18.35 20 15.24 20 11.5H17Z" />
            </>
          )}
        </svg>
      </button>

      {/* Stop speaking button when speaking */}
      {isSpeaking && (
        <button 
          onClick={stopSpeaking}
          title="Stop speaking"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            padding: '8px 12px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          🤐 Stop
        </button>
      )}

      {/* Audio Level Monitor Button */}
      <button 
        onClick={toggleAudioMonitoring}
        title={isMonitoring ? 'Stop audio monitoring' : 'Start audio monitoring'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '180px',
          padding: '10px',
          backgroundColor: isMonitoring ? '#FF5722' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        {isMonitoring ? 'Stop Monitor' : 'Monitor Audio'}
      </button>

      {/* Simple test button */}
      <button 
        onClick={testMicrophone}
        title="Test microphone"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '100px',
          padding: '10px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Test Mic
      </button>

      {/* Audio Level Display */}
      {isMonitoring && (
        <div style={{
          position: 'fixed',
          bottom: '160px',
          right: '20px',
          backgroundColor: '#333',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '14px',
          minWidth: '200px'
        }}>
          <div>Audio Level: {Math.round(audioLevel)}</div>
          <div style={{
            width: '180px',
            height: '20px',
            backgroundColor: '#666',
            borderRadius: '10px',
            margin: '5px 0'
          }}>
            <div style={{
              width: `${Math.min(audioLevel * 2, 100)}%`,
              height: '100%',
              backgroundColor: audioLevel > 10 ? '#4CAF50' : audioLevel > 5 ? '#FF9800' : '#666',
              borderRadius: '10px',
              transition: 'all 0.1s ease'
            }}></div>
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>
            {audioLevel > 10 ? '🔊 Good signal' : audioLevel > 5 ? '⚠️ Weak signal' : '🔇 No signal'}
          </div>
        </div>
      )}
      
      {/* Search results indicator */}
      {searchState.totalResults > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '180px',
          right: '20px',
          backgroundColor: '#ff9800',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid #f57c00'
        }}>
          🔍 Search: "{searchState.query}" ({searchState.currentIndex + 1}/{searchState.totalResults})
        </div>
      )}

      {status && (
        <div className="status-bar" style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          backgroundColor: '#333',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {status}
        </div>
      )}
      
      {error && (
        <div className="error-bar" style={{
          position: 'fixed',
          bottom: '140px',
          right: '20px',
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {error}
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 4px 20px rgba(255, 152, 0, 0.5); }
          100% { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistant; 