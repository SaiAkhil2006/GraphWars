import admin from 'firebase-admin';
import { config } from './index';

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    initialized = true;
    console.log('Firebase Admin initialized');
  } else {
    console.warn('Firebase credentials not configured — auth verification disabled in dev');
  }
}

export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!initialized) {
    if (config.nodeEnv === 'development') {
      return { uid: 'dev-user', email: 'dev@graphwars.local' } as admin.auth.DecodedIdToken;
    }
    return null;
  }
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export { admin };
