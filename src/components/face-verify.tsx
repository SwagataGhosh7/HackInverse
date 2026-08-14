import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, Check, X, Loader2, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODEL_URL = "/models";

type VerifyState =
  | "idle"
  | "loading-models"
  | "camera"
  | "detecting"
  | "captured"
  | "matching"
  | "matched"
  | "no-match"
  | "no-face"
  | "error";

interface FaceVerifyProps {
  /** Base64 face descriptor from a previous registration (JSON-stringified Float32Array) */
  referenceDescriptor?: string | null;
  /** Called when verification is complete with the captured snapshot + descriptor */
  onVerified: (result: { snapshot: string; descriptor: string; matchScore: number | null }) => void;
  onSkip: () => void;
}

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export function FaceVerify({ referenceDescriptor, onVerified, onSkip }: FaceVerifyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<VerifyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setState("loading-models");
    setError(null);
    try {
      await loadModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("camera");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access denied.");
      setState("error");
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setState("detecting");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const snap = canvas.toDataURL("image/jpeg", 0.85);
    setSnapshot(snap);

    try {
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setState("no-face");
        return;
      }

      const descriptorStr = JSON.stringify(Array.from(detection.descriptor));

      if (referenceDescriptor) {
        setState("matching");
        const refArray = new Float32Array(JSON.parse(referenceDescriptor) as number[]);
        const distance = faceapi.euclideanDistance(detection.descriptor, refArray);
        // distance < 0.5 = same person, 0.5-0.6 = uncertain, > 0.6 = different
        const score = Math.round(Math.max(0, Math.min(100, (1 - distance / 0.8) * 100)));
        setMatchScore(score);

        if (distance < 0.55) {
          stopCamera();
          setState("matched");
          onVerified({ snapshot: snap, descriptor: descriptorStr, matchScore: score });
        } else {
          setState("no-match");
        }
      } else {
        // First registration — just capture and store descriptor
        stopCamera();
        setState("captured");
        onVerified({ snapshot: snap, descriptor: descriptorStr, matchScore: null });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face detection failed.");
      setState("error");
    }
  }

  function retry() {
    setSnapshot(null);
    setMatchScore(null);
    setError(null);
    setState("camera");
  }

  const isFirstRegistration = !referenceDescriptor;

  return (
    <div className="space-y-4">
      {/* Idle state */}
      {state === "idle" && (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-mono text-sm uppercase tracking-[0.14em]">Face Verification</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {isFirstRegistration
                ? "Capture your face to attach biometric proof-of-presence to this registration."
                : "Verify your identity matches the registered media owner."}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={startCamera} size="sm">
              <Camera className="h-4 w-4" /> Open camera
            </Button>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {/* Loading models */}
      {state === "loading-models" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading face detection models…
        </div>
      )}

      {/* Camera + detect states */}
      {(state === "camera" || state === "detecting") && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            {/* Mirror video */}
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full [transform:scaleX(-1)]"
              style={{ maxHeight: 300 }}
            />
            {/* Overlay face guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-40 w-32 rounded-full border-2 border-primary/60 opacity-60" />
            </div>
            {state === "detecting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            <Button onClick={capture} disabled={state === "detecting"} className="flex-1">
              {state === "detecting" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Detecting…</>
              ) : (
                <><Camera className="h-4 w-4" /> Capture</>
              )}
            </Button>
            <Button variant="ghost" onClick={() => { stopCamera(); setState("idle"); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* No face detected */}
      {state === "no-face" && (
        <div className="space-y-3">
          {snapshot && (
            <img src={snapshot} alt="Captured" className="w-full rounded-lg border border-border [transform:scaleX(-1)]" style={{ maxHeight: 200, objectFit: "cover" }} />
          )}
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <p className="text-xs text-warning">No face detected. Ensure your face is clearly visible, well-lit, and centred.</p>
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={retry}><RefreshCw className="h-4 w-4" /> Try again</Button>
            <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </div>
      )}

      {/* Matching state */}
      {state === "matching" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Comparing face descriptors…
        </div>
      )}

      {/* No match */}
      {state === "no-match" && (
        <div className="space-y-3">
          {snapshot && (
            <img src={snapshot} alt="Captured" className="w-full rounded-lg border border-destructive/30 [transform:scaleX(-1)]" style={{ maxHeight: 200, objectFit: "cover" }} />
          )}
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <X className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <div>
              <p className="text-xs font-medium text-destructive">Face does not match</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Match score: {matchScore ?? "—"}%. The captured face doesn't match the registered owner.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={retry}><RefreshCw className="h-4 w-4" /> Try again</Button>
            <Button variant="ghost" size="sm" onClick={onSkip}>Skip verification</Button>
          </div>
        </div>
      )}

      {/* First-time capture confirmed */}
      {state === "captured" && (
        <div className="space-y-3">
          {snapshot && (
            <img src={snapshot} alt="Captured" className="w-full rounded-lg border border-primary/30 [transform:scaleX(-1)]" style={{ maxHeight: 200, objectFit: "cover" }} />
          )}
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="text-xs text-primary">Face captured and stored as biometric reference for this registration.</p>
          </div>
        </div>
      )}

      {/* Matched */}
      {state === "matched" && (
        <div className="space-y-3">
          {snapshot && (
            <img src={snapshot} alt="Verified" className="w-full rounded-lg border border-primary/30 [transform:scaleX(-1)]" style={{ maxHeight: 200, objectFit: "cover" }} />
          )}
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="text-xs font-medium text-primary">Identity verified</p>
              <p className="text-xs text-muted-foreground mt-0.5">Match score: {matchScore}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={() => setState("idle")}><RefreshCw className="h-4 w-4" /> Retry</Button>
            <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </div>
      )}
    </div>
  );
}
