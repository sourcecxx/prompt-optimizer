// Cloudflare Pages Function — API Auth (替代 Vercel middleware.js)
// 提供 /api/auth 端点用于密码验证和 Cookie 管理

export async function onRequestPost(context) {
  const { params, env } = context;
  const accessPassword = env.ACCESS_PASSWORD;

  // 读取请求体
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { password, action } = body;

  // 无密码保护时直接返回成功
  if (!accessPassword) {
    return new Response(
      JSON.stringify({ success: true, message: 'No password protection configured' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 验证密码
  if (action === 'verify') {
    if (password === accessPassword) {
      const response = new Response(
        JSON.stringify({ success: true, message: 'Authentication successful' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      // 设置 Cookie
      response.headers.append(
        'Set-Cookie',
        `vercel_access_token=${accessPassword}; Path=/; Max-Age=604800; SameSite=Strict`
      );
      return response;
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // 登出 — 清除 Cookie
  if (action === 'logout') {
    const response = new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    response.headers.append('Set-Cookie', 'vercel_access_token=; Path=/; Max-Age=0');
    return response;
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Auth endpoint' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
