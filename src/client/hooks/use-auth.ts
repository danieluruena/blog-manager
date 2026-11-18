import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import type { LoginInput } from "@shared/schemas"
import type { UserDto } from "@shared/types"

import { api, ApiError } from "../lib/api"

export const authQueryKey = ["auth", "me"] as const

export function useAuth() {
  return useQuery<UserDto | null>({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const response = await api.me()
        return response.data.user
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }

        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: (response) => {
      queryClient.setQueryData(authQueryKey, response.data.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      queryClient.clear()
      navigate("/login", { replace: true })
    },
  })
}
