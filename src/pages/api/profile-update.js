import pb from "../../utils/pb";

export const POST = async ({ request, url }) => {
  try {
    // Charger l'authentification depuis les cookies
    pb.authStore.loadFromCookie(request.headers.get("cookie") ?? "");

    // Vérifier que l'utilisateur est authentifié
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Session invalide. Veuillez vous déconnecter puis vous reconnecter.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const form = await request.formData();

    // Récupérer les données du formulaire
    const currentPassword = form.get("currentPassword");
    const newPassword = form.get("password");
    const newPasswordConfirm = form.get("passwordConfirm");
    const username = form.get("username");
    const email = form.get("email");
    const name = form.get("name");
    const avatar = form.get("avatar");

    const userId = pb.authStore.record.id;
    const currentUser = pb.authStore.record;

    // Validation du changement de mot de passe
    if (newPassword || newPasswordConfirm) {
      if (!currentPassword) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Veuillez saisir votre mot de passe actuel pour le modifier",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (newPassword !== newPasswordConfirm) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Les nouveaux mots de passe ne correspondent pas",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Vérifier le mot de passe actuel
      try {
        await pb
          .collection("users")
          .authWithPassword(currentUser.email, String(currentPassword));
      } catch (e) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Mot de passe actuel incorrect",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Préparer les données de mise à jour
    const updateData = {};

    // Ajouter les champs qui ont changé
    if (username && username !== currentUser.username) {
      updateData.username = String(username);
    }
    if (name && name !== currentUser.name) {
      updateData.name = String(name);
    }
    if (email && email !== currentUser.email) {
      updateData.email = String(email);
      // PocketBase nécessite emailVisibility lors du changement d'email
      updateData.emailVisibility = currentUser.emailVisibility ?? true;
    }
    if (newPassword) {
      updateData.password = String(newPassword);
      updateData.passwordConfirm = String(newPasswordConfirm);
      // Si on change le mot de passe, on doit fournir l'ancien
      updateData.oldPassword = String(currentPassword);
    }

    // Mettre à jour l'utilisateur
    let record = currentUser;

    // Mise à jour des champs texte
    if (Object.keys(updateData).length > 0) {
      record = await pb.collection("users").update(userId, updateData);
    }

    // Mettre à jour l'avatar séparément si présent
    if (
      avatar &&
      typeof avatar === "object" &&
      "name" in avatar &&
      avatar.name
    ) {
      const avatarFormData = new FormData();
      avatarFormData.append("avatar", avatar);
      record = await pb.collection("users").update(userId, avatarFormData);
    }

    // Mettre à jour le cookie d'authentification
    let cookieHeader = pb.authStore.exportToCookie();

    // En dev (http), retirer Secure pour que le navigateur accepte le cookie
    if (url?.protocol === "http:") {
      cookieHeader = cookieHeader.replace(/; ?Secure/gi, "");
    }

    // S'assurer que les attributs nécessaires sont présents
    if (!/;\s*Path=\//i.test(cookieHeader)) {
      cookieHeader += "; Path=/";
    }
    if (!/;\s*SameSite=/i.test(cookieHeader)) {
      cookieHeader += "; SameSite=Strict";
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: record,
        message: "Profil mis à jour avec succès",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (e) {
    console.error("Erreur de mise à jour du profil:", e);

    // Gestion des erreurs spécifiques
    let errorMessage = "Erreur lors de la mise à jour du profil";

    if (e.response?.data) {
      const errorData = e.response.data;
      if (errorData.username) {
        errorMessage = "Ce nom d'utilisateur est déjà pris";
      } else if (errorData.email) {
        errorMessage = "Cette adresse e-mail est déjà utilisée";
      } else if (errorData.password) {
        errorMessage = "Le mot de passe ne respecte pas les critères requis";
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: e?.response?.data || null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
