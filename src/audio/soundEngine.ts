/**
 * Web Audio API Industrial Subterranean Sound Synthesizer
 * Generates dynamic audio for ESC PWM whine, seismic geophone pings,
 * mine evacuation klaxons, methane alarm beeps, and field radio static.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private klaxonOsc: OscillatorNode | null = null;
  private klaxonGain: GainNode | null = null;
  private klaxonInterval: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
  }

  public playAlarmSiren(): void {
    this.startEvacuationKlaxon();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Modulate ESC Motor Brushless High-Frequency PWM Whine based on throttle
   * @param pwmMicroseconds (1000 - 2000 µs)
   */
  public updateMotorPWM(pwmMicroseconds: number) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const deviation = Math.abs(pwmMicroseconds - 1500); // 0 to 500
      if (deviation < 20) {
        // Neutral - silence or very low idle whine
        if (this.motorGain) {
          this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
        return;
      }

      if (!this.motorOsc) {
        this.motorOsc = this.ctx.createOscillator();
        this.motorOsc.type = 'sawtooth';
        this.motorGain = this.ctx.createGain();
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.motorOsc.connect(this.motorGain);
        this.motorGain.connect(this.masterGain);
        this.motorOsc.start();
      }

      // Base ESC carrier frequency 800Hz - 2200Hz based on RPM load
      const freq = 450 + (deviation / 500) * 1600;
      const gainVal = Math.min(0.08, (deviation / 500) * 0.07);

      this.motorOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.03);
      if (this.motorGain) {
        this.motorGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.03);
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  /**
   * Seismic geophone shockwave acoustic thud / rock burst thump
   */
  public playSeismicThud(intensity: number = 1.0) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 * intensity, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.35 * Math.min(intensity, 1.5), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.65);
    } catch {}
  }

  /**
   * Methane / Toxic Gas Warning Beep (High pitch alternating 2.4kHz pulse)
   */
  public playGasWarningBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1800, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  /**
   * Mine evacuation emergency alarm klaxon
   */
  public startEvacuationKlaxon() {
    if (this.klaxonInterval) return;
    this.initContext();

    const triggerCycle = () => {
      if (this.isMuted || !this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(950, this.ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.85);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.9);
    };

    triggerCycle();
    this.klaxonInterval = window.setInterval(triggerCycle, 1000);
  }

  public stopEvacuationKlaxon() {
    if (this.klaxonInterval) {
      clearInterval(this.klaxonInterval);
      this.klaxonInterval = null;
    }
  }

  /**
   * Tactical UI radio squelch / vision mode click
   */
  public playRadioSquelch() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch {}
  }

  /**
   * Radio Arrival / Waypoint reached chime
   */
  public playRadioChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, this.ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1760, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {}
  }

  /**
   * Keyboard click feedback sound
   */
  public playKeyboardClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  /**
   * Critical Anomaly / Rock Delamination Alarm Chord
   */
  public playCriticalAnomaly() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.4);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1108.73, this.ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(554.37, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.5);
      osc2.stop(this.ctx.currentTime + 0.5);
    } catch {}
  }

  /**
   * High-tech radar sweep ping sound
   */
  public playRadarPing() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {}
  }

  /**
   * 10-second calibration clock tick / pulse
   */
  public playCalibrationPulse(progressSec: number) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      // Rising pitch as calibration nears 10s
      const freq = 600 + progressSec * 80;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq + 200, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  /**
   * Calibration completion harmonic chime
   */
  public playCalibrationSuccess() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major
      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.6 + idx * 0.06);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(this.ctx!.currentTime + idx * 0.06);
        osc.stop(this.ctx!.currentTime + 0.7 + idx * 0.06);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
