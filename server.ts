import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Neural Amp Modeler Trainer Backend" });
  });

  // Generate simulated amp profiles using Gemini
  app.post("/api/generate-profile", async (req, res) => {
    const { description, architecture } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Gear description is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback/Simulated data when API key is missing
      const simulatedData = getFallbackProfile(description, architecture || "a2");
      return res.json({
        ...simulatedData,
        warning: "Running in offline mode (using simulated profile generator). Set GEMINI_API_KEY for authentic custom modeling."
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Analyze this guitar/bass equipment description: "${description}".
Provide a realistic Neural Amp Modeler training profile for this gear using the "${architecture || "a2"}" architecture.
Make sure the frequencyResponse and lossCurve are physically and mathematically realistic for this specific style of gear (e.g., hi-gain amps should have a more compressed loss curve, mid scoop or specific EQ characteristics in targetDb, whereas a clean pedal should have low distortion and flat or mid-boosted response).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gearName: { type: Type.STRING, description: "Accurate name/model of the gear (e.g., JCM800, Tube Screamer, etc.)" },
              gearType: { type: Type.STRING, description: "amp, pedal, preamp, cab, or amp_cab" },
              toneType: { type: Type.STRING, description: "clean, overdrive, crunch, hi_gain, or fuzz" },
              architecture: { type: Type.STRING, description: "a1 or a2" },
              recommendedSize: { type: Type.STRING, description: "Standard, Lite, Feather, Nano (for a1) or Full, Lite (for a2)" },
              lossCurve: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "Array of exactly 100 decreasing numbers starting from around 0.8 and ending near 0.005 representing the ESR (Error-to-Signal Ratio) loss per epoch during training. Must look like a realistic exponentially decaying training loss curve with slight noise/fluctuations."
              },
              frequencyResponse: {
                type: Type.OBJECT,
                properties: {
                  frequencies: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of 30 frequency values from 20 to 20000 Hz on a logarithmic scale"
                  },
                  inputDb: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of 30 decibel values representing the frequency response of the dry input sweep signal"
                  },
                  targetDb: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Array of 30 decibel values representing the frequency response of the target/recorded amp output signal. Must match the tonal characteristics of the described gear (e.g., bass roll-off, mid-hump for Tubescreamer, etc.)"
                  }
                },
                required: ["frequencies", "inputDb", "targetDb"]
              },
              summaryDescription: { type: Type.STRING, description: "A concise 2-sentence description of the tone and amp qualities." }
            },
            required: ["gearName", "gearType", "toneType", "architecture", "recommendedSize", "lossCurve", "frequencyResponse", "summaryDescription"]
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json(parsed);
      } else {
        throw new Error("Empty response from Gemini.");
      }
    } catch (error: any) {
      console.error("Gemini API error:", error);
      // Fallback on error
      const simulatedData = getFallbackProfile(description, architecture || "a2");
      return res.json({
        ...simulatedData,
        warning: `AI generation failed (${error.message || error}). Reverted to physics-based local simulation.`
      });
    }
  });

  // Export NAM Model as JSON
  app.post("/api/export-nam", (req, res) => {
    const { modelName, creator, architecture, size, gearType, toneType, summary } = req.body;

    const baseConfig = architecture === "a2" 
      ? {
          input_size: 1,
          output_size: 1,
          architecture: "WaveNet",
          config: {
            layers: 8,
            channels: size === "Lite" ? 8 : 16,
            dilations: [1, 2, 4, 8, 1, 2, 4, 8],
            slimmable: size === "Lite"
          }
        }
      : {
          input_size: 1,
          output_size: 1,
          architecture: "WaveNet",
          config: {
            layers: size === "Nano" ? 4 : size === "Feather" ? 8 : size === "Lite" ? 12 : 16,
            channels: size === "Nano" || size === "Feather" ? 8 : 16,
            dilations: [1, 2, 4, 8, 16, 32, 64, 128, 1, 2, 4, 8, 16, 32, 64, 128].slice(0, size === "Nano" ? 4 : size === "Feather" ? 8 : size === "Lite" ? 12 : 16),
            slimmable: false
          }
        };

    // Generate random mock weights representing trained model parameters
    const totalWeightsCount = (baseConfig.config.layers * baseConfig.config.channels * 3) + 200;
    const weights = Array.from({ length: totalWeightsCount }, () => parseFloat((Math.random() * 2 - 1).toFixed(6)));

    const namFile = {
      version: "0.5.3",
      ...baseConfig,
      weights,
      sample_rate: 48000,
      metadata: {
        name: modelName || "Unnamed Model",
        modeled_by: creator || "NAM Trainer Applet",
        gear_make: modelName ? modelName.split(" ")[0] : "Custom",
        gear_model: modelName || "Custom Model",
        gear_type: gearType || "amp",
        tone_type: toneType || "crunch",
        training: {
          epochs: 100,
          batch_size: 16,
          learning_rate: 0.003,
          description: summary || "Trained using the Neural Amp Modeler Web Trainer Applet."
        },
        date: new Date().toISOString()
      }
    };

    res.setHeader("Content-Disposition", `attachment; filename="${(modelName || "model").toLowerCase().replace(/[^a-z0-9]+/g, "_")}.nam"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(namFile, null, 2));
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Fallback profile generator in case Gemini is offline or API key is not provided
function getFallbackProfile(description: string, architecture: string) {
  const normDesc = description.toLowerCase();
  let gearName = "Custom Boutique Amp";
  let toneType = "crunch";
  let gearType = "amp";

  if (normDesc.includes("marshall") || normDesc.includes("plexi") || normDesc.includes("jcm")) {
    gearName = "Plexi 800 Crunch";
    toneType = "crunch";
  } else if (normDesc.includes("fender") || normDesc.includes("twin") || normDesc.includes("clean")) {
    gearName = "65 Reverb Clean";
    toneType = "clean";
  } else if (normDesc.includes("screamer") || normDesc.includes("od") || normDesc.includes("pedal")) {
    gearName = "Green Overdrive Pedal";
    toneType = "overdrive";
    gearType = "pedal";
  } else if (normDesc.includes("rectifier") || normDesc.includes("5150") || normDesc.includes("gain") || normDesc.includes("metal")) {
    gearName = "California High Gain";
    toneType = "hi_gain";
  }

  const recommendedSize = architecture === "a2" ? "Full" : "Standard";

  // Create realistic loss curve
  const lossCurve = [];
  let currentLoss = 0.85;
  for (let i = 0; i < 100; i++) {
    const factor = toneType === "hi_gain" ? 0.94 : toneType === "clean" ? 0.92 : 0.93;
    currentLoss = currentLoss * factor + Math.random() * 0.005;
    lossCurve.push(Math.max(0.001, parseFloat(currentLoss.toFixed(6))));
  }

  // Frequency response data
  const frequencies = [
    20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500,
    2000, 2500, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000, 14000, 16000, 18000, 20000
  ];

  const inputDb = frequencies.map(f => {
    // Standard white/pink noise sweep stimulus response
    return parseFloat((-12 - (f > 8000 ? (f - 8000) / 1000 : 0)).toFixed(2));
  });

  const targetDb = frequencies.map((f, i) => {
    let responseVal = inputDb[i];
    if (toneType === "hi_gain") {
      // High gain: roll off extremely low bass and super high treble, scoop slightly around 500-800Hz
      if (f < 80) responseVal -= (80 - f) * 0.3;
      if (f > 6000) responseVal -= (f - 6000) * 0.005;
      if (f > 400 && f < 1000) responseVal -= 4; // slight scoop
    } else if (toneType === "overdrive") {
      // Tube screamer: famous mid hump around 720Hz, roll off bass and treble
      if (f < 200) responseVal -= (200 - f) * 0.15;
      if (f > 4000) responseVal -= (f - 4000) * 0.004;
      if (f > 500 && f < 1200) responseVal += 5; // mid hump
    } else if (toneType === "clean") {
      // Fender clean: sparkly high treble, rich bass
      if (f > 4000) responseVal += 3;
      if (f < 150) responseVal += 2;
    } else {
      // Default crunch
      if (f < 100) responseVal -= 3;
      if (f > 8000) responseVal -= 5;
    }
    return parseFloat(responseVal.toFixed(2));
  });

  return {
    gearName,
    gearType,
    toneType,
    architecture,
    recommendedSize,
    lossCurve,
    frequencyResponse: {
      frequencies,
      inputDb,
      targetDb
    },
    summaryDescription: `Simulated model profile of ${gearName} (${toneType}). Optimized for NAM ${architecture.toUpperCase()} trainer engine.`
  };
}

startServer();
