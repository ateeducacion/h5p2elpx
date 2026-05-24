import type { Messages } from "./en.ts";

export const es: Messages = {
  topbar: { language: "Idioma" },
  hero: {
    badge: "Herramienta web · 100% en tu navegador",
    titleBefore: "Convierte ",
    titleMiddle: " a ",
    titleAfter: " editable",
    ledeBefore: "Arrastra un paquete ",
    ledeMiddle: " y descarga un proyecto ",
    ledeAfter: " que podrás abrir y editar en eXeLearning. Nada sale de tu navegador."
  },
  stepper: {
    upload: "Subir .h5p",
    review: "Revisar compatibilidad",
    configure: "Configurar opciones",
    download: "Descargar .elpx"
  },
  boxes: {
    upload: "1 · Sube paquetes H5P",
    preview: "2 · Vista previa de compatibilidad",
    options: "3 · Opciones de conversión"
  },
  meta: {
    filesReadyOne: "{count} archivo listo",
    filesReadyMany: "{count} archivos listos",
    allOk: "Todos los archivos son compatibles",
    someAttention: "Hay contenido que requiere atención"
  },
  compat: {
    ok: "Compatible",
    partial: "Parcial",
    no: "No compatible"
  },
  dropzone: {
    dropBefore: "Arrastra y suelta tus archivos ",
    dropAfter: " aquí",
    or: "o",
    browse: "búscalos en tu equipo",
    hint: "Admite varios archivos · Procesado en local",
    remove: "Quitar {name}"
  },
  options: {
    layout: "Diseño",
    layoutPreserve: "Preservar — mantener la estructura del H5P",
    layoutBlocks: "Bloques — una página, un bloque por fragmento",
    layoutPages: "Páginas — una página por archivo",
    layoutHint: "Cómo se asignan los contenedores H5P a páginas de eXeLearning.",
    unsupported: "Contenido no compatible",
    unsupportedKeep: "Mantener — insertar un iDevice de aviso",
    unsupportedText: "Convertir a texto plano",
    unsupportedDrop: "Descartar silenciosamente",
    unsupportedHint: "Qué hacer cuando un tipo de H5P no tiene equivalente.",
    title: "Título del proyecto",
    titlePlaceholder: "Contenido H5P importado",
    titleHint: "Se muestra como título del paquete en eXeLearning.",
    language: "Idioma",
    languagePlaceholder: "es, en, fr, ca…",
    languageHintBefore: "Código ISO 639-1 usado en ",
    languageHintAfter: ".",
    theme: "Tema",
    themeHint: "Tema visual de eXeLearning aplicado a las páginas exportadas.",
    extras: "Extras de página",
    enableSearch: "Generar índice de búsqueda",
    enableSearchHintBefore: "Incluye ",
    enableSearchHintAfter: " para que funcione la búsqueda del sitio de eXe.",
    enableMathJax: "Activar MathJax",
    enableMathJaxHint: "Renderiza LaTeX mediante el CDN de MathJax v3.",
    includeOriginal: "Incluir el .h5p original dentro del .elpx",
    includeOriginalHint: "Útil como copia de seguridad — el paquete original viaja con el proyecto."
  },
  convertBar: {
    readyBefore: "Listo para convertir ",
    readyMiddleOne: " archivo como ",
    readyMiddleMany: " archivos como ",
    readyEmbedded: ", con el .h5p original embebido",
    readyEnd: ".",
    converting: "Convirtiendo…",
    convert: "Convertir a .elpx"
  },
  download: {
    complete: "Conversión completada",
    summaryAfter: " — tu .elpx está listo.",
    converted: "{n} convertidos",
    partial: "{n} parciales",
    unsupported: "{n} no compatibles",
    downloadBtn: "Descargar {filename}",
    reportBtn: "report.json",
    statConverted: "Convertidos",
    statPartial: "Parciales",
    statUnsupported: "No compatibles",
    statWarnings: "Avisos",
    statErrors: "Errores"
  },
  footer: {
    madeWithBefore: "Hecho con ",
    madeWithMiddle: " por ",
    licenseLink: "AGPL-3.0",
    sourceCode: "Código"
  },
  errors: {
    templateNotFound: "No se pudo cargar la plantilla de eXe: {msg}"
  },
  github: {
    cornerAria: "Ver código en GitHub"
  },
  experimental: {
    warning:
      "Aviso: esta funcionalidad está en fase experimental. Los archivos generados pueden contener errores, por lo que se recomienda revisarlos antes de utilizarlos.",
    dismiss: "Descartar aviso"
  },
  cli: {
    title: "Uso desde la terminal (CLI)",
    installInfo:
      "Para usar el comando, necesitas tener instalado Node.js o Bun. No necesitas instalar la herramienta previamente; npx la ejecutará automáticamente.",
    commandLabel: "Ejecuta el siguiente comando para realizar una conversión local:",
    copy: "Copiar",
    copied: "¡Copiado!",
    issuesLabel: "¿Tienes problemas?",
    issuesLink: "Reporta un error en GitHub"
  }
};
