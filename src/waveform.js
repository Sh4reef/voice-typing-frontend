/**
 * VoiceTyping Waveform Renderer
 * Renders a symmetric horizontal audio waveform on a <canvas> element.
 * Driven by simulated or real RMS values at ~60Hz.
 */

const WAVEFORM_HISTORY_LEN = 14;   // Number of bars to display (fewer bars for 84px width)
const BAR_GAP_RATIO = 0.20;        // Gap between bars as fraction of bar width
const MAX_BAR_HEIGHT_RATIO = 0.90; // Max bar height as fraction of canvas half-height (almost fills 28px height)
const IDLE_AMPLITUDE = 0.04;       // Minimum animated noise amplitude when idle
const SMOOTHING_FACTOR = 0.18;     // Low-pass filter coefficient (lower is more reactive/jumpy)
const IDLE_NOISE_SPEED = 0.06;     // Speed of idle noise animation

/**
 * @typedef {'idle' | 'recording' | 'transcribing' | 'loading'} WaveformMode
 */

export class WaveformRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    /** @type {number[]} Smoothed RMS history (0.0–1.0) */
    this.history = new Array(WAVEFORM_HISTORY_LEN).fill(0);

    /** @type {number} Current smoothed RMS value */
    this.smoothedRms = 0;

    /** @type {WaveformMode} */
    this.mode = 'idle';

    /** @type {number} Animation frame time accumulator */
    this.time = 0;

    /** @type {number | null} requestAnimationFrame ID */
    this._rafId = null;

    /** @type {boolean} Whether the render loop is active */
    this._running = false;

    // Resize observer to keep canvas resolution sharp
    this._resizeObserver = new ResizeObserver(() => this._syncSize());
    this._resizeObserver.observe(canvas);
    this._syncSize();
  }

  /** Sync canvas pixel buffer to its CSS display size (handles HiDPI) */
  _syncSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /**
   * Push a new RMS sample and advance history.
   * @param {number} rms - 0.0 to 1.0
   */
  pushRms(rms) {
    // Amplification curve (exponential, 0.45 power) to make waveform height much more active and responsive
    const amplified = Math.pow(rms, 0.45);
    const clamped = Math.min(1.0, Math.max(0.0, amplified));
    this.smoothedRms = this.smoothedRms * SMOOTHING_FACTOR + clamped * (1 - SMOOTHING_FACTOR);

    this.history.shift();
    this.history.push(this.smoothedRms);
  }

  /**
   * Set the visual mode (affects color palette).
   * @param {WaveformMode} mode
   */
  setMode(mode) {
    this.mode = mode;
  }

  /** Start the render loop */
  start() {
    if (this._running) return;
    this._running = true;
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  /** Stop the render loop */
  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** @private */
  _loop(timestamp) {
    if (!this._running) return;
    this.time = timestamp;

    if (this.mode === 'idle') {
      // Inject gentle noise-like oscillation when idle
      const noise = IDLE_AMPLITUDE * Math.sin(timestamp * IDLE_NOISE_SPEED * 0.001) *
                    (0.5 + 0.5 * Math.sin(timestamp * IDLE_NOISE_SPEED * 0.0037));
      this.pushRms(Math.max(0, noise));
    } else if (this.mode === 'loading') {
      // A scanning sin wave for model downloading
      const speed = 0.004;
      const frequency = 0.35;
      for (let i = 0; i < WAVEFORM_HISTORY_LEN; i++) {
        const phase = timestamp * speed + i * frequency;
        const amp = 0.10 + 0.30 * (Math.sin(phase) * 0.5 + 0.5);
        this.history[i] = amp;
      }
    } else if (this.mode === 'transcribing') {
      // A rapid pulsing scanning wave for transcription thinking state
      const speed = 0.012;
      const frequency = 0.5;
      for (let i = 0; i < WAVEFORM_HISTORY_LEN; i++) {
        const phase = timestamp * speed + i * frequency;
        const amp = 0.08 + 0.45 * (Math.sin(phase) * Math.cos(phase * 0.4) * 0.5 + 0.5);
        this.history[i] = amp;
      }
    }

    this._draw();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  /** @private — main draw routine */
  _draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const n = this.history.length;
    const totalBars = n;
    const barW = w / (totalBars * (1 + BAR_GAP_RATIO));
    const gap = barW * BAR_GAP_RATIO;
    const halfH = h / 2;
    const maxBarH = halfH * MAX_BAR_HEIGHT_RATIO;
    const centerY = halfH;

    // Draw center axis
    ctx.save();
    ctx.strokeStyle = this._axisColor();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();
    ctx.restore();

    // Draw bars
    for (let i = 0; i < totalBars; i++) {
      const x = i * (barW + gap);
      const amp = this.history[i];
      const barH = Math.max(1.5 * dpr, amp * maxBarH);

      // Age factor: older bars are slightly faded
      const age = i / totalBars;
      const alpha = 0.4 + age * 0.6;

      // Color gradient based on amplitude + mode
      const gradient = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
      const [topColor, bottomColor] = this._barColors(amp, alpha);
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(0.5, this._midColor(amp, alpha));
      gradient.addColorStop(1, bottomColor);

      ctx.save();
      ctx.fillStyle = gradient;

      // Rounded bar using roundRect (if supported) or manual arc
      const barRadius = Math.min(barW / 2, barH / 2, 2 * dpr); // smaller radius for smaller bars
      this._roundRect(ctx, x, centerY - barH, barW, barH * 2, barRadius);
      ctx.fill();

      // Glow effect for high amplitude bars
      if (amp > 0.3 && this.mode === 'recording') {
        ctx.shadowBlur = 3 * dpr;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        this._roundRect(ctx, x, centerY - barH, barW, barH * 2, barRadius);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  /** @private */
  _axisColor() {
    switch (this.mode) {
      case 'recording':    return 'rgba(244, 63, 94, 0.18)';
      case 'transcribing': return 'rgba(245, 158, 11, 0.18)';
      case 'loading':      return 'rgba(0, 212, 255, 0.18)';
      default:             return 'rgba(255, 255, 255, 0.08)';
    }
  }

  /** @private */
  _barColors(amp, alpha) {
    switch (this.mode) {
      case 'recording':
        return [
          `rgba(0, 212, 255, ${alpha * (0.7 + amp * 0.3)})`,
          `rgba(244, 63, 94, ${alpha * (0.5 + amp * 0.25)})`
        ];
      case 'transcribing':
        return [
          `rgba(245, 158, 11, ${alpha * 0.7})`,
          `rgba(168, 85, 247, ${alpha * 0.45})`
        ];
      case 'loading':
        return [
          `rgba(0, 212, 255, ${alpha * 0.65})`,
          `rgba(168, 85, 247, ${alpha * 0.4})`
        ];
      default:
        return [
          `rgba(100, 116, 139, ${alpha * 0.45})`,
          `rgba(100, 116, 139, ${alpha * 0.25})`
        ];
    }
  }

  /** @private */
  _midColor(amp, alpha) {
    switch (this.mode) {
      case 'recording':
        return `rgba(168, 85, 247, ${alpha * (0.6 + amp * 0.4)})`;
      case 'transcribing':
        return `rgba(245, 158, 11, ${alpha * 0.75})`;
      case 'loading':
        return `rgba(168, 85, 247, ${alpha * 0.55})`;
      default:
        return `rgba(100, 116, 139, ${alpha * 0.32})`;
    }
  }

  /** @private — polyfill for ctx.roundRect */
  _roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  destroy() {
    this.stop();
    this._resizeObserver.disconnect();
  }
}
