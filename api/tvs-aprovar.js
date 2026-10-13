const { validarUsuarioDashboard } = require('../dashboardAuth');
const API_URL = 'https://infrahub-monitor-api.vercel.app';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'method not allowed' });
  const auth = await validarUsuarioDashboard(req);
  if (!auth.ok) return res.status(auth.status).json({ erro: auth.erro });
  if (auth.role !== 'admin') return res.status(403).json({ erro: 'somente administradores podem aprovar ou revogar TVs' });

  const body = req.body || {};
  const id = String(body.id || '').trim();
  const action = String(body.action || '').trim();
  if (!id || !['aprovar', 'revogar'].includes(action)) {
    return res.status(400).json({ erro: 'id e action (aprovar|revogar) são obrigatórios' });
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/aprovar-maquina`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      body: JSON.stringify({ id, action, aprovada_por: auth.user.id })
    });
    const text = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (error) {
    console.error('[InfraHub] falha ao aprovar/revogar TV:', error);
    return res.status(500).json({ erro: 'falha ao aprovar ou revogar TV' });
  }
};
