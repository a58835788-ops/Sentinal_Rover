import React, { useState, useEffect, useRef } from 'react';
import { SensorNode, HumanTransitRecord, RoverTelemetry } from '../types';
import {
  Users,
  Footprints,
  AlertTriangle,
  Radio,
  Gamepad2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  HardHat,
  Cpu,
  Activity,
  Flame,
  Wind,
  Eye,
  Volume2,
  Zap,
  Sparkles,
  RotateCcw,
  Play,
  Maximize2,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface HumanTransitTrackerProps {
  node1: SensorNode | undefined;
  node2: SensorNode | undefined;
  onUpdateNode: (nodeId: string, updates: Partial<SensorNode>) => void;
  roverTelemetry: RoverTelemetry;
  onDispatchRoverToNode2: () => void;
  onTriggerEvacAlarm: () => void;
}

export const HumanTransitTracker: React.FC<HumanTransitTrackerProps> = ({
  node1,
  node2,
  onUpdateNode,
  roverTelemetry,
  onDispatchRoverToNode2,
  onTriggerEvacAlarm,
}) => {
  // Current active transit tracking record
  const [transitRecord, setTransitRecord] = useState<HumanTransitRecord>({
    id: 'TRANSIT-2026-904',
    workerName: 'Rajesh Murmu',
    workerRfid: 'RFID-9941A',
    currentSector: 'Sub-level 3 / Drift B-4',
    node1EnteredTime: '10:42:15 AM',
    node2PassedTime: '10:44:30 AM',
    transitState: 'trapped_at_node2',
    elapsedTimeSec: 285,
    node2IncidentDetected: true,
    incidentType: 'roof_tilt_collapse',
    roverDispatched: true,
  });

  const [autoSimulate, setAutoSimulate] = useState(false);
  const [simulationStep, setSimulationStep] = useState<number>(3);
  const [elapsedTimer, setElapsedTimer] = useState<number>(145);

  // Timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handler for Stage 1: Miner Passes Node 1 (Entry)
  const handleMinerPassesNode1 = () => {
    soundEngine.playRadioSquelch();
    const now = new Date().toLocaleTimeString();
    setSimulationStep(1);
    setTransitRecord({
      id: `TRANSIT-${Date.now().toString().slice(-4)}`,
      workerName: 'Rajesh Murmu',
      workerRfid: 'RFID-9941A',
      currentSector: 'Entry Gallery A (Passed Node 1)',
      node1EnteredTime: now,
      node2PassedTime: undefined,
      returnNode1Time: undefined,
      transitState: 'at_node1',
      elapsedTimeSec: 0,
      node2IncidentDetected: false,
      roverDispatched: false,
    });

    if (node1) {
      onUpdateNode(node1.id, {
        pirMotionDetected: true,
        pirLastTriggerTime: now,
        pirTransitCounter: (node1.pirTransitCounter || 0) + 1,
        status: 'normal',
      });
    }

    // Auto-clear PIR pulse after 3.5s
    setTimeout(() => {
      if (node1) {
        onUpdateNode(node1.id, { pirMotionDetected: false });
      }
    }, 3500);
  };

  // Handler for Stage 2: Miner Reaches and Passes Node 2 (Deep Heading)
  const handleMinerPassesNode2 = () => {
    soundEngine.playRadioSquelch();
    const now = new Date().toLocaleTimeString();
    setSimulationStep(2);
    setTransitRecord((prev) => ({
      ...prev,
      currentSector: 'Heading Drift B-4 (Passed Node 2)',
      node2PassedTime: now,
      transitState: 'at_node2',
      elapsedTimeSec: 45,
    }));

    if (node2) {
      onUpdateNode(node2.id, {
        pirMotionDetected: true,
        pirLastTriggerTime: now,
        pirTransitCounter: (node2.pirTransitCounter || 0) + 1,
        status: 'normal',
      });
    }

    setTimeout(() => {
      if (node2) {
        onUpdateNode(node2.id, { pirMotionDetected: false });
      }
    }, 3500);
  };

  // Handler for Stage 3: Catastrophic Incident Trigger at Node 2
  const handleTriggerNode2Catastrophe = (type: 'roof_tilt' | 'gas_surge' | 'timeout') => {
    soundEngine.playCriticalAnomaly();
    onTriggerEvacAlarm();
    setSimulationStep(3);

    setTransitRecord((prev) => ({
      ...prev,
      transitState: 'trapped_at_node2',
      node2IncidentDetected: true,
      incidentType:
        type === 'roof_tilt'
          ? 'roof_tilt_collapse'
          : type === 'gas_surge'
          ? 'toxic_gas_surge'
          : 'timeout_unreturned',
      currentSector: 'CRITICAL: Trapped in Drift B-4 behind Rockfall',
    }));

    if (node2) {
      onUpdateNode(node2.id, {
        status: 'critical',
        sosTriggered: true,
        mpu6500PitchDeg: type === 'roof_tilt' ? 28.5 : 12.0,
        mpu6500RollDeg: type === 'roof_tilt' ? 19.4 : 8.0,
        mpu6500VibeMg: type === 'roof_tilt' ? 680 : 120,
        mpu6500CollisionRisk: 'imminent_delamination',
        mq135GasPPM: type === 'gas_surge' ? 2450 : 840,
        mq135AirQualityRating: 'Lethal',
        methaneLEL: 42.5,
        methaneVol: 2.12,
        ldrVisibilityPercent: 18, // Heavy dust obscuration
        acousticEnergy: 420,
        seismicPPV: 6.45,
      });
    }
  };

  // Handler for Stage 4: Auto Dispatch Rover to Node 2
  const handleAutoDispatchRover = () => {
    soundEngine.playRadioSquelch();
    setSimulationStep(4);
    setTransitRecord((prev) => ({
      ...prev,
      roverDispatched: true,
    }));
    onDispatchRoverToNode2();
  };

  // Handler for Safe Return: Miner returns past Node 1
  const handleSafeReturnNode1 = () => {
    soundEngine.playRadioSquelch();
    const now = new Date().toLocaleTimeString();
    setSimulationStep(0);
    setTransitRecord((prev) => ({
      ...prev,
      returnNode1Time: now,
      transitState: 'safe_returned_node1',
      currentSector: 'Safety Outcrop / Surface Refuge',
      node2IncidentDetected: false,
      roverDispatched: false,
    }));

    if (node1) {
      onUpdateNode(node1.id, {
        pirMotionDetected: true,
        pirLastTriggerTime: now,
        status: 'normal',
      });
    }
    if (node2) {
      onUpdateNode(node2.id, {
        status: 'normal',
        sosTriggered: false,
        mpu6500PitchDeg: 1.2,
        mpu6500RollDeg: 0.8,
        mpu6500VibeMg: 15,
        mpu6500CollisionRisk: 'stable',
        mq135GasPPM: 140,
        mq135AirQualityRating: 'Clean',
        methaneLEL: 6.0,
        ldrVisibilityPercent: 92,
      });
    }
  };

  const n1 = node1 || {
    id: 'NODE-SL3-01',
    name: 'ESP32 Physical Node #1 (Entry Gallery A)',
    pirMotionDetected: false,
    pirTransitCounter: 14,
    mpu6500PitchDeg: 1.4,
    mpu6500RollDeg: -0.8,
    mpu6500VibeMg: 18,
    am2302TempC: 22.4,
    am2302HumidityRH: 64,
    mq135GasPPM: 142,
    mq135AirQualityRating: 'Clean',
    ldrLux: 480,
    ldrVisibilityPercent: 94,
    status: 'normal',
    batteryPercent: 96,
  };

  const n2 = node2 || {
    id: 'NODE-SL3-02',
    name: 'ESP32 Physical Node #2 (Drift B-4 Heading)',
    pirMotionDetected: false,
    pirTransitCounter: 12,
    mpu6500PitchDeg: 28.5,
    mpu6500RollDeg: 19.2,
    mpu6500VibeMg: 680,
    am2302TempC: 29.8,
    am2302HumidityRH: 88,
    mq135GasPPM: 2450,
    mq135AirQualityRating: 'Lethal',
    ldrLux: 22,
    ldrVisibilityPercent: 18,
    status: 'critical',
    batteryPercent: 88,
  };

  return (
    <div
      id="human-transit-rescue-tracker"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-2xl space-y-4"
    >
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base font-bold text-[#EDEDED] tracking-wide font-sans flex items-center gap-2">
              <span>Sequential PIR Human Transit & Trapped Worker Rescue Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                ESP32 Hardware Nodes #1 & #2
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#888888] mt-1 font-mono">
            Sequential PIR passage logic: Node 1 (Entry) → Node 2 (Deep Drift). If catastrophic rockwall shift / gas surge occurs at Node 2 and worker fails to return to Node 1, automated SentinelRover rescue mission is launched.
          </p>
        </div>

        {/* Global Incident Status Pill */}
        <div className="flex items-center gap-2">
          {transitRecord.transitState === 'trapped_at_node2' ? (
            <div className="px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-500/60 text-red-300 flex items-center gap-2 text-xs font-bold animate-pulse shadow-lg shadow-red-950/50 font-mono">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>TRAPPED MINER AT NODE 2 — ROVER DISPATCHED</span>
            </div>
          ) : transitRecord.transitState === 'safe_returned_node1' ? (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>MINER SAFELY RETURNED PAST NODE 1</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 flex items-center gap-2 text-xs font-semibold font-mono">
              <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>LIVE SEQUENTIAL TRACKING ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive 5-Stage Sequential Mining Tunnel Visualizer */}
      <div className="bg-[#080808] p-4 rounded-xl border border-[#222222] relative overflow-hidden">
        <div className="text-[11px] font-mono text-[#888888] mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            SUBTERRANEAN DRIFT B-4 SEQUENTIAL TRANSIT SCHEMATIC
          </span>
          <span className="text-amber-400">Target Worker: Rajesh Murmu (RFID-9941A)</span>
        </div>

        {/* Tunnel Schematic Track */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
          {/* Station 1: Entry Portal */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              transitRecord.transitState === 'safe_returned_node1'
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                : 'bg-[#121212] border-[#262626] text-[#888888]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1 font-mono">
              <span>01. ENTRY PORTAL</span>
              <span className="text-[10px] bg-[#1A1A1A] px-1.5 py-0.5 rounded text-[#AAAAAA]">Surface</span>
            </div>
            <p className="text-[11px] text-[#AAAAAA]">Main Descent Shaft Air Intake</p>
            <div className="mt-2 text-[10px] font-mono text-emerald-400">Safety Checkpoint Passed</div>
          </div>

          {/* Station 2: Physical Node 1 (Entry Gallery A) */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              transitRecord.transitState === 'at_node1' || n1.pirMotionDetected
                ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50 text-cyan-300'
                : 'bg-[#121212] border-[#2A2A2A] text-[#CCCCCC]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1 font-mono">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    n1.pirMotionDetected ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                NODE #1 (ESP32)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">PIR Entry</span>
            </div>
            <p className="text-[11px] text-[#888888]">Gallery A Rock Inclinometer</p>
            <div className="mt-2 text-[11px] font-mono flex items-center justify-between text-cyan-300">
              <span>PIR Motion:</span>
              <span className="font-bold">{n1.pirMotionDetected ? 'TRIGGERED' : 'CLEAR'}</span>
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-0.5">
              Passed: {transitRecord.node1EnteredTime || 'Awaiting'}
            </div>
          </div>

          {/* Station 3: Physical Node 2 (Deep Drift B-4 Incident Zone) */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              transitRecord.transitState === 'trapped_at_node2'
                ? 'bg-red-950/60 border-red-500/70 shadow-xl shadow-red-950/60 text-red-200 animate-pulse'
                : transitRecord.transitState === 'at_node2' || n2.pirMotionDetected
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
                : 'bg-[#121212] border-[#2A2A2A] text-[#CCCCCC]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1 font-mono">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    transitRecord.transitState === 'trapped_at_node2'
                      ? 'bg-red-500 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                NODE #2 (ESP32)
              </span>
              <span className="text-[10px] text-red-400 font-mono">Deep Drift</span>
            </div>
            <p className="text-[11px] text-[#888888]">Pillar 12 Extraction Heading</p>
            <div className="mt-2 text-[11px] font-mono flex items-center justify-between">
              <span className="text-[#AAAAAA]">Status:</span>
              <span className="font-bold text-red-400">
                {transitRecord.transitState === 'trapped_at_node2' ? 'COLLAPSE ANOMALY' : 'PASSAGE DETECTED'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-0.5">
              Passed: {transitRecord.node2PassedTime || 'Awaiting'}
            </div>
          </div>

          {/* Station 4: SentinelRover Autonomous Rescue Dispatch */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              transitRecord.roverDispatched
                ? 'bg-blue-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50 text-cyan-300'
                : 'bg-[#121212] border-[#262626] text-[#888888]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                SENTINELROVER
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">RPi 5 Recon</span>
            </div>
            <p className="text-[11px] text-[#AAAAAA]">Autonomous Recon & 2-Way Audio</p>
            <div className="mt-2 text-[11px] font-mono flex items-center justify-between text-cyan-300">
              <span>Mission:</span>
              <span className="font-bold">{transitRecord.roverDispatched ? 'EN ROUTE TO N2' : 'STANDBY'}</span>
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-0.5">
              Distance to Node 2: {transitRecord.roverDispatched ? '14.2m' : 'Docked'}
            </div>
          </div>
        </div>

        {/* Live Simulation Step Controls Bar */}
        <div className="mt-4 pt-3 border-t border-[#222222] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#CCCCCC] font-mono">Manual Sequence Trigger:</span>
            <button
              onClick={handleMinerPassesNode1}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                simulationStep === 1
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-[#181818] text-[#888888] hover:text-[#EEEEEE] border border-[#2A2A2A]'
              }`}
            >
              1. Miner Passes Node 1
            </button>
            <button
              onClick={handleMinerPassesNode2}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                simulationStep === 2
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#181818] text-[#888888] hover:text-[#EEEEEE] border border-[#2A2A2A]'
              }`}
            >
              2. Miner Passes Node 2
            </button>
            <button
              onClick={() => handleTriggerNode2Catastrophe('roof_tilt')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                simulationStep === 3
                  ? 'bg-red-500/30 text-red-300 border border-red-500/60 shadow-sm animate-pulse'
                  : 'bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/40'
              }`}
            >
              3. Trigger Catastrophe @ Node 2
            </button>
            <button
              onClick={handleAutoDispatchRover}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                simulationStep === 4
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
                  : 'bg-[#181818] text-cyan-400 hover:text-cyan-300 border border-[#2A2A2A]'
              }`}
            >
              4. Auto Dispatch Rover
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSafeReturnNode1}
              className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50 border border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Safe Return to Node 1</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Physical ESP32 Hardware Prototype Node Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PHYSICAL NODE 1 CARD */}
        <div className="bg-[#121212] rounded-xl p-4 border border-[#262626] shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-[#EDEDED] font-sans">
                  Physical Node #1 — Entry Gallery A
                </h4>
                <p className="text-[10px] text-[#888888] font-mono">
                  Microcontroller: ESP32-WROOM-32 • MQTT: <code className="text-cyan-400">mine/nodes/node_01/telemetry</code>
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              STABLE ENTRY
            </span>
          </div>

          {/* 5 Hardware Sensor Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            {/* 1. PIR Motion */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>PIR Human Motion</span>
                <Footprints className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-[#EDEDED] flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    n1.pirMotionDetected ? 'bg-cyan-400 animate-ping' : 'bg-[#444444]'
                  }`}
                />
                <span>{n1.pirMotionDetected ? 'ACTIVE' : 'IDLE'}</span>
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">
                Passes: {n1.pirTransitCounter || 14}
              </div>
            </div>

            {/* 2. MPU6500 6-Axis Rock Wall Tilt */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>MPU6500 Wall IMU</span>
                <Activity className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-emerald-400">
                P: {n1.mpu6500PitchDeg ?? 1.4}° | R: {n1.mpu6500RollDeg ?? -0.8}°
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">
                Vibe: {n1.mpu6500VibeMg ?? 18} mg (Stable)
              </div>
            </div>

            {/* 3. MQ135 Air Quality */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>MQ135 Gas Sensor</span>
                <Flame className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-[#EDEDED]">
                {n1.mq135GasPPM ?? 142} <span className="text-[10px] text-[#888888]">PPM</span>
              </div>
              <div className="text-[9px] text-emerald-400 mt-0.5">
                Rating: {n1.mq135AirQualityRating || 'Clean'}
              </div>
            </div>

            {/* 4. AM2302 Temp & Humidity */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>AM2302 (DHT22)</span>
                <Wind className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-[#EDEDED]">
                {n1.am2302TempC ?? 22.4}°C / {n1.am2302HumidityRH ?? 64}%
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">Normal ventilation</div>
            </div>

            {/* 5. LDR Visibility & Dust Obscurity */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>LDR Visibility</span>
                <Eye className="w-3 h-3 text-yellow-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-emerald-400">
                {n1.ldrVisibilityPercent ?? 94}% <span className="text-[10px] text-[#888888]">Vis</span>
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">
                Ambient: {n1.ldrLux ?? 480} Lux
              </div>
            </div>

            {/* 6. Power & Battery */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>Node Battery</span>
                <Zap className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-cyan-400">
                {n1.batteryPercent ?? 96}% <span className="text-[10px] text-[#888888]">Li-Ion</span>
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">3.3V LDO Regulated</div>
            </div>
          </div>
        </div>

        {/* PHYSICAL NODE 2 CARD (INCIDENT SECTOR) */}
        <div className="bg-[#121212] rounded-xl p-4 border border-[#262626] shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <div>
                <h4 className="text-sm font-bold text-[#EDEDED] font-sans">
                  Physical Node #2 — Heading Drift B-4 (Incident Zone)
                </h4>
                <p className="text-[10px] text-[#888888] font-mono">
                  Microcontroller: ESP32-WROOM-32 • MQTT: <code className="text-red-400">mine/nodes/node_02/telemetry</code>
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse">
              CRITICAL HAZARD
            </span>
          </div>

          {/* 5 Hardware Sensor Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            {/* 1. PIR Motion */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>PIR Human Motion</span>
                <Footprints className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>UNRETURNED</span>
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">
                Last ping: 4m ago
              </div>
            </div>

            {/* 2. MPU6500 6-Axis Rock Wall Tilt */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>MPU6500 Wall IMU</span>
                <Activity className="w-3 h-3 text-red-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-red-400 animate-pulse">
                P: {n2.mpu6500PitchDeg ?? 28.5}° | R: {n2.mpu6500RollDeg ?? 19.2}°
              </div>
              <div className="text-[9px] text-red-400 mt-0.5">
                Vibe: {n2.mpu6500VibeMg ?? 680} mg (COLLAPSE!)
              </div>
            </div>

            {/* 3. MQ135 Air Quality */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>MQ135 Gas Sensor</span>
                <Flame className="w-3 h-3 text-red-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-red-400">
                {n2.mq135GasPPM ?? 2450} <span className="text-[10px] text-[#888888]">PPM</span>
              </div>
              <div className="text-[9px] text-red-400 font-bold mt-0.5">
                Rating: LETHAL SURGE
              </div>
            </div>

            {/* 4. AM2302 Temp & Humidity */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>AM2302 (DHT22)</span>
                <Wind className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-amber-400">
                {n2.am2302TempC ?? 29.8}°C / {n2.am2302HumidityRH ?? 88}%
              </div>
              <div className="text-[9px] text-amber-400 mt-0.5">Heat buildup & damp</div>
            </div>

            {/* 5. LDR Visibility & Dust Obscurity */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>LDR Visibility</span>
                <Eye className="w-3 h-3 text-red-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-red-400">
                {n2.ldrVisibilityPercent ?? 18}% <span className="text-[10px] text-[#888888]">Vis</span>
              </div>
              <div className="text-[9px] text-red-400 mt-0.5">
                Heavy Coal Dust Haze (22 Lux)
              </div>
            </div>

            {/* 6. Power & Battery */}
            <div className="p-2.5 rounded-lg bg-[#181818] border border-[#2A2A2A]">
              <div className="text-[10px] text-[#888888] flex items-center justify-between">
                <span>Node Battery</span>
                <Zap className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-sm font-bold mt-1 text-cyan-400">
                {n2.batteryPercent ?? 88}% <span className="text-[10px] text-[#888888]">Li-Ion</span>
              </div>
              <div className="text-[9px] text-[#777777] mt-0.5">Emergency SOS TX Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Engine Summary Box */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 via-[#121212] to-cyan-950/30 border border-[#2A2A2A] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-950/60 border border-red-500/50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="font-bold text-[#EDEDED] flex items-center gap-2">
              <span>Automatic Rescue Dispatch Logic Triggered</span>
              <span className="text-red-400 font-mono text-[11px]">• Confidence: 99.4%</span>
            </div>
            <p className="text-[#AAAAAA] text-[11px] mt-0.5">
              PIR passage logged at Node 1 (10:42 AM) → Node 2 (10:44 AM). Wall MPU6500 reported 28.5° roof delamination + MQ135 spiked to 2450 PPM. Worker has NOT returned past Node 1. SentinelRover is auto-navigating to Node 2 coordinates `[-45, -68, 25]`.
            </p>
          </div>
        </div>

        <button
          onClick={handleAutoDispatchRover}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer shrink-0"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Launch SentinelRover Rescue Mission</span>
        </button>
      </div>
    </div>
  );
};
