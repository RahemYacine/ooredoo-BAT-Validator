import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useFlow } from "@/components/FlowContext";
import { useAnalyzeColor } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileWarning, XCircle, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { imageData, setAnalysisResult } = useFlow();
  const analyzeMutation = useAnalyzeColor();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageData) {
      setLocation("/capture");
      return;
    }

    // Full client-side processing: white balance + dominant red extraction
    const processImage = (dataUrl: string): Promise<{
      compressed: string;
      dominantRgb: { r: number; g: number; b: number } | null;
      calibrationApplied: boolean;
    }> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 800;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve({ compressed: dataUrl, dominantRgb: null, calibrationApplied: false }); return; }
          ctx.drawImage(img, 0, 0, w, h);

          // ── Step 1: Extract white reference from calibration zone (y=65%–77%, x=20%–80%)
          let whiteR = 255, whiteG = 255, whiteB = 255;
          let calibrationApplied = false;

          const wZoneX = Math.round(w * 0.20);
          const wZoneY = Math.round(h * 0.65);
          const wZoneW = Math.round(w * 0.60);
          const wZoneH = Math.round(h * 0.12);

          if (wZoneW > 10 && wZoneH > 10) {
            const wd = ctx.getImageData(wZoneX, wZoneY, wZoneW, wZoneH);
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let i = 0; i < wd.data.length; i += 4) {
              const r = wd.data[i], g = wd.data[i + 1], b = wd.data[i + 2];
              // Count pixels that look like white (bright and neutral)
              if (r > 140 && g > 140 && b > 140) {
                sumR += r; sumG += g; sumB += b; count++;
              }
            }
            if (count > 50) {
              whiteR = sumR / count;
              whiteG = sumG / count;
              whiteB = sumB / count;
              // Only calibrate if there's a meaningful cast (avoid over-correcting)
              const maxChannel = Math.max(whiteR, whiteG, whiteB);
              if (maxChannel > 0 && (Math.abs(whiteR - maxChannel) > 5 || Math.abs(whiteG - maxChannel) > 5 || Math.abs(whiteB - maxChannel) > 5)) {
                calibrationApplied = true;
              }
            }
          }

          // ── Step 2: Apply Von Kries white balance correction to full image
          if (calibrationApplied) {
            const scaleR = 255 / whiteR;
            const scaleG = 255 / whiteG;
            const scaleB = 255 / whiteB;
            const fullData = ctx.getImageData(0, 0, w, h);
            for (let i = 0; i < fullData.data.length; i += 4) {
              fullData.data[i]     = Math.min(255, Math.round(fullData.data[i]     * scaleR));
              fullData.data[i + 1] = Math.min(255, Math.round(fullData.data[i + 1] * scaleG));
              fullData.data[i + 2] = Math.min(255, Math.round(fullData.data[i + 2] * scaleB));
            }
            ctx.putImageData(fullData, 0, 0);
          }

          // ── Step 3: Extract dominant red from target circle zone (center area y=25%–55%, x=30%–70%)
          const rZoneX = Math.round(w * 0.30);
          const rZoneY = Math.round(h * 0.25);
          const rZoneW = Math.round(w * 0.40);
          const rZoneH = Math.round(h * 0.30);

          let dominantRgb: { r: number; g: number; b: number } | null = null;
          if (rZoneW > 10 && rZoneH > 10) {
            const rd = ctx.getImageData(rZoneX, rZoneY, rZoneW, rZoneH);
            // Collect reddish pixels (r dominant, significantly higher than g and b)
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let i = 0; i < rd.data.length; i += 4) {
              const r = rd.data[i], g = rd.data[i + 1], b = rd.data[i + 2];
              if (r > 80 && r > g * 1.3 && r > b * 1.3) {
                sumR += r; sumG += g; sumB += b; count++;
              }
            }
            if (count > 20) {
              dominantRgb = {
                r: Math.round(sumR / count),
                g: Math.round(sumG / count),
                b: Math.round(sumB / count),
              };
            } else {
              // Fallback: use all pixels in the zone
              count = 0; sumR = 0; sumG = 0; sumB = 0;
              for (let i = 0; i < rd.data.length; i += 4) {
                sumR += rd.data[i]; sumG += rd.data[i + 1]; sumB += rd.data[i + 2]; count++;
              }
              if (count > 0) {
                dominantRgb = { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) };
              }
            }
          }

          const compressed = canvas.toDataURL("image/jpeg", 0.75);
          resolve({ compressed, dominantRgb, calibrationApplied });
        };
        img.onerror = () => resolve({ compressed: dataUrl, dominantRgb: null, calibrationApplied: false });
        img.src = dataUrl;
      });
    };

    processImage(imageData).then(({ compressed, dominantRgb, calibrationApplied }) => {
      analyzeMutation.mutate(
        { data: { imageData: compressed, dominantRgb: dominantRgb ?? undefined, calibrationApplied, targetZone: "center" } },
        {
          onSuccess: (data) => {
            setResult(data);
            setAnalysisResult(data);
          },
          onError: (err: any) => {
            setError(err?.message || "Erreur lors de l'analyse. Veuillez réessayer.");
          }
        }
      );
    });
  }, []);

  const isAnalyzing = analyzeMutation.isPending && !result && !error;

  const getVerdictDetails = (verdict: string) => {
    switch (verdict) {
      case "conforme": 
        return { color: "bg-success", text: "text-success", bgLight: "bg-success/10", icon: CheckCircle2, label: "CONFORME" };
      case "acceptable": 
        return { color: "bg-warning", text: "text-warning", bgLight: "bg-warning/10", icon: FileWarning, label: "ACCEPTABLE" };
      default: 
        return { color: "bg-destructive", text: "text-destructive", bgLight: "bg-destructive/10", icon: XCircle, label: "NON CONFORME" };
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="bg-card px-4 py-4 flex items-center shadow-sm relative z-10">
        <button 
          onClick={() => setLocation('/capture')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary active:scale-95"
          disabled={isAnalyzing}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-center flex-1 pr-10">Analyse</h1>
      </header>

      <main className="flex-1 flex flex-col relative overflow-y-auto no-scrollbar pb-32">
        {/* Image Area with Scanning Effect */}
        <div className="relative w-full h-64 bg-black shrink-0 overflow-hidden">
          <img src={imageData!} alt="Captured" className="w-full h-full object-cover opacity-80" />
          
          {isAnalyzing && (
            <>
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              <div className="absolute w-full h-32 bg-gradient-to-b from-transparent via-primary/50 to-primary/80 animate-scanline border-b-2 border-primary shadow-[0_0_20px_rgba(238,27,36,0.8)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-white font-bold tracking-wide">Analyse en cours...</span>
                </div>
              </div>
            </>
          )}

          {/* Results Target Area Show */}
          {!isAnalyzing && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
            </motion.div>
          )}
        </div>

        {/* Error Panel */}
        {error && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
            <XCircle className="w-16 h-16 text-destructive" />
            <h2 className="text-xl font-bold text-center">Analyse échouée</h2>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <button
              onClick={() => setLocation('/capture')}
              className="mt-4 px-8 py-3 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Results Panel */}
        {!isAnalyzing && result && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 p-6 space-y-6"
          >
            {/* Verdict Badge */}
            <div className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center gap-2", getVerdictDetails(result.verdict).bgLight, getVerdictDetails(result.verdict).text, "border-current/20")}>
              {(() => {
                const Icon = getVerdictDetails(result.verdict).icon;
                return <Icon className="w-12 h-12" />;
              })()}
              <h2 className="text-2xl font-black tracking-tight">{getVerdictDetails(result.verdict).label}</h2>
              <p className="text-sm font-medium opacity-80">{result.feedback}</p>
            </div>

            {/* Delta E Score */}
            <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Écart Colorimétrique</h3>
                  <div className="text-4xl font-black mt-1">ΔE {result.deltaE.toFixed(1)}</div>
                </div>
                <div className="text-right text-xs font-medium text-muted-foreground">
                  Cible: &lt; 4.0
                </div>
              </div>
              
              {/* Delta E Visual Bar — scale: 0–12, zones: 0-4 (green), 4-8 (orange), 8-12+ (red) */}
              <div className="relative h-4 rounded-full bg-gray-100 overflow-hidden flex">
                <div className="h-full w-[33%] bg-success" />   {/* 0–4 */}
                <div className="h-full w-[34%] bg-warning" />   {/* 4–8 */}
                <div className="h-full w-[33%] bg-destructive" /> {/* 8–12+ */}
                
                {/* Marker */}
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: `${Math.min((result.deltaE / 12) * 100, 97)}%` }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute top-0 bottom-0 w-2 bg-foreground border-2 border-white rounded-full shadow-md z-10"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-2 px-1">
                <span>0</span>
                <span style={{ marginLeft: "30%" }}>4</span>
                <span style={{ marginLeft: "30%" }}>8</span>
                <span>12+</span>
              </div>
            </div>

            {/* Swatches */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-2xl shadow-sm border border-border text-center">
                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase">Couleur Mesurée</p>
                <div 
                  className="w-full aspect-square rounded-xl shadow-inner mb-3 border border-black/5" 
                  style={{ backgroundColor: result.dominantColor.hex }}
                />
                <p className="font-mono text-sm font-bold">{result.dominantColor.hex.toUpperCase()}</p>
              </div>
              
              <div className="bg-card p-4 rounded-2xl shadow-sm border border-border text-center">
                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase">Référence Ooredoo</p>
                <div 
                  className="w-full aspect-square rounded-xl shadow-inner mb-3 border border-black/5 relative overflow-hidden" 
                  style={{ backgroundColor: result.referenceColor.hex }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
                </div>
                <p className="font-mono text-sm font-bold">{result.referenceColor.hex.toUpperCase()}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-secondary p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Recommandation
              </h4>
              <p className="text-sm text-secondary-foreground leading-relaxed">
                {result.recommendation}
              </p>
            </div>

            {/* Calibration status */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold ${result.calibrationApplied ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${result.calibrationApplied ? "bg-green-500" : "bg-amber-400"}`} />
              {result.calibrationApplied
                ? "Balance des blancs appliquée — feuille blanche détectée et utilisée pour la calibration colorimétrique"
                : "Calibration non appliquée — aucune feuille blanche détectée. Pour de meilleurs résultats, placez une feuille blanche dans la zone de calibration"}
            </div>
          </motion.div>
        )}
      </main>

      {/* Action Footer */}
      {!isAnalyzing && (
        <div className="fixed bottom-0 w-full max-w-md bg-card border-t border-border p-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setLocation('/decision')}
            className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-4 rounded-xl font-bold text-lg hover:bg-foreground/90 active:scale-[0.98] transition-all"
          >
            Prendre une décision
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
