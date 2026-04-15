import {
  DataTable,
  StatusMessages,
  TABLE_CONFIGS,
  loadAdminPageData,
} from '../_shared'

const contentKeys = ['images', 'terms', 'caption_examples', 'captions', 'caption_requests'] as const

export default async function ContentAdminPage({
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
        <h2 className="section-title">Content Workspace</h2>
        <p className="subtitle admin-subtitle">
          This page is now read-focused. Use the dedicated CRUD page for image uploads and any
          create, update, or delete work related to terms and caption examples.
        </p>
      </section>

      {contentKeys.map((key) => {
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
