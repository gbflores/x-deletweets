# X DeleTweets 🗑️

Apague **seus posts, respostas, reposts e curtidas** no X (Twitter) direto no navegador, sem API paga, sem
instalar programa e sem entregar sua conta a nenhum site.

> 🇺🇸 English version below.

O script clica na própria interface do X, como você faria à mão, só que sozinho e com pausas para não
acionar os limites da plataforma.

## Por que confiar

- **Um único arquivo legível**: [`x-deletweets.user.js`](x-deletweets.user.js). Leia antes de rodar.
- **Nenhuma requisição de rede**: não usa `fetch`, `XMLHttpRequest`, `eval` nem carrega código de fora.
- **Não lê cookies, tokens ou senhas.** Usa só a sessão que já está aberta no seu navegador.
- **Só mexe no que é seu**: identifica o usuário logado e ignora posts de outras pessoas que aparecem nas conversas.
- **Sem atualização automática**: o userscript não tem `@updateURL`, então nenhuma versão nova é instalada sem você saber.

## Como usar

### Opção 1: colar no console (sem instalar nada)

1. Entre em [x.com](https://x.com) com a sua conta, no computador.
2. Abra o arquivo [`x-deletweets.user.js`](https://raw.githubusercontent.com/gbflores/x-deletweets/main/x-deletweets.user.js) e copie todo o conteúdo.
3. Aperte `F12` (ou `Ctrl+Shift+J` / `Cmd+Option+J`) e vá na aba **Console**.
4. Cole e aperte `Enter`. Se o Chrome avisar sobre colar código, digite `allow pasting` (ou `permitir colar`), aperte `Enter` e cole de novo.
5. O painel aparece no canto inferior direito.

Ao recarregar a página o script some. Para usar de novo, cole outra vez.

### Opção 2: instalar como userscript

1. Instale [Tampermonkey](https://www.tampermonkey.net/) ou [Violentmonkey](https://violentmonkey.github.io/).
2. Abra [este link](https://raw.githubusercontent.com/gbflores/x-deletweets/main/x-deletweets.user.js) e confirme a instalação.
3. No X aparece o botão **🗑 DeleTweets** no canto inferior direito. Clique para abrir o painel.

## O painel

| Opção | O que faz |
| --- | --- |
| **Posts e respostas** | Apaga tudo o que você publicou, incluindo o post fixado e respostas em conversas de outras pessoas. |
| **Reposts** | Desfaz seus reposts. |
| **Curtidas** | Remove suas curtidas. |
| **Só o que for anterior a** | Mantém tudo a partir dessa data. Vazio apaga tudo. Para curtidas vale a data do post curtido, não a da curtida. |
| **Manter o post fixado** | Não apaga o post fixado no perfil. |
| **Simular** | Percorre tudo e só conta o que seria apagado. Bom para testar antes. |
| **Ritmo** | Intervalo entre ações. Para contas com milhares de posts, prefira *Lento*. |

Clique em **Começar**, confirme, e deixe a aba aberta e visível até terminar. **Parar** interrompe a qualquer
momento. O script percorre sozinho as abas *Respostas*, *Posts* e *Curtidas* do seu perfil.

## Avisos

- **Não tem volta.** Se quiser uma cópia, peça antes o arquivo dos seus dados em *Configurações › Sua conta ›
  Baixar um arquivo dos seus dados* (fica pronto em 24 a 48 h).
- O X só carrega por volta dos **3.200 posts mais recentes** no perfil. Se você tiver mais, rode, espere
  um pouco, recarregue e rode de novo. O que nunca aparecer no perfil só pode ser apagado com o arquivo de dados.
- O contador de posts do perfil demora para atualizar. Confie no que aparece nas abas.
- Se aparecerem muitos erros seguidos, o script pausa 60 s e, se continuar, para. Geralmente é o limite de ações
  do X: espere alguns minutos e rode de novo.
- Funciona com o X em qualquer idioma (o texto do botão "Excluir" é reconhecido em mais de 25 línguas e, se
  não reconhecer, usa a cor vermelha do item). Se o seu idioma falhar, abra uma issue.
- Automatizar ações vai contra os termos do X. O uso é por sua conta e risco.

---

## 🇺🇸 English

Delete **your posts, replies, reposts and likes** on X (Twitter) right from your browser: no paid API, nothing to
install, no third-party site touching your account.

**Why trust it:** one readable file, no network requests, no cookies/tokens read, only acts on your own posts,
and no `@updateURL`, so nothing updates behind your back.

**Use it:**

- **Console:** log in to x.com on desktop, copy the contents of
  [`x-deletweets.user.js`](https://raw.githubusercontent.com/gbflores/x-deletweets/main/x-deletweets.user.js),
  open DevTools (`F12`) › Console, paste and press `Enter` (type `allow pasting` first if Chrome asks).
- **Userscript:** install Tampermonkey or Violentmonkey, then open the raw file link above to install. A
  **🗑 DeleTweets** button appears in the bottom-right corner.

Pick what to delete (posts & replies, reposts, likes), optionally a cut-off date, keep-pinned, dry run and pace,
then hit **Start** and keep the tab open. Deletion is permanent; download your X data archive first if you want
a copy. X only loads roughly your latest 3,200 posts on your profile, so large accounts may need several runs.
Automating actions is against X's terms; use at your own risk.

## Créditos

Inspirado em [tanersb/x-auto-delete](https://github.com/tanersb/x-auto-delete) (MIT), reescrito do zero com
suporte a vários idiomas, reposts, curtidas, filtro por data e simulação.

## Licença

[MIT](LICENSE) © Guilherme Flores
