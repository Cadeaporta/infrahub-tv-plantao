const { validarUsuarioDashboard } = require('../dashboardAuth');
const API_URL = 'https://infrahub-monitor-api.vercel.app';

module.exports = async (req, res) => {
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ erro: 'method not allowed' });
  }

  const auth = await validarUsuarioDashboard(req);
  if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });
  if (req.method !== 'GET' && auth.role !== 'admin') {
    return res.status(403).json({ erro: 'somente administradores podem alterar ou excluir TVs' });
  }

  try {
    const resposta = await fetch(`${API_URL}/api/admin/maquinas`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      ...(['PUT', 'DELETE'].includes(req.method)
        ? { body: JSON.stringify(req.body || {}) }
        : {})
    });

    const texto = await resposta.text();
    res.status(resposta.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(texto);
  } catch (erro) {
    console.error('[InfraHub] falha na rota de máquinas:', erro);
    return res.status(500).json({ erro: 'falha ao consultar API' });
  }
};
