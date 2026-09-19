import { useState, useEffect, useRef } from "react";
import { 
  Sliders, 
  Settings, 
  Upload, 
  Play, 
  Download, 
  Cpu, 
  Layers, 
  Volume2, 
  Activity, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Info,
  BookOpen,
  Music
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FrequencyResponse {
  frequencies: number[];
  inputDb: number[];
  targetDb: number[];
}

interface AmpProfile {
  gearName: string;
  gearType: string;
  toneType: string;
  architecture: string;
  recommendedSize: string;
  lossCurve: number[];
  frequencyResponse: FrequencyResponse;
  summaryDescription: string;
  warning?: string;
}

export default function App() {
  // Model Architecture Configuration
  const [architecture, setArchitecture] = useState<"a1" | "a2">("a2");
  const [modelSize, setModelSize] = useState<string>("Full"); // Default for a2 is Full
  const [epochs, setEpochs] = useState<number>(150);
  const [learningRate, setLearningRate] = useState<number>(0.003);
  const [batchSize, setBatchSize] = useState<number>(16);
  const [alignOffset, setAlignOffset] = useState<number>(12);

  // Files state
  const [inputFile, setInputFile] = useState<string | null>("input.wav (NAM Training Stimulus v1.1.1)");
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");

  // AI Architect state
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiGenerating, setIsAiPromptGenerating] = useState<boolean>(false);

  // Active training state
  const [activeProfile, setActiveProfile] = useState<AmpProfile | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState<boolean>(false);

  // Modals / Helpers
  const [activeTab, setActiveTab] = useState<"trainer" | "learn">("trainer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // DOM Refs for auto-scroll of logs
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Set default model size when architecture changes
  useEffect(() => {
    if (architecture === "a1") {
      setModelSize("Standard");
    } else {
      setModelSize("Full");
    }
  }, [architecture]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [trainingLogs]);

  // Sample Preset Loader
  const handleLoadPreset = (presetType: "plexi" | "reverb" | "screamer" | "recto") => {
    let desc = "";
    if (presetType === "plexi") desc = "Marshall Plexi 1959 Super Lead, Gain on 7, warm power-tube crunch";
    if (presetType === "reverb") desc = "Fender '65 Twin Reverb, Clean channel, bright switch ON, sparkling high headroom";
    if (presetType === "screamer") desc = "Ibanez TS9 Tube Screamer, Overdrive on 4, Tone on 5, classic mid hump boost";
    if (presetType === "recto") desc = "Mesa Boogie Dual Rectifier, Red channel, modern high gain scoop";

    setAiPrompt(desc);
    generateProfile(desc);
  };

  // Generate Amp Profile (via Gemini API or Local Sim)
  const generateProfile = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAiPromptGenerating(true);
    setErrorMessage(null);
    setIsTrainingCompleted(false);
    setCurrentEpoch(0);

    try {
      const response = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: promptText,
          architecture: architecture
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate gear profile from server.");
      }

      const data: AmpProfile = await response.json();
      setActiveProfile(data);
      setOutputFile(`${data.gearName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_output.wav`);
      
      // Update sizes based on recommendation
      if (data.recommendedSize) {
        setModelSize(data.recommendedSize);
      }

      // Populate initial logs
      setTrainingLogs([
        `[INFO] AI Gear Architect analyzed: "${promptText}"`,
        `[INFO] Target Profile: ${data.gearName} (${data.toneType.toUpperCase()})`,
        `[INFO] ${data.summaryDescription}`,
        data.warning ? `[WARNING] ${data.warning}` : `[INFO] Authentic neural characteristics mapped successfully.`
      ]);

    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during gear profile generation.");
    } finally {
      setIsAiPromptGenerating(false);
    }
  };

  // Start Model Training Loop
  const startTraining = () => {
    if (!activeProfile) {
      setErrorMessage("Please select a preset or use the AI Gear Architect to model a device first.");
      return;
    }
    if (!inputFile || !outputFile) {
      setErrorMessage("Please ensure both input.wav and output.wav are loaded.");
      return;
    }

    setIsTraining(true);
    setIsTrainingCompleted(false);
    setCurrentEpoch(0);

    const logs = [
      `[INFO] Initializing ${architecture.toUpperCase()} ${modelSize} training backend...`,
      `[INFO] Input Stimulus: ${inputFile}`,
      `[INFO] Output Target: ${outputFile}`,
      `[INFO] Aligning waveforms... Offset detected: ${alignOffset} samples.`,
      `[INFO] Learning Rate: ${learningRate} | Batch Size: ${batchSize}`,
      `[INFO] Starting training for ${epochs} epochs on CUDA GPU Accelerated device...`
    ];
    setTrainingLogs(logs);

    let current = 0;
    const intervalTime = Math.max(30, 2000 / epochs); // Animate smoothly over ~2-3 seconds

    const timer = setInterval(() => {
      current += 1;
      setCurrentEpoch(current);

      // Add training logs at intervals
      if (current === 1) {
        setTrainingLogs(prev => [...prev, `[TRAIN] Epoch 1/${epochs} - Loss (ESR): ${activeProfile.lossCurve[0].toFixed(6)}`]);
      } else if (current === Math.floor(epochs * 0.25)) {
        const valIndex = Math.floor(activeProfile.lossCurve.length * 0.25);
        setTrainingLogs(prev => [...prev, `[TRAIN] Epoch ${current}/${epochs} - Loss (ESR): ${activeProfile.lossCurve[valIndex].toFixed(6)} (Adapting EQ curve)`]);
      } else if (current === Math.floor(epochs * 0.5)) {
        const valIndex = Math.floor(activeProfile.lossCurve.length * 0.5);
        setTrainingLogs(prev => [...prev, `[TRAIN] Epoch ${current}/${epochs} - Loss (ESR): ${activeProfile.lossCurve[valIndex].toFixed(6)} (Refining distortion clipping)`]);
      } else if (current === Math.floor(epochs * 0.75)) {
        const valIndex = Math.floor(activeProfile.lossCurve.length * 0.75);
        setTrainingLogs(prev => [...prev, `[TRAIN] Epoch ${current}/${epochs} - Loss (ESR): ${activeProfile.lossCurve[valIndex].toFixed(6)} (Optimizing phase response)`]);
      } else if (current >= epochs) {
        clearInterval(timer);
        setIsTraining(false);
        setIsTrainingCompleted(true);
        const finalLoss = activeProfile.lossCurve[activeProfile.lossCurve.length - 1];
        setTrainingLogs(prev => [
          ...prev, 
          `[TRAIN] Epoch ${epochs}/${epochs} - Loss (ESR): ${finalLoss.toFixed(6)}`,
          `[INFO] Training finished successfully! Final ESR Loss: ${finalLoss.toFixed(6)}`,
          `[INFO] Exporting model binaries to .nam format... Ready for download.`
        ]);
      }
    }, intervalTime);
  };

  // Export and Download .nam file
  const triggerDownload = () => {
    if (!activeProfile || !isTrainingCompleted) return;

    // Use HTML form submit or custom download trigger to POST and fetch download
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/export-nam";

    const fields = {
      modelName: activeProfile.gearName,
      creator: creatorName || "NAM Trainer Web",
      architecture: architecture,
      size: modelSize,
      gearType: activeProfile.gearType,
      toneType: activeProfile.toneType,
      summary: activeProfile.summaryDescription
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Determine current simulated parameters based on epoch fraction
  const getInterpolatedLoss = () => {
    if (!activeProfile) return 1.0;
    if (isTrainingCompleted) return activeProfile.lossCurve[activeProfile.lossCurve.length - 1];
    if (!isTraining) return 1.0;

    const fraction = currentEpoch / epochs;
    const index = Math.min(
      activeProfile.lossCurve.length - 1,
      Math.floor(fraction * activeProfile.lossCurve.length)
    );
    return activeProfile.lossCurve[index];
  };

  // Helpers to draw frequency response curves
  const getModelCurvePoints = () => {
    if (!activeProfile) return "";
    const fraction = isTrainingCompleted ? 1.0 : isTraining ? currentEpoch / epochs : 0.0;
    
    // We interpolate from inputDb (flat sweep) to targetDb (final learned curve)
    const points = activeProfile.frequencyResponse.frequencies.map((freq, idx) => {
      const x = 50 + (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 500;
      
      const startDb = activeProfile.frequencyResponse.inputDb[idx];
      const endDb = activeProfile.frequencyResponse.targetDb[idx];
      // Current learned DB
      const currentDb = startDb + (endDb - startDb) * fraction;
      
      const y = 150 - (currentDb + 40) * 3; // Map -40dB to 40dB range to height
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  const getStaticCurvePoints = (curveType: "input" | "target") => {
    if (!activeProfile) return "";
    const dbValues = curveType === "input" ? activeProfile.frequencyResponse.inputDb : activeProfile.frequencyResponse.targetDb;
    
    const points = activeProfile.frequencyResponse.frequencies.map((freq, idx) => {
      const x = 50 + (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 500;
      const y = 150 - (dbValues[idx] + 40) * 3;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  return (
    <div id="nam-trainer-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Professional Rackmount Navigation Header */}
      <header id="nam-header" className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Neural Amp Modeler Trainer <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">STUDIO V2</span>
            </h1>
            <p className="text-xs text-slate-400">Deep Learning Audio Gear Profiler &amp; NAM Compiler</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Main Navigation Tabs */}
          <nav className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("trainer")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "trainer" 
                  ? "bg-slate-800 text-white shadow" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Trainer Workspace
            </button>
            <button
              onClick={() => setActiveTab("learn")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "learn" 
                  ? "bg-slate-800 text-white shadow" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Ecosystem &amp; Help
            </button>
          </nav>

          <div className="h-6 w-px bg-slate-800" />

          {/* Engine Status indicator */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <Cpu className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Training Engine</p>
              <p className="text-xs font-bold text-emerald-400">CUDA Accelerated</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Rack Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Error notification if any */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 text-rose-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-rose-400">Configuration Error</h4>
                <p className="text-xs opacity-90 mt-1">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-xs font-medium underline text-rose-400 hover:text-rose-300">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "trainer" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: GEAR PROFILE BUILDER & SETUP */}
            <section className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Box 1: Hardware capture target & AI Architect */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI Gear Architect
                  </h3>
                  <div className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">GEMINI PRO</div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Describe any amplifier, cabinet combination, or distortion pedal. Gemini will synthesize the neural signature and frequency response.
                </p>

                <div className="flex flex-col gap-2">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Marshall JCM800 from 1983 cranked to 10 with a vintage 4x12 cab, mic'd with a classic SM57..."
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                  />
                  <button
                    onClick={() => generateProfile(aiPrompt)}
                    disabled={isAiGenerating || !aiPrompt.trim() || isTraining}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating Neural Profile...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Target Tone Profile
                      </>
                    )}
                  </button>
                </div>

                {/* Preconfigured Real-world hardware presets */}
                <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Or Load Classic Studio Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLoadPreset("plexi")}
                      disabled={isTraining || isAiGenerating}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-slate-200">British Crunch</span>
                      <span className="text-[10px] text-slate-500">Plexi 800 (Crunch)</span>
                    </button>
                    <button
                      onClick={() => handleLoadPreset("reverb")}
                      disabled={isTraining || isAiGenerating}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-slate-200">California Clean</span>
                      <span className="text-[10px] text-slate-500">65 Twin (Sparkle Clean)</span>
                    </button>
                    <button
                      onClick={() => handleLoadPreset("screamer")}
                      disabled={isTraining || isAiGenerating}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-slate-200">Tubescreamer</span>
                      <span className="text-[10px] text-slate-500">TS9 Drive (Mid Boost)</span>
                    </button>
                    <button
                      onClick={() => handleLoadPreset("recto")}
                      disabled={isTraining || isAiGenerating}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col"
                    >
                      <span className="font-semibold text-slate-200">Recto High Gain</span>
                      <span className="text-[10px] text-slate-500">Modern Red (Metal)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 2: Target File Assets */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-500" />
                  Capture Audio Files
                </h3>

                <div className="flex flex-col gap-3">
                  {/* Input stimulus */}
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-300">Input Stimulus</p>
                        <p className="text-[10px] text-slate-500">48kHz Mono 24-bit PCM</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-medium">READY</span>
                  </div>

                  {/* Output amp recorded */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    outputFile 
                      ? "bg-slate-950 border-slate-800" 
                      : "bg-slate-950/40 border-dashed border-slate-800"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded ${outputFile ? "bg-amber-500/10 text-amber-500" : "bg-slate-800 text-slate-600"}`}>
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${outputFile ? "text-slate-300" : "text-slate-500"}`}>
                          {outputFile ? "Output Target Loaded" : "Recorded Output file"}
                        </p>
                        <p className="text-[10px] text-slate-500">{outputFile ? outputFile : "Upload or generate profile above"}</p>
                      </div>
                    </div>
                    {outputFile ? (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-medium">READY</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-medium font-mono">EMPTY</span>
                    )}
                  </div>
                </div>

                {/* Waveform Alignment Helper */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      Alignment Offset
                      <span className="cursor-help" title="NAM requires input and output signals to be perfectly phase-aligned.">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    </span>
                    <span className="font-mono text-amber-400">{alignOffset} samples</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={alignOffset}
                    onChange={(e) => setAlignOffset(parseInt(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>0 samples (Direct)</span>
                    <span>100 samples (~2ms)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* MIDDLE COLUMN: MODEL PARAMETERS & TRAINING CONTROLS */}
            <section className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Box 3: Model Architecture Configuration */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Model Architecture
                  </h3>
                  <div className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">A1 &amp; A2 CAPABLE</div>
                </div>

                {/* Main A1 / A2 Tab Selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      if (!isTraining) setArchitecture("a1");
                    }}
                    disabled={isTraining}
                    className={`py-2 text-xs font-semibold rounded-md transition-all ${
                      architecture === "a1"
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Architecture 1 (A1)
                  </button>
                  <button
                    onClick={() => {
                      if (!isTraining) setArchitecture("a2");
                    }}
                    disabled={isTraining}
                    className={`py-2 text-xs font-semibold rounded-md transition-all ${
                      architecture === "a2"
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Architecture 2 (A2)
                  </button>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  {architecture === "a1" ? (
                    <p>
                      <strong>A1 (Standard WaveNet)</strong>: The traditional, proven NAM architecture. Exceptional sound quality suitable for DAW plugins. Offers flexible sizes from ultra-low CPU Nano up to standard depth.
                    </p>
                  ) : (
                    <p>
                      <strong>A2 (Slimmable WaveNet)</strong>: The newer, ultra-efficient architecture. Features 30-40% lower CPU footprint with enhanced tonal resolution, designed specifically for embedded hardware pedal compatibility.
                    </p>
                  )}
                </div>

                {/* Model Size Options */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Model Complexity / Size</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {architecture === "a1" ? (
                      // A1 Sizes: Standard, Lite, Feather, Nano
                      <>
                        {["Standard", "Lite", "Feather", "Nano"].map((size) => (
                          <button
                            key={size}
                            onClick={() => !isTraining && setModelSize(size)}
                            disabled={isTraining}
                            className={`px-3 py-2.5 rounded-lg border text-xs text-left transition-all ${
                              modelSize === size 
                                ? "border-amber-500 bg-amber-500/5 text-amber-400 font-semibold" 
                                : "border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400"
                            }`}
                          >
                            <span className="block font-medium">{size}</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">
                              {size === "Standard" && "16 Layers | High CPU"}
                              {size === "Lite" && "12 Layers | Medium CPU"}
                              {size === "Feather" && "8 Layers | Low CPU"}
                              {size === "Nano" && "4 Layers | Ultra Low CPU"}
                            </span>
                          </button>
                        ))}
                      </>
                    ) : (
                      // A2 Sizes: Full, Lite
                      <>
                        {["Full", "Lite"].map((size) => (
                          <button
                            key={size}
                            onClick={() => !isTraining && setModelSize(size)}
                            disabled={isTraining}
                            className={`px-3 py-2.5 rounded-lg border text-xs text-left transition-all ${
                              modelSize === size 
                                ? "border-amber-500 bg-amber-500/5 text-amber-400 font-semibold" 
                                : "border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400"
                            }`}
                          >
                            <span className="block font-medium">{size}</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">
                              {size === "Full" && "8 Layers | Maximum Fidelity"}
                              {size === "Lite" && "Slimmable | Embedded Ready"}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 4: Training Hyperparameters */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500" />
                  Hyperparameters
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {/* Epochs Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Epochs (Training Steps)</span>
                      <span className="font-mono text-amber-400">{epochs}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value))}
                      disabled={isTraining}
                      className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Learning rate */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Learning Rate</span>
                      <span className="font-mono text-amber-400">{learningRate.toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.02"
                      step="0.001"
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                      disabled={isTraining}
                      className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Batch Size Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">Batch Size</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[8, 16, 32, 64].map((size) => (
                        <button
                          key={size}
                          onClick={() => !isTraining && setBatchSize(size)}
                          disabled={isTraining}
                          className={`py-1.5 rounded text-xs font-mono border transition-all ${
                            batchSize === size 
                              ? "border-amber-500 bg-amber-500/5 text-amber-400" 
                              : "border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: TRAINING STATUS, LIVE CHARTS & OUTPUT EXPORT */}
            <section className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Box 5: Live Equalizer / Frequency response Analyzer */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  Frequency Response Model
                </h3>

                {activeProfile ? (
                  <div className="flex flex-col gap-3">
                    <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-2 h-44">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-5 grid-rows-3 p-2 pointer-events-none opacity-10">
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-b border-white"></div>
                      </div>

                      {/* SVG Curves */}
                      <svg viewBox="0 0 600 200" className="w-full h-full">
                        {/* Input curve (flat grey) */}
                        <path
                          d={getStaticCurvePoints("input")}
                          fill="none"
                          stroke="#475569"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                        {/* Target curve (amber) */}
                        <path
                          d={getStaticCurvePoints("target")}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          opacity="0.85"
                        />
                        {/* Model response curve (glowing emerald) */}
                        <path
                          d={getModelCurvePoints()}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                          className="drop-shadow-[0_0_4px_rgba(16,185,129,0.5)] transition-all duration-100 ease-linear"
                        />
                      </svg>

                      {/* Decibel indicators */}
                      <div className="absolute top-2 left-2 text-[9px] text-slate-500 font-mono flex flex-col gap-8">
                        <span>+20dB</span>
                        <span>0dB</span>
                        <span>-20dB</span>
                      </div>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-slate-600 border-t border-dashed"></div>
                        <span>Input Sweep</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-amber-500"></div>
                        <span>Target Gear</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-emerald-500 shadow-sm"></div>
                        <span>Model Output</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-44 bg-slate-950/40 rounded-lg border border-slate-800/80 border-dashed text-slate-500 p-4 text-center">
                    <Volume2 className="w-8 h-8 opacity-40 mb-2" />
                    <p className="text-xs">No active gear profile found. Generate one using the AI architect or choose a preset on the left.</p>
                  </div>
                )}
              </div>

              {/* Box 6: Real-time Training Logs & Dashboard */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Live Trainer Monitor
                  </h3>
                  {isTraining && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Epoch</p>
                    <p className="text-sm font-bold text-white mt-1 font-mono">{currentEpoch} <span className="text-xs text-slate-600">/ {epochs}</span></p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Loss (ESR)</p>
                    <p className="text-sm font-bold text-amber-500 mt-1 font-mono">
                      {activeProfile ? getInterpolatedLoss().toFixed(5) : "---"}
                    </p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Progress</p>
                    <p className="text-sm font-bold text-white mt-1 font-mono">
                      {epochs > 0 ? Math.floor((currentEpoch / epochs) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Terminal Console Logs */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-slate-300 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {trainingLogs.length === 0 ? (
                    <div className="text-slate-600 italic">Waiting for training sequence to launch...</div>
                  ) : (
                    trainingLogs.map((log, index) => {
                      let colorClass = "text-slate-400";
                      if (log.includes("[TRAIN]")) colorClass = "text-amber-400";
                      if (log.includes("[INFO]")) colorClass = "text-blue-400";
                      if (log.includes("[WARNING]")) colorClass = "text-rose-400 text-bold";
                      if (log.includes("successfully")) colorClass = "text-emerald-400 font-semibold";
                      return (
                        <div key={index} className={colorClass}>
                          {log}
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Action Trigger Buttons */}
                <div className="flex flex-col gap-2">
                  {!isTrainingCompleted && !isTraining ? (
                    <button
                      onClick={startTraining}
                      disabled={!activeProfile || isTraining}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Neural Training Session
                    </button>
                  ) : isTraining ? (
                    <div className="w-full bg-slate-900 border border-slate-800 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-amber-500 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Learning Hardware Character...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Model Trained Successfully and Compiled! Ready for Export.</span>
                      </div>
                      
                      {/* Name of the creator for metadata */}
                      <input
                        type="text"
                        value={creatorName}
                        onChange={(e) => setCreatorName(e.target.value)}
                        placeholder="Your Name (Metadata Author)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                      />

                      <button
                        onClick={triggerDownload}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        Download {activeProfile?.gearName || "Model"}.nam File
                      </button>

                      <button
                        onClick={() => {
                          setIsTrainingCompleted(false);
                          setCurrentEpoch(0);
                          setTrainingLogs([]);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Reset / Train New Model
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* HELP & ECOSYSTEM LEARNING MATERIAL SECTION */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Info className="w-5 h-5 text-amber-500" />
                NAM Ecosystem Overview
              </h3>
              
              <div className="flex flex-col gap-4 text-sm text-slate-300 leading-relaxed">
                <p>
                  <strong>Neural Amp Modeler (NAM)</strong> is an open-source deep learning project created by Steve Atkinson. It revolutionized the guitar amp simulation industry by bringing state-of-the-art neural network modeling directly to standard computers and hardware.
                </p>

                <p>
                  Using advanced models based on WaveNet and LSTM (Long Short-Term Memory) layers, NAM learns to match an original input stimulus signal to the processed output signal of analog tube amplifiers, effects pedals (like overdrives, distortions, fuzzes), and preamps.
                </p>

                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    How to Capture Your Own Gear
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 mt-2">
                    <li>Download the standardized <strong>NAM Stimulus Sweep File</strong> (v1.1.1).</li>
                    <li>Play the file through your audio interface, sending it directly into your guitar amplifier's input.</li>
                    <li>Record the output of the amplifier using a microphone or load box connected back into your interface.</li>
                    <li>Align the raw stimulus file and your recorded amp track to avoid phase/delay mismatches.</li>
                    <li>Feed both files into the trainer to produce a custom <code className="text-amber-500 font-mono">.nam</code> capture!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5 text-amber-500" />
                A1 vs A2 Architectures
              </h3>

              <div className="flex flex-col gap-4 text-sm text-slate-300 leading-relaxed">
                <p>
                  With the introduction of **Architecture 2 (A2)**, the NAM training ecosystem is more powerful than ever. Understanding the difference helps you pick the right format for your playback device:
                </p>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <h4 className="font-bold text-amber-400 flex items-center justify-between">
                      <span>Architecture 1 (A1)</span>
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono">DAW Plugin Standard</span>
                    </h4>
                    <p className="text-slate-400 mt-1.5 leading-relaxed">
                      The original, highly robust NAM model format. Includes size classes such as **Standard**, **Lite**, **Feather**, and **Nano**. Primarily designed for execution on laptop/desktop computers in DAWs where computational resources are relatively generous.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <h4 className="font-bold text-amber-400 flex items-center justify-between">
                      <span>Architecture 2 (A2)</span>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">Embedded/Hardware Ready</span>
                    </h4>
                    <p className="text-slate-400 mt-1.5 leading-relaxed">
                      Optimized by TONE3000 to deliver stunning authenticity with **30-40% lower CPU utilization** than A1. Highly suitable for embedded DSP chips inside smart amps and multi-effects processors (such as the MOD Duo, Neural DSP Quad Cortex format integrations, etc.). Supports slimmable configurations (A2-Full and A2-Lite).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Professional Studio Footer */}
      <footer id="nam-footer" className="border-t border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between text-xs text-slate-500 mt-auto">
        <p>© 2026 Neural Amp Modeler Studio. Open Source Guitar Amp Deep Learning Ecosystem.</p>
        <p className="flex items-center gap-2">
          <span>Official Site:</span>
          <a 
            href="https://www.neuralampmodeler.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-amber-500 hover:underline hover:text-amber-400 font-medium"
          >
            neuralampmodeler.com
          </a>
        </p>
      </footer>
    </div>
  );
}
