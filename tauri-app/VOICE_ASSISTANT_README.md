# Voice Assistant for Vox IDE

A simple voice-controlled coding assistant that converts speech to code actions using VAPI AI with **automatic fallback to browser Speech Recognition API** for maximum reliability.

## Setup

### Step 1: Create a VAPI Assistant (Optional)

1. **Go to VAPI Dashboard**: Visit https://dashboard.vapi.ai
2. **Create an Assistant**: Click "Create Assistant" and configure:
   - **Name**: "Coding Assistant" 
   - **Model**: Choose Gemini 2.5 Flash or your preferred model
   - **Voice**: Select a voice provider (11Labs, PlayHT, etc.)
   - **System Message**: 
     ```
     You are a coding assistant. Listen to the user's voice commands about code and respond briefly and helpfully. Keep responses under 30 words.
     ```
3. **Save the Assistant**: Copy the Assistant ID from the dashboard

### Step 2: Configure API Keys

1. Copy `src/config/voiceAssistant.example.js` to `src/config/voiceAssistant.js`
2. Update the configuration:
   ```javascript
   export const voiceAssistantConfig = {
     vapi: {
       publicKey: 'your_vapi_public_key',     // From VAPI Dashboard
       assistantId: 'your_assistant_id'       // From Step 1 (optional)
     },
     gemini: {
       apiKey: 'your_gemini_api_key'          // For code processing (required)
     }
   };
   ```

### Required API Keys:
- **VAPI Public Key**: Get from https://dashboard.vapi.ai (optional)
- **Assistant ID**: Created in Step 1 above (optional)
- **Gemini API Key**: Get from https://makersuite.google.com/app/apikey (required)

**Note**: If VAPI setup fails, the system automatically falls back to browser Speech Recognition API.

## How it Works

### **Dual-Mode Speech Recognition:**

#### **Primary Mode (VAPI):**
1. Click the microphone button → Green button indicates VAPI mode
2. Speak your command (e.g., "Go to line 15", "Create function hello")
3. VAPI processes speech + provides voice responses
4. Gemini processes the command and performs editor actions

#### **Fallback Mode (Browser Speech API):**
1. If microphone levels are too low → Automatically switches to Speech API
2. Orange button with "API" badge indicates fallback mode
3. Browser handles speech recognition (no voice responses)
4. Gemini still processes commands and performs editor actions

## Supported Commands

- **"Go to line [number]"** - Moves cursor to specified line
- **"Create function [name]"** - Creates a new function
- **"Delete line [number]"** - Deletes the specified line  
- **"Insert [description]"** - Inserts code at current position

## Smart Fallback System

The voice assistant automatically handles microphone issues:

```
🎤 Low microphone levels detected
     ↓
🔄 Falling back to Web Speech API
     ↓
🎤 Using Browser Speech Recognition (Fallback Mode)
```

**Visual Indicators:**
- **Green Button**: VAPI mode (with voice responses)
- **Orange Button + "API" badge**: Browser Speech API mode
- **Status Messages**: Clear indication of current mode

## Troubleshooting

### **No Speech Detected / Microphone Issues**

**The system now auto-handles most microphone problems**, but you can also:

1. **Use Debug Tools**:
   - 🔍 **System Check**: Verify browser audio support
   - 🧪 **Microphone Test**: Test audio levels and detection
   - **Device Selector**: Switch between multiple microphones

2. **Manual Fixes**:
   - **Browser**: Reset microphone permissions (🔒 in address bar)
   - **System**: Check Windows/Mac microphone levels (70-100%)
   - **Hardware**: Try different microphone or USB port

### **Mode Indicators**

| Indicator | Mode | Features |
|-----------|------|----------|
| 🟢 Green Button | VAPI | Voice responses + speech recognition |
| 🟠 Orange Button + "API" | Browser API | Speech recognition only |
| ❌ Red Error | Failed | Check microphone permissions |

### **When Browser Speech API is Used**

The system automatically switches to Speech API when:
- Microphone audio levels are too low for VAPI
- VAPI connection fails
- Hardware doesn't meet VAPI requirements

**This ensures the voice assistant always works**, even with problematic microphones.

## Browser Compatibility

### **VAPI Mode:**
- Chrome, Firefox, Edge, Safari (with good microphone)

### **Browser Speech API Mode:**
- Chrome ✅ (best support)
- Edge ✅ 
- Safari ✅
- Firefox ⚠️ (limited support)

## Architecture

```
User Speech → [VAPI Assistant OR Browser Speech API] → Transcript → Gemini → Editor Action
                     ↓                    ↓
              Voice Response        Silent Processing
```

## Files

- `hooks/useVapi.js` - Dual-mode speech recognition with automatic fallback
- `services/geminiService.js` - Gemini AI for command processing  
- `components/VoiceAssistant.jsx` - UI with mode indicators
- `components/VoiceAssistant.css` - Styling
- `config/voiceAssistant.js` - API keys configuration

## Creating Better Assistants

For VAPI mode (when working), configure your assistant with:

1. **Clear Instructions**: Specific system messages for coding
2. **Fast Model**: Gemini 2.5 Flash for quick responses
3. **Good Voice**: Choose clear, natural voice
4. **Tools/Functions**: Add custom coding tools if needed

## Current Status

- ✅ **Automatic fallback system** - Always works regardless of hardware
- ✅ **Dual-mode speech recognition** (VAPI + Browser API)
- ✅ **Smart microphone debugging** tools
- ✅ **Visual mode indicators**
- ✅ **Speech-to-text working** (guaranteed)
- ✅ **Command processing** with Gemini
- ✅ **Editor integration**
- ✅ **Voice responses** (VAPI mode only)
- ⏳ **Advanced voice commands** (future enhancement) 