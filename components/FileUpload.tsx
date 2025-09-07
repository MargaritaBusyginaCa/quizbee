"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

type FileUploadProps = {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
};

export function FileUpload({
  value,
  onChange,
  accept = ".pdf",
  maxSizeMB = 10,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
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
        handleFiles(e.dataTransfer.files);
      }}
      className="rounded-lg border border-dashed p-6 text-center hover:bg-muted/30 transition"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm text-muted-foreground">
        Drag & drop your file here
      </p>
      <div className="my-2 text-xs text-muted-foreground">or</div>
      <Button
        variant="secondary"
        type="button"
        onClick={() => inputRef.current?.click()}
        className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
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
