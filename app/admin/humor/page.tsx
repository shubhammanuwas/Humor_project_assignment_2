import {
  DataTable,
  StatusMessages,
  TABLE_CONFIGS,
  loadAdminPageData,
} from '../_shared'

const humorKeys = ['humor_flavors', 'humor_flavor_steps', 'humor_mix'] as const

type GenericRow = Record<string, unknown>

function readIsoDate(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : ''
}

function compareDatesDesc(left: GenericRow, right: GenericRow) {
  const leftDate = readIsoDate(left.created_datetime_utc)
  const rightDate = readIsoDate(right.created_datetime_utc)

  if (leftDate && rightDate) {
    return rightDate.localeCompare(leftDate)
  }

  if (rightDate) return 1
  if (leftDate) return -1
  return 0
}

function parseDuplicatedFlavorSlug(message: string) {
  const match = message.match(/\(([^()]+)\)\.?$/)
  return match?.[1]?.trim() ?? ''
}

export default async function HumorAdminPage({
  searchParams,
}: {
  searchParams: { success?: string | string[]; error?: string | string[] }
}) {
  const data = await loadAdminPageData(searchParams)
  const successSlug = parseDuplicatedFlavorSlug(data.successMessage)

  const { data: latestFlavorRows, error: latestFlavorError } = await data.admin.supabase
    .from('humor_flavors')
    .select('*')
    .order('created_datetime_utc', { ascending: false })
    .limit(120)

  const latestFlavorRowsSafe = (latestFlavorRows ?? []) as GenericRow[]
  const orderedFlavorRows =
    latestFlavorRowsSafe.length > 0
      ? latestFlavorRowsSafe
      : [...data.resultsByKey.humor_flavors.rows].sort(compareDatesDesc)

  const highlightedFlavor =
    orderedFlavorRows.find((row) => String(row.slug ?? '').trim() === successSlug) ?? null

  let highlightedSteps: GenericRow[] = []
  let highlightedStepsError = ''

  if (highlightedFlavor?.id) {
    const { data: duplicatedSteps, error: duplicatedStepsError } = await data.admin.supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', highlightedFlavor.id)
      .order('order_by', { ascending: true })

    highlightedSteps = (duplicatedSteps ?? []) as GenericRow[]
    highlightedStepsError = duplicatedStepsError?.message ?? ''
  }

  const orderedFlavorStepRows = [...data.resultsByKey.humor_flavor_steps.rows].sort((left, right) => {
    const leftFlavorId = Number(left.humor_flavor_id ?? 0)
    const rightFlavorId = Number(right.humor_flavor_id ?? 0)
    if (rightFlavorId !== leftFlavorId) {
      return rightFlavorId - leftFlavorId
    }

    const leftOrder = Number(left.order_by ?? 0)
    const rightOrder = Number(right.order_by ?? 0)
    return leftOrder - rightOrder
  })

  return (
    <>
      <StatusMessages
        successMessage={data.successMessage}
        errorMessage={data.errorMessage}
      />

      <section className="panel stack-sm">
        <h2 className="section-title">Humor Workspace</h2>
        <p className="subtitle admin-subtitle">
          This page is now read-focused. Use the dedicated CRUD page to duplicate humor flavors or
          update humor mix values, then come back here to inspect the resulting flavor records and
          copied steps.
        </p>
      </section>

      {highlightedFlavor ? (
        <section className="panel stack-sm">
          <div className="table-header-row">
            <h2 className="section-title">Latest Duplicated Flavor</h2>
            <span className="table-count">slug: {String(highlightedFlavor.slug ?? '')}</span>
          </div>
          <p className="subtitle admin-subtitle">
            This is the flavor that was just duplicated, along with the steps currently wired to
            it. You should be able to verify the copy here without hunting through the larger
            tables.
          </p>

          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">New flavor id</p>
              <p className="stat-value">{String(highlightedFlavor.id ?? 'N/A')}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Slug</p>
              <p className="stat-value stat-value-compact">{String(highlightedFlavor.slug ?? 'N/A')}</p>
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

          <DataTable
            title="Duplicated Humor Flavor (Focused)"
            rows={[highlightedFlavor]}
            errorMessage={latestFlavorError?.message ?? ''}
            preferredColumns={['id', 'slug', 'description', 'created_datetime_utc', 'created_by_user_id']}
          />

          <DataTable
            title="Duplicated Steps (Focused)"
            rows={highlightedSteps}
            errorMessage={highlightedStepsError}
            preferredColumns={['id', 'humor_flavor_id', 'order_by', 'description', 'llm_model_id']}
          />
        </section>
      ) : null}

      {humorKeys.map((key) => {
        const config = TABLE_CONFIGS.find((item) => item.key === key)
        if (!config) return null

        const rows =
          key === 'humor_flavors'
            ? orderedFlavorRows
            : key === 'humor_flavor_steps'
              ? orderedFlavorStepRows
              : data.resultsByKey[config.key].rows

        return (
          <DataTable
            key={config.key}
            title={`${config.title} (${config.mode === 'read' ? 'READ' : 'READ view'})`}
            rows={rows}
            errorMessage={
              key === 'humor_flavors'
                ? latestFlavorError?.message ?? data.resultsByKey[config.key].errorMessage
                : data.resultsByKey[config.key].errorMessage
            }
            preferredColumns={config.preferredColumns}
          />
        )
      })}
    </>
  )
}
