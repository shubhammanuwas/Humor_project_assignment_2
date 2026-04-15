import Link from 'next/link'
import SignOutButton from '../protected/sign-out-button'
import { ADMIN_SECTIONS } from './_shared'
import { requireSuperadminPage } from '@/lib/admin/auth'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview' },
  ...ADMIN_SECTIONS.map((section) => ({ href: section.href, label: section.title })),
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireSuperadminPage()

  return (
    <main className="page-shell">
      <div className="page-grid admin-page-grid">
        <section className="panel stack-sm admin-hero">
          <h1 className="title">Admin Control Room</h1>
          <p className="subtitle">
            Signed in as <span className="mono">{admin.userEmail ?? admin.userId}</span>
          </p>
          <p className="subtitle">
            Use the sections below to jump straight into the part of the admin app you need.
          </p>
          <div className="action-row">
            <SignOutButton />
            <Link className="btn btn-ghost" href="/protected">
              Back to Rating App
            </Link>
          </div>
          <nav className="admin-nav-grid" aria-label="Admin sections">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} className="admin-nav-link" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </section>
        {children}
      </div>
    </main>
  )
}
