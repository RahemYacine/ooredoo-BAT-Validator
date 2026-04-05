import { useRoute, useLocation } from "wouter";
import { useGetReport } from "@workspace/api-client-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Share2, Download, Printer, CheckCircle2, XCircle, MessageCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Report() {
  const [, params] = useRoute("/reports/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: report, isLoading, isError } = useGetReport(id);

  if (isLoading) {
    return <div className="h-[100dvh] flex items-center justify-center text-primary animate-pulse font-bold">Chargement...</div>;
  }

  if (isError || !report) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Rapport introuvable</h2>
        <button onClick={() => setLocation('/home')} className="mt-4 text-primary font-bold">Retour à l'accueil</button>
      </div>
    );
  }

  const { analysisResult } = report;

  const handleDownload = async () => {
    if (!report) return;
    const { analysisResult } = report;
    const dateStr = format(new Date(report.createdAt), "dd MMM yyyy, HH:mm", { locale: fr });
    const verdictLabel = analysisResult.verdict === "conforme" ? "CONFORME" : analysisResult.verdict === "acceptable" ? "ACCEPTABLE" : "NON CONFORME";
    const decisionLabel = report.userDecision === "validated" ? "BAT VALIDÉ ✓" : "BAT REFUSÉ ✗";
    const ref = `REP-${report.id.toString().padStart(5, "0")}`;

    // Embed the official Ooredoo logo as base64 so it works offline
    let logoBase64 = "";
    try {
      const logoUrl = `${import.meta.env.BASE_URL}ooredoo-logo.png`;
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      // fall back silently — logo will just be absent
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapport BAT ${ref}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; background: #fff; padding: 0; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 6px solid #EE1B24; margin-bottom: 32px; }
    .header-title h1 { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .header-title p { color: #888; font-size: 13px; margin-top: 4px; }
    .brand { color: #EE1B24; font-size: 22px; font-weight: 900; letter-spacing: -1px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .meta-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #aaa; display: block; margin-bottom: 3px; }
    .meta-item p { font-weight: 700; font-size: 14px; }
    .decision-box { padding: 20px; border-radius: 10px; border: 2px solid; margin-bottom: 28px; }
    .decision-box.validated { background: #f0fdf4; border-color: #22c55e; color: #166534; }
    .decision-box.rejected { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
    .decision-label { font-size: 22px; font-weight: 900; margin-bottom: 10px; }
    .decision-comment { background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #333; font-style: italic; }
    .verdict-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 900; font-size: 14px; letter-spacing: 0.5px; }
    .verdict-conforme { background: #dcfce7; color: #166534; }
    .verdict-acceptable { background: #fef9c3; color: #854d0e; }
    .verdict-non_conforme { background: #fee2e2; color: #991b1b; }
    .delta-e { font-size: 36px; font-weight: 900; }
    .swatch-row { display: flex; gap: 16px; align-items: center; }
    .swatch { width: 48px; height: 48px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
    .swatch-info { font-size: 12px; }
    .swatch-info .hex { font-family: monospace; font-weight: 700; font-size: 14px; }
    .swatch-info .cmyk { color: #888; margin-top: 2px; }
    .feedback-box { background: #f9f9f9; border-left: 4px solid #EE1B24; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #444; margin-bottom: 12px; }
    .recommendation-box { background: #fff8f8; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #7f1d1d; line-height: 1.6; }
    .capture-img { width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; border: 1px solid #ddd; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #bbb; text-align: center; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-title">
      <h1>RAPPORT D'ANALYSE</h1>
      <p>Colorimétrie BAT — Ooredoo BAT Validator</p>
    </div>
    ${logoBase64
      ? `<img src="${logoBase64}" alt="Ooredoo" style="height:36px;width:auto;object-fit:contain;" />`
      : `<div class="brand">ooredoo</div>`}
  </div>

  <div class="section">
    <h2>Informations</h2>
    <div class="grid-2">
      <div class="meta-item"><label>Référence</label><p>${ref}</p></div>
      <div class="meta-item"><label>Date</label><p>${dateStr}</p></div>
      <div class="meta-item"><label>Support</label><p>${report.materialName}</p></div>
      ${report.agencyName ? `<div class="meta-item"><label>Agence / Imprimeur</label><p>${report.agencyName}</p></div>` : ""}
    </div>
  </div>

  <div class="decision-box ${report.userDecision === "validated" ? "validated" : "rejected"}">
    <div class="decision-label">${decisionLabel}</div>
    <div class="decision-comment">"${report.userComment}"</div>
  </div>

  <div class="section">
    <h2>Résultats Colorimétriques</h2>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:4px;">Verdict</div>
        <span class="verdict-badge verdict-${analysisResult.verdict}">${verdictLabel}</span>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:4px;">Écart Delta E</div>
        <div class="delta-e">${analysisResult.deltaE.toFixed(1)}</div>
        <div style="font-size:11px;color:#aaa;">Cible : &lt; 4.0</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:16px;">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#aaa;margin-bottom:8px;">Couleur Mesurée</div>
        <div class="swatch-row">
          <div class="swatch" style="background:${analysisResult.dominantColor.hex};"></div>
          <div class="swatch-info">
            <div class="hex">${analysisResult.dominantColor.hex}</div>
            <div class="cmyk">RGB (${analysisResult.dominantColor.rgb.r}, ${analysisResult.dominantColor.rgb.g}, ${analysisResult.dominantColor.rgb.b})</div>
            <div class="cmyk">C${analysisResult.dominantColor.cmyk.c} M${analysisResult.dominantColor.cmyk.m} Y${analysisResult.dominantColor.cmyk.y} K${analysisResult.dominantColor.cmyk.k}</div>
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#aaa;margin-bottom:8px;">Référence Officielle Ooredoo</div>
        <div class="swatch-row">
          <div class="swatch" style="background:${analysisResult.referenceColor.hex};"></div>
          <div class="swatch-info">
            <div class="hex">${analysisResult.referenceColor.hex}</div>
            <div class="cmyk">RGB (${analysisResult.referenceColor.rgb.r}, ${analysisResult.referenceColor.rgb.g}, ${analysisResult.referenceColor.rgb.b})</div>
            <div class="cmyk">C${analysisResult.referenceColor.cmyk.c} M${analysisResult.referenceColor.cmyk.m} Y${analysisResult.referenceColor.cmyk.y} K${analysisResult.referenceColor.cmyk.k}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="feedback-box">${analysisResult.feedback}</div>
    <div class="recommendation-box">⚠ Recommandation : ${analysisResult.recommendation}</div>
  </div>

  <div class="section">
    <h2>Capture Analysée</h2>
    <img class="capture-img" src="${report.imageData}" alt="Capture BAT" />
  </div>

  <div class="footer">
    Document généré par Ooredoo BAT Validator — ${dateStr} — Référence ${ref}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rapport-BAT-${ref}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getShareText = () => {
    const ref = `REP-${report!.id.toString().padStart(5, "0")}`;
    const decision = report!.userDecision === "validated" ? "VALIDÉ ✅" : "REFUSÉ ❌";
    const verdict = report!.analysisResult.verdict === "conforme" ? "Conforme ✅" : report!.analysisResult.verdict === "acceptable" ? "Acceptable ⚠️" : "Non conforme ❌";
    return `🔴 Rapport BAT Ooredoo — ${ref}\n📄 Support : ${report!.materialName}${report!.agencyName ? `\n🏢 Agence : ${report!.agencyName}` : ""}\n📊 Résultat : ${verdict} (ΔE ${report!.analysisResult.deltaE.toFixed(1)})\n✅ Décision : BAT ${decision}\n💬 "${report!.userComment}"`;
  };

  const handleShareNative = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rapport Ooredoo BAT", text, url: window.location.href });
        setShareOpen(false);
      } catch {
        /* cancelled */
      }
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText() + "\n" + window.location.href);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShareOpen(false);
  };

  const handleShareEmail = () => {
    const ref = `REP-${report!.id.toString().padStart(5, "0")}`;
    const subject = encodeURIComponent(`Rapport BAT Ooredoo — ${ref} — ${report!.materialName}`);
    const body = encodeURIComponent(getShareText() + "\n\nVoir le rapport complet : " + window.location.href);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareOpen(false);
    });
  };

  const isValidated = report.userDecision === "validated";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* Action Bar */}
      <div className="bg-card px-4 py-3 flex items-center justify-between border-b border-border sticky top-0 z-20">
        <button 
          onClick={() => setLocation('/home')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShareOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-foreground active:scale-95">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={handleDownload} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Document Header */}
        <div className="p-8 border-b-8 border-primary bg-secondary/30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-none mb-1">RAPPORT D'ANALYSE</h1>
            <p className="text-sm font-medium text-muted-foreground">Colorimétrie BAT</p>
          </div>
          <img src={`${import.meta.env.BASE_URL}ooredoo-logo.png`} alt="Ooredoo" className="h-8" />
        </div>

        <div className="p-6 space-y-8">
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-bold uppercase tracking-wider">Référence</p>
              <p className="font-bold text-foreground">REP-{report.id.toString().padStart(5, '0')}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-bold uppercase tracking-wider">Date</p>
              <p className="font-bold text-foreground capitalize">{format(new Date(report.createdAt), "dd MMM yyyy", { locale: fr })}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1 text-xs font-bold uppercase tracking-wider">Support</p>
              <p className="font-bold text-foreground text-lg">{report.materialName}</p>
            </div>
            {report.agencyName && (
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase tracking-wider">Agence / Imprimeur</p>
                <p className="font-bold text-foreground">{report.agencyName}</p>
              </div>
            )}
          </div>

          {/* Decision Box */}
          <div className={cn("rounded-2xl border-2 p-5", isValidated ? "bg-success/5 border-success" : "bg-destructive/5 border-destructive")}>
            <div className="flex items-center gap-3 mb-3">
              {isValidated ? <CheckCircle2 className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-destructive" />}
              <h2 className={cn("text-xl font-black tracking-tight", isValidated ? "text-success" : "text-destructive")}>
                BAT {isValidated ? "VALIDÉ" : "REFUSÉ"}
              </h2>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-black/5 text-sm font-medium text-foreground leading-relaxed">
              "{report.userComment}"
            </div>
          </div>

          {/* Captured Image */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Capture Analysée
            </h3>
            <div className="rounded-2xl overflow-hidden border-2 border-border shadow-sm bg-black relative">
              <img src={report.imageData} alt="Capture" className="w-full aspect-video object-cover opacity-90" />
            </div>
          </div>

          {/* Technical Results */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-foreground rounded-full" />
              Résultats Techniques
            </h3>
            
            <div className="bg-card border border-border shadow-sm rounded-2xl p-5 mb-4">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-muted-foreground uppercase tracking-wider text-sm">Écart (Delta E)</span>
                <span className="text-3xl font-black">{analysisResult.deltaE.toFixed(1)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase">Mesure</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: analysisResult.dominantColor.hex }} />
                    <div>
                      <p className="font-mono text-xs font-bold">{analysisResult.dominantColor.hex}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">C: {Math.round(analysisResult.dominantColor.cmyk.c)} M: {Math.round(analysisResult.dominantColor.cmyk.m)} Y: {Math.round(analysisResult.dominantColor.cmyk.y)} K: {Math.round(analysisResult.dominantColor.cmyk.k)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase">Cible Officielle</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: analysisResult.referenceColor.hex }} />
                    <div>
                      <p className="font-mono text-xs font-bold">{analysisResult.referenceColor.hex}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">C: {Math.round(analysisResult.referenceColor.cmyk.c)} M: {Math.round(analysisResult.referenceColor.cmyk.m)} Y: {Math.round(analysisResult.referenceColor.cmyk.y)} K: {Math.round(analysisResult.referenceColor.cmyk.k)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary p-4 rounded-xl text-sm font-medium text-secondary-foreground flex gap-3">
              <Printer className="w-5 h-5 shrink-0 text-muted-foreground" />
              <p>{analysisResult.recommendation}</p>
            </div>
          </div>

        </div>
      </main>

      {/* Share Sheet */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-lg font-black">Partager le rapport</SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground">WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Envoyer via WhatsApp</p>
              </div>
            </button>

            {/* Email */}
            <button
              onClick={handleShareEmail}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary border border-border text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">E-mail</p>
                <p className="text-xs text-muted-foreground mt-0.5">Envoyer par e-mail</p>
              </div>
            </button>

            {/* Native share (mobile) */}
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={handleShareNative}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary border border-border text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                  <Share2 className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Autres applications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Partager via une autre app</p>
                </div>
              </button>
            )}

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary border border-border text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                <XCircle className="w-6 h-6 text-muted-foreground hidden" />
                <span className="text-xl">🔗</span>
              </div>
              <div>
                <p className="font-bold text-foreground">Copier le lien</p>
                <p className="text-xs text-muted-foreground mt-0.5">Copier dans le presse-papier</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
