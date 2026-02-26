# Checklist de Testes Manuais - Sistema de Amigos

Este documento descreve os cenários de teste para validar o novo sistema de amigos.

## 1. Preparação
- [ ] Rodar a migração SQL `20260226000000_complete_friend_system.sql` no banco de dados.
- [ ] Ter 2 usuários criados (Usuário A e Usuário B).

## 2. Cenários

### A. Busca
1. **Buscar Usuário**
   - Usuário A busca por "@usuarioB" ou nome do Usuário B.
   - [ ] Resultado deve aparecer com botão "Adicionar".
   - [ ] Busca deve ter debounce (não disparar a cada letra imediatamente).

### B. Solicitação de Amizade
2. **Enviar Pedido**
   - Usuário A clica em "Adicionar" no perfil de B.
   - [ ] Botão muda para "Cancelar" (ou status "pending_sent").
   - [ ] Toast de sucesso aparece.
   - [ ] Na aba "Solicitações" de A, B aparece em "Enviadas".

3. **Receber Pedido**
   - Usuário B abre a aba "Solicitações".
   - [ ] Usuário A aparece em "Recebidas" com botões "Aceitar" e "Recusar".

4. **Cancelar Pedido**
   - Usuário A (antes de B aceitar) clica em "Cancelar".
   - [ ] Pedido some das listas de ambos.
   - [ ] Botão na busca volta para "Adicionar".

### C. Aceitar/Recusar
5. **Aceitar Pedido**
   - (Refazer passo 2)
   - Usuário B clica em "Aceitar".
   - [ ] Usuário A move para a lista "Amigos" de B.
   - [ ] Usuário B move para a lista "Amigos" de A.
   - [ ] Status na busca muda para "Amigos" (botões Unfriend/Block).

6. **Recusar Pedido**
   - (Refazer passo 2)
   - Usuário B clica em "Recusar".
   - [ ] Pedido some da lista.
   - [ ] Botão na busca volta para "Adicionar" (ou fica bloqueado por um tempo, dependendo da regra, mas aqui volta ao início).

### D. Gestão de Amigos
7. **Desfazer Amizade (Unfriend)**
   - Usuário A vai na lista de amigos, clica em "Desfazer" (ícone ou menu).
   - [ ] Confirmação aparece.
   - [ ] Após confirmar, B some da lista de A.
   - [ ] A some da lista de B.

### E. Bloqueio
8. **Bloquear Usuário**
   - Usuário A busca B (ou vai na lista de amigos).
   - Clica em "Bloquear".
   - [ ] B some da lista de amigos/pedidos.
   - [ ] A busca B novamente -> B aparece como "Bloqueado" (com opção de desbloquear) ou não aparece (se a busca filtrar bloqueados). *Nota: A implementação atual permite ver quem VOCÊ bloqueou na busca para poder desbloquear.*

9. **Usuário Bloqueado (Visão de B)**
   - Usuário B tenta buscar A.
   - [ ] A não deve aparecer nos resultados.
   - [ ] B não consegue enviar pedido para A.

10. **Desbloquear**
    - Usuário A busca B (que aparece como bloqueado).
    - Clica em "Desbloquear".
    - [ ] Status volta para "Adicionar".

### F. Segurança (RLS) e Integridade
11. **Duplicidade**
    - Tentar enviar pedido repetido via API/Console.
    - [ ] Deve retornar erro ou sucesso idempotente (não criar 2 linhas).

12. **Auto-adicionar**
    - Tentar adicionar a si mesmo.
    - [ ] Deve falhar.

13. **Ver dados alheios**
    - Tentar query direta no Supabase para ver friends de outro usuário.
    - [ ] Deve retornar vazio (RLS).
