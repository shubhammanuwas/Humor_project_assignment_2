import Link from 'next/link'
import { ADMIN_SECTIONS, CaptionRatingStatsSection, StatusMessages, loadAdminPageData } from './_shared'

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { success?: string | string[]; error?: string | string[] }
}) {
  const data = await loadAdminPageData(searchParams)

  return (
    <>
      <StatusMessages
        successMessage={data.successMessage}
        errorMessage={data.errorMessage}
      />

      <section className="panel">
        <h2 className="section-title">Project 2 Overview</h2>
        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-label">Profiles</p>
            <p className="stat-value">{data.snapshot.totalProfiles}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Images</p>
            <p className="stat-value">{data.snapshot.totalImages}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Captions</p>
            <p className="stat-value">{data.snapshot.totalCaptions}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Contributors</p>
            <p className="stat-value">{data.snapshot.uniqueContributors}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Caption requests</p>
            <p className="stat-value">{data.snapshot.totalCaptionRequests}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">LLM models</p>
            <p className="stat-value">{data.snapshot.totalModels}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">LLM providers</p>
            <p className="stat-value">{data.snapshot.totalProviders}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Allowed domains</p>
            <p className="stat-value">{data.snapshot.totalDomains}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Whitelisted e-mails</p>
            <p className="stat-value">{data.snapshot.totalWhitelistedEmails}</p>
          </article>
        </div>
      </section>

      <section className="panel stack-sm">
        <div className="table-header-row">
          <h2 className="section-title">Admin Sections</h2>
          <span className="table-count">{ADMIN_SECTIONS.length} routes</span>
        </div>
        <div className="admin-dashboard-grid">
          {ADMIN_SECTIONS.map((section) => {
            const totalRows = section.keys.reduce((sum, key) => {
              return sum + (data.resultsByKey[key]?.rows.length ?? 0)
            }, 0)

            return (
              <Link key={section.href} href={section.href} className="admin-dashboard-card">
                <p className="admin-dashboard-kicker">{totalRows} rows loaded</p>
                <h3 className="form-title">{section.title}</h3>
                <p className="subtitle admin-subtitle">{section.description}</p>
                <p className="admin-dashboard-link">Open section</p>
              </Link>
            )
          })}
        </div>
      </section>

      <CaptionRatingStatsSection stats={data.captionRatingStats} />
    </>
  )
}
