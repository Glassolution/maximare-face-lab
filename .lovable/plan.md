

# MAXIMARE - App de Looksmaxing

## Visão Geral
Web app focado em análise facial e melhoria de aparência masculina, inspirado no UMAX. Interface minimalista em tons escuros (azul marinho profundo) com experiência mobile-first.

## Design System
- **Paleta**: Preto (#000000), Azul marinho (#0A1628), Branco (#FFFFFF), Cinza (#F5F5F5), Accent azul (#1E40AF)
- **Estilo**: Minimalista, cards com border-radius 12-16px, sombras sutis, espaçamento generoso
- **Ícones**: Lucide React (outline)
- **Responsivo**: Mobile-first

## Páginas e Funcionalidades

### 1. Landing Page / Onboarding
- Hero com logo "Maximare" centralizado
- Headline "Maximize seu potencial estético" + subheadline
- 3 cards de benefícios (Análise IA, Recomendações, Evolução)
- CTA "Começar análise gratuita"

### 2. Análise Facial (Captura de Foto)
- Preview de webcam (getUserMedia API) com guia oval sobreposto
- Área de upload drag & drop como alternativa
- Instruções de posicionamento
- Botão "Analisar rosto" (ativo após foto capturada)
- Loading state animado durante "análise"

### 3. Resultado - Score
- Score geral grande (1-10) com gráfico circular (Recharts)
- Grid de 6 cards de categorias: Simetria, Estrutura Óssea, Harmonia, Pele, Cabelo, Olhos
- Cada card com ícone, nota individual e barra de progresso
- Botão "Ver recomendações"
- Dados mockados com valores realistas

### 4. Recomendações Personalizadas
- Tabs por categoria: Todas, Skincare, Cabelo, Fitness, Postura, Estilo
- Cards com título, descrição, badge de impacto (Alto/Médio/Baixo)
- Cards expansíveis com explicação completa, passos práticos e sugestões

### 5. Progresso (Histórico)
- Timeline vertical de análises anteriores (localStorage)
- Thumbnail, data e score de cada análise
- Gráfico de evolução do score ao longo do tempo (Recharts)

### 6. Navegação Global
- Header fixo: Logo + Menu (Home, Progresso, Dicas, Perfil) + botão Upgrade
- Footer simples

### 7. Modal de Paywall (Estrutura)
- Modal após primeira análise completa
- Lista de benefícios premium
- Botões "Ver planos" e "Continuar grátis"

## Dados e Armazenamento
- Mock data realista para scores e recomendações (sem backend)
- localStorage para salvar histórico de análises
- Preparado para futura integração com IA real

