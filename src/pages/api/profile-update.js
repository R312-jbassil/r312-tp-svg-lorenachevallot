import PocketBase from 'pocketbase';

export const POST = async ({ request }) => {
  try {
    const pb = new PocketBase('http://127.0.0.1:8090');
    pb.authStore.loadFromCookie(request.headers.get('cookie') ?? '');
    if (!pb.authStore.isValid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const form = await request.formData();

    // Optional: verify current password before changing password
    const currentPassword = form.get('currentPassword');
    const newPassword = form.get('password');
    const newPasswordConfirm = form.get('passwordConfirm');

    if ((newPassword || newPasswordConfirm) && (!currentPassword || newPassword !== newPasswordConfirm)) {
      return new Response(JSON.stringify({ error: 'Invalid password payload' }), { status: 400 });
    }

    if (currentPassword) {
      try {
        const email = pb.authStore?.record?.email || '';
        await pb.collection('users').authWithPassword(email, String(currentPassword));
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Current password incorrect' }), { status: 403 });
      }
    }

    const updateData = new FormData();
    const username = form.get('username');
    const email = form.get('email');
    const name = form.get('name');
    const avatar = form.get('avatar');

    const userId = pb.authStore.record.id;
    const currentUser = pb.authStore.record;

    // Ajouter les champs qui ont changé
    if (username && username !== currentUser.username) {
      updateData.append('username', String(username));
    }
    if (name && name !== currentUser.name) {
      updateData.append('name', String(name));
    }

    // Pour l'email, ajouter emailVisibility pour éviter l'erreur de validation
    if (email && email !== currentUser.email) {
      updateData.append('email', String(email));
      updateData.append('emailVisibility', String(currentUser.emailVisibility ?? true));
    }

    if (newPassword) {
      updateData.append('password', String(newPassword));
      updateData.append('passwordConfirm', String(newPasswordConfirm ?? newPassword));
    }

    // Mettre à jour les champs seulement s'il y a des changements
    let record = currentUser;
    if (Array.from(updateData.keys()).length > 0) {
      record = await pb.collection('users').update(userId, updateData);
    }

    // Mettre à jour l'avatar séparément si présent
    if (avatar && typeof avatar === 'object' && 'name' in avatar) {
      const avatarFormData = new FormData();
      avatarFormData.append('avatar', avatar);
      record = await pb.collection('users').update(userId, avatarFormData);
    }

    // Export cookie (refresh token/state)
    let outCookie = pb.authStore.exportToCookie();
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      outCookie = outCookie.replace(/; ?Secure/gi, '');
    }
    if (!/;\s*Path=\//i.test(outCookie)) outCookie += '; Path=/';
    if (!/;\s*SameSite=/i.test(outCookie)) outCookie += '; SameSite=Strict';

    return new Response(JSON.stringify({ success: true, user: record }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': outCookie,
      },
    });
  } catch (e) {
    console.error('Profile update error:', e);
    const errorMsg = e?.message || e?.toString() || 'Update failed';
    return new Response(JSON.stringify({ error: errorMsg, details: e?.data || null }), { status: 500 });
  }
};
