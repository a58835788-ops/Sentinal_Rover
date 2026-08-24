import React, { useState, useEffect, useRef } from 'react';
import { RoverTelemetry } from '../types';
import {
  Gamepad2,
  Sliders,
  Play,
  Square,
  Shield,
  Radio,
  Cpu,
  Battery,
  Wifi,
  Navigation,
  CornerDownRight,
  Terminal,
  RotateCcw,
  Zap,
  AlertOctagon,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface RoverControlsProps {
  telemetry: RoverTelemetry;
  onUpdatePWM: (leftUs: number, rightUs: number) => void;
  onStartAutonomousMission: (missionName: string) => void;
  onStopMission: () => void;
  onOpenCodeModal: () => void;
}

export const RoverControls: React.FC<RoverControlsProps> = ({
  telemetry,
  onUpdatePWM,
  onStartAutonomousMission,
  onStopMission,
  onOpenCodeModal,
}) => {
  const [maxThrottlePercent, setMaxThrottlePercent] = useState<number>(60);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  // Keyboard driving controls listener (W, A, S, D, Arrow Keys, Space for E-Stop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
        setActiveKeys((prev) => {
          if (prev[key]) return prev;
          const next = { ...prev, [key]: true };
          computeAndSendPWM(next, maxThrottlePercent);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        setActiveKeys((prev) => {
          const next = { ...prev, [key]: false };
          computeAndSendPWM(next, maxThrottlePercent);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [maxThrottlePercent]);

  // Differential Skid-Steering Mixer (Calculates GPIO 18 / 19 PWM 1000 - 2000 µs)
  const computeAndSendPWM = (keys: { [key: string]: boolean }, throttleMax: number) => {
    let forward = 0; // -1 to +1
    let turn = 0; // -1 (left) to +1 (right)

    if (keys[' '] || keys['space']) {
      // Emergency Stop
      onUpdatePWM(1500, 1500);
      soundEngine.updateMotorPWM(1500);
      return;
    }

    if (keys['w'] || keys['arrowup']) forward += 1;
    if (keys['s'] || keys['arrowdown']) forward -= 1;
    if (keys['a'] || keys['arrowleft']) turn -= 1;
    if (keys['d'] || keys['arrowright']) turn += 1;

    const throttleScale = (throttleMax / 100) * 500; // max deviation from 1500 neutral

    let leftDelta = forward * throttleScale + turn * (throttleScale * 0.7);
    let rightDelta = forward * throttleScale - turn * (throttleScale * 0.7);

    // Clamp to 1000 - 2000 µs
    const leftPWM = Math.round(Math.max(1000, Math.min(2000, 1500 + leftDelta)));
    const rightPWM = Math.round(Math.max(1000, Math.min(2000, 1500 + rightDelta)));

    onUpdatePWM(leftPWM, rightPWM);
    soundEngine.updateMotorPWM(Math.max(leftPWM, rightPWM));
  };

  // Touch / Mouse Virtual Joystick Driving
  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = Math.max(-1, Math.min(1, (clientX - centerX) / (rect.width / 2)));
    const deltaY = Math.max(-1, Math.min(1, -(clientY - centerY) / (rect.height / 2))); // Invert Y

    const throttleScale = (maxThrottlePercent / 100) * 500;
    const leftDelta = deltaY * throttleScale + deltaX * (throttleScale * 0.7);
    const rightDelta = deltaY * throttleScale - deltaX * (throttleScale * 0.7);

    const leftPWM = Math.round(Math.max(1000, Math.min(2000, 1500 + leftDelta)));
    const rightPWM = Math.round(Math.max(1000, Math.min(2000, 1500 + rightDelta)));

    onUpdatePWM(leftPWM, rightPWM);
    soundEngine.updateMotorPWM(Math.max(leftPWM, rightPWM));
  };

  const emergencyKillSwitch = () => {
    soundEngine.playSeismicThud(0.5);
    onUpdatePWM(1500, 1500);
    soundEngine.updateMotorPWM(1500);
    onStopMission();
  };

  const autonomousMissions = [
    {
      id: 'mission_shaft3_perimeter',
      name: 'Sub-level 3 Perimeter Scan',
      desc: 'Autonomous patrol of retreat heading and methane collection boreholes.',
      waypoints: 6,
    },
    {
      id: 'mission_methane_sniff',
      name: 'Methane Seep Sniffer Path',
      desc: 'High-elevation roof line gas concentration sniffing in Sector B.',
      waypoints: 8,
    },
    {
      id: 'mission_pillar12_crack',
      name: 'Pillar 12 Structural Crack Survey',
      desc: 'FLIR Thermal and high-res optical examination of shear stress fractures.',
      waypoints: 4,
    },
    {
      id: 'mission_rescue_path',
      name: 'Emergency Hazmat Crew Egress Path',
      desc: 'Pre-clearing airway corridor to Sub-level 2 refuge bay.',
      waypoints: 10,
    },
  ];

  return (
    <div
      id="rover-teleoperation-bridge"
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      {/* 1. Hardware Bridge & Teleoperation (RPi 5 + ESC Mixer) */}
      <div className="lg:col-span-2 bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-[#EDEDED]">
                  RPi 5 Hardware-in-the-Loop PWM Drive Bridge
                </h3>
                <p className="text-[11px] text-[#888888]">
                  Microsecond-accurate dual ESC mixer • GPIO 18 (Left) & GPIO 19 (Right)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-rpi5-code"
                onClick={onOpenCodeModal}
                className="px-2.5 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-cyan-300 border border-[#2A2A2A] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>RPi5 Python Bridge Code</span>
              </button>

              <button
                id="btn-emergency-stop"
                onClick={emergencyKillSwitch}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>E-STOP (Brake)</span>
              </button>
            </div>
          </div>

          {/* Drive Mode & Joystick / Keyboard Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Left: Virtual Joystick Pad */}
            <div className="bg-[#121212] p-4 rounded-xl border border-[#222222] flex flex-col items-center justify-center">
              <div className="text-xs font-semibold text-[#888888] mb-2 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>VIRTUAL TRACKPAD JOYSTICK</span>
              </div>

              <div
                ref={joystickRef}
                className="relative w-36 h-36 rounded-full border-2 border-[#2E2E2E] bg-[#0A0A0A] flex items-center justify-center cursor-crosshair select-none touch-none shadow-inner"
                onMouseDown={(e) => {
                  setIsJoystickActive(true);
                  handleJoystickMove(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (isJoystickActive) handleJoystickMove(e.clientX, e.clientY);
                }}
                onMouseUp={() => {
                  setIsJoystickActive(false);
                  onUpdatePWM(1500, 1500);
                  soundEngine.updateMotorPWM(1500);
                }}
                onMouseLeave={() => {
                  if (isJoystickActive) {
                    setIsJoystickActive(false);
                    onUpdatePWM(1500, 1500);
                    soundEngine.updateMotorPWM(1500);
                  }
                }}
              >
                {/* Crosshair guidelines */}
                <div className="absolute w-full h-[1px] bg-[#222222]" />
                <div className="absolute h-full w-[1px] bg-[#222222]" />
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                </div>
              </div>

              <div className="text-[10px] text-[#666666] mt-2 text-center">
                Drag stick or use keyboard keys [W, A, S, D]
              </div>
            </div>

            {/* Right: Keyboard Teleoperation Matrix & Throttle Cap */}
            <div className="bg-[#121212] p-4 rounded-xl border border-[#222222] flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-[#888888] mb-2">
                  KEYBOARD TELEOPERATION MATRIX
                </div>

                <div className="flex flex-col items-center gap-1.5 my-2">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      activeKeys['w'] || activeKeys['arrowup']
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/50'
                        : 'bg-[#181818] text-[#CCCCCC] border-[#2A2A2A]'
                    }`}
                  >
                    W
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        activeKeys['a'] || activeKeys['arrowleft']
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/50'
                          : 'bg-[#181818] text-[#CCCCCC] border-[#2A2A2A]'
                      }`}
                    >
                      A
                    </div>
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        activeKeys['s'] || activeKeys['arrowdown']
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/50'
                          : 'bg-[#181818] text-[#CCCCCC] border-[#2A2A2A]'
                      }`}
                    >
                      S
                    </div>
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        activeKeys['d'] || activeKeys['arrowright']
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/50'
                          : 'bg-[#181818] text-[#CCCCCC] border-[#2A2A2A]'
                      }`}
                    >
                      D
                    </div>
                  </div>
                </div>
              </div>

              {/* Max Throttle Limiter Slider */}
              <div className="mt-3 pt-3 border-t border-[#222222]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#888888]">Max Subterranean Throttle:</span>
                  <span className="font-mono text-cyan-300 font-bold">{maxThrottlePercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={maxThrottlePercent}
                  onChange={(e) => setMaxThrottlePercent(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#666666] mt-0.5">
                  <span>Crawl (20%)</span>
                  <span>Standard (60%)</span>
                  <span>Sprint (100%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Hardware Telemetry Bar */}
        <div className="mt-4 pt-3 border-t border-[#222222] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-[#121212] p-2 rounded-lg border border-[#222222]">
            <div className="text-[10px] text-[#666666] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>RPi5 BCM2712</span>
            </div>
            <div className="text-[#EDEDED] font-semibold mt-0.5">
              {telemetry.cpuLoadPercent}% @ {telemetry.cpuTempC}°C
            </div>
          </div>

          <div className="bg-[#121212] p-2 rounded-lg border border-[#222222]">
            <div className="text-[10px] text-[#666666] flex items-center gap-1">
              <Battery className="w-3 h-3 text-emerald-400" />
              <span>4S LiPo Power</span>
            </div>
            <div className="text-emerald-400 font-semibold mt-0.5">
              {telemetry.batteryVoltage.toFixed(1)}V ({telemetry.batteryPercent}%)
            </div>
          </div>

          <div className="bg-[#121212] p-2 rounded-lg border border-[#222222]">
            <div className="text-[10px] text-[#666666] flex items-center gap-1">
              <Wifi className="w-3 h-3 text-amber-400" />
              <span>Main_node AP</span>
            </div>
            <div className="text-[#EDEDED] font-semibold mt-0.5">
              {telemetry.signalStrengthDbm} dBm (4.2ms)
            </div>
          </div>

          <div className="bg-[#121212] p-2 rounded-lg border border-[#222222]">
            <div className="text-[10px] text-[#666666] flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Dual X60 ESCs</span>
            </div>
            <div className="text-cyan-300 font-semibold mt-0.5">
              {telemetry.pwmLeftUs}µs / {telemetry.pwmRightUs}µs
            </div>
          </div>
        </div>
      </div>

      {/* 2. Autonomous Patrol Routines & Mission Dispatch */}
      <div className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-[#EDEDED]">
                Autonomous Recon Patrols
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                telemetry.mode === 'autonomous'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-[#181818] text-[#888888] border border-[#262626]'
              }`}
            >
              {telemetry.mode === 'autonomous' ? 'PATROL RUNNING' : 'MANUAL READY'}
            </span>
          </div>

          {/* Active Mission Status */}
          {telemetry.currentMission && (
            <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg my-3">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1">
                <span>Active: {telemetry.currentMission}</span>
                <span className="font-mono">{telemetry.missionProgress}%</span>
              </div>
              <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${telemetry.missionProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#888888] mt-2">
                <span>Waypoint {telemetry.waypointIndex} of {telemetry.totalWaypoints}</span>
                <button
                  onClick={onStopMission}
                  className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                >
                  Abort Mission
                </button>
              </div>
            </div>
          )}

          {/* Patrol Mission Cards */}
          <div className="space-y-2 mt-3">
            {autonomousMissions.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg bg-[#121212] border border-[#222222] hover:border-[#333333] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#EDEDED]">{m.name}</span>
                  <button
                    id={`btn-start-${m.id}`}
                    onClick={() => {
                      soundEngine.playRadioSquelch();
                      onStartAutonomousMission(m.name);
                    }}
                    className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-amber-400" />
                    <span>Engage</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#888888] mt-1 leading-snug">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fail-safe Emergency Return to Charging Dock */}
        <div className="mt-4 pt-3 border-t border-[#222222]">
          <button
            id="btn-return-dock"
            onClick={() => {
              soundEngine.playRadioSquelch();
              onStartAutonomousMission('Fail-Safe Return-To-Dock');
            }}
            className="w-full py-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-[#CCCCCC] border border-[#2A2A2A] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Autonomous Return-to-Dock (Station #1)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
