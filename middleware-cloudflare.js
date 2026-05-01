// Cloudflare Pages Middleware — 替代 Vercel middleware.js
// 在构建时注入 ACCESS_PASSWORD，用于页面级访问控制

export const onRequest = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 跳过 API 路由和静态资源
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('.') || 
      url.pathname.startsWith('/assets/')) {
    return await next();
  }

  const accessPassword = env.ACCESS_PASSWORD;

  // 无密码保护时直接放行
  if (!accessPassword) {
    return await next();
  }

  // 检查 Cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const accessTokenMatch = cookieHeader.match(/vercel_access_token=([^;]+)/);
  
  if (accessTokenMatch && accessTokenMatch[1] === accessPassword) {
    return await next();
  }

  // 未认证，返回登录页面
  const acceptLanguage = request.headers.get('accept-language') || '';
  const preferChinese = acceptLanguage.includes('zh');

  return new Response(generateAuthPage(preferChinese), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

function generateAuthPage(isChinese) {
  const text = {
    title: isChinese ? '访问验证 - Prompt Optimizer' : 'Access Verification',
    heading: 'Prompt Optimizer',
    subtitle: isChinese ? '此站点受密码保护' : 'This site is password protected',
    passwordLabel: isChinese ? '访问密码' : 'Access Password',
    passwordPlaceholder: isChinese ? '请输入访问密码' : 'Enter access password',
    submitButton: isChinese ? '验证并访问' : 'Verify & Access',
    loading: isChinese ? '验证中，请稍候...' : 'Verifying, please wait...',
    footer: isChinese ? '安全访问控制 | Powered by Cloudflare' : 'Secure Access Control | Powered by Cloudflare',
    errorNetwork: isChinese ? '网络错误，请重试' : 'Network error, please try again',
  };

  return `<!DOCTYPE html>
<html lang="${isChinese ? 'zh-CN' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${text.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center}
.auth-modal{background:white;padding:2.5rem;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);width:100%;max-width:400px;text-align:center}
@keyframes fadeIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
.auth-modal{animation:fadeIn .3s ease-out}
.logo{font-size:2rem;margin-bottom:1rem;color:#667eea}h1{font-size:1.5rem;color:#333;margin-bottom:.5rem}
.subtitle{color:#666;margin-bottom:2rem;font-size:.9rem}
.form-group{margin-bottom:1.5rem;text-align:left}label{display:block;margin-bottom:.5rem;color:#333;font-weight:500}
input[type=password]{width:100%;padding:.75rem;border:2px solid #e1e5e9;border-radius:6px;font-size:1rem;transition:border-color .3s}
input[type password]:focus{outline:none;border-color:#667eea}
.submit-btn{width:100%;padding:.75rem;background:#667eea;color:white;border:none;border-radius:6px;font-size:1rem;font-weight:500;cursor:pointer}
.submit-btn:hover:not(:disabled){background:#5a6fd8}
.error-message{color:#e74c3c;margin-top:1rem;font-size:.9rem;display:none;padding:.5rem;background:#ffeaea;border-radius:4px}
.loading{display:none;margin-top:1rem;color:#667eea}
.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.8rem;color:#999}
</style>
</head>
<body>
<div class="auth-modal">
<div class="logo">&#x1F680;</div>
<h1>${text.heading}</h1>
<p class="subtitle">${text.subtitle}</p>
<form id="authForm">
<div class="form-group">
<label for="password">${text.passwordLabel}</label>
<input type="password" id="password" name="password" required placeholder="${text.passwordPlaceholder}" autocomplete="current-password">
</div>
<button type="submit" class="submit-btn" id="submitBtn"><span id="btnText">${text.submitButton}</span></button>
<div class="error-message" id="errorMessage"></div>
<div class="loading" id="loading">${text.loading}</div>
</form>
<div class="footer">${text.footer}</div>
</div>
<script>
const form=document.getElementById('authForm'),submitBtn=document.getElementById('submitBtn'),btnText=document.getElementById('btnText'),errorMessage=document.getElementById('errorMessage'),loading=document.getElementById('loading'),passwordInput=document.getElementById('password');
form.addEventListener('submit',async(e)=>{e.preventDefault();const password=passwordInput.value.trim();if(!password)return;submitBtn.disabled=true;btnText.style.display='none';loading.style.display='block';errorMessage.style.display='none';try{const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({action:'verify',password})});const data=await response.json();if(data.success){window.location.reload()}else{errorMessage.textContent=data.message||'密码错误，请重试';errorMessage.style.display='block'}}catch(error){errorMessage.textContent='${text.errorNetwork}';errorMessage.style.display='block'}finally{submitBtn.disabled=false;btnText.style.display='inline';loading.style.display='none'}});
passwordInput.addEventListener('input',()=>{errorMessage.style.display='none'});
</script>
</body>
</html>`;
}
