import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import SignOutButton from '../protected/sign-out-button'
import SubmitButton from './submit-button'
import { getSuperadminActionContext, requireSuperadminPage } from '@/lib/admin/auth'

type GenericRow = Record<string, unknown>

type QueryParams = {
  success?: string | string[]
  error?: string | string[]
}

type AdminSupabaseClient = Awaited<ReturnType<typeof requireSuperadminPage>>['supabase']

const IMAGE_ID_COLUMNS = ['id', 'image_id']
const IMAGE_URL_COLUMNS = ['image_url', 'url', 'image_path', 'storage_path']

function readMessage(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }
  return value ?? ''
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }

  return String(value)
}

function collectColumns(rows: GenericRow[], preferred: string[] = []): string[] {
  const keys = new Set<string>()

  for (const column of preferred) {
    keys.add(column)
  }

  for (const row of rows.slice(0, 8)) {
    for (const key of Object.keys(row)) {
      keys.add(key)
    }
  }

  return Array.from(keys).slice(0, 8)
}

function uniquePayloads(items: GenericRow[]) {
  const seen = new Set<string>()
  const deduped: GenericRow[] = []

  for (const item of items) {
    const key = JSON.stringify(item)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function redirectWithStatus(kind: 'success' | 'error', message: string): never {
  const qs = new URLSearchParams({ [kind]: message })
  redirect(`/admin?${qs.toString()}`)
}

function buildCreatePayloads(
  imageUrl: string,
  profileId: string,
  captionId: string
): GenericRow[] {
  const now = new Date().toISOString()

  const rawPayloads = IMAGE_URL_COLUMNS.flatMap((urlColumn) => {
    const base: GenericRow = { [urlColumn]: imageUrl }

    if (profileId) {
      base.profile_id = profileId
    }

    if (captionId) {
      base.caption_id = captionId
    }

    return [
      base,
      {
        ...base,
        created_datetime_utc: now,
        modified_datetime_utc: now,
      },
      {
        ...base,
        created_at: now,
        updated_at: now,
      },
    ]
  })

  return uniquePayloads(rawPayloads)
}

function buildUpdatePayloads(imageUrl: string): GenericRow[] {
  const now = new Date().toISOString()

  const rawPayloads = IMAGE_URL_COLUMNS.flatMap((urlColumn) => {
    const base: GenericRow = { [urlColumn]: imageUrl }

    return [
      base,
      {
        ...base,
        modified_datetime_utc: now,
      },
      {
        ...base,
        updated_at: now,
      },
    ]
  })

  return uniquePayloads(rawPayloads)
}

async function createImage(formData: FormData) {
  'use server'

  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error)
  }

  const imageUrl = String(formData.get('image_url') ?? '').trim()
  const profileId = String(formData.get('profile_id') ?? '').trim()
  const captionId = String(formData.get('caption_id') ?? '').trim()

  if (!imageUrl) {
    redirectWithStatus('error', 'Image URL is required.')
  }

  const payloads = buildCreatePayloads(imageUrl, profileId, captionId)

  let lastError = 'Failed to insert into images table.'
  for (const payload of payloads) {
    const { error } = await auth.context.supabase.from('images').insert(payload)
    if (!error) {
      revalidatePath('/admin')
      redirectWithStatus('success', 'Image created successfully.')
    }
    console.error('Create image failed for payload:', payload, error.message)
    lastError = error.message
  }

  redirectWithStatus('error', lastError)
}

async function updateImage(formData: FormData) {
  'use server'

  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error)
  }

  const imageId = String(formData.get('image_id') ?? '').trim()
  const imageUrl = String(formData.get('image_url') ?? '').trim()

  if (!imageId) {
    redirectWithStatus('error', 'Image id is required for update.')
  }

  if (!imageUrl) {
    redirectWithStatus('error', 'Image URL is required for update.')
  }

  const payloads = buildUpdatePayloads(imageUrl)

  let lastError = 'Failed to update image.'

  for (const idColumn of IMAGE_ID_COLUMNS) {
    for (const payload of payloads) {
      const { error } = await auth.context.supabase
        .from('images')
        .update(payload)
        .eq(idColumn, imageId)

      if (!error) {
        revalidatePath('/admin')
        redirectWithStatus('success', 'Image updated successfully.')
      }

      console.error('Update image failed for id/payload:', idColumn, imageId, payload, error.message)
      lastError = error.message
    }
  }

  redirectWithStatus('error', lastError)
}

async function deleteImage(formData: FormData) {
  'use server'

  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error)
  }

  const imageId = String(formData.get('image_id') ?? '').trim()

  if (!imageId) {
    redirectWithStatus('error', 'Image id is required for delete.')
  }

  let lastError = 'Failed to delete image.'

  for (const idColumn of IMAGE_ID_COLUMNS) {
    const { error } = await auth.context.supabase
      .from('images')
      .delete()
      .eq(idColumn, imageId)

    if (!error) {
      revalidatePath('/admin')
      redirectWithStatus('success', 'Image deleted successfully.')
    }

    console.error('Delete image failed for id:', idColumn, imageId, error.message)
    lastError = error.message
  }

  redirectWithStatus('error', lastError)
}

async function readTable(
  supabase: AdminSupabaseClient,
  table: string,
  limit: number
): Promise<{ rows: GenericRow[]; errorMessage: string }> {
  const { data, error } = await supabase.from(table).select('*').limit(limit)

  return {
    rows: (data ?? []) as GenericRow[],
    errorMessage: error?.message ?? '',
  }
}

function DataTable({
  title,
  rows,
  errorMessage,
  preferredColumns,
}: {
  title: string
  rows: GenericRow[]
  errorMessage: string
  preferredColumns?: string[]
}) {
  const columns = collectColumns(rows, preferredColumns)

  return (
    <section className="panel stack-sm admin-section">
      <h2 className="section-title">{title}</h2>
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      {rows.length === 0 ? (
        <p>No rows returned.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={`${title}-${column}`}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={`${title}-${column}-${index}`}>{formatCell(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: QueryParams
}) {
  const admin = await requireSuperadminPage()

  const [profilesResult, imagesResult, captionsResult] = await Promise.all([
    readTable(admin.supabase, 'profiles', 60),
    readTable(admin.supabase, 'images', 80),
    readTable(admin.supabase, 'captions', 80),
  ])

  const successMessage = readMessage(searchParams?.success)
  const errorMessage = readMessage(searchParams?.error)

  const totalProfiles = profilesResult.rows.length
  const totalImages = imagesResult.rows.length
  const totalCaptions = captionsResult.rows.length

  const uniqueProfileIds = new Set(
    imagesResult.rows
      .map((row) => row.profile_id)
      .filter((value) => typeof value === 'string' && value.length > 0)
  )

  const captionCoverage = totalImages === 0 ? 0 : Math.round((totalCaptions / totalImages) * 100)

  return (
    <main className="page-shell">
      <div className="page-grid admin-page-grid">
        <section className="panel stack-sm admin-hero">
          <h1 className="title">Admin Panel</h1>
          <p className="subtitle">
            Signed in as <span className="mono">{admin.userEmail ?? admin.userId}</span>
          </p>
          <p className="subtitle">
            Access is restricted to profiles with <span className="mono">is_superadmin=true</span>.
          </p>
          <div className="action-row">
            <SignOutButton />
            <Link className="btn btn-ghost" href="/protected">
              Back to Rating App
            </Link>
          </div>
          <div className="status-stack">
            {successMessage ? <p className="status-success status-pill">{successMessage}</p> : null}
            {errorMessage ? <p className="status-error status-pill">{errorMessage}</p> : null}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Stats Snapshot</h2>
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">Profiles</p>
              <p className="stat-value">{totalProfiles}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Images</p>
              <p className="stat-value">{totalImages}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Captions</p>
              <p className="stat-value">{totalCaptions}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Image contributors</p>
              <p className="stat-value">{uniqueProfileIds.size}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Caption/Image ratio</p>
              <p className="stat-value">{captionCoverage}%</p>
            </article>
          </div>
        </section>

        <section className="panel stack-sm">
          <h2 className="section-title">Manage Images (CRUD)</h2>
          <div className="admin-form-grid">
            <form action={createImage} className="card stack-sm">
              <h3 className="form-title">Create image</h3>
              <label className="stack-sm">
                <span>Image URL</span>
                <input name="image_url" className="input" required placeholder="https://..." />
              </label>
              <label className="stack-sm">
                <span>profile_id (optional)</span>
                <input name="profile_id" className="input" placeholder="uuid" />
              </label>
              <label className="stack-sm">
                <span>caption_id (optional)</span>
                <input name="caption_id" className="input" placeholder="uuid" />
              </label>
              <SubmitButton
                className="btn btn-primary"
                idleLabel="Create"
                pendingLabel="Creating..."
              />
            </form>

            <form action={updateImage} className="card stack-sm">
              <h3 className="form-title">Update image</h3>
              <label className="stack-sm">
                <span>Image id</span>
                <input name="image_id" className="input" required />
              </label>
              <label className="stack-sm">
                <span>New image URL</span>
                <input name="image_url" className="input" required placeholder="https://..." />
              </label>
              <SubmitButton
                className="btn btn-primary"
                idleLabel="Update"
                pendingLabel="Updating..."
              />
            </form>

            <form action={deleteImage} className="card stack-sm">
              <h3 className="form-title">Delete image</h3>
              <label className="stack-sm">
                <span>Image id</span>
                <input name="image_id" className="input" required />
              </label>
              <SubmitButton
                className="btn btn-warn"
                idleLabel="Delete"
                pendingLabel="Deleting..."
              />
            </form>
          </div>
        </section>

        <DataTable
          title="Users / Profiles (READ)"
          rows={profilesResult.rows}
          errorMessage={profilesResult.errorMessage}
          preferredColumns={['id', 'user_id', 'auth_user_id', 'username', 'is_superadmin']}
        />

        <DataTable
          title="Images (READ)"
          rows={imagesResult.rows}
          errorMessage={imagesResult.errorMessage}
          preferredColumns={['id', 'image_id', 'image_url', 'profile_id', 'caption_id']}
        />

        <DataTable
          title="Captions (READ)"
          rows={captionsResult.rows}
          errorMessage={captionsResult.errorMessage}
          preferredColumns={['id', 'caption_id', 'caption', 'profile_id', 'image_id']}
        />
      </div>
    </main>
  )
}
