import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  codeBlockPlugin,
  codeMirrorPlugin,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor"
import type { Translation } from "@mdxeditor/editor"
import "@mdxeditor/editor/style.css"

const editorTranslations: Record<string, string> = {
  "toolbar.blockTypes.paragraph": "Párrafo",
  "toolbar.blockTypes.quote": "Cita",
  "toolbar.blockTypeSelect.placeholder": "Estilo",
  "toolbar.blockTypeSelect.selectBlockTypeTooltip": "Seleccionar estilo de texto",
  "uploadImage.dialogTitle": "Insertar imagen",
  "uploadImage.dialogDescription":
    "Inserta una imagen desde una URL o súbela desde tu dispositivo.",
  "uploadImage.dialogDescriptionNoUpload": "Inserta una imagen desde una URL.",
  "uploadImage.uploadInstructions": "Sube una imagen desde tu dispositivo:",
  "uploadImage.addViaUrlInstructions": "O añade una imagen desde una URL:",
  "uploadImage.addViaUrlInstructionsNoUpload": "Añade una imagen desde una URL:",
  "uploadImage.autoCompletePlaceholder": "Selecciona o pega la URL de la imagen",
  "uploadImage.alt": "Texto alternativo:",
  "uploadImage.title": "Título:",
  "uploadImage.width": "Ancho:",
  "uploadImage.height": "Alto:",
  "uploadImage.uploading": "Subiendo imagen…",
  "uploadImage.uploadError": "No se pudo subir la imagen. Inténtalo de nuevo.",
  "dialogControls.save": "Guardar",
  "dialogControls.cancel": "Cancelar",
}

const translateEditor: Translation = (key, defaultValue, interpolations) => {
  if (key === "toolbar.blockTypes.heading") {
    return `Título ${interpolations?.level ?? ""}`.trim()
  }

  return editorTranslations[key] ?? defaultValue
}

export type MdxEditorProps = {
  markdown: string
  onChange: (markdown: string, initialMarkdownNormalize: boolean) => void
  onUploadImage?: (file: File) => Promise<string>
  readOnly?: boolean
}

export function MdxEditor({ markdown, onChange, onUploadImage, readOnly }: MdxEditorProps) {
  return (
    <MDXEditor
      markdown={markdown}
      onChange={onChange}
      readOnly={readOnly}
      placeholder="Escribe el contenido del artículo en markdown…"
      className="blog-editor dark-theme dark-editor"
      contentEditableClassName="blog-editor-content"
      translation={translateEditor}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({ imageUploadHandler: onUploadImage ?? null }),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            text: "Texto",
            bash: "Bash",
            css: "CSS",
            html: "HTML",
            js: "JavaScript",
            jsx: "JSX",
            json: "JSON",
            md: "Markdown",
            sql: "SQL",
            ts: "TypeScript",
            tsx: "TSX",
          },
        }),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
              <Separator />
              <CodeToggle />
              <InsertCodeBlock />
            </>
          ),
        }),
      ]}
    />
  )
}
