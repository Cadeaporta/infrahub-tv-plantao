const API_URL = 'https://infrahub-monitor-api.vercel.app';

module.exports = async (req, res) => {
  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({ erro: 'method not allowed' });
  }

  try {
    const resposta = await fetch(`${API_URL}/api/admin/maquinas`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': process.env.ADMIN_SECRET
      },
      ...(req.method === 'PUT'
        ? { body: JSON.stringify(req.body || {}) }
        : {})
    });

    const texto = await resposta.text();

    res.status(resposta.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(texto);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'falha ao consultar API' });
  }
};
