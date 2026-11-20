import { ChevronDown, LogOut, Menu, User } from "lucide-react"
import { Fragment, useState } from "react"
import { Link, Outlet, useLocation } from "react-router"

import { useAuth, useLogout } from "../../hooks/use-auth"
import { useBlogs } from "../../hooks/use-blogs"
import { initials } from "../../lib/format"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet"
import { SidebarContent } from "./sidebar-content"

function roleLabel(role: "admin" | "editor"): string {
  return role === "admin" ? "Administrador" : "Editor"
}

function AppBreadcrumb({ blogName }: { blogName?: string }) {
  const location = useLocation()
  const parts = location.pathname.split("/").filter(Boolean)
  const items: Array<{ label: string; to?: string }> = [{ label: "Panel", to: "/" }]

  if (parts[0] === "blogs") {
    items.push({ label: "Blogs", to: "/blogs" })

    if (parts[1]) {
      items.push({
        label: blogName ?? "Blog",
        to: `/blogs/${parts[1]}/articles`,
      })

      if (parts[2] === "articles") {
        items.push({
          label: "Artículos",
          to: parts[3] ? `/blogs/${parts[1]}/articles` : undefined,
        })

        if (parts[3] === "new") {
          items.push({ label: "Nuevo artículo" })
        } else if (parts[3]) {
          items.push({ label: "Artículo" })
        }
      } else if (parts[2] === "settings") {
        items.push({ label: "Ajustes" })
      }
    }
  }

  const lastIndex = items.length - 1

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {index === lastIndex || !item.to ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.to}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function AppShell() {
  const auth = useAuth()
  const blogs = useBlogs({ page: 1, pageSize: 50, sort: "name" })
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const user = auth.data
  const blogList = blogs.data?.data ?? []
  const pathParts = location.pathname.split("/").filter(Boolean)
  const currentBlogId = pathParts[0] === "blogs" ? pathParts[1] : undefined
  const currentBlog = blogList.find((blog) => blog.id === currentBlogId)

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:border focus:border-brand/40 focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden h-screen w-[264px] shrink-0 border-r border-line bg-surface/70 lg:sticky lg:top-0 lg:flex lg:flex-col">
          <SidebarContent
            user={user}
            blogs={blogList}
            blogsLoading={blogs.isLoading}
            onLogout={() => logout.mutate()}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas/85 px-4 backdrop-blur lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="size-4" />
              </Button>
              <AppBreadcrumb blogName={currentBlog?.name} />
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline">
                {roleLabel(user.role)}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-surface-2 text-[10px] text-brand">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-36 truncate text-sm sm:inline">{user.name}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="size-4" />
                      Mi perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-line bg-surface p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SheetDescription className="sr-only">Menú principal de Blog Manager</SheetDescription>
          <SidebarContent
            user={user}
            blogs={blogList}
            blogsLoading={blogs.isLoading}
            onLogout={() => logout.mutate()}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
