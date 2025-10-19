const form = document.getElementById('profile-form');
const statusEl = document.getElementById('status');
const avatarInput = document.getElementById('avatar');
const avatarTrigger = document.getElementById('avatar-trigger');
const avatarImg = document.getElementById('avatar-img');
const avatarPlaceholder = document.getElementById('avatar-placeholder');
const tabInfo = document.getElementById('tab-info');
const tabSec = document.getElementById('tab-security');
const panelInfo = document.getElementById('panel-info');
const panelSec = document.getElementById('panel-security');

function setStatus(msg, kind = 'info') {
  if (!statusEl) return;
  const colors = {
    info: 'text-base-content/70',
    success: 'text-success',
    error: 'text-error',
  };
  statusEl.className = `md:col-span-2 text-sm text-center ${colors[kind] || colors.info}`;
  statusEl.textContent = msg || '';
}

if (avatarTrigger && avatarInput) {
  avatarTrigger.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (avatarImg) {
        avatarImg.src = url;
      } else if (avatarPlaceholder) {
        const img = document.createElement('img');
        img.id = 'avatar-img';
        img.alt = 'Avatar';
        img.className = 'w-full h-full object-cover';
        img.src = url;
        avatarPlaceholder.replaceWith(img);
      }
    }
  });
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Enregistrement…');

    const fd = new FormData(form);

    const pw = fd.get('password');
    const pwc = fd.get('passwordConfirm');
    const cur = fd.get('currentPassword');
    if ((pw || pwc) && pw !== pwc) {
      setStatus('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    // Si l’utilisateur veut changer le mot de passe, on conseille de mettre l’actuel
    if ((pw || pwc) && !cur) {
      setStatus('Veuillez saisir votre mot de passe actuel.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/profile-update', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || 'Echec de la mise à jour');
      }
      const data = await res.json();
      if (data?.user) {
        try { localStorage.setItem('user', JSON.stringify(data.user)); } catch { }
      }
      setStatus('Profil mis à jour.', 'success');

      // Recharger la page après 500ms pour afficher les changements partout
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      setStatus('Erreur lors de la mise à jour du profil.', 'error');
    }
  });
}

// Simple tabs toggle (no scroll layout)
function activateTab(which) {
  if (!tabInfo || !tabSec || !panelInfo || !panelSec) return;
  if (which === 'security') {
    tabInfo.classList.remove('tab-active');
    tabSec.classList.add('tab-active');
    panelInfo.classList.add('hidden');
    panelSec.classList.remove('hidden');
  } else {
    tabSec.classList.remove('tab-active');
    tabInfo.classList.add('tab-active');
    panelSec.classList.add('hidden');
    panelInfo.classList.remove('hidden');
  }
}

if (tabInfo && tabSec) {
  tabInfo.addEventListener('click', () => activateTab('info'));
  tabSec.addEventListener('click', () => activateTab('security'));
}
