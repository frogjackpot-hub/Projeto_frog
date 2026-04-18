# Manual de Gestao de Parceiros (versao corrigida)

Este manual foi corrigido com base no que esta implementado hoje no frontend e no backend.

---

## 1. Visao geral

O modulo de Parceiros faz 4 coisas principais:

- Transforma um usuario existente em parceiro.
- Gera comissoes em cima da perda liquida dos indicados.
- Controla validacao de comissoes (pendente -> validada).
- Permite saque de comissao com aprovacao/rejeicao por admin.

---

## 2. Como criar parceiro (Admin)

### 2.1 Regra mais importante

Para criar parceiro no modal Criar Parceiro, o campo obrigatorio principal e o ID do Usuario em formato UUID.

Exemplo de UUID valido:

- a7b8c9d0-e1f2-3456-bcde-789012345678

### 2.2 Campos reais do modal

Ao clicar em Gestao de Parceiros -> Criar Parceiro, o modal pede:

- ID do Usuario (UUID) - obrigatorio
- Tipo de Comissao:
  - RevShare (%) = percentage
  - CPA (R$) = fixed
- Porcentagem/Valor
- Limite minimo de perda (R$)

### 2.3 O que NAO existe no modal atual

No modal atual, nao existe campo para:

- Nome completo
- Email
- Codigo de indicacao manual

O codigo de indicacao e gerado automaticamente no backend.

### 2.4 Onde pegar o UUID do usuario

No painel admin, va em Gestao de Usuarios -> Perfil do Usuario.
O campo ID do Usuario e exibido na tela de perfil.

---

## 3. Fluxo de comissoes

### 3.1 Quando gera comissao

A comissao e processada quando o usuario indicado perde em uma rodada:

- perda liquida = aposta - ganho
- se perda liquida <= 0, nao gera comissao

### 3.2 Tipos de comissao

- RevShare (percentage):
  - comissao = perda liquida \* (percentual/100)
- CPA (fixed):
  - gera valor fixo somente se a perda liquida atingir o limite minimo (threshold)

### 3.3 Status de comissao

- pending: comissao aguardando periodo de validacao
- validated: comissao liberada para saldo do parceiro

### 3.4 Validacao de comissoes

A validacao pode acontecer de 2 formas:

- Automatica: pelo periodo de validacao configurado no parceiro (em horas)
- Manual: botao Validar Comissoes no painel admin

Quando valida, o sistema:

- tira do pending_commission
- soma em commission_balance
- soma em total_commissions_earned

---

## 4. Gestao de parceiros (tela admin)

### 4.1 Abas existentes

- Parceiros
- Saques
- Comissoes Pendentes
- Ranking

### 4.2 Metricas exibidas

- Parceiros ativos
- Indicados totais
- Comissoes pendentes (valor)
- Comissoes pagas (valor)
- Perdas geradas
- Saques pendentes

### 4.3 Filtros da aba Parceiros

- Busca por nome, email, codigo ou ID
- Status (ativo/bloqueado)
- Tipo de comissao (percentage/fixed)
- Periodo (hoje, 7 dias, 30 dias, personalizado)
- Ordenacao por colunas

### 4.4 Acoes por parceiro

- Ver detalhes
- Editar comissao
- Copiar codigo
- Copiar link de indicacao
- Gerar novo codigo
- Bloquear/Ativar
- Excluir

Observacao: ao excluir parceiro, o sistema remove dados de comissoes/saques vinculados e desvincula usuarios indicados.

---

## 5. Saques de parceiro

### 5.1 Regras para o parceiro sacar

- Valor deve ser maior que zero
- Valor deve ser menor ou igual ao saldo de comissao disponivel
- Nao pode existir outra solicitacao pendente para o mesmo parceiro

### 5.2 O que acontece ao solicitar saque

- Cria solicitacao com status pending
- Valor e reservado (descontado do commission_balance)

### 5.3 Revisao pelo admin

Na aba Saques, o admin revisa solicitacoes:

- Aprovar:
  - valor vai para saldo principal do usuario parceiro (users.balance)
- Rejeitar:
  - valor volta para commission_balance

No modal, ao rejeitar, o frontend exige observacao preenchida.

---

## 6. Conta de parceiro padrao (seed)

Foi configurado seed para conta parceira padrao:

- Email: bardoze@casino.com
- Senha: bardoze!@#$

Importante:

- Essa conta so aparece no banco se o arquivo de seed tiver sido executado.
- O registro tambem cria a linha correspondente na tabela partners.

---

## 7. Endpoints de Parceiros (API)

### 7.1 Publico

- GET /api/partners/validate-code/:code

### 7.2 Parceiro autenticado

- GET /api/partners/me
- GET /api/partners/me/referred-users
- GET /api/partners/me/commissions
- POST /api/partners/me/withdraw
- GET /api/partners/me/withdrawals

### 7.3 Admin

- POST /api/partners/admin/create
- GET /api/partners/admin/list
- GET /api/partners/admin/metrics
- GET /api/partners/admin/ranking
- GET /api/partners/admin/pending-commissions
- GET /api/partners/admin/export
- GET /api/partners/admin/withdrawals
- POST /api/partners/admin/validate-commissions
- GET /api/partners/admin/:partnerId
- PUT /api/partners/admin/:partnerId/config
- PATCH /api/partners/admin/:partnerId/toggle
- POST /api/partners/admin/:partnerId/regenerate-code
- DELETE /api/partners/admin/:partnerId
- GET /api/partners/admin/:partnerId/commissions
- GET /api/partners/admin/:partnerId/referred-users
- POST /api/partners/admin/withdrawals/:withdrawalId/review

---

## 8. Erros comuns e como resolver

### Erro: ID do usuario invalido

Causa:

- UUID mal formatado

Como resolver:

- copiar o ID direto do Perfil do Usuario no admin
- evitar espaco extra no inicio/fim

### Erro: Usuario nao encontrado

Causa:

- UUID nao existe na tabela users

Como resolver:

- validar se o usuario foi realmente criado

### Erro: Este usuario ja e um parceiro

Causa:

- ja existe registro em partners para esse user_id

Como resolver:

- usar outro usuario ou revisar parceiro ja existente

### Erro ao sacar: saldo insuficiente

Causa:

- valor maior que commission_balance

Como resolver:

- solicitar valor menor ou aguardar mais comissoes validadas

---

Se quiser, o proximo passo e eu criar uma versao curta (checklist operacional) para uso diario da equipe admin.
