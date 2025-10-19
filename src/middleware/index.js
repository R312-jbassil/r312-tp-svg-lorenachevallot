import pb from "../utils/pb";

export const onRequest = async (context, next) => {
  // Charger l'authentification depuis les cookies
  pb.authStore.loadFromCookie(context.request.headers.get("cookie") ?? "");

  // Vérifier si l'authentification est valide
  if (pb.authStore.isValid && pb.authStore.record) {
    try {
      // Vérifier que le token est toujours valide en faisant une requête test
      // Cela évite les problèmes de sessions expirées
      await pb.collection("users").authRefresh();
      context.locals.user = pb.authStore.record;
    } catch (error) {
      // Si le refresh échoue, la session est invalide
      console.warn("Session expirée ou invalide:", error);
      pb.authStore.clear();
      context.locals.user = null;
    }
  } else {
    context.locals.user = null;
  }

  // Pour les routes API, on exige l'authentification sauf pour /api/login, /api/signup et /api/setAuthCookie
  if (context.url.pathname.startsWith("/api/")) {
    const publicApiRoutes = ["/api/login", "/api/signup", "/api/setAuthCookie"];
    const isPublicRoute = publicApiRoutes.some(
      (route) => context.url.pathname === route
    );

    if (!context.locals.user && !isPublicRoute) {
      // Si l'utilisateur n'est pas connecté, on retourne une erreur 401 (non autorisé)
      return new Response(
        JSON.stringify({
          error: "Non autorisé",
          message: "Vous devez être connecté pour accéder à cette ressource",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return next(); // Continue le traitement normal
  }

  // Pour les autres pages, si l'utilisateur n'est pas connecté, on le redirige vers /login
  // Ne pas bloquer les assets/modules du dev server (Vite) ni la page de redirection OAuth
  const p = context.url.pathname;
  const isAsset =
    p.startsWith("/_astro") ||
    p.startsWith("/@fs") ||
    p.startsWith("/@id") ||
    p.startsWith("/@vite") ||
    p.startsWith("/src") ||
    p.startsWith("/node_modules") ||
    p.startsWith("/assets") ||
    p.startsWith("/favicon") ||
    p.startsWith("/_image");

  const publicPages = ["/login", "/signup", "/", "/oauth2-redirect"];
  const isPublicPage = publicPages.some((page) => p === page);

  if (!context.locals.user && !isAsset && !isPublicPage) {
    return Response.redirect(new URL("/login", context.url), 303);
  }

  // Handle language change form submission
  if (context.request.method === "POST") {
    const form = await context.request.formData().catch(() => null);
    const lang = form?.get("language");

    if (lang === "en" || lang === "fr") {
      context.cookies.set("locale", String(lang), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });

      // Redirect to same page via GET to avoid resubmitting the form
      return Response.redirect(
        new URL(context.url.pathname + context.url.search, context.url),
        303
      );
    }
  }

  // Decide locale for this request
  const cookieLocale = context.cookies.get("locale")?.value;

  // Prefer cookie if valid, else preferred browser locale, else 'en'
  context.locals.lang =
    cookieLocale === "fr" || cookieLocale === "en"
      ? cookieLocale
      : context.preferredLocale ?? "en";

  return next();
};
