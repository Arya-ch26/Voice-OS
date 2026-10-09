# 🎙️ Voice OS — Web-Based Voice-Controlled Operating System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![Web Speech API](https://img.shields.io/badge/Web_Speech_API-en--IN_%7C_en--US-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
[![Google Gemini](https://img.shields.io/badge/AI_Kernel-Google_Gemini-orange.svg)](https://deepmind.google/technologies/gemini/)
[![Tests](https://img.shields.io/badge/Tests-103%2F103_Passing-brightgreen.svg)](tests/test-voice-features.cjs)

> **Voice OS** is an immersive, cyber-themed desktop environment inside the browser where **voice control serves as the primary global operating system interface**. From launching apps and saving files by spoken filename, to steering a snake game with zero-delay directional voice commands, every feature is unified through natural speech, keyboard, and mouse controls.

---

## 🌟 Key Highlights & Features

### 1. 🎙️ Global Full-Time Voice Assistant
- **Continuous Voice Listening**: Powered by the Web Speech API with an automatic reconnect engine.
- **Utterance Accumulator & Silence Debounce**: Captures complete complex sentences without premature cutoff on partial speech chunks.
- **Bilingual & Accent Optimized**: Tuned to **Indian English (`en-IN`)** by default with an instant one-click toggle to **US English (`en-US`)**.
- **Real-Time Hardware Mic Visualizer**: Directly connects to hardware microphone via `getUserMedia` and Web Audio API `AnalyserNode`, pulsing glowing orb rings in sync with voice volume.
- **Conversational Filler Resilience**: Automatically strips conversational suffixes (*"or whatever"*, *"right now"*, *"please"*, *"thanks"*) from parameters like filenames, songs, and colors.
- **Echo Rejection & Synthesis Watchdog**: Prevents text-to-speech feedback loops and eliminates speech synthesis lockups.

### 2. 🪟 Modern Desktop Window Manager
- **Full Window Controls**: Dedicated **Minimize (`–`)**, **Maximize / Restore (`□` / `❐`)**, and **Close (`✕`)** buttons on every window.
- **Native OS Interactions**:
  - Double-click the titlebar to toggle maximize / restore.
  - Dragging the titlebar of a maximized window smoothly restores it under the cursor.
- **Desktop Entrance Animations**: Smooth spring scaling and depth blur entrance animations (`winScaleFadeIn`) with frosted glassmorphism styling.
- **Voice Window Management**: Control windows via speech (`"maximize window"`, `"minimize window"`, `"restore window"`, `"close window"`).

### 3. 📁 Voice-Controlled File Manager & Storage
- **Virtual Hierarchical Storage**: Full virtual file system persisted in `localStorage` (`voice_os_files`).
- **Spoken Save As**: Say *"Save this notepad with the text as Arya.txt"* or *"Save it as project.txt"* to automatically extract, validate, deduplicate, and persist files.
- **Full Voice File Operations**:
  - `"create a file called notes.txt"`
  - `"create a folder called Projects"`
  - `"open Arya.txt"` (searches and opens in Notepad or File Manager)
  - `"rename this file to final.txt"`
  - `"delete this file"` (with voice confirmation modal)
  - `"download this file"`

### 4. 📝 Notepad
- Live voice-to-text dictation and typing.
- Dedicated action listener bridging files to the File Manager.
- Auto-save state preservation in `localStorage`.

### 5. 🐍 Voice-Controlled Snake Game
- **Zero-Delay Directional Steering**: Ultra-low latency voice recognition for instant navigation:
  - `"up"` ⬆️ | `"down"` ⬇️ | `"left"` ⬅️ | `"right"` ➡️
- **Voice Game Flow**: `"start game"`, `"pause game"`, `"resume game"`, `"restart game"`.
- Seamless dual-mode support: Voice + Keyboard (WASD & Arrow keys).

### 6. 📷 Camera & Video Recording Studio
- Real-time webcam integration via HTML5 MediaStream API.
- Photo capture and video recording (start, pause, resume, stop).
- Direct bridge to saved Media Gallery.
- Voice commands: `"open camera"`, `"take a photo"`, `"start recording"`, `"pause recording"`, `"save video"`.

### 7. ⏱️ Clock with Dynamic Voice Theming
- Dual display: Digital LED clock and SVG dial Analogue clock.
- Dynamic color theming through voice:
  - *"Change the color of the clock to neon green"*
  - *"Set clock color to cyan"*
  - Supports Neon Green, Cyan, Pink, Red, Blue, Orange, Purple, and White with persistent storage.

### 8. 🎵 Synthwave Music Player
- Web Audio API synthesizer chords and animated audio visualizer bars.
- 5 built-in ambient tracks (including *Night Drive*, *Neon Rain*, *Cyber Orbit*).
- Voice controls: *"Play the song Night Drive"*, *"pause music"*, *"resume music"*, *"next song"*.

### 9. 🌤️ Weather, 🔢 Calculator, 🎨 Wallpaper & ⚡ Task Manager
- **Weather App**: Live weather forecast (preset to Raipur, Chhattisgarh, India, with voice query support).
- **Calculator**: Arithmetic calculator with voice math input.
- **Wallpaper Studio**: Customizable cyberpunk and glass backgrounds.
- **Task Manager**: System process monitor with live process termination.

---

## 🏛️ System Architecture

```text
Microphone
    ↓
getUserMedia Hardware Stream ──► Web Audio Visualizer (Glowing Rings)
    ↓
Web Speech API (en-IN / en-US)
    ↓
Utterance Accumulator & Silence Debounce (650ms - 850ms)
    ↓
Command Normalizer & Conversational Filler Stripper
    ↓
Intent Detector & Regex / NLP Parser
    ↓
Kernel Action Router
    ↓
Underlying OS / Window / App Functions
    ↓
DOM / Iframe PostMessage Broadcast
    ↓
Web Audio Chimes + Web Speech Synthesis (TTS Feedback)
```

---

## 📂 Project Structure

```text
Fake OS/
├── public/
│   ├── index.html        # Main Desktop, Dock, Titlebars, and Assistant UI
│   ├── style.css         # Glassmorphism, animations, window manager styles
│   └── os.js             # Core OS kernel, speech engine, intent router, app templates
├── tests/
│   └── test-voice-features.cjs  # Automated 103-test regression suite
├── server.js             # Node.js Express server + Gemini AI SSE Streaming
├── package.json          # Project configuration and dependencies
├── .env.example          # Environment variable template
└── README.md             # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Google Chrome](https://www.google.com/chrome/) or [Microsoft Edge](https://www.microsoft.com/edge) *(Recommended for native Web Speech API support)*

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/voice-os.git
cd voice-os
npm install
```

### 2. Environment Configuration (Optional)
Copy `.env.example` to `.env` and provide your Google Gemini API key if you wish to enable the AI streaming kernel:

```bash
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest
PORT=3000
```
*(Note: All core OS applications, window controls, and voice intents operate 100% locally in the browser even without a Gemini API key!)*

### 3. Run the Server
Start the local server:

```bash
npm start
```
*(or run `node server.js`)*

### 4. Open in Browser
Visit:
```text
http://localhost:3000
```
When prompted by the browser, click **"Allow"** to enable microphone access.

---

## 🗣️ Common Voice Commands

| Category | Example Voice Commands | Action |
|---|---|---|
| **Applications** | `"open camera"` / `"open file manager"` / `"open clock"` | Launches or focuses the app window |
| **Window Controls** | `"maximize window"` / `"fullscreen clock"` | Expands window to fill desktop workspace |
| | `"restore window"` / `"restore notepad"` | Returns window to floating size |
| | `"minimize window"` / `"minimize"` | Smoothly tucks window into the taskbar |
| | `"close window"` / `"close camera"` | Closes active window |
| **Files** | `"save this notepad with the text as Arya.txt"` | Saves active note directly to storage |
| | `"create a file called project.txt"` | Creates new file in File Manager |
| | `"open Arya.txt"` | Finds and opens file |
| | `"delete this file"` | Shows confirmation and deletes file |
| **Clock Color** | `"change the color of the clock to neon green"` | Opens Clock and updates theme color |
| | `"change clock color to cyan"` | Switches color to cyan |
| **Music Player** | `"play the song Night Drive"` | Launches player and starts track |
| | `"pause music"` / `"resume music"` / `"next song"` | Controls playback |
| **Snake Game** | `"play snake"` / `"start game"` | Launches Snake game |
| | `"up"` / `"down"` / `"left"` / `"right"` | Steers snake with zero latency |
| **Camera** | `"take a photo"` / `"start recording"` / `"stop recording"` | Captures media |

---

## 🧪 Automated Testing

The project includes an automated regression test suite covering intent detection, parameter extraction, conversational filler handling, template integrity, and window controls:

```bash
node tests/test-voice-features.cjs
```

**Result: 103 / 103 tests passing.**

---

## 🛠️ Built With
- **Runtime**: Node.js & Express
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Speech APIs**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)
- **Hardware Audio**: Web Audio API (`AudioContext`, `AnalyserNode`)
- **Frontend**: Vanilla ES6+ JavaScript, CSS3 Glassmorphism, Semantic HTML5

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
