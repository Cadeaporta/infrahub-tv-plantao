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
