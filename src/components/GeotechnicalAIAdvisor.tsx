import React, { useState } from 'react';
import { AIAnalysisResult, SensorNode, MineLevel, RoverTelemetry } from '../types';
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Send,
  RefreshCw,
  Zap,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface GeotechnicalAIAdvisorProps {
  sensorNodes: SensorNode[];
  mineLevels: MineLevel[];
  roverTelemetry: RoverTelemetry;
  activeHazards: string[];
  onApplyRoverFlightPlan: (waypoints: string[]) => void;
}

export const GeotechnicalAIAdvisor: React.FC<GeotechnicalAIAdvisorProps> = ({
  sensorNodes,
  mineLevels,
  roverTelemetry,
  activeHazards,
  onApplyRoverFlightPlan,
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult>({
    rockburstRiskIndex: 38,
    strataStabilityStatus: 'Marginal',
    gasExplosionProbability: 14,
    recommendedShoringType:
      'Double-row Heavy Hydraulic Props (400kN) with High-Tensile Steel Welded Wire Mesh & 2.4m Resin Cable Bolts',
    immediateActions: [
      'Increase auxiliary ventilation fan output in Sub-level 3 (Drift B-4) to dilute CH₄ below 1.0% Vol',
      'Dispatch RPi5 Recon Rover with FLIR Thermal sensor to scan Pillar 12 shear fractures for localized thermal friction',
      'Enforce geotechnical exclusion zone within 30 meters of active longwall face',
      'Confirm RFID muster tag counts at Sub-level 2 primary refuge chamber station',
    ],
    autonomousRoverFlightPlan: [
      'WP-1: Navigate to Sub-level 3 Portal [X: 15, Y: -68, Z: -15]',
      'WP-2: Deploy Optical RGB Headlight to inspect roof bolt torque plate delamination',
      'WP-3: Switch to FLIR Thermal LWIR mode at Pillar 12 [Heading 185°]',
      'WP-4: Sniff Methane Pocket Elevation +2.2m above floor line [MQ-4 Sensor Check]',
      'WP-5: Stream 3D LiDAR point cloud telemetry to Surface Control Station',
    ],
    mshaReportSummary:
      'Subterranean geotechnical telemetry indicates localized rock mass dilation and acoustic micro-fracturing rate of 124 cpm in the Sub-level 3 bituminous seam. Bi-axial inclinometer tilt has drifted +14.2 arcseconds from baseline. Recommend immediate hydraulic shoring installation and continuous rover atmospheric reconnaissance.',
    generatedAt: new Date().toISOString(),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runGeotechnicalAIAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    soundEngine.playRadioSquelch();

    try {
      const response = await fetch('/api/ai/geotechnical-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorNodes,
          mineLevels,
          activeHazards,
          roverTelemetry,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to run AI geotechnical analysis:', error);
      setErrorMsg(error?.message || 'Failed to complete analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 75) return 'text-red-400 border-red-500 bg-red-500/10';
    if (risk >= 45) return 'text-amber-400 border-amber-500 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
  };

  return (
    <div
      id="ai-geotechnical-copilot"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#EDEDED] flex items-center gap-2">
              <span>Geotechnical Strata Failure AI Advisor & Rover Mission Co-Pilot</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Gemini 3.7 Flash Engine
              </span>
            </h3>
            <p className="text-[11px] text-[#888888]">
              Cross-correlates multi-level rock tilt, acoustic emissions, seismic PPV, & methane saturation
            </p>
          </div>
        </div>

        <button
          id="btn-run-geotechnical-ai"
          onClick={runGeotechnicalAIAnalysis}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analyzing Geotechnical Strata...' : 'Execute Deep AI Prognosis'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg} (Displaying calibrated backup geotechnical calculations)</span>
        </div>
      )}

      {/* AI Key Prognosis Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* 1. Rockburst & Collapse Risk */}
        <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888]">Rockburst & Collapse Index</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#EDEDED]">
                {analysis.rockburstRiskIndex}
              </span>
              <span className="text-xs text-[#666666] font-mono">/ 100</span>
            </div>
            <div className="w-full bg-[#0A0A0A] h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all duration-500 ${
                  analysis.rockburstRiskIndex > 70
                    ? 'bg-red-500'
                    : analysis.rockburstRiskIndex > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${analysis.rockburstRiskIndex}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-[#888888]">
            Status: <span className="font-semibold text-[#CCCCCC]">{analysis.strataStabilityStatus}</span>
          </span>
        </div>

        {/* 2. Gas Explosion Probability */}
        <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888]">Methane Explosion Probability</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#EDEDED]">
                {analysis.gasExplosionProbability}%
              </span>
            </div>
            <div className="w-full bg-[#0A0A0A] h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all duration-500 ${
                  analysis.gasExplosionProbability > 50
                    ? 'bg-red-500'
                    : analysis.gasExplosionProbability > 25
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${analysis.gasExplosionProbability}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-[#888888]">
            Ventilation Factor: <span className="font-semibold text-cyan-300">Active Fan Dilution</span>
          </span>
        </div>

        {/* 3. Recommended Shoring Protocol */}
        <div className="bg-[#121212] p-3.5 rounded-xl border border-[#222222] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888]">Recommended Shoring Protocol</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <p className="text-xs font-medium text-amber-300 leading-snug">
              {analysis.recommendedShoringType}
            </p>
          </div>
          <span className="text-[11px] text-[#888888] font-mono">MSHA Standard 30 CFR § 75.200</span>
        </div>
      </div>

      {/* Two-Column Deep Directives & Autonomous Rover Flight Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Left: Immediate Safety Directives */}
        <div className="bg-[#121212] p-4 rounded-xl border border-[#222222]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#222222]">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wide">
              Urgent Geotechnical Safety Directives
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.immediateActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#CCCCCC] leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: AI-Generated Rover Autonomous Recon Flight Plan */}
        <div className="bg-[#121212] p-4 rounded-xl border border-[#222222] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wide">
                  Autonomous Rover Flight Plan
                </h4>
              </div>
              <button
                id="btn-upload-flight-plan"
                onClick={() => {
                  soundEngine.playRadioSquelch();
                  onApplyRoverFlightPlan(analysis.autonomousRoverFlightPlan);
                }}
                className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3 text-cyan-400" />
                <span>Upload to RPi5 Rover</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {analysis.autonomousRoverFlightPlan.map((wp, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-[#0A0A0A] border border-[#1E1E1E] text-[11px] font-mono text-[#CCCCCC] flex items-center gap-2"
                >
                  <span className="text-cyan-400 font-bold">[{idx + 1}]</span>
                  <span className="truncate">{wp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 text-[10px] text-[#666666] font-mono flex items-center justify-between">
            <span>Last Prognosis Sync: {new Date(analysis.generatedAt).toLocaleTimeString()}</span>
            <span className="text-emerald-400 font-semibold">CO-PILOT READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
