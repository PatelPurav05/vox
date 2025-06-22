class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  }

  async determineActionType(transcript, editorContext) {
    console.log('🧠 Determining action type for:', transcript);
    
    try {
      const prompt = `
You are an AI assistant that determines what type of action a user wants to perform.

User command: "${transcript}"

Current editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}  
- Current line: ${editorContext.cursorLine}
- Total lines: ${editorContext.totalLines}
- Current content: ${editorContext.currentContent ? editorContext.currentContent.substring(0, 1000) : 'N/A'}
- Selected text: ${editorContext.selectedText || 'None'}

Analyze the user's command and determine the action type. Return ONLY a JSON object with this structure:
{
  "actionType": "code_action" | "conversation" | "navigation" | "edit" | "question",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Action types:
- "code_action": Writing, creating, or generating new code
- "edit": Modifying existing code (delete, replace, refactor)
- "navigation": Moving around the editor (go to line, find, scroll)
- "question": Asking about code, concepts, or getting explanations
- "conversation": General chat not related to coding

Examples:
- "create a function that adds two numbers" → {"actionType": "code_action", "confidence": 0.95, "reasoning": "User wants to create new code"}
- "delete line 10" → {"actionType": "edit", "confidence": 0.98, "reasoning": "User wants to modify existing code"}
- "go to line 42" → {"actionType": "navigation", "confidence": 0.99, "reasoning": "User wants to navigate in editor"}
- "what does this function do?" → {"actionType": "question", "confidence": 0.90, "reasoning": "User is asking about code"}
- "how are you today?" → {"actionType": "conversation", "confidence": 0.85, "reasoning": "General conversation"}

Return ONLY the JSON object.`;

      const response = await this.callGeminiAPI(prompt);
      const actionType = this.parseJsonResponse(response);
      
      console.log('🎯 Action type determined:', actionType);
      return actionType;
    } catch (error) {
      console.error('❌ Error determining action type:', error);
      return { actionType: 'conversation', confidence: 0.1, reasoning: 'Error in analysis' };
    }
  }

  async processCodeAction(transcript, editorContext) {
    console.log('💻 Processing code action:', transcript);
    
    const prompt = `
You are a code generation assistant. Create code based on the user's request.

User request: "${transcript}"

Editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}
- Current line: ${editorContext.cursorLine}
- Total lines: ${editorContext.totalLines}
- Current content: ${editorContext.currentContent ? editorContext.currentContent.substring(0, 2000) : 'N/A'}
- Selected text: ${editorContext.selectedText || 'None'}

Generate appropriate code and return a JSON object:
{
  "action": "insertCode" | "createFunction" | "createClass" | "createComponent",
  "code": "the generated code",
  "line": line_number_to_insert,
  "description": "brief description of what was created"
}

Important:
- Write clean, production-ready code
- Follow best practices for the language
- Add appropriate comments
- Consider the existing context
- Use proper indentation and formatting

Return ONLY the JSON object.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('🔧 Code action generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating code action:', error);
      return { action: 'error', message: 'Failed to generate code' };
    }
  }

  async processEditAction(transcript, editorContext) {
    console.log('✏️ Processing edit action:', transcript);
    
    const prompt = `
You are a code editing assistant. Modify existing code based on the user's request.

User request: "${transcript}"

Editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}
- Current line: ${editorContext.cursorLine}
- Total lines: ${editorContext.totalLines}
- Current content: ${editorContext.currentContent ? editorContext.currentContent.substring(0, 2000) : 'N/A'}
- Selected text: ${editorContext.selectedText || 'None'}

Determine the edit action and return a JSON object:
{
  "action": "deleteLines" | "replaceCode" | "refactor" | "insertAt",
  "startLine": start_line_number,
  "endLine": end_line_number,
  "newCode": "replacement code if applicable",
  "description": "brief description of the edit"
}

For line operations:
- If deleting: just provide startLine and endLine
- If replacing: provide startLine, endLine, and newCode
- If inserting: provide line and newCode

Return ONLY the JSON object.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('📝 Edit action generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating edit action:', error);
      return { action: 'error', message: 'Failed to process edit' };
    }
  }

  async processNavigationAction(transcript, editorContext) {
    console.log('🧭 Processing navigation action:', transcript);
    
    const prompt = `
You are a navigation assistant. Help users move around in their code editor.

User request: "${transcript}"

Editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}
- Current line: ${editorContext.cursorLine}
- Total lines: ${editorContext.totalLines}
- Current content: ${editorContext.currentContent ? editorContext.currentContent.substring(0, 2000) : 'N/A'}

Parse the navigation request and return a JSON object:
{
  "action": "goToLine" | "findText" | "goToFunction" | "goToTop" | "goToBottom",
  "line": line_number_if_applicable,
  "searchText": "text_to_find_if_applicable",
  "description": "brief description of the navigation"
}

Examples:
- "go to line 42" → {"action": "goToLine", "line": 42}
- "find the function getData" → {"action": "findText", "searchText": "function getData"}
- "go to the top" → {"action": "goToTop"}
- "go to the bottom" → {"action": "goToBottom"}

Return ONLY the JSON object.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('🗺️ Navigation action generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating navigation action:', error);
      return { action: 'error', message: 'Failed to process navigation' };
    }
  }

  async processQuestionAction(transcript, editorContext) {
    console.log('❓ Processing question action:', transcript);
    
    const prompt = `
You are a helpful coding assistant. Answer the user's question about their code or programming concepts.

User question: "${transcript}"

Editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}
- Current line: ${editorContext.cursorLine}
- Current content: ${editorContext.currentContent ? editorContext.currentContent.substring(0, 2000) : 'N/A'}
- Selected text: ${editorContext.selectedText || 'None'}

Provide a helpful, concise answer. Return a JSON object:
{
  "action": "voiceResponse",
  "response": "your helpful answer here",
  "shouldSpeak": true
}

Keep responses:
- Clear and concise
- Technically accurate
- Contextual to their current code
- Friendly and helpful
- Under 200 words for voice delivery

Return ONLY the JSON object.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('💬 Question response generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating question response:', error);
      return { 
        action: 'voiceResponse', 
        response: 'I apologize, but I encountered an error processing your question. Could you please try rephrasing it?',
        shouldSpeak: true 
      };
    }
  }

  async processConversationAction(transcript, editorContext) {
    console.log('💬 Processing conversation action:', transcript);
    
    const prompt = `
You are a friendly AI assistant helping with coding. The user is having a casual conversation.

User message: "${transcript}"

Respond naturally and helpfully. Return a JSON object:
{
  "action": "voiceResponse",
  "response": "your friendly response here",
  "shouldSpeak": true
}

Keep responses:
- Warm and conversational
- Brief (under 100 words for voice)
- Helpful when possible
- Professional but friendly

Return ONLY the JSON object.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('🗣️ Conversation response generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating conversation response:', error);
      return { 
        action: 'voiceResponse', 
        response: 'Hello! I\'m here to help you with coding. What would you like to work on?',
        shouldSpeak: true 
      };
    }
  }

  async processCommand(transcript, editorContext) {
    console.log('🎤 Processing voice command:', transcript);
    console.log('📁 Editor context:', editorContext);
    
    try {
      // First, determine what type of action this is
      const actionType = await this.determineActionType(transcript, editorContext);
      
      // Route to appropriate specialist agent
      switch (actionType.actionType) {
        case 'code_action':
          return await this.processCodeAction(transcript, editorContext);
        
        case 'edit':
          return await this.processEditAction(transcript, editorContext);
        
        case 'navigation':
          return await this.processNavigationAction(transcript, editorContext);
        
        case 'question':
          return await this.processQuestionAction(transcript, editorContext);
        
        case 'conversation':
          return await this.processConversationAction(transcript, editorContext);
        
        default:
          return { 
            action: 'voiceResponse', 
            response: 'I\'m not sure how to help with that. Could you try rephrasing your request?',
            shouldSpeak: true 
          };
      }
    } catch (error) {
      console.error('❌ Error processing command:', error);
      return { 
        action: 'voiceResponse', 
        response: 'I encountered an error processing your request. Please try again.',
        shouldSpeak: true 
      };
    }
  }

  async callGeminiAPI(prompt, retryCount = 0) {
    const maxRetries = 2;
    const timeout = 15000; // 15 seconds

    try {
      console.log(`🔄 Calling Gemini API (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 1024,
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', response.status, errorData);
        
        // Handle specific error codes
        if (response.status === 429 && retryCount < maxRetries) {
          console.log('⏳ Rate limited, retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.callGeminiAPI(prompt, retryCount + 1);
        }
        
        if (response.status === 500 && retryCount < maxRetries) {
          console.log('⏳ Server error, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.callGeminiAPI(prompt, retryCount + 1);
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      return data.candidates[0].content.parts[0].text;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Gemini API timeout');
        throw new Error('Request timed out - please try again');
      }
      
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying API call (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.callGeminiAPI(prompt, retryCount + 1);
      }
      
      throw error;
    }
  }

  parseJsonResponse(text) {
    try {
      console.log('🔍 Parsing response:', text.substring(0, 200) + '...');
      
      // Clean the text first
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON in the response
      const jsonMatches = [
        cleanText.match(/\{[\s\S]*\}/), // Standard JSON
        cleanText.match(/\[[\s\S]*\]/), // Array JSON
      ].filter(Boolean);
      
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match[0]);
          console.log('✅ Successfully parsed JSON:', parsed);
          return parsed;
        } catch (e) {
          console.log('⚠️ Failed to parse match:', match[0]);
          continue;
        }
      }
      
      // If no valid JSON found, try to extract from common patterns
      const patterns = [
        /"action":\s*"([^"]+)"/,
        /"response":\s*"([^"]+)"/,
        /"line":\s*(\d+)/
      ];
      
      let fallbackObject = {};
      for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match) {
          if (pattern.source.includes('action')) {
            fallbackObject.action = match[1];
          } else if (pattern.source.includes('response')) {
            fallbackObject.response = match[1];
            fallbackObject.shouldSpeak = true;
          } else if (pattern.source.includes('line')) {
            fallbackObject.line = parseInt(match[1]);
          }
        }
      }
      
      if (Object.keys(fallbackObject).length > 0) {
        console.log('🔧 Using fallback parsing:', fallbackObject);
        return fallbackObject;
      }
      
      throw new Error('No valid JSON or parseable content found');
    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      console.error('Raw text:', text);
      
      // Return a safe fallback
      return {
        action: 'voiceResponse',
        response: 'I had trouble understanding that request. Could you please try rephrasing it?',
        shouldSpeak: true
      };
    }
  }
}

export default GeminiService; 