const { validarUsuarioDashboard } = require('../dashboardAuth');
const API_URL = process.env.INFRAHUB_MONITOR_API_URL;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'method not allowed' });
  }

  const auth = await validarUsuarioDashboard(req);
  if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });

  if (!API_URL) return res.status(503).json({ erro: 'INFRAHUB_MONITOR_API_URL não configurada neste ambiente' });

  try {
    const resposta = await fetch(`${API_URL}/api/admin/maquinas`, {
      headers: { 'x-admin-secret': process.env.ADMIN_SECRET },
      cache: 'no-store'
    });

    const texto = await resposta.text();
    res.status(resposta.status);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(texto);
  } catch (erro) {
    console.error('[InfraHub] falha ao consultar máquinas:', erro);
    return res.status(500).json({ erro: 'falha ao consultar API' });
  }
};
