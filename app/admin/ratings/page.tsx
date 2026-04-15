import { CaptionRatingStatsSection, DataTable, StatusMessages, TABLE_CONFIGS, loadAdminPageData } from '../_shared'

const ratingKeys = ['captions', 'caption_requests'] as const

export default async function RatingsAdminPage({
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

      <section className="panel stack-sm">
        <h2 className="section-title">Ratings Workspace</h2>
        <p className="subtitle admin-subtitle">
          Review how users are rating captions and cross-check that activity against the caption
          and request records.
        </p>
      </section>

      <CaptionRatingStatsSection stats={data.captionRatingStats} />

      {ratingKeys.map((key) => {
        const config = TABLE_CONFIGS.find((item) => item.key === key)
        if (!config) return null

        return (
          <DataTable
            key={config.key}
            title={`${config.title} (${config.mode === 'read' ? 'READ' : 'READ view'})`}
            rows={data.resultsByKey[config.key].rows}
            errorMessage={data.resultsByKey[config.key].errorMessage}
            preferredColumns={config.preferredColumns}
          />
        )
      })}
    </>
  )
}
