'use client';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/shadcn-io/dropzone';
import { useState } from 'react';
import { Upload as UploadIcon } from 'lucide-react';

export const Upload = () => {
  const [files, setFiles] = useState<File[] | undefined>();
  const handleDrop = (files: File[]) => {
    console.log(files);
    setFiles(files);
  };

  return (
    <Dropzone
      accept={{ 'image/*': [] }}
      maxFiles={10}
      maxSize={1024 * 1024 * 10}
      minSize={1024}
      onDrop={handleDrop}
      onError={console.error}
      src={files}
      className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-md p-6 bg-white shadow-sm"
    >
      <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
      <p className="text-sm font-medium text-gray-700">Upload a file</p>
      <p className="text-xs text-gray-500">
        Drag and drop or click to upload between 1.00KB and 10.00MB.
      </p>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  );
};

export default Upload;