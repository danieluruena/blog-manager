import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Eye, EyeOff, Loader2, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate } from "react-router"

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Button } from "../components/ui/button"
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
import { useAuth } from "../hooks/use-auth"
import { api, ApiError } from "../lib/api"
import { registerFormSchema, type RegisterFormValues } from "../lib/register-form"
import { useMutation } from "@tanstack/react-query"

export function RegisterPage() {
  const auth = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  useEffect(() => {
    document.title = "Crear cuenta · Blog Manager"
  }, [])

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const mutation = useMutation({
    mutationFn: api.register,
    onSuccess: (response) => {
      setRegisteredEmail(response.data.user.email)
      form.reset()
    },
  })

  if (auth.data) {
    return <Navigate to="/" replace />
  }

  const error = mutation.error instanceof ApiError ? mutation.error : null

  if (registeredEmail) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,154,255,0.16),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(182,156,255,0.10),transparent_40%)]" />
        <div className="relative grid min-h-screen place-items-center px-6 py-10">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            <div className="grid size-11 place-items-center rounded-xl border border-success/30 bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Cuenta creada</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              La cuenta <span className="text-ink">{registeredEmail}</span> está pendiente de
              aprobación. Un administrador debe asignarte acceso a uno o más blogs antes de que
              puedas iniciar sesión.
            </p>
            <Button className="mt-6 w-full" asChild>
              <Link to="/login">Ir a iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(124,154,255,0.16),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(182,156,255,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-line bg-surface font-mono text-xs font-semibold text-brand">
              BM
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Blog Manager</p>
              <p className="text-xs text-muted-foreground">Administración editorial</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-xl text-4xl font-semibold tracking-tight text-ink xl:text-5xl">
            Crea tu cuenta y empieza a colaborar.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Un administrador revisará tu solicitud y te asignará acceso de consulta o edición a los
            blogs que necesites.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              "Tu cuenta queda pendiente hasta que un administrador la apruebe.",
              "Los permisos se asignan por blog: consulta o edición.",
              "Podrás cambiar tu nombre y contraseña desde tu perfil.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <UserPlus className="size-3 text-brand" />
                Registro
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Crear cuenta</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Elige tu nombre, email y contraseña. La cuenta quedará pendiente de aprobación.
              </p>
            </div>

            {error ? (
              <Alert variant="destructive" className="mb-5 border-danger/30 bg-danger/10">
                <AlertTitle>No se pudo crear la cuenta</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  mutation.mutate({
                    name: values.name,
                    email: values.email,
                    password: values.password,
                  })
                })}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" autoComplete="name" autoFocus {...field} />
                      </FormControl>
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
                          placeholder="tu@email.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Mínimo 12 caracteres"
                            className="pr-11"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-1 right-1 text-muted-foreground hover:text-ink"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                      <FormDescription>Mínimo 12 caracteres.</FormDescription>
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
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repite la contraseña"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Crear cuenta
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-brand hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
