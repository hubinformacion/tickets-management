// Configuración de campos dinámicos por subcategoría de Fondo Editorial
// Cada subcategoría define qué campos extra muestra en el formulario

export interface FedFieldConfig {
  requestType?: {
    label: string;
    options: { value: string; label: string }[];
  };
  quantity?: {
    label: string;
    required: boolean;
  };
  documentLink?: {
    label: string;
    placeholder: string;
    required: boolean;
  };
  numberOfPages?: {
    label: string;
    required: boolean;
  };
  descriptionHint?: string;
  maxWords?: number;
  allowAttachments?: boolean;
}

// Opciones de "Tipo de solicitud" reutilizables
const REQUEST_TYPE_DESIGN = {
  label: "Tipo de solicitud",
  options: [
    { value: "nuevo", label: "Nuevo" },
    { value: "correcciones", label: "Correcciones" },
  ],
};

const REQUEST_TYPE_DIAGRAMACION = {
  label: "Tipo de solicitud",
  options: [
    { value: "nuevo", label: "Nuevo" },
    { value: "introduccion_correcciones", label: "Introducción de correcciones" },
  ],
};

// Mapeo de nombre de subcategoría → campos del formulario
export const FED_SUBCATEGORY_FIELDS: Record<string, FedFieldConfig> = {
  // ─── Categoría: Diseño ───
  "Diseño de pieza gráfica": {
    requestType: REQUEST_TYPE_DESIGN,
    quantity: { label: "Cantidad de piezas", required: true },
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    maxWords: 300,
    allowAttachments: false,
  },
  "Diseño de cubierta": {
    requestType: REQUEST_TYPE_DESIGN,
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    maxWords: 300,
    allowAttachments: false,
  },
  "Portada de tesis": {
    quantity: { label: "Cantidad de tesis", required: true },
    documentLink: {
      label: "Link de la carpeta compartida de documentos",
      placeholder: "https://drive.google.com/...",
      required: true,
    },
    descriptionHint: "Indica el intervalo de registros en el enlace proporcionado: https://docs.google.com/spreadsheets/d/1Fvfag0eovUXJ9tiwSGsUaYjgffZBwDmsmTY82xBo0z0",
    allowAttachments: false,
  },
  "Retoque de imágenes": {
    quantity: { label: "Cantidad de imágenes", required: true },
    documentLink: {
      label: "Link de la carpeta de imágenes",
      placeholder: "https://drive.google.com/...",
      required: true,
    },
    maxWords: 300,
    allowAttachments: false,
  },

  // ─── Categoría: Diagramación ───
  "Libro": {
    requestType: REQUEST_TYPE_DIAGRAMACION,
    documentLink: { label: "Link de la carpeta", placeholder: "https://drive.google.com/...", required: true },
    maxWords: 300,
    allowAttachments: false,
  },
  "Revista": {
    requestType: REQUEST_TYPE_DIAGRAMACION,
    documentLink: { label: "Link de la carpeta", placeholder: "https://drive.google.com/...", required: true },
    maxWords: 300,
    allowAttachments: false,
  },
  "Material educativo": {
    requestType: REQUEST_TYPE_DIAGRAMACION,
    documentLink: { label: "Link de la carpeta", placeholder: "https://drive.google.com/...", required: true },
    maxWords: 300,
    allowAttachments: false,
  },

  // ─── Categoría: Corrección de textos ───
  "Corrección de proyectos editoriales": {
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    allowAttachments: true,
  },
  "Cotejo de pruebas": {
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    allowAttachments: true,
  },
  "Corrección de copys/mailing": {
    numberOfPages: { label: "Número de páginas", required: true },
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    allowAttachments: true,
  },
  "Corrección de guías": {
    numberOfPages: { label: "Número de páginas", required: true },
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    allowAttachments: true,
  },
  "Corrección de títulos de tesis": {
    quantity: { label: "Cantidad de tesis", required: true },
    documentLink: { label: "Link del documento", placeholder: "https://...", required: true },
    allowAttachments: true,
  },
};

// Instrucciones del panel lateral para Fondo Editorial
export const FED_SIDEBAR_INSTRUCTIONS = {
  general: [
    "Horario de recepción: de 8:30 a.\u00A0m. a 4:00 p.\u00A0m.",
    "Las solicitudes enviadas entre las 4:01 p.\u00A0m. y las 11:59 p.\u00A0m. se tramitarán a partir de las 8:30 a.\u00A0m. del día hábil siguiente.",
  ],
  plazos: [
    "Diseño y diagramación: plazo máximo de 3 días hábiles.",
    "Corrección de textos (1-5 págs.): 3 días hábiles.",
    "Corrección de textos (6-10 págs.): 6 días hábiles.",
  ],
} as const;

// Helper para obtener la configuración de campos de una subcategoría
export function getFedFieldConfig(subcategoryName: string): FedFieldConfig | null {
  return FED_SUBCATEGORY_FIELDS[subcategoryName] ?? null;
}
