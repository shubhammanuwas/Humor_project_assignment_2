import {
  DuplicateHumorFlavorForm,
  GenericCrudForms,
  ImageCrudForms,
  StatusMessages,
  TABLE_CONFIGS,
  loadAdminPageData,
} from '../_shared'

type GenericRow = Record<string, unknown>

function parseDuplicatedFlavorSlug(message: string) {
  const match = message.match(/\(([^()]+)\)\.?$/)
  return match?.[1]?.trim() ?? ''
}

export default async function CrudAdminPage({
  searchParams,
}: {
  searchParams: { success?: string | string[]; error?: string | string[] }
}) {
  const data = await loadAdminPageData(searchParams)
  const successSlug = parseDuplicatedFlavorSlug(data.successMessage)

  let highlightedFlavor: GenericRow | null = null
  let highlightedSteps: GenericRow[] = []
  let highlightedStepsError = ''

  if (successSlug) {
    const { data: duplicatedFlavor } = await data.admin.supabase
      .from('humor_flavors')
      .select('*')
      .eq('slug', successSlug)
      .maybeSingle()

    highlightedFlavor = (duplicatedFlavor as GenericRow | null) ?? null

    if (highlightedFlavor?.id) {
      const { data: duplicatedSteps, error: duplicatedStepsError } = await data.admin.supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('humor_flavor_id', highlightedFlavor.id)
        .order('order_by', { ascending: true })

      highlightedSteps = (duplicatedSteps ?? []) as GenericRow[]
      highlightedStepsError = duplicatedStepsError?.message ?? ''
    }
  }

  return (
    <>
      <StatusMessages
        successMessage={data.successMessage}
        errorMessage={data.errorMessage}
      />

      <section className="panel stack-sm">
        <h2 className="section-title">CRUD Workspace</h2>
        <p className="subtitle admin-subtitle">
          All write actions live here now, so you do not have to jump between multiple admin
          pages to create, update, delete, upload, or duplicate records.
        </p>
      </section>

      {highlightedFlavor ? (
        <section className="panel stack-sm">
          <div className="table-header-row">
            <h2 className="section-title">Latest Duplication Result</h2>
            <span className="table-count">slug: {String(highlightedFlavor.slug ?? '')}</span>
          </div>

          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">New flavor id</p>
              <p className="stat-value">{String(highlightedFlavor.id ?? 'N/A')}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Copied steps</p>
              <p className="stat-value">{highlightedSteps.length}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Created at</p>
              <p className="stat-value stat-value-compact">
                {String(highlightedFlavor.created_datetime_utc ?? 'N/A')}
              </p>
            </article>
          </div>

          <p className="subtitle admin-subtitle">
            Use the Humor page if you want the broader read-only tables. This block is just the
            immediate duplication result.
          </p>

          <div className="crud-result-grid">
            <div className="card stack-sm">
              <h3 className="form-title">Duplicated flavor</h3>
              <p className="mono">id: {String(highlightedFlavor.id ?? 'N/A')}</p>
              <p className="mono">slug: {String(highlightedFlavor.slug ?? 'N/A')}</p>
              <p>{String(highlightedFlavor.description ?? 'No description')}</p>
            </div>
            <div className="card stack-sm">
              <h3 className="form-title">Copied steps</h3>
              {highlightedStepsError ? <p className="status-error">{highlightedStepsError}</p> : null}
              <ul className="list-reset stack-sm">
                {highlightedSteps.map((step) => (
                  <li key={`step-${String(step.id)}`} className="crud-step-item">
                    <span className="mono">#{String(step.order_by ?? '?')}</span>
                    <span>{String(step.description ?? 'No description')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <ImageCrudForms returnTo="/admin/crud" />

      <section className="panel stack-sm">
        <div className="table-header-row">
          <h2 className="section-title">Content CRUD</h2>
          <span className="table-count">images, terms, examples</span>
        </div>
        <div className="stack-sm">
          {TABLE_CONFIGS.filter((config) => ['terms', 'caption_examples'].includes(config.key)).map(
            (config) => (
              <GenericCrudForms key={config.key} config={config} returnTo="/admin/crud" />
            )
          )}
        </div>
      </section>

      <section className="panel stack-sm">
        <div className="table-header-row">
          <h2 className="section-title">AI CRUD</h2>
          <span className="table-count">models, providers</span>
        </div>
        <div className="stack-sm">
          {TABLE_CONFIGS.filter((config) => ['llm_models', 'llm_providers'].includes(config.key)).map(
            (config) => (
              <GenericCrudForms key={config.key} config={config} returnTo="/admin/crud" />
            )
          )}
        </div>
      </section>

      <section className="panel stack-sm">
        <div className="table-header-row">
          <h2 className="section-title">Access CRUD</h2>
          <span className="table-count">domains, whitelist</span>
        </div>
        <div className="stack-sm">
          {TABLE_CONFIGS.filter((config) =>
            ['allowed_signup_domains', 'whitelisted_email_addresses'].includes(config.key)
          ).map((config) => (
            <GenericCrudForms key={config.key} config={config} returnTo="/admin/crud" />
          ))}
        </div>
      </section>

      <section className="panel stack-sm">
        <div className="table-header-row">
          <h2 className="section-title">Humor CRUD</h2>
          <span className="table-count">duplication, humor mix</span>
        </div>
        <DuplicateHumorFlavorForm returnTo="/admin/crud" />
        {TABLE_CONFIGS.filter((config) => config.key === 'humor_mix').map((config) => (
          <GenericCrudForms key={config.key} config={config} returnTo="/admin/crud" />
        ))}
      </section>
    </>
  )
}
