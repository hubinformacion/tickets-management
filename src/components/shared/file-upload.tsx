"use client";

import { useState, useRef } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";

import "filepond/dist/filepond.min.css";

// Registrar plugins
registerPlugin(FilePondPluginFileValidateSize, FilePondPluginFileValidateType);

interface FileUploadProps {
  uploadToken: string;
  onFilesChange?: (attachmentIds: string[]) => void;
  onUploadComplete?: () => void;
}

export function FileUpload({ uploadToken, onFilesChange, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const attachmentIdsRef = useRef<Set<string> | null>(null);
  if (!attachmentIdsRef.current) {
    attachmentIdsRef.current = new Set();
  }

  const updateParent = () => {
    onFilesChange?.(Array.from(attachmentIdsRef.current ?? []));
  };

  return (
    <div className="filepond-wrapper">
      <FilePond
        files={files}
        onupdatefiles={(fileItems) => {
          setFiles(fileItems.map((fi) => fi.file as File));
        }}
        allowMultiple={true}
        maxFileSize="5MB"
        name="file"
        credits={false}
        server={{
          process: {
            url: "/api/upload",
            method: "POST",
            ondata: (formData) => {
              formData.append("uploadToken", uploadToken);
              return formData;
            },
            onload: (response) => {
              // response es el ID del attachment (texto plano)
              const attachmentId = response as string;
              attachmentIdsRef.current?.add(attachmentId);
              updateParent();
              return attachmentId;
            },
          },
          revert: {
            url: "/api/upload",
            method: "DELETE",
          },
        }}
        onremovefile={(_error, file) => {
          if (file.serverId) {
            attachmentIdsRef.current?.delete(file.serverId);
            updateParent();
          }
        }}
        labelIdle='<div class="text-[11px]">Arrastra archivos aquí o <span class="filepond--label-action">selecciona</span></div>'
        labelFileProcessing="Subiendo..."
        labelFileProcessingComplete="Listo"
        labelFileProcessingAborted="Subida cancelada"
        labelFileProcessingError="Error al subir"
        labelTapToCancel="Toca para cancelar"
        labelTapToRetry="Toca para reintentar"
        labelTapToUndo="Toca para deshacer"
        labelFileLoadError="Error al cargar"
        labelFileSizeNotAvailable="Tamaño no disponible"
        labelFileWaitingForSize="Calculando tamaño..."
        labelMaxFileSizeExceeded="El archivo excede el tamaño máximo"
        labelMaxFileSize="El tamaño máximo es {filesize}"
        labelFileTypeNotAllowed="Tipo de archivo no permitido"
        fileValidateTypeLabelExpectedTypes="Se esperan {allButLastType} o {lastType}"
        onprocessfiles={() => {
          onUploadComplete?.();
        }}
      />
    </div>
  );
}
