import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CapturedError } from '@/hooks/use-error-capture'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ''
const FEEDBACK_GH_REPO = process.env.FEEDBACK_GH_REPO ?? 'Alcapone-Fx/zbb'
const GH_API = 'https://api.github.com'
const DAILY_LIMIT = Number(process.env.FEEDBACK_DAILY_LIMIT ?? '10')

const capturedErrorSchema = z.object({
  type: z.enum(['console', 'runtime', 'promise']),
  message: z.string(),
  stack: z.string().optional(),
  timestamp: z.string(),
})

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature']),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  screenshotBase64: z.string().optional(),
  pathname: z.string(),
  userAgent: z.string(),
  screenWidth: z.number().int().positive(),
  screenHeight: z.number().int().positive(),
  pwaMode: z.boolean(),
  capturedErrors: z.array(capturedErrorSchema).max(20),
  timestamp: z.string(),
})

function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

function buildIssueBody(
  data: z.infer<typeof feedbackSchema>,
  userId: string,
  screenshotUrl: string | null
): string {
  const typeLabel = data.type === 'bug' ? '🐛 Bug' : '💡 Sugerencia'
  const pwaLabel = data.pwaMode ? 'Sí (standalone)' : 'No (browser)'

  const errorsSection =
    data.capturedErrors.length === 0
      ? '_Sin errores capturados_'
      : data.capturedErrors
          .map((e: CapturedError) => {
            const tag =
              e.type === 'console'
                ? '[console.error]'
                : e.type === 'promise'
                  ? '[unhandledrejection]'
                  : '[runtime error]'
            const ts = new Date(e.timestamp).toLocaleTimeString('es', { hour12: false })
            const stack = e.stack
              ? `\n${e.stack
                  .split('\n')
                  .slice(0, 6)
                  .map((l) => `    ${l}`)
                  .join('\n')}`
              : ''
            return `${tag} ${ts}  ${e.message}${stack}`
          })
          .join('\n\n')

  const screenshotSection = screenshotUrl
    ? `## Screenshot\n\n![Feedback Screenshot](${screenshotUrl})\n`
    : ''

  return `## Descripción

${data.description}

## Contexto técnico

| Campo | Valor |
|---|---|
| Tipo | ${typeLabel} |
| Ruta | \`${data.pathname}\` |
| Resolución | ${data.screenWidth}×${data.screenHeight} |
| PWA | ${pwaLabel} |
| Usuario | \`${userId}\` |
| Timestamp | ${data.timestamp} |
| User Agent | \`${data.userAgent}\` |

## Errores capturados (últimos ${data.capturedErrors.length})

\`\`\`
${errorsSection}
\`\`\`

${screenshotSection}
---
_Reportado desde la app · [Balancr Feedback Widget]_`
}

async function uploadScreenshotAsset(
  issueNumber: number,
  pngBuffer: Buffer
): Promise<string | null> {
  // GitHub Issues Assets API — uploads image to GitHub CDN
  const res = await fetch(
    `${GH_API}/repos/${FEEDBACK_GH_REPO}/issues/${issueNumber}/assets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'image/png',
        'Content-Length': String(pngBuffer.byteLength),
      },
      body: new Uint8Array(pngBuffer),
    }
  )

  if (!res.ok) return null

  const json = (await res.json()) as { url?: string }
  return json.url ?? null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!GITHUB_TOKEN) {
    console.error('POST /api/feedback: GITHUB_TOKEN not set')
    return NextResponse.json({ error: 'Feedback not configured' }, { status: 503 })
  }

  // Rate limit: max DAILY_LIMIT submissions per user per UTC day
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('feedback_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', dayStart.toISOString())

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Límite diario de ${DAILY_LIMIT} reportes alcanzado. Inténtalo mañana.` },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = parsed.data
  const label = data.type === 'bug' ? 'bug' : 'enhancement'

  // Step 1: Create the issue (without screenshot yet)
  const issueRes = await fetch(`${GH_API}/repos/${FEEDBACK_GH_REPO}/issues`, {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({
      title: `[${data.type === 'bug' ? 'Bug' : 'Feature'}] ${data.title}`,
      body: buildIssueBody(data, user.id, null),
      labels: [label, 'user-feedback'],
    }),
  })

  if (!issueRes.ok) {
    const errText = await issueRes.text()
    console.error('POST /api/feedback: GitHub issue creation failed', errText)
    return NextResponse.json({ error: 'Failed to create GitHub issue' }, { status: 502 })
  }

  const issue = (await issueRes.json()) as {
    number: number
    html_url: string
  }

  // Step 2: Upload screenshot as issue asset (best-effort)
  let screenshotUrl: string | null = null
  if (data.screenshotBase64) {
    try {
      const base64Data = data.screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      const pngBuffer = Buffer.from(base64Data, 'base64')
      screenshotUrl = await uploadScreenshotAsset(issue.number, pngBuffer)
    } catch (err) {
      // Non-fatal — issue was already created; just skip the image
      console.error('POST /api/feedback: screenshot upload failed', err)
    }
  }

  // Step 3: Update issue body with the screenshot URL if we got one
  if (screenshotUrl) {
    await fetch(`${GH_API}/repos/${FEEDBACK_GH_REPO}/issues/${issue.number}`, {
      method: 'PATCH',
      headers: ghHeaders(),
      body: JSON.stringify({
        body: buildIssueBody(data, user.id, screenshotUrl),
      }),
    }).catch((err) => {
      console.error('POST /api/feedback: issue update failed', err)
    })
  }

  // Record submission for rate limiting (best-effort — don't fail the response if this errors)
  await supabase
    .from('feedback_submissions')
    .insert({ user_id: user.id })
    .then(({ error }) => {
      if (error) console.error('POST /api/feedback: failed to record submission', error)
    })

  return NextResponse.json({
    issueUrl: issue.html_url,
    issueNumber: issue.number,
  })
}
