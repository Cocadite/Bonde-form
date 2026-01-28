# Bonde Form Bot — Render Ready (Free)

## O que faz
- /form => envia DM com link único do formulário
- Site (Express) mostra o formulário
- Ao enviar => notifica um canal do staff com embed + botões Aprovar/Recusar
- Aprovar => dá cargo automático (APPROVED_ROLE_ID)

## Deploy no Render (sem erro)
1) Suba esse repo no GitHub (ou faça upload no Render via "New > Web Service" conectando o GitHub)
2) No Render: New > Web Service
   - Build Command: npm install
   - Start Command: npm start
3) Em Environment, adicione as env vars do `.env.example`
4) Deploy
5) Rode os comandos no Render Shell (uma vez):
   npm run deploy

## Permissões/atenções no Discord
- O bot precisa de permissão **Manage Roles**
- O cargo APPROVED_ROLE_ID precisa estar **abaixo** do cargo do bot (hierarquia)
- Ative o intent "Server Members Intent" no Discord Developer Portal (GuildMembers)

## Rotas úteis
- /health => health check do Render
- /form?token=... => abre o formulário
