const { validarUsuarioDashboard } = require('../dashboardAuth');
const API_URL = 'https://infrahub-monitor-api.vercel.app';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'method not allowed' });
  }

  const auth = await validarUsuarioDashboard(req);
  if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });

  const body = req.body || {};
  const maquina_id = String(body.maquina_id || '').trim();
  const tipo = String(body.tipo || '').trim().toLowerCase();
  const permitidos = new Set(['reload', 'navigate', 'navegar', 'abrir_urls', 'abrir_url']);
  if (!maquina_id || !tipo) {
    return res.status(400).json({ erro: 'maquina_id e tipo são obrigatórios' });
  }
  if (!permitidos.has(tipo)) {
    return res.status(400).json({ erro: 'tipo de comando não permitido nesta versão' });
  }

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  if (tipo === 'navigate' || tipo === 'navegar' || tipo === 'abrir_url') {
    const urls = tipo === 'abrir_url' ? (Array.isArray(payload.urls) ? payload.urls : [payload.url]) : [payload.url || payload.url_atual];
    if (!urls.length || urls.some((value) => {
      try { return !['http:', 'https:'].includes(new URL(String(value || '')).protocol); }
      catch { return true; }
    })) {
      return res.status(400).json({ erro: 'URL inválida; use HTTP ou HTTPS' });
    }
  }
  if (tipo === 'abrir_urls') {
    const urls = Array.isArray(payload.urls) ? payload.urls : (payload.url ? [payload.url] : []);
    if (!urls.length || urls.length > 10 || urls.some((value) => {
      try { return !['http:', 'https:'].includes(new URL(String(value || '')).protocol); }
      catch { return true; }
    })) {
      return res.status(400).json({ erro: 'Informe de 1 a 10 URLs HTTP/HTTPS válidas' });
    }
  }

  try {
    const resposta = await fetch(`${API_URL}/api/admin/comandos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      body: JSON.stringify(req.body || {})
    });

    const texto = await resposta.text();
    res.status(resposta.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(texto);
  } catch (erro) {
    console.error('[InfraHub] falha ao enviar comando:', erro);
    return res.status(500).json({ erro: 'falha ao enviar comando' });
  }
};
