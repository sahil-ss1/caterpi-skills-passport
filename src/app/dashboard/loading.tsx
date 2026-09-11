import { Card, Skeleton } from '@/components/ui';

/**
 * Mirrors the dashboard's layout so the page does not jump when data lands.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="sr-only" role="status">
        Loading your skills passport
      </p>

      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80" />

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>

        <Card className="flex justify-center p-5 lg:col-span-2">
          <Skeleton className="h-64 w-64 rounded-full" />
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-1.5 w-full" />
            <Skeleton className="mt-4 h-5 w-48" />
          </Card>
        ))}
      </div>
    </main>
  );
}
