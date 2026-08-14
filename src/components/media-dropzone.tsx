import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function MediaDropzone({
  onFile,
  disabled,
  hint = "Images, video or audio · fingerprinted locally, never uploaded",
  label = "Drop media to fingerprint",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  hint?: string;
  label?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative overflow-hidden rounded-md border border-dashed border-border bg-card transition-colors",
        dragging && "border-primary bg-panel",
        disabled && "opacity-60",
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-field opacity-40" aria-hidden />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative flex w-full flex-col items-center gap-3 px-6 py-14 text-center"
      >
        <UploadCloud className="h-7 w-7 text-primary" aria-hidden />
        <span className="font-mono text-sm uppercase tracking-[0.16em]">{label}</span>
        <span className="max-w-sm text-xs text-muted-foreground">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/*,video/*,audio/*"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
