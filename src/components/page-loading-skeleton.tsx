import { Skeleton } from "@/components/ui/skeleton";

export function PageLoadingSkeleton({
  variant = "default",
}: {
  variant?: "default" | "admin" | "game" | "ranking" | "profile";
}) {
  const isAdmin = variant === "admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between rounded-lg bg-[#071525] p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 bg-white/20" />
            <Skeleton className="h-5 w-44 bg-white/20" />
          </div>
          <Skeleton className="h-10 w-24 bg-white/20" />
        </div>

        <section className="mb-6">
          <Skeleton className="mb-3 h-4 w-36" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        </section>

        {variant === "game" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : variant === "ranking" || isAdmin ? (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            {Array.from({ length: isAdmin ? 8 : 5 }).map((_, index) => (
              <Skeleton key={index} className="mb-3 h-14 w-full" />
            ))}
          </div>
        ) : variant === "profile" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-72 w-full md:col-span-2" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
