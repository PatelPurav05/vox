class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async processCommand(transcript, editorContext) {
    console.log('Processing command:', transcript);
    console.log('Editor context:', editorContext);
    
    try {
      const prompt = `
You are a coding assistant. Convert the user's voice command into editor actions.

User command: "${transcript}"

Current editor context:
- File: ${editorContext.fileName}
- Language: ${editorContext.language}
- Current line: ${editorContext.cursorLine}
- Total lines: ${editorContext.totalLines}

Return a JSON object with one of these action types:
1. {"action": "goToLine", "line": number}
2. {"action": "insertCode", "code": "string", "line": number}
3. {"action": "deleteLines", "startLine": number, "endLine": number}
4. {"action": "createFunction", "name": "string", "params": ["param1", "param2"], "line": number}
5. {"action": "error", "message": "string"} - if command unclear

Examples:
- "go to line 42" → {"action": "goToLine", "line": 42}
- "create a function called getData" → {"action": "createFunction", "name": "getData", "params": [], "line": current_line}
- "delete line 10" → {"action": "deleteLines", "startLine": 10, "endLine": 10}

Return ONLY the JSON object, no explanation.`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', response.status, errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Gemini response:', data);
      
      const text = data.candidates[0].content.parts[0].text;
      console.log('Gemini text:', text);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const action = JSON.parse(jsonMatch[0]);
        console.log('Parsed action:', action);
        return action;
      }
      
      return { action: 'error', message: 'Could not parse command' };
    } catch (error) {
      console.error('Gemini error:', error);
      return { action: 'error', message: error.message || 'Failed to process command' };
    }
  }
}

export default GeminiService; 