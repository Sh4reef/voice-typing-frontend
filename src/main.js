import './style.css';
import { WaveformRenderer } from './waveform.js';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:8000';

// --- STATE VARIABLES ---
let activePlatform = 'mac';
let simulatorState = 'idle'; // idle | recording | transcribing | typing
let rmsInterval = null;
let typingTimeout = null;
let dragActive = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Text to inject during sandbox simulation
const SIMULATED_TEXT = `
    audio = speech_engine.capture()
    text = speech_engine.transcribe(audio)
    print(f"Injected text: {text}")
`;

// --- DOM ELEMENTS ---
const detectedOsLabel = document.getElementById('detected-os-label');
const heroCtaButton = document.getElementById('hero-cta-button');
const waveformCanvas = document.getElementById('waveform-canvas');
const draggableWidget = document.getElementById('draggable-widget');
const btnToggleDemo = document.getElementById('btn-toggle-demo');
const demoStatusText = document.getElementById('demo-status-text');
const typingTarget = document.getElementById('typing-target');
const widgetPillEl = document.getElementById('widget-pill-el');

// Auth Form Elements
const btnSubscribePremium = document.getElementById('btn-subscribe-premium');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  detectClientOS();
  initWaveform();
  initDraggable();
  initAuthHandlers();
});

// --- 1. CLIENT OS DETECTION ---
function detectClientOS() {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('mac')) {
    activePlatform = 'mac';
    detectedOsLabel.textContent = 'Download for macOS (Universal)';
    heroCtaButton.href = '#download-mac';
  } else if (ua.includes('win')) {
    activePlatform = 'win';
    detectedOsLabel.textContent = 'Download for Windows (.msi)';
    heroCtaButton.href = '#download-win';
  } else if (ua.includes('linux')) {
    activePlatform = 'linux';
    detectedOsLabel.textContent = 'Download for Linux (.AppImage)';
    heroCtaButton.href = '#download-linux';
  } else {
    activePlatform = 'mac'; // Fallback
    detectedOsLabel.textContent = 'Download for Desktop';
    heroCtaButton.href = '#download';
  }
}

// --- 2. WAVEFORM SIMULATION ---
let waveform = null;

function initWaveform() {
  if (!waveformCanvas) return;
  
  waveform = new WaveformRenderer(waveformCanvas);
  waveform.setMode('idle');
  waveform.start();
  
  // Toggle simulation on widget click
  if (widgetPillEl) {
    widgetPillEl.addEventListener('click', toggleDemo);
  }
  if (btnToggleDemo) {
    btnToggleDemo.addEventListener('click', toggleDemo);
  }

  // Keyboard shortcut listener inside mockup container or document
  document.addEventListener('keydown', (e) => {
    // Check for Ctrl + Shift + Space
    if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
      e.preventDefault();
      toggleDemo();
    }
    // Check for Escape to cancel
    if (e.key === 'Escape' && simulatorState !== 'idle') {
      e.preventDefault();
      cancelDemo();
    }
  });
}

function toggleDemo() {
  if (simulatorState === 'idle') {
    startDemo();
  } else {
    cancelDemo();
  }
}

function startDemo() {
  cancelIntervals();
  simulatorState = 'recording';
  waveform.setMode('recording');
  widgetPillEl.parentElement.classList.add('is-recording');
  widgetPillEl.parentElement.classList.remove('is-transcribing');
  
  demoStatusText.textContent = 'Status: Recording (Speak now)...';
  btnToggleDemo.innerHTML = '<span class="btn-icon">⏹️</span> Stop Demo';
  typingTarget.textContent = ''; // Clear previous typing

  // Feed simulated vocal inputs
  rmsInterval = setInterval(() => {
    // Create random waveforms with voice-like pattern peaks
    const timeFactor = Date.now() * 0.005;
    const baseAmp = 0.15;
    const voicePeak = Math.sin(timeFactor) * Math.cos(timeFactor * 0.6) * 0.5 + 0.5;
    const rms = baseAmp + voicePeak * 0.4 + Math.random() * 0.12;
    waveform.pushRms(Math.max(0.01, Math.min(1.0, rms)));
  }, 40);

  // Transition to transcribing after 3.5 seconds
  typingTimeout = setTimeout(() => {
    startTranscribingState();
  }, 3500);
}

function startTranscribingState() {
  cancelIntervals();
  simulatorState = 'transcribing';
  waveform.setMode('transcribing');
  widgetPillEl.parentElement.classList.remove('is-recording');
  widgetPillEl.parentElement.classList.add('is-transcribing');
  
  demoStatusText.textContent = 'Status: Transcribing audio buffers...';

  // Wait 2.2 seconds then type text
  typingTimeout = setTimeout(() => {
    startTypingState();
  }, 2200);
}

function startTypingState() {
  cancelIntervals();
  simulatorState = 'typing';
  waveform.setMode('idle');
  widgetPillEl.parentElement.classList.remove('is-transcribing');
  
  demoStatusText.textContent = 'Status: Injecting keystrokes...';
  
  let index = 0;
  
  function typeChar() {
    if (index < SIMULATED_TEXT.length) {
      typingTarget.textContent += SIMULATED_TEXT.charAt(index);
      index++;
      
      // Dynamic typing cadence simulation (faster or slower key hits)
      const delay = SIMULATED_TEXT.charAt(index - 1) === '\n' ? 180 : (30 + Math.random() * 40);
      typingTimeout = setTimeout(typeChar, delay);
    } else {
      // Done typing
      simulatorState = 'idle';
      demoStatusText.textContent = 'Status: Done (Keystrokes simulated)';
      btnToggleDemo.innerHTML = '<span class="btn-icon">🎙️</span> Restart Demo';
    }
  }
  
  typeChar();
}

function cancelDemo() {
  cancelIntervals();
  simulatorState = 'idle';
  waveform.setMode('idle');
  if (widgetPillEl) {
    widgetPillEl.parentElement.classList.remove('is-recording', 'is-transcribing');
  }
  demoStatusText.textContent = 'Status: Canceled';
  btnToggleDemo.innerHTML = '<span class="btn-icon">🎙️</span> Start Demo Dictation';
  typingTarget.textContent = ' # dictation buffer cleared';
}

function cancelIntervals() {
  if (rmsInterval) clearInterval(rmsInterval);
  if (typingTimeout) clearTimeout(typingTimeout);
}

// --- 3. POSITIONLESS OVERLAY DRAGGING ---
function initDraggable() {
  if (!draggableWidget) return;
  
  const handle = draggableWidget.querySelector('.widget-drag-handle');
  
  handle.addEventListener('mousedown', dragStart, false);
  document.addEventListener('mouseup', dragEnd, false);
  document.addEventListener('mousemove', drag, false);
  
  // Touch support for mobile layouts
  handle.addEventListener('touchstart', dragStart, false);
  document.addEventListener('touchend', dragEnd, false);
  document.addEventListener('touchmove', drag, false);
}

function dragStart(e) {
  if (e.type === 'touchstart') {
    initialX = e.touches[0].clientX - xOffset;
    initialY = e.touches[0].clientY - yOffset;
  } else {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
  }
  
  dragActive = true;
}

function dragEnd(e) {
  initialX = currentX;
  initialY = currentY;
  dragActive = false;
}

function drag(e) {
  if (!dragActive) return;
  e.preventDefault();
  
  if (e.type === 'touchmove') {
    currentX = e.touches[0].clientX - initialX;
    currentY = e.touches[0].clientY - initialY;
  } else {
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
  }
  
  xOffset = currentX;
  yOffset = currentY;
  
  // Boundary constraints relative to mock editor mockup container
  const parent = draggableWidget.parentElement;
  const parentRect = parent.getBoundingClientRect();
  const widgetRect = draggableWidget.getBoundingClientRect();
  
  // Constraint math
  const minX = -parentRect.width + widgetRect.width + 16;
  const maxX = 16;
  const minY = -parentRect.height + widgetRect.height + 40;
  const maxY = 16;
  
  // Clamping coordinate adjustments
  const dragX = Math.max(minX, Math.min(maxX, currentX));
  const dragY = Math.max(minY, Math.min(maxY, currentY));
  
  draggableWidget.style.transform = `translate3d(${dragX}px, ${dragY}px, 0)`;
}

// --- 4. AUTH & SUBSCRIPTION HANDLING ---
function initAuthHandlers() {
  if (btnSubscribePremium) {
    btnSubscribePremium.addEventListener('click', () => {
      alert('Mock payment process: Redirecting to Stripe checkout portal for Cloud Premium ($4.99/mo)...');
    });
  }
}
