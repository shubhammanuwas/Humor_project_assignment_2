import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import SubmitButton from './submit-button'
import { getSuperadminActionContext, requireSuperadminPage } from '@/lib/admin/auth'

type GenericRow = Record<string, unknown>

type QueryParams = {
  success?: string | string[]
  error?: string | string[]
}

type AdminSection = {
  href: string
  title: string
  description: string
  keys: string[]
}

type AdminSupabaseClient = Awaited<ReturnType<typeof requireSuperadminPage>>['supabase']
type CaptionVoteRow = {
  caption_id?: string | number | null
  profile_id?: string | null
  vote_value?: string | number | null
  created_datetime_utc?: string | null
}

type CaptionRatingLeader = {
  caption_id: string
  caption_preview: string
  total_ratings: number
  upvotes: number
  downvotes: number
  net_score: number
  unique_raters: number
}

type CaptionRatingStats = {
  totalRatings: number
  uniqueRatedCaptions: number
  uniqueRaters: number
  upvotes: number
  downvotes: number
  netScore: number
  averageRatingsPerCaption: string
  latestRatingAt: string | null
  leaders: CaptionRatingLeader[]
  errorMessage: string
}

type TableConfig = {
  key: string
  table: string
  title: string
  mode: 'read' | 'crud' | 'update'
  limit: number
  preferredColumns?: string[]
  description?: string
  createExample?: string
  updateExample?: string
  defaultIdColumn?: string
}

const IMAGE_ID_COLUMNS = ['id', 'image_id']
const IMAGE_URL_COLUMNS = ['url']

export const TABLE_CONFIGS: TableConfig[] = [
  {
    key: 'profiles',
    table: 'profiles',
    title: 'Users / Profiles',
    mode: 'read',
    limit: 80,
    preferredColumns: ['id', 'email', 'first_name', 'last_name', 'is_superadmin'],
  },
  {
    key: 'images',
    table: 'images',
    title: 'Images',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'url', 'profile_id', 'created_datetime_utc', 'additional_context'],
    description: 'Supports direct URL create or file upload to Supabase Storage.',
  },
  {
    key: 'humor_flavors',
    table: 'humor_flavors',
    title: 'Humor Flavors',
    mode: 'read',
    limit: 80,
    preferredColumns: ['id', 'slug', 'description', 'created_datetime_utc'],
  },
  {
    key: 'humor_flavor_steps',
    table: 'humor_flavor_steps',
    title: 'Humor Flavor Steps',
    mode: 'read',
    limit: 120,
    preferredColumns: ['id', 'humor_flavor_id', 'order_by', 'description', 'llm_model_id'],
  },
  {
    key: 'humor_mix',
    table: 'humor_flavor_mix',
    title: 'Humor Mix',
    mode: 'update',
    limit: 40,
    preferredColumns: ['id', 'humor_flavor_id', 'caption_count', 'created_datetime_utc'],
    description: 'Read existing rows and patch one record at a time with JSON.',
    updateExample: '{"caption_count":5}',
  },
  {
    key: 'terms',
    table: 'terms',
    title: 'Terms',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'term', 'definition'],
    createExample: '{"term":"admin-test-term","definition":"created from admin","example":"admin example","priority":1}',
    updateExample: '{"definition":"updated from admin"}',
  },
  {
    key: 'captions',
    table: 'captions',
    title: 'Captions',
    mode: 'read',
    limit: 80,
    preferredColumns: ['id', 'content', 'profile_id', 'image_id', 'humor_flavor_id'],
  },
  {
    key: 'caption_requests',
    table: 'caption_requests',
    title: 'Caption Requests',
    mode: 'read',
    limit: 80,
    preferredColumns: ['id', 'profile_id', 'image_id', 'created_datetime_utc'],
  },
  {
    key: 'caption_examples',
    table: 'caption_examples',
    title: 'Caption Examples',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'caption', 'image_description', 'explanation', 'priority'],
    createExample:
      '{"caption":"admin test caption","image_description":"brief scene description","explanation":"why this is funny","priority":0}',
    updateExample: '{"caption":"updated admin test caption"}',
  },
  {
    key: 'llm_models',
    table: 'llm_models',
    title: 'LLM Models',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'name', 'llm_provider_id', 'provider_model_id', 'is_temperature_supported'],
    createExample:
      '{"name":"Admin Test Model","llm_provider_id":1,"provider_model_id":"admin-test-model","is_temperature_supported":true}',
    updateExample: '{"name":"Admin Test Model Updated"}',
  },
  {
    key: 'llm_providers',
    table: 'llm_providers',
    title: 'LLM Providers',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'name', 'created_datetime_utc'],
    createExample: '{"name":"Admin Test Provider"}',
    updateExample: '{"name":"Admin Test Provider Updated"}',
  },
  {
    key: 'llm_prompt_chains',
    table: 'llm_prompt_chains',
    title: 'LLM Prompt Chains',
    mode: 'read',
    limit: 80,
    preferredColumns: ['id', 'caption_request_id', 'created_datetime_utc'],
  },
  {
    key: 'llm_responses',
    table: 'llm_model_responses',
    title: 'LLM Responses',
    mode: 'read',
    limit: 80,
  },
  {
    key: 'allowed_signup_domains',
    table: 'allowed_signup_domains',
    title: 'Allowed Signup Domains',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'apex_domain', 'created_datetime_utc'],
    createExample: '{"apex_domain":"admin-test.edu"}',
    updateExample: '{"apex_domain":"updated-admin-test.edu"}',
  },
  {
    key: 'whitelisted_email_addresses',
    table: 'whitelist_email_addresses',
    title: 'Whitelisted E-mail Addresses',
    mode: 'crud',
    limit: 80,
    preferredColumns: ['id', 'email_address', 'created_datetime_utc'],
    createExample: '{"email_address":"admin-test@example.com"}',
    updateExample: '{"email_address":"updated-admin-test@example.com"}',
  },
]

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: '/admin/crud',
    title: 'CRUD',
    description: 'All create, update, delete, upload, and duplication actions in one workspace.',
    keys: [
      'images',
      'terms',
      'caption_examples',
      'llm_models',
      'llm_providers',
      'allowed_signup_domains',
      'whitelisted_email_addresses',
      'humor_mix',
    ],
  },
  {
    href: '/admin/ratings',
    title: 'Ratings',
    description: 'Caption rating statistics, recent voting activity, and caption review data.',
    keys: ['captions', 'caption_requests'],
  },
  {
    href: '/admin/humor',
    title: 'Humor',
    description: 'Humor flavors, related steps, humor mix controls, and flavor duplication.',
    keys: ['humor_flavors', 'humor_flavor_steps', 'humor_mix'],
  },
  {
    href: '/admin/content',
    title: 'Content',
    description: 'Images, terms, caption examples, and core caption content management.',
    keys: ['images', 'terms', 'caption_examples', 'captions', 'caption_requests'],
  },
  {
    href: '/admin/ai',
    title: 'AI',
    description: 'LLM models, providers, prompt chains, and response records.',
    keys: ['llm_models', 'llm_providers', 'llm_prompt_chains', 'llm_responses'],
  },
  {
    href: '/admin/access',
    title: 'Access',
    description: 'Profiles, allowed signup domains, and whitelisted email administration.',
    keys: ['profiles', 'allowed_signup_domains', 'whitelisted_email_addresses'],
  },
]

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

function summarizeCell(value: unknown) {
  const formatted = formatCell(value)
  const compact = formatted.replace(/\s+/g, ' ').trim()
  const isLong = compact.length > 120

  return {
    full: formatted,
    preview: isLong ? `${compact.slice(0, 117)}...` : compact,
    isLong,
    isEmpty: compact === 'null' || compact.length === 0,
  }
}

function summarizeCaptionText(row: GenericRow): string {
  const candidates = ['content', 'caption', 'text', 'body', 'caption_text']

  for (const key of candidates) {
    const value = row[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return `Caption ${String(row.id ?? row.caption_id ?? 'unknown')}`
}

function collectColumns(rows: GenericRow[], preferred: string[] = []): string[] {
  const keys = new Set<string>()

  for (const column of preferred) {
    keys.add(column)
  }

  for (const row of rows.slice(0, 10)) {
    for (const key of Object.keys(row)) {
      keys.add(key)
    }
  }

  return Array.from(keys).slice(0, 10)
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

function readReturnTo(formData: FormData) {
  const value = String(formData.get('return_to') ?? '').trim()
  return value || '/admin'
}

function redirectWithStatus(kind: 'success' | 'error', message: string, returnTo = '/admin'): never {
  const qs = new URLSearchParams({ [kind]: message })
  redirect(`${returnTo}?${qs.toString()}`)
}

function parseJsonObject(raw: string, label: string): GenericRow {
  const trimmed = raw.trim()

  if (!trimmed) {
    return {}
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`${label} must be a JSON object.`)
    }
    return parsed as GenericRow
  } catch (error) {
    const message = error instanceof Error ? error.message : `Invalid ${label}.`
    throw new Error(message)
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripManagedFields(row: GenericRow) {
  const clone = { ...row }

  for (const key of [
    'id',
    'created_datetime_utc',
    'modified_datetime_utc',
    'created_by_user_id',
    'modified_by_user_id',
  ]) {
    delete clone[key]
  }

  return clone
}

function withAuditFields(
  payload: GenericRow,
  profileId: string,
  mode: 'create' | 'update'
) {
  return {
    ...payload,
    ...(mode === 'create'
      ? {
          created_by_user_id: payload.created_by_user_id ?? profileId,
        }
      : {}),
    modified_by_user_id: payload.modified_by_user_id ?? profileId,
  }
}

function parseVoteValue(value: unknown): number {
  if (typeof value === 'number') {
    if (value > 0) return 1
    if (value < 0) return -1
    return 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'up', 'upvote', 'true'].includes(normalized)) {
      return 1
    }
    if (['-1', 'down', 'downvote', 'false'].includes(normalized)) {
      return -1
    }
  }

  return 0
}

function buildImagePayloadVariants(
  imageUrl: string,
  storagePath: string,
  extras: GenericRow,
  mode: 'create' | 'update',
  profileId: string
) {
  const variants: GenericRow[] = []

  for (const urlColumn of IMAGE_URL_COLUMNS) {
    const basePayload: GenericRow = { ...extras }
    if (imageUrl) {
      basePayload[urlColumn] = imageUrl
    }

    if (storagePath) {
      basePayload.additional_context =
        typeof basePayload.additional_context === 'string' && basePayload.additional_context.trim().length > 0
          ? `${basePayload.additional_context} | storage_path=${storagePath}`
          : `storage_path=${storagePath}`
    }

    variants.push(
      mode === 'create'
        ? withAuditFields(basePayload, profileId, 'create')
        : withAuditFields(basePayload, profileId, 'update')
    )
  }

  return uniquePayloads(variants)
}

async function createImageFromUrl(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const imageUrl = String(formData.get('image_url') ?? '').trim()
  if (!imageUrl) {
    redirectWithStatus('error', 'Image URL is required.', returnTo)
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  try {
    const extras = parseJsonObject(String(formData.get('record_payload') ?? ''), 'record payload')
    const payloads = buildImagePayloadVariants(imageUrl, '', extras, 'create', profileId)

    let lastError = 'Failed to create image.'
    for (const payload of payloads) {
      const { error } = await auth.context.supabase.from('images').insert(payload)
      if (!error) {
        revalidatePath('/admin')
        redirectWithStatus('success', 'Image created successfully.', returnTo)
      }
      lastError = error.message
      console.error('Create image from URL failed:', payload, error.message)
    }

    redirectWithStatus('error', lastError, returnTo)
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Invalid image payload.',
      returnTo
    )
  }
}

async function uploadImageAndCreateRecord(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const file = formData.get('image_file')
  const bucket = String(formData.get('bucket') ?? '').trim()
  const folder = String(formData.get('folder') ?? '').trim()

  if (!(file instanceof File) || file.size === 0) {
    redirectWithStatus('error', 'Select an image file to upload.', returnTo)
  }

  if (!bucket) {
    redirectWithStatus('error', 'Storage bucket is required.', returnTo)
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  try {
    const extras = parseJsonObject(String(formData.get('record_payload') ?? ''), 'record payload')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
    const storagePath = `${cleanFolder ? `${cleanFolder}/` : ''}${Date.now()}-${safeName}`

    const { error: uploadError } = await auth.context.supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      })

    if (uploadError) {
      redirectWithStatus('error', uploadError.message, returnTo)
    }

    const { data: publicUrlData } = auth.context.supabase.storage.from(bucket).getPublicUrl(storagePath)
    const imageUrl = publicUrlData.publicUrl ?? ''
    const payloads = buildImagePayloadVariants(imageUrl, storagePath, extras, 'create', profileId)

    let lastError = 'Upload succeeded but image row insert failed.'
    for (const payload of payloads) {
      const { error } = await auth.context.supabase.from('images').insert(payload)
      if (!error) {
        revalidatePath('/admin')
        redirectWithStatus('success', 'Image uploaded and row created successfully.', returnTo)
      }
      lastError = error.message
      console.error('Create image after upload failed:', payload, error.message)
    }

    redirectWithStatus('error', lastError, returnTo)
  } catch (error) {
    redirectWithStatus('error', error instanceof Error ? error.message : 'Upload failed.', returnTo)
  }
}

async function updateImage(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const imageId = String(formData.get('record_id') ?? '').trim()
  const idColumn = String(formData.get('id_column') ?? 'id').trim()

  if (!imageId) {
    redirectWithStatus('error', 'Image id is required for update.', returnTo)
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  try {
    const extras = parseJsonObject(String(formData.get('update_payload') ?? ''), 'update payload')
    const explicitUrl = typeof extras.url === 'string' ? String(extras.url) : ''
    const payloads = buildImagePayloadVariants(explicitUrl, '', extras, 'update', profileId)

    let lastError = 'Failed to update image.'
    for (const payload of payloads) {
      const { error } = await auth.context.supabase
        .from('images')
        .update(payload)
        .eq(idColumn || 'id', imageId)

      if (!error) {
        revalidatePath('/admin')
        redirectWithStatus('success', 'Image updated successfully.', returnTo)
      }

      lastError = error.message
      console.error('Update image failed:', idColumn, imageId, payload, error.message)
    }

    redirectWithStatus('error', lastError, returnTo)
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Invalid update payload.',
      returnTo
    )
  }
}

async function deleteImage(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const imageId = String(formData.get('record_id') ?? '').trim()
  const idColumn = String(formData.get('id_column') ?? '').trim()

  if (!imageId) {
    redirectWithStatus('error', 'Image id is required for delete.', returnTo)
  }

  const candidateColumns = idColumn ? [idColumn] : IMAGE_ID_COLUMNS
  let lastError = 'Failed to delete image.'

  for (const candidateColumn of candidateColumns) {
    const { error } = await auth.context.supabase
      .from('images')
      .delete()
      .eq(candidateColumn, imageId)

    if (!error) {
      revalidatePath('/admin')
      redirectWithStatus('success', 'Image deleted successfully.', returnTo)
    }

    lastError = error.message
    console.error('Delete image failed:', candidateColumn, imageId, error.message)
  }

  redirectWithStatus('error', lastError, returnTo)
}

async function createGenericRow(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const table = String(formData.get('table') ?? '').trim()
  if (!table) {
    redirectWithStatus('error', 'Missing target table.', returnTo)
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  try {
    const payload = withAuditFields(
      parseJsonObject(String(formData.get('record_payload') ?? ''), 'record payload'),
      profileId,
      'create'
    )

    const { error } = await auth.context.supabase.from(table).insert(payload)
    if (error) {
      console.error('Generic create failed:', table, payload, error.message)
      redirectWithStatus('error', error.message, returnTo)
    }

    revalidatePath('/admin')
    redirectWithStatus('success', `Created row in ${table}.`, returnTo)
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Invalid create payload.',
      returnTo
    )
  }
}

async function updateGenericRow(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const table = String(formData.get('table') ?? '').trim()
  const idColumn = String(formData.get('id_column') ?? 'id').trim()
  const recordId = String(formData.get('record_id') ?? '').trim()

  if (!table || !recordId) {
    redirectWithStatus('error', 'Table and record id are required for update.', returnTo)
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  try {
    const payload = withAuditFields(
      parseJsonObject(String(formData.get('update_payload') ?? ''), 'update payload'),
      profileId,
      'update'
    )

    const { error } = await auth.context.supabase
      .from(table)
      .update(payload)
      .eq(idColumn || 'id', recordId)

    if (error) {
      console.error('Generic update failed:', table, idColumn, recordId, payload, error.message)
      redirectWithStatus('error', error.message, returnTo)
    }

    revalidatePath('/admin')
    redirectWithStatus('success', `Updated row in ${table}.`, returnTo)
  } catch (error) {
    redirectWithStatus(
      'error',
      error instanceof Error ? error.message : 'Invalid update payload.',
      returnTo
    )
  }
}

async function deleteGenericRow(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const table = String(formData.get('table') ?? '').trim()
  const idColumn = String(formData.get('id_column') ?? 'id').trim()
  const recordId = String(formData.get('record_id') ?? '').trim()

  if (!table || !recordId) {
    redirectWithStatus('error', 'Table and record id are required for delete.', returnTo)
  }

  const { error } = await auth.context.supabase
    .from(table)
    .delete()
    .eq(idColumn || 'id', recordId)

  if (error) {
    console.error('Generic delete failed:', table, idColumn, recordId, error.message)
    redirectWithStatus('error', error.message, returnTo)
  }

  revalidatePath('/admin')
  redirectWithStatus('success', `Deleted row from ${table}.`, returnTo)
}

async function duplicateHumorFlavor(formData: FormData) {
  'use server'

  const returnTo = readReturnTo(formData)
  const auth = await getSuperadminActionContext()
  if ('error' in auth) {
    redirectWithStatus('error', auth.error, returnTo)
  }

  const sourceFlavorId = String(formData.get('source_flavor_id') ?? '').trim()
  const newName = String(formData.get('new_name') ?? '').trim()

  if (!sourceFlavorId || !newName) {
    redirectWithStatus(
      'error',
      'Source humor flavor id and new unique name are required.',
      returnTo
    )
  }

  const profileId = auth.context.profileId
  if (!profileId) {
    redirectWithStatus('error', 'Missing profiles.id for signed-in admin user.', returnTo)
  }

  const { data: flavor, error: flavorError } = await auth.context.supabase
    .from('humor_flavors')
    .select('*')
    .eq('id', sourceFlavorId)
    .maybeSingle()

  if (flavorError || !flavor) {
    redirectWithStatus('error', flavorError?.message ?? 'Source humor flavor not found.', returnTo)
  }

  const { data: existingFlavors, error: existingFlavorError } = await auth.context.supabase
    .from('humor_flavors')
    .select('slug')

  if (existingFlavorError) {
    redirectWithStatus('error', existingFlavorError.message, returnTo)
  }

  const baseSlug = slugify(newName) || `flavor-copy-${Date.now()}`
  const existingSlugs = new Set(
    (existingFlavors ?? [])
      .map((row) => row.slug)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  )

  let uniqueSlug = baseSlug
  let counter = 2
  while (existingSlugs.has(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`
    counter += 1
  }

  const flavorPayload = stripManagedFields(flavor as GenericRow)
  if ('name' in flavorPayload || typeof (flavor as GenericRow).name !== 'undefined') {
    flavorPayload.name = newName
  }
  if ('slug' in flavorPayload || typeof (flavor as GenericRow).slug !== 'undefined') {
    flavorPayload.slug = uniqueSlug
  }

  const { data: insertedFlavor, error: insertFlavorError } = await auth.context.supabase
    .from('humor_flavors')
    .insert(withAuditFields(flavorPayload, profileId, 'create'))
    .select('*')
    .maybeSingle()

  if (insertFlavorError || !insertedFlavor) {
    redirectWithStatus(
      'error',
      insertFlavorError?.message ?? 'Failed to duplicate humor flavor.',
      returnTo
    )
  }

  const { data: steps, error: stepReadError } = await auth.context.supabase
    .from('humor_flavor_steps')
    .select('*')
    .eq('humor_flavor_id', sourceFlavorId)
    .order('order_by', { ascending: true })

  if (stepReadError) {
    redirectWithStatus('error', stepReadError.message, returnTo)
  }

  if ((steps ?? []).length > 0) {
    const duplicatedSteps = (steps ?? []).map((step) =>
      withAuditFields(
        {
          ...stripManagedFields(step as GenericRow),
          humor_flavor_id: (insertedFlavor as GenericRow).id,
        },
        profileId,
        'create'
      )
    )

    const { error: insertStepError } = await auth.context.supabase
      .from('humor_flavor_steps')
      .insert(duplicatedSteps)

    if (insertStepError) {
      redirectWithStatus('error', insertStepError.message, returnTo)
    }
  }

  revalidatePath('/admin')
  redirectWithStatus(
    'success',
    `Duplicated humor flavor ${sourceFlavorId} as ${newName}${uniqueSlug ? ` (${uniqueSlug})` : ''}.`,
    returnTo
  )
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

async function readCaptionVotes(
  supabase: AdminSupabaseClient
): Promise<{ rows: CaptionVoteRow[]; errorMessage: string }> {
  const pageSize = 1000
  const rows: CaptionVoteRow[] = []
  let start = 0

  while (true) {
    const { data, error } = await supabase
      .from('caption_votes')
      .select('caption_id, profile_id, vote_value, created_datetime_utc')
      .order('created_datetime_utc', { ascending: false })
      .range(start, start + pageSize - 1)

    if (error) {
      return {
        rows,
        errorMessage: error.message,
      }
    }

    const batch = (data ?? []) as CaptionVoteRow[]
    rows.push(...batch)

    if (batch.length < pageSize) {
      break
    }

    start += pageSize
  }

  return {
    rows,
    errorMessage: '',
  }
}

function buildCaptionRatingStats(votes: CaptionVoteRow[], captions: GenericRow[]): CaptionRatingStats {
  if (votes.length === 0) {
    return {
      totalRatings: 0,
      uniqueRatedCaptions: 0,
      uniqueRaters: 0,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      averageRatingsPerCaption: '0.0',
      latestRatingAt: null,
      leaders: [],
      errorMessage: '',
    }
  }

  const captionMap = new Map(
    captions.map((row) => [String(row.id ?? row.caption_id ?? ''), summarizeCaptionText(row)])
  )
  const raters = new Set<string>()
  const captionBuckets = new Map<
    string,
    { total: number; upvotes: number; downvotes: number; netScore: number; raters: Set<string> }
  >()
  let latestRatingAt: string | null = null
  let upvotes = 0
  let downvotes = 0

  for (const vote of votes) {
    const captionId = String(vote.caption_id ?? '').trim()
    if (!captionId) {
      continue
    }

    const profileId = typeof vote.profile_id === 'string' ? vote.profile_id : ''
    if (profileId) {
      raters.add(profileId)
    }

    const score = parseVoteValue(vote.vote_value)
    if (score > 0) upvotes += 1
    if (score < 0) downvotes += 1

    const bucket = captionBuckets.get(captionId) ?? {
      total: 0,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      raters: new Set<string>(),
    }

    bucket.total += 1
    bucket.netScore += score
    if (score > 0) bucket.upvotes += 1
    if (score < 0) bucket.downvotes += 1
    if (profileId) bucket.raters.add(profileId)
    captionBuckets.set(captionId, bucket)

    const createdAt =
      typeof vote.created_datetime_utc === 'string' ? vote.created_datetime_utc : null
    if (createdAt && (!latestRatingAt || createdAt > latestRatingAt)) {
      latestRatingAt = createdAt
    }
  }

  const leaders = Array.from(captionBuckets.entries())
    .map(([captionId, bucket]) => ({
      caption_id: captionId,
      caption_preview: captionMap.get(captionId) ?? `Caption ${captionId}`,
      total_ratings: bucket.total,
      upvotes: bucket.upvotes,
      downvotes: bucket.downvotes,
      net_score: bucket.netScore,
      unique_raters: bucket.raters.size,
    }))
    .sort((left, right) => {
      if (right.total_ratings !== left.total_ratings) {
        return right.total_ratings - left.total_ratings
      }
      return right.net_score - left.net_score
    })
    .slice(0, 8)

  return {
    totalRatings: votes.length,
    uniqueRatedCaptions: captionBuckets.size,
    uniqueRaters: raters.size,
    upvotes,
    downvotes,
    netScore: upvotes - downvotes,
    averageRatingsPerCaption:
      captionBuckets.size === 0 ? '0.0' : (votes.length / captionBuckets.size).toFixed(1),
    latestRatingAt,
    leaders,
    errorMessage: '',
  }
}

export function DataTable({
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
  const allColumns = collectColumns(rows, preferredColumns)
  const columns = allColumns.slice(0, 5)
  const hiddenColumns = allColumns.filter((column) => !columns.includes(column))
  const rowLabel = `${rows.length} row${rows.length === 1 ? '' : 's'}`

  return (
    <section className="panel stack-sm admin-section">
      <div className="table-header-row">
        <h2 className="section-title">{title}</h2>
        <span className="table-count">{rowLabel}</span>
      </div>
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      {rows.length === 0 ? (
        <p>No rows returned.</p>
      ) : (
        <div className="table-wrap admin-table-shell">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={`${title}-${column}`}>{column}</th>
                ))}
                {hiddenColumns.length > 0 ? <th key={`${title}-details`}>Details</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => {
                    const cell = summarizeCell(row[column])

                    return (
                      <td key={`${title}-${column}-${index}`}>
                        <div className={`cell-chip ${cell.isEmpty ? 'cell-chip-muted' : ''}`}>
                          <span className="cell-preview" title={cell.full}>
                            {cell.preview}
                          </span>
                          {cell.isLong ? (
                            <details className="cell-details">
                              <summary>More</summary>
                              <pre className="cell-full mono">{cell.full}</pre>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    )
                  })}
                  {hiddenColumns.length > 0 ? (
                    <td key={`${title}-details-${index}`}>
                      <details className="row-details">
                        <summary>{hiddenColumns.length} more field{hiddenColumns.length === 1 ? '' : 's'}</summary>
                        <div className="row-details-grid">
                          {hiddenColumns.map((column) => {
                            const cell = summarizeCell(row[column])

                            return (
                              <div key={`${title}-${column}-detail-${index}`} className="row-detail-card">
                                <p className="row-detail-label mono">{column}</p>
                                <pre className="row-detail-value mono">{cell.full}</pre>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function JsonHint({ example }: { example: string }) {
  return <p className="form-hint mono">{example}</p>
}

export function StatusMessages({
  successMessage,
  errorMessage,
}: {
  successMessage: string
  errorMessage: string
}) {
  if (!successMessage && !errorMessage) {
    return null
  }

  return (
    <div className="status-stack">
      {successMessage ? <p className="status-success status-pill">{successMessage}</p> : null}
      {errorMessage ? <p className="status-error status-pill">{errorMessage}</p> : null}
    </div>
  )
}

export function GenericCrudForms({
  config,
  returnTo,
}: {
  config: TableConfig
  returnTo: string
}) {
  const createExample = config.createExample ?? '{"name":"Example"}'
  const updateExample = config.updateExample ?? '{"name":"Updated name"}'
  const defaultIdColumn = config.defaultIdColumn ?? 'id'

  return (
    <section className="panel stack-sm">
      <div className="stack-sm">
        <h2 className="section-title">{config.title} Controls</h2>
        {config.description ? <p className="subtitle admin-subtitle">{config.description}</p> : null}
      </div>

      <div className="admin-form-grid admin-form-grid-wide">
        {config.mode === 'crud' ? (
          <form action={createGenericRow} className="card stack-sm">
            <input type="hidden" name="table" value={config.table} />
            <input type="hidden" name="return_to" value={returnTo} />
            <h3 className="form-title">Create row</h3>
            <label className="stack-sm">
              <span>JSON payload</span>
              <textarea
                name="record_payload"
                className="input textarea"
                placeholder={createExample}
                required
              />
            </label>
            <JsonHint example={`Example: ${createExample}`} />
            <SubmitButton className="btn btn-primary" idleLabel="Create" pendingLabel="Creating..." />
          </form>
        ) : null}

        <form action={updateGenericRow} className="card stack-sm">
          <input type="hidden" name="table" value={config.table} />
          <input type="hidden" name="return_to" value={returnTo} />
          <h3 className="form-title">Update row</h3>
          <label className="stack-sm">
            <span>Record id</span>
            <input name="record_id" className="input" required />
          </label>
          <label className="stack-sm">
            <span>ID column</span>
            <input name="id_column" className="input" defaultValue={defaultIdColumn} />
          </label>
          <label className="stack-sm">
            <span>JSON patch payload</span>
            <textarea
              name="update_payload"
              className="input textarea"
              placeholder={updateExample}
              required
            />
          </label>
          <JsonHint example={`Example: ${updateExample}`} />
          <SubmitButton className="btn btn-primary" idleLabel="Update" pendingLabel="Updating..." />
        </form>

        {config.mode === 'crud' ? (
          <form action={deleteGenericRow} className="card stack-sm">
            <input type="hidden" name="table" value={config.table} />
            <input type="hidden" name="return_to" value={returnTo} />
            <h3 className="form-title">Delete row</h3>
            <label className="stack-sm">
              <span>Record id</span>
              <input name="record_id" className="input" required />
            </label>
            <label className="stack-sm">
              <span>ID column</span>
              <input name="id_column" className="input" defaultValue={defaultIdColumn} />
            </label>
            <SubmitButton className="btn btn-warn" idleLabel="Delete" pendingLabel="Deleting..." />
          </form>
        ) : null}
      </div>
    </section>
  )
}

export function ImageCrudForms({ returnTo }: { returnTo: string }) {
  return (
    <section className="panel stack-sm">
      <div className="stack-sm">
        <h2 className="section-title">Images Controls</h2>
        <p className="subtitle admin-subtitle">
          Create by URL or upload a file to Supabase Storage, then update or delete rows from the
          <span className="mono"> images </span>
          table.
        </p>
      </div>

      <div className="admin-form-grid admin-form-grid-wide">
        <form action={createImageFromUrl} className="card stack-sm">
          <input type="hidden" name="return_to" value={returnTo} />
          <h3 className="form-title">Create from URL</h3>
          <label className="stack-sm">
            <span>Image URL</span>
            <input name="image_url" className="input" required placeholder="https://..." />
          </label>
          <label className="stack-sm">
            <span>Extra image row JSON</span>
            <textarea
              name="record_payload"
              className="input textarea"
              placeholder='{"profile_id":"...","additional_context":"optional note"}'
            />
          </label>
          <JsonHint example='Example: {"profile_id":"uuid","additional_context":"admin upload"}' />
          <SubmitButton className="btn btn-primary" idleLabel="Create" pendingLabel="Creating..." />
        </form>

        <form action={uploadImageAndCreateRecord} className="card stack-sm">
          <input type="hidden" name="return_to" value={returnTo} />
          <h3 className="form-title">Upload new image</h3>
          <label className="stack-sm">
            <span>Storage bucket</span>
            <input name="bucket" className="input" defaultValue="images" required />
          </label>
          <label className="stack-sm">
            <span>Folder (optional)</span>
            <input name="folder" className="input" placeholder="admin-uploads" />
          </label>
          <label className="stack-sm">
            <span>Image file</span>
            <input name="image_file" type="file" accept="image/*" className="file-input" required />
          </label>
          <label className="stack-sm">
            <span>Extra image row JSON</span>
            <textarea
              name="record_payload"
              className="input textarea"
              placeholder='{"profile_id":"...","additional_context":"optional note"}'
            />
          </label>
          <SubmitButton className="btn btn-primary" idleLabel="Upload" pendingLabel="Uploading..." />
        </form>

        <form action={updateImage} className="card stack-sm">
          <input type="hidden" name="return_to" value={returnTo} />
          <h3 className="form-title">Update image</h3>
          <label className="stack-sm">
            <span>Record id</span>
            <input name="record_id" className="input" required />
          </label>
          <label className="stack-sm">
            <span>ID column</span>
            <input name="id_column" className="input" defaultValue="id" />
          </label>
          <label className="stack-sm">
            <span>JSON patch payload</span>
            <textarea
              name="update_payload"
              className="input textarea"
              placeholder='{"url":"https://..."}'
              required
            />
          </label>
          <JsonHint example='Example: {"url":"https://...","additional_context":"updated note"}' />
          <SubmitButton className="btn btn-primary" idleLabel="Update" pendingLabel="Updating..." />
        </form>

        <form action={deleteImage} className="card stack-sm">
          <input type="hidden" name="return_to" value={returnTo} />
          <h3 className="form-title">Delete image</h3>
          <label className="stack-sm">
            <span>Record id</span>
            <input name="record_id" className="input" required />
          </label>
          <label className="stack-sm">
            <span>ID column (optional)</span>
            <input name="id_column" className="input" placeholder="id" />
          </label>
          <SubmitButton className="btn btn-warn" idleLabel="Delete" pendingLabel="Deleting..." />
        </form>
      </div>
    </section>
  )
}

export function DuplicateHumorFlavorForm({ returnTo }: { returnTo: string }) {
  return (
    <section className="panel stack-sm">
      <div className="stack-sm">
        <h2 className="section-title">Duplicate Humor Flavor</h2>
        <p className="subtitle admin-subtitle">
          Clone one humor flavor and all of its related steps into a new flavor. The new unique
          name is used for the flavor name when available, and always produces a fresh unique slug.
        </p>
      </div>

      <form action={duplicateHumorFlavor} className="card stack-sm admin-compact-form">
        <input type="hidden" name="return_to" value={returnTo} />
        <label className="stack-sm">
          <span>Source humor flavor id</span>
          <input name="source_flavor_id" className="input" required placeholder="69" />
        </label>
        <label className="stack-sm">
          <span>New unique name</span>
          <input name="new_name" className="input" required placeholder="Gen Z Dark Roast Copy" />
        </label>
        <p className="form-hint">
          All related steps are copied too, with the new flavor wired to the duplicated steps.
        </p>
        <SubmitButton
          className="btn btn-primary"
          idleLabel="Duplicate Flavor"
          pendingLabel="Duplicating..."
        />
      </form>
    </section>
  )
}

export function CaptionRatingStatsSection({ stats }: { stats: CaptionRatingStats }) {
  return (
    <section className="panel stack-sm">
      <div className="table-header-row">
        <h2 className="section-title">Caption Rating Statistics</h2>
        <span className="table-count">{stats.totalRatings} ratings loaded</span>
      </div>

      {stats.errorMessage ? <p className="status-error">{stats.errorMessage}</p> : null}

      <div className="stat-grid">
        <article className="stat-card">
          <p className="stat-label">Total ratings</p>
          <p className="stat-value">{stats.totalRatings}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Captions with ratings</p>
          <p className="stat-value">{stats.uniqueRatedCaptions}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Unique raters</p>
          <p className="stat-value">{stats.uniqueRaters}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Upvotes</p>
          <p className="stat-value">{stats.upvotes}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Downvotes</p>
          <p className="stat-value">{stats.downvotes}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Net score</p>
          <p className="stat-value">{stats.netScore}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Avg ratings per caption</p>
          <p className="stat-value">{stats.averageRatingsPerCaption}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Most recent rating</p>
          <p className="stat-value stat-value-compact">
            {stats.latestRatingAt ? new Date(stats.latestRatingAt).toLocaleString() : 'N/A'}
          </p>
        </article>
      </div>

      {stats.leaders.length > 0 ? (
        <div className="table-wrap admin-table-shell">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                <th>caption</th>
                <th>caption_id</th>
                <th>ratings</th>
                <th>upvotes</th>
                <th>downvotes</th>
                <th>net</th>
                <th>unique raters</th>
              </tr>
            </thead>
            <tbody>
              {stats.leaders.map((leader) => (
                <tr key={`leader-${leader.caption_id}`}>
                  <td>
                    <div className="cell-chip">
                      <span className="cell-preview" title={leader.caption_preview}>
                        {leader.caption_preview}
                      </span>
                    </div>
                  </td>
                  <td className="mono">{leader.caption_id}</td>
                  <td>{leader.total_ratings}</td>
                  <td>{leader.upvotes}</td>
                  <td>{leader.downvotes}</td>
                  <td>{leader.net_score}</td>
                  <td>{leader.unique_raters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No caption ratings available yet.</p>
      )}
    </section>
  )
}

export async function loadAdminPageData(searchParams?: QueryParams) {
  const admin = await requireSuperadminPage()

  const tableResults = await Promise.all(
    TABLE_CONFIGS.map((config) => readTable(admin.supabase, config.table, config.limit))
  )
  const captionVoteResults = await readCaptionVotes(admin.supabase)

  const resultsByKey = Object.fromEntries(
    TABLE_CONFIGS.map((config, index) => [config.key, tableResults[index]])
  ) as Record<string, { rows: GenericRow[]; errorMessage: string }>
  const captionRatingStats = buildCaptionRatingStats(
    captionVoteResults.rows,
    resultsByKey.captions.rows
  )
  captionRatingStats.errorMessage = captionVoteResults.errorMessage

  const successMessage = readMessage(searchParams?.success)
  const errorMessage = readMessage(searchParams?.error)

  const totalProfiles = resultsByKey.profiles.rows.length
  const totalImages = resultsByKey.images.rows.length
  const totalCaptions = resultsByKey.captions.rows.length
  const totalModels = resultsByKey.llm_models.rows.length
  const totalProviders = resultsByKey.llm_providers.rows.length
  const totalCaptionRequests = resultsByKey.caption_requests.rows.length
  const totalDomains = resultsByKey.allowed_signup_domains.rows.length
  const totalWhitelistedEmails = resultsByKey.whitelisted_email_addresses.rows.length

  const uniqueProfileIds = new Set(
    resultsByKey.images.rows
      .map((row) => row.profile_id)
      .filter((value) => typeof value === 'string' && value.length > 0)
  )

  return {
    admin,
    successMessage,
    errorMessage,
    resultsByKey,
    captionRatingStats,
    snapshot: {
      totalProfiles,
      totalImages,
      totalCaptions,
      totalModels,
      totalProviders,
      totalCaptionRequests,
      totalDomains,
      totalWhitelistedEmails,
      uniqueContributors: uniqueProfileIds.size,
    },
  }
}
