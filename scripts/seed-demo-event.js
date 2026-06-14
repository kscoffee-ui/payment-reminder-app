import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const DEFAULT_BASE_URL = 'http://localhost:5173'
const DEMO_MEMBERS = [
  { name: '山田太郎', status: 'unpaid', proofMemo: '' },
  { name: '佐藤花子', status: 'reported', proofMemo: '現金で支払い済みです' },
  { name: '鈴木健太', status: 'confirmed', proofMemo: '' },
  { name: '田中美咲', status: 'reported', proofMemo: '幹事に手渡ししました' },
  { name: '高橋翔', status: 'unpaid', proofMemo: '' },
  { name: '伊藤葵', status: 'confirmed', proofMemo: '' },
  { name: '渡辺亮', status: 'unpaid', proofMemo: '' },
  { name: '中村優奈', status: 'reported', proofMemo: '会場で支払い済みです' },
  { name: '小林蓮', status: 'unpaid', proofMemo: '' },
  { name: '加藤真央', status: 'confirmed', proofMemo: '' },
  { name: '吉田悠斗', status: 'unpaid', proofMemo: '' },
  { name: '山本結衣', status: 'reported', proofMemo: 'あとで確認お願いします' },
  { name: '佐々木陸', status: 'unpaid', proofMemo: '' },
  { name: '山口莉子', status: 'confirmed', proofMemo: '' },
  { name: '松本大輝', status: 'unpaid', proofMemo: '' },
  { name: '井上彩', status: 'reported', proofMemo: '現金で渡しました' },
  { name: '木村颯太', status: 'unpaid', proofMemo: '' },
  { name: '林愛梨', status: 'confirmed', proofMemo: '' },
  { name: '清水拓也', status: 'reported', proofMemo: '支払い完了しました' },
  { name: '斎藤琴音', status: 'unpaid', proofMemo: '' },
]

function parseArgs(argv) {
  let base = DEFAULT_BASE_URL

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base') {
      const value = argv[i + 1]
      if (!value) throw new Error('--base にはURLを指定してください。')
      base = value
      i += 1
      continue
    }
    if (arg.startsWith('--base=')) {
      base = arg.slice('--base='.length)
      continue
    }
    throw new Error(`未対応のオプションです: ${arg}`)
  }

  return { base: base.replace(/\/+$/, '') || DEFAULT_BASE_URL }
}

function parseEnvValue(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) {
    throw new Error('.env.local が見つかりません。開発用Firebaseの設定を用意してください。')
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex === -1) continue

    const key = normalized.slice(0, separatorIndex).trim()
    const value = parseEnvValue(normalized.slice(separatorIndex + 1))
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

function requiredEnv(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} が不足しています。.env.local を確認してください。`)
  }
  return value
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
}

function randomToken() {
  return randomBytes(18).toString('base64url')
}

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

function encode(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  if (value && typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)])) } }
  }
  return { nullValue: null }
}

function toDoc(data) {
  return {
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)])),
  }
}

function createFirestoreClient({ apiKey, projectId }) {
  const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const text = await response.text()
    const json = text ? JSON.parse(text) : {}
    if (!response.ok) {
      throw new Error(json?.error?.message || 'Firestore通信に失敗しました。')
    }
    return json
  }

  function collectionUrl(collectionPath) {
    return `${root}/${collectionPath}?key=${apiKey}`
  }

  function docUrl(documentPath) {
    return `${root}/${documentPath}?key=${apiKey}`
  }

  return {
    createDocument(collectionPath, documentId, data) {
      return request(`${collectionUrl(collectionPath)}&documentId=${encodeURIComponent(documentId)}`, {
        method: 'POST',
        body: JSON.stringify(toDoc(data)),
      })
    },
    patchDocument(documentPath, data) {
      return request(docUrl(documentPath), {
        method: 'PATCH',
        body: JSON.stringify(toDoc(data)),
      })
    },
  }
}

async function main() {
  const { base } = parseArgs(process.argv.slice(2))
  loadEnvLocal()

  const apiKey = requiredEnv('VITE_FIREBASE_API_KEY')
  const projectId = requiredEnv('VITE_FIREBASE_PROJECT_ID')
  const firestore = createFirestoreClient({ apiKey, projectId })

  const now = new Date().toISOString()
  const eventId = randomId('demo_event')
  const adminToken = randomToken()
  const participantToken = randomToken()

  await firestore.createDocument('events', eventId, {
    id: eventId,
    title: '[DEMO] デモ飲み会',
    eventDate: todayString(),
    amountPerPerson: 3000,
    paymentMethod: 'cash',
    paymentInfo: '当日現金で集金',
    memo: '確認待ちベル検証用のデモイベントです',
    isDemo: true,
    adminToken,
    participantToken,
    createdAt: now,
    updatedAt: now,
  })

  await Promise.all(
    DEMO_MEMBERS.map((member, index) => {
      const memberId = randomId(`demo_member_${String(index + 1).padStart(2, '0')}`)
      return firestore.createDocument(`events/${eventId}/members`, memberId, {
        id: memberId,
        name: member.name,
        status: member.status,
        paymentMethod: 'cash',
        proofMemo: member.proofMemo,
        createdAt: now,
        updatedAt: now,
      })
    }),
  )

  console.log('Demo event created.')
  console.log('Members: unpaid 9, reported 6, confirmed 5')
  console.log(`Admin: ${base}/admin/${eventId}?token=${adminToken}`)
  console.log(`Join: ${base}/join/${eventId}?token=${participantToken}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
