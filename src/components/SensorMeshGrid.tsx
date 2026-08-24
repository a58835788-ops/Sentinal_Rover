import React, { useState } from 'react';
import { SensorNode, AlertSeverity } from '../types';
import {
  Activity,
  AlertTriangle,
  Wind,
  Flame,
  Gauge,
  SlidersHorizontal,
  Compass,
  Radio,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface SensorMeshGridProps {
  nodes: SensorNode[];
  selectedNode: SensorNode | null;
  onSelectNode: (node: SensorNode) => void;
}

export const SensorMeshGrid: React.FC<SensorMeshGridProps> = ({
  nodes,
  selectedNode,
  onSelectNode,
}) => {
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'methane' | 'tilt' | 'acoustic'>('methane');

  const filteredNodes = nodes
    .filter((n) => {
      if (levelFilter !== 'all' && n.level !== levelFilter) return false;
      if (severityFilter !== 'all' && n.status !== severityFilter) return false;
      if (
        searchTerm &&
        !n.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !n.levelName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'methane') return b.methaneLEL - a.methaneLEL;
      if (sortBy === 'tilt')
        return Math.max(Math.abs(b.rockTiltX), Math.abs(b.rockTiltY)) -
          Math.max(Math.abs(a.rockTiltX), Math.abs(a.rockTiltY));
      if (sortBy === 'acoustic') return b.acousticEnergy - a.acousticEnergy;
      return a.name.localeCompare(b.name);
    });

  const getSeverityBadge = (status: AlertSeverity) => {
    switch (status) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            CRITICAL ALARM
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            WARNING
          </span>
        );
      case 'caution':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
            CAUTION
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            STABLE
          </span>
        );
    }
  };

  return (
    <div
      id="sensor-mesh-network-section"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-[#EDEDED]">
              Subterranean Geotechnical & Atmospheric Sensor Mesh Telemetry
            </h3>
          </div>
          <p className="text-[11px] text-[#888888] mt-0.5">
            Real-time rock inclinometer tilt angles, acoustic roof micro-fracture energy, seismic geophones, & gas sensors
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777777]" />
            <input
              type="text"
              placeholder="Search nodes or drifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#2A2A2A] text-[#EDEDED] text-xs focus:outline-none focus:border-cyan-500 w-40"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#2A2A2A] text-[#CCCCCC] text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Sub-levels</option>
            <option value={1}>Sub-level 1 (-240m)</option>
            <option value={2}>Sub-level 2 (-480m)</option>
            <option value={3}>Sub-level 3 (-720m)</option>
            <option value={4}>Sub-level 4 (-960m)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'methane' | 'tilt' | 'acoustic')}
            className="px-2.5 py-1.5 rounded-lg bg-[#121212] border border-[#2A2A2A] text-[#CCCCCC] text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="methane">Sort: Methane (CH₄)</option>
            <option value="tilt">Sort: Rock Tilt Angle</option>
            <option value="acoustic">Sort: Acoustic Spikes</option>
            <option value="name">Sort: Node Name</option>
          </select>
        </div>
      </div>

      {/* Sensor Mesh Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {filteredNodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#181818] border-cyan-400 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-950/40'
                  : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#EDEDED] text-xs">{node.name}</span>
                  </div>
                  <span className="text-[10px] text-[#888888]">{node.levelName}</span>
                </div>
                {getSeverityBadge(node.status)}
              </div>

              {/* Geotechnical Telemetry Quad */}
              <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#0A0A0A] rounded-lg border border-[#1F1F1F] text-xs font-mono">
                {/* 1. Bi-axial Rock Inclinometer Tilt */}
                <div>
                  <span className="text-[9px] text-[#666666] block uppercase">Bi-axial Tilt (″)</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                    <span
                      className={`font-semibold ${
                        Math.abs(node.rockTiltX) > node.tiltThreshold ||
                        Math.abs(node.rockTiltY) > node.tiltThreshold
                          ? 'text-red-400'
                          : 'text-[#CCCCCC]'
                      }`}
                    >
                      X:{node.rockTiltX.toFixed(1)}″ Y:{node.rockTiltY.toFixed(1)}″
                    </span>
                  </div>
                </div>

                {/* 2. Acoustic Emission Roof Micro-tremor */}
                <div>
                  <span className="text-[9px] text-[#666666] block uppercase">Acoustic Energy</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Activity className="w-3 h-3 text-amber-400" />
                    <span
                      className={`font-semibold ${
                        node.acousticSeverity === 'delamination_risk'
                          ? 'text-red-400'
                          : node.acousticSeverity === 'micro-fracturing'
                          ? 'text-amber-400'
                          : 'text-[#CCCCCC]'
                      }`}
                    >
                      {node.acousticEnergy} cpm ({node.acousticFreqSpikes}kHz)
                    </span>
                  </div>
                </div>

                {/* 3. Seismic Geophone PPV */}
                <div>
                  <span className="text-[9px] text-[#666666] block uppercase">Seismic Geophone</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-[#777777]">PPV:</span>
                    <span
                      className={`font-semibold ${
                        node.seismicPPV > 5.0 ? 'text-red-400' : 'text-[#CCCCCC]'
                      }`}
                    >
                      {node.seismicPPV.toFixed(2)} mm/s
                    </span>
                  </div>
                </div>

                {/* 4. Methane (CH4) Concentration */}
                <div>
                  <span className="text-[9px] text-[#666666] block uppercase">Methane (CH₄)</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span
                      className={`font-bold ${
                        node.methaneLEL > 20
                          ? 'text-red-400'
                          : node.methaneLEL > 10
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {node.methaneLEL.toFixed(1)}% LEL ({node.methaneVol.toFixed(2)}%V)
                    </span>
                  </div>
                </div>
              </div>

              {/* Atmospheric Bar */}
              <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] font-mono text-[#888888] bg-[#0A0A0A] p-1.5 rounded border border-[#1C1C1C]">
                <div>CO: <span className="text-[#CCCCCC]">{node.carbonMonoxidePPM}ppm</span></div>
                <div>O₂: <span className="text-[#CCCCCC]">{node.oxygenPercent.toFixed(1)}%</span></div>
                <div>Air: <span className="text-[#CCCCCC]">{node.airflowVelocity.toFixed(1)}m/s</span></div>
                <div>Dust: <span className="text-[#CCCCCC]">{node.coalDustMgM3}mg</span></div>
              </div>

              {/* Node Health & RSSI */}
              <div className="flex items-center justify-between text-[10px] text-[#666666] mt-2">
                <span>Mesh RSSI: {node.meshRssi} dBm</span>
                <span>Battery: {node.batteryPercent}%</span>
                <span>{node.lastUpdated}</span>
              </div>

              {/* Physical Prototype Specific Hardware Badge & Readouts */}
              {node.isPhysicalPrototype && (
                <div className="mt-2.5 pt-2 border-t border-[#222222] bg-[#0A0D14] -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      PHYSICAL PROTOTYPE (ESP32)
                    </span>
                    <span className="text-[#888888]">{node.mqttTopic}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-[#AAAAAA]">
                    <div className="bg-[#141414] p-1 rounded">
                      PIR: <strong className={node.pirMotionDetected ? 'text-cyan-400 font-bold' : 'text-[#888888]'}>{node.pirMotionDetected ? 'MOTION' : 'IDLE'}</strong>
                    </div>
                    <div className="bg-[#141414] p-1 rounded">
                      MQ135: <strong className="text-amber-300">{node.mq135GasPPM ?? 140} ppm</strong>
                    </div>
                    <div className="bg-[#141414] p-1 rounded">
                      LDR: <strong className="text-emerald-400">{node.ldrVisibilityPercent ?? 90}% Vis</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
