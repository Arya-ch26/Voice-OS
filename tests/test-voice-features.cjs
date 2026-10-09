const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Starting Voice OS Feature Verification Test Suite...\n');

// 1. Load public/os.js
const osJs = fs.readFileSync('public/os.js', 'utf8');

// Extract normalizeVoiceCommand and detectVoiceIntent
const normCode = osJs.slice(osJs.indexOf('function normalizeVoiceCommand'), osJs.indexOf('function getCurrentContext'));
const intentCode = osJs.slice(osJs.indexOf('function detectVoiceIntent'), osJs.indexOf('function setAssistantState'));

const sandbox = {
  pendingVoiceConfirm: null,
  getCurrentContext: () => ({ feature: 'desktop' }),
  console: console
};

vm.runInNewContext(normCode + '\n' + intentCode + '\n' + `
  globalThis.normalizeVoiceCommand = normalizeVoiceCommand;
  globalThis.detectVoiceIntent = detectVoiceIntent;
`, sandbox);

const { normalizeVoiceCommand, detectVoiceIntent } = sandbox;

let passed = 0;
let total = 0;

function check(label, actual, expected) {
  total++;
  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`  ✅ [PASS] ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ [FAIL] ${label}`);
    console.error(`     Expected:`, expected);
    console.error(`     Actual:  `, actual);
  }
}

console.log('--- 1. Testing Clock Voice Commands & Color Customization ---');

const clockTests = [
  { text: 'open clock', expectedIntent: 'OPEN_CLOCK' },
  { text: 'open the clock', expectedIntent: 'OPEN_CLOCK' },
  { text: 'clock', expectedIntent: 'OPEN_CLOCK' },
  { text: 'launch clock', expectedIntent: 'OPEN_CLOCK' },
  { text: 'show clock', expectedIntent: 'OPEN_CLOCK' },
  { text: 'open analogue clock', expectedIntent: 'OPEN_ANALOGUE_CLOCK' },
  { text: 'change the color of the clock to neon green', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'neon green' },
  { text: 'change color of the clock to neon green', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'neon green' },
  { text: 'change color of clock to neon green', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'neon green' },
  { text: 'set clock color to red', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'red' },
  { text: 'set the color of the clock to cyan', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'cyan' },
  { text: 'make the clock neon pink', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'neon pink' },
  { text: 'switch clock color to blue', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'blue' },
  { text: 'clock color orange', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'orange' },
  { text: 'change the color of the clock to neon green or whatever', expectedIntent: 'SET_CLOCK_COLOR', expectedColor: 'neon green' }
];

clockTests.forEach(t => {
  const norm = normalizeVoiceCommand(t.text);
  const res = detectVoiceIntent(norm, t.text);
  check(`Clock intent for "${t.text}"`, res ? res.intent : null, t.expectedIntent);
  if (t.expectedColor) {
    check(`Clock color param for "${t.text}"`, res && res.params ? res.params.color : null, t.expectedColor);
  }
});

console.log('\n--- 2. Testing Music Player Voice Commands ---');

const musicTests = [
  { text: 'play the song Night Drive', expectedIntent: 'PLAY_SONG', expectedSong: 'Night Drive' },
  { text: 'play Night Drive', expectedIntent: 'PLAY_SONG', expectedSong: 'Night Drive' },
  { text: 'play song night drive', expectedIntent: 'PLAY_SONG', expectedSong: 'night drive' },
  { text: 'play the song Night Drive or whatever', expectedIntent: 'PLAY_SONG', expectedSong: 'Night Drive' },
  { text: 'play track Neon Rain', expectedIntent: 'PLAY_SONG', expectedSong: 'Neon Rain' },
  { text: 'play Cyber Orbit', expectedIntent: 'PLAY_SONG', expectedSong: 'Cyber Orbit' },
  { text: 'play music', expectedIntent: 'PLAY_MUSIC' },
  { text: 'play songs', expectedIntent: 'PLAY_MUSIC' },
  { text: 'resume music', expectedIntent: 'RESUME_MUSIC' },
  { text: 'pause song', expectedIntent: 'PAUSE_MUSIC' },
  { text: 'pause music', expectedIntent: 'PAUSE_MUSIC' },
  { text: 'stop music', expectedIntent: 'PAUSE_MUSIC' },
  { text: 'next song', expectedIntent: 'NEXT_SONG' },
  { text: 'next track', expectedIntent: 'NEXT_SONG' },
  { text: 'skip track', expectedIntent: 'NEXT_SONG' },
  { text: 'previous song', expectedIntent: 'PREV_SONG' },
  { text: 'prev track', expectedIntent: 'PREV_SONG' }
];

musicTests.forEach(t => {
  const norm = normalizeVoiceCommand(t.text);
  const res = detectVoiceIntent(norm, t.text);
  check(`Music intent for "${t.text}"`, res ? res.intent : null, t.expectedIntent);
  if (t.expectedSong) {
    check(`Music song param for "${t.text}"`, res && res.params ? (res.params.title || res.params.song) : null, t.expectedSong);
  }
});

console.log('\n--- 3. Testing Notepad Voice Save Commands ---');

const notepadTests = [
  { text: 'save this notepad with the text as Arya.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this notepad with the text as Arya or whatever.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this notepad with the text as Arya.txt or whatever', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this notepad with the text as Arya or whatever', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this notepad with the text as Arya', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this notepad as Arya.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save notepad as Arya.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this note as Arya.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save this note with text as project.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'project.txt' },
  { text: 'save this file as report.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'report.txt' },
  { text: 'save note as meeting.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'meeting.txt' },
  { text: 'save as Arya.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'Arya.txt' },
  { text: 'save it as notes.txt', expectedIntent: 'SAVE_AS', expectedFilename: 'notes.txt' },
  { text: 'save notepad', expectedIntent: 'SAVE_FILE' },
  { text: 'save this notepad', expectedIntent: 'SAVE_FILE' }
];

notepadTests.forEach(t => {
  const norm = normalizeVoiceCommand(t.text);
  const res = detectVoiceIntent(norm, t.text);
  check(`Notepad save intent for "${t.text}"`, res ? res.intent : null, t.expectedIntent);
  if (t.expectedFilename) {
    check(`Notepad filename for "${t.text}"`, res && res.params ? (res.params.filename || res.params.name) : null, t.expectedFilename);
  }
});

console.log('\n--- 4. Testing Window Controls & Maximize / Minimize Voice Commands ---');

const windowTests = [
  { text: 'maximize window', expectedIntent: 'MAXIMIZE_WINDOW' },
  { text: 'maximize clock', expectedIntent: 'MAXIMIZE_WINDOW', expectedTarget: 'clock' },
  { text: 'maximize', expectedIntent: 'MAXIMIZE_WINDOW' },
  { text: 'fullscreen', expectedIntent: 'MAXIMIZE_WINDOW' },
  { text: 'restore window', expectedIntent: 'RESTORE_WINDOW' },
  { text: 'restore', expectedIntent: 'RESTORE_WINDOW' },
  { text: 'minimize window', expectedIntent: 'MINIMIZE_WINDOW' },
  { text: 'minimize', expectedIntent: 'MINIMIZE_WINDOW' },
  { text: 'close window', expectedIntent: 'CLOSE_WINDOW' },
  { text: 'close', expectedIntent: 'CLOSE_WINDOW' }
];

windowTests.forEach(t => {
  const norm = normalizeVoiceCommand(t.text);
  const res = detectVoiceIntent(norm, t.text);
  check(`Window intent for "${t.text}"`, res ? res.intent : null, t.expectedIntent);
  if (t.expectedTarget) {
    check(`Window target for "${t.text}"`, res && res.params ? res.params.target : null, t.expectedTarget);
  }
});

console.log('\n--- 5. Testing Template & Window Control Integrity ---');

// Check Clock template in os.js and server.js
check('os.js Clock template includes digital and analogue views', osJs.includes('digital-view') && osJs.includes('analogue-view'), true);
check('os.js Clock template includes color theme map', osJs.includes('COLOR_MAP') && osJs.includes('neon green'), true);
check('os.js Clock template includes SET_CLOCK_COLOR message listener', osJs.includes("action === 'SET_CLOCK_COLOR'"), true);
check('os.js Music Player includes Night Drive', osJs.includes("'Night Drive'"), true);
check('os.js Music Player includes PLAY_SONG listener', osJs.includes("action === 'PLAY_SONG'"), true);
check('os.js Notepad includes os:save-note-as listener', osJs.includes("e.data.type === 'os:save-note-as'"), true);

// Check Window Control functions and styling
const styleCss = fs.readFileSync('public/style.css', 'utf8');
check('os.js exports maximizeWindow', osJs.includes('export function maximizeWindow'), true);
check('os.js exports restoreMaximizedWindow', osJs.includes('export function restoreMaximizedWindow'), true);
check('os.js exports toggleMaximizeWindow', osJs.includes('export function toggleMaximizeWindow'), true);
check('os.js titlebar includes btn-min, btn-max, and btn-close', osJs.includes('btn-min') && osJs.includes('btn-max') && osJs.includes('btn-close'), true);
check('os.js titlebar supports double-click maximize toggle', osJs.includes("dblclick"), true);
check('style.css includes .is-maximized styling', styleCss.includes('.is-maximized'), true);
check('style.css includes .btn-max styling', styleCss.includes('.btn-max'), true);

// Check server.js
const serverJs = fs.readFileSync('server.js', 'utf8');
check('server.js Clock template includes digital and analogue views', serverJs.includes('digital-view') && serverJs.includes('analogue-view'), true);
check('server.js Clock template includes SET_CLOCK_COLOR listener', serverJs.includes("action === 'SET_CLOCK_COLOR'"), true);
check('server.js Music Player includes PLAY_SONG listener', serverJs.includes("action === 'PLAY_SONG'"), true);
check('server.js Notepad includes os:save-note-as listener', serverJs.includes("e.data.type === 'os:save-note-as'"), true);

console.log(`\n========================================`);
console.log(`Results: ${passed} / ${total} tests passed!`);
if (passed === total) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${total - passed} TESTS FAILED!`);
  process.exit(1);
}
