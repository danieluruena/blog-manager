import { useQuery } from "@tanstack/react-query"

import { api, type ListBlogsParams } from "../lib/api"

export const blogsQueryKey = (params: ListBlogsParams = {}) => ["blogs", params] as const

export function useBlogs(params: ListBlogsParams = {}) {
  return useQuery({
    queryKey: blogsQueryKey(params),
    queryFn: () => api.listBlogs({ page: 1, pageSize: 50, sort: "name", ...params }),
    staleTime: 60_000,
  })
}

export function useBlog(blogId: string | undefined) {
  return useQuery({
    queryKey: ["blog", blogId],
    queryFn: () => api.getBlog(blogId ?? ""),
    enabled: Boolean(blogId),
  })
}
