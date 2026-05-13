import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCcw, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCaptured: (publicUrl: string) => void;
  /** Visual overlay label (e.g. "Scansione Pikmin") */
  overlayLabel?: string;
  /** Show the radar-style scanline overlay over the live preview */
  radarOverlay?: boolean;
  /** Subfolder inside the captures bucket */
  folder?: string;
}

export function CameraCapture({
  open,
  onClose,
  onCaptured,
  overlayLabel,
  radarOverlay = false,
  folder = "misc",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // start / stop camera
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Fotocamera non disponibile su questo dispositivo.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(e?.message || "Permesso fotocamera negato.");
      }
    };
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  const reset = () => {
    setPreview(null);
    setPendingBlob(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    const w = v.videoWidth;
    const h = v.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPendingBlob(blob);
        setPreview(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.85,
    );
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingBlob(file);
    setPreview(URL.createObjectURL(file));
  };

  const upload = async () => {
    if (!pendingBlob) return;
    setBusy(true);
    try {
      const ext = pendingBlob.type.includes("png") ? "png" : "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("captures")
        .upload(path, pendingBlob, { contentType: pendingBlob.type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("captures").getPublicUrl(path);
      onCaptured(data.publicUrl);
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Upload fallito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col"
        >
          {/* header */}
          <div className="flex items-center justify-between p-4 text-primary">
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">
              {overlayLabel ?? "// Cattura"}
            </p>
            <button onClick={handleClose} className="rounded-full p-2 bg-night/60 border border-border">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* viewport */}
          <div className="relative flex-1 overflow-hidden">
            {!preview ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {radarOverlay && (
                  <>
                    <div className="pointer-events-none absolute inset-0 ring-[3px] ring-primary/40 ring-inset" />
                    <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 aspect-square rounded-full border border-primary/50 glow-ring" />
                    <motion.div
                      className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-primary/70 to-transparent shadow-[0_0_30px_var(--color-primary)]"
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <p className="absolute bottom-4 left-0 right-0 text-center text-primary text-glow text-xs animate-flicker uppercase tracking-[0.3em]">
                      Scansione attiva…
                    </p>
                  </>
                )}
                {error && (
                  <div className="absolute inset-x-4 top-4 panel-strong p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}
              </>
            ) : (
              <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-contain" />
            )}
          </div>

          {/* controls */}
          <div className="p-5 pb-8 flex items-center justify-between gap-4 bg-gradient-to-t from-black to-transparent">
            {!preview ? (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="panel p-3 text-primary"
                  aria-label="Scegli da galleria"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={snap}
                  disabled={!!error}
                  className="h-16 w-16 rounded-full bg-primary text-primary-foreground glow-ring flex items-center justify-center disabled:opacity-40"
                  aria-label="Scatta"
                >
                  <Camera className="h-7 w-7" />
                </button>
                <button
                  onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                  className="panel p-3 text-primary"
                  aria-label="Cambia camera"
                >
                  <RefreshCcw className="h-5 w-5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPickFile}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <button onClick={reset} className="panel px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" /> Rifai
                </button>
                <button
                  onClick={upload}
                  disabled={busy}
                  className="btn-neon flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {busy ? "Caricamento…" : "Conferma"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
