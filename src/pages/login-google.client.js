import pb from '../utils/pb';

async function performOAuth(statusEl) {
  const redirectUrl = `${window.location.origin}/oauth2-redirect`;
  // 1) Essaye avec listAuthMethods (chemin optimisé v0.26)
  try {
    const methods = await pb.collection('users').listAuthMethods();
    console.debug('listAuthMethods:', methods);
    const provider = methods?.authProviders?.find((p) => p.name === 'google');
    if (provider) {
      if (statusEl) statusEl.textContent = 'Ouverture de Google…';
      await pb.collection('users').authWithOAuth2({
        provider: provider.name,
        url: provider.authUrl,
        codeVerifier: provider.codeVerifier,
        redirectUrl,
      });
      return true;
    }
  } catch (e) {
    console.warn('listAuthMethods failed, tentative direct OAuth:', e);
  }

  // 2) Fallback: tentative d’appel direct avec le provider par nom
  if (statusEl) statusEl.textContent = 'Ouverture de Google…';
  await pb.collection('users').authWithOAuth2({ provider: 'google', redirectUrl });
  return true;
}

function bindGoogleLogin() {
  const btn = document.getElementById('google-login');
  const status = document.getElementById('status');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      if (status) status.textContent = '';
      const ok = await performOAuth(status);
      if (!ok || !pb.authStore.isValid) throw new Error('Auth store vide après OAuth');

      // Pose le cookie httpOnly côté serveur
      const cookie = pb.authStore.exportToCookie();
      const res = await fetch('/api/setAuthCookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Set cookie failed');

      localStorage.setItem('user', JSON.stringify(pb.authStore.model));
      window.location.href = '/';
    } catch (err) {
      console.error('Google OAuth error:', err);
      if (status) status.textContent = 'Provider Google non configuré ou redirect invalide. Voir console.';
    }
  });
}

document.addEventListener('DOMContentLoaded', bindGoogleLogin);
