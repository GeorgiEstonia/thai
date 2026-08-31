/**
 * Shown the instant a tab is tapped.
 *
 * Every screen queries the database on the server, so without this a tap sits
 * there doing nothing visible for a second and you tap again.
 */
export default function Loading() {
  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <div className="h-6 w-32 animate-pulse rounded bg-surface" />
      <div className="mt-4 space-y-2">
        <div className="h-16 animate-pulse rounded-xl bg-surface" />
        <div className="h-16 animate-pulse rounded-xl bg-surface" />
        <div className="h-16 animate-pulse rounded-xl bg-surface" />
      </div>
    </main>
  )
}
