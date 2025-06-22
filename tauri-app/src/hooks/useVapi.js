import { useEffect, useRef, useState, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

const useVapi = (publicKey, assistantId) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const vapiRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    if (!publicKey) return;

    try {
      // Initialize VAPI with public key only
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      // Listen for call events
      vapi.on('call-start', () => {
        console.log('✅ VAPI call started');
        setIsListening(true);
        setError(null);
      });

      vapi.on('call-end', () => {
        console.log('🛑 VAPI call ended');
        setIsListening(false);
      });

      // Handle messages (including transcripts)
      vapi.on('message', (message) => {
        console.log('📨 VAPI message:', message);
        
        if (message.type === 'transcript') {
          if (message.role === 'user') {
            console.log('👤 User said:', message.transcript);
            setTranscript(message.transcript);
          } else if (message.role === 'assistant') {
            console.log('🤖 Assistant said:', message.transcript);
          }
        }
        
        // Log other important events
        if (message.type === 'speech-update') {
          console.log('🗣️ Speech update:', message.status, message.role);
        }

        if (message.type === 'status-update') {
          console.log('📊 Status:', message.status);
          if (message.status === 'ended') {
            console.log('🔚 Call ended reason:', message.endedReason);
            if (message.endedReason === 'silence-timed-out') {
              setError('No speech detected - try speaking louder or closer to microphone');
            }
          }
        }
      });

      // Handle errors
      vapi.on('error', (e) => {
        console.error('❌ VAPI error:', e);
        setError('Voice connection error - check network and try again');
        setIsListening(false);
      });

    } catch (err) {
      console.error('❌ Failed to initialize VAPI:', err);
      setError('Failed to initialize voice assistant');
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [publicKey]);

  // Simple audio capture test
  const testAudioCapture = async () => {
    try {
      console.log('🎤 Testing audio capture...');
      
      // Request microphone with simple constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Audio stream obtained');
      
      // Check if we have active audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks in stream');
      }
      
      const track = audioTracks[0];
      console.log('🎵 Audio track info:', {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      });
      
      // Clean up test stream
      stream.getTracks().forEach(t => t.stop());
      
      return true;
    } catch (err) {
      console.error('❌ Audio capture test failed:', err);
      setError(`Microphone error: ${err.message}`);
      return false;
    }
  };

  const toggleListening = async (editorContext = null) => {
    if (!assistantId) {
      setError('Assistant ID not configured - add your VAPI assistant ID to config');
      return;
    }

    if (!vapiRef.current) {
      setError('VAPI not initialized - check your public key');
      return;
    }

    try {
      if (isListening) {
        // Stop the call
        console.log('🛑 Stopping VAPI call...');
        await vapiRef.current.stop();
        
        // Clean up audio stream if we have one
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      } else {
        // Test audio capture first
        const audioOk = await testAudioCapture();
        if (!audioOk) {
          return;
        }

        console.log('🚀 Starting VAPI call...');
        console.log('📞 Assistant ID:', assistantId);
        
        // Log the context for debugging but don't pass it to VAPI yet
        // (We'll handle context in the Gemini processing instead)
        if (editorContext) {
          console.log('📝 Editor context available:', editorContext);
        }
        
        // Start VAPI call - back to the working approach
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      console.error('❌ Error toggling voice:', err);
      
      let errorMessage = 'Failed to start voice assistant';
      
      // Handle specific VAPI errors
      if (err.message?.includes('400')) {
        errorMessage = 'Invalid assistant configuration - check your assistant ID';
      } else if (err.message?.includes('401')) {
        errorMessage = 'Authentication failed - check your VAPI public key';
      } else if (err.message?.includes('403')) {
        errorMessage = 'Access denied - verify your VAPI account permissions';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error - check your internet connection';
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied - allow microphone access';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found - check your audio devices';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone in use by another application';
      }
      
      setError(errorMessage);
      setIsListening(false);
    }
  };

  return {
    isListening,
    transcript,
    error,
    toggleListening,
    testAudioCapture
  };
};

export default useVapi; 