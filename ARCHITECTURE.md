# Arquitetura do Sistema de Amigos

## Visão Geral
O sistema de amigos permite que usuários do Maximare se conectem, enviem solicitações de amizade e visualizem o progresso uns dos outros. A arquitetura é baseada no Supabase (PostgreSQL) para armazenamento e segurança, com lógica de negócios implementada via RPC (Stored Procedures) para garantir integridade e atomicidade.

## Banco de Dados

### Tabelas

1.  **friend_requests**
    *   Armazena solicitações de amizade pendentes, aceitas, rejeitadas ou canceladas.
    *   `requester_id` (FK -> auth.users): Quem enviou.
    *   `addressee_id` (FK -> auth.users): Quem recebeu.
    *   `status`: 'pending', 'accepted', 'rejected', 'canceled'.
    *   Constraint UNIQUE: Garante apenas uma solicitação entre dois usuários.

2.  **friends**
    *   Armazena as conexões de amizade confirmadas.
    *   A relação é bidirecional: Ao aceitar, duas linhas são inseridas (A->B e B->A) para facilitar consultas simples (sem necessidade de OR complexo).
    *   `user_id` (FK -> auth.users)
    *   `friend_id` (FK -> auth.users)

3.  **profiles** (Atualizado)
    *   Novos campos para privacidade:
        *   `visibility_score`: 'public', 'friends', 'private'. Controla quem vê o GER/Tier.
        *   `allow_friend_requests`: 'public', 'username_only', 'none'. Controla quem pode enviar solicitações.

### Row Level Security (RLS)

*   **friend_requests**:
    *   SELECT: Permitido se o usuário for `requester_id` ou `addressee_id`.
    *   INSERT: Permitido apenas se `auth.uid() = requester_id`.
    *   UPDATE: Permitido apenas para os envolvidos (para aceitar/rejeitar/cancelar).
*   **friends**:
    *   SELECT: Permitido apenas se `auth.uid() = user_id`.
    *   DELETE: Permitido apenas se `auth.uid() = user_id`.

## Backend Logic (RPC / Functions)

Todas as operações críticas são encapsuladas em funções PostgreSQL (RPC) para garantir validação e atomicidade.

1.  `send_friend_request(target_username)`:
    *   Busca o usuário pelo username.
    *   Verifica configurações de privacidade (`allow_friend_requests`).
    *   Verifica se já são amigos.
    *   Verifica se já existe solicitação pendente (em qualquer direção).
    *   Insere a solicitação.

2.  `respond_friend_request(request_id, action)`:
    *   Valida se o usuário é o destinatário.
    *   Atualiza o status da solicitação.
    *   Se `action = 'accepted'`, insere as duas linhas na tabela `friends` atomicamente.

3.  `cancel_friend_request(request_id)`:
    *   Permite ao remetente cancelar uma solicitação pendente.

4.  `remove_friend(target_friend_id)`:
    *   Remove a conexão de amizade em ambas as direções.

## Frontend (React/Expo)

*   **Hooks**:
    *   `useFriends`: Gerencia a lista de amigos, carregando perfis e scores (respeitando privacidade).
    *   `useFriendRequests`: Gerencia solicitações de entrada e saída.
*   **Componentes**:
    *   `Friends.tsx`: Página principal com abas para Lista, Solicitações e Busca.
    *   Interface responsiva usando Shadcn/UI.

## Segurança e Escalabilidade

*   **Integridade**: Constraints de banco de dados impedem auto-amizade e duplicações.
*   **Performance**: Índices em colunas de busca (implícitos nas FKs e PKs).
*   **Privacidade**: RLS garante que usuários só vejam seus próprios dados. Lógica de visibilidade aplicada no frontend e backend.
