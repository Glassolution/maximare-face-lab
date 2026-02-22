# Checklist de Testes - Sistema de Duelos (Battles)

## Testes de Funcionalidade (Backend & Frontend)

- [ ] **Desafiar Amigo**
    - [ ] Abrir modal "Novo Duelo".
    - [ ] Buscar amigo por nome/username.
    - [ ] Enviar desafio.
    - [ ] Verificar se aparece na aba "Ativos" como pendente (outgoing).
    - [ ] Verificar se aparece para o amigo na aba "Ativos" como solicitação (incoming).

- [ ] **Responder Desafio**
    - [ ] Aceitar desafio:
        - [ ] Status muda para "Aguardando" (waiting_upload).
        - [ ] Botão "Enviar Foto" aparece para ambos.
    - [ ] Recusar desafio:
        - [ ] Duelo vai para histórico como "Rejeitado" ou some da lista ativa.

- [ ] **Fluxo de Batalha**
    - [ ] Usuário A clica em "Enviar Foto".
    - [ ] Redireciona para `/analysis?start=true&battleId=...`.
    - [ ] Completa análise (foto frontal/lateral).
    - [ ] Upload da foto para bucket `battle-images` ocorre com sucesso.
    - [ ] RPC `submit_battle_move` é chamado.
    - [ ] Redireciona de volta para `/battles`.
    - [ ] Card mostra "Foto enviada" (check verde).
    - [ ] Repetir para Usuário B.

- [ ] **Resultado Final**
    - [ ] Assim que o segundo usuário envia, o status muda para `finished`.
    - [ ] Duelo move para a aba "Histórico".
    - [ ] Clicar no card do histórico abre modal de resultado.
    - [ ] Vencedor vê "VENCEDOR" (verde).
    - [ ] Perdedor vê "MOGGADO" (vermelho) e overlay.
    - [ ] Scores e motivo da vitória são exibidos corretamente.

## Testes de Segurança

- [ ] **Tentativa de Manipulação**
    - [ ] Tentar chamar `submit_battle_move` com score falso (via console/RPC direto) -> Deve falhar pois o RPC busca o score na tabela `analysis_history`.
    - [ ] Tentar ver duelos de outros usuários -> RLS deve bloquear.
    - [ ] Tentar desafiar não-amigo -> RPC deve bloquear.

## Testes de Interface

- [ ] Responsividade em mobile.
- [ ] Avatar e nomes carregam corretamente.
- [ ] Realtime: A lista atualiza automaticamente quando o oponente aceita/envia foto?

## Configuração Necessária

- [ ] Executar migration `20260222_add_battles_system.sql`.
- [ ] Garantir que bucket `battle-images` foi criado (script incluso na migration).
