import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function waitForAuth(): Promise<any> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error('User not logged in'));
    });
  });
}