import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BatteryCharging,
  Compass,
  Crosshair,
  Cpu,
  Droplets,
  Eye,
  Footprints,
  Gauge,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sliders,
  Sparkles,
  Thermometer,
  Volume2,
  Wifi,
  Wind,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { SensorNode, RoverTelemetry, AlertSeverity } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface MineTacticalRadarProps {
  nodes: SensorNode[];
  selectedNode: SensorNode | null;
  onSelectNode: (node: SensorNode) => void;
  roverTelemetry: RoverTelemetry;
  onDispatchRoverToCoords: (coords: [number, number, number], locationName: string) => void;
  onOpenCalibrationModal: () => void;
  onOpenCodeModal?: () => void;
}

export function MineTacticalRadar({
  nodes,
  selectedNode,
  onSelectNode,
  roverTelemetry,
  onDispatchRoverToCoords,
  onOpenCalibrationModal,
  onOpenCodeModal,
}: MineTacticalRadarProps) {
  // Radar Sweep & Display States
  const [sweepAngle, setSweepAngle] = useState(0);
  const [isSweeping, setIsSweeping] = useState(true);
  const [sweepSpeed, setSweepSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [radarRangeMeters, setRadarRangeMeters] = useState<number>(100); // 50, 100, 150, 200m
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [hoveredNode, setHoveredNode] = useState<SensorNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCoordinate, setHoveredCoordinate] = useState<{ xM: number; zM: number } | null>(null);
  const [showTracks, setShowTracks] = useState(true);
  const [showFaultLines, setShowFaultLines] = useState(true);
  const [showRoverBeam, setShowRoverBeam] = useState(true);
  const [showPhysicalOnly, setShowPhysicalOnly] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Radar continuous 360-degree sweep animation
  useEffect(() => {
    if (!isSweeping) return;

    const speedDegPerSec = sweepSpeed === 'slow' ? 45 : sweepSpeed === 'normal' ? 90 : 180;

    const animateSweep = (time: number) => {
      const deltaSec = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setSweepAngle((prev) => {
        const next = (prev + speedDegPerSec * deltaSec) % 360;
        // Optional subtle ping when sweep passes North (0 deg)
        if (prev > 350 && next < 10) {
          // Occasional soft radar sweep sound
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animateSweep);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animateSweep);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSweeping, sweepSpeed]);

  // Filter nodes according to level & physical status
  const visibleNodes = nodes.filter((n) => {
    if (showPhysicalOnly && !n.isPhysicalPrototype) return false;
    if (levelFilter !== 'all' && n.level !== levelFilter) return false;
    return true;
  });

  // Calculate pixel coordinates from 3D mine coordinates
  // Radar center is (300, 300) in SVG viewBox 600x600
  const radarCenter = 300;
  const radarRadius = 260; // max SVG radius

  const mapMineToRadarSvg = (xM: number, zM: number) => {
    // scale meters to SVG pixels based on radarRangeMeters
    const scale = radarRadius / radarRangeMeters;
    const svgX = radarCenter + xM * scale;
    const svgY = radarCenter + zM * scale;
    return { svgX, svgY };
  };

  // Convert click on SVG back to mine meter coordinates
  const handleRadarClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const svgWidth = rect.width;
    const svgHeight = rect.height;

    const normX = (clickX / svgWidth) * 600 - radarCenter;
    const normY = (clickY / svgHeight) * 600 - radarCenter;

    const scale = radarRadius / radarRangeMeters;
    const targetMineX = normX / scale;
    const targetMineZ = normY / scale;

    soundEngine.playRadioSquelch();
    onDispatchRoverToCoords(
      [Math.round(targetMineX), -68, Math.round(targetMineZ)],
      `Radar Target [X: ${Math.round(targetMineX)}m, Z: ${Math.round(targetMineZ)}m]`
    );
  };

  const handleRadarMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = (clickX / rect.width) * 600 - radarCenter;
    const normY = (clickY / rect.height) * 600 - radarCenter;
    const scale = radarRadius / radarRangeMeters;

    setHoveredCoordinate({
      xM: Math.round(normX / scale),
      zM: Math.round(normY / scale),
    });
  };

  // Rover position in SVG
  const roverSvg = mapMineToRadarSvg(roverTelemetry.position3D[0], roverTelemetry.position3D[2]);

  // Coal mine subterranean drift tunnels & quarry benches geometry (matching illustration layout)
  const tunnelPaths = [
    // Main Entry Drift Gallery A
    'M 200, 300 L 400, 300',
    // Drift B-4 Deep Heading Branch
    'M 220, 300 L 150, 420 L 100, 450',
    // Pillar 12 Cross-Cut
    'M 300, 200 L 300, 400',
    // Stope C-2 Incline Haulage
    'M 250, 240 L 420, 180 L 480, 220',
    // Sump Drainage Siphon Gallery
    'M 350, 360 L 420, 440',
    // Surface Quarry Bench Ramp
    'M 180, 160 Q 300, 120 440, 150',
  ];

  // Rail tracks for coal trolleys
  const railLines = [
    { x1: 200, y1: 304, x2: 400, y2: 304 },
    { x1: 220, y1: 302, x2: 150, y2: 422 },
  ];

  return (
    <div className="space-y-4">
      {/* Top Tactical Command Header */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Subterranean Mine Tactical Radar & Rover Tracking</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono font-bold">
                ASTRO-PROTO v1.0 LIVE
              </span>
            </h2>
            <p className="text-xs text-[#888888]">
              Continuous $360^\circ$ radar sweep, multi-level gallery mapping, live rover telemetry, and hoverable topic inspection
            </p>
          </div>
        </div>

        {/* Action Controls & Calibration Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 10-Second Calibration Button (Requested by user) */}
          <button
            id="radar-calibrate-all-nodes-btn"
            onClick={() => {
              soundEngine.playKeyboardClick();
              onOpenCalibrationModal();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-950/60 border border-cyan-400 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Sliders className="w-4 h-4 text-cyan-200" />
            <span>Calibrate All Nodes (10s Baseline Sweep)</span>
          </button>

          {/* Range Selector */}
          <div className="flex items-center bg-[#1A1A1A] border border-[#333333] rounded-xl p-1 text-xs font-mono">
            <span className="text-[#666666] px-2 text-[10px] uppercase font-bold">Range:</span>
            {[50, 100, 150, 200].map((r) => (
              <button
                key={r}
                onClick={() => setRadarRangeMeters(r)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  radarRangeMeters === r
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-[#888888] hover:text-white hover:bg-[#252525]'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center bg-[#1A1A1A] border border-[#333333] rounded-xl p-1 text-xs font-mono">
            <span className="text-[#666666] px-2 text-[10px] uppercase font-bold">Level:</span>
            {(['all', 0, 1, 2, 3, 4] as const).map((lvl) => (
              <button
                key={lvl.toString()}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  levelFilter === lvl
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-[#888888] hover:text-white hover:bg-[#252525]'
                }`}
              >
                {lvl === 'all' ? 'All' : lvl === 0 ? 'Surf' : `L${lvl}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tactical Radar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar Viewport (8 Columns) */}
        <div className="lg:col-span-8 bg-[#0B0F0E] border border-emerald-950/80 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          {/* Subtle Radar Background Grid FX */}
          <div className="absolute inset-0 bg-[radial-gradient(#052e16_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Top Radar HUD Bar */}
          <div className="w-full flex items-center justify-between text-xs font-mono text-emerald-400/80 mb-2 px-2 z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                RADAR: ACTIVE ({sweepSpeed.toUpperCase()})
              </span>
              <span className="text-[#064e3b]">|</span>
              <span className="text-[#888888]">
                Grid: {radarRangeMeters * 2}m × {radarRangeMeters * 2}m
              </span>
              {hoveredCoordinate && (
                <span className="text-cyan-300 hidden sm:inline">
                  Cursor: [X: {hoveredCoordinate.xM}m, Z: {hoveredCoordinate.zM}m]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSweeping(!isSweeping)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  isSweeping
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                    : 'bg-rose-950 text-rose-300 border-rose-700/60'
                }`}
              >
                {isSweeping ? 'SWEEPING' : 'FROZEN'}
              </button>
              <button
                onClick={() =>
                  setSweepSpeed(
                    sweepSpeed === 'slow' ? 'normal' : sweepSpeed === 'normal' ? 'fast' : 'slow'
                  )
                }
                className="px-2 py-0.5 rounded text-[10px] bg-[#161616] text-[#AAAAAA] hover:text-white border border-[#333333] cursor-pointer"
              >
                SPEED: {sweepSpeed.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Primary Radar Interactive SVG */}
          <div
            ref={containerRef}
            className="w-full max-w-[560px] aspect-square relative cursor-crosshair select-none"
          >
            <svg
              viewBox="0 0 600 600"
              className="w-full h-full"
              onClick={handleRadarClick}
              onMouseMove={handleRadarMouseMove}
              onMouseLeave={() => setHoveredCoordinate(null)}
            >
              <defs>
                {/* Radar Sweep Gradient Cone */}
                <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="80%" stopColor="#059669" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
                </radialGradient>

                {/* Rover Searchlight Cone Gradient */}
                <radialGradient id="roverHeadlightGlow" cx="0%" cy="50%" r="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
                </radialGradient>

                {/* Node Critical Alert Glow */}
                <filter id="glowAlert" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Radar Background Circle */}
              <circle
                cx={radarCenter}
                cy={radarCenter}
                r={radarRadius}
                fill="#030806"
                stroke="#064e3b"
                strokeWidth="2"
              />

              {/* Concentric Range Rings (25%, 50%, 75%, 100% of Range) */}
              {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const r = radarRadius * frac;
                const distanceM = Math.round(radarRangeMeters * frac);
                return (
                  <g key={idx}>
                    <circle
                      cx={radarCenter}
                      cy={radarCenter}
                      r={r}
                      fill="none"
                      stroke="#065f46"
                      strokeWidth="1"
                      strokeDasharray={frac === 1.0 ? 'none' : '4,4'}
                      opacity="0.6"
                    />
                    <text
                      x={radarCenter + 6}
                      y={radarCenter - r + 14}
                      fill="#10b981"
                      fontSize="10"
                      fontFamily="monospace"
                      opacity="0.75"
                    >
                      {distanceM}m
                    </text>
                  </g>
                );
              })}

              {/* Crosshairs & Compass Bearings */}
              <line
                x1={radarCenter - radarRadius}
                y1={radarCenter}
                x2={radarCenter + radarRadius}
                y2={radarCenter}
                stroke="#047857"
                strokeWidth="1"
                strokeDasharray="2,4"
                opacity="0.5"
              />
              <line
                x1={radarCenter}
                y1={radarCenter - radarRadius}
                x2={radarCenter}
                y2={radarCenter + radarRadius}
                stroke="#047857"
                strokeWidth="1"
                strokeDasharray="2,4"
                opacity="0.5"
              />

              {/* Compass Cardinals (N, E, S, W) */}
              <text x={radarCenter - 4} y="32" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">N 0°</text>
              <text x="565" y={radarCenter + 4} fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">E 90°</text>
              <text x={radarCenter - 8} y="582" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">S 180°</text>
              <text x="8" y={radarCenter + 4} fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">W 270°</text>

              {/* Subterranean Geological Drift Tunnel Geometry */}
              <g id="drift-tunnels" opacity="0.8">
                {tunnelPaths.map((path, idx) => (
                  <path
                    key={idx}
                    d={path}
                    fill="none"
                    stroke="#1e3a2f"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {tunnelPaths.map((path, idx) => (
                  <path
                    key={`inner-${idx}`}
                    d={path}
                    fill="none"
                    stroke="#042f24"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>

              {/* Rail Lines for Coal Trolleys (matching illustration) */}
              {showTracks && (
                <g id="rail-lines" opacity="0.75">
                  {railLines.map((rail, idx) => (
                    <line
                      key={idx}
                      x1={rail.x1}
                      y1={rail.y1}
                      x2={rail.x2}
                      y2={rail.y2}
                      stroke="#ca8a04"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                    />
                  ))}
                  {/* Coal Trolley / Cart representation */}
                  <rect
                    x="280"
                    y="298"
                    width="18"
                    height="12"
                    fill="#451a03"
                    stroke="#d97706"
                    strokeWidth="1.5"
                    rx="2"
                  />
                  <text x="282" y="307" fill="#fbbf24" fontSize="7" fontWeight="bold">COAL</text>
                </g>
              )}

              {/* Geological Fault Line / Strata Shear Plane */}
              {showFaultLines && (
                <g id="fault-lines" opacity="0.6">
                  <path
                    d="M 120, 200 Q 240, 280 460, 360"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeDasharray="6,3"
                  />
                  <text x="360" y="335" fill="#f97316" fontSize="9" fontFamily="monospace">
                    FAULT FRACTURE LINE 7
                  </text>
                </g>
              )}

              {/* Rotating Radar Sweep Beam */}
              {isSweeping && (
                <g id="radar-sweep-beam" transform={`rotate(${sweepAngle}, ${radarCenter}, ${radarCenter})`}>
                  {/* Sweep Line */}
                  <line
                    x1={radarCenter}
                    y1={radarCenter}
                    x2={radarCenter}
                    y2={radarCenter - radarRadius}
                    stroke="#34d399"
                    strokeWidth="2"
                    filter="url(#glowAlert)"
                  />
                  {/* Sweep Gradient Fan */}
                  <path
                    d={`M ${radarCenter} ${radarCenter} L ${radarCenter - 65} ${radarCenter - radarRadius + 10} A ${radarRadius} ${radarRadius} 0 0 1 ${radarCenter} ${radarCenter - radarRadius} Z`}
                    fill="url(#radarSweepGlow)"
                  />
                </g>
              )}

              {/* ASTRO-PROTO v1.0 Rover Representation */}
              <g
                id="astro-proto-rover"
                transform={`translate(${roverSvg.svgX}, ${roverSvg.svgY}) rotate(${roverTelemetry.headingDeg})`}
              >
                {/* Searchlight illumination beam */}
                {showRoverBeam && roverTelemetry.headlightBrightness > 0 && (
                  <path
                    d="M 0 0 L 80 -35 A 80 80 0 0 1 80 35 Z"
                    fill="url(#roverHeadlightGlow)"
                    transform="rotate(-90)"
                  />
                )}

                {/* 4 Wheels (Matching rugged chassis from uploaded photo) */}
                <rect x="-14" y="-12" width="7" height="10" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <rect x="7" y="-12" width="7" height="10" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <rect x="-14" y="2" width="7" height="10" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <rect x="7" y="2" width="7" height="10" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />

                {/* Aluminum Main Chassis Box */}
                <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />

                {/* Gold Nameplate badge "ASTRO" */}
                <rect x="-6" y="-3" width="12" height="6" rx="1" fill="#b45309" stroke="#f59e0b" strokeWidth="0.5" />

                {/* Pan-Tilt Camera Mast / FLIR Module */}
                <circle cx="0" cy="-6" r="3" fill="#0284c7" stroke="#e0f2fe" strokeWidth="1" />
                <line x1="0" y1="-6" x2="0" y2="-12" stroke="#e2e8f0" strokeWidth="1.5" />
                <rect x="-3" y="-15" width="6" height="4" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />

                {/* Direction Heading Triangle */}
                <polygon points="0,-18 -4,-13 4,-13" fill="#38bdf8" />
              </g>

              {/* Rover Label in Radar */}
              <text
                x={roverSvg.svgX + 16}
                y={roverSvg.svgY - 8}
                fill="#38bdf8"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                className="pointer-events-none"
              >
                ASTRO-PROTO v1.0
              </text>
              <text
                x={roverSvg.svgX + 16}
                y={roverSvg.svgY + 4}
                fill="#7dd3fc"
                fontSize="8"
                fontFamily="monospace"
                className="pointer-events-none"
              >
                [{roverTelemetry.position3D[0]}m, {roverTelemetry.position3D[2]}m] | {roverTelemetry.batteryVoltage.toFixed(1)}V
              </text>

              {/* Sensor Nodes on Radar (Interactive with hover & click) */}
              {visibleNodes.map((node) => {
                const nodeSvg = mapMineToRadarSvg(node.position3D[0], node.position3D[2]);
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode?.id === node.id;

                const color =
                  node.status === 'critical' || node.sosTriggered
                    ? '#ef4444'
                    : node.status === 'warning'
                    ? '#f97316'
                    : node.status === 'caution'
                    ? '#eab308'
                    : '#10b981';

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-150"
                    onMouseEnter={(e) => {
                      setHoveredNode(node);
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playKeyboardClick();
                      onSelectNode(node);
                    }}
                  >
                    {/* Pulsing Alert Halo */}
                    {(node.status === 'critical' || node.sosTriggered || isHovered) && (
                      <circle
                        cx={nodeSvg.svgX}
                        cy={nodeSvg.svgY}
                        r={isHovered ? 20 : 16}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        className="animate-ping"
                        opacity="0.6"
                      />
                    )}

                    {/* Outer Target Reticle Ring */}
                    <circle
                      cx={nodeSvg.svgX}
                      cy={nodeSvg.svgY}
                      r={isHovered ? 12 : 9}
                      fill="#0b1310"
                      stroke={color}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />

                    {/* Inner Solid Blip */}
                    <circle
                      cx={nodeSvg.svgX}
                      cy={nodeSvg.svgY}
                      r={isHovered ? 6 : 4}
                      fill={color}
                    />

                    {/* Node Tag ID */}
                    <text
                      x={nodeSvg.svgX + 12}
                      y={nodeSvg.svgY + 3}
                      fill={isHovered || isSelected ? '#ffffff' : '#9ca3af'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.name.split(' ')[0]} {node.isPhysicalPrototype ? '⭐' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip: Complete Sensor Topics Card (Requested by user) */}
            {hoveredNode && (
              <div
                className="absolute z-30 pointer-events-none transition-all duration-75"
                style={{
                  left: Math.min(Math.max(tooltipPos.x + 15, 10), 280),
                  top: Math.min(Math.max(tooltipPos.y - 120, 10), 320),
                }}
              >
                <div className="bg-[#111614]/95 backdrop-blur-md border border-cyan-500/60 rounded-xl p-3.5 shadow-2xl w-72 text-left font-mono space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Tooltip Header */}
                  <div className="flex items-center justify-between border-b border-[#24332d] pb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          hoveredNode.status === 'critical'
                            ? 'bg-rose-500 animate-pulse'
                            : hoveredNode.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-white truncate">{hoveredNode.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2e27] text-cyan-300 font-bold">
                      {hoveredNode.levelName}
                    </span>
                  </div>

                  {/* Hardware & MQTT Topic Info */}
                  <div className="text-[10px] text-[#88a398] bg-[#0c1310] p-1.5 rounded border border-[#1b2b23] space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Microcontroller:</span>
                      <span className="text-cyan-300 font-semibold">{hoveredNode.hardwareMicrocontroller || 'ESP32-WROOM-32'}</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-[#64748b]">MQTT Topic:</span>
                      <span className="text-emerald-300 truncate max-w-[140px]">{hoveredNode.mqttTopic || `mine/nodes/${hoveredNode.id.toLowerCase()}`}</span>
                    </div>
                  </div>

                  {/* All Sensor Topics Grid (Temp, Humidity, Gas, Tilt, PIR, etc.) */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {/* Temperature */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        <span>Temp:</span>
                      </span>
                      <span className="font-bold text-white">
                        {(hoveredNode.am2302TempC ?? hoveredNode.temperatureC).toFixed(1)}°C
                      </span>
                    </div>

                    {/* Humidity */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-400" />
                        <span>Humidity:</span>
                      </span>
                      <span className="font-bold text-cyan-300">
                        {(hoveredNode.am2302HumidityRH ?? hoveredNode.humidityRH).toFixed(0)}%RH
                      </span>
                    </div>

                    {/* MQ135 Air Quality / Gas PPM */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Wind className="w-3 h-3 text-emerald-400" />
                        <span>MQ135 Gas:</span>
                      </span>
                      <span className={`font-bold ${(hoveredNode.mq135GasPPM ?? 140) > 1000 ? 'text-rose-400' : 'text-emerald-300'}`}>
                        {hoveredNode.mq135GasPPM ?? Math.round(hoveredNode.carbonMonoxidePPM * 25 + 100)} PPM
                      </span>
                    </div>

                    {/* LDR Lux & Visibility */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>LDR Lux:</span>
                      </span>
                      <span className="font-bold text-yellow-300">
                        {hoveredNode.ldrLux ?? 380} lx ({hoveredNode.ldrVisibilityPercent ?? 92}%)
                      </span>
                    </div>

                    {/* MPU6500 Wall Tilt (Pitch / Roll) */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Compass className="w-3 h-3 text-purple-400" />
                        <span>Wall Tilt:</span>
                      </span>
                      <span className={`font-bold ${(hoveredNode.mpu6500PitchDeg ?? hoveredNode.rockTiltX) > 18 ? 'text-rose-400 animate-pulse' : 'text-purple-300'}`}>
                        P:{(hoveredNode.mpu6500PitchDeg ?? hoveredNode.rockTiltX).toFixed(1)}°
                      </span>
                    </div>

                    {/* PIR Worker Transit Status */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Footprints className="w-3 h-3 text-amber-400" />
                        <span>PIR Count:</span>
                      </span>
                      <span className="font-bold text-amber-300">
                        {hoveredNode.pirTransitCounter ?? 12} min
                      </span>
                    </div>

                    {/* Methane LEL */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-rose-400" />
                        <span>CH₄ LEL:</span>
                      </span>
                      <span className={`font-bold ${hoveredNode.methaneLEL > 20 ? 'text-rose-400' : 'text-emerald-300'}`}>
                        {hoveredNode.methaneLEL.toFixed(1)}%
                      </span>
                    </div>

                    {/* Battery & RSSI */}
                    <div className="bg-[#131f1a] p-1.5 rounded border border-[#1d3027] flex items-center justify-between">
                      <span className="text-[#888888] flex items-center gap-1">
                        <BatteryCharging className="w-3 h-3 text-cyan-400" />
                        <span>Battery:</span>
                      </span>
                      <span className="font-bold text-cyan-300">
                        {hoveredNode.batteryPercent}% ({hoveredNode.meshRssi}dBm)
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-cyan-400/90 text-center bg-[#0e1713] py-1 rounded border border-[#1b2b23]">
                    Click node to focus 3D twin or calibrate
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Telemetry & Rover Panel (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* ASTRO-PROTO v1.0 Rover Active Status Card */}
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#242424] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-300">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">ASTRO-PROTO v1.0 ROVER</h3>
                  <span className="text-[10px] text-cyan-400 font-mono">Raspberry Pi 5 Subterranean Scout</span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                {roverTelemetry.mode.toUpperCase()}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#181818] p-2 rounded-xl border border-[#282828]">
                <span className="text-[#666666] block text-[10px]">Radar Position</span>
                <span className="text-white font-bold">
                  [{roverTelemetry.position3D[0]}m, {roverTelemetry.position3D[2]}m]
                </span>
              </div>
              <div className="bg-[#181818] p-2 rounded-xl border border-[#282828]">
                <span className="text-[#666666] block text-[10px]">Sub-Level Depth</span>
                <span className="text-cyan-300 font-bold">-{roverTelemetry.depthMeters}m</span>
              </div>
              <div className="bg-[#181818] p-2 rounded-xl border border-[#282828]">
                <span className="text-[#666666] block text-[10px]">4S LiPo Voltage</span>
                <span className="text-emerald-300 font-bold">{roverTelemetry.batteryVoltage.toFixed(1)}V ({roverTelemetry.batteryPercent}%)</span>
              </div>
              <div className="bg-[#181818] p-2 rounded-xl border border-[#282828]">
                <span className="text-[#666666] block text-[10px]">Speed / Heading</span>
                <span className="text-amber-300 font-bold">{roverTelemetry.speedMs.toFixed(1)} m/s ({roverTelemetry.headingDeg}°)</span>
              </div>
            </div>

            {/* Mission Objective */}
            <div className="bg-[#0E0E0E] p-2.5 rounded-xl border border-[#222222] text-xs font-mono space-y-1">
              <span className="text-[#666666] text-[10px] block">Current Mission:</span>
              <p className="text-cyan-200 font-semibold truncate">{roverTelemetry.currentMission || 'Autonomous Strata Reconnaissance'}</p>
            </div>

            {/* Quick Rover Action Triggers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  soundEngine.playRadioSquelch();
                  onDispatchRoverToCoords([-45, -68, 25], 'Node 2 Trapped Worker Zone (Drift B-4)');
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Node 2</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playRadioSquelch();
                  onDispatchRoverToCoords([0, 0, 0], 'Main Shaft Surface Dock');
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#222222] hover:bg-[#2A2A2A] text-[#CCCCCC] border border-[#3A3A3A] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return to Dock</span>
              </button>
            </div>
          </div>

          {/* Radar Tactical Layers & Filter Settings */}
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Radar Visualization Layer Toggles</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1E1E1E]">
                <span className="text-[#AAAAAA]">Coal Rail Tracks & Trolleys</span>
                <input
                  type="checkbox"
                  checked={showTracks}
                  onChange={(e) => setShowTracks(e.target.checked)}
                  className="rounded border-[#444444] text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1E1E1E]">
                <span className="text-[#AAAAAA]">Geological Fault Fracture Lines</span>
                <input
                  type="checkbox"
                  checked={showFaultLines}
                  onChange={(e) => setShowFaultLines(e.target.checked)}
                  className="rounded border-[#444444] text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1E1E1E]">
                <span className="text-[#AAAAAA]">Rover Headlight Beam Cone</span>
                <input
                  type="checkbox"
                  checked={showRoverBeam}
                  onChange={(e) => setShowRoverBeam(e.target.checked)}
                  className="rounded border-[#444444] text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181818] border border-[#262626] cursor-pointer hover:bg-[#1E1E1E]">
                <span className="text-[#AAAAAA]">Physical ESP32 Nodes Only</span>
                <input
                  type="checkbox"
                  checked={showPhysicalOnly}
                  onChange={(e) => setShowPhysicalOnly(e.target.checked)}
                  className="rounded border-[#444444] text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
