import pb from "../../utils/pb";

export async function POST({ request, url }) {
  try {
    const data = await request.json();

    // Validation des données
    if (
      !data.username ||
      !data.email ||
      !data.password ||
      !data.passwordConfirm
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Tous les champs sont requis",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (data.password !== data.passwordConfirm) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Les mots de passe ne correspondent pas",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (data.password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Le mot de passe doit contenir au moins 8 caractères",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Créer l'utilisateur dans PocketBase
    const userData = {
      username: data.username,
      email: data.email,
      password: data.password,
      passwordConfirm: data.passwordConfirm,
    };

    const createdUser = await pb.collection("users").create(userData);

    // Envoyer l'email de vérification (optionnel)
    try {
      await pb.collection("users").requestVerification(data.email);
    } catch (verifyError) {
      console.warn(
        "Erreur lors de l'envoi de l'email de vérification:",
        verifyError
      );
      // On continue même si l'email de vérification échoue
    }

    // Connecter automatiquement l'utilisateur après inscription
    try {
      const authData = await pb
        .collection("users")
        .authWithPassword(data.email, data.password);

      // Exporte le cookie d'authentification de PocketBase (format complet)
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
          user: authData.record,
          message: "Inscription réussie ! Vous êtes maintenant connecté.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": cookieHeader,
          },
        }
      );
    } catch (loginError) {
      console.error("Erreur lors de la connexion automatique:", loginError);
      // Si la connexion automatique échoue, on retourne quand même le succès d'inscription
      return new Response(
        JSON.stringify({
          success: true,
          message: "Inscription réussie ! Veuillez vous connecter.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);

    // Gestion des erreurs spécifiques de PocketBase
    if (error.response?.data) {
      const errorData = error.response.data;
      let errorMessage = "Erreur lors de l'inscription";

      // Messages d'erreur personnalisés selon le type d'erreur
      if (errorData.email) {
        errorMessage = "Cette adresse e-mail est déjà utilisée";
      } else if (errorData.username) {
        errorMessage = "Ce nom d'utilisateur est déjà pris";
      } else if (errorData.password) {
        errorMessage = "Le mot de passe ne respecte pas les critères requis";
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          details: errorData,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Erreur interne du serveur",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
