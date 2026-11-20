import { lazy } from "react"
import { createBrowserRouter, Navigate } from "react-router"

import { ProtectedRoute } from "./components/auth/protected-route"
import { NotFoundPage } from "./pages/not-found"
import { RouteErrorPage } from "./pages/route-error"

const AppShell = lazy(() =>
  import("./components/layout/app-shell").then((module) => ({ default: module.AppShell })),
)
const LoginPage = lazy(() =>
  import("./pages/login").then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import("./pages/register").then((module) => ({ default: module.RegisterPage })),
)
const DashboardPage = lazy(() =>
  import("./pages/dashboard").then((module) => ({ default: module.DashboardPage })),
)
const BlogsPage = lazy(() =>
  import("./pages/blogs").then((module) => ({ default: module.BlogsPage })),
)
const UsersPage = lazy(() =>
  import("./pages/users").then((module) => ({ default: module.UsersPage })),
)
const ProfilePage = lazy(() =>
  import("./pages/profile").then((module) => ({ default: module.ProfilePage })),
)
const BlogArticlesPage = lazy(() =>
  import("./pages/blog-articles").then((module) => ({ default: module.BlogArticlesPage })),
)
const ArticleEditorPage = lazy(() =>
  import("./pages/article-editor").then((module) => ({ default: module.ArticleEditorPage })),
)
const BlogSettingsPage = lazy(() =>
  import("./pages/blog-settings").then((module) => ({ default: module.BlogSettingsPage })),
)

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "blogs", element: <BlogsPage /> },
          { path: "blogs/:blogId", element: <Navigate to="articles" replace /> },
          { path: "blogs/:blogId/articles", element: <BlogArticlesPage /> },
          { path: "blogs/:blogId/articles/new", element: <ArticleEditorPage /> },
          { path: "blogs/:blogId/articles/:articleId", element: <ArticleEditorPage /> },
          { path: "blogs/:blogId/settings", element: <BlogSettingsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
