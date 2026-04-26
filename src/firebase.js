const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

if (!apiKey || !projectId) {
  console.warn('Firebase環境変数が未設定です。.env を確認してください。')
}

export function getProjectId() {
  return projectId
}

export function getFirestoreApiBase() {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`
}

export function getFirestoreBaseUrl() {
  return `${getFirestoreApiBase()}/documents`
}

export function getFirestoreUrl(path = '', params = '') {
  const suffix = path ? `/${path}` : ''
  const glue = params ? `&${params}` : ''
  return `${getFirestoreBaseUrl()}${suffix}?key=${apiKey}${glue}`
}

export function getFirestoreApiUrl(actionPath = '') {
  const suffix = actionPath ? `/${actionPath}` : ''
  return `${getFirestoreApiBase()}${suffix}?key=${apiKey}`
}

export function assertFirebaseConfig() {
  if (!apiKey || !projectId) {
    throw new Error('Firebase設定値が不足しています。.env を設定してください。')
  }
}
