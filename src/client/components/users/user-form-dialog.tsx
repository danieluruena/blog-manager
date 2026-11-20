import { zodResolver } from "@hookform/resolvers/zod"
import type { AdminUserCreateInput, AdminUserUpdateInput } from "@shared/schemas"
import type { AdminUserDto, BlogDto } from "@shared/types"
import { AlertCircle, Loader2, Save, UserPlus } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { useCreateUser, useUpdateUser } from "../../hooks/use-users"
import { ApiError } from "../../lib/api"
import { buildUserFormSchema, type UserFormValues } from "../../lib/user-form"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
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
import { Skeleton } from "../ui/skeleton"
import { Switch } from "../ui/switch"

function defaultValues(user?: AdminUserDto): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    confirmPassword: "",
    role: user?.role ?? "editor",
    isActive: user?.isActive ?? true,
    isApproved: user?.isApproved ?? false,
    permissions:
      user?.permissions.map((item) => ({
        blogId: item.blogId,
        permission: item.permission,
      })) ?? [],
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  blogs,
  blogsLoading,
  currentUserId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AdminUserDto
  blogs: BlogDto[]
  blogsLoading: boolean
  currentUserId: string
}) {
  const isEdit = Boolean(user)
  const isSelf = user?.id === currentUserId
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const schema = useMemo(() => buildUserFormSchema(isEdit), [isEdit])
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(user),
  })
  const role = useWatch({ control: form.control, name: "role" })
  const isApproved = useWatch({ control: form.control, name: "isApproved" })
  const permissions = useWatch({ control: form.control, name: "permissions" }) ?? []
  const permissionMap = new Map(permissions.map((item) => [item.blogId, item.permission]))
  const permissionError = form.formState.errors.permissions?.message
  const pending = createUser.isPending || updateUser.isPending
  const mutationError =
    (createUser.error ?? updateUser.error) instanceof ApiError
      ? ((createUser.error ?? updateUser.error) as ApiError)
      : null

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(user))
    }
  }, [open, user, form])

  useEffect(() => {
    if (role === "admin") {
      form.setValue("isApproved", true)
      form.setValue("permissions", [])
    }
  }, [role, form])

  function setPermission(blogId: string, value: string): void {
    const next = form.getValues("permissions").filter((item) => item.blogId !== blogId)

    if (value !== "none") {
      next.push({ blogId, permission: value as "read" | "write" })
    }

    form.setValue("permissions", next, { shouldDirty: true, shouldValidate: true })
  }

  async function onSubmit(values: UserFormValues): Promise<void> {
    const permissionsInput = values.role === "admin" ? [] : values.permissions
    const isApprovedInput = values.role === "admin" ? true : values.isApproved

    try {
      if (user) {
        const input: AdminUserUpdateInput = {
          role: values.role,
          isActive: values.isActive,
          isApproved: isApprovedInput,
          permissions: permissionsInput,
        }
        await updateUser.mutateAsync({ userId: user.id, input })
        toast.success("Usuario actualizado")
      } else {
        const input: AdminUserCreateInput = {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          isActive: values.isActive,
          isApproved: isApprovedInput,
          permissions: permissionsInput,
        }
        await createUser.mutateAsync(input)
        toast.success("Usuario creado")
      }

      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EMAIL_IN_USE") {
          form.setError("email", { type: "server", message: error.message })
          return
        }

        if (error.code === "APPROVAL_REQUIRES_PERMISSION") {
          form.setError("permissions", { type: "server", message: error.message })
          return
        }
      }

      toast.error(error instanceof Error ? error.message : "No se pudo guardar el usuario")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-line bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza el rol, el estado y los permisos. El nombre y el email solo puede cambiarlos el propio usuario."
              : "Crea una cuenta y asigna permisos si la apruebas desde ahora."}
          </DialogDescription>
        </DialogHeader>

        {mutationError ? (
          <Alert variant="destructive" className="border-danger/30 bg-danger/10">
            <AlertCircle className="size-4" />
            <AlertTitle>No se pudo guardar el usuario</AlertTitle>
            <AlertDescription>{mutationError.message}</AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre completo"
                        readOnly={isEdit}
                        className={isEdit ? "text-muted-foreground" : undefined}
                        {...field}
                      />
                    </FormControl>
                    {isEdit ? (
                      <FormDescription>
                        Solo el propio usuario puede cambiar su nombre desde su perfil.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@email.com"
                        readOnly={isEdit}
                        className={isEdit ? "text-muted-foreground" : undefined}
                        {...field}
                      />
                    </FormControl>
                    {isEdit ? (
                      <FormDescription>El email no se puede editar.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Mínimo 12 caracteres"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repite la contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Repite la contraseña"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {isSelf
                      ? "No puedes cambiar tu propio rol."
                      : "Los administradores tienen acceso completo a todos los blogs."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 rounded-lg border border-line bg-surface-2/40 p-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Cuenta activa</FormLabel>
                      <FormDescription>
                        {isSelf
                          ? "No puedes desactivar tu propia cuenta."
                          : "Puede iniciar sesión cuando esté aprobada."}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSelf}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isApproved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Aprobada</FormLabel>
                      <FormDescription>
                        {role === "admin"
                          ? "Los administradores se aprueban automáticamente."
                          : "Requiere al menos un permiso de blog."}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={role === "admin"}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {role === "admin" ? (
              <div className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted-foreground">
                Los administradores tienen acceso completo a todos los blogs y a la gestión de
                usuarios.
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium leading-none">Permisos por blog</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Asigna consulta o edición. Si el usuario está aprobado, necesita al menos un
                    permiso.
                  </p>
                </div>

                {blogsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full bg-surface-2" />
                    <Skeleton className="h-10 w-full bg-surface-2" />
                  </div>
                ) : blogs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted-foreground">
                    Todavía no hay blogs a los que asignar permisos.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-line p-2">
                    {blogs.map((blog) => {
                      const current = permissionMap.get(blog.id) ?? "none"

                      return (
                        <div
                          key={blog.id}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2/60"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{blog.name}</p>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              /{blog.slug}
                            </p>
                          </div>
                          <Select
                            value={current}
                            onValueChange={(value) => setPermission(blog.id, value)}
                          >
                            <SelectTrigger
                              className="w-[150px]"
                              aria-label={`Permiso en ${blog.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin acceso</SelectItem>
                              <SelectItem value="read">Consulta</SelectItem>
                              <SelectItem value="write">Edición</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                )}

                {permissionError ? (
                  <p className="text-sm text-destructive">{permissionError}</p>
                ) : null}

                {isApproved && permissions.length === 0 ? (
                  <p className="text-xs text-warning">
                    Selecciona al menos un blog para poder aprobar al usuario.
                  </p>
                ) : null}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isEdit ? (
                  <Save className="size-4" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {isEdit ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
