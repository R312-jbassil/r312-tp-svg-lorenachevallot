// src/pages/api/login.js
import pb from "../../utils/pb";
import { Collections } from "../../utils/pocketbase-types";

export const POST = async ({ request, url }) => {
  try {
    // Récupère l'email et le mot de passe envoyés dans la requête
    const { email, password } = await request.json();

    // Validation des données
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email et mot de passe requis",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Authentifie l'utilisateur avec PocketBase en utilisant email et mot de passe
    const authData = await pb
      .collection(Collections.Users)
      .authWithPassword(email, password);

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

    // Retourne les informations de l'utilisateur authentifié
    return new Response(
      JSON.stringify({
        success: true,
        user: authData.record,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err) {
    // En cas d'erreur d'authentification, retourne une erreur
    console.error("Erreur de connexion :", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email ou mot de passe invalide",
        message: "Identifiants incorrects. Veuillez réessayer.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
