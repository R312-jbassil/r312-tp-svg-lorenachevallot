import pb from '../utils/pb';

async function performOAuth(statusEl) {
  const redirectUrl = `${window.location.origin}/oauth2-redirect`;
  try {
    const methods = await pb.collection('users').listAuthMethods();
    console.debug('listAuthMethods:', methods);
    const provider = methods?.authProviders?.find((p) => p.name === 'github');
    if (provider) {
      if (statusEl) statusEl.textContent = 'Ouverture de GitHub…';
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

  if (statusEl) statusEl.textContent = 'Ouverture de GitHub…';
  await pb.collection('users').authWithOAuth2({ provider: 'github', redirectUrl });
  return true;
}

function bindGithubLogin() {
  const btn = document.getElementById('github-login');
  const status = document.getElementById('status');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      if (status) status.textContent = '';
      const ok = await performOAuth(status);
      if (!ok || !pb.authStore.isValid) throw new Error('Auth store vide après OAuth');

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
      console.error('GitHub OAuth error:', err);
      if (status) status.textContent = 'Provider GitHub non configuré ou redirect invalide. Voir console.';
    }
  });
}

document.addEventListener('DOMContentLoaded', bindGithubLogin);

