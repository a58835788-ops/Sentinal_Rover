import React, { useRef, useEffect, useState } from 'react';
import { RoverTelemetry, VisionMode } from '../types';
import {
  Camera,
  Eye,
  Flame,
  Moon,
  Sun,
  ShieldAlert,
  Wifi,
  Cpu,
  Battery,
  Compass,
  Gauge,
  Crosshair,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface RoverHUDProps {
  telemetry: RoverTelemetry;
  onSetVisionMode: (mode: VisionMode) => void;
  onToggleIR: () => void;
  onSetHeadlight: (val: number) => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  telemetry,
  onSetVisionMode,
  onToggleIR,
  onSetHeadlight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(148);
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 }); // percentage

  // Timer for video recording
  useEffect(() => {
    const timer = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Procedural Canvas Video Stream Simulation for Subterranean Coal Mine Environment
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const renderStream = () => {
      time += 0.04;
      const width = canvas.width;
      const height = canvas.height;

      // Clear frame
      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, width, height);

      // 1. Vision Mode Background & Tunnel Geometry Simulation
      const mode = telemetry.visionMode;
      const horizonY = height * 0.5 + (telemetry.pitchDeg || 0) * 3;
      const rollRad = ((telemetry.rollDeg || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rollRad);
      ctx.translate(-width / 2, -height / 2);

      // Tunnel Perspective Gradients
      if (mode === 'thermal') {
        // FLIR Thermal Ironbow / Rainbow Palette
        const gradient = ctx.createRadialGradient(
          width / 2,
          horizonY,
          10,
          width / 2,
          horizonY,
          width * 0.7
        );
        gradient.addColorStop(0, '#7f1d1d'); // deep warm core
        gradient.addColorStop(0.3, '#c2410c'); // orange mid
        gradient.addColorStop(0.7, '#3b0764'); // purple-blue cold rock
        gradient.addColorStop(1, '#030712'); // black background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (mode === 'night_vision') {
        // Starlight Night Vision (Phosphor Green/Cyan Palette)
        const gradient = ctx.createRadialGradient(
          width / 2,
          horizonY,
          15,
          width / 2,
          horizonY,
          width * 0.6
        );
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.5, '#064e3b');
        gradient.addColorStop(1, '#022c22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Optical RGB with Headlight Spotlight
        const lightIntensity = Math.max(0.1, telemetry.headlightBrightness / 100);
        const gradient = ctx.createRadialGradient(
          width / 2,
          horizonY,
          20,
          width / 2,
          horizonY,
          width * 0.55 * lightIntensity
        );
        gradient.addColorStop(0, '#fef08a');
        gradient.addColorStop(0.4, '#78350f');
        gradient.addColorStop(0.85, '#1e293b');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw Subterranean Tunnel Ribs & Rails
      const tunnelLinesCount = 7;
      ctx.strokeStyle =
        mode === 'thermal'
          ? 'rgba(251, 146, 60, 0.4)'
          : mode === 'night_vision'
          ? 'rgba(52, 211, 153, 0.5)'
          : 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 2;

      for (let i = 0; i < tunnelLinesCount; i++) {
        const offset = ((time * 0.8 + i / tunnelLinesCount) % 1);
        const y = horizonY + offset * offset * (height * 0.5);
        const xSpan = offset * width * 0.45;

        // Tunnel arch arch-rib
        ctx.beginPath();
        ctx.ellipse(width / 2, y, xSpan, offset * 80, 0, Math.PI, 0);
        ctx.stroke();
      }

      // Rail tracks on ground
      ctx.beginPath();
      ctx.moveTo(width / 2 - 20, horizonY);
      ctx.lineTo(width * 0.15, height);
      ctx.moveTo(width / 2 + 20, horizonY);
      ctx.lineTo(width * 0.85, height);
      ctx.stroke();

      // Geological Fault Rock & Thermal Hotspot Simulation
      if (mode === 'thermal') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.beginPath();
        ctx.arc(width * 0.65, height * 0.42, 24 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${telemetry.thermalHotspotC.toFixed(1)}°C HOTSPOT`, width * 0.65 + 30, height * 0.42);
      }

      ctx.restore();

      // Subterranean Dust & Suspended Particulate Noise
      const dustCount = 45;
      ctx.fillStyle =
        mode === 'night_vision'
          ? 'rgba(167, 243, 208, 0.4)'
          : mode === 'thermal'
          ? 'rgba(254, 215, 170, 0.3)'
          : 'rgba(241, 245, 249, 0.35)';

      for (let i = 0; i < dustCount; i++) {
        const seed = (i * 9301 + 49297) % 233280;
        const dx = (seed + time * 15 * ((i % 3) + 1)) % width;
        const dy = ((seed * 3 + time * 8) % height);
        const r = ((seed % 10) / 10) * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scanline / Lens Distortion Texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animationId = requestAnimationFrame(renderStream);
    };

    renderStream();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [telemetry.visionMode, telemetry.headlightBrightness, telemetry.pitchDeg, telemetry.rollDeg, telemetry.thermalHotspotC]);

  const handleModeSelect = (mode: VisionMode) => {
    soundEngine.playRadioSquelch();
    onSetVisionMode(mode);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="rover-live-hud-card"
      className="relative w-full rounded-xl overflow-hidden bg-[#0A0A0A] border border-[#262626] shadow-2xl"
    >
      {/* Video Canvas Layer */}
      <div className="relative w-full h-[400px] bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full object-cover select-none"
        />

        {/* Tactical Crosshair in Center */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-24 h-24 border border-cyan-400/40 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400/80 animate-ping" />
            <div className="absolute w-full h-[1px] bg-cyan-400/30" />
            <div className="absolute h-full w-[1px] bg-cyan-400/30" />
            <div className="absolute top-1 text-[9px] font-mono text-cyan-300">
              {telemetry.obstacleDistanceCm < 100 ? (
                <span className="text-red-400 font-bold animate-pulse">
                  OBSTACLE: {telemetry.obstacleDistanceCm} cm
                </span>
              ) : (
                `LIDAR: ${telemetry.obstacleDistanceCm} cm`
              )}
            </div>
          </div>
        </div>

        {/* Artificial Horizon Pitch/Roll Ladder */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none font-mono text-[10px] text-cyan-400/80 flex flex-col items-center gap-2">
          <div className="text-[9px] text-[#888888]">PITCH</div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-[1px] bg-cyan-400" />
            <span>+10°</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-[2px] bg-cyan-400" />
            <span className="font-bold text-[#EDEDED]">{telemetry.pitchDeg.toFixed(1)}°</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-[1px] bg-cyan-400" />
            <span>-10°</span>
          </div>
        </div>

        {/* Top OSD Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono">
          <div className="flex items-center gap-3 bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#2A2A2A] shadow-lg">
            <div className="flex items-center gap-1.5 text-red-500 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>REC {formatTimer(recordSeconds)}</span>
            </div>
            <span className="text-[#444444]">|</span>
            <div className="text-cyan-300 font-bold">SJ4000 ACTION CAM 1080P@60</div>
            <span className="text-[#444444]">|</span>
            <div className="text-[#CCCCCC]">
              RSSI: <span className="text-emerald-400 font-semibold">{telemetry.signalStrengthDbm} dBm</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#2A2A2A] shadow-lg">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              SPEED: {telemetry.speedMs.toFixed(2)} m/s
            </span>
            <span className="text-[#444444]">•</span>
            <span className="text-[#CCCCCC] font-semibold">HDG: {telemetry.headingDeg.toFixed(0)}°</span>
          </div>
        </div>

        {/* Microsecond PWM Telemetry Overlay (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-[#0A0A0A]/90 backdrop-blur-md p-2.5 rounded-lg border border-[#2A2A2A] text-xs font-mono shadow-lg">
          <div className="text-[10px] text-[#888888] font-semibold mb-1 flex items-center justify-between gap-4">
            <span className="text-cyan-400">DUAL X60 ESC HARDWARE PWM</span>
            <span className="text-emerald-400">{telemetry.pwmFrequencyHz}Hz TIMED</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-[#777777] block text-[10px]">GPIO 18 (LEFT ESC)</span>
              <span
                className={`font-bold ${
                  telemetry.pwmLeftUs > 1550
                    ? 'text-emerald-400'
                    : telemetry.pwmLeftUs < 1450
                    ? 'text-amber-400'
                    : 'text-[#CCCCCC]'
                }`}
              >
                {telemetry.pwmLeftUs} µs ({telemetry.leftMotorRpm} RPM)
              </span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px]">GPIO 19 (RIGHT ESC)</span>
              <span
                className={`font-bold ${
                  telemetry.pwmRightUs > 1550
                    ? 'text-emerald-400'
                    : telemetry.pwmRightUs < 1450
                    ? 'text-amber-400'
                    : 'text-[#CCCCCC]'
                }`}
              >
                {telemetry.pwmRightUs} µs ({telemetry.rightMotorRpm} RPM)
              </span>
            </div>
          </div>
        </div>

        {/* Sniffer Gas Meter Overlay (Bottom Right) */}
        <div className="absolute bottom-3 right-3 bg-[#0A0A0A]/90 backdrop-blur-md p-2.5 rounded-lg border border-[#2A2A2A] text-xs font-mono w-56 shadow-lg">
          <div className="text-[10px] text-[#888888] font-semibold mb-1 flex items-center justify-between">
            <span className="text-amber-400">ROVER SNIFFER HEAD</span>
            <span className="text-[#666666]">MQ-4 / MQ-7</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-[#CCCCCC]">CH₄ Methane:</span>
            <span
              className={`font-bold ${
                telemetry.sniffedMethanePPM > 5000 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {telemetry.sniffedMethanePPM} PPM
            </span>
          </div>
          <div className="w-full bg-[#1F1F1F] h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all ${
                telemetry.sniffedMethanePPM > 5000 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (telemetry.sniffedMethanePPM / 10000) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#CCCCCC]">CO Monoxide:</span>
            <span className="font-bold text-[#EDEDED]">{telemetry.sniffedCOppm} PPM</span>
          </div>
        </div>
      </div>

      {/* Vision Mode Selectors & Camera Lighting Controls Toolbar */}
      <div className="p-3 bg-[#121212] border-t border-[#222222] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[#888888] font-medium mr-1">Vision Mode:</span>
          <button
            id="btn-mode-rgb"
            onClick={() => handleModeSelect('rgb')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              telemetry.visionMode === 'rgb'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-[#1A1A1A] text-[#9E9E9E] hover:bg-[#242424] hover:text-[#EDEDED] border border-transparent'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Optical RGB
          </button>
          <button
            id="btn-mode-thermal"
            onClick={() => handleModeSelect('thermal')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              telemetry.visionMode === 'thermal'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'bg-[#1A1A1A] text-[#9E9E9E] hover:bg-[#242424] hover:text-[#EDEDED] border border-transparent'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            FLIR Thermal LWIR
          </button>
          <button
            id="btn-mode-night"
            onClick={() => handleModeSelect('night_vision')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              telemetry.visionMode === 'night_vision'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'bg-[#1A1A1A] text-[#9E9E9E] hover:bg-[#242424] hover:text-[#EDEDED] border border-transparent'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-emerald-400" />
            Starlight Night Vision
          </button>
        </div>

        {/* Headlight Slider & IR Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#888888]">Headlight:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={telemetry.headlightBrightness}
              onChange={(e) => onSetHeadlight(Number(e.target.value))}
              className="w-24 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-amber-300 font-semibold w-8 text-right">
              {telemetry.headlightBrightness}%
            </span>
          </div>

          <button
            id="btn-toggle-ir"
            onClick={onToggleIR}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              telemetry.irIlluminator
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-[#1A1A1A] text-[#888888] border-[#2A2A2A] hover:text-[#EDEDED]'
            }`}
          >
            850nm IR Illuminator: {telemetry.irIlluminator ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
