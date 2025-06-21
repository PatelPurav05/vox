# Vox IDE - Lightweight Text Editor

A super lightweight, text-editor style IDE built with Tauri, React, and Monaco Editor. Designed for simplicity, speed, and efficiency.

## Features

### 🗂️ File Explorer
- **Folder Selection**: Choose any directory as your project root
- **Tree View**: Hierarchical display of folders and files
- **File Icons**: Visual file type indicators with emoji icons
- **Click to Open**: Single-click to open files in the editor

### 📝 Code Editor
- **Monaco Editor**: Powered by VS Code's editor engine
- **Syntax Highlighting**: Support for 20+ programming languages
- **Dark Theme**: Easy on the eyes for long coding sessions
- **Configurable**: Adjustable font size, word wrap, and more

### 💾 File Operations
- **Read/Write**: Load and save files seamlessly
- **Auto-save**: Automatic saving after 2 seconds of inactivity
- **Save Feedback**: Visual indicators for unsaved changes and auto-save status
- **Keyboard Shortcuts**: Ctrl+S to save manually

### ⚡ Performance
- **Lightweight**: Minimal resource usage
- **Fast Startup**: Quick application launch
- **Responsive UI**: Smooth interactions and transitions

## Language Support

The IDE automatically detects and provides syntax highlighting for:

- **Web**: JavaScript, TypeScript, HTML, CSS, SCSS, SASS, LESS
- **Systems**: Rust, C, C++, Go
- **Popular**: Python, Java, C#, PHP, Ruby, Swift, Kotlin, Scala
- **Scripting**: Shell, Bash, PowerShell
- **Config**: JSON, XML, YAML, TOML, INI
- **Markup**: Markdown
- **Database**: SQL

## Prerequisites

To run the full Tauri application, you'll need:

1. **Node.js** (v16 or later)
2. **Rust** (latest stable version)
   - Install from: https://www.rust-lang.org/learn/get-started#installing-rust
3. **Tauri Prerequisites** for your platform:
   - **Windows**: Microsoft C++ Build Tools
   - **macOS**: Xcode Command Line Tools
   - **Linux**: Various development packages

## Installation & Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd tauri-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **For development (web-only preview)**
   ```bash
   npm run dev
   ```
   This runs the React app in the browser at http://localhost:5173

4. **For full Tauri development** (requires Rust)
   ```bash
   npm run tauri:dev
   ```
   This launches the native desktop application

5. **Build for production**
   ```bash
   npm run tauri:build
   ```

## Usage

1. **Launch the Application**
   - Run `npm run tauri:dev` for development
   - Or use the built executable after running `npm run tauri:build`

2. **Open a Project**
   - Click "📁 Open Folder" in the sidebar
   - Select your project directory
   - The file tree will populate automatically

3. **Navigate Files**
   - Click folder icons (📁) to expand/collapse directories
   - Click file names to open them in the editor
   - The currently selected file is highlighted

4. **Edit Code**
   - The Monaco editor provides full IDE-like functionality
   - Auto-save activates after 2 seconds of inactivity
   - Use Ctrl+S to save manually
   - Unsaved changes are indicated with a dot (●) next to the filename

5. **Status Indicators**
   - **Auto-saving...**: Shows when auto-save is in progress
   - **Unsaved changes**: Indicates modifications haven't been saved
   - **Selected file**: Highlighted in the file explorer

## Project Structure

```
tauri-app/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── FileExplorer.jsx    # File tree component
│   │   └── FileExplorer.css    # File explorer styles
│   ├── App.jsx            # Main application component
│   ├── App.css            # Main application styles
│   ├── main.jsx           # React entry point
│   └── styles.css         # Global styles
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── dist/                  # Built frontend (generated)
├── package.json           # Node.js dependencies
└── vite.config.js         # Vite configuration
```

## Keyboard Shortcuts

- **Ctrl+S**: Save current file
- **Ctrl+O**: Open folder (when file explorer is focused)

## Customization

### Editor Settings
The Monaco editor can be customized in `src/App.jsx`:
```javascript
options={{
  minimap: { enabled: false },
  fontSize: 14,
  wordWrap: 'on',
  // Add more options here
}}
```

### Theme
The application uses a dark theme by default. Colors can be modified in the CSS files:
- `src/App.css` - Main application theme
- `src/components/FileExplorer.css` - File explorer theme
- `src/styles.css` - Global styles

### File Icons
File type icons can be customized in the `getFileIcon` function in `src/components/FileExplorer.jsx`.

## Troubleshooting

### "program not found" error
- Install Rust: https://www.rust-lang.org/tools/install
- Restart your terminal after installation

### Permission errors on file operations
- Ensure the selected folder has read/write permissions
- On Windows, try running as administrator if needed

### Build failures
- Ensure all prerequisites are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Rust cache: `cargo clean` in the src-tauri directory

## Contributing

This is a lightweight IDE focused on simplicity. When contributing:
1. Keep the codebase minimal and focused
2. Maintain the dark theme consistency
3. Ensure cross-platform compatibility
4. Test both web and native versions

## License

This project is open source and available under the [MIT License](LICENSE).
