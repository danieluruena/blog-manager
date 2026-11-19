import { zodResolver } from "@hookform/resolvers/zod"
import { articleStatusValues, type ArticleStatus } from "@shared/constants"
import type { ArticleDto, BlogDto } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, EyeOff, Loader2, Save, Send, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useBlocker, useNavigate } from "react-router"
import { toast } from "sonner"

import { api, ApiError } from "../../lib/api"
import {
  articleFormSchema,
  isVisibleStatus,
  toFormValues,
  toInput,
  type ArticleFormValues,
} from "../../lib/article-form"
import { nowDateTimeLocal } from "../../lib/datetime"
import { formatDateTime, formatImageSize } from "../../lib/format"
import { optimizeImage } from "../../lib/image-optimization"
import { extractBlobImageUrls, replaceBlobImageUrls } from "../../lib/pending-images"
import { PageHeader } from "../layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { ArticlePreview } from "./article-preview"
import { CoverImageField } from "./cover-image-field"
import { DeleteArticleDialog } from "./delete-article-dialog"
import { RichTextEditor } from "./rich-text-editor"

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  featured: "Destacado",
}

const statusDescriptions: Record<ArticleStatus, string> = {
  draft: "Solo visible en el panel. No aparece en la API pública.",
  published: "Visible en la API pública del blog.",
  hidden: "Oculto en la API pública, pero conserva su fecha de publicación.",
  featured: "Visible en la API pública y marcado como destacado.",
}

type SavePayload = {
  values: ArticleFormValues
  status: ArticleStatus
}

export function ArticleForm({
  blog,
  article,
  defaultAuthor,
}: {
  blog: BlogDto
  article?: ArticleDto
  defaultAuthor: string
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const skipBlockRef = useRef<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const pendingImagesRef = useRef(new Map<string, File>())
  const uploadedImagesRef = useRef(new Map<string, string>())
  const backTo = `/blogs/${blog.id}/articles`

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: toFormValues(article, defaultAuthor),
  })

  const status = useWatch({ control: form.control, name: "status" })
  const title = useWatch({ control: form.control, name: "title" })
  const excerpt = useWatch({ control: form.control, name: "excerpt" })
  const coverImage = useWatch({ control: form.control, name: "coverImage" })
  const isDirty = form.formState.isDirty

  const mutation = useMutation({
    mutationFn: ({ values, status: nextStatus }: SavePayload) => {
      const input = toInput(values, nextStatus)

      return article
        ? api.updateArticle(blog.id, article.id, input)
        : api.createArticle(blog.id, input)
    },
    onSuccess: (response, variables) => {
      const saved = response.data

      queryClient.setQueryData(["article", blog.id, saved.id], response)
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["blog", blog.id] })

      toast.success(
        isVisibleStatus(variables.status)
          ? "Artículo publicado"
          : article
            ? "Artículo actualizado"
            : "Artículo creado",
      )

      form.reset(toFormValues(saved, defaultAuthor))

      if (!article) {
        const target = `/blogs/${blog.id}/articles/${saved.id}`
        skipBlockRef.current = target
        navigate(target, { replace: true })
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "SLUG_DUPLICADO") {
        form.setError("slug", { type: "server", message: error.message })
      }
    },
  })

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      nextLocation.pathname !== skipBlockRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!isDirty) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const pendingImages = pendingImagesRef.current
    const uploadedImages = uploadedImagesRef.current

    return () => {
      for (const blobUrl of pendingImages.keys()) {
        URL.revokeObjectURL(blobUrl)
      }

      pendingImages.clear()
      uploadedImages.clear()
    }
  }, [])

  const onSubmit = form.handleSubmit((values) => {
    void save(values, values.status)
  })

  function submitWithStatus(nextStatus: ArticleStatus) {
    form.setValue("status", nextStatus, { shouldDirty: true, shouldValidate: true })

    void form.handleSubmit((values) => {
      void save(values, nextStatus)
    })()
  }

  async function save(values: ArticleFormValues, nextStatus: ArticleStatus) {
    try {
      const bodyBlobUrls = extractBlobImageUrls(values.bodyJson)
      const coverBlobUrl = values.coverImage?.startsWith("blob:") ? values.coverImage : null
      const blobUrls = [...new Set([...bodyBlobUrls, ...(coverBlobUrl ? [coverBlobUrl] : [])])]
      const replacements = await uploadPendingImages(blobUrls)
      const bodyJson = replaceBlobImageUrls(values.bodyJson, replacements)
      const coverImage = coverBlobUrl ? (replacements.get(coverBlobUrl) ?? null) : values.coverImage

      mutation.mutate({ values: { ...values, bodyJson, coverImage }, status: nextStatus })
    } catch {
      // uploadPendingImages ya muestra el error.
    }
  }

  function cancel() {
    navigate(backTo)
  }

  function toggleVisibility() {
    submitWithStatus(isVisibleStatus(status) ? "draft" : "published")
  }

  async function stageImage(file: File): Promise<string> {
    const toastId = toast.loading("Optimizando imagen…")

    try {
      const optimized = await optimizeImage(file)
      const blobUrl = URL.createObjectURL(optimized.file)

      pendingImagesRef.current.set(blobUrl, optimized.file)

      toast.success("Imagen optimizada a WebP", {
        id: toastId,
        description: `${formatImageSize(optimized.originalSize)} → ${formatImageSize(optimized.optimizedSize)}`,
      })

      return blobUrl
    } catch (optimizationError) {
      toast.error(
        optimizationError instanceof Error
          ? optimizationError.message
          : "No se pudo optimizar la imagen",
        { id: toastId },
      )
      throw optimizationError
    }
  }

  async function uploadPendingImages(blobUrls: string[]): Promise<Map<string, string>> {
    const replacements = new Map<string, string>()

    if (blobUrls.length === 0) {
      return replacements
    }

    setIsUploading(true)
    const toastId = toast.loading(blobUrls.length === 1 ? "Subiendo imagen…" : "Subiendo imágenes…")

    try {
      await Promise.all(
        blobUrls.map(async (blobUrl) => {
          const alreadyUploaded = uploadedImagesRef.current.get(blobUrl)

          if (alreadyUploaded) {
            replacements.set(blobUrl, alreadyUploaded)
            return
          }

          const file = pendingImagesRef.current.get(blobUrl)

          if (!file) {
            throw new Error("No se encontró una de las imágenes pendientes")
          }

          const response = await api.uploadImage(blog.id, file)

          uploadedImagesRef.current.set(blobUrl, response.data.url)
          replacements.set(blobUrl, response.data.url)
        }),
      )

      toast.success(blobUrls.length === 1 ? "Imagen subida" : "Imágenes subidas", {
        id: toastId,
      })

      return replacements
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error ? uploadError.message : "No se pudieron subir las imágenes",
        { id: toastId },
      )
      throw uploadError
    } finally {
      setIsUploading(false)
    }
  }

  const error = mutation.error instanceof ApiError ? mutation.error : null
  const visible = isVisibleStatus(status)
  const isBusy = mutation.isPending || isUploading

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-6" noValidate>
        <PageHeader
          eyebrow={blog.name}
          title={article ? "Editar artículo" : "Nuevo artículo"}
          description={
            article
              ? `Última actualización: ${formatDateTime(article.updatedAt)}`
              : `Se guardará en el blog ${blog.name}.`
          }
          actions={
            <>
              <Button type="button" variant="ghost" onClick={cancel}>
                Cancelar
              </Button>
              <Button type="button" variant="outline" onClick={toggleVisibility} disabled={isBusy}>
                {visible ? <EyeOff className="size-4" /> : <Send className="size-4" />}
                {visible ? "Despublicar" : "Publicar"}
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {article ? "Guardar" : "Crear artículo"}
              </Button>
            </>
          }
        />

        {error && error.code !== "SLUG_DUPLICADO" ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertCircle className="size-4" />
            <AlertTitle>No se pudo guardar el artículo</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="border-line bg-surface">
              <CardContent className="space-y-5 px-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Un título claro y directo"
                          className="h-12 text-lg font-medium"
                          autoFocus={!article}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portada</FormLabel>
                      <CoverImageField
                        value={field.value}
                        disabled={isBusy}
                        onChange={field.onChange}
                        onSelect={stageImage}
                      />
                      <FormDescription>
                        Se muestra junto al título en los listados y en la API pública.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción breve que se muestra en los listados."
                          className="min-h-20 resize-y"
                          maxLength={300}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="flex items-center justify-between gap-3">
                        <span>Aparece en los listados y en la API pública.</span>
                        <span className="font-mono text-[10px]">{excerpt.length}/300</span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium leading-none">Vista previa en el listado</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Así se verá la miniatura del artículo en las dos configuraciones más comunes.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Portada a la izquierda
                      </p>
                      <ArticlePreview
                        variant="horizontal"
                        title={title}
                        description={excerpt}
                        coverImage={coverImage ?? null}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Portada arriba
                      </p>
                      <ArticlePreview
                        variant="vertical"
                        title={title}
                        description={excerpt}
                        coverImage={coverImage ?? null}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-line bg-surface">
              <CardContent className="px-5">
                <FormField
                  control={form.control}
                  name="bodyJson"
                  render={({ field }) => (
                    <FormItem>
                      <RichTextEditor
                        initialJson={article?.bodyJson ?? null}
                        initialHtml={article?.body ?? ""}
                        onChange={field.onChange}
                        onUploadImage={stageImage}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Card className="border-line bg-surface">
              <CardHeader className="px-5">
                <CardTitle className="text-base">Publicación</CardTitle>
                <CardDescription>Estado, autor y fecha de publicación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {articleStatusValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {statusLabels[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>{statusDescriptions[field.value]}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Autor</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del autor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de publicación</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="datetime-local" className="min-w-0 flex-1" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(nowDateTimeLocal())}
                        >
                          Ahora
                        </Button>
                      </div>
                      <FormDescription>
                        Si publicas sin fecha, se usará la fecha actual.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="generado-desde-el-titulo"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {article
                          ? "Identificador de la URL. Cámbialo solo si es necesario."
                          : "Si lo dejas vacío, se genera desde el título."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-line bg-surface">
              <CardHeader className="px-5">
                <CardTitle className="text-base">Detalles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Blog</span>
                  <span className="truncate text-ink">{blog.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Creado</span>
                  <span className="text-ink">
                    {article ? formatDateTime(article.createdAt) : "Al guardar"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Actualizado</span>
                  <span className="text-ink">
                    {article ? formatDateTime(article.updatedAt) : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {article ? (
              <Card className="border-danger/20 bg-surface">
                <CardContent className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">Eliminar artículo</p>
                    <p className="text-xs text-muted-foreground">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {isUploading ? (
              <span className="inline-flex items-center gap-2 text-brand">
                <Loader2 className="size-3.5 animate-spin" />
                Subiendo imágenes…
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-2 text-warning">
                <span className="size-1.5 rounded-full bg-warning" />
                Tienes cambios sin guardar.
              </span>
            ) : article ? (
              `Guardado por última vez el ${formatDateTime(article.updatedAt)}.`
            ) : (
              "El artículo todavía no se ha guardado."
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {article ? "Guardar cambios" : "Crear artículo"}
            </Button>
          </div>
        </div>
      </form>

      {article ? (
        <DeleteArticleDialog
          blogId={blog.id}
          article={article}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => {
            skipBlockRef.current = backTo
            navigate(backTo, { replace: true })
          }}
        />
      ) : null}

      {blocker.state === "blocked" ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              blocker.reset()
            }
          }}
        >
          <DialogContent className="border-line bg-surface sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cambios sin guardar</DialogTitle>
              <DialogDescription>
                Si sales ahora, perderás los cambios que has hecho en este artículo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => blocker.reset()}>
                Seguir editando
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Descartar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </Form>
  )
}
