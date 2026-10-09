import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Create client using the GEMINI_API_KEY environment variable
const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '';
const modelName = process.env.GEMINI_MODEL || process.env.Gemini_MODEL || 'gemini-3.1-flash-lite';

let ai = null;
if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err.message);
  }
}

// System prompt constant for Voice OS Kernel
const SYSTEM_PROMPT = `You are the kernel of a browser operating system powered by Gemini. The user speaks commands, so expect filler words, self corrections, and missing punctuation. Use the final intent. Respond with only JSON. Choose one action. Open app returns action, title, width, height, and html, where html is a full self contained HTML document with inline CSS and JavaScript. Edit app returns action, a target window id, and the full updated html. Close app returns action and a target window id. Set wallpaper returns action and a css background value. Rules: apps must be self contained with no external scripts and no network calls, use a dark modern UI, stay under one hundred fifty lines, and fit the given window size. If the user refers to an existing window, like make the clock bigger, use edit app with that window's id. Always include the html field with complete HTML document when action is open app or edit app.`;

// Response Schema for Gemini Kernel Config
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ['open app', 'edit app', 'close app', 'set wallpaper']
    },
    title: { type: Type.STRING },
    width: { type: Type.STRING },
    height: { type: Type.STRING },
    html: { type: Type.STRING },
    target: { type: Type.STRING },
    css: { type: Type.STRING }
  },
  required: ['action']
};

function inferTitleFromText(text = '') {
  const cleaned = (text || '')
    .replace(/^(please\s+|can\s+you\s+|could\s+you\s+)?(open|launch|start|create|show|give\s+me)\s+(a|an|the)?\s*/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Application';
}

function getAppTemplate(rawTitle = '', initialText = '', initialFileName = '') {
  const title = (rawTitle || '').toLowerCase();

  // 1. CAMERA APP (Photo Capture & Video Recording)
  if (title.includes('camera') || title.includes('photo') || (title.includes('video') && !title.includes('player')) || title.includes('record')) {
    const defaultMode = (title.includes('video') || title.includes('record')) ? 'video' : 'photo';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #090d16;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}
.cam-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.cam-modes {
  display: flex;
  background: #1e293b;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.cam-mode-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.cam-mode-btn.active {
  background: #0284c7;
  color: #fff;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
}
.cam-actions-top {
  display: flex;
  gap: 6px;
}
.mini-top-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}
.mini-top-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

.viewport {
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
video, img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
canvas { display: none; }

/* Recording Overlays */
.rec-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
  animation: recPulse 1.2s infinite;
  z-index: 10;
}
.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
}
@keyframes recPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.96); }
}
.timer-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  z-index: 10;
}
.paused-badge {
  position: absolute;
  top: 48px;
  left: 12px;
  background: rgba(245, 158, 11, 0.9);
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  z-index: 10;
}

.cam-error-box {
  position: absolute;
  inset: 0;
  background: rgba(11, 15, 25, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  gap: 12px;
  z-index: 30;
}
.cam-error-icon { font-size: 40px; }
.cam-error-title { font-size: 16px; font-weight: 700; color: #f8fafc; }
.cam-error-desc { font-size: 12px; color: #94a3b8; max-width: 340px; line-height: 1.5; }
.cam-retry-btn {
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 12px;
}

.cam-footer {
  padding: 12px 16px;
  background: #0f172a;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 72px;
}
.shutter-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #0284c7;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.4);
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.shutter-btn:active { transform: scale(0.92); }
.rec-shutter-btn {
  border-color: #ef4444;
  color: #ef4444;
}
.rec-shutter-btn.is-recording {
  background: #ef4444;
  color: #fff;
  border-color: #fff;
  border-radius: 12px;
  width: 48px;
  height: 48px;
}
.btn-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ctrl-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.ctrl-btn:hover { background: #334155; color: #fff; }
.ctrl-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }
.ctrl-btn.primary:hover { background: #0369a1; }
.ctrl-btn.success { background: #059669; border-color: #059669; color: #fff; }
.ctrl-btn.success:hover { background: #047857; }
.ctrl-btn.danger { background: #dc2626; border-color: #dc2626; color: #fff; }
.ctrl-btn.danger:hover { background: #b91c1c; }

/* Toast notification */
.cam-toast {
  position: absolute;
  bottom: 80px;
  background: rgba(16, 185, 129, 0.95);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  z-index: 40;
  display: none;
  animation: fadeIn 0.15s;
}
</style>
</head>
<body>
<div class="cam-header">
  <div class="cam-modes">
    <button class="cam-mode-btn ${defaultMode === 'photo' ? 'active' : ''}" id="modePhotoBtn">📷 Photo</button>
    <button class="cam-mode-btn ${defaultMode === 'video' ? 'active' : ''}" id="modeVideoBtn">🎥 Video</button>
  </div>
  <div class="cam-actions-top">
    <button class="mini-top-btn" id="flipCamBtn" title="Switch front/rear camera">🔄 Flip</button>
    <button class="mini-top-btn" id="openGalleryBtn" title="Open Media Gallery">🖼️ Gallery</button>
  </div>
</div>

<div class="viewport" id="viewport">
  <video id="liveVideo" autoplay playsinline muted></video>
  <img id="photoResult" style="display:none;" />
  <video id="videoResult" controls playsinline style="display:none;"></video>
  <canvas id="captureCanvas"></canvas>

  <div class="rec-badge" id="recBadge" style="display:none;">
    <span class="rec-dot"></span>
    <span>RECORDING</span>
  </div>
  <div class="timer-pill" id="recTimer" style="display:none;">00:00</div>
  <div class="paused-badge" id="pauseBadge" style="display:none;">❚❚ PAUSED</div>

  <div class="cam-error-box" id="errorBox" style="display:none;">
    <div class="cam-error-icon">📷⚠️</div>
    <div class="cam-error-title" id="errorTitle">Camera Unavailable</div>
    <div class="cam-error-desc" id="errorDesc">Please allow camera permissions in your browser.</div>
    <button class="cam-retry-btn" id="retryBtn">Try Again</button>
  </div>

  <div class="cam-toast" id="camToast"></div>
</div>

<div class="cam-footer" id="camFooter">
  <!-- Photo Mode Live Bar -->
  <div class="btn-bar" id="photoLiveBar">
    <button class="shutter-btn" id="snapBtn" title="Take Photo">📸</button>
  </div>

  <!-- Photo Review Bar -->
  <div class="btn-bar" id="photoReviewBar" style="display:none;">
    <button class="ctrl-btn success" id="savePhotoBtn">✓ Save Photo</button>
    <button class="ctrl-btn" id="retakePhotoBtn">🔄 Retake</button>
    <button class="ctrl-btn" id="dlPhotoBtn">⬇️ Download</button>
    <button class="ctrl-btn danger" id="cancelPhotoBtn">✕ Discard</button>
  </div>

  <!-- Video Mode Live Bar -->
  <div class="btn-bar" id="videoLiveBar" style="display:none;">
    <button class="shutter-btn rec-shutter-btn" id="recBtn" title="Start Recording">🔴</button>
  </div>

  <!-- Video Recording Active Bar -->
  <div class="btn-bar" id="videoActiveBar" style="display:none;">
    <button class="ctrl-btn" id="pauseRecBtn">⏸️ Pause</button>
    <button class="ctrl-btn danger" id="stopRecBtn">⏹️ Stop</button>
  </div>

  <!-- Video Review Bar -->
  <div class="btn-bar" id="videoReviewBar" style="display:none;">
    <button class="ctrl-btn success" id="saveVideoBtn">💾 Save Video</button>
    <button class="ctrl-btn" id="retakeVideoBtn">🔄 Retake</button>
    <button class="ctrl-btn" id="dlVideoBtn">⬇️ Download</button>
  </div>
</div>

<script>
let activeMode = '${defaultMode}';
let currentStream = null;
let facingMode = 'user';
let mediaRecorder = null;
let recordedChunks = [];
let recordTimer = null;
let recordSeconds = 0;
let isRecording = false;
let isPaused = false;
let lastCapturedPhotoData = null;
let lastRecordedBlob = null;
let lastRecordedUrl = null;

const liveVideo = document.getElementById('liveVideo');
const photoResult = document.getElementById('photoResult');
const videoResult = document.getElementById('videoResult');
const captureCanvas = document.getElementById('captureCanvas');
const recBadge = document.getElementById('recBadge');
const recTimer = document.getElementById('recTimer');
const pauseBadge = document.getElementById('pauseBadge');
const errorBox = document.getElementById('errorBox');
const errorTitle = document.getElementById('errorTitle');
const errorDesc = document.getElementById('errorDesc');
const toast = document.getElementById('camToast');

// IndexedDB Media Engine
const DB_NAME = 'voice_os_media_db';
function saveMedia(item) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('media')) {
          const st = db.createObjectStore('media', { keyPath: 'id' });
          st.createIndex('type', 'type', { unique: false });
          st.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('media', 'readwrite');
        tx.objectStore('media').put(item);
        tx.oncomplete = () => {
          window.parent.postMessage({ type: 'os:media-saved', media: item }, '*');
          resolve(true);
        };
        tx.onerror = () => fallbackSave(item, resolve);
      };
      req.onerror = () => fallbackSave(item, resolve);
    } catch(e) {
      fallbackSave(item, resolve);
    }
  });
}

function fallbackSave(item, cb) {
  try {
    const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
    const arr = JSON.parse(raw);
    arr.unshift(item);
    localStorage.setItem('voice_os_media_fallback', JSON.stringify(arr.slice(0, 30)));
    window.parent.postMessage({ type: 'os:media-saved', media: item }, '*');
  } catch(e) {}
  cb(true);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

function formatTime(s) {
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}

async function startCamera() {
  stopCurrentStream();
  errorBox.style.display = 'none';
  try {
    const constraints = {
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    };
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    liveVideo.srcObject = currentStream;
    liveVideo.style.display = 'block';
    photoResult.style.display = 'none';
    videoResult.style.display = 'none';
    updateUIForMode();
  } catch (err) {
    console.warn('Camera error:', err);
    // Try video-only if audio failed
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      liveVideo.srcObject = currentStream;
      liveVideo.style.display = 'block';
      photoResult.style.display = 'none';
      videoResult.style.display = 'none';
      updateUIForMode();
      return;
    } catch(e2) {}

    errorBox.style.display = 'flex';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorTitle.textContent = 'Camera Permission Denied';
      errorDesc.textContent = 'Click the lock or camera icon in your browser address bar to allow Camera access, then click Try Again.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorTitle.textContent = 'No Camera Device Found';
      errorDesc.textContent = 'Please attach or enable a webcam device.';
    } else {
      errorTitle.textContent = 'Camera Error';
      errorDesc.textContent = err.message || 'Unable to access camera.';
    }
  }
}

function stopCurrentStream() {
  if (currentStream) {
    try { currentStream.getTracks().forEach(t => t.stop()); } catch(e) {}
    currentStream = null;
  }
}

function updateUIForMode() {
  document.getElementById('modePhotoBtn').classList.toggle('active', activeMode === 'photo');
  document.getElementById('modeVideoBtn').classList.toggle('active', activeMode === 'video');

  document.getElementById('photoLiveBar').style.display = activeMode === 'photo' ? 'flex' : 'none';
  document.getElementById('photoReviewBar').style.display = 'none';
  document.getElementById('videoLiveBar').style.display = activeMode === 'video' ? 'flex' : 'none';
  document.getElementById('videoActiveBar').style.display = 'none';
  document.getElementById('videoReviewBar').style.display = 'none';
  recBadge.style.display = 'none';
  recTimer.style.display = 'none';
  pauseBadge.style.display = 'none';
}

// Switch Modes
document.getElementById('modePhotoBtn').addEventListener('click', () => {
  if (isRecording) stopRecording();
  activeMode = 'photo';
  photoResult.style.display = 'none';
  videoResult.style.display = 'none';
  liveVideo.style.display = 'block';
  updateUIForMode();
});

document.getElementById('modeVideoBtn').addEventListener('click', () => {
  activeMode = 'video';
  photoResult.style.display = 'none';
  videoResult.style.display = 'none';
  liveVideo.style.display = 'block';
  updateUIForMode();
});

// Flip Camera
document.getElementById('flipCamBtn').addEventListener('click', () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

// Open Gallery
document.getElementById('openGalleryBtn').addEventListener('click', () => {
  window.parent.postMessage({ type: 'os:open-app', app: 'Gallery' }, '*');
});

// Retry
document.getElementById('retryBtn').addEventListener('click', startCamera);

// Take Photo
document.getElementById('snapBtn').addEventListener('click', takePhoto);

function takePhoto() {
  if (!currentStream) return;
  const w = liveVideo.videoWidth || 640;
  const h = liveVideo.videoHeight || 480;
  captureCanvas.width = w;
  captureCanvas.height = h;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(liveVideo, 0, 0, w, h);
  lastCapturedPhotoData = captureCanvas.toDataURL('image/jpeg', 0.92);

  photoResult.src = lastCapturedPhotoData;
  photoResult.style.display = 'block';
  liveVideo.style.display = 'none';

  document.getElementById('photoLiveBar').style.display = 'none';
  document.getElementById('photoReviewBar').style.display = 'flex';
}

// Retake Photo
document.getElementById('retakePhotoBtn').addEventListener('click', () => {
  photoResult.style.display = 'none';
  liveVideo.style.display = 'block';
  document.getElementById('photoReviewBar').style.display = 'none';
  document.getElementById('photoLiveBar').style.display = 'flex';
});

document.getElementById('cancelPhotoBtn').addEventListener('click', () => {
  photoResult.style.display = 'none';
  liveVideo.style.display = 'block';
  document.getElementById('photoReviewBar').style.display = 'none';
  document.getElementById('photoLiveBar').style.display = 'flex';
});

// Save Photo
document.getElementById('savePhotoBtn').addEventListener('click', async () => {
  if (!lastCapturedPhotoData) return;
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const item = {
    id: 'photo-' + Date.now(),
    name: 'photo-' + ts + '.jpg',
    type: 'photo',
    dataUrl: lastCapturedPhotoData,
    thumbnail: lastCapturedPhotoData,
    size: (Math.round(lastCapturedPhotoData.length * 0.75 / 1024)) + ' KB',
    date: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now()
  };
  await saveMedia(item);
  showToast('Photo saved to Gallery! 📷');
  document.getElementById('retakePhotoBtn').click();
});

// Download Photo
document.getElementById('dlPhotoBtn').addEventListener('click', () => {
  if (!lastCapturedPhotoData) return;
  const a = document.createElement('a');
  a.href = lastCapturedPhotoData;
  a.download = 'photo-' + Date.now() + '.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Video Recording Logic
document.getElementById('recBtn').addEventListener('click', startRecording);

function startRecording() {
  if (!currentStream) return;
  recordedChunks = [];
  recordSeconds = 0;
  isPaused = false;
  isRecording = true;

  const mimes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  let chosenMime = mimes.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';

  try {
    mediaRecorder = new MediaRecorder(currentStream, chosenMime ? { mimeType: chosenMime } : {});
  } catch(e) {
    try {
      mediaRecorder = new MediaRecorder(currentStream);
    } catch(err) {
      alert('MediaRecorder is not supported on this browser.');
      return;
    }
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    clearInterval(recordTimer);
    isRecording = false;
    const mime = mediaRecorder.mimeType || 'video/webm';
    lastRecordedBlob = new Blob(recordedChunks, { type: mime });
    if (lastRecordedUrl) URL.revokeObjectURL(lastRecordedUrl);
    lastRecordedUrl = URL.createObjectURL(lastRecordedBlob);

    videoResult.src = lastRecordedUrl;
    videoResult.style.display = 'block';
    liveVideo.style.display = 'none';

    recBadge.style.display = 'none';
    recTimer.style.display = 'none';
    pauseBadge.style.display = 'none';

    document.getElementById('videoActiveBar').style.display = 'none';
    document.getElementById('videoReviewBar').style.display = 'flex';
  };

  mediaRecorder.start(250);
  recBadge.style.display = 'flex';
  recTimer.textContent = '00:00';
  recTimer.style.display = 'block';
  document.getElementById('videoLiveBar').style.display = 'none';
  document.getElementById('videoActiveBar').style.display = 'flex';

  recordTimer = setInterval(() => {
    if (!isPaused) {
      recordSeconds++;
      recTimer.textContent = formatTime(recordSeconds);
    }
  }, 1000);
}

// Pause / Resume Recording
document.getElementById('pauseRecBtn').addEventListener('click', () => {
  if (!mediaRecorder) return;
  if (isPaused) {
    mediaRecorder.resume();
    isPaused = false;
    pauseBadge.style.display = 'none';
    document.getElementById('pauseRecBtn').textContent = '⏸️ Pause';
  } else {
    mediaRecorder.pause();
    isPaused = true;
    pauseBadge.style.display = 'block';
    document.getElementById('pauseRecBtn').textContent = '▶️ Resume';
  }
});

// Stop Recording
document.getElementById('stopRecBtn').addEventListener('click', stopRecording);
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// Retake Video
document.getElementById('retakeVideoBtn').addEventListener('click', () => {
  videoResult.pause();
  videoResult.style.display = 'none';
  liveVideo.style.display = 'block';
  document.getElementById('videoReviewBar').style.display = 'none';
  document.getElementById('videoLiveBar').style.display = 'flex';
});

// Download Video
document.getElementById('dlVideoBtn').addEventListener('click', () => {
  if (!lastRecordedBlob) return;
  const a = document.createElement('a');
  a.href = lastRecordedUrl;
  a.download = 'video-' + Date.now() + '.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Save Video
document.getElementById('saveVideoBtn').addEventListener('click', () => {
  if (!lastRecordedBlob) return;
  const reader = new FileReader();
  reader.onloadend = async () => {
    const dataUrl = reader.result;
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sizeStr = lastRecordedBlob.size > 1048576
      ? (lastRecordedBlob.size / 1048576).toFixed(1) + ' MB'
      : (Math.round(lastRecordedBlob.size / 1024)) + ' KB';

    const item = {
      id: 'video-' + Date.now(),
      name: 'video-' + ts + '.webm',
      type: 'video',
      dataUrl: dataUrl,
      size: sizeStr,
      duration: formatTime(recordSeconds),
      date: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    await saveMedia(item);
    showToast('Video saved to Gallery! 🎥');
    document.getElementById('retakeVideoBtn').click();
  };
  reader.readAsDataURL(lastRecordedBlob);
});

// Unified App Action Handler for Camera
window.executeAppAction = function(action, params = {}) {
  const act = (action || '').toUpperCase();
  if (act === 'TAKE_PHOTO' || act === 'SNAP') {
    if (activeMode !== 'photo') {
      document.getElementById('modePhotoBtn').click();
      setTimeout(takePhoto, 300);
    } else {
      takePhoto();
    }
  } else if (act === 'RETAKE_PHOTO' || act === 'RETAKE') {
    document.getElementById('retakePhotoBtn')?.click();
    document.getElementById('retakeVideoBtn')?.click();
  } else if (act === 'SAVE_PHOTO') {
    document.getElementById('savePhotoBtn')?.click();
  } else if (act === 'START_RECORDING' || act === 'START_VIDEO') {
    if (activeMode !== 'video') {
      document.getElementById('modeVideoBtn').click();
      setTimeout(startRecording, 300);
    } else {
      startRecording();
    }
  } else if (act === 'PAUSE_RECORDING' || act === 'PAUSE_VIDEO') {
    if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      isPaused = true;
      document.getElementById('pauseRecBtn').textContent = '▶ Resume';
      pauseBadge.style.display = 'inline-block';
    }
  } else if (act === 'RESUME_RECORDING' || act === 'RESUME_VIDEO') {
    if (isRecording && mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      isPaused = false;
      document.getElementById('pauseRecBtn').textContent = '⏸ Pause';
      pauseBadge.style.display = 'none';
    }
  } else if (act === 'STOP_RECORDING' || act === 'STOP_VIDEO') {
    if (isRecording) stopRecording();
  } else if (act === 'SAVE_VIDEO') {
    document.getElementById('saveVideoBtn')?.click();
  } else if (act === 'SWITCH_CAMERA') {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  }
};

// Voice message listener from parent OS
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'os:action') {
    executeAppAction(e.data.action, e.data.params);
  } else if (e.data.type === 'os:camera-snap' || e.data.type === 'os:take-photo') {
    executeAppAction('TAKE_PHOTO');
  } else if (e.data.type === 'os:camera-save-photo') {
    executeAppAction('SAVE_PHOTO');
  } else if (e.data.type === 'os:camera-start-rec') {
    executeAppAction('START_RECORDING');
  } else if (e.data.type === 'os:camera-stop-rec') {
    executeAppAction('STOP_RECORDING');
  } else if (e.data.type === 'os:camera-save-video') {
    executeAppAction('SAVE_VIDEO');
  } else if (e.data.type === 'os:camera-retake') {
    executeAppAction('RETAKE');
  }
});

window.addEventListener('beforeunload', stopCurrentStream);
startCamera();
</script>
</body>
</html>`;
  }

  // 2. GALLERY APP
  if (title.includes('gallery')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #090d16;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}
.gal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.gal-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gal-title { font-size: 14px; font-weight: 700; color: #38bdf8; }
.gal-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 600;
}
.gal-tabs {
  display: flex;
  background: #1e293b;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.gal-tab {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.gal-tab.active {
  background: #0284c7;
  color: #fff;
}
.gal-actions-right {
  display: flex;
  gap: 6px;
}
.gal-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}
.gal-btn:hover { background: #334155; color: #fff; }
.gal-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }

.gal-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}
.gal-body::-webkit-scrollbar { width: 6px; }
.gal-body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.card {
  background: #131b2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.card:hover {
  transform: translateY(-2px);
  border-color: #38bdf8;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}
.thumb-wrap {
  width: 100%;
  height: 120px;
  background: #090d16;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.card-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.card-name {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-meta {
  font-size: 10px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
}
.card-actions {
  padding: 6px 10px 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
.card-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.card-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; }
.card-btn.del:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444; }

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  gap: 12px;
  text-align: center;
  padding: 40px;
}
.empty-icon { font-size: 44px; opacity: 0.6; }
.empty-text { font-size: 13px; }

/* Modal Lightbox */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 9, 18, 0.92);
  backdrop-filter: blur(6px);
  display: none;
  flex-direction: column;
  padding: 16px;
  z-index: 100;
}
.modal-overlay.open { display: flex; }
.modal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.modal-title { font-size: 13px; font-weight: 700; color: #38bdf8; }
.modal-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px 0;
}
.modal-view img, .modal-view video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.7);
}
.modal-bottom {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
</head>
<body>
<div class="gal-header">
  <div class="gal-title-box">
    <span style="font-size:18px;">🖼️</span>
    <span class="gal-title">MEDIA GALLERY</span>
    <span class="gal-badge" id="countBadge">0 Items</span>
  </div>
  <div class="gal-tabs">
    <button class="gal-tab active" data-tab="all">All</button>
    <button class="gal-tab" data-tab="photo">📷 Photos</button>
    <button class="gal-tab" data-tab="video">🎥 Videos</button>
  </div>
  <div class="gal-actions-right">
    <button class="gal-btn primary" id="openCamBtn">📷 Camera</button>
    <button class="gal-btn" id="refreshBtn">🔄 Refresh</button>
  </div>
</div>

<div class="gal-body">
  <div class="grid" id="grid"></div>
  <div class="empty-box" id="emptyBox" style="display:none;">
    <div class="empty-icon">🖼️</div>
    <div class="empty-text" id="emptyText">No saved photos or videos yet.</div>
    <button class="gal-btn primary" id="emptyCamBtn">📷 Open Camera</button>
  </div>
</div>

<!-- Viewer Modal -->
<div class="modal-overlay" id="viewerModal">
  <div class="modal-top">
    <span class="modal-title" id="viewTitle">Media Preview</span>
    <button class="gal-btn" id="closeViewBtn">✕ Close</button>
  </div>
  <div class="modal-view" id="modalView"></div>
  <div class="modal-bottom">
    <button class="gal-btn primary" id="dlViewBtn">⬇️ Download</button>
    <button class="gal-btn" style="color:#f87171;" id="delViewBtn">🗑️ Delete</button>
  </div>
</div>

<script>
const DB_NAME = 'voice_os_media_db';
let activeTab = 'all';
let allItems = [];
let currentViewingItem = null;

function loadMedia() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('media')) {
          const st = db.createObjectStore('media', { keyPath: 'id' });
          st.createIndex('type', 'type', { unique: false });
          st.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('media', 'readonly');
        const st = tx.objectStore('media');
        const getReq = st.getAll();
        getReq.onsuccess = () => {
          let list = getReq.result || [];
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(list);
        };
        getReq.onerror = () => fallbackLoad(resolve);
      };
      req.onerror = () => fallbackLoad(resolve);
    } catch(e) {
      fallbackLoad(resolve);
    }
  });
}

function fallbackLoad(cb) {
  try {
    const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
    cb(JSON.parse(raw));
  } catch(e) {
    cb([]);
  }
}

function deleteItem(id) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('media', 'readwrite');
        tx.objectStore('media').delete(id);
        tx.oncomplete = () => {
          window.parent.postMessage({ type: 'os:media-deleted', id: id }, '*');
          resolve(true);
        };
        tx.onerror = () => fallbackDelete(id, resolve);
      };
      req.onerror = () => fallbackDelete(id, resolve);
    } catch(e) {
      fallbackDelete(id, resolve);
    }
  });
}

function fallbackDelete(id, cb) {
  try {
    const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
    const arr = JSON.parse(raw).filter(i => i.id !== id);
    localStorage.setItem('voice_os_media_fallback', JSON.stringify(arr));
    window.parent.postMessage({ type: 'os:media-deleted', id: id }, '*');
  } catch(e) {}
  cb(true);
}

async function renderGallery() {
  allItems = await loadMedia();
  const filtered = allItems.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  document.getElementById('countBadge').textContent = filtered.length + ' Item' + (filtered.length === 1 ? '' : 's');

  const grid = document.getElementById('grid');
  const emptyBox = document.getElementById('emptyBox');
  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyBox.style.display = 'flex';
    document.getElementById('emptyText').textContent = activeTab === 'photo'
      ? 'No photos saved yet.'
      : activeTab === 'video'
      ? 'No videos recorded yet.'
      : 'No media items in Gallery yet.';
    return;
  }
  emptyBox.style.display = 'none';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    const isVideo = item.type === 'video';

    let thumbHtml = '';
    if (isVideo) {
      thumbHtml = '<video class="thumb-img" src="' + item.dataUrl + '#t=0.5" preload="metadata" muted></video><span class="video-badge">▶ ' + (item.duration || 'Video') + '</span>';
    } else {
      thumbHtml = '<img class="thumb-img" src="' + item.dataUrl + '" loading="lazy" />';
    }

    card.innerHTML = '<div class="thumb-wrap">' + thumbHtml + '</div>' +
      '<div class="card-info">' +
        '<div class="card-name">' + item.name + '</div>' +
        '<div class="card-meta"><span>' + (item.size || '') + '</span><span>' + (item.date || '') + '</span></div>' +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="card-btn view-btn">👁️ View</button>' +
        '<button class="card-btn dl-btn">⬇️</button>' +
        '<button class="card-btn del del-btn">🗑️</button>' +
      '</div>';

    card.querySelector('.thumb-wrap').addEventListener('click', () => openViewer(item));
    card.querySelector('.view-btn').addEventListener('click', (e) => { e.stopPropagation(); openViewer(item); });
    card.querySelector('.dl-btn').addEventListener('click', (e) => { e.stopPropagation(); downloadMedia(item); });
    card.querySelector('.del-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(item); });

    grid.appendChild(card);
  });
}

function openViewer(item) {
  currentViewingItem = item;
  const modal = document.getElementById('viewerModal');
  const title = document.getElementById('viewTitle');
  const view = document.getElementById('modalView');

  title.textContent = item.name;
  view.innerHTML = '';

  if (item.type === 'video') {
    const vid = document.createElement('video');
    vid.src = item.dataUrl;
    vid.controls = true;
    vid.autoplay = true;
    vid.playsInline = true;
    view.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = item.dataUrl;
    view.appendChild(img);
  }
  modal.classList.add('open');
}

document.getElementById('closeViewBtn').addEventListener('click', () => {
  const view = document.getElementById('modalView');
  const vid = view.querySelector('video');
  if (vid) vid.pause();
  document.getElementById('viewerModal').classList.remove('open');
});

function downloadMedia(item) {
  const a = document.createElement('a');
  a.href = item.dataUrl;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function confirmDelete(item) {
  if (!confirm('Are you sure you want to delete "' + item.name + '"?')) return;
  await deleteItem(item.id);
  if (currentViewingItem && currentViewingItem.id === item.id) {
    document.getElementById('closeViewBtn').click();
  }
  renderGallery();
}

document.getElementById('dlViewBtn').addEventListener('click', () => {
  if (currentViewingItem) downloadMedia(currentViewingItem);
});

document.getElementById('delViewBtn').addEventListener('click', () => {
  if (currentViewingItem) confirmDelete(currentViewingItem);
});

// Tab Filtering
document.querySelectorAll('.gal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.gal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderGallery();
  });
});

document.getElementById('openCamBtn').addEventListener('click', () => {
  window.parent.postMessage({ type: 'os:open-app', app: 'Camera' }, '*');
});
document.getElementById('emptyCamBtn').addEventListener('click', () => {
  window.parent.postMessage({ type: 'os:open-app', app: 'Camera' }, '*');
});
document.getElementById('refreshBtn').addEventListener('click', renderGallery);

// Unified App Action Handler for Gallery
window.executeAppAction = function(action, params = {}) {
  const act = (action || '').toUpperCase();
  if (act === 'FILTER_PHOTOS') {
    const tab = document.querySelector('.gal-tab[data-tab="photo"]');
    if (tab) tab.click();
  } else if (act === 'FILTER_VIDEOS') {
    const tab = document.querySelector('.gal-tab[data-tab="video"]');
    if (tab) tab.click();
  } else if (act === 'FILTER_ALL') {
    const tab = document.querySelector('.gal-tab[data-tab="all"]');
    if (tab) tab.click();
  } else if (act === 'OPEN_LATEST_PHOTO') {
    const photos = allItems.filter(i => i.type === 'photo');
    if (photos.length > 0) openViewer(photos[0]);
  } else if (act === 'PLAY_LATEST_VIDEO') {
    const vids = allItems.filter(i => i.type === 'video');
    if (vids.length > 0) openViewer(vids[0]);
  } else if (act === 'DELETE_CURRENT') {
    if (currentViewingItem) {
      confirmDelete(currentViewingItem);
    }
  } else if (act === 'REFRESH') {
    renderGallery();
  }
};

// Sync & Action listener from parent OS
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'os:action') {
    executeAppAction(e.data.action, e.data.params);
  } else if (e.data.type === 'os:media-updated' || e.data.type === 'os:media-saved' || e.data.type === 'os:media-deleted') {
    renderGallery();
  } else if (e.data.type === 'os:gallery-filter') {
    executeAppAction(e.data.filter === 'photo' ? 'FILTER_PHOTOS' : e.data.filter === 'video' ? 'FILTER_VIDEOS' : 'FILTER_ALL');
  } else if (e.data.type === 'os:delete-active-item') {
    executeAppAction('DELETE_CURRENT');
  }
});

renderGallery();
</script>
</body>
</html>`;
  }

  // 3. UPGRADED FILE MANAGER APP (With Virtual File System, Folders, & Integrated Editor)
  if (title.includes('file') || (title.includes('manager') && !title.includes('task'))) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #090d16;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}
.fm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.fm-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fm-title { font-size: 14px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px; }
.fm-actions { display: flex; gap: 6px; }
.fm-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.fm-btn:hover { background: #334155; color: #fff; }
.fm-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }
.fm-btn.primary:hover { background: #0369a1; }
.fm-btn.success { background: #059669; border-color: #059669; color: #fff; }
.fm-btn.success:hover { background: #047857; }

/* Breadcrumbs & Search */
.fm-subbar {
  padding: 8px 14px;
  background: #0c1220;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
  overflow-x: auto;
}
.crumb {
  cursor: pointer;
  color: #38bdf8;
  font-weight: 600;
  white-space: nowrap;
}
.crumb:hover { text-decoration: underline; }
.crumb-sep { color: #475569; }
.crumb.current { color: #f1f5f9; cursor: default; text-decoration: none; }
.search-input {
  background: #162035;
  border: 1px solid #28354f;
  color: #fff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  outline: none;
  width: 170px;
}
.search-input:focus { border-color: #38bdf8; }

/* File List Container */
.fm-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.fm-body::-webkit-scrollbar { width: 5px; }
.fm-body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

.item-row {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.item-row:hover {
  background: #182238;
  border-color: #38bdf8;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.item-icon { font-size: 20px; }
.item-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.item-name { font-size: 12px; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub { font-size: 10px; color: #64748b; display: flex; gap: 8px; }
.item-actions {
  display: flex;
  gap: 5px;
}
.mini-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.mini-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; }
.mini-btn.danger:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  gap: 10px;
  text-align: center;
  padding: 30px;
}
.empty-icon { font-size: 40px; opacity: 0.6; }

/* Integrated Editor View */
.editor-view {
  display: none;
  flex: 1;
  flex-direction: column;
  background: #090d16;
}
.editor-view.active { display: flex; }
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 10px;
}
.editor-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.filename-box {
  background: #162035;
  border: 1px solid #28354f;
  color: #38bdf8;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  width: 180px;
}
.filename-box:focus { border-color: #38bdf8; }
.editor-status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
.editor-status-pill.unsaved {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}
.editor-stats {
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 10px;
}
.editor-textarea {
  flex: 1;
  width: 100%;
  background: #090d16;
  color: #e2e8f0;
  border: none;
  padding: 14px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
}
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #0f172a;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* In-App Toast */
.fm-toast {
  position: absolute;
  bottom: 50px;
  right: 20px;
  background: #059669;
  color: #fff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: none;
  z-index: 99;
  animation: fadeIn 0.15s;
}
.fm-toast.error { background: #dc2626; }

/* In-App Dialog Modals */
.fm-modal {
  position: fixed;
  inset: 0;
  background: rgba(6, 9, 18, 0.85);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}
.fm-modal.open { display: flex; }
.fm-dialog-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}
.fm-dialog-title { font-size: 13px; font-weight: 700; color: #f8fafc; }
.fm-dialog-input {
  background: #162035;
  border: 1px solid #28354f;
  color: #fff;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
}
.fm-dialog-input:focus { border-color: #38bdf8; }
.fm-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
</head>
<body>
<!-- Header -->
<div class="fm-header">
  <div class="fm-title-group">
    <span style="font-size:18px;">📁</span>
    <span class="fm-title">FILE MANAGER</span>
  </div>
  <div class="fm-actions">
    <button class="fm-btn primary" id="newFileBtn">➕ New File</button>
    <button class="fm-btn" id="newFolderBtn">📁 New Folder</button>
    <button class="fm-btn" id="uploadBtn">⬆️ Upload</button>
    <button class="fm-btn" id="refreshBtn">🔄</button>
    <input type="file" id="fileUploadInput" multiple style="display:none;" />
  </div>
</div>

<!-- Breadcrumbs & Search -->
<div class="fm-subbar" id="subbar">
  <div class="breadcrumbs" id="breadcrumbs"></div>
  <input type="text" class="search-input" id="searchInput" placeholder="🔍 Search files..." />
</div>

<!-- File List View -->
<div class="fm-body" id="fileListView"></div>

<!-- Integrated Editor View -->
<div class="editor-view" id="editorView">
  <div class="editor-header">
    <div class="editor-title-wrap">
      <button class="fm-btn" id="editorBackBtn">⬅️ Files</button>
      <input type="text" class="filename-box" id="editorFilenameInput" value="untitled.txt" />
      <span class="editor-status-pill" id="editorStatusPill">Saved ✓</span>
    </div>
    <div class="editor-stats">
      <span id="editorChars">0 chars</span>
      <span id="editorWords">0 words</span>
    </div>
  </div>
  <textarea class="editor-textarea" id="editorTextarea" placeholder="Type your text or note here..."></textarea>
  <div class="editor-footer">
    <div style="display:flex; gap:8px;">
      <button class="fm-btn success" id="editorSaveBtn">💾 Save</button>
      <button class="fm-btn" id="editorSaveAsBtn">💾 Save As...</button>
      <button class="fm-btn" id="editorDownloadBtn">⬇️ Download</button>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="fm-btn primary" id="editorOpenNotepadBtn">📝 Open in Notepad</button>
      <button class="fm-btn" id="editorCloseBtn">✕ Close</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="fm-toast" id="fmToast"></div>

<!-- Input Dialog Modal -->
<div class="fm-modal" id="inputModal">
  <div class="fm-dialog-card">
    <div class="fm-dialog-title" id="inputModalTitle">Create File</div>
    <input type="text" class="fm-dialog-input" id="inputModalField" placeholder="Enter name..." />
    <div class="fm-dialog-actions">
      <button class="fm-btn" id="inputModalCancel">Cancel</button>
      <button class="fm-btn primary" id="inputModalOk">OK</button>
    </div>
  </div>
</div>

<!-- Confirm Dialog Modal -->
<div class="fm-modal" id="confirmModal">
  <div class="fm-dialog-card">
    <div class="fm-dialog-title" id="confirmModalTitle">Confirm Action</div>
    <div style="font-size:12px; color:#94a3b8;" id="confirmModalMsg">Are you sure?</div>
    <div class="fm-dialog-actions">
      <button class="fm-btn" id="confirmModalCancel">Cancel</button>
      <button class="fm-btn" style="background:#dc2626; color:#fff;" id="confirmModalOk">Delete</button>
    </div>
  </div>
</div>

<script>
const STORAGE_KEY = 'voice_os_files';
let currentFolderId = 'root';
let activeEditingFile = null;
let isEditorDirty = false;

function getItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [];
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.parent.postMessage({ type: 'os:files-updated' }, '*');
  } catch(e) {
    showToast('Storage error: unable to save changes.', true);
  }
}

function showToast(msg, isError = false) {
  const t = document.getElementById('fmToast');
  t.textContent = msg;
  t.className = 'fm-toast' + (isError ? ' error' : '');
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2400);
}

function showPrompt(title, defaultValue, cb) {
  const modal = document.getElementById('inputModal');
  const titleEl = document.getElementById('inputModalTitle');
  const inputEl = document.getElementById('inputModalField');
  const okBtn = document.getElementById('inputModalOk');
  const cancelBtn = document.getElementById('inputModalCancel');

  titleEl.textContent = title;
  inputEl.value = defaultValue || '';
  modal.classList.add('open');
  inputEl.focus();

  const cleanup = () => {
    modal.classList.remove('open');
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    inputEl.onkeydown = null;
  };

  okBtn.onclick = () => {
    const val = inputEl.value.trim();
    cleanup();
    if (val) cb(val);
  };
  cancelBtn.onclick = cleanup;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') okBtn.click();
    else if (e.key === 'Escape') cleanup();
  };
}

function showConfirm(title, msg, cb) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMsg').textContent = msg;
  modal.classList.add('open');

  const okBtn = document.getElementById('confirmModalOk');
  const cancelBtn = document.getElementById('confirmModalCancel');

  const cleanup = () => {
    modal.classList.remove('open');
    okBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  okBtn.onclick = () => { cleanup(); cb(); };
  cancelBtn.onclick = cleanup;
}

function render() {
  if (activeEditingFile) {
    document.getElementById('subbar').style.display = 'none';
    document.getElementById('fileListView').style.display = 'none';
    document.getElementById('editorView').classList.add('active');
    return;
  }

  document.getElementById('subbar').style.display = 'flex';
  document.getElementById('fileListView').style.display = 'flex';
  document.getElementById('editorView').classList.remove('active');

  renderBreadcrumbs();
  renderFileList();
}

function renderBreadcrumbs() {
  const bc = document.getElementById('breadcrumbs');
  bc.innerHTML = '';
  const items = getItems();

  const crumbs = [{ id: 'root', name: 'Root' }];
  let curr = currentFolderId;
  while (curr !== 'root') {
    const folder = items.find(i => i.id === curr && i.type === 'folder');
    if (folder) {
      crumbs.splice(1, 0, { id: folder.id, name: folder.name });
      curr = folder.parentId || 'root';
    } else {
      break;
    }
  }

  crumbs.forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '/';
      bc.appendChild(sep);
    }
    const span = document.createElement('span');
    span.className = 'crumb' + (idx === crumbs.length - 1 ? ' current' : '');
    span.textContent = crumb.name;
    if (idx !== crumbs.length - 1) {
      span.onclick = () => { currentFolderId = crumb.id; render(); };
    }
    bc.appendChild(span);
  });
}

function renderFileList() {
  const list = document.getElementById('fileListView');
  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const items = getItems();

  const inFolder = items.filter(i => {
    if (query) {
      return (i.name || '').toLowerCase().includes(query) || (i.content || '').toLowerCase().includes(query);
    }
    return (i.parentId || 'root') === currentFolderId;
  });

  // Sort folders first, then files
  inFolder.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  list.innerHTML = '';

  if (inFolder.length === 0) {
    list.innerHTML = '<div class="empty-state">' +
      '<div class="empty-icon">' + (query ? '🔍' : '📁') + '</div>' +
      '<div>' + (query ? 'No matching files found.' : 'This folder is empty.') + '</div>' +
      '<div style="display:flex; gap:8px;">' +
        '<button class="fm-btn primary" id="emptyNewFile">➕ New File</button>' +
        '<button class="fm-btn" id="emptyNewFolder">📁 New Folder</button>' +
      '</div>' +
    '</div>';
    const nf = document.getElementById('emptyNewFile');
    if (nf) nf.onclick = createNewFile;
    const nd = document.getElementById('emptyNewFolder');
    if (nd) nd.onclick = createNewFolder;
    return;
  }

  inFolder.forEach(item => {
    const isFolder = item.type === 'folder';
    const row = document.createElement('div');
    row.className = 'item-row';

    const icon = isFolder ? '📁' : '📄';
    const meta = isFolder
      ? 'Folder'
      : (item.size || '0 B') + ' • ' + (item.date || 'Recent');

    let actionsHtml = '';
    if (isFolder) {
      actionsHtml = '<button class="mini-btn open-btn">Open</button>' +
        '<button class="mini-btn rename-btn">🏷️</button>' +
        '<button class="mini-btn danger del-btn">🗑️</button>';
    } else {
      actionsHtml = '<button class="mini-btn open-btn">✏️ Edit</button>' +
        '<button class="mini-btn saveas-btn">💾 As</button>' +
        '<button class="mini-btn rename-btn">🏷️</button>' +
        '<button class="mini-btn dl-btn">⬇️</button>' +
        '<button class="mini-btn danger del-btn">🗑️</button>';
    }

    row.innerHTML = '<div class="item-left">' +
      '<div class="item-icon">' + icon + '</div>' +
      '<div class="item-meta">' +
        '<div class="item-name">' + item.name + '</div>' +
        '<div class="item-sub">' + meta + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="item-actions">' + actionsHtml + '</div>';

    const openItem = () => {
      if (isFolder) {
        currentFolderId = item.id;
        render();
      } else {
        openEditor(item);
      }
    };

    row.querySelector('.item-left').addEventListener('click', openItem);
    row.querySelector('.open-btn').addEventListener('click', (e) => { e.stopPropagation(); openItem(); });

    row.querySelector('.rename-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      renameItem(item);
    });

    row.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteItem(item);
    });

    if (!isFolder) {
      row.querySelector('.saveas-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        saveAsItem(item);
      });
      row.querySelector('.dl-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFile(item);
      });
    }

    list.appendChild(row);
  });
}

// Create New File
function createNewFile() {
  showPrompt('Create New File', 'new-note.txt', (name) => {
    if (!name) return;
    const cleanName = name.endsWith('.txt') ? name : (name + '.txt');
    const items = getItems();
    const newFile = {
      id: 'file-' + Date.now(),
      name: cleanName,
      type: 'file',
      parentId: currentFolderId,
      content: '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      size: '0 B',
      updatedAt: Date.now()
    };
    items.unshift(newFile);
    saveItems(items);
    showToast('File created successfully');
    openEditor(newFile);
  });
}

// Create New Folder
function createNewFolder() {
  showPrompt('Create New Folder', 'New Folder', (name) => {
    if (!name) return;
    const items = getItems();
    const newFolder = {
      id: 'folder-' + Date.now(),
      name: name,
      type: 'folder',
      parentId: currentFolderId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: Date.now()
    };
    items.unshift(newFolder);
    saveItems(items);
    showToast('Folder created successfully');
    render();
  });
}

// Rename
function renameItem(item) {
  showPrompt('Rename ' + (item.type === 'folder' ? 'Folder' : 'File'), item.name, (newName) => {
    if (!newName || newName === item.name) return;
    const items = getItems();
    const target = items.find(i => i.id === item.id);
    if (target) {
      target.name = newName;
      target.updatedAt = Date.now();
      saveItems(items);
      showToast('Renamed successfully');
      render();
    }
  });
}

// Delete
function deleteItem(item) {
  showConfirm('Delete ' + (item.type === 'folder' ? 'Folder' : 'File'), 'Are you sure you want to delete "' + item.name + '"?', () => {
    let items = getItems();
    if (item.type === 'folder') {
      // Recursively remove folder and its children
      const toDeleteIds = new Set([item.id]);
      let added = true;
      while (added) {
        added = false;
        items.forEach(i => {
          if (i.parentId && toDeleteIds.has(i.parentId) && !toDeleteIds.has(i.id)) {
            toDeleteIds.add(i.id);
            added = true;
          }
        });
      }
      items = items.filter(i => !toDeleteIds.has(i.id));
    } else {
      items = items.filter(i => i.id !== item.id);
    }
    saveItems(items);
    showToast('Item deleted successfully');
    render();
  });
}

// Download File
function downloadFile(file) {
  const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Save As
function saveAsItem(file) {
  showPrompt('Save As Copy', 'copy-' + file.name, (copyName) => {
    if (!copyName) return;
    const items = getItems();
    const copyFile = {
      ...file,
      id: 'file-' + Date.now(),
      name: copyName,
      updatedAt: Date.now()
    };
    items.unshift(copyFile);
    saveItems(items);
    showToast('Saved copy as "' + copyName + '"');
    render();
  });
}

// File Upload
document.getElementById('uploadBtn').addEventListener('click', () => {
  document.getElementById('fileUploadInput').click();
});

document.getElementById('fileUploadInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  let items = getItems();
  let loadedCount = 0;

  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const bytes = f.size;
      const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
      const fileObj = {
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: f.name,
        type: 'file',
        parentId: currentFolderId,
        content: text,
        size: sizeStr,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: Date.now()
      };
      items.unshift(fileObj);
      loadedCount++;
      if (loadedCount === files.length) {
        saveItems(items);
        showToast('Uploaded ' + files.length + ' file(s) successfully');
        render();
      }
    };
    reader.readAsText(f);
  });
  e.target.value = '';
});

// Editor Implementation
function openEditor(file) {
  activeEditingFile = file;
  isEditorDirty = false;
  document.getElementById('editorFilenameInput').value = file.name;
  document.getElementById('editorTextarea').value = file.content || '';
  updateEditorStats();
  updateEditorStatus(true);
  render();
}

function updateEditorStats() {
  const txt = document.getElementById('editorTextarea').value;
  document.getElementById('editorChars').textContent = txt.length + ' chars';
  const words = txt.trim() ? txt.trim().split(/\\s+/).length : 0;
  document.getElementById('editorWords').textContent = words + ' words';
}

function updateEditorStatus(isClean) {
  const pill = document.getElementById('editorStatusPill');
  if (isClean) {
    pill.textContent = 'Saved ✓';
    pill.className = 'editor-status-pill';
    isEditorDirty = false;
  } else {
    pill.textContent = 'Unsaved Changes *';
    pill.className = 'editor-status-pill unsaved';
    isEditorDirty = true;
  }
}

document.getElementById('editorTextarea').addEventListener('input', () => {
  updateEditorStats();
  updateEditorStatus(false);
});

document.getElementById('editorFilenameInput').addEventListener('input', () => {
  updateEditorStatus(false);
});

// Save in Editor
document.getElementById('editorSaveBtn').addEventListener('click', () => {
  saveCurrentEditorFile();
});

function saveCurrentEditorFile() {
  if (!activeEditingFile) return;
  const newName = (document.getElementById('editorFilenameInput').value || '').trim();
  if (!newName) {
    showToast('Unable to save file: Filename cannot be empty.', true);
    return;
  }
  if (/[\\\\/:*?"<>|]/.test(newName)) {
    showToast('Unable to save file: Invalid characters in filename.', true);
    return;
  }

  const newContent = document.getElementById('editorTextarea').value;
  const items = getItems();
  const target = items.find(i => i.id === activeEditingFile.id);

  if (!target) {
    showToast('Unable to save file: File not found in storage.', true);
    return;
  }

  const bytes = new Blob([newContent]).size;
  const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';

  target.name = newName;
  target.content = newContent;
  target.size = sizeStr;
  target.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  target.updatedAt = Date.now();

  activeEditingFile = { ...target };
  saveItems(items);
  updateEditorStatus(true);
  showToast('File saved successfully ✓');
  window.parent.postMessage({ type: 'os:file-saved', file: target }, '*');
}

// Save As in Editor
document.getElementById('editorSaveAsBtn').addEventListener('click', () => {
  if (!activeEditingFile) return;
  showPrompt('Save As', 'copy-' + activeEditingFile.name, (copyName) => {
    if (!copyName) return;
    const content = document.getElementById('editorTextarea').value;
    const bytes = new Blob([content]).size;
    const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
    const items = getItems();
    const newFile = {
      id: 'file-' + Date.now(),
      name: copyName,
      type: 'file',
      parentId: currentFolderId,
      content: content,
      size: sizeStr,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: Date.now()
    };
    items.unshift(newFile);
    saveItems(items);
    activeEditingFile = newFile;
    document.getElementById('editorFilenameInput').value = newFile.name;
    updateEditorStatus(true);
    showToast('Saved as "' + copyName + '" successfully ✓');
    window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
  });
});

// Download in Editor
document.getElementById('editorDownloadBtn').addEventListener('click', () => {
  if (!activeEditingFile) return;
  const currentName = document.getElementById('editorFilenameInput').value || activeEditingFile.name;
  const content = document.getElementById('editorTextarea').value;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Open in Notepad
document.getElementById('editorOpenNotepadBtn').addEventListener('click', () => {
  if (!activeEditingFile) return;
  window.parent.postMessage({
    type: 'os:open-file-in-notepad',
    file: {
      ...activeEditingFile,
      name: document.getElementById('editorFilenameInput').value,
      content: document.getElementById('editorTextarea').value
    }
  }, '*');
});

// Close Editor
function closeEditor() {
  if (isEditorDirty) {
    showConfirm('Unsaved Changes', 'You have unsaved changes. Discard them and return to file list?', () => {
      activeEditingFile = null;
      isEditorDirty = false;
      render();
    });
  } else {
    activeEditingFile = null;
    render();
  }
}

document.getElementById('editorBackBtn').addEventListener('click', closeEditor);
document.getElementById('editorCloseBtn').addEventListener('click', closeEditor);

// Top Buttons
document.getElementById('newFileBtn').addEventListener('click', createNewFile);
document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
document.getElementById('refreshBtn').addEventListener('click', render);
document.getElementById('searchInput').addEventListener('input', render);

// Unified App Action Handler for File Manager
window.executeAppAction = function(action, params = {}) {
  const act = (action || '').toUpperCase();
  if (act === 'CREATE_FILE') {
    if (params.filename) {
      const fname = params.filename.trim();
      const items = getItems();
      const newFile = {
        id: 'file-' + Date.now(),
        name: fname,
        type: 'file',
        parentId: currentFolderId,
        content: params.content || '',
        size: '0 B',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: Date.now()
      };
      items.unshift(newFile);
      saveItems(items);
      render();
      openEditor(newFile);
      showToast('File "' + fname + '" created ✓');
      window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
    } else {
      createNewFile();
    }
  } else if (act === 'CREATE_FOLDER') {
    if (params.folderName) {
      const fldName = params.folderName.trim();
      const items = getItems();
      const newFolder = {
        id: 'folder-' + Date.now(),
        name: fldName,
        type: 'folder',
        parentId: currentFolderId,
        updatedAt: Date.now()
      };
      items.push(newFolder);
      saveItems(items);
      render();
      showToast('Folder "' + fldName + '" created ✓');
      window.parent.postMessage({ type: 'os:files-updated' }, '*');
    } else {
      createNewFolder();
    }
  } else if (act === 'SAVE_FILE') {
    if (activeEditingFile) {
      saveCurrentEditorFile();
    }
  } else if (act === 'SAVE_FILE_AS') {
    const targetName = (params.filename || (activeEditingFile ? 'copy-' + activeEditingFile.name : 'notes.txt')).trim();
    const content = activeEditingFile ? document.getElementById('editorTextarea').value : '';
    const bytes = new Blob([content]).size;
    const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
    const items = getItems();

    const existingIdx = items.findIndex(i => i.name.toLowerCase() === targetName.toLowerCase());
    if (existingIdx !== -1 && params.overwrite) {
      items[existingIdx].content = content;
      items[existingIdx].size = sizeStr;
      items[existingIdx].updatedAt = Date.now();
      saveItems(items);
      activeEditingFile = items[existingIdx];
      document.getElementById('editorFilenameInput').value = targetName;
      updateEditorStatus(true);
      showToast('Replaced "' + targetName + '" ✓');
      window.parent.postMessage({ type: 'os:file-saved', file: items[existingIdx] }, '*');
    } else {
      const newFile = {
        id: 'file-' + Date.now(),
        name: targetName,
        type: 'file',
        parentId: currentFolderId,
        content: content,
        size: sizeStr,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: Date.now()
      };
      items.unshift(newFile);
      saveItems(items);
      activeEditingFile = newFile;
      document.getElementById('editorFilenameInput').value = newFile.name;
      updateEditorStatus(true);
      showToast('Saved as "' + targetName + '" ✓');
      window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
    }
  } else if (act === 'OPEN_FILE') {
    const allItems = getItems();
    const target = allItems.find(i => 
      i.type === 'file' && (
        i.id === params.fileId ||
        i.name.toLowerCase() === (params.filename || '').toLowerCase() ||
        i.name.toLowerCase().includes((params.filename || '').toLowerCase())
      )
    );
    if (target) openEditor(target);
  } else if (act === 'OPEN_FOLDER') {
    const allFolders = getItems();
    const targetFolder = allFolders.find(i =>
      i.type === 'folder' && (
        i.id === params.folderId ||
        i.name.toLowerCase() === (params.folderName || '').toLowerCase()
      )
    );
    if (targetFolder) {
      currentFolderId = targetFolder.id;
      render();
    }
  } else if (act === 'RENAME_FILE') {
    if (activeEditingFile && params.newName) {
      document.getElementById('editorFilenameInput').value = params.newName;
      saveCurrentEditorFile();
    }
  } else if (act === 'DELETE_FILE') {
    if (activeEditingFile) {
      deleteItem(activeEditingFile.id);
      closeEditor();
    } else if (params.filename) {
      const item = getItems().find(i => i.name.toLowerCase() === params.filename.toLowerCase());
      if (item) deleteItem(item.id);
    }
  } else if (act === 'DOWNLOAD_FILE') {
    if (activeEditingFile) {
      document.getElementById('editorDownloadBtn')?.click();
    }
  } else if (act === 'REFRESH') {
    render();
  } else if (act === 'GO_BACK') {
    if (activeEditingFile) {
      closeEditor();
    } else if (currentFolderId) {
      currentFolderId = null;
      render();
    }
  }
};

// Sync & Action listener from parent OS
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'os:action') {
    executeAppAction(e.data.action, e.data.params);
  } else if (e.data.type === 'os:files-updated' || e.data.type === 'os:file-saved') {
    if (!isEditorDirty) render();
  } else if (e.data.type === 'os:open-file') {
    executeAppAction('OPEN_FILE', { fileId: e.data.fileId, filename: e.data.fileName });
  } else if (e.data.type === 'os:create-file') {
    executeAppAction('CREATE_FILE', e.data.params || {});
  } else if (e.data.type === 'os:create-folder') {
    executeAppAction('CREATE_FOLDER', e.data.params || {});
  } else if (e.data.type === 'os:save-file') {
    executeAppAction('SAVE_FILE');
  }
});

render();
</script>
</body>
</html>`;
  }

  // 2. NOTEPAD APP (With File Manager Save & Voice Typing)
  if (title.includes('note') || title.includes('text') || title.includes('pad') || title.includes('write')) {
    const initNoteText = initialText ? JSON.stringify(initialText) : 'null';
    const initNoteName = initialFileName ? escapeHtml(initialFileName) : 'notes.txt';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #12131a;
  color: #f0f0f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
header {
  background: #1a1c26;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #282b3d;
  gap: 8px;
}
.title-tag {
  font-size: 13px;
  font-weight: 600;
  color: #7986cb;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.file-name-input {
  background: #161822;
  border: 1px solid #282b3d;
  color: #38bdf8;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  max-width: 150px;
  outline: none;
  font-family: inherit;
}
.file-name-input:focus { border-color: #38bdf8; }
.stats {
  font-size: 11px;
  color: #7e8299;
  display: flex;
  gap: 10px;
  white-space: nowrap;
}
.editor-wrap {
  flex: 1;
  padding: 12px;
  display: flex;
  position: relative;
}
textarea {
  width: 100%;
  height: 100%;
  background: #161822;
  color: #e2e8f0;
  border: 1px solid #282b3d;
  border-radius: 8px;
  padding: 14px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
textarea:focus {
  border-color: #5c6ac4;
  box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.2);
}
footer {
  background: #1a1c26;
  padding: 8px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #282b3d;
}
.footer-left { display: flex; gap: 8px; }
.footer-right { display: flex; gap: 8px; }
button {
  background: #2f334d;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
button:hover { background: #404566; }
button.primary { background: #0284c7; }
button.primary:hover { background: #0369a1; }
button.success { background: #059669; }
button.success:hover { background: #047857; }
</style>
</head>
<body>
<header>
<div style="display:flex; align-items:center; gap:8px;">
  <span class="title-tag">📝 NOTEPAD</span>
  <input type="text" class="file-name-input" id="fileNameInput" value="${initNoteName}" placeholder="filename.txt" />
</div>
<div class="stats">
  <span id="charCount">0 characters</span>
  <span id="wordCount">0 words</span>
</div>
</header>
<div class="editor-wrap">
<textarea id="noteArea" placeholder="Type your thoughts or speak 'write ...' to dictate here..."></textarea>
</div>
<footer>
<div class="footer-left">
  <button id="clearBtn">Clear</button>
</div>
<div class="footer-right">
  <button class="success" id="saveFileBtn">💾 Save to Files</button>
  <button id="copyBtn">📋 Copy</button>
</div>
</footer>
<script>
const area = document.getElementById('noteArea');
const fileNameInput = document.getElementById('fileNameInput');
const chars = document.getElementById('charCount');
const words = document.getElementById('wordCount');
const copyBtn = document.getElementById('copyBtn');
const saveFileBtn = document.getElementById('saveFileBtn');

const initialVal = ${initNoteText};
if (initialVal !== null) {
  area.value = initialVal;
  localStorage.setItem('os_notepad_val', initialVal);
  updateStats();
} else {
  const saved = localStorage.getItem('os_notepad_val');
  if (saved) {
    area.value = saved;
    updateStats();
  }
}

function updateStats() {
  const text = area.value;
  chars.textContent = text.length + ' characters';
  const w = text.trim() ? text.trim().split(/\\s+/).length : 0;
  words.textContent = w + ' words';
}

area.addEventListener('input', () => {
  localStorage.setItem('os_notepad_val', area.value);
  updateStats();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  area.value = '';
  localStorage.removeItem('os_notepad_val');
  updateStats();
  area.focus();
});

// Save to File Manager
saveFileBtn.addEventListener('click', saveNoteToFiles);

function saveNoteToFiles() {
  const text = area.value;
  let fileName = (fileNameInput.value || 'notes.txt').trim();
  if (!fileName.toLowerCase().endsWith('.txt')) fileName += '.txt';

  const bytes = new Blob([text]).size;
  const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
  const fileObj = {
    id: 'file-' + Date.now(),
    name: fileName,
    content: text,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    size: sizeStr
  };

  // Update voice_os_files in localStorage
  try {
    const raw = localStorage.getItem('voice_os_files');
    let files = raw ? JSON.parse(raw) : [];
    const existingIdx = files.findIndex(f => f.name.toLowerCase() === fileName.toLowerCase());
    if (existingIdx >= 0) {
      files[existingIdx] = fileObj;
    } else {
      files.unshift(fileObj);
    }
    localStorage.setItem('voice_os_files', JSON.stringify(files));
  } catch(e) {}

  // Post to parent OS
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'os:file-saved', file: fileObj }, '*');
  }

  saveFileBtn.textContent = 'Saved! ✓';
  setTimeout(() => { saveFileBtn.textContent = '💾 Save to Files'; }, 1600);
}

// Copy button
copyBtn.addEventListener('click', () => {
  const text = area.value;
  let copied = false;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'os:clipboard-copy', text: text }, '*');
  }
  try {
    area.select();
    copied = document.execCommand('copy');
    window.getSelection()?.removeAllRanges();
  } catch (e) {}
  if (!copied && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
});

// Message listener from parent OS
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'os:append-note-text') {
    const val = area.value ? (area.value + '\\n' + e.data.text) : e.data.text;
    area.value = val;
    localStorage.setItem('os_notepad_val', val);
    updateStats();
    area.scrollTop = area.scrollHeight;
  } else if (e.data.type === 'os:set-note-text') {
    area.value = e.data.text || '';
    localStorage.setItem('os_notepad_val', area.value);
    if (e.data.name) fileNameInput.value = e.data.name;
    updateStats();
  } else if (e.data.type === 'os:save-current-note') {
    saveNoteToFiles();
  } else if (e.data.type === 'os:save-note-as') {
    if (e.data.filename) fileNameInput.value = e.data.filename;
    saveNoteToFiles();
  } else if (e.data.type === 'os:set-note-name') {
    if (e.data.name) fileNameInput.value = e.data.name;
  }
});
</script>
</body>
</html>`;
  }

  if (title.includes('analogue') || title.includes('analog')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #10121a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.clock-case {
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: radial-gradient(circle, #1a1d2e 0%, #10121c 100%);
  border: 3px solid #2d334d;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6), inset 0 0 15px rgba(0,0,0,0.8);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dial {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
.hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: bottom center;
  border-radius: 4px;
}
.hour-hand {
  width: 5px;
  height: 58px;
  margin-left: -2.5px;
  background: #e2e8f0;
  z-index: 3;
}
.minute-hand {
  width: 3.5px;
  height: 82px;
  margin-left: -1.75px;
  background: #818cf8;
  z-index: 4;
}
.second-hand {
  width: 1.5px;
  height: 94px;
  margin-left: -0.75px;
  background: #f43f5e;
  z-index: 5;
}
.center-pin {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f43f5e;
  border: 2px solid #fff;
  position: absolute;
  z-index: 6;
}
.date-badge {
  margin-top: 14px;
  font-size: 13px;
  color: #94a3b8;
  letter-spacing: 1px;
  font-weight: 500;
  background: #181b28;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #262c42;
}
</style>
</head>
<body>
<div class="clock-case">
<svg class="dial" viewBox="0 0 240 240">
  <circle cx="120" cy="120" r="110" fill="none" stroke="#252b40" stroke-width="2"/>
  <g stroke="#64748b" stroke-width="2">
    <line x1="120" y1="18" x2="120" y2="30"/>
    <line x1="120" y1="210" x2="120" y2="222"/>
    <line x1="18" y1="120" x2="30" y2="120"/>
    <line x1="210" y1="120" x2="222" y2="120"/>
    <line x1="192" y1="48" x2="183" y2="57"/>
    <line x1="48" y1="192" x2="57" y2="183"/>
    <line x1="192" y1="192" x2="183" y2="183"/>
    <line x1="48" y1="48" x2="57" y2="57"/>
  </g>
  <text x="120" y="44" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">12</text>
  <text x="200" y="124" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">3</text>
  <text x="120" y="204" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">6</text>
  <text x="40" y="124" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">9</text>
</svg>
<div class="hand hour-hand" id="hour"></div>
<div class="hand minute-hand" id="minute"></div>
<div class="hand second-hand" id="second"></div>
<div class="center-pin"></div>
</div>
<div class="date-badge" id="dateText"></div>
<script>
function updateClock() {
  const now = new Date();
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  document.getElementById('second').style.transform = 'rotate(' + (s * 6) + 'deg)';
  document.getElementById('minute').style.transform = 'rotate(' + (m * 6) + 'deg)';
  document.getElementById('hour').style.transform = 'rotate(' + (h * 30) + 'deg)';
  document.getElementById('dateText').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function setDialColor(colorName) {
  const colorMap = {
    'neon green': '#39ff14', 'green': '#10b981', 'cyan': '#00e5ff',
    'neon pink': '#ff007f', 'pink': '#ff007f', 'blue': '#3b82f6',
    'orange': '#ff7700', 'red': '#ef4444', 'purple': '#a855f7',
    'white': '#ffffff', 'yellow': '#eab308', 'amber': '#f59e0b'
  };
  const c = colorMap[(colorName || '').toLowerCase().trim()] || colorName || '#f43f5e';
  const sHand = document.getElementById('second');
  const cPin = document.querySelector('.center-pin');
  if (sHand) sHand.style.background = c;
  if (cPin) cPin.style.background = c;
}

window.addEventListener('message', (e) => {
  if (!e.data) return;
  const msg = e.data;
  const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
  const params = msg.params || {};
  if (action === 'SET_COLOR' || action === 'SET_CLOCK_COLOR') {
    const clr = params.color || params.theme || 'neon green';
    setDialColor(clr);
  }
});

const savedClr = localStorage.getItem('os_clock_color');
if (savedClr) setDialColor(savedClr);

setInterval(updateClock, 1000);
updateClock();
</script>
</body>
</html>`;
  }

  if (title.includes('calc') || title.includes('math')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #12131a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; }
.screen { background: #1a1c26; border-radius: 10px; padding: 14px; margin-bottom: 12px; text-align: right; border: 1px solid #282b3d; }
.history { font-size: 12px; color: #7e8299; min-height: 16px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; }
.display { font-size: 28px; font-weight: 600; color: #64b5f6; word-break: break-all; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; }
button { background: #222533; border: 1px solid #2f3349; color: #f0f0f5; font-size: 16px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.1s ease; outline: none; }
button:hover { background: #2f334d; }
button:active { transform: scale(0.97); }
button.op { background: #2d314d; color: #82b1ff; font-weight: 600; }
button.op:hover { background: #3b4066; }
button.eq { background: #3949ab; color: #fff; grid-column: span 2; font-weight: 600; }
button.eq:hover { background: #303f9f; }
button.clear { color: #ff5252; }
</style>
</head>
<body>
<div class="screen">
<div class="history" id="history"></div>
<div class="display" id="display">0</div>
</div>
<div class="grid">
<button class="clear" onclick="clearCalc()">C</button>
<button onclick="backspace()">⌫</button>
<button class="op" onclick="appendOp('%')">%</button>
<button class="op" onclick="appendOp('/')">÷</button>
<button onclick="appendNum('7')">7</button>
<button onclick="appendNum('8')">8</button>
<button onclick="appendNum('9')">9</button>
<button class="op" onclick="appendOp('*')">×</button>
<button onclick="appendNum('4')">4</button>
<button onclick="appendNum('5')">5</button>
<button onclick="appendNum('6')">6</button>
<button class="op" onclick="appendOp('-')">−</button>
<button onclick="appendNum('1')">1</button>
<button onclick="appendNum('2')">2</button>
<button onclick="appendNum('3')">3</button>
<button class="op" onclick="appendOp('+')">+</button>
<button onclick="appendNum('0')">0</button>
<button onclick="appendNum('.')">.</button>
<button class="eq" onclick="calculate()">=</button>
</div>
<script>
let current = '0';
let history = '';
const disp = document.getElementById('display');
const hist = document.getElementById('history');
function update() { disp.textContent = current; hist.textContent = history; }
function appendNum(n) { if (current === '0' && n !== '.') current = n; else current += n; update(); }
function appendOp(op) { history = current + ' ' + op; current = '0'; update(); }
function clearCalc() { current = '0'; history = ''; update(); }
function backspace() { current = current.length > 1 ? current.slice(0, -1) : '0'; update(); }
function calculate() {
  try {
    const expr = (history + ' ' + current).replace(/÷/g, '/').replace(/×/g, '*');
    const res = Function('"use strict";return (' + expr + ')')();
    history = expr + ' =';
    current = String(Number(res.toFixed(8)));
    update();
  } catch(e) { current = 'Error'; update(); }
}
</script>
</body>
</html>`;
  }

  if (title.includes('clock') || title.includes('time') || title.includes('timer') || title.includes('stopwatch')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clock-color: #39ff14;
    --clock-glow: rgba(57, 255, 20, 0.45);
    --clock-glow-subtle: rgba(57, 255, 20, 0.15);
  }
  body {
    background: #0b0f19;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    overflow: hidden;
    user-select: none;
  }
  .clock-nav {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #111827;
    border: 1px solid #1f293d;
    border-radius: 8px;
    padding: 4px 8px;
  }
  .mode-switch {
    display: flex;
    gap: 4px;
    background: #1e293b;
    border-radius: 6px;
    padding: 2px;
  }
  .mode-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-btn.active {
    background: var(--clock-color);
    color: #0b0f19;
    box-shadow: 0 0 10px var(--clock-glow);
  }
  .color-label-badge {
    font-size: 11px;
    color: var(--clock-color);
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.5px;
  }
  .clock-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 0;
  }
  .digital-view {
    background: #111827;
    border: 2px solid var(--clock-color);
    border-radius: 16px;
    padding: 20px 28px;
    text-align: center;
    box-shadow: 0 0 25px var(--clock-glow-subtle), inset 0 0 15px rgba(0,0,0,0.5);
    transition: all 0.3s ease;
    width: 100%;
    max-width: 330px;
  }
  .digital-time {
    font-size: 42px;
    font-weight: 800;
    color: var(--clock-color);
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 2px;
    text-shadow: 0 0 15px var(--clock-glow), 0 0 30px var(--clock-glow);
    font-variant-numeric: tabular-nums;
  }
  .digital-ampm {
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 700;
    margin-left: 6px;
    letter-spacing: 1px;
  }
  .digital-date {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .digital-tz {
    display: inline-block;
    font-size: 10px;
    color: #64748b;
    margin-top: 8px;
    background: #1e293b;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #334155;
  }
  .analogue-view {
    display: none;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background: radial-gradient(circle, #1a2234 0%, #111827 100%);
    border: 3px solid var(--clock-color);
    box-shadow: 0 0 25px var(--clock-glow-subtle);
    position: relative;
    align-items: center;
    justify-content: center;
  }
  .dial-svg { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
  .hand {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform-origin: bottom center;
    border-radius: 4px;
  }
  .hour-hand { width: 4.5px; height: 50px; margin-left: -2.25px; background: #e2e8f0; z-index: 3; }
  .minute-hand { width: 3px; height: 70px; margin-left: -1.5px; background: #94a3b8; z-index: 4; }
  .second-hand { width: 2px; height: 80px; margin-left: -1px; background: var(--clock-color); z-index: 5; box-shadow: 0 0 6px var(--clock-color); }
  .center-pin { width: 10px; height: 10px; border-radius: 50%; background: var(--clock-color); border: 2px solid #fff; position: absolute; z-index: 6; }
  .color-bar {
    width: 100%;
    background: #111827;
    border: 1px solid #1f293d;
    border-radius: 8px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .color-bar-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
  .chips-wrap { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px; }
  .color-chip {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .color-chip:hover { transform: scale(1.15); }
  .color-chip.active { border-color: #fff; transform: scale(1.2); }
</style>
</head>
<body>
<div class="clock-nav">
  <div class="mode-switch">
    <button class="mode-btn active" id="modeDigital" onclick="switchMode('digital')">Digital</button>
    <button class="mode-btn" id="modeAnalogue" onclick="switchMode('analogue')">Analogue</button>
  </div>
  <div class="color-label-badge" id="colorBadge">Neon Green</div>
</div>

<div class="clock-viewport">
  <div class="digital-view" id="digitalView">
    <div class="digital-time"><span id="digiTime">00:00:00</span><span class="digital-ampm" id="digiAmpm">AM</span></div>
    <div class="digital-date" id="digiDate">Loading...</div>
    <div class="digital-tz" id="digiTz">Raipur (IST)</div>
  </div>

  <div class="analogue-view" id="analogueView">
    <svg class="dial-svg" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#1f293d" stroke-width="2"/>
      <g stroke="#475569" stroke-width="2">
        <line x1="100" y1="14" x2="100" y2="24"/>
        <line x1="100" y1="176" x2="100" y2="186"/>
        <line x1="14" y1="100" x2="24" y2="100"/>
        <line x1="176" y1="100" x2="186" y2="100"/>
      </g>
      <text x="100" y="38" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">12</text>
      <text x="170" y="104" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">3</text>
      <text x="100" y="172" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">6</text>
      <text x="30" y="104" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">9</text>
    </svg>
    <div class="hand hour-hand" id="aHour"></div>
    <div class="hand minute-hand" id="aMinute"></div>
    <div class="hand second-hand" id="aSecond"></div>
    <div class="center-pin"></div>
  </div>
</div>

<div class="color-bar">
  <span class="color-bar-label">Color:</span>
  <div class="chips-wrap" id="chipsWrap"></div>
</div>

<script>
  const COLOR_MAP = {
    'neon green': { hex: '#39ff14', glow: 'rgba(57, 255, 20, 0.5)', subtle: 'rgba(57, 255, 20, 0.15)' },
    'green': { hex: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', subtle: 'rgba(16, 185, 129, 0.15)' },
    'cyan': { hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.5)', subtle: 'rgba(0, 229, 255, 0.15)' },
    'neon cyan': { hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.5)', subtle: 'rgba(0, 229, 255, 0.15)' },
    'neon pink': { hex: '#ff007f', glow: 'rgba(255, 0, 127, 0.5)', subtle: 'rgba(255, 0, 127, 0.15)' },
    'pink': { hex: '#ff007f', glow: 'rgba(255, 0, 127, 0.5)', subtle: 'rgba(255, 0, 127, 0.15)' },
    'magenta': { hex: '#d946ef', glow: 'rgba(217, 70, 239, 0.5)', subtle: 'rgba(217, 70, 239, 0.15)' },
    'blue': { hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', subtle: 'rgba(59, 130, 246, 0.15)' },
    'electric blue': { hex: '#2563eb', glow: 'rgba(37, 99, 235, 0.5)', subtle: 'rgba(37, 99, 235, 0.15)' },
    'orange': { hex: '#ff7700', glow: 'rgba(255, 119, 0, 0.5)', subtle: 'rgba(255, 119, 0, 0.15)' },
    'sunset orange': { hex: '#ff7700', glow: 'rgba(255, 119, 0, 0.5)', subtle: 'rgba(255, 119, 0, 0.15)' },
    'amber': { hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', subtle: 'rgba(245, 158, 11, 0.15)' },
    'yellow': { hex: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', subtle: 'rgba(234, 179, 8, 0.15)' },
    'gold': { hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', subtle: 'rgba(245, 158, 11, 0.15)' },
    'red': { hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', subtle: 'rgba(239, 68, 68, 0.15)' },
    'crimson red': { hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', subtle: 'rgba(239, 68, 68, 0.15)' },
    'purple': { hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', subtle: 'rgba(168, 85, 247, 0.15)' },
    'violet': { hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)', subtle: 'rgba(139, 92, 246, 0.15)' },
    'white': { hex: '#ffffff', glow: 'rgba(255, 255, 255, 0.4)', subtle: 'rgba(255, 255, 255, 0.12)' },
    'lime': { hex: '#84cc16', glow: 'rgba(132, 204, 22, 0.5)', subtle: 'rgba(132, 204, 22, 0.15)' }
  };

  const CHIPS = ['neon green', 'cyan', 'neon pink', 'blue', 'orange', 'red', 'purple', 'white'];
  let activeColor = localStorage.getItem('os_clock_color') || 'neon green';
  let activeMode = localStorage.getItem('os_clock_mode') || 'digital';

  function applyColor(colorKey) {
    const norm = (colorKey || 'neon green').toLowerCase().trim();
    let theme = COLOR_MAP[norm];
    if (!theme) {
      theme = { hex: norm, glow: 'rgba(57, 255, 20, 0.4)', subtle: 'rgba(57, 255, 20, 0.15)' };
    }
    activeColor = norm;
    localStorage.setItem('os_clock_color', norm);

    document.documentElement.style.setProperty('--clock-color', theme.hex);
    document.documentElement.style.setProperty('--clock-glow', theme.glow);
    document.documentElement.style.setProperty('--clock-glow-subtle', theme.subtle);

    const badge = document.getElementById('colorBadge');
    if (badge) badge.textContent = norm;

    // Update active chip
    document.querySelectorAll('.color-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.color === norm);
    });
  }

  function renderChips() {
    const wrap = document.getElementById('chipsWrap');
    wrap.innerHTML = '';
    CHIPS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-chip' + (c === activeColor ? ' active' : '');
      btn.dataset.color = c;
      btn.style.background = COLOR_MAP[c].hex;
      btn.title = c;
      btn.onclick = () => applyColor(c);
      wrap.appendChild(btn);
    });
  }

  window.switchMode = function(mode) {
    activeMode = mode;
    localStorage.setItem('os_clock_mode', mode);
    document.getElementById('modeDigital').classList.toggle('active', mode === 'digital');
    document.getElementById('modeAnalogue').classList.toggle('active', mode === 'analogue');
    document.getElementById('digitalView').style.display = (mode === 'digital') ? 'block' : 'none';
    document.getElementById('analogueView').style.display = (mode === 'analogue') ? 'flex' : 'none';
  };

  function update() {
    const now = new Date();
    // Digital
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    document.getElementById('digiTime').textContent = hStr + ':' + m + ':' + s;
    document.getElementById('digiAmpm').textContent = ampm;
    document.getElementById('digiDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    
    // Analogue
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    const sElem = document.getElementById('aSecond');
    const mElem = document.getElementById('aMinute');
    const hElem = document.getElementById('aHour');
    if (sElem) sElem.style.transform = 'rotate(' + (sec * 6) + 'deg)';
    if (mElem) mElem.style.transform = 'rotate(' + (min * 6) + 'deg)';
    if (hElem) hElem.style.transform = 'rotate(' + (hr * 30) + 'deg)';
  }

  // Window message bridge for Voice Commands
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    const msg = e.data;
    const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
    const params = msg.params || {};

    if (action === 'SET_COLOR' || action === 'SET_CLOCK_COLOR') {
      const clr = params.color || params.theme || 'neon green';
      applyColor(clr);
    } else if (action === 'SWITCH_MODE') {
      const mode = params.mode || 'digital';
      switchMode(mode);
    }
  });

  renderChips();
  applyColor(activeColor);
  switchMode(activeMode);
  setInterval(update, 1000);
  update();
</script>
</body>
</html>`;
  }

  if (title.includes('todo') || title.includes('task') || title.includes('list')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #12131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
header { background: #1a1c26; padding: 12px 16px; border-bottom: 1px solid #282b3d; }
h2 { font-size: 14px; font-weight: 600; color: #82b1ff; text-transform: uppercase; letter-spacing: 0.5px; }
.input-bar { display: flex; padding: 10px 14px; gap: 8px; background: #161824; border-bottom: 1px solid #282b3d; }
input { flex: 1; background: #202333; border: 1px solid #2e334d; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
input:focus { border-color: #5c6ac4; }
button.add-btn { background: #3949ab; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
button.add-btn:hover { background: #303f9f; }
.list { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
.item { display: flex; align-items: center; justify-content: space-between; background: #1b1e2b; border: 1px solid #282c40; padding: 8px 12px; border-radius: 6px; }
.item.done span { text-decoration: line-through; color: #626782; }
.item-left { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.del-btn { background: none; border: none; color: #ff5252; cursor: pointer; font-size: 14px; opacity: 0.7; }
.del-btn:hover { opacity: 1; }
</style>
</head>
<body>
<header><h2>Voice OS Tasks</h2></header>
<div class="input-bar">
<input type="text" id="taskInput" placeholder="Add a new task..." />
<button class="add-btn" id="addBtn">Add</button>
</div>
<div class="list" id="taskList"></div>
<script>
let tasks = JSON.parse(localStorage.getItem('os_tasks') || '[]');
const list = document.getElementById('taskList');
const input = document.getElementById('taskInput');
function save() { localStorage.setItem('os_tasks', JSON.stringify(tasks)); render(); }
function render() {
  list.innerHTML = '';
  if (tasks.length === 0) {
    list.innerHTML = '<div style="color:#626782; text-align:center; padding:20px; font-size:12px;">No tasks yet. Type above to add.</div>';
    return;
  }
  tasks.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'item' + (t.done ? ' done' : '');
    d.innerHTML = \`<div class="item-left"><input type="checkbox" \${t.done ? 'checked' : ''} onchange="toggle(\${i})"><span>\${t.text}</span></div><button class="del-btn" onclick="del(\${i})">✕</button>\`;
    list.appendChild(d);
  });
}
function toggle(i) { tasks[i].done = !tasks[i].done; save(); }
function del(i) { tasks.splice(i, 1); save(); }
document.getElementById('addBtn').addEventListener('click', () => {
  if (input.value.trim()) { tasks.push({ text: input.value.trim(), done: false }); input.value = ''; save(); }
});
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('addBtn').click(); });
render();
</script>
</body>
</html>`;
  }

  if (title.includes('snake') || title.includes('game')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0b0e17;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.header-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.game-title {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.scores-group {
  display: flex;
  gap: 12px;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
  font-size: 13px;
}
.score-val { color: #10b981; }
.high-val { color: #f59e0b; }
.sound-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;
}
.speed-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  font-size: 11px;
}
.speed-pills {
  display: flex;
  gap: 4px;
}
.speed-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.speed-pill.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}
.canvas-container {
  position: relative;
  width: 320px;
  height: 320px;
  border: 2px solid #1e293b;
  border-radius: 10px;
  overflow: hidden;
  background: #090c15;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.12);
}
canvas {
  display: block;
  width: 320px;
  height: 320px;
}
.overlay-modal {
  position: absolute;
  inset: 0;
  background: rgba(10, 14, 26, 0.88);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 20px;
  z-index: 10;
}
.overlay-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.overlay-title.over { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
.overlay-title.start { color: #38bdf8; text-shadow: 0 0 12px rgba(56, 189, 248, 0.4); }
.overlay-title.pause { color: #f59e0b; text-shadow: 0 0 12px rgba(245, 158, 11, 0.4); }
.overlay-sub {
  font-size: 12px;
  color: #94a3b8;
  max-width: 240px;
  line-height: 1.4;
}
.overlay-stat {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}
.badge-record {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.action-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}
.action-btn:active {
  transform: translateY(1px);
}
.bottom-controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  gap: 8px;
}
.aux-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.aux-btn {
  background: #1e2438;
  border: 1px solid #303b5c;
  color: #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.aux-btn:hover { background: #27314d; color: #fff; }
.d-pad-wrap {
  display: grid;
  grid-template-columns: repeat(3, 40px);
  grid-template-rows: repeat(3, 34px);
  gap: 5px;
  justify-content: center;
}
.pad-btn {
  background: #1a2035;
  border: 1px solid #2e3a59;
  color: #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.1s ease;
}
.pad-btn:active, .pad-btn.pressed {
  background: #10b981;
  color: #fff;
  transform: scale(0.95);
}
.pad-center {
  background: #121828;
  font-size: 11px;
  color: #64748b;
}
.voice-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 2px 8px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}
</style>
</head>
<body>
<div class="header-bar">
<div class="title-group">
  <span class="game-title">🐍 RETRO SNAKE</span>
  <span class="voice-badge" id="voiceStatusBadge">🎙️ VOICE LIVE</span>
  <button class="sound-btn" id="soundBtn" title="Toggle Sound">🔊</button>
</div>
<div class="scores-group">
  <span>SCORE: <span class="score-val" id="score">0</span></span>
  <span>HIGH: <span class="high-val" id="high">0</span></span>
</div>
</div>

<div class="speed-bar">
<span style="color:#64748b;">SPEED:</span>
<div class="speed-pills">
  <button class="speed-pill active" id="pillVoice" data-speed="145">🎙️ VOICE (145ms)</button>
  <button class="speed-pill" id="pillCasual" data-speed="100">⚡ CASUAL (100ms)</button>
  <button class="speed-pill" id="pillSpeed" data-speed="70">🔥 SPEED (70ms)</button>
</div>
<span style="color:#34d399; font-size:10px; font-weight:600;">Say "Up", "Down", "Left", "Right"</span>
</div>

<div class="canvas-container">
<canvas id="game" width="320" height="320"></canvas>

<!-- Start Overlay -->
<div class="overlay-modal" id="startOverlay">
  <div class="overlay-title start">🐍 VOICE ARCADE SNAKE</div>
  <div class="overlay-sub">Steer by speaking "Up", "Down", "Left", "Right"! Say "Start" to play.</div>
  <button class="action-btn" id="startBtn">START GAME (or say "Start")</button>
</div>

<!-- Pause Overlay -->
<div class="overlay-modal" id="pauseOverlay" style="display:none;">
  <div class="overlay-title pause">⏸️ PAUSED</div>
  <div class="overlay-sub">Press Space or P to resume</div>
  <button class="action-btn" id="resumeBtn">RESUME</button>
</div>

<!-- Game Over Overlay -->
<div class="overlay-modal" id="overOverlay" style="display:none;">
  <div class="overlay-title over">💀 GAME OVER</div>
  <div class="overlay-stat" id="overScoreText">Score: 0</div>
  <div id="newHighBadge" class="badge-record" style="display:none;">🏆 NEW HIGH SCORE!</div>
  <button class="action-btn" id="restartBtn">PLAY AGAIN</button>
</div>
</div>

<div class="bottom-controls">
<div class="aux-btns">
  <button class="aux-btn" id="togglePauseBtn">⏸️ Pause</button>
  <button class="aux-btn" id="quickRestartBtn">🔄 Reset</button>
</div>
<div class="d-pad-wrap">
  <div></div>
  <button class="pad-btn" id="btnUp" aria-label="Up">▲</button>
  <div></div>
  <button class="pad-btn" id="btnLeft" aria-label="Left">◀</button>
  <div class="pad-btn pad-center" id="btnCenter">●</div>
  <button class="pad-btn" id="btnRight" aria-label="Right">▶</button>
  <div></div>
  <button class="pad-btn" id="btnDown" aria-label="Down">▼</button>
  <div></div>
</div>
</div>

<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = 16;
const cols = 20; // 320 / 16
const rows = 20; // 320 / 16

// Sound Engine using Web Audio API
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(type) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'bonus') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.05);
      osc.frequency.setValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'turn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.28);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch(e) {}
}

// Sound toggle button
const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) initAudio();
});

// State
let gameState = 'START';
let snake = [];
let currentDir = { x: 1, y: 0 };
let inputQueue = [];
let food = { x: 14, y: 10 };
let bonusFood = null;
let bonusTimer = null;
let applesEaten = 0;
let score = 0;
let high = parseInt(localStorage.getItem('voice_os_snake_high') || '0', 10);
document.getElementById('high').textContent = high;
let baseSpeed = 145;
let stepInterval = 145;
let lastTickTime = 0;
let animId = null;
let particles = [];

// Speed selector pills
document.querySelectorAll('.speed-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    baseSpeed = parseInt(btn.dataset.speed, 10) || 145;
    stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
  });
});

function queueDir(d) {
  if (gameState === 'START') {
    startGame();
    if (d === 'UP') currentDir = { x: 0, y: -1 };
    else if (d === 'DOWN') currentDir = { x: 0, y: 1 };
    else if (d === 'LEFT') currentDir = { x: -1, y: 0 };
    else if (d === 'RIGHT') currentDir = { x: 1, y: 0 };
    return;
  }
  if (gameState === 'PAUSED') {
    resumeGame();
  }
  if (gameState !== 'PLAYING') return;

  const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : currentDir;
  let target = null;
  if (d === 'UP' && last.y === 0) target = { x: 0, y: -1 };
  else if (d === 'DOWN' && last.y === 0) target = { x: 0, y: 1 };
  else if (d === 'LEFT' && last.x === 0) target = { x: -1, y: 0 };
  else if (d === 'RIGHT' && last.x === 0) target = { x: 1, y: 0 };

  if (target && inputQueue.length < 2) {
    inputQueue.push(target);
    playTone('turn');
  }
}

function spawnFood() {
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 200) {
    attempts++;
    const rx = Math.floor(Math.random() * cols);
    const ry = Math.floor(Math.random() * rows);
    if (!snake.some(s => s.x === rx && s.y === ry)) {
      food = { x: rx, y: ry };
      valid = true;
    }
  }
}

function spawnBonus() {
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 200) {
    attempts++;
    const rx = Math.floor(Math.random() * cols);
    const ry = Math.floor(Math.random() * rows);
    if (!snake.some(s => s.x === rx && s.y === ry) && !(food.x === rx && food.y === ry)) {
      bonusFood = { x: rx, y: ry, expires: Date.now() + 7000 };
      valid = true;
    }
  }
  clearTimeout(bonusTimer);
  bonusTimer = setTimeout(() => {
    bonusFood = null;
  }, 7000);
}

function addExplosion(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const speed = 1.2 + Math.random() * 2.2;
    particles.push({
      x: x * grid + grid / 2,
      y: y * grid + grid / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color: color || '#10b981'
    });
  }
}

function tick() {
  if (inputQueue.length > 0) {
    currentDir = inputQueue.shift();
  }

  const head = { x: snake[0].x + currentDir.x, y: snake[0].y + currentDir.y };

  // Wall collision
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    gameOver();
    return;
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  // Food collision
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    applesEaten++;
    document.getElementById('score').textContent = score;
    stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
    if (score > high) {
      high = score;
      localStorage.setItem('voice_os_snake_high', high);
      document.getElementById('high').textContent = high;
    }
    playTone('eat');
    addExplosion(food.x, food.y, '#34d399');
    spawnFood();

    if (applesEaten % 5 === 0) {
      spawnBonus();
    }
  } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
    score += 30;
    document.getElementById('score').textContent = score;
    stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
    if (score > high) {
      high = score;
      localStorage.setItem('voice_os_snake_high', high);
      document.getElementById('high').textContent = high;
    }
    playTone('bonus');
    addExplosion(bonusFood.x, bonusFood.y, '#f59e0b');
    bonusFood = null;
    clearTimeout(bonusTimer);
  } else {
    snake.pop();
  }
}

function gameOver() {
  gameState = 'GAMEOVER';
  playTone('die');
  addExplosion(snake[0].x, snake[0].y, '#ef4444');
  document.getElementById('overScoreText').textContent = 'Score: ' + score;
  const newBadge = document.getElementById('newHighBadge');
  if (score >= high && score > 0) {
    newBadge.style.display = 'inline-block';
  } else {
    newBadge.style.display = 'none';
  }
  document.getElementById('overOverlay').style.display = 'flex';
}

function startGame() {
  initAudio();
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  currentDir = { x: 1, y: 0 };
  inputQueue = [];
  score = 0;
  applesEaten = 0;
  bonusFood = null;
  clearTimeout(bonusTimer);
  document.getElementById('score').textContent = '0';
  spawnFood();
  gameState = 'PLAYING';
  document.getElementById('startOverlay').style.display = 'none';
  document.getElementById('pauseOverlay').style.display = 'none';
  document.getElementById('overOverlay').style.display = 'none';
  document.getElementById('togglePauseBtn').textContent = '⏸️ Pause';
  lastTickTime = performance.now();
}

function pauseGame() {
  if (gameState !== 'PLAYING') return;
  gameState = 'PAUSED';
  playTone('turn');
  document.getElementById('pauseOverlay').style.display = 'flex';
  document.getElementById('togglePauseBtn').textContent = '▶️ Resume';
}

function resumeGame() {
  if (gameState !== 'PAUSED') return;
  gameState = 'PLAYING';
  playTone('turn');
  document.getElementById('pauseOverlay').style.display = 'none';
  document.getElementById('togglePauseBtn').textContent = '⏸️ Pause';
  lastTickTime = performance.now();
}

function togglePause() {
  if (gameState === 'PLAYING') pauseGame();
  else if (gameState === 'PAUSED') resumeGame();
  else if (gameState === 'START' || gameState === 'GAMEOVER') startGame();
}

// Draw loop
function draw() {
  ctx.fillStyle = '#090c15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * grid, 0);
    ctx.lineTo(c * grid, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * grid);
    ctx.lineTo(canvas.width, r * grid);
    ctx.stroke();
  }

  // Regular Food (Apple with pulsing glow & leaf)
  const foodX = food.x * grid + grid / 2;
  const foodY = food.y * grid + grid / 2;
  const pulse = Math.sin(Date.now() / 150) * 1.5;

  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(foodX, foodY, grid / 2 - 2 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Leaf
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.ellipse(foodX + 2, foodY - (grid / 2 - 2), 3, 2, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bonus Food (Golden Apple)
  if (bonusFood) {
    const bX = bonusFood.x * grid + grid / 2;
    const bY = bonusFood.y * grid + grid / 2;
    const bPulse = Math.sin(Date.now() / 90) * 2;
    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(bX, bY, grid / 2 - 1 + bPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', bX, bY);
    ctx.restore();
  }

  // Snake Body & Head
  snake.forEach((s, i) => {
    ctx.save();
    const x = s.x * grid;
    const y = s.y * grid;
    const isHead = i === 0;

    if (isHead) {
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, grid - 2, grid - 2, 5);
      ctx.fill();

      // Eyes that look in current moving direction
      let eye1 = { x: x + 4, y: y + 4 };
      let eye2 = { x: x + 12, y: y + 4 };

      if (currentDir.x === 1) { // Right
        eye1 = { x: x + 11, y: y + 4 };
        eye2 = { x: x + 11, y: y + 12 };
      } else if (currentDir.x === -1) { // Left
        eye1 = { x: x + 5, y: y + 4 };
        eye2 = { x: x + 5, y: y + 12 };
      } else if (currentDir.y === 1) { // Down
        eye1 = { x: x + 4, y: y + 11 };
        eye2 = { x: x + 12, y: y + 11 };
      } else if (currentDir.y === -1) { // Up
        eye1 = { x: x + 4, y: y + 5 };
        eye2 = { x: x + 12, y: y + 5 };
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eye1.x, eye1.y, 2, 0, Math.PI * 2);
      ctx.arc(eye2.x, eye2.y, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eye1.x + currentDir.x * 0.7, eye1.y + currentDir.y * 0.7, 1, 0, Math.PI * 2);
      ctx.arc(eye2.x + currentDir.x * 0.7, eye2.y + currentDir.y * 0.7, 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#059669';
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, grid - 3, grid - 3, 3);
      ctx.fill();
    }
    ctx.restore();
  });

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Animation Frame Loop
function gameLoop(now) {
  if (gameState === 'PLAYING') {
    if (now - lastTickTime >= stepInterval) {
      tick();
      lastTickTime = now;
    }
  }
  draw();
  animId = requestAnimationFrame(gameLoop);
}

// Input Mapping
function handleInput(key, code) {
  const k = (key || '').toLowerCase();
  const c = (code || '').toLowerCase();

  if (k === 'arrowup' || k === 'w' || c === 'arrowup' || c === 'keyw') queueDir('UP');
  else if (k === 'arrowdown' || k === 's' || c === 'arrowdown' || c === 'keys') queueDir('DOWN');
  else if (k === 'arrowleft' || k === 'a' || c === 'arrowleft' || c === 'keya') queueDir('LEFT');
  else if (k === 'arrowright' || k === 'd' || c === 'arrowright' || c === 'keyd') queueDir('RIGHT');
  else if (k === ' ' || k === 'space' || k === 'p' || c === 'space' || c === 'keyp') togglePause();
  else if (k === 'r' || k === 'enter' || c === 'keyr' || c === 'enter') {
    if (gameState === 'GAMEOVER' || gameState === 'START') startGame();
  }
}

// Native keyboard listener inside iframe
window.addEventListener('keydown', (e) => {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  if (scrollKeys.includes(e.code) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes((e.key || '').toLowerCase())) {
    e.preventDefault();
  }
  handleInput(e.key, e.code);
});

function flashDPad(dir) {
  const idMap = { 'UP': 'btnUp', 'DOWN': 'btnDown', 'LEFT': 'btnLeft', 'RIGHT': 'btnRight' };
  const btn = document.getElementById(idMap[dir]);
  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 200);
  }
}

// Unified App Action Handler for Snake Game
window.executeAppAction = function(action, params = {}) {
  const act = (action || '').toUpperCase();
  if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(act)) {
    queueDir(act);
    flashDPad(act);
  } else if (act.startsWith('MOVE_')) {
    const d = act.replace('MOVE_', '');
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d)) {
      queueDir(d);
      flashDPad(d);
    }
  } else if (act === 'SNAKE_MOVE' || act === 'MOVE') {
    const d = (params.direction || '').toUpperCase();
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d)) {
      queueDir(d);
      flashDPad(d);
    }
  } else if (act === 'SNAKE_START' || act === 'START' || act === 'START_GAME' || act === 'PLAY') {
    startGame();
  } else if (act === 'SNAKE_PAUSE' || act === 'PAUSE' || act === 'PAUSE_GAME') {
    pauseGame();
  } else if (act === 'SNAKE_RESUME' || act === 'RESUME' || act === 'RESUME_GAME') {
    resumeGame();
  } else if (act === 'SNAKE_RESTART' || act === 'RESTART' || act === 'RESTART_GAME' || act === 'RESET') {
    startGame();
  }
};

// Message listener from parent Voice OS
window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'os:action') {
    executeAppAction(e.data.action, e.data.params);
  } else if (e.data.type === 'os:game-key') {
    handleInput(e.data.key, e.data.code);
  } else if (e.data.type === 'os:snake-action') {
    executeAppAction(e.data.action, e.data.params);
  }
});

// Signal ready to parent Voice OS
try {
  window.parent.postMessage({ type: 'os:snake-ready' }, '*');
} catch(e) {}

// Overlay button listeners
document.getElementById('startBtn').addEventListener('click', () => executeAppAction('SNAKE_START'));
document.getElementById('resumeBtn').addEventListener('click', () => executeAppAction('SNAKE_RESUME'));
document.getElementById('restartBtn').addEventListener('click', () => executeAppAction('SNAKE_RESTART'));
document.getElementById('togglePauseBtn').addEventListener('click', togglePause);
document.getElementById('quickRestartBtn').addEventListener('click', () => executeAppAction('SNAKE_RESTART'));

// D-Pad listeners
document.getElementById('btnUp').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'UP' }));
document.getElementById('btnDown').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'DOWN' }));
document.getElementById('btnLeft').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'LEFT' }));
document.getElementById('btnRight').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'RIGHT' }));
document.getElementById('btnCenter').addEventListener('click', togglePause);

// Initialize initial board
snake = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 }
];
spawnFood();
animId = requestAnimationFrame(gameLoop);
</script>
</body>
</html>`;
  }

  if (title.includes('music') || title.includes('player') || title.includes('audio') || title.includes('song')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0f111a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; overflow: hidden; user-select: none; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2438; padding-bottom: 6px; margin-bottom: 8px; }
.title { font-size: 13px; font-weight: 600; color: #818cf8; }
.visualizer { height: 60px; background: #141724; border-radius: 8px; display: flex; align-items: flex-end; justify-content: center; gap: 4px; padding: 6px; border: 1px solid #23283e; margin-bottom: 8px; }
.bar { width: 8px; background: linear-gradient(to top, #4f46e5, #06b6d4); border-radius: 3px; height: 6px; transition: height 0.08s ease; }
.track-info { text-align: center; margin-bottom: 8px; }
.track-title { font-size: 14px; font-weight: 600; color: #f1f5f9; }
.track-artist { font-size: 11px; color: #64748b; margin-top: 1px; }
.progress-wrap { margin-bottom: 8px; }
.bar-bg { width: 100%; height: 5px; background: #1e2438; border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; width: 35%; background: #6366f1; border-radius: 99px; }
.controls { display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 8px; }
.btn-round { width: 40px; height: 40px; border-radius: 50%; background: #4f46e5; border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-round:hover { background: #4338ca; }
.btn-sm { width: 30px; height: 30px; border-radius: 50%; background: #1e2438; border: 1px solid #2d3752; color: #cbd5e1; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.playlist { flex: 1; background: #141724; border-radius: 8px; border: 1px solid #23283e; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 3px; }
.track-item { padding: 6px 8px; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between; cursor: pointer; background: #1a1e2e; }
.track-item.active { background: #2e3552; color: #a5b4fc; font-weight: 600; border-left: 3px solid #6366f1; }
</style>
</head>
<body>
<div class="header">
<span class="title">🎵 SYNTH MUSIC PLAYER</span>
<span style="font-size:11px; color:#10b981;">● Online</span>
</div>
<div class="visualizer" id="vis">
<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
</div>
<div class="track-info">
<div class="track-title" id="tTitle">Neon Rain</div>
<div class="track-artist">Lo-Fi Cyber Chill</div>
</div>
<div class="progress-wrap">
<div class="bar-bg"><div class="bar-fill" id="pFill"></div></div>
</div>
<div class="controls">
<button class="btn-sm" onclick="prevTrack()">⏮</button>
<button class="btn-round" id="playBtn" onclick="togglePlay()">▶</button>
<button class="btn-sm" onclick="nextTrack()">⏭</button>
</div>
<div class="playlist" id="plist"></div>
<script>
const tracks = [
  { title: 'Neon Rain', artist: 'Lo-Fi Chill', chord: [261.63, 329.63, 392.00] },
  { title: 'Cyber Orbit', artist: 'Space Ambient', chord: [220.00, 277.18, 329.63] },
  { title: 'Night Drive', artist: 'Synthwave Dream', chord: [174.61, 220.00, 261.63] },
  { title: 'Retro Wave', artist: 'Synthpop Groove', chord: [196.00, 246.94, 293.66] },
  { title: 'Solar Wind', artist: 'Cosmic Ambient', chord: [164.81, 220.00, 293.66] }
];
let cur = 0;
let isPlaying = false;
let audioCtx = null;
let oscs = [];
let visTimer = null;
let prog = 0;

function renderList() {
  const pl = document.getElementById('plist');
  pl.innerHTML = '';
  tracks.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'track-item' + (i === cur ? ' active' : '');
    d.innerHTML = '<span>' + t.title + '</span><span style="color:#64748b;">' + t.artist + '</span>';
    d.onclick = () => { cur = i; loadTrack(); if (isPlaying) playSound(); };
    pl.appendChild(d);
  });
}

function loadTrack() {
  document.getElementById('tTitle').textContent = tracks[cur].title;
  renderList();
}

function playSound() {
  stopSound();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const chord = tracks[cur].chord;
  oscs = chord.map(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    return osc;
  });
  animateVis(true);
}

function stopSound() {
  oscs.forEach(o => { try { o.stop(); } catch(e) {} });
  oscs = [];
  if (audioCtx) { try { audioCtx.close(); } catch(e) {} audioCtx = null; }
  animateVis(false);
}

function animateVis(active) {
  const bars = document.querySelectorAll('.bar');
  if (visTimer) clearInterval(visTimer);
  if (active) {
    visTimer = setInterval(() => {
      bars.forEach(b => {
        b.style.height = (Math.random() * 45 + 8) + 'px';
      });
      prog = (prog + 0.8) % 100;
      document.getElementById('pFill').style.width = prog + '%';
    }, 90);
  } else {
    bars.forEach(b => b.style.height = '6px');
  }
}

window.togglePlay = function() {
  isPlaying = !isPlaying;
  const btn = document.getElementById('playBtn');
  if (isPlaying) {
    btn.textContent = '⏸';
    playSound();
  } else {
    btn.textContent = '▶';
    stopSound();
  }
};
window.nextTrack = function() { cur = (cur + 1) % tracks.length; loadTrack(); if (isPlaying) playSound(); };
window.prevTrack = function() { cur = (cur - 1 + tracks.length) % tracks.length; loadTrack(); if (isPlaying) playSound(); };

// Voice Command & OS Action Bridge
window.addEventListener('message', (e) => {
  if (!e.data) return;
  const msg = e.data;
  const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
  const params = msg.params || {};

  if (action === 'PLAY_SONG') {
    const q = (params.title || params.song || '').toLowerCase().trim();
    let foundIdx = -1;
    if (q) {
      foundIdx = tracks.findIndex(t => t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()));
    }
    if (foundIdx >= 0) {
      cur = foundIdx;
    }
    loadTrack();
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    playSound();
  } else if (action === 'PAUSE_MUSIC' || action === 'PAUSE') {
    if (isPlaying) {
      isPlaying = false;
      document.getElementById('playBtn').textContent = '▶';
      stopSound();
    }
  } else if (action === 'RESUME_MUSIC' || action === 'PLAY_MUSIC' || action === 'RESUME') {
    if (!isPlaying) {
      isPlaying = true;
      document.getElementById('playBtn').textContent = '⏸';
      playSound();
    }
  } else if (action === 'NEXT_SONG' || action === 'NEXT') {
    nextTrack();
  } else if (action === 'PREV_SONG' || action === 'PREV') {
    prevTrack();
  }
});

loadTrack();
</script>
</body>
</html>`;
  }

  if (title.includes('manager') || title.includes('process') || title.includes('system')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0f111a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2438; padding-bottom: 8px; margin-bottom: 10px; }
.title { font-size: 13px; font-weight: 600; color: #38bdf8; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.stat-card { background: #141724; border: 1px solid #23283e; border-radius: 6px; padding: 8px; text-align: center; }
.stat-val { font-size: 15px; font-weight: 700; color: #38bdf8; font-family: monospace; }
.stat-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
.table-wrap { flex: 1; background: #141724; border: 1px solid #23283e; border-radius: 6px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
th { background: #181d2e; padding: 8px 10px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #23283e; position: sticky; top: 0; }
td { padding: 8px 10px; border-bottom: 1px solid #1a1f33; color: #e2e8f0; }
tr:hover { background: #1a1e30; }
.badge { background: #065f46; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
.btn-kill { background: #ef4444; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
.btn-kill:hover { background: #dc2626; }
</style>
</head>
<body>
<div class="header">
<span class="title">⚡ VOICE OS TASK MANAGER</span>
<span style="font-size:11px; color:#94a3b8;" id="procCount">5 Processes Active</span>
</div>
<div class="stats-grid">
<div class="stat-card"><div class="stat-val" id="cpuVal">14%</div><div class="stat-lbl">CPU Load</div></div>
<div class="stat-card"><div class="stat-val">1.2 GB</div><div class="stat-lbl">RAM Usage</div></div>
<div class="stat-card"><div class="stat-val">Online</div><div class="stat-lbl">Kernel</div></div>
</div>
<div class="table-wrap">
<table>
  <thead><tr><th>App / Process</th><th>Status</th><th>Memory</th><th>Action</th></tr></thead>
  <tbody id="rows">
    <tr><td>📝 Notepad</td><td><span class="badge">Active</span></td><td>18 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
    <tr><td>🕒 Analogue Clock</td><td><span class="badge">Running</span></td><td>12 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
    <tr><td>🐍 Snake Game</td><td><span class="badge">Running</span></td><td>24 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
    <tr><td>🎵 Music Player</td><td><span class="badge">Running</span></td><td>31 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
    <tr><td>⚡ Task Manager</td><td><span class="badge">Active</span></td><td>15 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
  </tbody>
</table>
</div>
<script>
window.kill = function(btn) {
  const row = btn.closest('tr');
  row.remove();
  const count = document.querySelectorAll('#rows tr').length;
  document.getElementById('procCount').textContent = count + ' Processes Active';
};
setInterval(() => {
  document.getElementById('cpuVal').textContent = (Math.floor(Math.random() * 18) + 8) + '%';
}, 2000);
</script>
</body>
</html>`;
  }

  if (title.includes('weather')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0b0f19;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 14px;
  overflow-y: auto;
  overflow-x: hidden;
  user-select: none;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
  margin-bottom: 12px;
}
.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.5px;
}
.country-badge {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.location-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}
.city-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.city-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.city-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.city-pill.active {
  background: rgba(56, 189, 248, 0.18);
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 600;
}
.hero {
  text-align: center;
  margin-bottom: 14px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.icon-wrap {
  font-size: 44px;
  line-height: 1;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
}
.temp-wrap {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 4px;
}
.temp {
  font-size: 46px;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
  letter-spacing: -1px;
}
.unit {
  font-size: 20px;
  color: #64748b;
  font-weight: 600;
}
.cond {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  margin-top: 4px;
}
.range {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.card {
  background: #111726;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  transition: transform 0.15s ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.3);
}
.val {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
}
.lbl {
  font-size: 10px;
  color: #64748b;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 6px;
  font-size: 10px;
  color: #64748b;
}
.refresh-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
</style>
</head>
<body>
<div class="header">
<div class="title-group">
  <span class="title">🌤️ WEATHER DASHBOARD</span>
  <span class="country-badge">🇮🇳 India</span>
</div>
<span class="location-text" id="locText">📍 Raipur, Chhattisgarh</span>
</div>

<div class="city-bar">
<button class="city-pill active" data-city="Raipur" data-lat="21.2514" data-lon="81.6296" data-state="Chhattisgarh">📍 Raipur (Default)</button>
<button class="city-pill" data-city="New Delhi" data-lat="28.6139" data-lon="77.2090" data-state="Delhi">New Delhi</button>
<button class="city-pill" data-city="Mumbai" data-lat="19.0760" data-lon="72.8777" data-state="Maharashtra">Mumbai</button>
<button class="city-pill" data-city="Bengaluru" data-lat="12.9716" data-lon="77.5946" data-state="Karnataka">Bengaluru</button>
<button class="city-pill" data-city="Kolkata" data-lat="22.5726" data-lon="88.3639" data-state="West Bengal">Kolkata</button>
</div>

<div class="hero">
<div class="icon-wrap" id="weatherIcon">☀️</div>
<div class="temp-wrap">
  <span class="temp" id="tempVal">26</span>
  <span class="unit">°C</span>
</div>
<div class="cond" id="condText">Clear Sky • Pleasant Breeze</div>
<div class="range" id="rangeText">High: 31°C • Low: 21°C</div>
</div>

<div class="details">
<div class="card"><div class="val" id="humVal">58%</div><div class="lbl">Humidity</div></div>
<div class="card"><div class="val" id="windVal">7 km/h</div><div class="lbl">Wind NW</div></div>
<div class="card"><div class="val" id="pressVal">1012 hPa</div><div class="lbl">Pressure</div></div>
<div class="card"><div class="val" id="aqiVal">Good (AQI 45)</div><div class="lbl">Air Quality</div></div>
</div>

<div class="footer-bar">
<span id="updateTime">Live Indian Meteorological Data</span>
<button class="refresh-btn" id="refreshBtn">🔄 Refresh</button>
</div>

<script>
let currentLat = 21.2514;
let currentLon = 81.6296;
let currentCity = 'Raipur';
let currentState = 'Chhattisgarh';

function weatherCodeToDesc(code) {
  if (code === 0) return { desc: 'Clear Sky • Sunny', icon: '☀️' };
  if (code === 1 || code === 2) return { desc: 'Mainly Clear • Pleasant', icon: '🌤️' };
  if (code === 3) return { desc: 'Overcast • Breezy', icon: '☁️' };
  if ([45, 48].includes(code)) return { desc: 'Morning Mist / Fog', icon: '🌫️' };
  if ([51, 53, 55, 61, 63, 65].includes(code)) return { desc: 'Light Rain / Drizzle', icon: '🌧️' };
  if ([80, 81, 82].includes(code)) return { desc: 'Passing Showers', icon: '🌦️' };
  if ([95, 96, 99].includes(code)) return { desc: 'Thunderstorm', icon: '⛈️' };
  return { desc: 'Pleasant & Mild', icon: '⛅' };
}

async function fetchLiveWeather(lat, lon, cityName, stateName) {
  try {
    const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current_weather=true&hourly=relativehumidity_2m,surface_pressure\`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    if (data && data.current_weather) {
      const cur = data.current_weather;
      const temp = Math.round(cur.temperature);
      const wInfo = weatherCodeToDesc(cur.weathercode);
      document.getElementById('tempVal').textContent = temp;
      document.getElementById('weatherIcon').textContent = wInfo.icon;
      document.getElementById('condText').textContent = wInfo.desc;
      document.getElementById('windVal').textContent = Math.round(cur.windspeed) + ' km/h';
      if (data.hourly && data.hourly.relativehumidity_2m && data.hourly.relativehumidity_2m.length > 0) {
        document.getElementById('humVal').textContent = data.hourly.relativehumidity_2m[0] + '%';
      }
      if (data.hourly && data.hourly.surface_pressure && data.hourly.surface_pressure.length > 0) {
        document.getElementById('pressVal').textContent = Math.round(data.hourly.surface_pressure[0]) + ' hPa';
      }
      document.getElementById('rangeText').textContent = \`High: \${temp + 4}°C • Low: \${temp - 4}°C\`;
      document.getElementById('locText').textContent = \`📍 \${cityName}, \${stateName}\`;
      document.getElementById('updateTime').textContent = \`Updated: \${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\`;
    }
  } catch (e) {
    console.warn('Weather fetch fallback:', e);
    document.getElementById('locText').textContent = \`📍 \${cityName}, \${stateName}\`;
    document.getElementById('updateTime').textContent = 'Default Indian Station Data';
  }
}

// Load Raipur Weather on startup
fetchLiveWeather(currentLat, currentLon, currentCity, currentState);

// City selector buttons
document.querySelectorAll('.city-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.city-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLat = parseFloat(btn.dataset.lat);
    currentLon = parseFloat(btn.dataset.lon);
    currentCity = btn.dataset.city;
    currentState = btn.dataset.state;
    fetchLiveWeather(currentLat, currentLon, currentCity, currentState);
  });
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  fetchLiveWeather(currentLat, currentLon, currentCity, currentState);
});
</script>
</body>
</html>`;
  }

  if (title.includes('wallpaper') || title.includes('studio') || title.includes('theme') || title.includes('background')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0b0f19;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px;
  user-select: none;
}
body::-webkit-scrollbar { width: 6px; }
body::-webkit-scrollbar-track { background: #0b0f19; }
body::-webkit-scrollbar-thumb { background: #222d42; border-radius: 4px; }
body::-webkit-scrollbar-thumb:hover { background: #334155; }

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 14px;
}
.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-icon { font-size: 20px; }
.title-text {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #38bdf8;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.btn-reset {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-reset:hover {
  background: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

.nav-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 7px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.tab-btn.active {
  background: #0284c7;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
}

.tab-pane {
  display: none;
  flex-direction: column;
  gap: 12px;
}
.tab-pane.active {
  display: flex;
}

/* Preset Grids */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.preset-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  height: 78px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: flex-end;
  padding: 8px;
}
.preset-card:hover {
  transform: translateY(-2px);
  border-color: #38bdf8;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
}
.preset-card.selected {
  border-color: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
}
.preset-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
  pointer-events: none;
}
.preset-label {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Upload Dropzone */
.dropzone {
  border: 2px dashed rgba(56, 189, 248, 0.4);
  border-radius: 10px;
  padding: 28px 16px;
  text-align: center;
  background: rgba(15, 23, 42, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.dropzone:hover, .dropzone.dragover {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
}
.dropzone-icon { font-size: 32px; }
.dropzone-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
.dropzone-sub { font-size: 11px; color: #94a3b8; }
.file-preview {
  margin-top: 8px;
  max-height: 140px;
  width: 100%;
  border-radius: 6px;
  object-fit: cover;
  display: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* URL & Color forms */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}
.input-row {
  display: flex;
  gap: 8px;
}
input[type="text"], input[type="url"] {
  flex: 1;
  background: #131927;
  border: 1px solid #29354d;
  color: #f1f5f9;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}
input[type="text"]:focus, input[type="url"]:focus {
  border-color: #38bdf8;
}
.btn-primary {
  background: #0284c7;
  border: none;
  color: #fff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}
.btn-primary:hover { background: #0369a1; }

.quick-urls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.quick-url-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.quick-url-pill:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
input[type="color"] {
  -webkit-appearance: none;
  border: 1px solid #334155;
  width: 44px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
input[type="color"]::-webkit-color-swatch { border-radius: 4px; border: none; }

/* Notification banner */
.toast-bar {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(50px);
  background: #10b981;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 99px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  opacity: 0;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 100;
}
.toast-bar.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>
</head>
<body>
<div class="header">
  <div class="title-group">
    <span class="title-icon">🖼️</span>
    <span class="title-text">WALLPAPER STUDIO</span>
  </div>
  <div class="header-actions">
    <button class="btn-reset" id="resetBtn" title="Reset to default background">🔄 Default</button>
  </div>
</div>

<div class="nav-tabs">
  <button class="tab-btn active" data-tab="tab-presets">🌌 Presets</button>
  <button class="tab-btn" data-tab="tab-upload">📁 Upload File</button>
  <button class="tab-btn" data-tab="tab-url">🌐 Image URL</button>
  <button class="tab-btn" data-tab="tab-colors">🎨 Custom Color</button>
</div>

<!-- 1. Presets -->
<div class="tab-pane active" id="tab-presets">
  <div class="preset-grid" id="presetGrid"></div>
</div>

<!-- 2. Upload from PC -->
<div class="tab-pane" id="tab-upload">
  <input type="file" id="fileInput" accept="image/*" style="display:none;" />
  <div class="dropzone" id="dropzone">
    <div class="dropzone-icon">🖼️</div>
    <div class="dropzone-title">Click or drag an image here</div>
    <div class="dropzone-sub">Supports PNG, JPG, WebP, GIF, SVG up to 10MB</div>
  </div>
  <img id="filePreview" class="file-preview" alt="Preview" />
  <button class="btn-primary" id="applyUploadedBtn" style="display:none;">Apply as Wallpaper</button>
</div>

<!-- 3. Image URL -->
<div class="tab-pane" id="tab-url">
  <div class="form-group">
    <label class="form-label">ONLINE IMAGE ADDRESS</label>
    <div class="input-row">
      <input type="url" id="urlInput" placeholder="https://images.unsplash.com/photo-..." />
      <button class="btn-primary" id="applyUrlBtn">Apply</button>
    </div>
  </div>
  <div class="form-group" style="margin-top: 8px;">
    <label class="form-label">POPULAR CURATED WALLPAPERS</label>
    <div class="quick-urls">
      <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80">🌴 Tropical Coast</button>
      <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80">🌌 Deep Universe</button>
      <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80">🏔️ Snowy Peaks</button>
      <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80">🎮 Cyber Grid</button>
    </div>
  </div>
</div>

<!-- 4. Custom Color / Gradient -->
<div class="tab-pane" id="tab-colors">
  <div class="form-group">
    <label class="form-label">DUAL COLOR GRADIENT</label>
    <div class="color-picker-row">
      <div>
        <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Color 1</span>
        <input type="color" id="color1" value="#0f172a" />
      </div>
      <div>
        <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Color 2</span>
        <input type="color" id="color2" value="#1e1b4b" />
      </div>
      <div style="flex:1;">
        <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Direction</span>
        <select id="gradAngle" style="width:100%; background:#131927; border:1px solid #29354d; color:#fff; padding:7px; border-radius:6px; font-size:11px;">
          <option value="135deg">Diagonal (135°)</option>
          <option value="to bottom">Vertical (To Bottom)</option>
          <option value="to right">Horizontal (To Right)</option>
          <option value="radial">Radial Circle</option>
        </select>
      </div>
    </div>
    <button class="btn-primary" id="applyCustomGradBtn" style="margin-top:10px;">Apply Custom Gradient</button>
  </div>
</div>

<div class="toast-bar" id="toastBar">Wallpaper applied!</div>

<script>
const presets = [
  { name: '🌌 Deep Nebula', css: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' },
  { name: '🌇 Cyberpunk Sunset', css: 'linear-gradient(135deg, #0d0221 0%, #19053b 45%, #6b1178 75%, #ff007f 100%)' },
  { name: '🌊 Ocean Biolume', css: 'linear-gradient(135deg, #09203f 0%, #1e3c72 50%, #2a5298 100%)' },
  { name: '🌲 Nordic Aurora', css: 'linear-gradient(135deg, #021508 0%, #064e3b 50%, #059669 80%, #10b981 100%)' },
  { name: '🌑 Midnight Obsidian', css: 'radial-gradient(ellipse at top, #141724 0%, #0a0a0c 60%, #050608 100%)' },
  { name: '⚡ Electric Mesh', css: 'radial-gradient(at 0% 0%, #1e1b4b 0px, transparent 50%), radial-gradient(at 100% 100%, #312e81 0px, transparent 50%), #0f172a' },
  { name: '🔮 Tokyo Neon', css: 'linear-gradient(135deg, #05051a 0%, #260940 40%, #7928ca 80%, #ff0080 100%)' },
  { name: '🔥 Crimson Sunset', css: 'linear-gradient(135deg, #1f0d10 0%, #4a0404 40%, #991b1b 75%, #ea580c 100%)' }
];

const toastBar = document.getElementById('toastBar');
function showAppliedToast(msg) {
  toastBar.textContent = msg || 'Wallpaper applied!';
  toastBar.classList.add('show');
  setTimeout(() => {
    toastBar.classList.remove('show');
  }, 2200);
}

function setWallpaper(css, toastMsg) {
  window.parent.postMessage({ type: 'os:set-wallpaper', background: css }, '*');
  showAppliedToast(toastMsg || 'Wallpaper applied!');
}

// Populate Presets
const presetGrid = document.getElementById('presetGrid');
presets.forEach((p) => {
  const card = document.createElement('div');
  card.className = 'preset-card';
  card.style.background = p.css;
  card.innerHTML = '<div class="preset-overlay"></div><div class="preset-label">' + p.name + '</div>';
  card.addEventListener('click', () => {
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setWallpaper(p.css, 'Applied ' + p.name);
  });
  presetGrid.appendChild(card);
});

// Nav Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const targetPane = document.getElementById(btn.dataset.tab);
    if (targetPane) targetPane.classList.add('active');
  });
});

// Reset Button
document.getElementById('resetBtn').addEventListener('click', () => {
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
  setWallpaper('', 'Reset to default wallpaper');
});

// Local File Upload
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const filePreview = document.getElementById('filePreview');
const applyUploadedBtn = document.getElementById('applyUploadedBtn');
let currentUploadedDataUrl = null;

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) {
    processFile(fileInput.files[0]);
  }
});

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    currentUploadedDataUrl = e.target.result;
    filePreview.src = currentUploadedDataUrl;
    filePreview.style.display = 'block';
    applyUploadedBtn.style.display = 'block';
    const css = "url('" + currentUploadedDataUrl + "') center/cover no-repeat fixed";
    setWallpaper(css, 'Local image wallpaper applied!');
  };
  reader.readAsDataURL(file);
}

applyUploadedBtn.addEventListener('click', () => {
  if (currentUploadedDataUrl) {
    const css = "url('" + currentUploadedDataUrl + "') center/cover no-repeat fixed";
    setWallpaper(css, 'Local image wallpaper applied!');
  }
});

// URL Input
const urlInput = document.getElementById('urlInput');
const applyUrlBtn = document.getElementById('applyUrlBtn');
function applyUrlWallpaper(rawUrl) {
  const url = (rawUrl || '').trim();
  if (!url) return;
  const css = "url('" + url + "') center/cover no-repeat fixed";
  setWallpaper(css, 'Online image wallpaper applied!');
}
applyUrlBtn.addEventListener('click', () => applyUrlWallpaper(urlInput.value));
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyUrlWallpaper(urlInput.value);
});

document.querySelectorAll('.quick-url-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const u = pill.dataset.url;
    urlInput.value = u;
    applyUrlWallpaper(u);
  });
});

// Custom Colors & Gradient
document.getElementById('applyCustomGradBtn').addEventListener('click', () => {
  const c1 = document.getElementById('color1').value;
  const c2 = document.getElementById('color2').value;
  const angle = document.getElementById('gradAngle').value;
  let css = '';
  if (angle === 'radial') {
    css = 'radial-gradient(circle at center, ' + c1 + ' 0%, ' + c2 + ' 100%)';
  } else {
    css = 'linear-gradient(' + angle + ', ' + c1 + ' 0%, ' + c2 + ' 100%)';
  }
  setWallpaper(css, 'Custom gradient applied!');
});
</script>
</body>
</html>`;
  }

  const appDisplayName = rawTitle || 'Interactive App';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #12131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 16px; overflow: hidden; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282b3d; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 15px; font-weight: 600; color: #82b1ff; }
.badge { background: #222638; color: #9fa8da; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #333852; }
.card { flex: 1; background: #181a26; border: 1px solid #292d42; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.info { font-size: 13px; color: #a1a6bd; line-height: 1.5; }
.input-group { display: flex; gap: 8px; margin-top: auto; }
input { flex: 1; background: #202333; border: 1px solid #303550; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
input:focus { border-color: #5c6ac4; }
button { background: #3949ab; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
button:hover { background: #303f9f; }
.output { background: #13141f; border: 1px solid #23263b; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; color: #76d275; min-height: 48px; }
</style>
</head>
<body>
<div class="header">
<span class="title">${appDisplayName}</span>
<span class="badge">Voice OS Powered</span>
</div>
<div class="card">
<div class="info">Ready to execute interactive commands. Type an input below to interact with ${appDisplayName}.</div>
<div class="output" id="output">System initialized. Awaiting user input...</div>
<div class="input-group">
  <input type="text" id="inputBox" placeholder="Type here..." />
  <button id="sendBtn">Execute</button>
</div>
</div>
<script>
const box = document.getElementById('inputBox');
const out = document.getElementById('output');
document.getElementById('sendBtn').addEventListener('click', () => {
  if (box.value.trim()) {
    out.textContent = 'Received: ' + box.value.trim() + ' (' + new Date().toLocaleTimeString() + ')';
    box.value = '';
  }
});
box.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('sendBtn').click(); });
</script>
</body>
</html>`;
}

function getBuiltinAppResult(userText) {
  if (!userText) return null;
  const clean = String(userText)
    .toLowerCase()
    .replace(/[.,!?;:"'~`#%&*()_\-+=<>{}\[\]\\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stripped = clean
    .replace(/^(?:please|can you|could you|i want to|i need to|would you|let s|lets|go ahead and)\s+/g, '')
    .trim();

  // 1. Notepad
  if (
    /^(?:open|launch|start|run|show|create)?\s*(?:the|a|an)?\s*(?:notepad|notes?|text\s*editor|memo|pad|scratchpad)\b/.test(stripped) ||
    /^(notepad|notes?|memo|text\s*editor|scratchpad)$/.test(stripped) ||
    /\b(notepad|text\s*editor)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Notepad',
      width: 480,
      height: 420,
      html: getAppTemplate('Notepad')
    };
  }

  // 2. Snake Game
  if (
    /^(?:open|launch|start|run|play|show)?\s*(?:the|a|an)?\s*(?:snake|snake\s*game|retro\s*snake)\b/.test(stripped) ||
    /^(snake|snake\s*game|play\s*snake)$/.test(stripped) ||
    /\b(snake\s*game)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Snake Game',
      width: 400,
      height: 550,
      html: getAppTemplate('Snake Game')
    };
  }

  // 3. Analogue Clock
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:analogue\s*clock|analog\s*clock)\b/.test(stripped) ||
    /^(analogue\s*clock|analog\s*clock)$/.test(stripped) ||
    /\b(analogue\s*clock|analog\s*clock)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Analogue Clock',
      width: 340,
      height: 380,
      html: getAppTemplate('Analogue Clock')
    };
  }

  // 4. Clock / Timer
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:clock|timer|stopwatch)\b/.test(stripped) ||
    /^(clock|timer|stopwatch)$/.test(stripped) ||
    /\b(open\s+clock|launch\s+clock)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Clock',
      width: 340,
      height: 320,
      html: getAppTemplate('Clock')
    };
  }

  // 5. Music Player
  if (
    /^(?:open|launch|start|run|play|show)?\s*(?:the|a|an)?\s*(?:music|music\s*player|audio\s*player|songs?)\b/.test(stripped) ||
    /^(music|music\s*player|audio\s*player|songs?)$/.test(stripped) ||
    /\b(music\s*player|audio\s*player)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Music Player',
      width: 420,
      height: 440,
      html: getAppTemplate('Music Player')
    };
  }

  // 6. Task Manager
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:task\s*manager|process\s*manager|system\s*manager|manager|taskmgr)\b/.test(stripped) ||
    /^(task\s*manager|process\s*manager|manager|taskmgr)$/.test(stripped) ||
    /\b(task\s*manager|process\s*manager)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Task Manager',
      width: 480,
      height: 440,
      html: getAppTemplate('Task Manager')
    };
  }

  // 7. Calculator
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:calculator|calc|math)\b/.test(stripped) ||
    /^(calculator|calc|math)$/.test(stripped) ||
    /\b(calculator|calc)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Calculator',
      width: 340,
      height: 420,
      html: getAppTemplate('Calculator')
    };
  }

  // 8. Weather
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:weather|weather\s*dashboard|forecast)\b/.test(stripped) ||
    /^(weather|forecast)$/.test(stripped) ||
    /\b(weather|forecast)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Weather',
      width: 380,
      height: 400,
      html: getAppTemplate('Weather')
    };
  }

  // 9. Tasks / Todo List
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:todo|to\s*do|todo\s*list|tasks?|task\s*list)\b/.test(stripped) ||
    /^(todo|tasks?|todo\s*list|task\s*list)$/.test(stripped) ||
    /\b(todo\s*list|task\s*list)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Tasks',
      width: 400,
      height: 420,
      html: getAppTemplate('Tasks')
    };
  }

  // 10. Wallpaper Studio
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:wallpaper|wallpapers|wallpaper\s*studio|desktop\s*wallpaper|themes?|backgrounds?)\b/.test(stripped) ||
    /^(wallpaper|wallpapers|wallpaper\s*studio|themes?|backgrounds?)$/.test(stripped) ||
    /\b(wallpaper\s*studio)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Wallpaper Studio',
      width: 520,
      height: 520,
      html: getAppTemplate('Wallpaper Studio')
    };
  }

  // 11. File Manager
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an|my)?\s*(?:file\s*manager|files?|file\s*explorer|my\s*files|documents?|folder)\b/.test(stripped) ||
    /^(file\s*manager|files?|file\s*explorer|my\s*files|documents?)$/.test(stripped) ||
    /\b(file\s*manager|my\s*files|file\s*explorer)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'File Manager',
      width: 560,
      height: 480,
      html: getAppTemplate('File Manager')
    };
  }

  // 12. Camera
  if (
    /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:camera|webcam|cam|photo|video\s*recorder)\b/.test(stripped) ||
    /^(camera|webcam|cam|take\s*photo)$/.test(stripped) ||
    /\b(camera|webcam)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Camera',
      width: 580,
      height: 600,
      html: getAppTemplate('Camera')
    };
  }

  // 13. Gallery
  if (
    /^(?:open|launch|start|run|show|view)?\s*(?:the|a|an|my)?\s*(?:gallery|media\s*gallery|photos|videos|my\s*photos|my\s*videos)\b/.test(stripped) ||
    /^(gallery|media\s*gallery|photos|videos|my\s*photos|my\s*videos)$/.test(stripped) ||
    /\b(gallery|media\s*gallery|my\s*photos|my\s*videos)\b/.test(stripped)
  ) {
    return {
      action: 'open app',
      title: 'Gallery',
      width: 680,
      height: 560,
      html: getAppTemplate('Gallery')
    };
  }

  return null;
}

// GET health check route at /api/status
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', hasKey: Boolean(process.env.GEMINI_API_KEY) });
});

// POST route at /api/command with generateContentStream and Server-Sent Events (SSE)
app.post('/api/command', async (req, res) => {
  const { text, openWindows, previousCommand } = req.body || {};
  const userText = text || req.body?.prompt;

  if (!userText || typeof userText !== 'string' || userText.trim() === '') {
    return res.status(400).json({ error: 'Text command is required.' });
  }

  // Setup Server-Sent Events (SSE) response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Fast path for built-in apps: instant response in 5ms without Gemini streaming latency
  const builtinResult = getBuiltinAppResult(userText);
  if (builtinResult) {
    res.write(`data: ${JSON.stringify({ done: true, result: builtinResult })}\n\n`);
    return res.end();
  }

  if (!ai) {
    const fallbackTitle = inferTitleFromText(userText);
    const fallbackResult = {
      action: 'open app',
      title: fallbackTitle,
      width: 420,
      height: 400,
      html: getAppTemplate(fallbackTitle)
    };
    res.write(`data: ${JSON.stringify({ done: true, result: fallbackResult })}\n\n`);
    return res.end();
  }

  let promptContent = `User command: "${userText}"\nOpen windows: ${JSON.stringify(openWindows || [])}`;
  if (previousCommand && typeof previousCommand === 'string' && previousCommand.trim() !== '') {
    promptContent = `Previous command was: "${previousCommand.trim()}"\nUser self-correction / revised intent: "${userText}"\nOpen windows: ${JSON.stringify(openWindows || [])}`;
  }
  const targetModel = process.env.GEMINI_MODEL || process.env.Gemini_MODEL || 'gemini-3.1-flash-lite';

  let stream = null;
  let lastError = null;

  // Stream with 8-second timeout so custom requests never hang indefinitely
  try {
    const streamInit = ai.models.generateContentStream({
      model: targetModel,
      contents: promptContent,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const timeoutInit = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    stream = await Promise.race([streamInit, timeoutInit]);
  } catch (err) {
    lastError = err;
    console.warn('[Command Stream Error]:', err.message);
  }

  if (!stream) {
    console.warn('Gemini stream timed out or failed; returning instant fallback.');
    const fallbackTitle = inferTitleFromText(userText);
    const fallbackResult = {
      action: 'open app',
      title: fallbackTitle,
      width: 420,
      height: 400,
      html: getAppTemplate(fallbackTitle)
    };
    res.write(`data: ${JSON.stringify({ done: true, result: fallbackResult })}\n\n`);
    return res.end();
  }

  let accumulatedText = '';
  try {
    const chunkConsumer = (async () => {
      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        accumulatedText += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    })();

    const chunkTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Stream read timeout')), 10000));
    await Promise.race([chunkConsumer, chunkTimeout]);

    // Parse accumulated response as JSON
    let parsedData = null;
    try {
      parsedData = JSON.parse(accumulatedText);
    } catch (parseErr) {
      const cleaned = accumulatedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      try {
        parsedData = JSON.parse(cleaned);
      } catch (e2) {
        console.warn('JSON parse fallback for accumulated text:', parseErr.message);
        parsedData = {
          action: 'open app',
          title: inferTitleFromText(userText),
          width: 420,
          height: 400,
          html: getAppTemplate(userText)
        };
      }
    }

    if (!parsedData || typeof parsedData !== 'object') {
      parsedData = {
        action: 'open app',
        title: inferTitleFromText(userText),
        width: 420,
        height: 400,
        html: getAppTemplate(userText)
      };
    }

    // Guarantee HTML presence for open app and edit app
    if ((parsedData.action === 'open app' || parsedData.action === 'edit app') && (!parsedData.html || !parsedData.html.trim())) {
      parsedData.html = getAppTemplate(parsedData.title || userText);
      if (!parsedData.title) parsedData.title = inferTitleFromText(userText);
    }

    // Send completed result to browser via SSE
    res.write(`data: ${JSON.stringify({ done: true, result: parsedData })}\n\n`);
    res.end();
  } catch (streamErr) {
    console.error('Error during Gemini stream delivery:', streamErr);
    const fallbackTitle = inferTitleFromText(userText);
    const fallbackResult = {
      action: 'open app',
      title: fallbackTitle,
      width: 420,
      height: 400,
      html: getAppTemplate(fallbackTitle)
    };
    res.write(`data: ${JSON.stringify({ done: true, result: fallbackResult })}\n\n`);
    res.end();
  }
});

// Gemini chat endpoint (conversational / vocal queries)
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!ai) {
    return res.json({
      reply: `[Voice OS Demo Mode]: I received your voice input "${prompt}". To enable live Google Gemini responses, please set GEMINI_API_KEY in your .env file.`,
      isDemo: true
    });
  }

  const candidateModels = [modelName, 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter((m, i, arr) => m && arr.indexOf(m) === i);
  let lastError = null;

  for (const modelToTry of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelToTry,
        contents: prompt,
        config: {
          systemInstruction: 'You are the intelligent voice assistant and core kernel of Voice OS. Respond concisely, naturally, and helpfully suitable for speech.'
        }
      });

      const replyText = response.text || 'I could not generate a response.';
      return res.json({ reply: replyText, modelUsed: modelToTry, isDemo: false });
    } catch (error) {
      lastError = error;
      console.warn(`Attempt with model ${modelToTry} failed:`, error.message);
    }
  }

  console.error('All Gemini API attempts failed:', lastError);
  return res.status(500).json({
    error: 'Failed to generate response from Gemini.',
    details: lastError ? lastError.message : 'Unknown error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🎙️  Voice OS Server running at: http://localhost:${PORT}`);
  console.log(`⚙️  GEMINI_MODEL: ${modelName}`);
  console.log(`🔑  GEMINI_API_KEY: ${apiKey ? 'Configured ✅' : 'Missing (set in .env) ⚠️'}`);
  console.log(`⚡  POST route ready at: /api/command`);
  console.log(`=========================================`);
});
