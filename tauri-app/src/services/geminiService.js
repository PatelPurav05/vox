class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }
 
 
  // Focused action type determination - do what the user asks
  async determineActionType(transcript, editorContext) {
    console.log('🧠 Determining action type for:', transcript);
   
    try {
      const prompt = `
      Given the users natural language extract their request into one of the categories below.
  User command: "${transcript}"
 
 
 Context:
 - File: ${editorContext.fileName} (${editorContext.language})
 - Line: ${editorContext.cursorLine}/${editorContext.totalLines}
 - Selected: ${editorContext.selectedText || 'None'}
 
 
 Return ONLY this JSON:
 {
  "actionType": "code_action" | "edit" | "navigation" | "format" | "question" | "conversation",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
 }
 
 
 Categories:
 - code_action: Add/create code (write function, add variable, insert code)
 - edit: Modify existing code (delete, replace, fix, change) 
 - navigation: Move cursor, go to line, find text, open files/folders, file explorer operations, TERMINAL COMMANDS (open terminal, run commands, execute, ls, npm, git, python, etc.)
 - format: Indent, outdent, reformat, organize
 - question: Ask about code or explain something
 - conversation: General chat
 
 
 IMPORTANT: Any request involving terminal commands, running system commands, or executing programs should be "navigation" NOT "conversation".
 
 
 ${editorContext.hasEditor ? '' : 'NOTE: No editor is currently open - prioritize file explorer operations (navigation category).'}
 
 
 Be precise - do what the user asks, nothing more.`;
 
 
      const response = await this.callGeminiAPI(prompt);
      const actionType = this.parseSimpleJsonResponse(response);
     
      console.log('🎯 Action type determined:', actionType);
      return actionType;
    } catch (error) {
      console.error('❌ Error determining action type:', error);
      return { actionType: 'conversation', confidence: 0.1, reasoning: 'Error in analysis' };
    }
  }
 
 
  // Focused code generation - write exactly what's requested
  async processCodeAction(transcript, editorContext) {
    console.log('💻 Processing code action:', transcript);
 
 
   
    // Use Python-specific handler for Python files
   
   
     const prompt = `
  You are a precise natural language to python code generator. Convert the natural language user request to a line in python that is all. dont write anything else.
 
 
 User request: "${transcript}"
 
 
 Context:
 - File: ${editorContext.fileName}
 - Current line: ${editorContext.cursorLine}
 - Current Python code:
 ${editorContext.surroundingContext || 'N/A'}
 
 
 Write clean Python code that does exactly what's requested. Include:
 - Proper indentation (4 spaces)
 
 
 Return JSON:
 {
  "action": "insertCode",
  "code": "the exact Python code requested",
  "line": line_number_or_null,
  "description": "what you created"
 }
 
 
 Examples:
 - "create a function that adds two numbers" → def add(a: int, b: int) -> int: ...
 - "add a variable users equals empty list" → users = []
 - "write a for loop through items" → for item in items:
 
 
 Write exactly what's requested. Don't add extra features unless specifically asked.`;
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
 
 
  // Focused Python code generation
 //   async processPythonCodeAction(transcript, editorContext) {
 //     console.log('🐍 Processing Python code action:', transcript);
   
 //     const prompt = `
 // You are a Python code generator. Write exactly what the user requests.
 
 
 // User request: "${transcript}"
 
 
 // Context:
 // - File: ${editorContext.fileName}
 // - Current line: ${editorContext.cursorLine}
 // - Current Python code:
 // ${editorContext.surroundingContext || 'N/A'}
 
 
 // Write clean Python code that does exactly what's requested. Include:
 // - Proper indentation (4 spaces)
 // - Type hints for functions
 // - Brief docstring for functions/classes
 // - Basic error handling if needed
 
 
 // Return JSON:
 // {
 //   "action": "insertCode",
 //   "code": "the exact Python code requested",
 //   "line": line_number_or_null,
 //   "description": "what you created"
 // }
 
 
 // Examples:
 // - "create a function that adds two numbers" → def add(a: int, b: int) -> int: ...
 // - "add a variable users equals empty list" → users = []
 // - "write a for loop through items" → for item in items:
 
 
 // Write exactly what's requested. Don't add extra features unless specifically asked.`;
 
 
 //     try {
 //       const response = await this.callGeminiAPI(prompt);
 //       const action = this.parseJsonResponse(response);
 //       console.log('🐍 Python code action generated:', action);
 //       return action;
 //     } catch (error) {
 //       console.error('❌ Error generating Python code action:', error);
 //       return { action: 'error', message: 'Failed to generate Python code' };
 //     }
 //   }
 
 
  // Enhanced editing with precise control
  async processEditAction(transcript, editorContext) {
    console.log('✏️ Processing edit action:', transcript);
   
    const prompt = `
 You are a precise code editor. Do exactly what the user requests.
 
 
 User request: "${transcript}"
 
 
 Context:
 - Language: ${editorContext.language}
 - Current line: ${editorContext.cursorLine}
 - Selected text: ${editorContext.selectedText || 'None'}
 - Code around cursor:
 ${editorContext.surroundingContext || 'N/A'}
 
 
 Available actions:
 {
  "action": "deleteLines",
  "startLine": number,
  "endLine": number,
  "description": "what was deleted"
 }
 
 
 {
  "action": "replaceCode",
  "startLine": number,
  "endLine": number,
  "newCode": "replacement code",
  "description": "what was changed"
 }
 
 
 {
  "action": "insertAt",
  "line": number,
  "code": "code to insert",
  "description": "what was added"
 }
 
 
 {
  "action": "moveLines",
  "fromLine": number,
  "toLine": number,
  "description": "moved lines"
 }
 
 
 {
  "action": "undo",
  "description": "undid last change"
 }
 
 
 {
  "action": "redo",
  "description": "redid last change"
 }
 
 
 Examples:
 - "delete line 5" → deleteLines with startLine: 5, endLine: 5
 - "replace this function" → replaceCode with improved version
 - "add a print statement here" → insertAt with print code
 - "undo" → undo last change
 - "redo" → redo last change
 - "undo that" → undo last change
 
 
 Do exactly what's requested.`;
 
 
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
 
 
  // Enhanced navigation with cursor control
  async processNavigationAction(transcript, editorContext) {
    console.log('🧭 Processing navigation action:', transcript);
   
    const prompt = `
 You are a navigation assistant for code editors.
 
 
 User request: "${transcript}"
 
 
 Context:
 - Current line: ${editorContext.cursorLine}/${editorContext.totalLines}
 - File: ${editorContext.fileName}
 
 
 Available actions:
 {
  "action": "goToLine",
  "line": number,
  "description": "moved to line X"
 }
 
 
 {
  "action": "findText",
  "searchText": "text to find",
  "description": "searching for X"
 }
 
 
 {
  "action": "moveCursor",
  "direction": "up|down|left|right|start|end",
  "count": number,
  "description": "cursor movement"
 }
 
 
 {
  "action": "goToTop",
  "description": "moved to top"
 }
 
 
 {
  "action": "goToBottom",
  "description": "moved to bottom"
 }
 
 
 {
  "action": "nextSearchResult",
  "description": "moved to next search result"
 }
 
 
 {
  "action": "previousSearchResult",
  "description": "moved to previous search result"
 }
 
 
 {
  "action": "firstSearchResult",
  "description": "moved to first search result"
 }
 
 
 {
  "action": "lastSearchResult",
  "description": "moved to last search result"
 }
 
 
 {
  "action": "clearSearch",
  "description": "cleared search results"
 }
 
 
 {
  "action": "undo",
  "description": "undid last action"
 }
 
 
 {
  "action": "redo",
  "description": "redid last action"
 }
 
 
 {
  "action": "openFolder",
  "description": "opened folder dialog"
 }
 
 
 {
  "action": "openFile",
  "fileName": "filename.ext",
  "description": "opened file in editor"
 }
 
 
 {
  "action": "expandDirectory",
  "directoryName": "folder name",
  "description": "expanded directory in explorer"
 }
 
 
 {
  "action": "refreshExplorer",
  "description": "refreshed file explorer"
 }
 
 
 {
  "action": "openTerminal",
  "description": "opened terminal"
 }
 
 
 {
  "action": "closeTerminal",
  "description": "closed terminal"
 }
 
 
 {
  "action": "toggleTerminal",
  "description": "toggled terminal visibility"
 }
 
 
 {
  "action": "runCommand",
  "command": "terminal command to execute",
  "description": "executed terminal command"
 }
 
 
 Examples:
 - "go to line 42" → goToLine with line: 42
 - "move up 5 lines" → moveCursor with direction: "up", count: 5
 - "find the word hello" → findText with searchText: "hello"
 - "go to the end of the line" → moveCursor with direction: "end"
 - "next result" → nextSearchResult
 - "previous result" → previousSearchResult
 - "first result" → firstSearchResult
 - "last result" → lastSearchResult
 - "go to next search result" → nextSearchResult
 - "clear search" → clearSearch
 - "clear search results" → clearSearch
 - "hide search results" → clearSearch
 - "undo" → undo
 - "undo that" → undo
 - "undo last change" → undo
 - "redo" → redo
 - "redo that" → redo
 - "redo last action" → redo
 - "open folder" → openFolder
 - "select folder" → openFolder
 - "open file main.py" → openFile with fileName: "main.py"
 - "open the config file" → openFile with fileName: "config"
 - "expand src folder" → expandDirectory with directoryName: "src"
 - "expand components directory" → expandDirectory with directoryName: "components"
 - "refresh explorer" → refreshExplorer
 - "refresh file tree" → refreshExplorer
 - "open terminal" → openTerminal
 - "show terminal" → openTerminal
 - "close terminal" → closeTerminal
 - "hide terminal" → closeTerminal
 - "toggle terminal" → toggleTerminal
 - "run npm install" → runCommand with command: "npm install"
 - "execute ls" → runCommand with command: "ls"
 - "run python main.py" → runCommand with command: "python main.py"
 - "git status" → runCommand with command: "git status"
 - "npm start" → runCommand with command: "npm start"
 - "execute l s" → runCommand with command: "ls"
 - "list files" → runCommand with command: "ls"
 - "run l s" → runCommand with command: "ls"
 - "execute ls command" → runCommand with command: "ls"
 - "terminal command ls" → runCommand with command: "ls"
 - "run dir" → runCommand with command: "dir"
 
 
 Parse the request and return the appropriate navigation action.`;
 
 
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
 
 
  // New formatting actions for indentation and code organization
  async processFormatAction(transcript, editorContext) {
    console.log('📐 Processing format action:', transcript);
   
    const prompt = `
 You are a code formatter. Handle indentation and formatting requests.
 
 
 User request: "${transcript}"
 
 
 Context:
 - Current line: ${editorContext.cursorLine}
 - Selected text: ${editorContext.selectedText || 'None'}
 - Language: ${editorContext.language}
 
 
 Available actions:
 {
  "action": "indent",
  "startLine": number,
  "endLine": number,
  "levels": number,
  "description": "indented lines"
 }
 
 
 {
  "action": "outdent",
  "startLine": number,
  "endLine": number,
  "levels": number,
  "description": "outdented lines"
 }
 
 
 {
  "action": "formatCode",
  "startLine": number,
  "endLine": number,
  "description": "formatted code"
 }
 
 
 {
  "action": "addNewLine",
  "line": number,
  "position": "before|after",
  "description": "added line break"
 }
 
 
 Examples:
 - "indent this line" → indent current line by 1 level
 - "tab out 2 levels" → outdent by 2 levels
 - "add a new line above" → addNewLine before current line
 - "format this selection" → formatCode for selected area
 
 
 Return the appropriate formatting action.`;
 
 
    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('📐 Format action generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating format action:', error);
      return { action: 'error', message: 'Failed to process formatting' };
    }
  }
 
 
  // Simplified question handling
  async processQuestionAction(transcript, editorContext) {
    console.log('❓ Processing question action:', transcript);
   
    const prompt = `
 You are a helpful coding assistant. Answer the user's question clearly and concisely.
 
 
 Question: "${transcript}"
 
 
 Context:
 - Language: ${editorContext.language}
 - Current code:
 ${editorContext.surroundingContext || 'N/A'}
 
 
 ${editorContext.selectedText ? `Selected code:\n${editorContext.selectedText}` : ''}
 
 
 Provide a clear, practical answer. Focus on the code in context.
 
 
 Return JSON:
 {
  "action": "voiceResponse",
  "response": "your helpful answer (under 150 words)",
  "shouldSpeak": true
 }
 
 
 Keep it focused and practical.`;
 
 
    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('💬 Question response generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating question response:', error);
      return {
        // action: 'voiceResponse',
        response: 'I had trouble processing that question. Could you try rephrasing it?',
        shouldSpeak: true
      };
    }
  }
 
 
  async processConversationAction(transcript, editorContext) {
    console.log('💬 Processing conversation action:', transcript);
   
    const prompt = `
 You are a friendly coding assistant. Respond naturally and briefly.
 
 
 Message: "${transcript}"
 
 
 Return JSON:
 {
  "action": "voiceResponse",
  "response": "your friendly response (under 50 words)",
  "shouldSpeak": true
 }`;
 
 
    try {
      const response = await this.callGeminiAPI(prompt);
      const action = this.parseJsonResponse(response);
      console.log('🗣️ Conversation response generated:', action);
      return action;
    } catch (error) {
      console.error('❌ Error generating conversation response:', error);
      return {
        // action: 'voiceResponse',
        response: 'Hello! I\'m here to help you with coding.',
        shouldSpeak: true
      };
    }
  }
 
 
  // Simplified main command processor
  async processCommand(transcript, editorContext) {
    console.log('🎤 Processing voice command:', transcript);
    console.log('📁 Editor context:', editorContext);
   
    try {
      // Determine what the user wants to do
      const actionType = await this.determineActionType(transcript, editorContext);
      console.log('🎯 Action type:', actionType);
     
      // Route to the appropriate handler
      switch (actionType.actionType) {
        case 'code_action':
          return await this.processCodeAction(transcript, editorContext);
       
        case 'edit':
          return await this.processEditAction(transcript, editorContext);
       
        case 'navigation':
          return await this.processNavigationAction(transcript, editorContext);
       
        case 'format':
          return await this.processFormatAction(transcript, editorContext);
       
        case 'question':
          return await this.processQuestionAction(transcript, editorContext);
       
        case 'conversation':
          return await this.processConversationAction(transcript, editorContext);
       
        default:
          return {
            // action: 'voiceResponse',
            response: 'I\'m not sure how to help with that. Could you be more specific?',
            shouldSpeak: true
          };
      }
    } catch (error) {
      console.error('❌ Error processing command:', error);
      return {
        // action: 'voiceResponse',
        response: 'I encountered an error. Please try again.',
        shouldSpeak: true
      };
    }
  }
 
 
  // Simple JSON parsing for metadata responses
  parseSimpleJsonResponse(text) {
    try {
      let cleanText = text.trim();
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
     
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanText = cleanText.slice(jsonStart, jsonEnd + 1);
      }
     
      cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      return JSON.parse(cleanText);
     
    } catch (error) {
      console.error('❌ Simple JSON parsing failed:', error);
      return {
        actionType: 'conversation',
        confidence: 0.7,
        reasoning: 'fallback parsing'
      };
    }
  }
 
 
  async callGeminiAPI(prompt, retryCount = 0) {
    const maxRetries = 2;
    const timeout = 15000; // 15 seconds
 
 
    try {
      console.log(`🔄 Calling Gemini API (attempt ${retryCount + 1}/${maxRetries + 1})`);
     
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      console.log('\n====== GEMINI PROMPT START ======\n' + prompt + '\n======= GEMINI PROMPT END =======\n');
 
 
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
          maxOutputTokens: 2048, // Increased for longer code responses
        }
      }),
      signal: controller.signal
    });
 
 
      clearTimeout(timeoutId);
 
 
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', response.status, errorData);
       
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
     
      let cleanText = text.trim();
     
      // Remove markdown code blocks
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
     
      // Try to fix truncated JSON by finding the outermost braces
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
     
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1);
      }
     
      // Try multiple parsing strategies
      const parsingStrategies = [
        // Strategy 1: Direct parse
        () => JSON.parse(cleanText),
       
        // Strategy 2: Fix common JSON issues and parse
        () => {
          let fixedText = cleanText
            // Fix trailing commas
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            // Fix incomplete strings at the end
            .replace(/"\s*$/, '"}')
            // Handle escaped newlines
            .replace(/\\n/g, '\\n');
          return JSON.parse(fixedText);
        },
       
        // Strategy 3: Extract complete fields even from truncated JSON
        () => {
          const result = {};
         
          // Extract action
          const actionMatch = cleanText.match(/"action":\s*"([^"]+)"/);
          if (actionMatch) result.action = actionMatch[1];
         
          // Extract description 
          const descMatch = cleanText.match(/"description":\s*"([^"]+)"/);
          if (descMatch) result.description = descMatch[1];
         
          // Extract code (handling multiline strings)
          const codeMatch = cleanText.match(/"code":\s*"([\s\S]*?)"\s*(?:,|\})/);
          if (codeMatch) {
            result.code = codeMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
         
          // Extract line
          const lineMatch = cleanText.match(/"line":\s*(\d+)/);
          if (lineMatch) result.line = parseInt(lineMatch[1]);
         
          // Extract response for voice responses
          const responseMatch = cleanText.match(/"response":\s*"([^"]+)"/);
          if (responseMatch) {
            result.response = responseMatch[1];
            result.shouldSpeak = true;
          }
         
          // Ensure we have minimum required fields
          if (result.action) {
                         // Add default description if missing
             if (!result.description) {
               if (result.action === 'insertCode' || result.action === 'replaceCode') {
                 result.description = 'Generated code';
               } else if (result.action === 'voiceResponse') {
                 result.description = 'Voice response';
               }
             }
           
                         // For code actions, ensure we have code
             if (['insertCode', 'replaceCode', 'createClass'].includes(result.action) && !result.code) {
              // Try to extract from a different pattern
              const altCodeMatch = cleanText.match(/def\s+[\s\S]*?(?=\n\s*"|\n\s*})/);
              if (altCodeMatch) {
                result.code = altCodeMatch[0];
              } else {
                // Fallback - convert to voice response explaining the issue
                return {
                  // action: 'voiceResponse',
                  response: 'I generated some code but had trouble formatting it properly. Could you try asking again?',
                  shouldSpeak: true
                };
              }
            }
           
            return result;
          }
         
          throw new Error('No action field found');
        }
      ];
     
      // Try each strategy
      for (let i = 0; i < parsingStrategies.length; i++) {
        try {
          const result = parsingStrategies[i]();
          console.log(`✅ Successfully parsed with strategy ${i + 1}:`, result);
          return result;
        } catch (e) {
          console.log(`⚠️ Strategy ${i + 1} failed:`, e.message);
          continue;
        }
      }
     
      throw new Error('All parsing strategies failed');
     
    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      console.error('Raw text:', text.substring(0, 500));
     
      // Emergency fallback
      return {
        // action: 'voiceResponse',
        response: 'I had trouble processing that request. Could you try breaking it down into simpler steps?',
        shouldSpeak: true
      };
    }
  }
 }
 
 
 export default GeminiService;
 
 