# Validação visual — 2026-08-26

As capturas das rotas `/` e `/profile` foram feitas sem sessão autenticada; ambas exibiram corretamente a tela compacta de login, com elementos em largura de smartphone mesmo no viewport desktop. O dashboard e o Perfil não puderam ser avaliados nessa captura porque a proteção de sessão redirecionou para `/login`. A validação autenticada deve ser feita com a conta E2E no servidor interno.
