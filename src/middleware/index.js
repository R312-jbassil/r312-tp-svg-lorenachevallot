import pb from "../utils/pb";

export const onRequest = async (context, next) => {
  pb.authStore.loadFromCookie(context.request.headers.get('cookie') ?? '');
  if (pb.authStore.isValid) {
    context.locals.user = pb.authStore.record;
  }
  

  // Pour les routes API, on exige l'authentification sauf pour /api/login et /api/signup
  if (context.url.pathname.startsWith('/api/')) {
    if (!context.locals.user && context.url.pathname !== '/api/login' && context.url.pathname !== '/api/signup' && context.url.pathname !== '/api/setAuthCookie') {
      // Si l'utilisateur n'est pas connecté, on retourne une erreur 401 (non autorisé)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return next(); // Continue le traitement normal
  }

  // Pour les autres pages, si l'utilisateur n'est pas connecté, on le redirige vers /login
  // Ne pas bloquer les assets/modules du dev server (Vite) ni la page de redirection OAuth
  const p = context.url.pathname;
  const isAsset = p.startsWith('/_astro') || p.startsWith('/@fs') || p.startsWith('/@id') || p.startsWith('/@vite') || p.startsWith('/src') || p.startsWith('/node_modules') || p.startsWith('/assets') || p.startsWith('/favicon') || p.startsWith('/_image');
  if (!context.locals.user) {
    if (!isAsset && p !== '/login' && p !== '/signup' && p !== '/' && p !== '/oauth2-redirect')
      return Response.redirect(new URL('/login', context.url), 303);
  }
  // Skip middleware for API routes
  if (context.url.pathname.startsWith('/api/')) {
    return next();
  }

  // Handle language change form submission
  if (context.request.method === 'POST') {
    const form = await context.request.formData().catch(() => null);
    const lang = form?.get('language');

    if (lang === 'en' || lang === 'fr') {
      context.cookies.set('locale', String(lang), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });

      // Redirect to same page via GET to avoid resubmitting the form
      return Response.redirect(
        new URL(context.url.pathname + context.url.search, context.url),
        303,
      );
    }
  }

  // Decide locale for this request
  const cookieLocale = context.cookies.get('locale')?.value;

  // Prefer cookie if valid, else preferred browser locale, else 'en'
  context.locals.lang = (cookieLocale === 'fr' || cookieLocale === 'en')
    ? cookieLocale
    : (context.preferredLocale) ?? 'en';

  return next();
};


