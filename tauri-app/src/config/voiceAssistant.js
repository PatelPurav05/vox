// Voice Assistant Configuration
// Copy this file to voiceAssistant.js and update with your API keys

export const voiceAssistantConfig = {
  // VAPI Configuration
  // Get your public API key from https://dashboard.vapi.ai
  vapi: {
    publicKey: 'f18b14b4-3568-4e82-a61a-97a32108ec51', // Get from https://dashboard.vapi.ai
    // Create an assistant at https://dashboard.vapi.ai and get its ID
    assistantId: 'c3692736-a8e7-4f52-b377-9926aa91d30a' // Replace with your actual assistant ID
  },
  
  // Gemini Configuration (for code processing only)
  // Get your API key from https://makersuite.google.com/app/apikey
  gemini: {
    apiKey: 'AIzaSyBenoHIl8K48zqJEMfrEE9PVUmWykTR8W4' // Your actual Gemini API key
  }
}; 