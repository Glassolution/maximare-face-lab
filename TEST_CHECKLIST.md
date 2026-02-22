# Checklist de Testes - Sistema de Amigos

## Testes de Funcionalidade (Backend & Frontend)

- [ ] **Enviar Solicitação de Amizade**
    - [ ] Enviar para usuário existente (@username válido).
    - [ ] Tentar enviar para usuário inexistente (Erro: Usuário não encontrado).
    - [ ] Tentar enviar para si mesmo (Erro: Não permitido).
    - [ ] Tentar enviar solicitação duplicada (Erro: Já existe solicitação pendente).
    - [ ] Tentar enviar solicitação se já forem amigos (Erro: Já são amigos).
    - [ ] Enviar solicitação para usuário que bloqueou pedidos (Config `allow_friend_requests: none`).

- [ ] **Responder Solicitação**
    - [ ] Aceitar solicitação recebida.
        - [ ] Verificar se status muda para 'accepted'.
        - [ ] Verificar se ambos aparecem na lista de amigos um do outro.
    - [ ] Rejeitar solicitação recebida.
        - [ ] Verificar se status muda para 'rejected'.
        - [ ] Verificar se solicitação some da lista de pendentes.

- [ ] **Cancelar Solicitação**
    - [ ] Cancelar solicitação enviada pendente.
        - [ ] Verificar se status muda para 'canceled'.
        - [ ] Verificar se some da lista de enviadas.

- [ ] **Remover Amigo**
    - [ ] Remover amigo da lista.
        - [ ] Verificar se amigo é removido da lista local.
        - [ ] Verificar se você é removido da lista do amigo (testar com outra conta).

- [ ] **Privacidade**
    - [ ] Verificar se GER só aparece se `visibility_score` permitir.
    - [ ] Verificar se usuários bloqueados não recebem solicitações.

## Testes de Interface (UI/UX)

- [ ] **Navegação**
    - [ ] Aba "Amigos" aparece na barra de navegação.
    - [ ] Navegação entre as abas internas (Amigos, Solicitações, Buscar) funciona.

- [ ] **Busca**
    - [ ] Input de busca aceita username com ou sem @.
    - [ ] Botão de "Adicionar" fica desabilitado enquanto busca/envia.
    - [ ] Feedback visual (Toast) ao enviar/falhar.

- [ ] **Lista de Amigos**
    - [ ] Exibe avatar, nome, username corretamente.
    - [ ] Exibe Tier (Premium/Free) se aplicável.
    - [ ] Exibe GER se permitido.
    - [ ] Botão de remover amigo funciona com confirmação.

- [ ] **Lista de Solicitações**
    - [ ] Exibe solicitações recebidas com botões Aceitar/Recusar.
    - [ ] Exibe solicitações enviadas com botão Cancelar.
    - [ ] Atualiza a lista após ação.

## Testes de Segurança (RLS)

- [ ] Tentar ler `friend_requests` de outro usuário (Deve retornar vazio/erro).
- [ ] Tentar ler `friends` de outro usuário.
- [ ] Tentar inserir `friend_requests` com `requester_id` diferente do seu (Deve falhar).
