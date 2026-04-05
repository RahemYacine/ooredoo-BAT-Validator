import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useFlow } from "@/components/FlowContext";
import { Camera, X, RefreshCcw, Sun, Activity, Aperture } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type QualityLevel = "good" | "warn" | "bad" | "unknown";

interface QualityState {
  luminosity: QualityLevel;
  stability: QualityLevel;
  calibration: QualityLevel;
  luminosityValue: number; // 0-255
}

export default function Capture() {
  const [, setLocation] = useLocation();
  const { setImageData } = useFlow();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const qualityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [quality, setQuality] = useState<QualityState>({
    luminosity: "unknown",
    stability: "unknown",
    calibration: "unknown",
    luminosityValue: 0,
  });
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasPermission(false);
    }
  };

  // Real-time quality analysis — runs every 400ms on a tiny 64×64 canvas for performance
  const analyzeQuality = useCallback(() => {
    const video = videoRef.current;
    const qCanvas = qualityCanvasRef.current;
    if (!video || !qCanvas || video.readyState < 2) return;

    const SIZE = 64;
    qCanvas.width = SIZE;
    qCanvas.height = SIZE;
    const ctx = qCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE);
    const pixels = data.data;

    // ── Luminosity: average brightness across all pixels
    let totalLum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      totalLum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    }
    const avgLum = totalLum / (pixels.length / 4);
    let lumLevel: QualityLevel =
      avgLum > 60 && avgLum < 210 ? "good" : avgLum > 30 && avgLum < 230 ? "warn" : "bad";

    // ── Stability: compare to previous frame (mean absolute difference)
    let stabLevel: QualityLevel = "unknown";
    const prev = prevFrameRef.current;
    if (prev) {
      let diffSum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        diffSum += Math.abs(pixels[i] - prev.data[i]);
        diffSum += Math.abs(pixels[i + 1] - prev.data[i + 1]);
        diffSum += Math.abs(pixels[i + 2] - prev.data[i + 2]);
      }
      const meanDiff = diffSum / (pixels.length / 4) / 3;
      stabLevel = meanDiff < 8 ? "good" : meanDiff < 20 ? "warn" : "bad";
    } else {
      stabLevel = "warn";
    }
    prevFrameRef.current = data;

    // ── Calibration zone check: look for bright neutral pixels in bottom-center strip
    // (simulating the white-sheet zone at y=65%-77%, x=20%-80% in the real image)
    // On our 64×64 sample, that's roughly y=42-49, x=13-51
    const wzY1 = Math.round(SIZE * 0.65), wzY2 = Math.round(SIZE * 0.77);
    const wzX1 = Math.round(SIZE * 0.20), wzX2 = Math.round(SIZE * 0.80);
    let whiteCount = 0, wzTotal = 0;
    for (let y = wzY1; y < wzY2; y++) {
      for (let x = wzX1; x < wzX2; x++) {
        const idx = (y * SIZE + x) * 4;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        const neutrality = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        if (brightness > 130 && neutrality < 45) whiteCount++;
        wzTotal++;
      }
    }
    const whiteRatio = wzTotal > 0 ? whiteCount / wzTotal : 0;
    const calLevel: QualityLevel = whiteRatio > 0.5 ? "good" : whiteRatio > 0.2 ? "warn" : "bad";

    setQuality({ luminosity: lumLevel, stability: stabLevel, calibration: calLevel, luminosityValue: avgLum });
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    };
  }, []);

  // Start quality analysis loop once camera is active
  useEffect(() => {
    if (cameraActive) {
      qualityIntervalRef.current = setInterval(analyzeQuality, 400);
    }
    return () => {
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    };
  }, [cameraActive, analyzeQuality]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.85);
      setImageData(base64Image);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setLocation("/analyze"), 150);
    }
  };

  const qualityColor = (level: QualityLevel) => {
    switch (level) {
      case "good": return "text-green-400 border-green-400/40 bg-green-400/10";
      case "warn": return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
      case "bad":  return "text-red-400 border-red-400/40 bg-red-400/10";
      default:     return "text-white/40 border-white/10 bg-white/5";
    }
  };

  const qualityDot = (level: QualityLevel) => {
    switch (level) {
      case "good": return "bg-green-400";
      case "warn": return "bg-yellow-400";
      case "bad":  return "bg-red-500";
      default:     return "bg-white/30";
    }
  };

  const overallReady = quality.luminosity === "good" && quality.stability !== "bad" && quality.calibration !== "unknown";

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full z-20 flex justify-between items-center p-6 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => setLocation("/home")}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-white text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${overallReady ? "bg-primary animate-pulse" : "bg-yellow-400"}`} />
          {overallReady ? "Prêt" : "Ajustez le cadrage"}
        </div>
        <div className="w-10" />
      </div>

      {/* Camera View */}
      <div className="relative flex-1 bg-black">
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-30 bg-black">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Accès Refusé</h3>
            <p className="text-gray-400 mb-6">
              Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.
            </p>
            <button onClick={startCamera} className="px-6 py-3 bg-white text-black font-bold rounded-xl active:scale-95">
              Réessayer
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlay={() => setCameraActive(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraActive ? "opacity-100" : "opacity-0"}`}
        />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={qualityCanvasRef} className="hidden" />

        {/* Overlay Guides */}
        {cameraActive && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <mask id="overlay-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle cx="50%" cy="40%" r="60" fill="black" />
                  <rect x="20%" y="65%" width="60%" height="12%" rx="8" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#overlay-mask)" />
            </svg>

            {/* Red target circle */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className={`w-[120px] h-[120px] rounded-full border-2 border-dashed animate-[spin_10s_linear_infinite] ${overallReady ? "border-primary" : "border-yellow-400"}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${overallReady ? "bg-primary" : "bg-yellow-400"}`} />
              </div>
              <p className="absolute -top-10 text-white font-bold text-sm text-center w-48 drop-shadow-md">
                Cible Rouge Ooredoo
              </p>
            </div>

            {/* Calibration zone */}
            <div className={`absolute top-[65%] left-[20%] w-[60%] h-[12%] border-2 rounded-lg flex items-center justify-center transition-colors ${quality.calibration === "good" ? "border-green-400/70" : quality.calibration === "warn" ? "border-yellow-400/70" : "border-white/40"}`}>
              <p className="text-white/80 font-medium text-xs text-center px-4">
                {quality.calibration === "good" ? "✓ Feuille blanche détectée" : "Placez une feuille blanche ici"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quality Indicators Bar */}
      {cameraActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-[120px] left-0 right-0 z-20 flex justify-center gap-2 px-6"
        >
          {/* Luminosity */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md transition-colors ${qualityColor(quality.luminosity)}`}>
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">Luminosité</span>
            <span className={`w-1.5 h-1.5 rounded-full ${qualityDot(quality.luminosity)}`} />
          </div>

          {/* Stability */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md transition-colors ${qualityColor(quality.stability)}`}>
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Stabilité</span>
            <span className={`w-1.5 h-1.5 rounded-full ${qualityDot(quality.stability)}`} />
          </div>

          {/* Calibration */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md transition-colors ${qualityColor(quality.calibration)}`}>
            <Aperture className="w-3 h-3" />
            <span className="hidden sm:inline">Calibration</span>
            <span className={`w-1.5 h-1.5 rounded-full ${qualityDot(quality.calibration)}`} />
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="bg-black pb-10 pt-6 px-8 z-20 flex justify-between items-center">
        <div className="w-12 h-12" />

        {/* Shutter */}
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className={`relative w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-95 transition-all ${overallReady ? "border-white" : "border-white/50"}`}
        >
          <motion.div
            animate={isCapturing ? { scale: 0.8, opacity: 0.5 } : { scale: 1, opacity: 1 }}
            className={`w-16 h-16 rounded-full transition-colors ${overallReady ? "bg-white" : "bg-white/60"}`}
          />
        </button>

        <button
          onClick={startCamera}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
