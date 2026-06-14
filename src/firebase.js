const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

export function assertFirebaseConfig() {
  if (!apiKey || !projectId) {
    throw new Error('Firebase設定値が不足しています。.envlocal を設定してください。')
  }
}

function base() {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
}

export function docUrl(path) {
  assertFirebaseConfig()
  return `${base()}/${path}?key=${apiKey}`
}

export function collectionUrl(path) {
  assertFirebaseConfig()
  return `${base()}/${path}?key=${apiKey}`
}
