import { zodResolver } from "@hookform/resolvers/zod"
import { originSchema, siteUrlSchema } from "@shared/schemas"
import type { BlogDto } from "@shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { api, ApiError } from "../../lib/api"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Button } from "../ui/button"
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
import { Switch } from "../ui/switch"
import { Textarea } from "../ui/textarea"

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parseOriginsInput(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const blogFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre no puede superar los 120 caracteres"),
  slug: z
    .string()
    .trim()
    .max(80, "El slug no puede superar los 80 caracteres")
    .refine(
      (value) => value === "" || slugPattern.test(value),
      "El slug solo admite minúsculas, números y guiones",
    ),
  description: z.string().trim().max(500, "La descripción no puede superar los 500 caracteres"),
  siteUrl: siteUrlSchema,
  allowedOrigins: z.string().refine((value) => {
    return parseOriginsInput(value).every((origin) => originSchema.safeParse(origin).success)
  }, "Cada origen debe tener el formato https://ejemplo.com"),
  isActive: z.boolean(),
})

type BlogFormValues = z.infer<typeof blogFormSchema>

function toFormValues(blog?: BlogDto): BlogFormValues {
  return {
    name: blog?.name ?? "",
    slug: blog?.slug ?? "",
    description: blog?.description ?? "",
    siteUrl: blog?.siteUrl ?? "",
    allowedOrigins: blog?.allowedOrigins.join("\n") ?? "",
    isActive: blog?.isActive ?? true,
  }
}

export function BlogForm({
  blog,
  onSaved,
  onCancel,
}: {
  blog?: BlogDto
  onSaved?: (blog: BlogDto) => void
  onCancel?: () => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: toFormValues(blog),
  })

  useEffect(() => {
    form.reset(toFormValues(blog))
  }, [blog, form])

  const mutation = useMutation({
    mutationFn: (values: BlogFormValues) => {
      const input = {
        name: values.name,
        ...(values.slug ? { slug: values.slug } : {}),
        description: values.description,
        siteUrl: values.siteUrl,
        allowedOrigins: parseOriginsInput(values.allowedOrigins),
        isActive: values.isActive,
      }

      return blog ? api.updateBlog(blog.id, input) : api.createBlog(input)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })

      if (blog) {
        queryClient.invalidateQueries({ queryKey: ["blog", blog.id] })
      }

      toast.success(blog ? "Blog actualizado" : "Blog creado")
      form.reset(toFormValues(response.data))
      onSaved?.(response.data)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "SLUG_DUPLICADO") {
        form.setError("slug", { type: "server", message: error.message })
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (blog && !values.slug) {
      form.setError("slug", {
        type: "server",
        message: "El slug es obligatorio al editar un blog",
      })
      return
    }

    mutation.mutate(values)
  })

  const error = mutation.error instanceof ApiError ? mutation.error : null

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && error.code !== "SLUG_DUPLICADO" ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertCircle className="size-4" />
            <AlertTitle>No se pudo guardar el blog</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Blog de la Página A" autoFocus {...field} />
              </FormControl>
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
                <Input placeholder="pagina-a" className="font-mono text-sm" {...field} />
              </FormControl>
              <FormDescription>
                {blog
                  ? "Identificador de la URL. No lo cambies sin querer romper enlaces."
                  : "Si lo dejas vacío, se genera desde el nombre."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Noticias, guías y artículos de la página."
                  className="min-h-20 resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="siteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la página</FormLabel>
              <FormControl>
                <Input placeholder="https://pagina-a.com" {...field} />
              </FormControl>
              <FormDescription>
                El origen de esta URL se permite siempre en la API pública.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowedOrigins"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orígenes CORS extra</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={"https://www.pagina-a.com\nhttps://otro-origen.com"}
                  className="min-h-20 resize-y font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Un origen por línea o separados por comas. Si la web está en otro dominio o
                subdominio, añádelo aquí.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/60 p-4">
              <div>
                <FormLabel className="text-sm">Blog activo</FormLabel>
                <FormDescription>
                  Un blog inactivo deja de estar disponible en la API pública.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {blog ? "Guardar cambios" : "Crear blog"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
