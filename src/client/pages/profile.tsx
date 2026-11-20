import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Loader2, Save, ShieldCheck } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { PageHeader } from "../components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form"
import { Input } from "../components/ui/input"
import { authQueryKey, useAuth } from "../hooks/use-auth"
import { api, ApiError } from "../lib/api"
import {
  passwordFormSchema,
  profileFormSchema,
  type PasswordFormValues,
  type ProfileFormValues,
} from "../lib/profile-form"

export function ProfilePage() {
  const auth = useAuth()
  const user = auth.data
  const queryClient = useQueryClient()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user?.name ?? "" },
  })
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    profileForm.reset({ name: user?.name ?? "" })
  }, [profileForm, user?.name])

  const profileMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (response) => {
      queryClient.setQueryData(authQueryKey, response.data.user)
      profileForm.reset({ name: response.data.user.name })
      toast.success("Perfil actualizado")
    },
  })

  const passwordMutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      passwordForm.reset()
      toast.success("Contraseña actualizada")
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        passwordForm.setError("currentPassword", { message: error.message })
      }
    },
  })

  if (!user) {
    return null
  }

  const profileError = profileMutation.error instanceof ApiError ? profileMutation.error : null
  const passwordError = passwordMutation.error instanceof ApiError ? passwordMutation.error : null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Actualiza tus datos personales y tu contraseña."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-line bg-surface">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Datos personales</CardTitle>
            <CardDescription>Tu nombre visible y el email con el que accedes.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="border-brand/30 bg-brand/10 text-brand">
                <ShieldCheck className="size-3" />
                {user.role === "admin" ? "Administrador" : "Editor"}
              </Badge>
              <span className="text-muted-foreground">{user.email}</span>
            </div>

            {profileError ? (
              <Alert variant="destructive" className="mb-5 border-danger/30 bg-danger/10">
                <AlertCircle className="size-4" />
                <AlertTitle>No se pudo guardar el perfil</AlertTitle>
                <AlertDescription>{profileError.message}</AlertDescription>
              </Alert>
            ) : null}

            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
                className="space-y-5"
                noValidate
              >
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={user.email} readOnly className="text-muted-foreground" />
                  </FormControl>
                  <FormDescription>El email no se puede cambiar desde aquí.</FormDescription>
                </FormItem>

                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Guardar cambios
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Contraseña</CardTitle>
            <CardDescription>
              Introduce tu contraseña actual y elige una nueva de al menos 12 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {passwordError ? (
              <Alert variant="destructive" className="mb-5 border-danger/30 bg-danger/10">
                <AlertCircle className="size-4" />
                <AlertTitle>No se pudo cambiar la contraseña</AlertTitle>
                <AlertDescription>{passwordError.message}</AlertDescription>
              </Alert>
            ) : null}

            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit((values) =>
                  passwordMutation.mutate({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                  }),
                )}
                className="space-y-5"
                noValidate
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña actual</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormDescription>Mínimo 12 caracteres.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repite la nueva contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Cambiar contraseña
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
