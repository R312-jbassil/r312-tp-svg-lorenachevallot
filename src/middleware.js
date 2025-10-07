export const onRequest = async (context, next) => {
  if (context.url.pathname.startsWith('/api/')) {
    return next();
  }

  if (context.request.method === 'POST') {
    const form = await context.request.formData().catch(() => null);
    const lang = form?.get('language');

    if (lang === 'en' || lang === 'fr') {
      context.cookies.set('locale', String(lang), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });

      return Response.redirect(
        new URL(context.url.pathname + context.url.search, context.url),
        303,
      );
    }
  }

  const cookieLocale = context.cookies.get('locale')?.value;
  context.locals.lang = (cookieLocale === 'fr' || cookieLocale === 'en')
    ? cookieLocale
    : 'en';

  return next();
};

