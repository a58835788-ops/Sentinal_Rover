import React, { useState, useEffect, useRef } from 'react';
import { RoverTelemetry } from '../types';
import {
  Wifi,
  Radio,
  Gamepad2,
  Sliders,
  Play,
  Square,
  AlertOctagon,
  Video,
  Camera,
  Cpu,
  Zap,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Maximize2,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface RemoteRoverSiteProps {
  telemetry: RoverTelemetry;
  onUpdatePWM: (leftUs: number, rightUs: number) => void;
  onOpenCodeModal: () => void;
}

export const RemoteRoverSite: React.FC<RemoteRoverSiteProps> = ({
  telemetry,
  onUpdatePWM,
  onOpenCodeModal,
}) => {
  const [targetHost, setTargetHost] = useState<string>('http://192.168.4.1:5000');
  const [hotspotSSID] = useState<string>('Main_node');
  const [hotspotPass] = useState<string>('8010065098');
  const [speedPercent, setSpeedPercent] = useState<number>(60);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'standby_sim' | 'offline'>('standby_sim');
  const [lastCommandSent, setLastCommandSent] = useState<string>('stop');
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(18);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [isSending, setIsSending] = useState(false);
  const [videoStreamMode, setVideoStreamMode] = useState<'live_http' | 'simulated_camera'>('simulated_camera');
  const [streamError, setStreamError] = useState(false);

  // Send command to real RPi 5 Flask endpoint POST /control
  const sendRoverCommand = async (command: 'forward' | 'backward' | 'left' | 'right' | 'stop', speed: number) => {
    setLastCommandSent(command);
    soundEngine.playKeyboardClick();

    // Map command to PWM microsecond values (1000 - 2000 µs)
    let leftUs = 1500;
    let rightUs = 1500;
    const throttleDelta = (speed / 100) * 500;

    switch (command) {
      case 'forward':
        leftUs = Math.round(1500 + throttleDelta);
        rightUs = Math.round(1500 + throttleDelta);
        break;
      case 'backward':
        leftUs = Math.round(1500 - throttleDelta);
        rightUs = Math.round(1500 - throttleDelta);
        break;
      case 'left':
        leftUs = Math.round(1500 - throttleDelta * 0.7);
        rightUs = Math.round(1500 + throttleDelta * 0.7);
        break;
      case 'right':
        leftUs = Math.round(1500 + throttleDelta * 0.7);
        rightUs = Math.round(1500 - throttleDelta * 0.7);
        break;
      case 'stop':
      default:
        leftUs = 1500;
        rightUs = 1500;
        break;
    }

    onUpdatePWM(leftUs, rightUs);
    soundEngine.updateMotorPWM(leftUs);

    // If attempting real HTTP dispatch to RPi 5 Flask backend
    if (targetHost && targetHost.startsWith('http')) {
      const startTime = performance.now();
      try {
        setIsSending(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);

        const res = await fetch(`${targetHost}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, speed }),
          signal: controller.signal,
          mode: 'cors',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          setConnectionStatus('connected');
          setLastLatencyMs(Math.round(performance.now() - startTime));
        }
      } catch (err) {
        // Fallback gracefully if physical rover is not in current LAN range
        setConnectionStatus('standby_sim');
      } finally {
        setIsSending(false);
      }
    }
  };

  // Keyboard navigation listener (W, A, S, D, Space, Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
        setActiveKeys((prev) => {
          if (prev[key]) return prev;
          const next = { ...prev, [key]: true };
          handleKeyDrive(next);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        setActiveKeys((prev) => {
          const next = { ...prev, [key]: false };
          handleKeyDrive(next);
          return next;
        });
      }
    };

    const handleKeyDrive = (keys: { [k: string]: boolean }) => {
      if (keys[' '] || keys['space']) {
        sendRoverCommand('stop', speedPercent);
        return;
      }
      const isUp = keys['w'] || keys['arrowup'];
      const isDown = keys['s'] || keys['arrowdown'];
      const isLeft = keys['a'] || keys['arrowleft'];
      const isRight = keys['d'] || keys['arrowright'];

      if (isUp) sendRoverCommand('forward', speedPercent);
      else if (isDown) sendRoverCommand('backward', speedPercent);
      else if (isLeft) sendRoverCommand('left', speedPercent);
      else if (isRight) sendRoverCommand('right', speedPercent);
      else sendRoverCommand('stop', speedPercent);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [speedPercent, targetHost]);

  return (
    <div
      id="remote-rover-teleoperation-station"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-2xl space-y-4"
    >
      {/* Top Header: Remote Controller Bridge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-[#EDEDED] tracking-wide font-sans flex items-center gap-2">
              <span>SentinelRover RPi 5 Remote Teleoperation Station</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Hardware-in-the-Loop Web Bridge
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#888888] mt-1 font-mono">
            Directly controls the Raspberry Pi 5 Flask Server (`rc_car_controller.py`) over the off-grid `Main_node` Wi-Fi Hotspot (192.168.4.1:5000) using microsecond-accurate hardware PWM on GPIO 18 & 19.
          </p>
        </div>

        {/* Hotspot & Connection State Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-[#161616] border border-[#2A2A2A] text-[#AAAAAA] flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>SSID: <strong className="text-[#EDEDED]">{hotspotSSID}</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded bg-[#161616] border border-[#2A2A2A] text-[#AAAAAA] flex items-center gap-1.5">
            <span>Pass: <strong className="text-amber-300">{hotspotPass}</strong></span>
          </div>
          <button
            onClick={onOpenCodeModal}
            className="px-2.5 py-1 rounded bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>View RPi5 & ESP32 Code</span>
          </button>
        </div>
      </div>

      {/* Target Host Configuration Bar */}
      <div className="bg-[#080808] p-3 rounded-lg border border-[#222222] flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[#888888] shrink-0">RPi 5 Host URL:</span>
          <input
            type="text"
            value={targetHost}
            onChange={(e) => setTargetHost(e.target.value)}
            placeholder="http://192.168.4.1:5000"
            className="bg-[#141414] border border-[#333333] rounded px-2.5 py-1 text-cyan-300 font-mono text-xs w-full sm:w-64 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => sendRoverCommand('stop', speedPercent)}
            className="px-2.5 py-1 rounded bg-[#1C1C1C] hover:bg-[#252525] text-[#CCCCCC] border border-[#333333] cursor-pointer"
          >
            Ping Host
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#AAAAAA]">Hardware PWM: <strong className="text-emerald-300">50Hz (pigpiod)</strong></span>
          </div>
          <div className="text-[#AAAAAA]">
            Latency: <strong className="text-cyan-300">{lastLatencyMs} ms</strong>
          </div>
          <div className="text-[#AAAAAA]">
            Last Command: <strong className="text-amber-300 uppercase">{lastCommandSent}</strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Stream + Driving Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Columns: SJ4000 1080p Video Feed Viewer */}
        <div className="lg:col-span-7 bg-[#080808] rounded-xl border border-[#262626] overflow-hidden flex flex-col">
          <div className="p-2.5 bg-[#121212] border-b border-[#222222] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-[#EDEDED]">SJ4000 1080p60 USB Action Camera</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse font-bold">
                REC • LIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setVideoStreamMode(
                    videoStreamMode === 'live_http' ? 'simulated_camera' : 'live_http'
                  )
                }
                className="px-2 py-0.5 rounded text-[10px] bg-[#1C1C1C] hover:bg-[#282828] text-cyan-300 border border-[#333333] cursor-pointer"
              >
                {videoStreamMode === 'live_http' ? 'Switch to Subterranean Twin Feed' : 'Try Direct HTTP /video_feed'}
              </button>
            </div>
          </div>

          {/* Video Display Window */}
          <div className="relative aspect-video bg-[#050505] flex items-center justify-center overflow-hidden group">
            {videoStreamMode === 'live_http' ? (
              <img
                src={`${targetHost}/video_feed`}
                alt="RPi 5 SJ4000 MJPEG Live Stream"
                className="w-full h-full object-cover"
                onError={() => {
                  setStreamError(true);
                  setVideoStreamMode('simulated_camera');
                }}
              />
            ) : (
              <div className="w-full h-full relative bg-gradient-to-b from-[#0a0f18] via-[#05070a] to-[#0a0705] flex items-center justify-center">
                {/* Visual Coal Seam Texture Overlay */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(#00f0ff 1px, transparent 1px), radial-gradient(#ffaa00 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    backgroundPosition: '0 0, 15px 15px',
                  }}
                />

                {/* Subterranean Crosshair Overlay */}
                <div className="relative z-10 text-center p-6 space-y-2 max-w-sm">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-400/40 border-t-cyan-400 animate-spin mx-auto mb-3 flex items-center justify-center">
                    <Compass className="w-6 h-6 text-cyan-300" />
                  </div>
                  <h4 className="text-sm font-bold text-[#EDEDED] font-mono">
                    SENTINELROVER RECON FEED
                  </h4>
                  <p className="text-[11px] text-[#888888] font-mono">
                    SJ4000 1080p stream ready at <code className="text-cyan-400">{targetHost}/video_feed</code>. Connected to Raspberry Pi 5 over off-grid 5.8GHz mesh hotspot.
                  </p>
                </div>

                {/* Real-Time HUD Overlay on Camera */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded border border-[#333333] text-[10px] font-mono text-cyan-300 space-y-0.5 pointer-events-none">
                  <div>LATENCY: {lastLatencyMs}ms | FPS: 60</div>
                  <div>ESC L: {telemetry.pwmLeftUs}µs | ESC R: {telemetry.pwmRightUs}µs</div>
                  <div>PITCH: {telemetry.pitchDeg}° | ROLL: {telemetry.rollDeg}°</div>
                </div>

                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded border border-[#333333] text-[10px] font-mono text-amber-300 pointer-events-none">
                  SNIFF: CH4 {telemetry.sniffedMethanePPM} PPM | CO {telemetry.sniffedCOppm} PPM
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Microsecond PWM & D-Pad Driving Controls */}
        <div className="lg:col-span-5 space-y-3">
          {/* Dual X60 ESC Microsecond Pulse Gauge Card */}
          <div className="bg-[#121212] p-3.5 rounded-xl border border-[#262626] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono border-b border-[#222222] pb-2">
              <span className="text-[#AAAAAA] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                DUAL X60 ESC HARDWARE PWM
              </span>
              <span className="text-emerald-400 font-bold">GPIO 18 & 19 (50Hz)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#181818] border border-[#2A2A2A]">
                <div className="text-[10px] text-[#888888] flex items-center justify-between">
                  <span>GPIO 18 (Left ESC)</span>
                  <span className="text-cyan-400 font-bold">{telemetry.pwmLeftUs} µs</span>
                </div>
                <div className="w-full bg-[#222222] h-2 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((telemetry.pwmLeftUs - 1000) / 1000) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-[9px] text-[#777777] mt-1">1500µs Neutral Brake</div>
              </div>

              <div className="p-2.5 rounded bg-[#181818] border border-[#2A2A2A]">
                <div className="text-[10px] text-[#888888] flex items-center justify-between">
                  <span>GPIO 19 (Right ESC)</span>
                  <span className="text-cyan-400 font-bold">{telemetry.pwmRightUs} µs</span>
                </div>
                <div className="w-full bg-[#222222] h-2 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((telemetry.pwmRightUs - 1000) / 1000) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-[9px] text-[#777777] mt-1">1500µs Neutral Brake</div>
              </div>
            </div>

            {/* Speed / Throttle Slider */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-[#AAAAAA] mb-1">
                <span>Speed / Throttle Limit:</span>
                <span className="text-cyan-300 font-bold">{speedPercent}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                value={speedPercent}
                onChange={(e) => setSpeedPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* D-PAD DIRECTIONAL CONTROLS */}
          <div className="bg-[#121212] p-4 rounded-xl border border-[#262626] flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-mono text-[#888888] flex items-center justify-between w-full">
              <span>MANUAL DRIVING D-PAD</span>
              <span>Keyboard: [W, A, S, D, Space]</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              {/* Forward Button */}
              <button
                onMouseDown={() => sendRoverCommand('forward', speedPercent)}
                onMouseUp={() => sendRoverCommand('stop', speedPercent)}
                onTouchStart={() => sendRoverCommand('forward', speedPercent)}
                onTouchEnd={() => sendRoverCommand('stop', speedPercent)}
                className={`w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-95 ${
                  activeKeys['w'] || activeKeys['arrowup']
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/50'
                    : 'bg-[#1C1C1C] hover:bg-[#252525] text-[#EDEDED] border-[#333333]'
                }`}
              >
                <ArrowUp className="w-5 h-5" />
                <span className="text-[10px] font-mono mt-0.5">W</span>
              </button>

              {/* Middle Row: Left, Stop, Right */}
              <div className="flex items-center gap-2">
                <button
                  onMouseDown={() => sendRoverCommand('left', speedPercent)}
                  onMouseUp={() => sendRoverCommand('stop', speedPercent)}
                  onTouchStart={() => sendRoverCommand('left', speedPercent)}
                  onTouchEnd={() => sendRoverCommand('stop', speedPercent)}
                  className={`w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-95 ${
                    activeKeys['a'] || activeKeys['arrowleft']
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/50'
                      : 'bg-[#1C1C1C] hover:bg-[#252525] text-[#EDEDED] border-[#333333]'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-[10px] font-mono mt-0.5">A</span>
                </button>

                {/* Emergency Brake / Neutral Stop */}
                <button
                  onClick={() => sendRoverCommand('stop', speedPercent)}
                  className="w-14 h-14 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/50 font-mono font-bold text-[10px] flex flex-col items-center justify-center shadow-lg shadow-red-950/50 active:scale-95 cursor-pointer"
                >
                  <AlertOctagon className="w-5 h-5 text-red-400" />
                  <span>STOP</span>
                </button>

                <button
                  onMouseDown={() => sendRoverCommand('right', speedPercent)}
                  onMouseUp={() => sendRoverCommand('stop', speedPercent)}
                  onTouchStart={() => sendRoverCommand('right', speedPercent)}
                  onTouchEnd={() => sendRoverCommand('stop', speedPercent)}
                  className={`w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-95 ${
                    activeKeys['d'] || activeKeys['arrowright']
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/50'
                      : 'bg-[#1C1C1C] hover:bg-[#252525] text-[#EDEDED] border-[#333333]'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-[10px] font-mono mt-0.5">D</span>
                </button>
              </div>

              {/* Backward Button */}
              <button
                onMouseDown={() => sendRoverCommand('backward', speedPercent)}
                onMouseUp={() => sendRoverCommand('stop', speedPercent)}
                onTouchStart={() => sendRoverCommand('backward', speedPercent)}
                onTouchEnd={() => sendRoverCommand('stop', speedPercent)}
                className={`w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center border transition-all cursor-pointer shadow-lg active:scale-95 ${
                  activeKeys['s'] || activeKeys['arrowdown']
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/50'
                    : 'bg-[#1C1C1C] hover:bg-[#252525] text-[#EDEDED] border-[#333333]'
                }`}
              >
                <ArrowDown className="w-5 h-5" />
                <span className="text-[10px] font-mono mt-0.5">S</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
