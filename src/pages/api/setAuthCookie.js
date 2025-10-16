export const POST = async ({ request }) => {
  try {
    const { cookie } = await request.json();
    if (!cookie || typeof cookie !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing cookie' }), { status: 400 });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }
};

