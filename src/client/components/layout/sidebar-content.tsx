import type { BlogDto, UserDto } from "@shared/types"
import { LayoutDashboard, Library, LogOut } from "lucide-react"
import { Link, NavLink, useLocation } from "react-router"

import { initials } from "../../lib/format"
import { cn } from "../../lib/utils"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Skeleton } from "../ui/skeleton"

type SidebarContentProps = {
  user: UserDto
  blogs: BlogDto[]
  blogsLoading: boolean
  onLogout: () => void
  onNavigate?: () => void
}

const navigation = [
  { label: "Panel", to: "/", icon: LayoutDashboard, end: true },
  { label: "Blogs", to: "/blogs", icon: Library, end: false },
]

export function SidebarContent({
  user,
  blogs,
  blogsLoading,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 font-mono text-xs font-semibold text-brand">
          BM
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">Blog Manager</p>
          <p className="text-[11px] text-muted-foreground">Administración editorial</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Navegación principal">
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-surface-2 text-ink shadow-sm"
                    : "text-muted-foreground hover:bg-surface-2/60 hover:text-ink",
                )
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <Separator className="my-6 bg-line" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Tus blogs
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">{blogs.length}</span>
        </div>

        {blogsLoading ? (
          <div className="space-y-2 px-1">
            <Skeleton className="h-8 w-full bg-surface-2" />
            <Skeleton className="h-8 w-5/6 bg-surface-2" />
            <Skeleton className="h-8 w-4/6 bg-surface-2" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-5 text-muted-foreground">
            Todavía no hay blogs. El CRUD llega en la siguiente fase.
          </div>
        ) : (
          <div className="space-y-1">
            {blogs.map((blog) => {
              const active = location.pathname.startsWith(`/blogs/${blog.id}`)

              return (
                <Link
                  key={blog.id}
                  to={`/blogs/${blog.id}/articles`}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-ink"
                      : "text-muted-foreground hover:bg-surface-2/60 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      blog.isActive ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{blog.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {blog.articleCount ?? 0}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-surface text-xs text-brand">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Fase 3</span>
          <Link to="/blogs" onClick={onNavigate} className="hover:text-ink">
            Ver blogs
          </Link>
        </div>
      </div>
    </div>
  )
}
