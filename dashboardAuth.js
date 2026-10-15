const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://koiiqafjmlnsdkijnwmi.supabase.co').replace(/\/+$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Uv8bl8Ont7pAQju9WrBJww_aoR2KTSp';

async function validarUsuarioDashboard(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, status: 401, erro: 'sessão necessária' };

  const accessToken = match[1].trim();
  if (!accessToken) return { ok: false, status: 401, erro: 'sessão inválida' };

  try {
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`
      },
      cache: 'no-store'
    });

    if (!authResponse.ok) {
      return { ok: false, status: 401, erro: 'sessão expirada ou inválida' };
    }

    const user = await authResponse.json();
    if (!user || !user.id) return { ok: false, status: 401, erro: 'usuário inválido' };

    const email = String(user.email || '').trim().toLowerCase();
    const allowedDomains = new Set(['hospitalcare.com.br', 'hospitalveracruz.com.br', 'bragait.com']);
    const emailDomain = email.includes('@') ? email.split('@').pop() : '';
    if (!allowedDomains.has(emailDomain)) {
      return { ok: false, status: 403, erro: 'use uma conta corporativa @hospitalcare.com.br, @hospitalveracruz.com.br ou @bragait.com' };
    }

    const profileUrl = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
    profileUrl.searchParams.set('id', `eq.${user.id}`);
    profileUrl.searchParams.set('select', 'id,role,ativo');

    const profileResponse = await fetch(profileUrl, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`
      },
      cache: 'no-store'
    });

    if (!profileResponse.ok) {
      return { ok: false, status: 403, erro: 'não foi possível validar as permissões' };
    }

    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.ativo === false) {
      return { ok: false, status: 403, erro: 'usuário sem perfil ativo no InfraHub' };
    }

    const role = profile.role === 'admin' ? 'admin' :
      ['tecnico', 'operador', 'operator'].includes(profile.role) ? 'operator' : null;

    if (!role) return { ok: false, status: 403, erro: 'perfil sem permissão para o dashboard' };
    return { ok: true, user, role };
  } catch (error) {
    console.error('[InfraHub auth] falha ao validar sessão:', error);
    return { ok: false, status: 503, erro: 'falha ao validar autenticação' };
  }
}

module.exports = { validarUsuarioDashboard };
