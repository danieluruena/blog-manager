import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api, type ListArticlesParams } from "../lib/api"

export const articlesQueryKey = (blogId: string, params: ListArticlesParams = {}) =>
  ["articles", blogId, params] as const

export function useArticles(blogId: string | undefined, params: ListArticlesParams = {}) {
  return useQuery({
    queryKey: articlesQueryKey(blogId ?? "", params),
    queryFn: () => api.listArticles(blogId ?? "", params),
    enabled: Boolean(blogId),
    placeholderData: keepPreviousData,
  })
}

export function useArticle(blogId: string | undefined, articleId: string | undefined) {
  return useQuery({
    queryKey: ["article", blogId, articleId],
    queryFn: () => api.getArticle(blogId ?? "", articleId ?? ""),
    enabled: Boolean(blogId && articleId),
    retry: false,
  })
}
