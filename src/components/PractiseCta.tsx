import Link from 'next/link'

/**
 * The one-tap start of a daily session.
 *
 * Practice is the thing done every day; adding material is occasional. The
 * screens lead with this and push the management tools below it, so a session
 * never begins with a configuration decision.
 */
export default function PractiseCta({
  href,
  due,
  label,
}: {
  href: string
  due: number
  label: string
}) {
  if (due === 0) {
    return (
      <div className="rounded-2xl border border-edge px-5 py-6 text-center">
        <p className="text-sm text-muted">Nothing due.</p>
        <Link href={href} className="mt-2 inline-block text-sm underline underline-offset-4">
          Practise anyway
        </Link>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl bg-foreground px-5 py-6 text-center text-background"
    >
      <span className="block text-2xl font-medium">{label}</span>
      <span className="mt-1 block text-sm opacity-70">
        {due} card{due === 1 ? '' : 's'} due
      </span>
    </Link>
  )
}
