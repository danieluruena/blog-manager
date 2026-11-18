import { QueryClientProvider } from "@tanstack/react-query"
import { Suspense } from "react"
import { RouterProvider } from "react-router"

import { FullPageLoader } from "./components/layout/full-page-loader"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { queryClient } from "./lib/query-client"
import { router } from "./router"

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Suspense fallback={<FullPageLoader label="Cargando panel…" />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster position="bottom-right" closeButton richColors />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
