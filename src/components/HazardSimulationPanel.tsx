import React from 'react';
import {
  AlertTriangle,
  Flame,
  Activity,
  Wind,
  RotateCcw,
  ShieldCheck,
  Radio,
  BellRing,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface HazardSimulationPanelProps {
  activeHazards: string[];
  onTriggerHazard: (hazardType: 'roof_burst' | 'methane_outburst' | 'seismic_fault' | 'fan_failure') => void;
  onResetHazards: () => void;
  isEvacuationAlarmActive: boolean;
  onToggleEvacuationAlarm: () => void;
}

export const HazardSimulationPanel: React.FC<HazardSimulationPanelProps> = ({
  activeHazards,
  onTriggerHazard,
  onResetHazards,
  isEvacuationAlarmActive,
  onToggleEvacuationAlarm,
}) => {
  return (
    <div
      id="hazard-simulation-deck"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
          <div>
            <h3 className="text-sm font-semibold text-[#EDEDED]">
              Subterranean Hazard Injection & Evacuation Simulation Deck
            </h3>
            <p className="text-[11px] text-[#888888]">
              Test multi-level sensor mesh alarms, 3D rock burst visualizers, and rover autonomous response
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-evac-klaxon"
            onClick={onToggleEvacuationAlarm}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isEvacuationAlarmActive
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-950/50'
                : 'bg-[#181818] hover:bg-[#222222] text-[#CCCCCC] border border-[#2A2A2A]'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>{isEvacuationAlarmActive ? 'SILENCE EVACUATION KLAXON' : 'TRIGGER MINE EVAC KLAXON'}</span>
          </button>

          <button
            id="btn-reset-sensors"
            onClick={() => {
              soundEngine.playRadioSquelch();
              onResetHazards();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-cyan-300 border border-[#2A2A2A] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline Safe</span>
          </button>
        </div>
      </div>

      {/* Hazard Scenario Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* 1. Structural Roof Burst / Collapse */}
        <button
          id="btn-inject-roof-burst"
          onClick={() => {
            soundEngine.playSeismicThud(1.8);
            onTriggerHazard('roof_burst');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
            activeHazards.includes('roof_burst')
              ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50 ring-1 ring-red-500/50'
              : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#EDEDED]">1. Roof Burst / Delamination</span>
            <Activity className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[11px] text-[#888888] leading-snug">
            Injects +28.4″ bi-axial rock tilt & 480 cpm acoustic delamination spikes at Sub-level 3.
          </p>
          <div className="mt-2 text-[10px] font-mono text-red-400 font-bold">
            {activeHazards.includes('roof_burst') ? '● HAZARD ACTIVE' : '+ INJECT COLLAPSE'}
          </div>
        </button>

        {/* 2. Explosive Methane Outburst */}
        <button
          id="btn-inject-methane"
          onClick={() => {
            soundEngine.playGasWarningBeep();
            onTriggerHazard('methane_outburst');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
            activeHazards.includes('methane_outburst')
              ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/50'
              : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#EDEDED]">2. Methane (CH₄) Blowout</span>
            <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[11px] text-[#888888] leading-snug">
            Surges methane concentration to 64% LEL (3.2% Vol) & sniffer head to 8200 PPM.
          </p>
          <div className="mt-2 text-[10px] font-mono text-amber-400 font-bold">
            {activeHazards.includes('methane_outburst') ? '● HAZARD ACTIVE' : '+ INJECT GAS BLOWOUT'}
          </div>
        </button>

        {/* 3. Seismic Fault Slip */}
        <button
          id="btn-inject-seismic"
          onClick={() => {
            soundEngine.playSeismicThud(2.2);
            onTriggerHazard('seismic_fault');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
            activeHazards.includes('seismic_fault')
              ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/50'
              : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#EDEDED]">3. Seismic Fault Shockwave</span>
            <Activity className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[11px] text-[#888888] leading-snug">
            Generates 8.8 mm/s Peak Particle Velocity shockwave across tri-axial geophone mesh.
          </p>
          <div className="mt-2 text-[10px] font-mono text-purple-400 font-bold">
            {activeHazards.includes('seismic_fault') ? '● HAZARD ACTIVE' : '+ INJECT SEISMIC FAULT'}
          </div>
        </button>

        {/* 4. Ventilation Airway Trip */}
        <button
          id="btn-inject-vent-trip"
          onClick={() => {
            soundEngine.playRadioSquelch();
            onTriggerHazard('fan_failure');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
            activeHazards.includes('fan_failure')
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/50'
              : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#EDEDED]">4. Ventilation Fan Stoppage</span>
            <Wind className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[11px] text-[#888888] leading-snug">
            Drops airflow to 0.1 m/s, climbs coal dust to 42 mg/m³, and triggers asphyxiation warning.
          </p>
          <div className="mt-2 text-[10px] font-mono text-cyan-400 font-bold">
            {activeHazards.includes('fan_failure') ? '● HAZARD ACTIVE' : '+ INJECT FAN TRIP'}
          </div>
        </button>
      </div>
    </div>
  );
};
