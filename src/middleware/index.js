export const onRequest = async (context, next) => {
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

