# Painel local de chamados Qualitor

Protótipo isolado do InfraHub TV: backend Python consulta a API do Qualitor em intervalo controlado e serve uma página local para o TabTurner. Não usa Vercel Functions, Supabase ou banco externo.

## Requisitos
- Windows com Python 3.10+ (sem dependências de terceiros).
- Credenciais/API key do Qualitor autorizadas pela TI.
- A máquina deve ter acesso de rede ao endpoint Qualitor.

## Instalação
1. Copie `.env.example` para `.env` e preencha os valores. **Não commite o `.env`.**
2. No PowerShell, dentro desta pasta, execute:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   .\run.ps1
   ```
3. Abra `http://127.0.0.1:8765` no navegador.
4. No TabTurner, adicione essa URL.

O servidor escuta em loopback por padrão (somente a própria máquina). Para acesso de outra máquina, não altere o bind antes de combinar com a TI e definir controles de acesso/firewall.

## Configuração
- `QUALITOR_BASE_URL`: base REST, sem barra final.
- `QUALITOR_API_KEY`, `QUALITOR_USER`, `QUALITOR_PASSWORD`, `QUALITOR_SCOPE`: credenciais fornecidas/confirmadas pela TI.
- `POLL_SECONDS`: intervalo entre consultas (padrão 120 s).
- `TICKET_LIMIT`: quantidade por consulta (padrão 100).
- `HOST` e `PORT`: bind local e porta.

O serviço autentica no início e reutiliza o JWT. Em resposta 401/403, tenta autenticar novamente uma vez. Falhas não apagam o último cache; a página exibe o horário da última atualização e o erro.

## Limitações / próximo passo
- MVP somente leitura; não executa alterações em chamados.
- A consulta usa `POST /ticket/list` com corpo vazio e parâmetros `limit`/`offset`. Ajuste os filtros conforme a documentação e permissões da instância.
- Os campos variam por configuração do Qualitor; a interface usa fallbacks para status, responsável/equipe e prazo.
- Antes de deixar ligado 24/7, confirmar limites/rate limit com o fornecedor/administrador, testar volume, autenticação e política de dados.
- Não exibir dados pessoais/sensíveis que não sejam necessários ao painel.
- Este protótipo não foi validado contra uma instância real e não deve ser tratado como pronto para produção.

## Arquitetura
TabTurner/browser -> Python local (HTML + endpoint JSON) -> cache em memória -> Qualitor API.
A página consulta somente o endpoint local; ela não chama Qualitor diretamente.
