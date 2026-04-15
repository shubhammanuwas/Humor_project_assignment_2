import {
  DataTable,
  StatusMessages,
  TABLE_CONFIGS,
  loadAdminPageData,
} from '../_shared'

const aiKeys = ['llm_models', 'llm_providers', 'llm_prompt_chains', 'llm_responses'] as const

export default async function AiAdminPage({
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
        <h2 className="section-title">AI Workspace</h2>
        <p className="subtitle admin-subtitle">
          This page is now read-focused. Use the dedicated CRUD page when you need to create,
          update, or delete model and provider configuration.
        </p>
      </section>

      {aiKeys.map((key) => {
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
