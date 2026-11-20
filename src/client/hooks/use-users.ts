import type { AdminUserCreateInput, AdminUserUpdateInput } from "@shared/schemas"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "../lib/api"
import { authQueryKey } from "./use-auth"

export const usersQueryKey = ["users"] as const

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => (await api.listUsers()).data,
  })
}

function useInvalidateUsers() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: usersQueryKey })
    queryClient.invalidateQueries({ queryKey: ["blogs"] })
    queryClient.invalidateQueries({ queryKey: ["stats"] })
    queryClient.invalidateQueries({ queryKey: authQueryKey })
  }
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: (input: AdminUserCreateInput) => api.createUser(input),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: AdminUserUpdateInput }) =>
      api.updateUser(userId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: invalidate,
  })
}
