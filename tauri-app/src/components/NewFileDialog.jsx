import React, { useState } from 'react';
import './NewFileDialog.css';

const NewFileDialog = ({ isVisible, onClose, onCreateFile, targetPath }) => {
  const [fileName, setFileName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('empty');

  const fileTemplates = {
    empty: {
      name: 'Empty File',
      content: '',
      extensions: ['txt', 'md', 'js', 'py', 'rs', 'html', 'css']
    },
    javascript: {
      name: 'JavaScript File',
      content: `// JavaScript file
console.log('Hello, World!');
`,
      extensions: ['js']
    },
    typescript: {
      name: 'TypeScript File',
      content: `// TypeScript file
interface Example {
  message: string;
}

const example: Example = {
  message: 'Hello, World!'
};

console.log(example.message);
`,
      extensions: ['ts']
    },
    react: {
      name: 'React Component',
      content: `import React from 'react';

const MyComponent = () => {
  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
};

export default MyComponent;
`,
      extensions: ['jsx', 'tsx']
    },
    python: {
      name: 'Python File',
      content: `#!/usr/bin/env python3
"""
Python script
"""

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
      extensions: ['py']
    },
    rust: {
      name: 'Rust File',
      content: `// Rust file
fn main() {
    println!("Hello, World!");
}
`,
      extensions: ['rs']
    },
    html: {
      name: 'HTML File',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
`,
      extensions: ['html']
    },
    css: {
      name: 'CSS File',
      content: `/* CSS Stylesheet */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}
`,
      extensions: ['css']
    },
    markdown: {
      name: 'Markdown File',
      content: `# Title

## Subtitle

This is a **Markdown** file.

- List item 1
- List item 2
- List item 3

\`\`\`javascript
console.log('Code block');
\`\`\`
`,
      extensions: ['md']
    },
    json: {
      name: 'JSON File',
      content: `{
  "name": "example",
  "version": "1.0.0",
  "description": "A JSON file",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}
`,
      extensions: ['json']
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileTemplates[selectedTemplate].extensions[0]}`;
    const filePath = `${targetPath}/${fullFileName}`.replace(/\\/g, '/');
    
    onCreateFile(filePath, fileTemplates[selectedTemplate].content);
    
    // Reset form
    setFileName('');
    setSelectedTemplate('empty');
    onClose();
  };

  const handleCancel = () => {
    setFileName('');
    setSelectedTemplate('empty');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Create New File</h3>
          <button className="dialog-close" onClick={handleCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="form-group">
            <label htmlFor="fileName">File Name:</label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="template">Template:</label>
            <select
              id="template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {Object.entries(fileTemplates).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Preview:</label>
            <div className="template-preview">
              <pre>{fileTemplates[selectedTemplate].content || 'Empty file'}</pre>
            </div>
          </div>

          <div className="dialog-actions">
            <button type="button" onClick={handleCancel}>Cancel</button>
            <button type="submit">Create File</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewFileDialog; 