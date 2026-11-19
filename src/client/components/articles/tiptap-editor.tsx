import type { Editor, JSONContent } from "@tiptap/core"
import { CharacterCount } from "@tiptap/extension-character-count"
import { Placeholder } from "@tiptap/extension-placeholder"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { articleExtensions } from "@shared/richtext"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { countWords } from "../../lib/text"
import { FONT_FAMILIES, FONT_SIZES, HIGHLIGHT_COLORS, TEXT_COLORS } from "../../lib/editor-options"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

type TiptapEditorProps = {
  initialJson: string | null
  initialHtml: string
  onChange: (bodyJson: string) => void
  onUploadImage: (file: File) => Promise<string>
}

function initialContent(initialJson: string | null, initialHtml: string): JSONContent | string {
  if (initialJson) {
    try {
      const parsed = JSON.parse(initialJson) as JSONContent

      if (parsed?.type === "doc") {
        return parsed
      }
    } catch {
      // Se usa el HTML de respaldo.
    }
  }

  return initialHtml || "<p></p>"
}

function normalizeUrl(value: string): string {
  const url = value.trim()

  if (!url) {
    return ""
  }

  if (/^(https?:|mailto:|tel:)/i.test(url) || url.startsWith("/") || url.startsWith("#")) {
    return url
  }

  return `https://${url}`
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={active ? "bg-surface-2 text-ink" : "text-muted-foreground hover:text-ink"}
    >
      {children}
    </Button>
  )
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" />
}

export function TiptapEditor({
  initialJson,
  initialHtml,
  onChange,
  onUploadImage,
}: TiptapEditorProps) {
  const onChangeRef = useRef(onChange)
  const onUploadImageRef = useRef(onUploadImage)
  const editorRef = useRef<Editor | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textColorInputRef = useRef<HTMLInputElement>(null)
  const highlightInputRef = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState("")

  onChangeRef.current = onChange
  onUploadImageRef.current = onUploadImage

  async function insertImages(files: File[]) {
    const current = editorRef.current

    if (!current) {
      return
    }

    for (const file of files) {
      try {
        const url = await onUploadImageRef.current(file)
        current.chain().focus().setImage({ src: url }).run()
      } catch {
        // El toast de error lo muestra el manejador de subida.
      }
    }
  }

  function handleFiles(
    files: FileList | null | undefined,
    event: ClipboardEvent | DragEvent,
  ): boolean {
    const images = files ? Array.from(files).filter((file) => file.type.startsWith("image/")) : []

    if (images.length === 0) {
      return false
    }

    event.preventDefault()
    void insertImages(images)

    return true
  }

  const editor = useEditor({
    extensions: [
      ...articleExtensions,
      Placeholder.configure({ placeholder: "Escribe el contenido del artículo…" }),
      CharacterCount,
    ],
    content: initialContent(initialJson, initialHtml),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        role: "textbox",
        "aria-label": "Contenido del artículo",
        "aria-multiline": "true",
      },
      handlePaste: (_view, event) => handleFiles(event.clipboardData?.files, event),
      handleDrop: (_view, event) => handleFiles(event.dataTransfer?.files, event),
    },
    onCreate: ({ editor: current }) => {
      if (!initialJson && initialHtml.trim()) {
        onChangeRef.current(JSON.stringify(current.getJSON()))
      }
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(JSON.stringify(current.getJSON()))
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return null
      }

      const textStyle = current.getAttributes("textStyle") as {
        fontFamily?: string
        fontSize?: string
        color?: string
      }

      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        code: current.isActive("code"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        blockquote: current.isActive("blockquote"),
        codeBlock: current.isActive("codeBlock"),
        heading: current.isActive("heading", { level: 1 })
          ? "1"
          : current.isActive("heading", { level: 2 })
            ? "2"
            : current.isActive("heading", { level: 3 })
              ? "3"
              : "p",
        align: current.isActive({ textAlign: "center" })
          ? "center"
          : current.isActive({ textAlign: "right" })
            ? "right"
            : current.isActive({ textAlign: "justify" })
              ? "justify"
              : "left",
        fontFamily: typeof textStyle.fontFamily === "string" ? textStyle.fontFamily : "default",
        fontSize: typeof textStyle.fontSize === "string" ? textStyle.fontSize : "",
        color: typeof textStyle.color === "string" ? textStyle.color : "",
        highlight: current.isActive("highlight"),
        link: current.isActive("link"),
        words: countWords(current.getText()),
        characters: current.getText().length,
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      }
    },
  })

  const chain = () => editor?.chain().focus()
  const disabled = !editor

  function openLinkDialog() {
    const href = (editor?.getAttributes("link").href as string | undefined) ?? ""
    setLinkValue(href)
    setLinkOpen(true)
  }

  function saveLink() {
    const url = normalizeUrl(linkValue)

    if (!url) {
      chain()?.extendMarkRange("link").unsetLink().run()
    } else {
      chain()?.extendMarkRange("link").setLink({ href: url }).run()
    }

    setLinkOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-2/60 p-2">
          <ToolbarButton
            label="Deshacer"
            disabled={disabled || !state?.canUndo}
            onClick={() => chain()?.undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Rehacer"
            disabled={disabled || !state?.canRedo}
            onClick={() => chain()?.redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
          <ToolbarSeparator />

          <Select
            value={state?.heading ?? "p"}
            onValueChange={(value) => {
              if (value === "p") {
                chain()?.setParagraph().run()
              } else {
                chain()
                  ?.toggleHeading({ level: Number(value) as 1 | 2 | 3 })
                  .run()
              }
            }}
          >
            <SelectTrigger className="h-8 w-[130px]" aria-label="Tipo de bloque">
              <SelectValue placeholder="Estilo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">Párrafo</SelectItem>
              <SelectItem value="1">Título 1</SelectItem>
              <SelectItem value="2">Título 2</SelectItem>
              <SelectItem value="3">Título 3</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state?.fontFamily ?? "default"}
            onValueChange={(value) => {
              if (value === "default") {
                chain()?.unsetFontFamily().run()
              } else {
                chain()?.setFontFamily(value).run()
              }
            }}
          >
            <SelectTrigger className="h-8 w-[170px]" aria-label="Familia tipográfica">
              <SelectValue placeholder="Fuente" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: font.value === "default" ? undefined : font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state?.fontSize || "default"}
            onValueChange={(value) => {
              if (value === "default") {
                chain()?.unsetFontSize().run()
              } else {
                chain()?.setFontSize(value).run()
              }
            }}
          >
            <SelectTrigger className="h-8 w-[100px]" aria-label="Tamaño de fuente">
              <SelectValue placeholder="Tamaño" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Tamaño</SelectItem>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarSeparator />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Color del texto"
                title="Color del texto"
                className="relative text-muted-foreground hover:text-ink"
              >
                <Palette className="size-4" />
                <span
                  className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: state?.color || "#111827" }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem onSelect={() => chain()?.unsetColor().run()}>
                Automático
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-5 gap-2 p-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    className="size-7 rounded-md border border-line"
                    style={{ backgroundColor: color.value }}
                    onClick={() => chain()?.setColor(color.value).run()}
                  />
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  textColorInputRef.current?.click()
                }}
              >
                Color personalizado…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Color de resaltado"
                title="Color de resaltado"
                className="relative text-muted-foreground hover:text-ink"
              >
                <Highlighter className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem onSelect={() => chain()?.unsetHighlight().run()}>
                Sin resaltado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-3 gap-2 p-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    className="h-7 rounded-md border border-line"
                    style={{ backgroundColor: color.value }}
                    onClick={() => chain()?.toggleHighlight({ color: color.value }).run()}
                  />
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  highlightInputRef.current?.click()
                }}
              >
                Color personalizado…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarSeparator />

          <ToolbarButton
            label="Negrita"
            active={state?.bold}
            disabled={disabled}
            onClick={() => chain()?.toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Cursiva"
            active={state?.italic}
            disabled={disabled}
            onClick={() => chain()?.toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Subrayado"
            active={state?.underline}
            disabled={disabled}
            onClick={() => chain()?.toggleUnderline().run()}
          >
            <Underline className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Tachado"
            active={state?.strike}
            disabled={disabled}
            onClick={() => chain()?.toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Código en línea"
            active={state?.code}
            disabled={disabled}
            onClick={() => chain()?.toggleCode().run()}
          >
            <Code className="size-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            label="Alinear a la izquierda"
            active={state?.align === "left"}
            disabled={disabled}
            onClick={() => chain()?.setTextAlign("left").run()}
          >
            <AlignLeft className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Centrar"
            active={state?.align === "center"}
            disabled={disabled}
            onClick={() => chain()?.setTextAlign("center").run()}
          >
            <AlignCenter className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Alinear a la derecha"
            active={state?.align === "right"}
            disabled={disabled}
            onClick={() => chain()?.setTextAlign("right").run()}
          >
            <AlignRight className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Justificar"
            active={state?.align === "justify"}
            disabled={disabled}
            onClick={() => chain()?.setTextAlign("justify").run()}
          >
            <AlignJustify className="size-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            label="Lista con viñetas"
            active={state?.bulletList}
            disabled={disabled}
            onClick={() => chain()?.toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Lista numerada"
            active={state?.orderedList}
            disabled={disabled}
            onClick={() => chain()?.toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Cita"
            active={state?.blockquote}
            disabled={disabled}
            onClick={() => chain()?.toggleBlockquote().run()}
          >
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bloque de código"
            active={state?.codeBlock}
            disabled={disabled}
            onClick={() => chain()?.toggleCodeBlock().run()}
          >
            <Code2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Separador horizontal"
            disabled={disabled}
            onClick={() => chain()?.setHorizontalRule().run()}
          >
            <Minus className="size-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            label="Enlace"
            active={state?.link}
            disabled={disabled}
            onClick={openLinkDialog}
          >
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Insertar imagen"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Limpiar formato"
            disabled={disabled}
            onClick={() => chain()?.unsetAllMarks().clearNodes().run()}
          >
            <Eraser className="size-4" />
          </ToolbarButton>
        </div>

        <EditorContent editor={editor} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-xs text-muted-foreground">
          <span>
            {state?.words ?? 0} {state?.words === 1 ? "palabra" : "palabras"} ·{" "}
            {state?.characters ?? 0} caracteres
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Ctrl/Cmd + S para guardar
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[event.target.files.length - 1]

          if (file) {
            void insertImages([file])
          }

          event.target.value = ""
        }}
      />
      <input
        ref={textColorInputRef}
        type="color"
        aria-label="Color de texto personalizado"
        className="hidden"
        value={state?.color || "#111827"}
        onChange={(event) => chain()?.setColor(event.target.value).run()}
      />
      <input
        ref={highlightInputRef}
        type="color"
        aria-label="Color de resaltado personalizado"
        className="hidden"
        value="#fef08a"
        onChange={(event) => chain()?.toggleHighlight({ color: event.target.value }).run()}
      />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enlace</DialogTitle>
            <DialogDescription>
              Pega la URL. Si la dejas vacía, se quitará el enlace de la selección.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            placeholder="https://ejemplo.com"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                saveLink()
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLink}>Guardar enlace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
