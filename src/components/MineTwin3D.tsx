import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SensorNode, RoverTelemetry, MineLevel, RadarVisualizationMode } from '../types';
import {
  Layers,
  Maximize2,
  Minimize2,
  Radio,
  Activity,
  AlertTriangle,
  RotateCcw,
  Radar,
  Flame,
  HardHat,
  BellRing,
  Sparkles,
  Sliders,
  Scan,
  Compass,
  Navigation,
  Gamepad2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Wifi,
  Play,
  Square,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface MineTwin3DProps {
  sensorNodes: SensorNode[];
  selectedNode: SensorNode | null;
  onSelectNode: (node: SensorNode | null) => void;
  roverTelemetry: RoverTelemetry;
  mineLevels: MineLevel[];
  activeHazards: string[];
  onTriggerSOS?: (nodeId: string) => void;
  onUpdateRoverTelemetry?: (updater: (prev: RoverTelemetry) => RoverTelemetry) => void;
  onDispatchRoverToCoords?: (coords: [number, number, number], locationName: string) => void;
}

export interface IssuePlace {
  id: string;
  name: string;
  level: number;
  levelName: string;
  coords: [number, number, number];
  severity: 'critical' | 'warning' | 'caution';
  issueType: 'methane_leak' | 'roof_strain' | 'worker_sos' | 'trapped_miner' | 'ground_subsidence' | 'water_sump';
  description: string;
  metrics: string;
}

export const MineTwin3D: React.FC<MineTwin3DProps> = ({
  sensorNodes,
  selectedNode,
  onSelectNode,
  roverTelemetry,
  mineLevels,
  activeHazards,
  onTriggerSOS,
  onUpdateRoverTelemetry,
  onDispatchRoverToCoords,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeLevelFilter, setActiveLevelFilter] = useState<number | 'all'>('all');
  const [showStrataLayers, setShowStrataLayers] = useState<boolean>(true);
  const [showMeshHops, setShowMeshHops] = useState<boolean>(true);
  const [showLidarRays, setShowLidarRays] = useState<boolean>(true);
  const [showTunnelLights, setShowTunnelLights] = useState<boolean>(true);
  const [radarMode, setRadarMode] = useState<RadarVisualizationMode>('geotechnical_radar');
  const [cameraMode, setCameraMode] = useState<'orbit' | 'rover_follow' | 'rover_fpv' | 'top_down' | 'radar_sweep'>('orbit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isManualDriving, setIsManualDriving] = useState(false);
  const [autoPatrolActive, setAutoPatrolActive] = useState(false);
  const [navTargetIssue, setNavTargetIssue] = useState<IssuePlace | null>(null);
  const [navDistanceMeters, setNavDistanceMeters] = useState<number>(0);
  const [navStatusText, setNavStatusText] = useState<string>('Rover on Standby');

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roverMeshRef = useRef<THREE.Group | null>(null);
  const roverWheelsRef = useRef<THREE.Mesh[]>([]);
  const roverLidarMeshRef = useRef<THREE.Mesh | null>(null);
  const roverSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const sensorBeaconsRef = useRef<Map<string, THREE.Group>>(new Map());
  const hazardParticlesRef = useRef<THREE.Points | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);
  const lidarPointsRef = useRef<THREE.Points | null>(null);
  const radarSweepMeshRef = useRef<THREE.Mesh | null>(null);
  const meshLinesGroupRef = useRef<THREE.Group | null>(null);
  const headframeSheaveRef = useRef<THREE.Mesh | null>(null);
  const trappedMinerRef = useRef<THREE.Group | null>(null);
  const targetBeaconRef = useRef<THREE.Group | null>(null);
  const navPathLineRef = useRef<THREE.Line | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const trailPointsRef = useRef<THREE.Vector3[]>([]);

  // Navigation and Waypoint Pathfinding Engine
  const currentWaypointsRef = useRef<THREE.Vector3[]>([]);
  const currentWaypointIndexRef = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);
  const roverPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...roverTelemetry.position3D));
  const roverHeadingRef = useRef<number>(roverTelemetry.headingDeg);
  const roverSpeedRef = useRef<number>(roverTelemetry.speedMs);
  const keyStateRef = useRef<{ [key: string]: boolean }>({});

  // Orbit control state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.75, phi: 0.65, radius: 155 });
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -42, 0));

  // Defined Issue Places in the 3D Mine
  const issuePlaces: IssuePlace[] = [
    {
      id: 'issue-methane-b4',
      name: 'Drift B-4 Pillar 12 (Critical Gas & SOS)',
      level: 3,
      levelName: 'Sub-Level 3 (-720m)',
      coords: [-45, -68, 25],
      severity: 'critical',
      issueType: 'methane_leak',
      description: 'Methane surge detected (18.4% LEL) with physical SOS button triggered by continuous miner crew.',
      metrics: 'CH4: 18.4% LEL • CO: 48 PPM • SOS: ACTIVE',
    },
    {
      id: 'issue-trapped-miner',
      name: 'Drift B-4 Refuge Bay (Trapped Operator)',
      level: 3,
      levelName: 'Sub-Level 3 (-720m)',
      coords: [-45, -67.5, 25],
      severity: 'critical',
      issueType: 'trapped_miner',
      description: 'FLIR thermal hotspot detected (37.2°C). Operator Rajesh Murmu awaiting autonomous rover audio link.',
      metrics: 'Thermal Hotspot: 37.2°C • Pulse: 94 BPM',
    },
    {
      id: 'issue-pillar-strain',
      name: 'Pillar 12 Shoring Roof Fissure',
      level: 3,
      levelName: 'Sub-Level 3 (-720m)',
      coords: [-15, -68, 35],
      severity: 'warning',
      issueType: 'roof_strain',
      description: 'Rock tilt sensor threshold breached (48.5 arcsec). Hydraulic shoring prop under high strata load.',
      metrics: 'Tilt: 48.5" • Seismic PPV: 3.4 mm/s',
    },
    {
      id: 'issue-co-haulage',
      name: 'Haulage Conveyor Drift Heading',
      level: 2,
      levelName: 'Sub-Level 2 (-480m)',
      coords: [-30, -42, -20],
      severity: 'warning',
      issueType: 'methane_leak',
      description: 'CO gas buildup near belt drive motor. Requires immediate rover thermal camera inspection.',
      metrics: 'CO: 38 PPM • Conveyor Temp: 42°C',
    },
    {
      id: 'issue-surface-subsidence',
      name: 'Surface Panel Zone B Caprock Fissure',
      level: 0,
      levelName: 'Surface Overburden (0m)',
      coords: [-25, 0.4, 25],
      severity: 'critical',
      issueType: 'ground_subsidence',
      description: 'Ground sag rate 4.8 mm/day with surface shear cracks above Longwall 4 extraction panel.',
      metrics: 'Displacement: 18.4 mm • Rate: 4.8 mm/day',
    },
    {
      id: 'issue-water-sump',
      name: 'Deep Sump Siphon & Drainage Pump',
      level: 4,
      levelName: 'Sub-Level 4 (-960m)',
      coords: [15, -92, -15],
      severity: 'caution',
      issueType: 'water_sump',
      description: 'Water ingress level 84%. Verify submersible siphon drainage status before crew entry.',
      metrics: 'Water Level: 84% • Inflow: 120 L/min',
    },
  ];

  // Calculate 3D subterranean path waypoints from start to target
  const computeMinePathWaypoints = useCallback((start: THREE.Vector3, target: THREE.Vector3): THREE.Vector3[] => {
    const waypoints: THREE.Vector3[] = [];
    waypoints.push(start.clone());

    // If starting and ending at different levels, traverse via central vertical shaft (x: 0, z: 0)
    if (Math.abs(start.y - target.y) > 4) {
      // 1. Move to central shaft junction at current level
      waypoints.push(new THREE.Vector3(start.x * 0.5, start.y, start.z * 0.5));
      waypoints.push(new THREE.Vector3(0, start.y, 0));

      // 2. Descend/ascend through hoisting shaft to target level
      waypoints.push(new THREE.Vector3(0, target.y, 0));

      // 3. Move along main drift at target level towards destination
      waypoints.push(new THREE.Vector3(target.x * 0.4, target.y, target.z * 0.4));
      waypoints.push(new THREE.Vector3(target.x * 0.8, target.y, target.z * 0.8));
    } else {
      // Same level: intermediate corner waypoint to simulate turning through orthogonal mine galleries
      if (Math.abs(start.x - target.x) > 10 && Math.abs(start.z - target.z) > 10) {
        waypoints.push(new THREE.Vector3(target.x, start.y, start.z));
      }
    }

    waypoints.push(target.clone());
    return waypoints;
  }, []);

  // Dispatch Rover to an Issue Place
  const handleDispatchToIssue = useCallback((issue: IssuePlace) => {
    soundEngine.playRadioSquelch();
    setNavTargetIssue(issue);
    setNavStatusText(`Autonomous En Route → ${issue.name}`);
    isNavigatingRef.current = true;

    const start = roverPosRef.current.clone();
    const target = new THREE.Vector3(...issue.coords);

    const waypoints = computeMinePathWaypoints(start, target);
    currentWaypointsRef.current = waypoints;
    currentWaypointIndexRef.current = 1; // target first waypoint after start

    // Update target beacon visual
    if (targetBeaconRef.current) {
      targetBeaconRef.current.position.copy(target);
      targetBeaconRef.current.visible = true;
    }

    // Update 3D path line
    if (navPathLineRef.current) {
      navPathLineRef.current.geometry.setFromPoints(waypoints);
      navPathLineRef.current.visible = true;
    }

    // Update app telemetry
    if (onUpdateRoverTelemetry) {
      onUpdateRoverTelemetry((prev) => ({
        ...prev,
        mode: 'autonomous',
        currentMission: `Investigating ${issue.name}`,
        speedMs: 1.8,
        visionMode: issue.issueType === 'trapped_miner' ? 'thermal' : prev.visionMode,
        irIlluminator: true,
        headlightBrightness: 100,
      }));
    }

    if (onDispatchRoverToCoords) {
      onDispatchRoverToCoords(issue.coords, issue.name);
    }
  }, [computeMinePathWaypoints, onDispatchRoverToCoords, onUpdateRoverTelemetry]);

  // Stop Rover Navigation
  const handleStopNavigation = () => {
    isNavigatingRef.current = false;
    currentWaypointsRef.current = [];
    setNavTargetIssue(null);
    setNavStatusText('Rover Stopped / Standby');
    if (navPathLineRef.current) navPathLineRef.current.visible = false;
    if (targetBeaconRef.current) targetBeaconRef.current.visible = false;

    if (onUpdateRoverTelemetry) {
      onUpdateRoverTelemetry((prev) => ({
        ...prev,
        mode: 'teleop',
        speedMs: 0,
        currentMission: 'Standby at Subterranean Location',
      }));
    }
  };

  // 3D Scene Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 1, 3000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x222a38, 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 0.9);
    sunLight.position.set(60, 140, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Surface Pithead Lights
    const surfaceLight = new THREE.PointLight(0xf59e0b, 1.8, 160);
    surfaceLight.position.set(0, 25, 0);
    scene.add(surfaceLight);

    // 5. Build Subterranean Coal Mine World Geometry
    buildCoalMineWorld(scene);

    // 6. Build Radar Scanning Elements
    buildRadarSweep(scene);

    // 7. Build LiDAR Point Cloud Particles
    buildLiDARPointCloud(scene);

    // 8. Build Trapped Miner in Drift B-4
    const minerGroup = buildTrappedMiner();
    scene.add(minerGroup);
    trappedMinerRef.current = minerGroup;

    // 9. Build Target Destination Beacon
    const targetBeacon = buildTargetBeacon();
    scene.add(targetBeacon);
    targetBeaconRef.current = targetBeacon;

    // 10. Build SentinelRover 3D Model with Spinning Wheels & Dynamic Spotlights
    const roverGroup = buildSentinelRoverModel();
    scene.add(roverGroup);
    roverMeshRef.current = roverGroup;

    // 11. Navigation Waypoint Path Line
    const pathGeometry = new THREE.BufferGeometry();
    const pathMaterial = new THREE.LineDashedMaterial({
      color: 0x10b981,
      dashSize: 3,
      gapSize: 1.5,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    pathLine.visible = false;
    scene.add(pathLine);
    navPathLineRef.current = pathLine;

    // 12. Rover Trail Line
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // 13. Mesh Wireless Lines Group
    const meshLinesGroup = new THREE.Group();
    meshLinesGroup.name = 'meshLinesGroup';
    scene.add(meshLinesGroup);
    meshLinesGroupRef.current = meshLinesGroup;

    // 14. Hazard Gas Particle System
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 320;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = -25 + (Math.random() - 0.5) * 80;
      particlePositions[i + 1] = -68 + (Math.random() - 0.5) * 20;
      particlePositions[i + 2] = 15 + (Math.random() - 0.5) * 70;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 2.4,
      transparent: true,
      opacity: 0.65,
    });
    const hazardParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(hazardParticles);
    hazardParticlesRef.current = hazardParticles;

    // 15. Rover Wheel Dust Particle System
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 60;
    const dustPositions = new Float32Array(dustCount * 3);
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 1.2,
      transparent: true,
      opacity: 0.4,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);
    dustParticlesRef.current = dustParticles;

    // Keyboard Drive Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keyStateRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keyStateRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // 1. Rotate Headframe Winding Sheave
      if (headframeSheaveRef.current) {
        headframeSheaveRef.current.rotation.z += 0.04;
      }

      // 2. Rotate Geotechnical Radar Sweep Beam
      if (radarSweepMeshRef.current) {
        radarSweepMeshRef.current.rotation.y = elapsedTime * 1.6;
      }

      // 3. Rotate Rover RPLIDAR Scanner
      if (roverLidarMeshRef.current) {
        roverLidarMeshRef.current.rotation.y += 0.15;
      }

      // 4. Pulse Sensor Beacons & Target Beacon
      sensorBeaconsRef.current.forEach((beacon) => {
        const ring = beacon.getObjectByName('pulseRing');
        if (ring) {
          const scale = 1 + Math.sin(elapsedTime * 4.0 + beacon.position.x * 0.1) * 0.3;
          ring.scale.set(scale, scale, scale);
        }
        const sosLamp = beacon.getObjectByName('sosButtonMesh');
        if (sosLamp && beacon.userData?.node?.sosTriggered) {
          const blink = Math.sin(elapsedTime * 12) > 0 ? 0xff0000 : 0x440000;
          (sosLamp as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: blink });
        }
      });

      if (targetBeaconRef.current && targetBeaconRef.current.visible) {
        const ring = targetBeaconRef.current.getObjectByName('targetRing');
        if (ring) {
          const s = 1.0 + Math.sin(elapsedTime * 6) * 0.35;
          ring.scale.set(s, s, s);
        }
      }

      // 5. Pulse Trapped Miner Thermal Bloom
      if (trappedMinerRef.current) {
        const halo = trappedMinerRef.current.getObjectByName('thermalBloom');
        if (halo) {
          const s = 1.0 + Math.sin(elapsedTime * 3) * 0.25;
          halo.scale.set(s, s, s);
        }
      }

      // 6. Animate Methane Hazard Particles
      if (hazardParticlesRef.current) {
        const pos = hazardParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i] += Math.sin(elapsedTime * 1.5 + i) * 0.04;
          pos[i + 1] += 0.03;
          if (pos[i + 1] > -50) pos[i + 1] = -75;
        }
        hazardParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // 7. ROVER PHYSICAL MOVEMENT ENGINE
      let isMoving = false;
      const moveSpeed = 6.5; // units per sec
      const rotSpeed = 3.5; // rad per sec

      // A. Autonomous Waypoint Following
      if (isNavigatingRef.current && currentWaypointsRef.current.length > 0) {
        const targetWp = currentWaypointsRef.current[currentWaypointIndexRef.current];
        if (targetWp) {
          const currentPos = roverPosRef.current;
          const diff = new THREE.Vector3().subVectors(targetWp, currentPos);
          const distToWp = diff.length();

          // Calculate remaining distance to final target
          let totalDist = distToWp;
          for (let i = currentWaypointIndexRef.current; i < currentWaypointsRef.current.length - 1; i++) {
            totalDist += currentWaypointsRef.current[i].distanceTo(currentWaypointsRef.current[i + 1]);
          }
          setNavDistanceMeters(Math.round(totalDist * 2.5)); // 1 unit = 2.5m

          if (distToWp < 1.2) {
            // Reached this waypoint
            if (currentWaypointIndexRef.current < currentWaypointsRef.current.length - 1) {
              currentWaypointIndexRef.current++;
            } else {
              // Reached final destination!
              isNavigatingRef.current = false;
              soundEngine.playRadioChime();
              setNavStatusText(`✓ Arrived at ${navTargetIssue?.name || 'Destination'}. Commencing Scan & Intercom.`);
              if (targetBeaconRef.current) targetBeaconRef.current.visible = false;
              if (navPathLineRef.current) navPathLineRef.current.visible = false;

              if (onUpdateRoverTelemetry) {
                onUpdateRoverTelemetry((prev) => ({
                  ...prev,
                  mode: 'teleop',
                  speedMs: 0,
                  currentMission: `Inspecting ${navTargetIssue?.name || 'Issue Node'}`,
                }));
              }
            }
          } else {
            // Move toward waypoint
            isMoving = true;
            const dir = diff.normalize();

            // Calculate target heading
            const targetHeadingRad = Math.atan2(dir.x, dir.z);
            let currentHeadingRad = (roverHeadingRef.current * Math.PI) / 180;

            // Shortest angle difference
            let angleDiff = targetHeadingRad - currentHeadingRad;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            currentHeadingRad += angleDiff * Math.min(1.0, rotSpeed * delta);
            roverHeadingRef.current = (currentHeadingRad * 180) / Math.PI;

            // Move position forward
            const step = Math.min(distToWp, moveSpeed * delta);
            currentPos.x += Math.sin(currentHeadingRad) * step;
            currentPos.z += Math.cos(currentHeadingRad) * step;

            // Interpolate elevation Y (sub-level drifts)
            currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetWp.y, 0.08);

            roverSpeedRef.current = 1.8;
          }
        }
      }

      // B. Manual Keyboard Drive Mode (WASD / Arrow Keys)
      if (isManualDriving) {
        const keys = keyStateRef.current;
        let driveDir = 0;
        let turnDir = 0;

        if (keys['w'] || keys['arrowup']) driveDir += 1;
        if (keys['s'] || keys['arrowdown']) driveDir -= 1;
        if (keys['a'] || keys['arrowleft']) turnDir -= 1;
        if (keys['d'] || keys['arrowright']) turnDir += 1;

        if (turnDir !== 0) {
          roverHeadingRef.current += turnDir * 90 * delta;
        }

        if (driveDir !== 0) {
          isMoving = true;
          const rad = (roverHeadingRef.current * Math.PI) / 180;
          roverPosRef.current.x += Math.sin(rad) * driveDir * moveSpeed * delta;
          roverPosRef.current.z += Math.cos(rad) * driveDir * moveSpeed * delta;
          roverSpeedRef.current = driveDir * 1.5;
        } else if (!isNavigatingRef.current) {
          roverSpeedRef.current = 0;
        }
      }

      // 8. Update Rover 3D Mesh & Spinning Wheels
      if (roverMeshRef.current) {
        const pos = roverPosRef.current;
        roverMeshRef.current.position.copy(pos);
        roverMeshRef.current.rotation.y = (roverHeadingRef.current * Math.PI) / 180;

        // Spin wheels when moving
        if (isMoving) {
          roverWheelsRef.current.forEach((wheel) => {
            wheel.rotation.z += 0.25;
          });
        }

        // Update trail
        const trailPos = new THREE.Vector3(pos.x, pos.y + 0.2, pos.z);
        if (
          trailPointsRef.current.length === 0 ||
          trailPointsRef.current[trailPointsRef.current.length - 1].distanceTo(trailPos) > 1.2
        ) {
          trailPointsRef.current.push(trailPos);
          if (trailPointsRef.current.length > 180) trailPointsRef.current.shift();
          if (trailLineRef.current) {
            trailLineRef.current.geometry.setFromPoints(trailPointsRef.current);
          }
        }
      }

      // 9. Camera Modes
      if (cameraMode === 'rover_follow' && roverMeshRef.current && cameraRef.current) {
        const roverPos = roverMeshRef.current.position;
        cameraTargetRef.current.lerp(roverPos, 0.08);
        const rad = (roverHeadingRef.current * Math.PI) / 180;
        camera.position.set(
          roverPos.x - 24 * Math.sin(rad),
          roverPos.y + 12,
          roverPos.z - 24 * Math.cos(rad)
        );
        camera.lookAt(cameraTargetRef.current);
      } else if (cameraMode === 'rover_fpv' && roverMeshRef.current && cameraRef.current) {
        // Cockpit Camera on Mast
        const roverPos = roverMeshRef.current.position;
        const rad = (roverHeadingRef.current * Math.PI) / 180;
        camera.position.set(roverPos.x + 1.2 * Math.sin(rad), roverPos.y + 2.4, roverPos.z + 1.2 * Math.cos(rad));
        const lookTarget = new THREE.Vector3(
          roverPos.x + 30 * Math.sin(rad),
          roverPos.y + 1.8,
          roverPos.z + 30 * Math.cos(rad)
        );
        camera.lookAt(lookTarget);
      } else if (cameraMode === 'top_down' && cameraRef.current) {
        camera.position.lerp(new THREE.Vector3(0, 180, 0), 0.05);
        camera.lookAt(new THREE.Vector3(0, -42, 0));
      } else if (cameraMode === 'radar_sweep' && cameraRef.current) {
        cameraAngleRef.current.theta += 0.003;
        updateCameraPosition();
      } else {
        updateCameraPosition();
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Update camera position from spherical coordinates
  const updateCameraPosition = () => {
    if (!cameraRef.current || cameraMode === 'rover_follow' || cameraMode === 'rover_fpv' || cameraMode === 'top_down') return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
    const z = radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  };

  // Build the authentic Subterranean Coal Mine World
  const buildCoalMineWorld = (scene: THREE.Scene) => {
    // 1. Surface Terrain with Open-Pit Excavation Benches & Subsidence Sag
    const terrainGeo = new THREE.PlaneGeometry(220, 220, 48, 48);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      let height = Math.sin(vx * 0.04) * 2.5 + Math.cos(vy * 0.04) * 2.5;
      const distFromPit = Math.sqrt(vx * vx + vy * vy);
      if (distFromPit < 35) {
        height -= (35 - distFromPit) * 0.25;
      }
      const distZoneB = Math.sqrt((vx - -25) ** 2 + (vy - 25) ** 2);
      if (distZoneB < 25) {
        height -= (25 - distZoneB) * 0.35;
      }
      pos.setZ(i, height);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x181f2b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = 0;
    scene.add(terrain);

    // Surface Subsidence Wireframe Isoline Grid
    const contourGeo = new THREE.PlaneGeometry(210, 210, 22, 22);
    const contourMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const contour = new THREE.Mesh(contourGeo, contourMat);
    contour.rotation.x = -Math.PI / 2;
    contour.position.y = 0.2;
    scene.add(contour);

    // Subsidence Risk Marker for Zone B
    const zoneBMarkerGeo = new THREE.RingGeometry(8, 14, 32);
    const zoneBMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const zoneBMarker = new THREE.Mesh(zoneBMarkerGeo, zoneBMarkerMat);
    zoneBMarker.rotation.x = -Math.PI / 2;
    zoneBMarker.position.set(-25, 0.4, 25);
    scene.add(zoneBMarker);

    // 2. Surface Pithead Headframe / Hoisting Tower with Winding Wheel
    const headframeGroup = new THREE.Group();
    headframeGroup.position.set(0, 0, 0);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.7 });
    for (let angle = 0; angle < 4; angle++) {
      const legGeo = new THREE.CylinderGeometry(0.5, 0.7, 34, 6);
      const leg = new THREE.Mesh(legGeo, legMat);
      const rad = (angle * Math.PI) / 2 + Math.PI / 4;
      leg.position.set(Math.cos(rad) * 6, 17, Math.sin(rad) * 6);
      leg.rotation.z = -Math.cos(rad) * 0.18;
      leg.rotation.x = Math.sin(rad) * 0.18;
      headframeGroup.add(leg);
    }

    // Top Winding Drum Sheave Wheel
    const sheaveGeo = new THREE.TorusGeometry(3.6, 0.35, 12, 32);
    const sheaveMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
    const sheave = new THREE.Mesh(sheaveGeo, sheaveMat);
    sheave.position.set(0, 32, 0);
    sheave.rotation.y = Math.PI / 2;
    headframeGroup.add(sheave);
    headframeSheaveRef.current = sheave;

    // Hoist Steel Cables
    const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, 120, 6);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, -25, 0);
    headframeGroup.add(cable);

    scene.add(headframeGroup);

    // 3. Central Vertical Main Shaft Shaft Tubing
    const shaftGeo = new THREE.CylinderGeometry(6, 6, 105, 24, 1, true);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      side: THREE.BackSide,
      roughness: 0.8,
      metalness: 0.5,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, -50, 0);
    scene.add(shaft);

    // 4. Multi-Level Horizontal Drift Galleries (Tunnels)
    // Level 1 (-20)
    buildTunnelSection(scene, 0, -20, 0, 90, 0, 0x10b981);
    buildTunnelSection(scene, 35, -20, 20, 0, 50, 0x10b981);
    buildLongwallShearer(scene, 35, -20, 40);

    // Level 2 (-42)
    buildTunnelSection(scene, 0, -42, 0, 0, 110, 0x06b6d4);
    buildTunnelSection(scene, -30, -42, -20, 70, 0, 0x06b6d4);
    buildRefugeChamber(scene, 0, -42, 45, 'Refuge Station #1');

    // Level 3 (-68) - Critical Drift B-4
    buildTunnelSection(scene, 0, -68, 0, 115, 0, 0xef4444);
    buildTunnelSection(scene, -45, -68, 25, 0, 60, 0xef4444);
    buildPillar12Extraction(scene, -15, -68, 35);

    // Level 4 (-92) - Deep Water Sump
    buildTunnelSection(scene, 0, -92, 0, 60, 60, 0x3b82f6);
    buildWaterSump(scene, 15, -92, -15);

    // 5. Stratum Layers (Caprock, Sandstone, Shale, Coal Seam)
    const strataGroup = new THREE.Group();
    strataGroup.name = 'strataLayersGroup';

    const strataTypes = [
      { y: -10, color: 0x64748b, name: 'Weathered Sandstone Overburden' },
      { y: -31, color: 0x475569, name: 'Massive Siltstone Caprock' },
      { y: -55, color: 0x334155, name: 'Carbonaceous Shale Barrier' },
      { y: -80, color: 0x0f172a, name: 'Main Coal Seam 4 (High Methane)' },
    ];

    strataTypes.forEach(({ y, color }) => {
      const planeGeo = new THREE.PlaneGeometry(190, 190);
      const planeMat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = y;
      strataGroup.add(plane);
    });

    scene.add(strataGroup);
  };

  // Longwall Shearer Machine Model
  const buildLongwallShearer = (scene: THREE.Scene, x: number, y: number, z: number) => {
    const shearer = new THREE.Group();
    shearer.position.set(x, y + 1.2, z);

    const bodyGeo = new THREE.BoxGeometry(8, 2.2, 3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    shearer.add(body);

    const drumGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 16);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const drum1 = new THREE.Mesh(drumGeo, drumMat);
    drum1.rotation.z = Math.PI / 2;
    drum1.position.set(4.2, 0.4, 0);
    shearer.add(drum1);

    scene.add(shearer);
  };

  // Pillar 12 Extraction Zone with Shoring Props
  const buildPillar12Extraction = (scene: THREE.Scene, x: number, y: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    for (let px = -6; px <= 6; px += 6) {
      for (let pz = -6; pz <= 6; pz += 6) {
        const propGeo = new THREE.CylinderGeometry(0.3, 0.35, 4.5, 8);
        const propMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
        const prop = new THREE.Mesh(propGeo, propMat);
        prop.position.set(px, 2.25, pz);
        group.add(prop);
      }
    }

    const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 4.2, 0);
    group.add(beacon);

    scene.add(group);
  };

  // Refuge Chamber Station
  const buildRefugeChamber = (scene: THREE.Scene, x: number, y: number, z: number, name: string) => {
    const chamberGeo = new THREE.BoxGeometry(10, 4.2, 8);
    const chamberMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    chamber.position.set(x, y + 2.1, z);
    scene.add(chamber);

    const greenBeacon = new THREE.PointLight(0x10b981, 1.8, 25);
    greenBeacon.position.set(x + 5, y + 4.5, z);
    scene.add(greenBeacon);
  };

  // Water Sump & Flood Sensor Zone
  const buildWaterSump = (scene: THREE.Scene, x: number, y: number, z: number) => {
    const sumpGeo = new THREE.BoxGeometry(16, 1.5, 16);
    const sumpMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
    });
    const sump = new THREE.Mesh(sumpGeo, sumpMat);
    sump.position.set(x, y + 0.75, z);
    scene.add(sump);
  };

  // 3D Tunnel section with steel arches and lighting
  const buildTunnelSection = (
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    lengthX: number,
    lengthZ: number,
    accentColor: number
  ) => {
    const isXOriented = lengthX > 0;
    const length = isXOriented ? lengthX : lengthZ;
    const tunnelGroup = new THREE.Group();

    const width = 6.5;
    const height = 4.8;
    const tunnelGeo = new THREE.BoxGeometry(
      isXOriented ? length : width,
      height,
      isXOriented ? width : length
    );

    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x111620,
      roughness: 0.98,
      metalness: 0.02,
      side: THREE.BackSide,
    });

    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(x, y + height / 2, z);
    tunnelGroup.add(tunnel);

    const archCount = Math.floor(length / 6.5);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.8,
    });

    for (let i = 0; i <= archCount; i++) {
      const offset = -length / 2 + (i / archCount) * length;
      const archGeo = new THREE.TorusGeometry(3.1, 0.16, 6, 14, Math.PI);
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.rotation.x = Math.PI;

      if (isXOriented) {
        arch.rotation.y = Math.PI / 2;
        arch.position.set(x + offset, y + 0.1, z);
      } else {
        arch.position.set(x, y + 0.1, z + offset);
      }
      tunnelGroup.add(arch);
    }

    const pointLight = new THREE.PointLight(accentColor, 0.55, 24);
    pointLight.position.set(x, y + 3.8, z);
    tunnelGroup.add(pointLight);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const railGeo = new THREE.BoxGeometry(
      isXOriented ? length : 0.2,
      0.15,
      isXOriented ? 0.2 : length
    );
    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(isXOriented ? x : x - 1.1, y + 0.1, isXOriented ? z - 1.1 : z);
    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(isXOriented ? x : x + 1.1, y + 0.1, isXOriented ? z + 1.1 : z);
    tunnelGroup.add(rail1);
    tunnelGroup.add(rail2);

    scene.add(tunnelGroup);
  };

  // 3D Geotechnical Radar Sweep
  const buildRadarSweep = (scene: THREE.Scene) => {
    const radarGroup = new THREE.Group();
    radarGroup.name = 'radarSweepGroup';

    [25, 50, 75, 100].forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r - 0.2, r + 0.2, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      radarGroup.add(ring);
    });

    const sweepGeo = new THREE.RingGeometry(0, 105, 32, 1, 0, Math.PI / 4);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    sweepMesh.position.y = 0.6;
    radarGroup.add(sweepMesh);
    radarSweepMeshRef.current = sweepMesh;

    scene.add(radarGroup);
  };

  // LiDAR SLAM Point Cloud
  const buildLiDARPointCloud = (scene: THREE.Scene) => {
    const pointCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    const c1 = new THREE.Color(0x06b6d4);
    const c2 = new THREE.Color(0x3b82f6);

    for (let i = 0; i < pointCount * 3; i += 3) {
      const level = Math.floor(Math.random() * 4) + 1;
      const y = level === 1 ? -20 : level === 2 ? -42 : level === 3 ? -68 : -92;

      positions[i] = (Math.random() - 0.5) * 110;
      positions[i + 1] = y + (Math.random() - 0.5) * 4.2;
      positions[i + 2] = (Math.random() - 0.5) * 110;

      const col = Math.random() > 0.5 ? c1 : c2;
      colors[i] = col.r;
      colors[i + 1] = col.g;
      colors[i + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'lidarPointCloud';
    scene.add(points);
    lidarPointsRef.current = points;
  };

  // Trapped Miner Thermal Hotspot in Drift B-4
  const buildTrappedMiner = () => {
    const miner = new THREE.Group();
    miner.name = 'trappedMinerGroup';
    miner.position.set(-45, -67.5, 25);

    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    miner.add(body);

    const hatGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.5;
    miner.add(hat);

    const bloomGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const bloomMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const bloom = new THREE.Mesh(bloomGeo, bloomMat);
    bloom.name = 'thermalBloom';
    bloom.position.y = 0.9;
    miner.add(bloom);

    return miner;
  };

  // Target Destination Beacon
  const buildTargetBeacon = () => {
    const target = new THREE.Group();
    target.name = 'targetDestinationBeacon';
    target.visible = false;

    const ringGeo = new THREE.RingGeometry(2.0, 3.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'targetRing';
    ring.rotation.x = -Math.PI / 2;
    target.add(ring);

    const arrowGeo = new THREE.ConeGeometry(0.8, 2.2, 8);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI;
    arrow.position.y = 3.5;
    target.add(arrow);

    const targetLight = new THREE.PointLight(0x10b981, 2.5, 30);
    targetLight.position.y = 3;
    target.add(targetLight);

    return target;
  };

  // 3D SentinelRover Model (Jetson/RPi 5 + 4 All-Terrain Wheels + RPLIDAR + Dual Spotlights)
  const buildSentinelRoverModel = () => {
    const rover = new THREE.Group();
    rover.name = 'sentinelRoverGroup';

    // Main Aluminum Chassis
    const bodyGeo = new THREE.BoxGeometry(3.6, 1.3, 2.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      metalness: 0.85,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    rover.add(body);

    // Rollcage with Yellow Hazard Stripe
    const rollcageGeo = new THREE.BoxGeometry(3.8, 0.25, 2.6);
    const rollcageMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.4,
    });
    const rollcage = new THREE.Mesh(rollcageGeo, rollcageMat);
    rollcage.position.y = 1.65;
    rover.add(rollcage);

    // 4x All-Terrain Off-Road Wheels
    roverWheelsRef.current = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.1 });
    const wheelPositions = [
      [1.4, 0.6, 1.4],
      [-1.4, 0.6, 1.4],
      [1.4, 0.6, -1.4],
      [-1.4, 0.6, -1.4],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.55, 16);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      rover.add(wheel);
      roverWheelsRef.current.push(wheel);
    });

    // Slamtec RPLIDAR A2M12 Scanner Turret on Mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.6, 2.0, 0);
    rover.add(mast);

    const lidarGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
    const lidarMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.5,
    });
    const lidar = new THREE.Mesh(lidarGeo, lidarMat);
    lidar.position.set(0.6, 2.6, 0);
    rover.add(lidar);
    roverLidarMeshRef.current = lidar;

    // FLIR Thermal Camera Head
    const camGeo = new THREE.BoxGeometry(0.7, 0.55, 0.45);
    const camMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const cam = new THREE.Mesh(camGeo, camMat);
    cam.position.set(1.5, 1.4, 0);
    rover.add(cam);

    const lensGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(1.85, 1.4, 0);
    rover.add(lens);

    // High-Beam Dynamic LED Spotlight Headlight
    const spotLight = new THREE.SpotLight(0xfffbeb, 4.5, 45, Math.PI / 4, 0.3, 1);
    spotLight.position.set(1.8, 1.2, 0);
    spotLight.target.position.set(24, 0, 0);
    rover.add(spotLight);
    rover.add(spotLight.target);
    roverSpotlightRef.current = spotLight;

    // Two-Way Audio Horn
    const speakerGeo = new THREE.ConeGeometry(0.3, 0.5, 12);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const speaker = new THREE.Mesh(speakerGeo, speakerMat);
    speaker.rotation.z = -Math.PI / 2;
    speaker.position.set(1.2, 1.8, 0.6);
    rover.add(speaker);

    rover.position.copy(roverPosRef.current);
    return rover;
  };

  // Sync Sensor Node 3D Beacons
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    sensorBeaconsRef.current.forEach((beacon) => scene.remove(beacon));
    sensorBeaconsRef.current.clear();

    sensorNodes.forEach((node) => {
      if (activeLevelFilter !== 'all' && node.level !== activeLevelFilter) return;

      const beacon = new THREE.Group();
      beacon.position.set(node.position3D[0], node.position3D[1], node.position3D[2]);

      let color = 0x10b981;
      if (node.status === 'caution') color = 0xf59e0b;
      if (node.status === 'warning') color = 0xf97316;
      if (node.status === 'critical') color = 0xef4444;

      const sphereGeo = new THREE.SphereGeometry(1.3, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      beacon.add(sphere);

      const ringGeo = new THREE.RingGeometry(1.8, 2.6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'pulseRing';
      ring.rotation.x = Math.PI / 2;
      beacon.add(ring);

      const sosBoxGeo = new THREE.BoxGeometry(1.4, 1.4, 0.6);
      const sosBoxMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const sosButton = new THREE.Mesh(sosBoxGeo, sosBoxMat);
      sosButton.name = 'sosButtonMesh';
      sosButton.position.set(0, 1.6, 0);
      beacon.add(sosButton);

      const rayGeo = new THREE.CylinderGeometry(0.08, 0.08, 7, 6);
      const rayMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.y = 3.5;
      beacon.add(ray);

      beacon.userData = { node };
      scene.add(beacon);
      sensorBeaconsRef.current.set(node.id, beacon);
    });
  }, [sensorNodes, activeLevelFilter]);

  // Sync ESP-MESH Wireless Multi-Hop Lines
  useEffect(() => {
    if (!sceneRef.current || !meshLinesGroupRef.current) return;
    const group = meshLinesGroupRef.current;
    group.clear();

    if (!showMeshHops) return;

    const nodesSorted = [...sensorNodes].sort((a, b) => a.level - b.level);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 2,
      gapSize: 1,
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
    });

    for (let i = 0; i < nodesSorted.length - 1; i++) {
      const p1 = new THREE.Vector3(...nodesSorted[i].position3D);
      const p2 = new THREE.Vector3(...nodesSorted[i + 1].position3D);
      const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(geom, lineMat);
      line.computeLineDistances();
      group.add(line);
    }
  }, [sensorNodes, showMeshHops]);

  // Mouse Orbiting
  const handleMouseDown = (e: React.MouseEvent) => {
    if (cameraMode === 'rover_follow' || cameraMode === 'rover_fpv' || cameraMode === 'top_down') return;
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || cameraMode === 'rover_follow' || cameraMode === 'rover_fpv' || cameraMode === 'top_down') return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (e.buttons === 1) {
      cameraAngleRef.current.theta -= deltaX * 0.008;
      cameraAngleRef.current.phi = Math.max(
        0.08,
        Math.min(Math.PI / 2 - 0.02, cameraAngleRef.current.phi - deltaY * 0.008)
      );
    } else if (e.buttons === 2) {
      const panSpeed = 0.15;
      cameraTargetRef.current.x -= deltaX * panSpeed;
      cameraTargetRef.current.y += deltaY * panSpeed;
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (cameraMode === 'rover_follow' || cameraMode === 'rover_fpv' || cameraMode === 'top_down') return;
    e.preventDefault();
    cameraAngleRef.current.radius = Math.max(
      30,
      Math.min(320, cameraAngleRef.current.radius + e.deltaY * 0.08)
    );
    updateCameraPosition();
  };

  // Click Raycaster for Node selection or Direct Click-to-Dispatch
  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && !curr.userData?.node) {
        curr = curr.parent;
      }
      if (curr?.userData?.node) {
        const node = curr.userData.node as SensorNode;
        onSelectNode(node);
        soundEngine.playRadioSquelch();

        if (hit.object.name === 'sosButtonMesh' && onTriggerSOS) {
          onTriggerSOS(node.id);
        }
        return;
      }
    }
  };

  const resetCamera = () => {
    cameraAngleRef.current = { theta: 0.75, phi: 0.65, radius: 155 };
    cameraTargetRef.current.set(0, -42, 0);
    setCameraMode('orbit');
    updateCameraPosition();
  };

  return (
    <div
      id="coal-mine-radar-twin-container"
      className={`relative w-full rounded-2xl overflow-hidden bg-[#0A0A0A] border border-[#262626] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[620px]'
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top Header Overlay with Status & Mode Switches */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between pointer-events-none gap-2 z-10">
        <div className="flex items-center gap-2.5 pointer-events-auto bg-[#121212]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#2A2A2A] shadow-xl text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wide">
            <Radar className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>3D SUBTERRANEAN MINE SITE & AUTONOMOUS ROVER</span>
          </div>
          <span className="text-[#444444]">|</span>
          <div className="flex items-center gap-2 text-[#CCCCCC] font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Depth -960m Active</span>
            </span>
            <span className="text-[#444444]">•</span>
            <span className="text-amber-400">ASTRO-PROTO Kinematics Online</span>
          </div>
        </div>

        {/* Camera Views & Navigation Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#121212]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#2A2A2A] shadow-xl text-xs">
          {/* Camera Buttons */}
          <button
            id="btn-cam-orbit"
            onClick={() => {
              setCameraMode('orbit');
              updateCameraPosition();
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold text-xs cursor-pointer ${
              cameraMode === 'orbit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[#888888] hover:text-[#EEEEEE]'
            }`}
          >
            Orbit
          </button>

          <button
            id="btn-cam-rover"
            onClick={() => setCameraMode('rover_follow')}
            className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
              cameraMode === 'rover_follow'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/80 border border-blue-400'
                : 'text-[#888888] hover:text-[#EEEEEE]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Follow Rover</span>
          </button>

          <button
            id="btn-cam-fpv"
            onClick={() => setCameraMode('rover_fpv')}
            className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
              cameraMode === 'rover_fpv'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/80 border border-amber-400'
                : 'text-[#888888] hover:text-[#EEEEEE]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Cockpit FPV</span>
          </button>

          <button
            id="btn-toggle-manual-drive"
            onClick={() => {
              setIsManualDriving(!isManualDriving);
              if (!isManualDriving) soundEngine.playRadioSquelch();
            }}
            className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
              isManualDriving
                ? 'bg-emerald-600 text-white border border-emerald-400 animate-pulse'
                : 'bg-[#1A1A1A] text-[#999999] hover:text-white border border-[#2A2A2A]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{isManualDriving ? 'WASD Active' : 'Manual Drive'}</span>
          </button>

          <button
            id="btn-cam-reset"
            onClick={resetCamera}
            title="Reset Camera View"
            className="p-1.5 text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1F1F1F] rounded-lg cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-toggle-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1F1F1F] rounded-lg cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Active Rover Status HUD (Top-Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#121212]/95 backdrop-blur-md px-4 py-2 rounded-xl border border-[#2A2A2A] shadow-2xl flex items-center gap-4 text-xs font-mono z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isNavigatingRef.current ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
          <span className="text-[#EDEDED] font-bold">{navStatusText}</span>
        </div>

        {isNavigatingRef.current && (
          <>
            <span className="text-[#444444]">|</span>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Dist: {navDistanceMeters}m</span>
            </div>
            <span className="text-[#444444]">|</span>
            <button
              onClick={handleStopNavigation}
              className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-700/60 cursor-pointer"
            >
              Cancel Path
            </button>
          </>
        )}
      </div>

      {/* Sub-level Isolation & Stratum Toggles (Left Vertical Bar) */}
      <div className="absolute left-3 top-16 bottom-24 flex flex-col justify-between pointer-events-auto bg-[#121212]/95 backdrop-blur-md p-2.5 rounded-xl border border-[#2A2A2A] shadow-2xl text-xs w-52 z-10 overflow-y-auto">
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Coal Seam Drifts</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          <button
            onClick={() => setActiveLevelFilter('all')}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-[11px] transition-all cursor-pointer ${
              activeLevelFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-[#888888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'
            }`}
          >
            All Drifts (Surface to -960m)
          </button>

          <button
            onClick={() => setActiveLevelFilter(0)}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-[11px] transition-all cursor-pointer ${
              activeLevelFilter === 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-[#888888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'
            }`}
          >
            Surface Subsidence Grid
          </button>

          {mineLevels.map((lvl) => (
            <button
              key={lvl.level}
              onClick={() => setActiveLevelFilter(lvl.level)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                activeLevelFilter === lvl.level
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-[#888888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'
              }`}
            >
              <span>SL-{lvl.level} (-{lvl.depthMeters}m)</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  lvl.status === 'critical'
                    ? 'bg-red-500 animate-ping'
                    : lvl.status === 'caution'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-[#222222] space-y-1.5">
          <label className="flex items-center justify-between text-[11px] text-[#AAAAAA] cursor-pointer select-none">
            <span>Rock Strata Layers</span>
            <input
              type="checkbox"
              checked={showStrataLayers}
              onChange={(e) => setShowStrataLayers(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-[#AAAAAA] cursor-pointer select-none">
            <span>ESP-MESH Lines</span>
            <input
              type="checkbox"
              checked={showMeshHops}
              onChange={(e) => setShowMeshHops(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-[#AAAAAA] cursor-pointer select-none">
            <span>LiDAR Scatter</span>
            <input
              type="checkbox"
              checked={showLidarRays}
              onChange={(e) => setShowLidarRays(e.target.checked)}
              className="accent-blue-500 rounded"
            />
          </label>
        </div>
      </div>

      {/* Manual WASD Drive HUD Overlay (when enabled) */}
      {isManualDriving && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#121212]/95 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-2xl flex flex-col items-center gap-2 z-10 animate-in fade-in duration-200">
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
            Manual Kinematic Drive Control (Keyboard WASD or Click)
          </span>
          <div className="flex flex-col items-center gap-1">
            <button
              onMouseDown={() => (keyStateRef.current['w'] = true)}
              onMouseUp={() => (keyStateRef.current['w'] = false)}
              className="w-10 h-10 rounded-xl bg-[#222222] active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-[#333333] cursor-pointer"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={() => (keyStateRef.current['a'] = true)}
                onMouseUp={() => (keyStateRef.current['a'] = false)}
                className="w-10 h-10 rounded-xl bg-[#222222] active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-[#333333] cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onMouseDown={() => (keyStateRef.current['s'] = true)}
                onMouseUp={() => (keyStateRef.current['s'] = false)}
                className="w-10 h-10 rounded-xl bg-[#222222] active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-[#333333] cursor-pointer"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                onMouseDown={() => (keyStateRef.current['d'] = true)}
                onMouseUp={() => (keyStateRef.current['d'] = false)}
                className="w-10 h-10 rounded-xl bg-[#222222] active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-[#333333] cursor-pointer"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE MINE ISSUES QUICK-DISPATCH DRAWER (Bottom Bar) */}
      <div className="absolute bottom-3 left-3 right-3 pointer-events-auto bg-[#121212]/95 backdrop-blur-md p-2.5 rounded-2xl border border-[#2A2A2A] shadow-2xl z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-bold text-[#EDEDED] uppercase tracking-wider font-sans">
              Issue Places & Auto-Dispatch SentinelRover
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-800/60 font-bold">
              {issuePlaces.length} Detected Incidents
            </span>
          </div>

          <span className="text-[11px] text-[#888888] font-mono">
            Click any issue below to dispatch rover autonomously along 3D tunnels
          </span>
        </div>

        {/* Issue Cards Carousel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 overflow-x-auto">
          {issuePlaces.map((issue) => {
            const isTarget = navTargetIssue?.id === issue.id;
            return (
              <div
                key={issue.id}
                onClick={() => handleDispatchToIssue(issue)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isTarget
                    ? 'bg-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-950/60 scale-[1.02]'
                    : issue.severity === 'critical'
                    ? 'bg-[#181214] hover:bg-[#221619] border-red-900/50 hover:border-red-500'
                    : 'bg-[#161616] hover:bg-[#202020] border-[#2A2A2A] hover:border-cyan-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        issue.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {issue.levelName}
                    </span>
                    {isTarget && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        NAV
                      </span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-bold text-[#EDEDED] leading-tight mb-1 truncate">
                    {issue.name}
                  </h4>
                  <p className="text-[9px] text-[#888888] font-mono line-clamp-1 mb-1.5">
                    {issue.metrics}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDispatchToIssue(issue);
                  }}
                  className={`w-full py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isTarget
                      ? 'bg-emerald-600 text-white'
                      : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60'
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isTarget ? 'En Route' : 'Dispatch Rover'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Card (Bottom-Right) */}
      {selectedNode && (
        <div className="absolute right-3 top-16 bg-[#121212]/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#2A2A2A] shadow-2xl text-xs w-80 pointer-events-auto z-10">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222] mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  selectedNode.status === 'critical'
                    ? 'bg-red-500 animate-ping'
                    : selectedNode.status === 'caution'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-bold text-[#EDEDED]">{selectedNode.name}</span>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="text-[#666666] hover:text-[#EEEEEE] cursor-pointer"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] mb-3">
            <div className="bg-[#181818] p-2 rounded-lg border border-[#242424]">
              <span className="text-[#888888] block text-[9px]">Methane:</span>
              <span
                className={`font-bold ${
                  selectedNode.methaneLEL > 10 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {selectedNode.methaneLEL}% LEL ({selectedNode.methaneVol}% vol)
              </span>
            </div>
            <div className="bg-[#181818] p-2 rounded-lg border border-[#242424]">
              <span className="text-[#888888] block text-[9px]">CO Level:</span>
              <span className="font-bold text-[#EDEDED]">{selectedNode.carbonMonoxidePPM} PPM</span>
            </div>
            <div className="bg-[#181818] p-2 rounded-lg border border-[#242424]">
              <span className="text-[#888888] block text-[9px]">Rock Tilt:</span>
              <span className="font-bold text-amber-400">
                X:{selectedNode.rockTiltX}" Y:{selectedNode.rockTiltY}"
              </span>
            </div>
            <div className="bg-[#181818] p-2 rounded-lg border border-[#242424]">
              <span className="text-[#888888] block text-[9px]">Mesh RSSI:</span>
              <span className="font-bold text-cyan-400">{selectedNode.meshRssi} dBm</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => {
                const issue: IssuePlace = {
                  id: `dispatch-${selectedNode.id}`,
                  name: selectedNode.name,
                  level: selectedNode.level,
                  levelName: selectedNode.levelName,
                  coords: selectedNode.position3D,
                  severity: selectedNode.status === 'normal' ? 'caution' : selectedNode.status,
                  issueType: 'methane_leak',
                  description: `Investigate node ${selectedNode.id}`,
                  metrics: `CH4: ${selectedNode.methaneLEL}% LEL`,
                };
                handleDispatchToIssue(issue);
              }}
              className="w-full py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <Navigation className="w-4 h-4" />
              <span>Drive Rover to this Node</span>
            </button>

            {onTriggerSOS && (
              <button
                onClick={() => onTriggerSOS(selectedNode.id)}
                className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedNode.sosTriggered
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60'
                }`}
              >
                <BellRing className="w-4 h-4 text-red-400" />
                <span>{selectedNode.sosTriggered ? 'SOS ALARM ACTIVE' : 'Trigger Node SOS Alarm'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
