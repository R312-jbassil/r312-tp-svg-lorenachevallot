export const POST = async ({ request, url }) => {
  try {
    const { cookie } = await request.json();
    if (!cookie || typeof cookie !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing cookie' }), { status: 400 });
    }
    // En dev (http), retirer Secure pour que le navigateur accepte le cookie
    let out = cookie;
    if (url?.protocol === 'http:') {
      out = out.replace(/; ?Secure/gi, '');
    }
    if (!/;\s*Path=\//i.test(out)) out += '; Path=/';
    if (!/;\s*SameSite=/i.test(out)) out += '; SameSite=Strict';
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': out,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }
};
