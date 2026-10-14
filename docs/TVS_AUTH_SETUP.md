# Configuração inicial do login de InfraHub · TVs

## Modelo de acesso

- O login protege somente `/Tvs`; a página Plantão não recebe essa exigência.
- Não existe cadastro público. Usuários são criados por um administrador no Supabase Auth.
- Após criar o usuário, deve existir uma linha correspondente em `public.profiles`.
- `role = 'admin'`: acesso administrativo, incluindo cadastro/configuração/exclusão de TVs.
- `role = 'tecnico'`: apresentado como Operador; pode consultar e enviar comandos operacionais, mas não alterar cadastro nem excluir TVs.
- `ativo = false`: bloqueia o dashboard mesmo que a conta ainda exista no Auth.

## Provisionar o primeiro administrador

1. No Supabase do projeto `infrahub`, crie o usuário em **Authentication → Users** e confirme o e-mail conforme a política adotada.
2. Copie o UUID desse usuário.
3. Execute no SQL Editor, substituindo o UUID e o nome:

```sql
insert into public.profiles (id, full_name, role, ativo)
values ('UUID-DO-USUARIO', 'Administrador InfraHub', 'admin', true)
on conflict (id) do update
set full_name = excluded.full_name,
    role = 'admin',
    ativo = true;
```

Não habilite cadastro público e não conceda papel de administrador com base em metadados editáveis pelo próprio usuário.

## Login Microsoft 365 (Microsoft Entra ID)

1. No Microsoft Entra admin center, registre um aplicativo Web para o InfraHub. Configure a URI de redirecionamento da plataforma Web com o callback do Supabase:
   `https://koiiqafjmlnsdkijnwmi.supabase.co/auth/v1/callback`
2. No Supabase, abra **Authentication → Sign In / Providers → Azure** e habilite o provedor Azure. Informe o Client ID e Client Secret do aplicativo Entra. Se a organização exigir um tenant específico, configure o Tenant URL/ID do tenant corporativo, não o modo multitenant aberto.
3. No Azure, configure a permissão OIDC `email`, `openid` e `profile`. O botão da tela usa o provedor Supabase `azure` e retorna para `/Tvs/`.
4. A aplicação permite apenas os domínios `hospitalcare.com.br` e `hospitalveracruz.com.br`, com validação na tela e no backend. O domínio, sozinho, não concede acesso: o usuário também precisa de uma linha ativa em `public.profiles` e um papel autorizado.
5. Adicione a URL oficial e a URL de Preview em **Authentication → URL Configuration → Redirect URLs** do Supabase, conforme os ambientes que serão testados. Não promova Preview para produção para testar o SSO.

O registro no Entra e a configuração de Client ID/Secret são necessários para o botão funcionar. Não coloque o Client Secret em variáveis `NEXT_PUBLIC_*`, HTML ou JavaScript.

## Variáveis de ambiente

No projeto Vercel do dashboard, configure:
- `ADMIN_SECRET`: apenas no servidor.
- `SUPABASE_URL` e, preferencialmente, `SUPABASE_PUBLISHABLE_KEY`.
- `INFRAHUB_MONITOR_API_URL`: URL explícita do backend InfraHub Monitor para aquele ambiente.

As rotas de proxy devolvem HTTP 503 se `INFRAHUB_MONITOR_API_URL` não estiver configurada. Isso é intencional: um Preview não deve encaminhar aprovações, comandos ou geração de códigos para a API de produção por padrão. Configure a URL de Preview/desenvolvimento no ambiente Preview e a URL de produção somente no ambiente Production, após a validação. A chave publishable não é um segredo; a chave `service_role` nunca pode ser enviada ao navegador.

## Fechar leitura anônima do status das TVs

A tabela `maquinas_tv_status` tem atualmente uma política de leitura para `anon` e `authenticated`. Depois de validar o login em Preview, aplique a política abaixo no projeto Supabase para que o status não seja legível sem sessão:

```sql
drop policy if exists "Public can read TV status"
  on public.maquinas_tv_status;

create policy "Authenticated users can read TV status"
  on public.maquinas_tv_status
  for select
  to authenticated
  using (true);
```

A aplicação dessa política deve ser coordenada com a liberação do dashboard autenticado. Ela afeta somente leitura direta dessa tabela; não altera a página Plantão nem as rotas autenticadas do servidor.

## Estado e liberação

Esta branch inclui autenticação do dashboard, permissões por papel, aprovação/revogação de TVs, geração de códigos de cadastro de uso único e gestão de perfis. O backend e a extensão correspondentes devem estar no mesmo ambiente antes dos testes integrados.

A migração SQL não é aplicada automaticamente. A política anônima de `maquinas_tv_status` continua intacta até confirmar que a página Plantão funciona sem depender de leitura anônima direta dessa tabela. Não liberar para produção antes de validar Preview, provisionar o primeiro administrador e executar os testes integrados.
