"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

type FileUploadProps = {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
};

export function FileUpload({
  value,
  onChange,
  accept = ".pdf",
  maxSizeMB = 10,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (disabled) return;
    const file = files?.[0] ?? null;
    if (!file) return onChange(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File is too large. Max ${maxSizeMB}MB.`);
      return;
    }
    onChange(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-lg border border-dashed p-6 text-center transition ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-gray-50"
          : "hover:bg-muted/30 cursor-pointer"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
      <p className="text-sm text-muted-foreground">
        Drag & drop your file here
      </p>
      <div className="my-2 text-xs text-muted-foreground">or</div>
      <Button
        variant="secondary"
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Choose file
      </Button>

      {value && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Selected:</span> {value.name}
        </p>
      )}
    </div>
  );
}
