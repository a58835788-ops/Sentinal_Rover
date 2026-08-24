export type VisionMode = 'rgb' | 'thermal' | 'night_vision';

export type RadarVisualizationMode = 'geotechnical_radar' | 'lidar_slam' | 'thermal_tomography' | 'structural_twin';

export type AlertSeverity = 'normal' | 'caution' | 'warning' | 'critical';

export interface SensorNode {
  id: string;
  name: string;
  level: number; // 0 for surface, 1 to 4 for underground
  levelName: string;
  position3D: [number, number, number]; // [x, y, z] in mine coordinates
  status: AlertSeverity;
  isSurfaceNode?: boolean; // Surface subsidence monitoring node
  hasSosButton?: boolean;
  sosTriggered?: boolean;

  // Hardware Prototype Identity (ESP32 Physical Nodes vs Simulated Network Nodes)
  isPhysicalPrototype?: boolean; // True for physical Node 1 and Node 2 prototype units
  mqttTopic?: string; // e.g. "mine/nodes/node_01/telemetry"
  hardwareMicrocontroller?: 'ESP32-WROOM-32' | 'ESP32-S3' | 'Simulated_Mesh_Node';

  // Physical Sensors (ESP32 Node Payload)
  // 1. MPU6500 6-Axis IMU (Mounted on mine rock wall)
  mpu6500PitchDeg?: number; // Wall tilt pitch
  mpu6500RollDeg?: number; // Wall tilt roll
  mpu6500VibeMg?: number; // Micro-vibration amplitude in milli-g
  mpu6500CollisionRisk?: 'stable' | 'micro_shift' | 'imminent_delamination';

  // 2. AM2302 (DHT22) Sensor
  am2302TempC?: number;
  am2302HumidityRH?: number;

  // 3. MQ135 Air Quality & Toxic Gas Sensor
  mq135GasPPM?: number; // CO, CO2, Smoke, Benzene, NH3 in PPM
  mq135AirQualityRating?: 'Clean' | 'Moderate' | 'Unsafe' | 'Lethal';

  // 4. LDR (Light Dependent Resistor) Visibility & Dust Obscurity Sensor
  ldrLux?: number; // Ambient light in lux
  ldrVisibilityPercent?: number; // 0 - 100% (lower means heavy dust/smoke obscuration)

  // 5. PIR Motion / Human Presence Sensor
  pirMotionDetected?: boolean; // True when worker passes
  pirLastTriggerTime?: string;
  pirTransitCounter?: number;
  
  // Geotechnical measurements
  rockTiltX: number; // arcsec or mm displacement
  rockTiltY: number; // arcsec
  tiltThreshold: number; // max safe arcsec
  surfaceDisplacementMm?: number; // Ground subsidence displacement
  crackStrainMicroStrain?: number; // Micro-strain on rock/surface cracks
  
  acousticEnergy: number; // count/min
  acousticFreqSpikes: number; // kHz
  acousticSeverity: 'stable' | 'micro-fracturing' | 'delamination_risk';
  
  seismicPPV: number; // mm/s Peak Particle Velocity
  seismicRichter: number; // micro-magnitude
  
  // Atmospheric & Gas measurements
  methaneLEL: number; // % LEL (Explosive Methane 0-100% LEL, 5% vol = 100% LEL)
  methaneVol: number; // % by volume
  carbonMonoxidePPM: number; // ppm (safe < 25ppm, danger > 50ppm)
  oxygenPercent: number; // % (safe 19.5% - 21.0%)
  coalDustMgM3: number; // mg/m³ particulate
  airflowVelocity: number; // m/s (safe 0.5 - 4.0 m/s)
  waterLevelCm?: number; // Water sump flood level
  temperatureC: number; // °C
  humidityRH: number; // %RH
  barometricPressureKPa: number; // kPa
  
  lastUpdated: string;
  batteryPercent: number;
  meshRssi: number; // dBm
}

export interface HumanTransitRecord {
  id: string;
  workerName: string;
  workerRfid: string;
  currentSector: string;
  node1EnteredTime: string;
  node2PassedTime?: string;
  returnNode1Time?: string;
  transitState: 'at_node1' | 'transit_to_node2' | 'at_node2' | 'trapped_at_node2' | 'safe_returned_node1';
  elapsedTimeSec: number;
  node2IncidentDetected: boolean;
  incidentType?: 'roof_tilt_collapse' | 'toxic_gas_surge' | 'timeout_unreturned';
  roverDispatched: boolean;
}

export interface RemoteRoverState {
  targetIp: string; // "http://192.168.4.1:5000"
  hotspotSSID: string; // "Main_node"
  hotspotPass: string; // "8010065098"
  connected: boolean;
  lastCommand: string;
  speed: number;
  gpio18Pwm: number;
  gpio19Pwm: number;
  latencyMs: number;
}

export interface SurfaceSubsidenceZone {
  zoneId: 'A' | 'B' | 'C' | 'D';
  name: string;
  seamDepthM: number;
  subsidenceRateMmDay: number;
  cumulativeDisplacementMm: number;
  tiltArcSec: number;
  riskScore: number; // 0 - 100
  status: AlertSeverity;
  recommendedAction: string;
}

export interface TwoWayAudioMessage {
  id: string;
  sender: 'surface_rescuer' | 'trapped_miner' | 'rover_ai_announcement';
  text: string;
  timestamp: string;
  durationSec?: number;
}

export interface MineLevel {
  level: number;
  name: string;
  depthMeters: number;
  status: AlertSeverity;
  activeMiners: number;
  description: string;
  temperatureAvg: number;
  methaneAvg: number;
  activeShoringUnits: number;
}

export interface RoverTelemetry {
  connected: boolean;
  hotspotSSID: string;
  ipAddress: string;
  meshLinkLatencyMs: number;
  signalStrengthDbm: number;
  packetLossPercent: number;
  
  // RPi 5 Hardware
  cpuTempC: number;
  cpuLoadPercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  uptimeSeconds: number;
  
  // Power & Battery (4S LiPo)
  batteryVoltage: number; // Volts (14.8V nominal, 16.8V full, 13.5V cut)
  batteryCurrentA: number; // Amps
  batteryPercent: number;
  cellVoltages: [number, number, number, number];
  batteryTempC: number;
  
  // Dual X60 ESC Hardware PWM (Microsecond Accurate on GPIO 18 & 19)
  pwmLeftUs: number; // 1000 - 2000 µs (1500 is neutral)
  pwmRightUs: number; // 1000 - 2000 µs (1500 is neutral)
  pwmFrequencyHz: number; // 50Hz or 400Hz
  leftMotorRpm: number;
  rightMotorRpm: number;
  motorTempC: number;
  
  // Kinematics & IMU
  speedMs: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  depthMeters: number;
  currentLevel: number;
  position3D: [number, number, number];
  
  // Sensors & Camera
  visionMode: VisionMode;
  headlightBrightness: number; // 0 - 100%
  irIlluminator: boolean;
  sniffedMethanePPM: number;
  sniffedCOppm: number;
  obstacleDistanceCm: number;
  thermalHotspotC: number;
  
  // Navigation & Autonomy
  mode: 'manual' | 'autonomous' | 'fail_safe_docking';
  currentMission?: string;
  missionProgress: number; // 0 - 100%
  waypointIndex: number;
  totalWaypoints: number;
}

export interface WorkOrder {
  id: string;
  title: string;
  level: number;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  assignedTeam: string;
  techniciansCount: number;
  type: 'emergency_shoring' | 'methane_drainage' | 'hydraulic_prop_install' | 'sensor_battery_swap' | 'roof_bolting';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  requiredGear: string[];
  estimatedTimeMin: number;
  safetyLockout: boolean;
}

export interface MinerMusterRecord {
  id: string;
  name: string;
  role: string;
  level: number;
  sector: string;
  rfidTag: string;
  heartRateBpm: number;
  status: 'safe' | 'evacuating' | 'in_refuge_bay' | 'warning';
  lastPing: string;
}

export interface IncidentAlert {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  level: number;
  sector: string;
  acknowledged: boolean;
}

export interface AIAnalysisResult {
  rockburstRiskIndex: number; // 0 - 100
  strataStabilityStatus: 'Stable' | 'Marginal' | 'Imminent Delamination' | 'High Collapse Hazard';
  gasExplosionProbability: number; // 0 - 100%
  recommendedShoringType: string;
  immediateActions: string[];
  autonomousRoverFlightPlan: string[];
  mshaReportSummary: string;
  generatedAt: string;
}

export interface NodeCalibrationMetricAverages {
  avgTempC: number;
  avgHumidityRH: number;
  avgMQ135Ppm: number;
  avgLdrLux: number;
  avgMethaneLEL: number;
  avgCarbonMonoxidePPM: number;
  avgOxygenPercent: number;
  avgPitchDeg: number;
  avgRollDeg: number;
  avgVibeMg: number;
  avgAcousticEnergy: number;
  avgSeismicPPV: number;
  tempStdDev: number;
  gasStdDev: number;
  tiltZeroOffsetPitch: number;
  tiltZeroOffsetRoll: number;
}

export interface NodeCalibrationEntry {
  nodeId: string;
  nodeName: string;
  levelName: string;
  hardware: string;
  mqttTopic: string;
  averages: NodeCalibrationMetricAverages;
  sampleCount: number;
  zeroOffsetCalibrated: boolean;
  status: 'calibrated' | 'calibrating' | 'baseline_warning';
}

export interface CalibrationReport {
  id: string;
  calibratedAt: string;
  durationSec: number;
  totalSamplesCollected: number;
  samplingFrequencyHz: number;
  nodesCalibrated: NodeCalibrationEntry[];
  summaryNote: string;
  certifiedOperator: string;
}

