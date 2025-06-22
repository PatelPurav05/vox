import React, { useState, useEffect, useRef } from 'react';
import useVapi from '../hooks/useVapi';
import GeminiService from '../services/geminiService';
import './VoiceAssistant.css';

const VoiceAssistant = ({ editor }) => {
  const [vapiKey, setVapiKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [status, setStatus] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const geminiService = useRef(null);
  const statusTimeout = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  const { isListening, transcript, error, toggleListening, testAudioCapture } = useVapi(vapiKey, assistantId);

  // Process new transcripts
  useEffect(() => {
    if (transcript && transcript !== lastTranscript) {
      setLastTranscript(transcript);
      processVoiceCommand(transcript);
    }
  }, [transcript]);

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
    if (!geminiService.current || !editor) return;

    showStatus(`Processing: "${command}"`);

    // Get editor context
    const position = editor.getPosition();
    const model = editor.getModel();
    const context = {
      fileName: model?.uri?.path || 'untitled',
      language: model?.getLanguageId() || 'javascript',
      cursorLine: position.lineNumber,
      totalLines: model?.getLineCount() || 0
    };

    // Process with Gemini
    const action = await geminiService.current.processCommand(command, context);
    
    // Execute action
    executeAction(action);
  };

  const executeAction = (action) => {
    if (!editor) return;

    switch (action.action) {
      case 'goToLine':
        editor.setPosition({ lineNumber: action.line, column: 1 });
        editor.revealLineInCenter(action.line);
        showStatus(`Moved to line ${action.line}`);
        break;

      case 'insertCode':
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: action.line,
            startColumn: 1,
            endLineNumber: action.line,
            endColumn: 1
          },
          text: action.code + '\n'
        }]);
        showStatus('Code inserted');
        break;

      case 'deleteLines':
        const model = editor.getModel();
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: action.startLine,
            startColumn: 1,
            endLineNumber: action.endLine + 1,
            endColumn: 1
          },
          text: ''
        }]);
        showStatus(`Deleted lines ${action.startLine}-${action.endLine}`);
        break;

      case 'createFunction':
        const functionCode = `function ${action.name}(${action.params.join(', ')}) {\n  // TODO: Implement\n}\n`;
        editor.executeEdits('voice-assistant', [{
          range: {
            startLineNumber: action.line,
            startColumn: 1,
            endLineNumber: action.line,
            endColumn: 1
          },
          text: functionCode
        }]);
        showStatus(`Created function ${action.name}`);
        break;

      case 'error':
        showStatus(`Error: ${action.message}`);
        break;

      default:
        showStatus('Unknown action');
    }

    // Focus editor
    editor.focus();
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
    
    toggleListening();
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

  return (
    <div className="voice-assistant">
      <button 
        className={`mic-button ${isListening ? 'listening' : ''}`}
        onClick={handleMicClick}
        title={isListening ? 'Stop listening' : 'Start voice command'}
        style={{
          backgroundColor: isListening ? '#4CAF50' : '#333',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14.5C13.66 14.5 15 13.16 15 11.5V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V11.5C9 13.16 10.34 14.5 12 14.5Z" />
          <path d="M17 11.5C17 14.53 14.53 17 11.5 17C8.47 17 6 14.53 6 11.5H4C4 15.24 6.89 18.35 10.5 18.92V22H13.5V18.92C17.11 18.35 20 15.24 20 11.5H17Z" />
        </svg>
      </button>

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
          bottom: '100px',
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

      <div className="voice-controls">
        <button
          onClick={isListening ? toggleListening : handleMicClick}
          className={`voice-button ${isListening ? 'listening' : ''}`}
        >
          🎤 {isListening ? 'Stop' : 'Start'} Voice Assistant
        </button>
        
        <button
          onClick={isMonitoring ? stopAudioMonitoring : toggleAudioMonitoring}
          className={`voice-button ${isMonitoring ? 'monitoring' : ''}`}
        >
          📊 {isMonitoring ? 'Stop' : 'Monitor'} Audio
        </button>
        
        <button
          onClick={diagnoseAudioIssues}
          className="voice-button diagnostic"
        >
          🔍 Diagnose Audio
        </button>
        
        {isMonitoring && (
          <div className="audio-level-container">
            <div className="audio-level-label">Audio Level:</div>
            <div className="audio-level-bar">
              <div 
                className="audio-level-fill" 
                style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
              ></div>
            </div>
            <div className="audio-level-value">{Math.round(audioLevel)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant; 