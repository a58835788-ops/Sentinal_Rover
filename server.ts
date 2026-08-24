import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize Gemini client server-side
  let ai: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return ai;
  }

  // --- API Endpoints ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      service: 'Subterranean Coal Mine Spatial Twin & RPi5 HIL Rover Bridge',
    });
  });

  // 1. Geotechnical & Rock Strata Failure AI Analysis
  app.post('/api/ai/geotechnical-analysis', async (req, res) => {
    try {
      const { sensorNodes, mineLevels, activeHazards, roverTelemetry } = req.body;

      const client = getGeminiClient();

      const prompt = `You are the Chief Subterranean Geotechnical & Mine Safety AI Engineer for an underground coal extraction operation.
Analyze the following live sensor mesh telemetry and rover reconnaissance data to assess structural collapse hazards, seismic rockburst risks, explosive gas accumulations, and emergency mitigation protocols:

ACTIVE MINE SENSOR DATA:
${JSON.stringify(sensorNodes || [], null, 2)}

MINE STRATA LEVELS:
${JSON.stringify(mineLevels || [], null, 2)}

ROVER POSITION & ATMOSPHERE:
${JSON.stringify(roverTelemetry || {}, null, 2)}

ACTIVE INJECTED HAZARDS:
${JSON.stringify(activeHazards || [], null, 2)}

Perform deep multi-variable geotechnical correlation (cross-referencing rock tilt arcseconds, acoustic emission kHz micro-fracturing rate, geophone PPV mm/s, and methane % LEL).
Return a structured JSON response matching the required schema.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a premier underground mining geotechnical safety specialist adhering to MSHA, NIOSH, and global underground coal mining standards.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rockburstRiskIndex: {
                type: Type.NUMBER,
                description: 'Rockburst & structural collapse risk index from 0 (safest) to 100 (imminent collapse)',
              },
              strataStabilityStatus: {
                type: Type.STRING,
                description: 'One of: Stable, Marginal, Imminent Delamination, High Collapse Hazard',
              },
              gasExplosionProbability: {
                type: Type.NUMBER,
                description: 'Estimated methane ignition/explosion probability from 0 to 100 %',
              },
              recommendedShoringType: {
                type: Type.STRING,
                description: 'Specific shoring solution e.g., Hydraulic Props with Steel Mesh, Resin Cable Bolts 24mm, Arch Yielding Sets',
              },
              immediateActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of urgent tactical actions for safety controllers and miners',
              },
              autonomousRoverFlightPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Recommended rover autonomous reconnaissance waypoints and sensor checks',
              },
              mshaReportSummary: {
                type: Type.STRING,
                description: 'Formal geotechnical incident briefing and safety compliance summary',
              },
            },
            required: [
              'rockburstRiskIndex',
              'strataStabilityStatus',
              'gasExplosionProbability',
              'recommendedShoringType',
              'immediateActions',
              'autonomousRoverFlightPlan',
              'mshaReportSummary',
            ],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);
      parsedData.generatedAt = new Date().toISOString();

      res.json(parsedData);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error in geotechnical AI analysis:', error);
      
      // Provide intelligent fallback data if key is missing or error occurs
      res.json({
        rockburstRiskIndex: 42,
        strataStabilityStatus: 'Marginal',
        gasExplosionProbability: 18,
        recommendedShoringType: 'Double-row Hydraulic Steel Props (40-ton) with Heavy Wire Strata Mesh',
        immediateActions: [
          'Ventilate Sub-level 3 return airway to bring CH4 below 1.0% Vol',
          'Dispatch RPi5 Recon Rover with FLIR thermal mode to inspect Pillar 12 shear cracks',
          'Verify underground crew count in Sub-level 2 refuge station',
          'Deploy geotechnical acoustic sensors along Section 4 longwall retreat face',
        ],
        autonomousRoverFlightPlan: [
          'Execute Waypoint 1: Drift 3-A Entry Portal [X: 120, Y: -45, Z: -720m]',
          'Thermal Scan: Pillar 12 Rock Face [Angle: +15 deg tilt, 850nm IR illumination]',
          'Sniff Gas Accumulation: Methane Pocket Elevation +2.4m above roof line',
          'Transmit HD Video & 3D Spatial Mesh to Surface Command Station',
        ],
        mshaReportSummary:
          'Geotechnical analysis indicates localized strata delamination stress concentrated at Sub-level 3 (Depth: -720m). Acoustic micro-fracture rate is 142 counts/min with bi-axial tilt exceeding baseline by 18 arcseconds. Recommend immediate shoring reinforcement and exclusion zone establishment.',
        generatedAt: new Date().toISOString(),
        fallback: true,
        errorMessage: error?.message,
      });
    }
  });

  // 2. Hardware-in-the-Loop RPi 5 Telemetry Synchronizer
  app.post('/api/rover/command-bridge', (req, res) => {
    const { pwmLeftUs, pwmRightUs, visionMode, headlightBrightness, irIlluminator } = req.body;
    // Simulates microsecond-level hardware PWM pulse serialization to RPi 5 GPIO daemon
    res.json({
      status: 'acknowledged',
      gpio18_pwm: pwmLeftUs,
      gpio19_pwm: pwmRightUs,
      hardwareTimerDeltaUs: 12,
      visionMode,
      headlightBrightness,
      irIlluminator,
      timestamp: Date.now(),
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Subterranean Mine Spatial Twin & RPi5 Bridge running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
