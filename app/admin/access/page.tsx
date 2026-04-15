import {
  DataTable,
  StatusMessages,
  TABLE_CONFIGS,
  loadAdminPageData,
} from '../_shared'

const accessKeys = ['profiles', 'allowed_signup_domains', 'whitelisted_email_addresses'] as const

export default async function AccessAdminPage({
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
        <h2 className="section-title">Access Workspace</h2>
        <p className="subtitle admin-subtitle">
          This page is now read-focused. Use the dedicated CRUD page to manage signup allowlists
          and individual email exceptions.
        </p>
      </section>

      {accessKeys.map((key) => {
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
