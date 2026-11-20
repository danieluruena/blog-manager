import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@shared/schemas"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, Link, useLocation, useNavigate } from "react-router"

import { useAuth, useLogin } from "../hooks/use-auth"
import { ApiError } from "../lib/api"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Button } from "../components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form"
import { Input } from "../components/ui/input"

const highlights = [
  "Blogs separados, con sus propios artículos.",
  "Contenido rich text, fuentes y estados editoriales.",
  "API pública con CORS para tus páginas web.",
]

export function LoginPage() {
  const auth = useAuth()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    document.title = "Iniciar sesión · Blog Manager"
  }, [])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const state = location.state as { from?: string } | null
  const from = state?.from && state.from !== "/login" ? state.from : "/"
  const error = login.error instanceof ApiError ? login.error : null

  if (auth.data) {
    return <Navigate to="/" replace />
  }

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        navigate(from, { replace: true })
      },
    })
  })

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
            Un panel para todos tus blogs.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Gestiona el contenido de cada página web desde un único lugar, sin mezclar artículos ni
            configuraciones.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <span className="leading-6">{highlight}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Usuarios y permisos
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
            <h1 className="sr-only lg:hidden">Iniciar sesión en Blog Manager</h1>
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 font-mono text-xs font-semibold text-brand">
                BM
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">Blog Manager</p>
                <p className="text-[11px] text-muted-foreground">Administración editorial</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <LockKeyhole className="size-3 text-brand" />
                Acceso privado
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Introduce tus credenciales para acceder al panel editorial.
              </p>
            </div>

            {error ? (
              <Alert variant="destructive" className="mb-5 border-danger/30 bg-danger/10">
                <AlertCircle className="size-4" />
                <AlertTitle>No se pudo iniciar sesión</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          autoFocus
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
                            autoComplete="current-password"
                            placeholder="Tu contraseña"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Entrar al panel
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
              Acceso para usuarios aprobados. La sesión caduca a los 7 días.
              <br />
              <Link to="/register" className="mt-2 inline-block text-brand hover:underline">
                Crear una cuenta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
