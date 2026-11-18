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

const blockTypeTranslations: Record<string, string> = {
  "toolbar.blockTypes.paragraph": "Párrafo",
  "toolbar.blockTypes.quote": "Cita",
  "toolbar.blockTypeSelect.placeholder": "Estilo",
  "toolbar.blockTypeSelect.selectBlockTypeTooltip": "Seleccionar estilo de texto",
}

const translateEditor: Translation = (key, defaultValue, interpolations) => {
  if (key === "toolbar.blockTypes.heading") {
    return `Título ${interpolations?.level ?? ""}`.trim()
  }

  return blockTypeTranslations[key] ?? defaultValue
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
