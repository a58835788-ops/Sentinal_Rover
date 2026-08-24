import React, { useState, useEffect, useRef } from 'react';
import {
  SensorNode,
  MineLevel,
  RoverTelemetry,
  WorkOrder,
  MinerMusterRecord,
  VisionMode,
  AlertSeverity,
  SurfaceSubsidenceZone,
} from './types';
import { MineTwin3D } from './components/MineTwin3D';
import { RoverHUD } from './components/RoverHUD';
import { RoverControls } from './components/RoverControls';
import { SensorMeshGrid } from './components/SensorMeshGrid';
import { GeotechnicalAIAdvisor } from './components/GeotechnicalAIAdvisor';
import { WorkOrdersAndMuster } from './components/WorkOrdersAndMuster';
import { HazardSimulationPanel } from './components/HazardSimulationPanel';
import { Rpi5CodeModal } from './components/Rpi5CodeModal';
import { TwoWayAudioIntercom } from './components/TwoWayAudioIntercom';
import { HumanTransitTracker } from './components/HumanTransitTracker';
import { RemoteRoverSite } from './components/RemoteRoverSite';
import { MineTacticalRadar } from './components/MineTacticalRadar';
import { SensorCalibrationModal } from './components/SensorCalibrationModal';
import { CalibrationReport } from './types';
import { soundEngine } from './audio/soundEngine';
import {
  Radio,
  Gamepad2,
  Sparkles,
  Wrench,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  AlertTriangle,
  HardHat,
  Radar,
  Sliders,
  Check,
  Footprints,
  Code2,
  Siren,
} from 'lucide-react';

export default function App() {
  // 1. Navigation State - Streamlined to 6 clean operational tabs with 3D Mine Site as primary
  const [activeTab, setActiveTab] = useState<
    'spatial_twin' | 'tactical_radar' | 'human_transit' | 'rover_ops' | 'ai_geotechnical' | 'work_orders'
  >('spatial_twin');
  const [roverSubView, setRoverSubView] = useState<'cockpit' | 'teleop_station'>('cockpit');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isEvacuationAlarmActive, setIsEvacuationAlarmActive] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [lastCalibrationReport, setLastCalibrationReport] = useState<CalibrationReport | null>(null);
  const [calibrationToast, setCalibrationToast] = useState<string | null>(null);

  // 2. Surface Subsidence Zones
  const [subsidenceZones, setSubsidenceZones] = useState<SurfaceSubsidenceZone[]>([
    {
      zoneId: 'A',
      name: 'North Overburden Caprock Zone A',
      seamDepthM: 240,
      subsidenceRateMmDay: 0.4,
      cumulativeDisplacementMm: 1.8,
      tiltArcSec: 2.1,
      riskScore: 14,
      status: 'normal',
      recommendedAction: 'Routine InSAR & ESP-MESH surface node monitoring',
    },
    {
      zoneId: 'B',
      name: 'Central Longwall Seam 4 Panel Zone B',
      seamDepthM: 720,
      subsidenceRateMmDay: 4.8,
      cumulativeDisplacementMm: 18.4,
      tiltArcSec: 34.2,
      riskScore: 86,
      status: 'critical',
      recommendedAction: 'Immediate dispatch of SentinelRover & worker withdrawal from Drift B-4',
    },
    {
      zoneId: 'C',
      name: 'East Conveyor Portal Heading Zone C',
      seamDepthM: 480,
      subsidenceRateMmDay: 1.1,
      cumulativeDisplacementMm: 4.2,
      tiltArcSec: 6.8,
      riskScore: 32,
      status: 'caution',
      recommendedAction: 'Inspect shoring arches & verify conveyor belt strain gauges',
    },
    {
      zoneId: 'D',
      name: 'South Ventilation Shaft Outcrop Zone D',
      seamDepthM: 960,
      subsidenceRateMmDay: 0.2,
      cumulativeDisplacementMm: 0.9,
      tiltArcSec: 1.4,
      riskScore: 8,
      status: 'normal',
      recommendedAction: 'Normal baseline ventilation and acoustic monitoring',
    },
  ]);

  // 3. Active Mine Descent Levels
  const [mineLevels] = useState<MineLevel[]>([
    {
      level: 1,
      name: 'Sub-Level 1 (Longwall Panel Alpha)',
      depthMeters: 240,
      status: 'normal',
      activeMiners: 8,
      description: 'Active coal shearer longwall retreat panel with hydraulic shield supports.',
      temperatureAvg: 21.4,
      methaneAvg: 0.35,
      activeShoringUnits: 42,
    },
    {
      level: 2,
      name: 'Sub-Level 2 (Haulage Drift & Conveyor Seam)',
      depthMeters: 480,
      status: 'normal',
      activeMiners: 6,
      description: 'Continuous rubber conveyor belt haulage heading and Primary Refuge Chamber Station #1.',
      temperatureAvg: 23.8,
      methaneAvg: 0.48,
      activeShoringUnits: 68,
    },
    {
      level: 3,
      name: 'Sub-Level 3 (Pillar 12 Retreat & Gas Drainage)',
      depthMeters: 720,
      status: 'critical',
      activeMiners: 4,
      description: 'High-methane coal seam extraction heading with borehole drainage and cross-cut drifts.',
      temperatureAvg: 26.5,
      methaneAvg: 1.85,
      activeShoringUnits: 94,
    },
    {
      level: 4,
      name: 'Sub-Level 4 (Deep Seam Extraction & Water Sump)',
      depthMeters: 960,
      status: 'normal',
      activeMiners: 2,
      description: 'Deepest exploratory drift, high overburden lithostatic pressure, and emergency dewatering sump.',
      temperatureAvg: 29.2,
      methaneAvg: 0.82,
      activeShoringUnits: 55,
    },
  ]);

  // 4. Geotechnical & Atmospheric Sensor Mesh Nodes
  const [sensorNodes, setSensorNodes] = useState<SensorNode[]>([
    {
      id: 'NODE-SRF-01',
      name: 'Surface Panel Zone A InSAR Beacon',
      level: 0,
      levelName: 'Surface Overburden',
      position3D: [-50, 2, -40],
      status: 'normal',
      isSurfaceNode: true,
      hasSosButton: false,
      rockTiltX: 0.8,
      rockTiltY: 0.4,
      tiltThreshold: 10.0,
      surfaceDisplacementMm: 1.8,
      crackStrainMicroStrain: 42,
      acousticEnergy: 12,
      acousticFreqSpikes: 1.2,
      acousticSeverity: 'stable',
      seismicPPV: 0.18,
      seismicRichter: 0.4,
      methaneLEL: 0.0,
      methaneVol: 0.0,
      carbonMonoxidePPM: 0,
      oxygenPercent: 20.9,
      coalDustMgM3: 0.2,
      airflowVelocity: 3.8,
      temperatureC: 28.5,
      humidityRH: 48,
      barometricPressureKPa: 101.3,
      lastUpdated: 'Just now',
      batteryPercent: 98,
      meshRssi: -45,
    },
    {
      id: 'NODE-SRF-02',
      name: 'Surface Panel Zone B Subsidence Trigger',
      level: 0,
      levelName: 'Surface Overburden',
      position3D: [-25, 2, 25],
      status: 'critical',
      isSurfaceNode: true,
      hasSosButton: false,
      rockTiltX: 34.2,
      rockTiltY: 28.5,
      tiltThreshold: 12.0,
      surfaceDisplacementMm: 18.4,
      crackStrainMicroStrain: 420,
      acousticEnergy: 340,
      acousticFreqSpikes: 16.8,
      acousticSeverity: 'delamination_risk',
      seismicPPV: 4.8,
      seismicRichter: 2.2,
      methaneLEL: 0.0,
      methaneVol: 0.0,
      carbonMonoxidePPM: 0,
      oxygenPercent: 20.9,
      coalDustMgM3: 0.4,
      airflowVelocity: 2.9,
      temperatureC: 29.1,
      humidityRH: 52,
      barometricPressureKPa: 101.2,
      lastUpdated: 'Just now',
      batteryPercent: 94,
      meshRssi: -52,
    },
    {
      id: 'NODE-SL1-01',
      name: 'Drift 1-A Rock Inclinometer',
      level: 1,
      levelName: 'Sub-level 1 (-240m)',
      position3D: [-25, -20, 10],
      status: 'normal',
      hasSosButton: true,
      rockTiltX: 1.4,
      rockTiltY: -0.8,
      tiltThreshold: 12.0,
      acousticEnergy: 18,
      acousticFreqSpikes: 2.1,
      acousticSeverity: 'stable',
      seismicPPV: 0.34,
      seismicRichter: 0.8,
      methaneLEL: 6.2,
      methaneVol: 0.31,
      carbonMonoxidePPM: 4,
      oxygenPercent: 20.8,
      coalDustMgM3: 1.4,
      airflowVelocity: 2.4,
      temperatureC: 21.2,
      humidityRH: 68,
      barometricPressureKPa: 104.2,
      lastUpdated: 'Just now',
      batteryPercent: 94,
      meshRssi: -54,
    },
    {
      id: 'NODE-SL1-02',
      name: 'Longwall Panel Shearer Monitor',
      level: 1,
      levelName: 'Sub-level 1 (-240m)',
      position3D: [30, -20, -15],
      status: 'normal',
      hasSosButton: true,
      rockTiltX: -2.1,
      rockTiltY: 1.9,
      tiltThreshold: 12.0,
      acousticEnergy: 34,
      acousticFreqSpikes: 4.8,
      acousticSeverity: 'stable',
      seismicPPV: 0.78,
      seismicRichter: 1.1,
      methaneLEL: 8.5,
      methaneVol: 0.42,
      carbonMonoxidePPM: 6,
      oxygenPercent: 20.6,
      coalDustMgM3: 3.8,
      airflowVelocity: 2.1,
      temperatureC: 22.0,
      humidityRH: 72,
      barometricPressureKPa: 104.1,
      lastUpdated: 'Just now',
      batteryPercent: 88,
      meshRssi: -58,
    },
    {
      id: 'NODE-SL2-01',
      name: 'Conveyor Trunk Station 2',
      level: 2,
      levelName: 'Sub-level 2 (-480m)',
      position3D: [-15, -42, -20],
      status: 'normal',
      hasSosButton: true,
      rockTiltX: 3.8,
      rockTiltY: 2.1,
      tiltThreshold: 15.0,
      acousticEnergy: 24,
      acousticFreqSpikes: 3.2,
      acousticSeverity: 'stable',
      seismicPPV: 0.45,
      seismicRichter: 0.9,
      methaneLEL: 9.4,
      methaneVol: 0.47,
      carbonMonoxidePPM: 8,
      oxygenPercent: 20.4,
      coalDustMgM3: 4.2,
      airflowVelocity: 1.8,
      temperatureC: 23.5,
      humidityRH: 75,
      barometricPressureKPa: 107.5,
      lastUpdated: 'Just now',
      batteryPercent: 91,
      meshRssi: -62,
    },
    {
      id: 'NODE-SL2-02',
      name: 'Refuge Bay Safety Station',
      level: 2,
      levelName: 'Sub-level 2 (-480m)',
      position3D: [35, -42, 15],
      status: 'normal',
      hasSosButton: true,
      rockTiltX: 0.4,
      rockTiltY: 0.2,
      tiltThreshold: 10.0,
      acousticEnergy: 8,
      acousticFreqSpikes: 1.2,
      acousticSeverity: 'stable',
      seismicPPV: 0.12,
      seismicRichter: 0.4,
      methaneLEL: 2.1,
      methaneVol: 0.1,
      carbonMonoxidePPM: 1,
      oxygenPercent: 20.9,
      coalDustMgM3: 0.5,
      airflowVelocity: 3.2,
      temperatureC: 21.0,
      humidityRH: 55,
      barometricPressureKPa: 107.8,
      lastUpdated: 'Just now',
      batteryPercent: 99,
      meshRssi: -48,
    },
    {
      id: 'NODE-SL3-01',
      name: 'ESP32 Physical Node #1 (Entry Gallery A)',
      level: 3,
      levelName: 'Sub-level 3 (-720m)',
      position3D: [-35, -68, 15],
      status: 'normal',
      isPhysicalPrototype: true,
      hardwareMicrocontroller: 'ESP32-WROOM-32',
      mqttTopic: 'mine/nodes/node_01/telemetry',
      hasSosButton: true,
      sosTriggered: false,
      pirMotionDetected: false,
      pirTransitCounter: 14,
      mpu6500PitchDeg: 1.4,
      mpu6500RollDeg: -0.8,
      mpu6500VibeMg: 18,
      mpu6500CollisionRisk: 'stable',
      am2302TempC: 22.4,
      am2302HumidityRH: 64,
      mq135GasPPM: 142,
      mq135AirQualityRating: 'Clean',
      ldrLux: 480,
      ldrVisibilityPercent: 94,
      rockTiltX: 1.4,
      rockTiltY: -0.8,
      tiltThreshold: 18.0,
      acousticEnergy: 24,
      acousticFreqSpikes: 2.4,
      acousticSeverity: 'stable',
      seismicPPV: 0.35,
      seismicRichter: 0.6,
      methaneLEL: 6.2,
      methaneVol: 0.31,
      carbonMonoxidePPM: 4,
      oxygenPercent: 20.8,
      coalDustMgM3: 1.2,
      airflowVelocity: 2.8,
      temperatureC: 22.4,
      humidityRH: 64,
      barometricPressureKPa: 111.2,
      lastUpdated: 'Just now',
      batteryPercent: 96,
      meshRssi: -48,
    },
    {
      id: 'NODE-SL3-02',
      name: 'ESP32 Physical Node #2 (Drift B-4 Heading)',
      level: 3,
      levelName: 'Sub-level 3 (-720m)',
      position3D: [-45, -68, 25],
      status: 'critical',
      isPhysicalPrototype: true,
      hardwareMicrocontroller: 'ESP32-WROOM-32',
      mqttTopic: 'mine/nodes/node_02/telemetry',
      hasSosButton: true,
      sosTriggered: true,
      pirMotionDetected: false,
      pirTransitCounter: 12,
      mpu6500PitchDeg: 28.5,
      mpu6500RollDeg: 19.2,
      mpu6500VibeMg: 680,
      mpu6500CollisionRisk: 'imminent_delamination',
      am2302TempC: 29.8,
      am2302HumidityRH: 88,
      mq135GasPPM: 2450,
      mq135AirQualityRating: 'Lethal',
      ldrLux: 22,
      ldrVisibilityPercent: 18,
      rockTiltX: 28.5,
      rockTiltY: 19.2,
      tiltThreshold: 18.0,
      acousticEnergy: 420,
      acousticFreqSpikes: 24.1,
      acousticSeverity: 'delamination_risk',
      seismicPPV: 6.45,
      seismicRichter: 2.6,
      methaneLEL: 42.5,
      methaneVol: 2.12,
      carbonMonoxidePPM: 48,
      oxygenPercent: 18.2,
      coalDustMgM3: 18.9,
      airflowVelocity: 0.6,
      temperatureC: 29.8,
      humidityRH: 88,
      barometricPressureKPa: 111.4,
      lastUpdated: 'Just now',
      batteryPercent: 88,
      meshRssi: -71,
    },
    {
      id: 'NODE-SL4-01',
      name: 'Deep Extraction Face Inclinometer',
      level: 4,
      levelName: 'Sub-level 4 (-960m)',
      position3D: [0, -92, -5],
      status: 'normal',
      hasSosButton: true,
      rockTiltX: 4.2,
      rockTiltY: -3.8,
      tiltThreshold: 20.0,
      acousticEnergy: 48,
      acousticFreqSpikes: 6.4,
      acousticSeverity: 'stable',
      seismicPPV: 0.92,
      seismicRichter: 1.2,
      methaneLEL: 14.8,
      methaneVol: 0.74,
      carbonMonoxidePPM: 12,
      oxygenPercent: 20.1,
      coalDustMgM3: 5.2,
      airflowVelocity: 1.4,
      temperatureC: 29.5,
      humidityRH: 88,
      barometricPressureKPa: 115.8,
      lastUpdated: 'Just now',
      batteryPercent: 85,
      meshRssi: -74,
    },
    {
      id: 'NODE-SL4-02',
      name: 'Sub-aquifer Sump Flood & Seismic Sensor',
      level: 4,
      levelName: 'Sub-level 4 (-960m)',
      position3D: [20, -92, 25],
      status: 'normal',
      hasSosButton: true,
      waterLevelCm: 42.0,
      rockTiltX: 2.1,
      rockTiltY: 1.4,
      tiltThreshold: 20.0,
      acousticEnergy: 22,
      acousticFreqSpikes: 2.8,
      acousticSeverity: 'stable',
      seismicPPV: 0.55,
      seismicRichter: 0.9,
      methaneLEL: 8.2,
      methaneVol: 0.41,
      carbonMonoxidePPM: 5,
      oxygenPercent: 20.5,
      coalDustMgM3: 2.1,
      airflowVelocity: 1.9,
      temperatureC: 28.1,
      humidityRH: 94,
      barometricPressureKPa: 116.1,
      lastUpdated: 'Just now',
      batteryPercent: 92,
      meshRssi: -78,
    },
  ]);

  const [selectedNode, setSelectedNode] = useState<SensorNode | null>(null);

  // 5. SentinelRover Hardware-in-the-Loop Telemetry State
  const [roverTelemetry, setRoverTelemetry] = useState<RoverTelemetry>({
    connected: true,
    hotspotSSID: 'Sentinel_ESP_Mesh',
    ipAddress: '192.168.4.105',
    meshLinkLatencyMs: 8.4,
    signalStrengthDbm: -62,
    packetLossPercent: 0.01,

    cpuTempC: 46.8,
    cpuLoadPercent: 24,
    memoryUsedMB: 1840,
    memoryTotalMB: 8192,
    uptimeSeconds: 2420,

    batteryVoltage: 15.4,
    batteryCurrentA: 4.2,
    batteryPercent: 84,
    cellVoltages: [3.85, 3.85, 3.85, 3.85],
    batteryTempC: 34.2,

    pwmLeftUs: 1500,
    pwmRightUs: 1500,
    pwmFrequencyHz: 50,
    leftMotorRpm: 0,
    rightMotorRpm: 0,
    motorTempC: 39.4,

    speedMs: 0.0,
    headingDeg: 84,
    pitchDeg: 2.1,
    rollDeg: -1.2,
    depthMeters: 720,
    currentLevel: 3,
    position3D: [-38, -68, 20],

    visionMode: 'thermal',
    headlightBrightness: 85,
    irIlluminator: true,
    sniffedMethanePPM: 8200,
    sniffedCOppm: 34,
    obstacleDistanceCm: 180,
    thermalHotspotC: 37.1,

    mode: 'manual',
    missionProgress: 65,
    waypointIndex: 4,
    totalWaypoints: 6,
  });

  // 6. Work Orders
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    {
      id: 'WO-9042',
      title: 'Emergency Hydraulic Shoring & Extraction Corridor (Drift B-4)',
      level: 3,
      location: 'Sub-level 3 (Pillar 12 Refuge Alcove)',
      priority: 'emergency',
      assignedTeam: 'Jharkhand Mine Rescue Brigade Alpha',
      techniciansCount: 5,
      type: 'emergency_shoring',
      status: 'in_progress',
      createdAt: '10:48 AM',
      requiredGear: ['40T Hydraulic Props', 'Resin Strata Bolts', 'Welded Steel Mesh', 'Oxygen SCSR Packs'],
      estimatedTimeMin: 25,
      safetyLockout: true,
    },
    {
      id: 'WO-9038',
      title: 'Surface Zone B Subsidence Grouting & InSAR Recalibration',
      level: 0,
      location: 'Surface Panel Zone B (Seam 4 Overburden)',
      priority: 'high',
      assignedTeam: 'Geotechnical Engineering Crew',
      techniciansCount: 3,
      type: 'roof_bolting',
      status: 'pending',
      createdAt: '10:30 AM',
      requiredGear: ['High-Pressure Cement Grout', 'Borehole Inclinometer', 'Tilt Transducer'],
      estimatedTimeMin: 60,
      safetyLockout: false,
    },
    {
      id: 'WO-9025',
      title: 'ESP-MESH Tunnel Repeater Antenna Swap',
      level: 2,
      location: 'Sub-level 2 (Haulage Drift)',
      priority: 'low',
      assignedTeam: 'Telecom Crew',
      techniciansCount: 2,
      type: 'sensor_battery_swap',
      status: 'completed',
      createdAt: '08:45 AM',
      requiredGear: ['5.8GHz Rubber Ducky Antenna', 'Spectrum Analyzer'],
      estimatedTimeMin: 15,
      safetyLockout: false,
    },
  ]);

  // 7. Crew Muster RFID Log (Including Rajesh Murmu)
  const [musterList, setMusterList] = useState<MinerMusterRecord[]>([
    {
      id: 'MIN-01',
      name: 'Rajesh Murmu',
      role: 'Continuous Miner Operator',
      level: 3,
      sector: 'Drift B-4 (Pillar 12 Refuge Alcove)',
      rfidTag: 'RFID-9941A',
      heartRateBpm: 112,
      status: 'in_refuge_bay',
      lastPing: 'Live Voice Link Active',
    },
    {
      id: 'MIN-02',
      name: 'Sunil Soren',
      role: 'Shoring Technician',
      level: 3,
      sector: 'Drift B-4 (Refuge Alcove)',
      rfidTag: 'RFID-9942B',
      heartRateBpm: 104,
      status: 'in_refuge_bay',
      lastPing: 'Live Voice Link Active',
    },
    {
      id: 'MIN-03',
      name: 'Amitabh Roy',
      role: 'Section Overman',
      level: 2,
      sector: 'Refuge Bay Station #1',
      rfidTag: 'RFID-9943C',
      heartRateBpm: 84,
      status: 'safe',
      lastPing: '4s ago',
    },
    {
      id: 'MIN-04',
      name: 'Pooja Verma',
      role: 'Geotechnical Surveyor',
      level: 1,
      sector: 'Longwall Panel Alpha',
      rfidTag: 'RFID-9944D',
      heartRateBpm: 78,
      status: 'safe',
      lastPing: '2s ago',
    },
  ]);

  const [activeHazards, setActiveHazards] = useState<string[]>(['roof_burst', 'methane_outburst']);

  // Handle Master Audio Mute
  const handleToggleMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    soundEngine.setMuted(next);
  };

  // Handle Evacuation Alarm
  const handleToggleEvacuationAlarm = () => {
    const next = !isEvacuationAlarmActive;
    setIsEvacuationAlarmActive(next);
    if (next) {
      soundEngine.playAlarmSiren();
    } else {
      soundEngine.stopEvacuationKlaxon();
    }
  };

  // Trigger SOS from physical node button
  const handleTriggerSOS = (nodeId: string) => {
    soundEngine.playAlarmSiren();
    setIsEvacuationAlarmActive(true);
    setSensorNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              status: 'critical',
              sosTriggered: true,
            }
          : n
      )
    );
    // Dispatch rover toward that node's coordinates
    const targetNode = sensorNodes.find((n) => n.id === nodeId);
    if (targetNode) {
      setRoverTelemetry((prev) => ({
        ...prev,
        mode: 'autonomous',
        currentMission: `Emergency SOS Dispatch → ${targetNode.name}`,
        position3D: [targetNode.position3D[0] + 4, targetNode.position3D[1], targetNode.position3D[2] - 4],
      }));
    }
  };

  // Generic node update handler (used by HumanTransitTracker)
  const handleUpdateNode = (nodeId: string, updates: Partial<SensorNode>) => {
    setSensorNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
    );
  };

  // Dispatch SentinelRover directly to Node 2 coordinates
  const handleDispatchRoverToNode2 = () => {
    soundEngine.playAlarmSiren();
    setIsEvacuationAlarmActive(true);
    setRoverTelemetry((prev) => ({
      ...prev,
      mode: 'autonomous',
      currentMission: 'Automated Search & Rescue → Node 2 (Drift B-4 Trapped Worker)',
      position3D: [-45, -68, 25],
      depthMeters: 720,
      currentLevel: 3,
      speedMs: 1.4,
      visionMode: 'thermal',
      irIlluminator: true,
      headlightBrightness: 100,
    }));
  };

  // Dispatch rover to specific coordinates on radar/map
  const handleDispatchRoverToCoords = (coords: [number, number, number], locationName: string) => {
    soundEngine.playRadioSquelch();
    setRoverTelemetry((prev) => ({
      ...prev,
      mode: 'autonomous',
      currentMission: `Navigating to ${locationName}`,
      position3D: coords,
      speedMs: 1.5,
      depthMeters: Math.abs(coords[1]) > 0 ? Math.abs(coords[1]) * 10 : 720,
    }));
  };

  // Apply 10-Second Baseline Calibration Report to Sensor Nodes
  const handleApplyCalibration = (report: CalibrationReport) => {
    setLastCalibrationReport(report);
    soundEngine.playCalibrationSuccess();

    // Update nodes with newly calibrated zero-offset averages
    setSensorNodes((prev) =>
      prev.map((node) => {
        const cal = report.nodesCalibrated.find((c) => c.nodeId === node.id);
        if (!cal) return node;

        return {
          ...node,
          // Apply calibrated baseline averages
          temperatureC: cal.averages.avgTempC,
          am2302TempC: cal.averages.avgTempC,
          humidityRH: cal.averages.avgHumidityRH,
          am2302HumidityRH: cal.averages.avgHumidityRH,
          mq135GasPPM: cal.averages.avgMQ135Ppm,
          ldrLux: cal.averages.avgLdrLux,
          methaneLEL: cal.averages.avgMethaneLEL,
          carbonMonoxidePPM: cal.averages.avgCarbonMonoxidePPM,
          oxygenPercent: cal.averages.avgOxygenPercent,
          rockTiltX: cal.averages.avgPitchDeg,
          rockTiltY: cal.averages.avgRollDeg,
          mpu6500PitchDeg: cal.averages.avgPitchDeg,
          mpu6500RollDeg: cal.averages.avgRollDeg,
          mpu6500VibeMg: cal.averages.avgVibeMg,
          acousticEnergy: cal.averages.avgAcousticEnergy,
          seismicPPV: cal.averages.avgSeismicPPV,
          lastUpdated: '10s Baseline Calibrated Just Now',
        };
      })
    );

    setCalibrationToast(
      `✓ All ${report.nodesCalibrated.length} Sensor Nodes Calibrated & Zero-Offset Averaged (Report #${report.id})`
    );

    setTimeout(() => {
      setCalibrationToast(null);
    }, 6000);
  };

  // Dispatch rover to specific zone
  const handleDispatchRoverToZone = (zoneName: string) => {
    setRoverTelemetry((prev) => ({
      ...prev,
      mode: 'autonomous',
      currentMission: `Investigating ${zoneName}`,
      position3D: [-42, -68, 22],
      speedMs: 1.2,
      depthMeters: 720,
      currentLevel: 3,
    }));
  };

  // Motor PWM controls
  const handleUpdatePWM = (leftUs: number, rightUs: number) => {
    setRoverTelemetry((prev) => {
      const leftDelta = leftUs - 1500;
      const rightDelta = rightUs - 1500;
      const avgDelta = (leftDelta + rightDelta) / 2;
      const turnDelta = (leftDelta - rightDelta) / 2;

      const speedMs = Number(((avgDelta / 500) * 1.8).toFixed(2));
      const leftMotorRpm = Math.round((leftDelta / 500) * 320);
      const rightMotorRpm = Math.round((rightDelta / 500) * 320);

      const rad = (prev.headingDeg * Math.PI) / 180;
      const newX = prev.position3D[0] + Math.sin(rad) * speedMs * 0.4;
      const newZ = prev.position3D[2] + Math.cos(rad) * speedMs * 0.4;

      return {
        ...prev,
        pwmLeftUs: leftUs,
        pwmRightUs: rightUs,
        speedMs: Math.abs(speedMs),
        leftMotorRpm,
        rightMotorRpm,
        headingDeg: (prev.headingDeg + turnDelta * 0.08 + 360) % 360,
        position3D: [newX, prev.position3D[1], newZ],
      };
    });
  };

  const handleStartMission = (missionName: string) => {
    setRoverTelemetry((prev) => ({
      ...prev,
      mode: 'autonomous',
      currentMission: missionName,
      missionProgress: 25,
      speedMs: 0.8,
    }));
  };

  const handleStopMission = () => {
    setRoverTelemetry((prev) => ({
      ...prev,
      mode: 'manual',
      currentMission: undefined,
      missionProgress: 0,
      speedMs: 0.0,
      pwmLeftUs: 1500,
      pwmRightUs: 1500,
    }));
  };

  // Hazard injection
  const handleTriggerHazard = (hazardType: 'roof_burst' | 'methane_outburst' | 'seismic_fault' | 'fan_failure') => {
    setActiveHazards((prev) => (prev.includes(hazardType) ? prev : [...prev, hazardType]));
  };

  const handleResetHazards = () => {
    setActiveHazards([]);
    soundEngine.stopEvacuationKlaxon();
    setIsEvacuationAlarmActive(false);
  };

  const criticalAlarmsCount = sensorNodes.filter((n) => n.status === 'critical').length;
  const warningAlarmsCount = sensorNodes.filter((n) => n.status === 'warning' || n.status === 'caution').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* 1. Global Tactical Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0E0E0E]/95 backdrop-blur-md border-b border-[#262626] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Brand & Subterranean Platform Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-cyan-600 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <div className="w-full h-full bg-[#0A0A0A] rounded-[10px] flex items-center justify-center">
              <Radar className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-[#EDEDED] uppercase font-sans">
                SentinelRover — Subterranean Mine Safety & Rescue Platform
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
                DGMS & MSHA Standard
              </span>
            </div>
            <p className="text-[11px] text-[#888888] font-mono flex items-center gap-2">
              <span>Target: Jharkhand Coalfields</span>
              <span>•</span>
              <span className="text-emerald-400">ESP-MESH: 10 Nodes Online</span>
              <span>•</span>
              <span className="text-amber-400">Max Depth: -960m</span>
              <span>•</span>
              <span className="text-cyan-400">ASTRO-PROTO Active</span>
            </p>
          </div>
        </div>

        {/* Global Alarms & Audio Master Controls */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Active Hazard Indicators */}
          <div className="flex items-center gap-1.5 font-mono">
            {criticalAlarmsCount > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-red-950/60 text-red-300 border border-red-600/60 font-bold flex items-center gap-1.5 animate-pulse shadow-sm shadow-red-950">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{criticalAlarmsCount} CRITICAL ALERT</span>
              </span>
            ) : warningAlarmsCount > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{warningAlarmsCount} Strata Warnings</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Mesh Stable (10 Nodes)</span>
              </span>
            )}
          </div>

          {/* 10-Second Baseline Calibration Master Action */}
          <button
            id="btn-master-calibrate-10s"
            onClick={() => {
              soundEngine.playKeyboardClick();
              setShowCalibrationModal(true);
            }}
            className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-gradient-to-r from-cyan-950 to-emerald-950 hover:from-cyan-900 hover:to-emerald-900 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950/40 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calibrate All (10s)</span>
          </button>

          {/* Emergency Evacuation Klaxon Quick Toggle */}
          <button
            id="btn-master-evac-alarm"
            onClick={handleToggleEvacuationAlarm}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isEvacuationAlarmActive
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-400 animate-pulse shadow-lg shadow-red-950'
                : 'bg-[#181818] hover:bg-red-950/40 text-[#888888] hover:text-red-300 border-[#2A2A2A]'
            }`}
          >
            <Siren className="w-3.5 h-3.5" />
            <span>{isEvacuationAlarmActive ? 'ALARM ON' : 'Evac Alarm'}</span>
          </button>

          {/* Web Audio Synthesizer Master Button */}
          <button
            id="btn-master-audio-toggle"
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAudioMuted
                ? 'bg-[#181818] text-[#888888] border-[#2A2A2A] hover:text-[#CCCCCC]'
                : 'bg-cyan-950/30 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/30 hover:bg-cyan-950/50'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isAudioMuted ? 'Muted' : 'Audio On'}</span>
          </button>

          {/* RPi 5 Daemon Script Modal Button */}
          <button
            id="btn-open-rpi5-code"
            onClick={() => setShowCodeModal(true)}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-mono bg-[#141414] hover:bg-[#202020] text-[#999999] hover:text-white border-[#2A2A2A] flex items-center gap-1.5 transition-all cursor-pointer"
            title="View Python RPi 5 / Jetson Daemon Code"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>RPi 5 Code</span>
          </button>
        </div>
      </header>

      {/* 2. Primary Navigation Bar - Clean, intuitive, easy to navigate */}
      <nav className="bg-[#121212] border-b border-[#222222] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Tab 1: 3D Mine Site & Autonomous Rover */}
          <button
            id="nav-spatial-twin"
            onClick={() => setActiveTab('spatial_twin')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'spatial_twin'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/80 border border-cyan-400'
                : 'text-cyan-400 hover:text-cyan-300 hover:bg-[#1C1C1C]'
            }`}
          >
            <Radar className="w-4 h-4 animate-spin" />
            <span>3D Mine Site & Autonomous Rover</span>
          </button>

          {/* Tab 2: Tactical Radar */}
          <button
            id="nav-tactical-radar"
            onClick={() => setActiveTab('tactical_radar')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tactical_radar'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 border border-emerald-400'
                : 'text-[#AAAAAA] hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Tactical Radar & Rover Map</span>
          </button>

          {/* Tab 3: Worker Transit Tracker */}
          <button
            id="nav-human-transit"
            onClick={() => setActiveTab('human_transit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'human_transit'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 border border-amber-500/50'
                : 'text-amber-400 hover:text-amber-300 hover:bg-[#1C1C1C]'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>Worker PIR Tracker & Safety</span>
          </button>

          {/* Tab 4: Rover Cockpit & Teleoperation */}
          <button
            id="nav-rover-ops"
            onClick={() => setActiveTab('rover_ops')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rover_ops'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60 border border-blue-400'
                : 'text-[#AAAAAA] hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Rover Cockpit & Teleoperation</span>
          </button>

          {/* Tab 5: Geotechnical AI & Sensors */}
          <button
            id="nav-ai-geotechnical"
            onClick={() => setActiveTab('ai_geotechnical')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_geotechnical'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 border border-purple-400'
                : 'text-purple-300 hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Geotechnical AI & Sensors</span>
          </button>

          {/* Tab 6: Emergency Muster & Logs */}
          <button
            id="nav-work-orders"
            onClick={() => setActiveTab('work_orders')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'work_orders'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 border border-rose-400'
                : 'text-[#AAAAAA] hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Muster & Work Orders</span>
          </button>
        </div>

        {/* Rover Quick Telemetry Status */}
        <div className="flex items-center gap-3 text-xs font-mono bg-[#0A0A0A] px-3 py-1.5 rounded-lg border border-[#262626] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#CCCCCC] font-semibold">RPi 5 LINK</span>
          </div>
          <span className="text-[#555555]">|</span>
          <span className="text-cyan-300">4S LiPo: {roverTelemetry.batteryVoltage.toFixed(1)}V</span>
          <span className="text-[#555555]">|</span>
          <span className="text-amber-300">Depth: -{roverTelemetry.depthMeters}m</span>
        </div>
      </nav>

      {/* 3. Main Workspace Content */}
      <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto space-y-4">
        {/* Global Toast Notification for 10-Second Baseline Calibration */}
        {calibrationToast && (
          <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between font-mono text-xs animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 font-bold" />
              <span>{calibrationToast}</span>
            </div>
            <button
              onClick={() => setCalibrationToast(null)}
              className="text-emerald-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. 3D Mine Site & Autonomous Rover */}
        {activeTab === 'spatial_twin' && (
          <div className="space-y-4">
            <MineTwin3D
              sensorNodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              roverTelemetry={roverTelemetry}
              mineLevels={mineLevels}
              activeHazards={activeHazards}
              onTriggerSOS={handleTriggerSOS}
              onUpdateRoverTelemetry={setRoverTelemetry}
              onDispatchRoverToCoords={handleDispatchRoverToCoords}
            />

            {/* Geotechnical Sensor Mesh Grid */}
            <SensorMeshGrid
              nodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>
        )}

        {/* 2. Tactical Radar & Subterranean Map */}
        {activeTab === 'tactical_radar' && (
          <div className="space-y-4">
            <MineTacticalRadar
              nodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              roverTelemetry={roverTelemetry}
              onDispatchRoverToCoords={handleDispatchRoverToCoords}
              onOpenCalibrationModal={() => setShowCalibrationModal(true)}
              onOpenCodeModal={() => setShowCodeModal(true)}
            />

            {/* Geotechnical Sensor Mesh Grid */}
            <SensorMeshGrid
              nodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>
        )}

        {/* 3. Worker PIR Tracker */}
        {activeTab === 'human_transit' && (
          <div className="space-y-4">
            <HumanTransitTracker
              node1={sensorNodes.find((n) => n.id === 'NODE-SL3-01')}
              node2={sensorNodes.find((n) => n.id === 'NODE-SL3-02')}
              onUpdateNode={handleUpdateNode}
              roverTelemetry={roverTelemetry}
              onDispatchRoverToNode2={handleDispatchRoverToNode2}
              onTriggerEvacAlarm={handleToggleEvacuationAlarm}
            />

            {/* Sensor Mesh Grid */}
            <SensorMeshGrid
              nodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>
        )}

        {/* 4. Rover Cockpit & Teleoperation (Integrated HUD + Intercom + Drive Deck + RPi 5 Station) */}
        {activeTab === 'rover_ops' && (
          <div className="space-y-4">
            {/* View Sub-selector */}
            <div className="flex items-center justify-between bg-[#121212] p-2 rounded-xl border border-[#222222]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRoverSubView('cockpit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roverSubView === 'cockpit'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-[#888888] hover:text-white hover:bg-[#1C1C1C]'
                  }`}
                >
                  Action Camera HUD & 2-Way Intercom
                </button>
                <button
                  onClick={() => setRoverSubView('teleop_station')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roverSubView === 'teleop_station'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-[#888888] hover:text-white hover:bg-[#1C1C1C]'
                  }`}
                >
                  RPi 5 PWM Telemetry & Teleoperation Desk
                </button>
              </div>

              <button
                onClick={() => setShowCodeModal(true)}
                className="px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#252525] text-cyan-300 text-xs font-mono border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Python Daemon Script</span>
              </button>
            </div>

            {roverSubView === 'cockpit' ? (
              <>
                {/* Live FLIR Thermal & Action Camera Stream HUD */}
                <RoverHUD
                  telemetry={roverTelemetry}
                  onSetVisionMode={(mode: VisionMode) => {
                    setRoverTelemetry((prev) => ({ ...prev, visionMode: mode }));
                  }}
                  onToggleIR={() => {
                    setRoverTelemetry((prev) => ({ ...prev, irIlluminator: !prev.irIlluminator }));
                  }}
                  onSetHeadlight={(val: number) => {
                    setRoverTelemetry((prev) => ({ ...prev, headlightBrightness: val }));
                  }}
                />

                {/* Two-Way Push-To-Talk Audio Intercom Link */}
                <TwoWayAudioIntercom
                  roverConnected={roverTelemetry.connected}
                  targetMinerName="Rajesh Murmu (Continuous Miner Operator)"
                  targetSector="Sub-level 3 / Drift B-4 (Pillar 12 Refuge Alcove)"
                />

                {/* Hardware-in-the-Loop Drive Controls & Dual X60 ESC Mixer */}
                <RoverControls
                  telemetry={roverTelemetry}
                  onUpdatePWM={handleUpdatePWM}
                  onStartAutonomousMission={handleStartMission}
                  onStopMission={handleStopMission}
                  onOpenCodeModal={() => setShowCodeModal(true)}
                />
              </>
            ) : (
              <RemoteRoverSite
                telemetry={roverTelemetry}
                onUpdatePWM={handleUpdatePWM}
                onOpenCodeModal={() => setShowCodeModal(true)}
              />
            )}
          </div>
        )}

        {/* 5. Geotechnical AI & Sensor Matrix */}
        {activeTab === 'ai_geotechnical' && (
          <div className="space-y-4">
            {/* Geotechnical Sensor Mesh Grid */}
            <SensorMeshGrid
              nodes={sensorNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />

            {/* AI Advisor & Strata Prognosis */}
            <GeotechnicalAIAdvisor
              sensorNodes={sensorNodes}
              mineLevels={mineLevels}
              roverTelemetry={roverTelemetry}
              activeHazards={activeHazards}
              onApplyRoverFlightPlan={() => handleStartMission('AI-Optimized Geotechnical Reconnaissance Patrol')}
            />
          </div>
        )}

        {/* 6. Emergency Muster & Work Orders */}
        {activeTab === 'work_orders' && (
          <div className="space-y-4">
            <WorkOrdersAndMuster
              workOrders={workOrders}
              musterList={musterList}
              onUpdateWorkOrderStatus={(id, newStatus) => {
                setWorkOrders((prev) =>
                  prev.map((wo) => (wo.id === id ? { ...wo, status: newStatus } : wo))
                );
              }}
              onAddWorkOrder={(newOrder) => {
                setWorkOrders((prev) => [newOrder, ...prev]);
              }}
            />
          </div>
        )}

        {/* Global Hazard Injection Simulation Panel (Available in all tabs) */}
        <HazardSimulationPanel
          activeHazards={activeHazards}
          onTriggerHazard={handleTriggerHazard}
          onResetHazards={handleResetHazards}
          isEvacuationAlarmActive={isEvacuationAlarmActive}
          onToggleEvacuationAlarm={handleToggleEvacuationAlarm}
        />
      </main>

      {/* 4. RPi 5 / Jetson Daemon Script Modal */}
      <Rpi5CodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} />

      {/* 5. 10-Second Sensor Node Baseline Calibration Modal */}
      <SensorCalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        nodes={sensorNodes}
        onApplyCalibration={handleApplyCalibration}
      />

      {/* 6. Footer Bar */}
      <footer className="bg-[#0E0E0E] border-t border-[#222222] px-4 py-2.5 text-xs text-[#71717A] flex flex-wrap items-center justify-between gap-2 font-mono">
        <div>
          SENTINELROVER • UNDERGROUND MINE SAFETY & RESCUE PLATFORM • DGMS & MSHA COMPLIANT
        </div>
        <div className="flex items-center gap-3">
          <span>ESP-MESH 5.8GHz</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Self-Healing Mesh Stable</span>
          <span>•</span>
          <span className="text-cyan-400 font-semibold">Gemini Flash AI Active</span>
        </div>
      </footer>
    </div>
  );
}
