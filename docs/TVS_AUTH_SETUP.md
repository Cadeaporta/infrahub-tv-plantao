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

## Variáveis de ambiente

No projeto Vercel do dashboard, mantenha `ADMIN_SECRET` apenas no servidor. Configure também `SUPABASE_URL` e, preferencialmente, `SUPABASE_PUBLISHABLE_KEY`. A chave publishable não é um segredo; a chave `service_role` nunca pode ser enviada ao navegador.

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

## Limites desta primeira etapa

A autenticação do dashboard e o controle de permissões nas rotas intermediárias estão implementados nesta branch. A aprovação de novas TVs, a trilha de auditoria, o histórico de eventos, o ciclo completo de status dos comandos e os perfis de navegação ainda precisam de implementação separada. Não liberar para produção antes de validar Preview e provisionar o primeiro administrador.
