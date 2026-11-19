import { articleStatusValues, type ArticleStatus } from "@shared/constants"
import type { ArticleCreateInput } from "@shared/schemas"
import { EMPTY_RICH_TEXT_JSON } from "@shared/richtext"
import type { ArticleDto } from "@shared/types"
import { z } from "zod"

import { fromDateTimeLocal, toDateTimeLocal } from "./datetime"

const articleSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const articleFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "El título no puede superar los 200 caracteres"),
  slug: z
    .string()
    .trim()
    .max(200, "El slug no puede superar los 200 caracteres")
    .refine(
      (value) => value === "" || articleSlugPattern.test(value),
      "El slug solo admite minúsculas, números y guiones",
    ),
  excerpt: z.string().trim().max(300, "El extracto no puede superar los 300 caracteres"),
  author: z
    .string()
    .trim()
    .min(1, "El autor es obligatorio")
    .max(120, "El autor no puede superar los 120 caracteres"),
  status: z.enum(articleStatusValues, { message: "Estado inválido" }),
  publishedAt: z.string(),
  bodyJson: z
    .string()
    .min(1, "El contenido es obligatorio")
    .max(1_000_000, "El contenido es demasiado largo"),
  coverImage: z.string().max(2048, "La URL de la portada es demasiado larga").nullable(),
})

export type ArticleFormValues = z.infer<typeof articleFormSchema>

export function toFormValues(
  article: ArticleDto | undefined,
  defaultAuthor: string,
): ArticleFormValues {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    author: article?.author ?? defaultAuthor,
    status: article?.status ?? "draft",
    publishedAt: toDateTimeLocal(article?.publishedAt),
    bodyJson: article?.bodyJson ?? EMPTY_RICH_TEXT_JSON,
    coverImage: article?.coverImage ?? null,
  }
}

export function toInput(values: ArticleFormValues, status: ArticleStatus): ArticleCreateInput {
  return {
    title: values.title,
    ...(values.slug ? { slug: values.slug } : {}),
    excerpt: values.excerpt,
    author: values.author,
    bodyJson: values.bodyJson,
    coverImage: values.coverImage,
    status,
    publishedAt: fromDateTimeLocal(values.publishedAt),
  }
}

export function isVisibleStatus(status: ArticleStatus): boolean {
  return status === "published" || status === "featured"
}
