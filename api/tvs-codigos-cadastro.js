const { validarUsuarioDashboard } = require('../dashboardAuth');
const API_URL = process.env.INFRAHUB_MONITOR_API_URL;

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ erro: 'method not allowed' });
  const auth = await validarUsuarioDashboard(req);
  if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });
  if (auth.role !== 'admin') return res.status(403).json({ erro: 'somente administradores podem gerar códigos de cadastro' });

  if (!API_URL) return res.status(503).json({ erro: 'INFRAHUB_MONITOR_API_URL não configurada neste ambiente' });

  try {
    const response = await fetch(`${API_URL}/api/admin/codigos-cadastro`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      ...(req.method === 'POST'
        ? { body: JSON.stringify({ ...(req.body || {}), criado_por: auth.user.id }) }
        : {})
    });
    const text = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (error) {
    console.error('[InfraHub] falha ao gerenciar códigos de cadastro:', error);
    return res.status(500).json({ erro: 'falha ao gerenciar códigos de cadastro' });
  }
};
