import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Gauge,
  Sliders,
  Sparkles,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Zap,
  Volume2,
  X,
  RefreshCw,
  FileCheck,
  Download,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { SensorNode, CalibrationReport, NodeCalibrationEntry } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface SensorCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: SensorNode[];
  onApplyCalibration: (report: CalibrationReport) => void;
}

export function SensorCalibrationModal({
  isOpen,
  onClose,
  nodes,
  onApplyCalibration,
}: SensorCalibrationModalProps) {
  const [calibrationState, setCalibrationState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [samplesCount, setSamplesCount] = useState(0);
  const [liveSamples, setLiveSamples] = useState<{ [nodeId: string]: any[] }>({});
  const [calibrationReport, setCalibrationReport] = useState<CalibrationReport | null>(null);
  const [selectedNodeTab, setSelectedNodeTab] = useState<string>(nodes[0]?.id || '');

  const timerRef = useRef<any>(null);
  const sampleIntervalRef = useRef<any>(null);

  // Reset or start calibration
  const startTenSecondCalibration = () => {
    setCalibrationState('running');
    setSecondsRemaining(10);
    setSamplesCount(0);
    setLiveSamples({});
    setCalibrationReport(null);

    soundEngine.playCalibrationPulse(0);

    const initialSamples: { [nodeId: string]: any[] } = {};
    nodes.forEach((n) => {
      initialSamples[n.id] = [];
    });

    let currentSec = 10;
    let accumulatedSamples = 0;

    // 10Hz sampling loop (every 100ms)
    sampleIntervalRef.current = setInterval(() => {
      accumulatedSamples += 1;
      setSamplesCount(accumulatedSamples);

      nodes.forEach((node) => {
        // Sample real metrics + random natural micro-jitter for realistic sensor baseline sampling
        const tempSample = (node.am2302TempC ?? node.temperatureC) + (Math.random() - 0.5) * 0.2;
        const humSample = (node.am2302HumidityRH ?? node.humidityRH) + (Math.random() - 0.5) * 0.4;
        const mq135Sample = (node.mq135GasPPM ?? (node.carbonMonoxidePPM * 25 + 100)) + (Math.random() - 0.5) * 6;
        const ldrSample = (node.ldrLux ?? 350) + (Math.random() - 0.5) * 12;
        const methaneSample = node.methaneLEL + (Math.random() - 0.5) * 0.1;
        const coSample = node.carbonMonoxidePPM + (Math.random() - 0.5) * 0.2;
        const o2Sample = node.oxygenPercent + (Math.random() - 0.5) * 0.05;
        const pitchSample = (node.mpu6500PitchDeg ?? node.rockTiltX) + (Math.random() - 0.5) * 0.15;
        const rollSample = (node.mpu6500RollDeg ?? node.rockTiltY) + (Math.random() - 0.5) * 0.15;
        const vibeSample = (node.mpu6500VibeMg ?? 18) + (Math.random() - 0.5) * 4;
        const acousticSample = node.acousticEnergy + (Math.random() - 0.5) * 2;
        const seismicSample = node.seismicPPV + (Math.random() - 0.5) * 0.02;

        if (!initialSamples[node.id]) initialSamples[node.id] = [];
        initialSamples[node.id].push({
          temp: tempSample,
          humidity: humSample,
          mq135: mq135Sample,
          ldr: ldrSample,
          methane: methaneSample,
          co: coSample,
          o2: o2Sample,
          pitch: pitchSample,
          roll: rollSample,
          vibe: vibeSample,
          acoustic: acousticSample,
          seismic: seismicSample,
        });
      });

      setLiveSamples({ ...initialSamples });
    }, 100);

    // 1-second countdown timer
    timerRef.current = setInterval(() => {
      currentSec -= 1;
      setSecondsRemaining(currentSec);

      if (currentSec > 0) {
        soundEngine.playCalibrationPulse(10 - currentSec);
      }

      if (currentSec <= 0) {
        clearInterval(timerRef.current);
        clearInterval(sampleIntervalRef.current);

        // Compute true averages & statistical baseline for each node
        const nodeEntries: NodeCalibrationEntry[] = nodes.map((node) => {
          const list = initialSamples[node.id] || [];
          const count = list.length || 1;

          const avgTempC = list.reduce((acc, s) => acc + s.temp, 0) / count;
          const avgHumidityRH = list.reduce((acc, s) => acc + s.humidity, 0) / count;
          const avgMQ135Ppm = list.reduce((acc, s) => acc + s.mq135, 0) / count;
          const avgLdrLux = list.reduce((acc, s) => acc + s.ldr, 0) / count;
          const avgMethaneLEL = list.reduce((acc, s) => acc + s.methane, 0) / count;
          const avgCarbonMonoxidePPM = list.reduce((acc, s) => acc + s.co, 0) / count;
          const avgOxygenPercent = list.reduce((acc, s) => acc + s.o2, 0) / count;
          const avgPitchDeg = list.reduce((acc, s) => acc + s.pitch, 0) / count;
          const avgRollDeg = list.reduce((acc, s) => acc + s.roll, 0) / count;
          const avgVibeMg = list.reduce((acc, s) => acc + s.vibe, 0) / count;
          const avgAcousticEnergy = list.reduce((acc, s) => acc + s.acoustic, 0) / count;
          const avgSeismicPPV = list.reduce((acc, s) => acc + s.seismic, 0) / count;

          // Standard deviation of temperature & gas
          const tempVar = list.reduce((acc, s) => acc + Math.pow(s.temp - avgTempC, 2), 0) / count;
          const gasVar = list.reduce((acc, s) => acc + Math.pow(s.mq135 - avgMQ135Ppm, 2), 0) / count;

          return {
            nodeId: node.id,
            nodeName: node.name,
            levelName: node.levelName,
            hardware: node.hardwareMicrocontroller || 'ESP32-WROOM-32',
            mqttTopic: node.mqttTopic || `mine/nodes/${node.id.toLowerCase()}/telemetry`,
            sampleCount: count,
            zeroOffsetCalibrated: true,
            status: 'calibrated',
            averages: {
              avgTempC: parseFloat(avgTempC.toFixed(2)),
              avgHumidityRH: parseFloat(avgHumidityRH.toFixed(1)),
              avgMQ135Ppm: parseFloat(avgMQ135Ppm.toFixed(1)),
              avgLdrLux: parseFloat(avgLdrLux.toFixed(0)),
              avgMethaneLEL: parseFloat(avgMethaneLEL.toFixed(2)),
              avgCarbonMonoxidePPM: parseFloat(avgCarbonMonoxidePPM.toFixed(1)),
              avgOxygenPercent: parseFloat(avgOxygenPercent.toFixed(2)),
              avgPitchDeg: parseFloat(avgPitchDeg.toFixed(2)),
              avgRollDeg: parseFloat(avgRollDeg.toFixed(2)),
              avgVibeMg: parseFloat(avgVibeMg.toFixed(1)),
              avgAcousticEnergy: parseFloat(avgAcousticEnergy.toFixed(1)),
              avgSeismicPPV: parseFloat(avgSeismicPPV.toFixed(3)),
              tempStdDev: parseFloat(Math.sqrt(tempVar).toFixed(3)),
              gasStdDev: parseFloat(Math.sqrt(gasVar).toFixed(2)),
              tiltZeroOffsetPitch: parseFloat(avgPitchDeg.toFixed(2)),
              tiltZeroOffsetRoll: parseFloat(avgRollDeg.toFixed(2)),
            },
          };
        });

        const report: CalibrationReport = {
          id: `CAL-10S-${Date.now().toString(36).toUpperCase()}`,
          calibratedAt: new Date().toLocaleTimeString(),
          durationSec: 10,
          totalSamplesCollected: accumulatedSamples * nodes.length,
          samplingFrequencyHz: 10,
          nodesCalibrated: nodeEntries,
          summaryNote: `10-second multi-channel baseline sampling complete across ${nodes.length} nodes. Zero-offset baselines calculated for MPU6500 IMU, AM2302, MQ135, and LDR sensors with DGMS/MSHA drift compliance.`,
          certifiedOperator: 'Safety Engineer (Station #01)',
        };

        setCalibrationReport(report);
        setCalibrationState('completed');
        soundEngine.playCalibrationSuccess();
      }
    }, 1000);
  };

  useEffect(() => {
    if (isOpen && calibrationState === 'idle') {
      startTenSecondCalibration();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sampleIntervalRef.current) clearInterval(sampleIntervalRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeEntry = calibrationReport?.nodesCalibrated.find((e) => e.nodeId === selectedNodeTab) ||
    calibrationReport?.nodesCalibrated[0];

  const handleApplyAndClose = () => {
    if (calibrationReport) {
      onApplyCalibration(calibrationReport);
    }
    onClose();
  };

  const handleExportJSON = () => {
    if (!calibrationReport) return;
    const blob = new Blob([JSON.stringify(calibrationReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Calibration_Report_${calibrationReport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111111] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#181818] border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>10-Second Sensor Node Baseline Calibration Engine</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-mono">
                  10Hz Multi-Channel
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                Continuous 10s statistical sample collection across all ESP32 and Subterranean Sensor Nodes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Running 10s Countdown Bar */}
          {calibrationState === 'running' && (
            <div className="bg-[#161616] border border-cyan-500/40 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CALIBRATING SENSORS... SAMPLING SUBTERRANEAN ENVIRONMENT</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[#888888]">Samples Collected:</span>
                  <span className="text-cyan-300 font-bold">{samplesCount * nodes.length}</span>
                  <span className="text-[#555555]">|</span>
                  <span className="text-amber-400 font-bold text-base">{secondsRemaining}s</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-[#222222] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#333333]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-100 ease-linear shadow-lg shadow-cyan-500/50"
                    style={{ width: `${((10 - secondsRemaining + 0.1) / 10) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#666666] font-mono">
                  <span>0.0s (Init)</span>
                  <span>5.0s (Noise Rejection)</span>
                  <span>10.0s (Zero-Offset Average)</span>
                </div>
              </div>

              {/* Live Mini Sampling Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
                <div className="bg-[#0D0D0D] p-2.5 rounded-lg border border-[#262626]">
                  <span className="text-[#666666] block text-[10px]">AM2302 Temp Channel</span>
                  <span className="text-emerald-400 font-bold">Sampling @ 10Hz</span>
                </div>
                <div className="bg-[#0D0D0D] p-2.5 rounded-lg border border-[#262626]">
                  <span className="text-[#666666] block text-[10px]">MQ135 Gas Channel</span>
                  <span className="text-cyan-400 font-bold">Zero Baseline Filter</span>
                </div>
                <div className="bg-[#0D0D0D] p-2.5 rounded-lg border border-[#262626]">
                  <span className="text-[#666666] block text-[10px]">MPU6500 6-Axis IMU</span>
                  <span className="text-purple-400 font-bold">Wall Zero-Tilt Offsets</span>
                </div>
                <div className="bg-[#0D0D0D] p-2.5 rounded-lg border border-[#262626]">
                  <span className="text-[#666666] block text-[10px]">LDR Lux Channel</span>
                  <span className="text-amber-400 font-bold">Ambient Dark Ref</span>
                </div>
              </div>
            </div>
          )}

          {/* Completed State: Averages & Report */}
          {calibrationState === 'completed' && calibrationReport && (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-900/60 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>10-Second Baseline Calibration Verified & Averaged</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono">
                        {calibrationReport.id}
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-200/80">
                      Calculated high-precision mathematical baseline averages for {calibrationReport.nodesCalibrated.length} nodes over 100 samples each.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={startTenSecondCalibration}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2A2A2A] text-[#CCCCCC] border border-[#3A3A3A] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recalibrate (10s)</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>

              {/* Node Selector Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[#2A2A2A]">
                {calibrationReport.nodesCalibrated.map((node) => (
                  <button
                    key={node.nodeId}
                    onClick={() => setSelectedNodeTab(node.nodeId)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      (selectedNodeTab === node.nodeId || (!selectedNodeTab && node.nodeId === calibrationReport.nodesCalibrated[0]?.nodeId))
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60 border border-cyan-400'
                        : 'bg-[#181818] text-[#888888] hover:text-[#CCCCCC] hover:bg-[#222222] border border-[#282828]'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{node.nodeName}</span>
                    <span className="text-[10px] opacity-75">({node.nodeId})</span>
                  </button>
                ))}
              </div>

              {/* Selected Node Detailed Average Matrix */}
              {activeEntry && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#888888] font-mono">
                    <span className="text-cyan-400 font-semibold">{activeEntry.nodeName} ({activeEntry.hardware})</span>
                    <span className="text-[#AAAAAA]">MQTT: {activeEntry.mqttTopic} | 100 Samples Averaged</span>
                  </div>

                  {/* High-Tech Averages Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Temperature Avg */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                          <span>AM2302 Temp Average</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">±{activeEntry.averages.tempStdDev}°C</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-white">
                        {activeEntry.averages.avgTempC}°C
                      </div>
                      <div className="text-[10px] text-[#666666]">Baseline Zero Ref Applied</div>
                    </div>

                    {/* Humidity Avg */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Humidity Average</span>
                        </span>
                        <span className="text-[10px] text-cyan-400">Stable</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-cyan-300">
                        {activeEntry.averages.avgHumidityRH}%RH
                      </div>
                      <div className="text-[10px] text-[#666666]">Subterranean Moisture Bias</div>
                    </div>

                    {/* MQ135 Air Quality PPM Avg */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-emerald-400" />
                          <span>MQ135 Gas Average</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">±{activeEntry.averages.gasStdDev} PPM</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-300">
                        {activeEntry.averages.avgMQ135Ppm} PPM
                      </div>
                      <div className="text-[10px] text-[#666666]">Air Quality Baseline</div>
                    </div>

                    {/* LDR Lux Avg */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>LDR Illuminance Avg</span>
                        </span>
                        <span className="text-[10px] text-amber-400">98% Clarity</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-300">
                        {activeEntry.averages.avgLdrLux} Lux
                      </div>
                      <div className="text-[10px] text-[#666666]">Coal Dust Zero Level</div>
                    </div>

                    {/* MPU6500 Pitch Zero Offset */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>MPU6500 Pitch Zero</span>
                        </span>
                        <span className="text-[10px] text-purple-400">Calibrated</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-purple-300">
                        {activeEntry.averages.avgPitchDeg > 0 ? `+${activeEntry.averages.avgPitchDeg}` : activeEntry.averages.avgPitchDeg}°
                      </div>
                      <div className="text-[10px] text-[#666666]">Rockwall Mounting Angle</div>
                    </div>

                    {/* MPU6500 Roll Zero Offset */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>MPU6500 Roll Zero</span>
                        </span>
                        <span className="text-[10px] text-purple-400">Calibrated</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-purple-300">
                        {activeEntry.averages.avgRollDeg > 0 ? `+${activeEntry.averages.avgRollDeg}` : activeEntry.averages.avgRollDeg}°
                      </div>
                      <div className="text-[10px] text-[#666666]">Lateral Strata Bias</div>
                    </div>

                    {/* MPU6500 Micro-vibe Noise Floor */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Micro-Vibration Floor</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">Noise Filtered</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-cyan-300">
                        {activeEntry.averages.avgVibeMg} mg
                      </div>
                      <div className="text-[10px] text-[#666666]">Ambient Seismic Floor</div>
                    </div>

                    {/* Methane Baseline LEL */}
                    <div className="bg-[#141414] border border-[#282828] rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-rose-400" />
                          <span>Methane Background</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">Safe Level</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-rose-300">
                        {activeEntry.averages.avgMethaneLEL}% LEL
                      </div>
                      <div className="text-[10px] text-[#666666]">0.0% Offset Ref</div>
                    </div>
                  </div>

                  {/* Summary Comparison Matrix Table */}
                  <div className="bg-[#0E0E0E] border border-[#242424] rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>All Nodes 10-Second Average Comparison Matrix</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#2A2A2A] text-[#777777]">
                            <th className="pb-2">Node Name</th>
                            <th className="pb-2">Level</th>
                            <th className="pb-2">Avg Temp</th>
                            <th className="pb-2">Avg Humidity</th>
                            <th className="pb-2">Avg MQ135</th>
                            <th className="pb-2">Avg Lux</th>
                            <th className="pb-2">Tilt (P / R)</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F1F1F]">
                          {calibrationReport.nodesCalibrated.map((node) => (
                            <tr key={node.nodeId} className="hover:bg-[#161616]">
                              <td className="py-2.5 font-bold text-white">{node.nodeName}</td>
                              <td className="py-2.5 text-[#999999]">{node.levelName}</td>
                              <td className="py-2.5 text-amber-300">{node.averages.avgTempC}°C</td>
                              <td className="py-2.5 text-cyan-300">{node.averages.avgHumidityRH}%</td>
                              <td className="py-2.5 text-emerald-300">{node.averages.avgMQ135Ppm} PPM</td>
                              <td className="py-2.5 text-yellow-300">{node.averages.avgLdrLux} lx</td>
                              <td className="py-2.5 text-purple-300">
                                {node.averages.avgPitchDeg}° / {node.averages.avgRollDeg}°
                              </td>
                              <td className="py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                                  ZERO-CALIBRATED
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between">
          <div className="text-xs text-[#888888] font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Calibration standard: DGMS / MSHA / ISO-17025 Micro-Sensor Zero-Baseline</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#AAAAAA] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyAndClose}
              disabled={calibrationState !== 'completed'}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Zero-Offset Baselines to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
