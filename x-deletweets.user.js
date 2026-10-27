// ==UserScript==
// @name         X DeleTweets
// @namespace    https://github.com/gbflores/x-deletweets
// @version      1.0.0
// @description  Apaga seus posts, respostas, reposts e curtidas no X (Twitter), direto no navegador, sem API e sem enviar dados a ninguém.
// @author       Guilherme Flores
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * X DeleTweets: apaga o seu próprio conteúdo no X clicando na interface, como você faria à mão.
 *
 * - Não faz requisições de rede, não lê cookies nem tokens, não carrega código de fora.
 * - Funciona colado no console do navegador (F12) ou instalado como userscript.
 * - Detecta o usuário logado e só mexe em posts dele.
 *
 * https://github.com/gbflores/x-deletweets (MIT)
 */
(function () {
  'use strict';

  if (window.__xDeleTweets) {
    window.__xDeleTweets.open();
    return;
  }

  // Texto do item "Excluir" no menu "⋯", em vários idiomas. Se nenhum bater, usa a cor vermelha do item.
  const DELETE_LABELS = [
    'delete', 'excluir', 'eliminar', 'supprimer', 'löschen', 'elimina', 'sil', 'verwijderen',
    'usuń', 'удалить', 'видалити', '削除', '삭제', '删除', '刪除', 'hapus', 'حذف', 'xóa', 'ลบ', 'slett',
    'radera', 'slet', 'poista', 'smazat', 'törlés', 'ștergeți', 'διαγραφή', 'מחיקה', 'हटाएं',
  ];
  // Texto do aviso "Fixado" acima do post fixado.
  const PINNED_LABELS = [
    'pinned', 'fixado', 'fijado', 'épinglé', 'angeheftet', 'fissato', 'sabitlendi', 'vastgezet',
    'przypięty', 'закреплено', '固定', '고정', '置顶', '已置頂', 'disematkan',
  ];

  const pt = (document.documentElement.lang || navigator.language || '').toLowerCase().startsWith('pt');
  const T = pt ? {
    title: 'X DeleTweets',
    user: 'Conta',
    noUser: 'Faça login no X para usar.',
    posts: 'Posts e respostas',
    reposts: 'Reposts',
    likes: 'Curtidas',
    before: 'Só o que for anterior a',
    beforeHint: 'deixe vazio para apagar tudo',
    keepPinned: 'Manter o post fixado',
    dryRun: 'Simular (não apaga nada, só conta)',
    speed: 'Ritmo',
    slow: 'Lento (mais seguro)',
    normal: 'Normal',
    fast: 'Rápido',
    start: 'Começar',
    stop: 'Parar',
    deleted: 'apagados',
    unreposted: 'reposts desfeitos',
    unliked: 'curtidas removidas',
    skipped: 'ignorados',
    errors: 'erros',
    simulated: '(simulação)',
    confirm: (u, what) => `Apagar ${what} de @${u}?\n\nIsso NÃO pode ser desfeito. Se quiser uma cópia, baixe antes o arquivo dos seus dados em Configurações > Sua conta.`,
    nothing: 'Marque pelo menos uma opção.',
    phase: (p) => `Abrindo ${p}…`,
    endOfList: 'Fim da lista nesta aba.',
    pause: (s) => `Muitos erros seguidos; pausando ${s}s (limite do X?).`,
    tooMany: 'Erros demais. Parei. Espere alguns minutos e tente de novo.',
    stopped: 'Parado.',
    finished: 'Concluído. Recarregue a página e rode de novo se ainda sobrar algo.',
    collapsed: '🗑 DeleTweets',
  } : {
    title: 'X DeleTweets',
    user: 'Account',
    noUser: 'Log in to X to use this.',
    posts: 'Posts and replies',
    reposts: 'Reposts',
    likes: 'Likes',
    before: 'Only items older than',
    beforeHint: 'leave empty to delete everything',
    keepPinned: 'Keep pinned post',
    dryRun: 'Dry run (deletes nothing, just counts)',
    speed: 'Pace',
    slow: 'Slow (safer)',
    normal: 'Normal',
    fast: 'Fast',
    start: 'Start',
    stop: 'Stop',
    deleted: 'deleted',
    unreposted: 'reposts undone',
    unliked: 'likes removed',
    skipped: 'skipped',
    errors: 'errors',
    simulated: '(dry run)',
    confirm: (u, what) => `Delete ${what} from @${u}?\n\nThis CANNOT be undone. If you want a copy, download your data archive first in Settings > Your account.`,
    nothing: 'Select at least one option.',
    phase: (p) => `Opening ${p}…`,
    endOfList: 'Reached the end of this tab.',
    pause: (s) => `Too many errors in a row; pausing ${s}s (X rate limit?).`,
    tooMany: 'Too many errors. Stopped. Wait a few minutes and try again.',
    stopped: 'Stopped.',
    finished: 'Done. Reload the page and run again if anything is left.',
    collapsed: '🗑 DeleTweets',
  };

  const SPEEDS = { slow: 3000, normal: 1600, fast: 800 };

  const state = {
    running: false,
    opts: null,
    stats: { deleted: 0, unreposted: 0, unliked: 0, skipped: 0, errors: 0 },
    consecutiveErrors: 0,
  };

  // ---------- utilidades ----------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (ms) => sleep(ms + Math.random() * ms * 0.5);

  async function waitFor(fn, timeout = 3000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(100);
    }
    return null;
  }

  function pressEscape() {
    const ev = { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true };
    document.body.dispatchEvent(new KeyboardEvent('keydown', ev));
    document.body.dispatchEvent(new KeyboardEvent('keyup', ev));
  }

  function currentUser() {
    const href = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href');
    return href ? href.replace(/^\//, '') : null;
  }

  const norm = (s) => (s || '').trim().toLowerCase();

  function isAuthor(article, user) {
    const text = article.querySelector('[data-testid="User-Name"]')?.innerText || '';
    return new RegExp('@' + user + '(?![A-Za-z0-9_])', 'i').test(text);
  }

  function isPinned(article) {
    const ctx = norm(article.querySelector('[data-testid="socialContext"]')?.innerText);
    return !!ctx && PINNED_LABELS.some((l) => ctx === l || ctx.startsWith(l));
  }

  function tweetDate(article) {
    const dt = article.querySelector('time')?.getAttribute('datetime');
    return dt ? new Date(dt) : null;
  }

  function passesDate(article) {
    const before = state.opts.before;
    if (!before) return true;
    const d = tweetDate(article);
    return d ? d < before : false;
  }

  function isRed(el) {
    const m = getComputedStyle(el).color.match(/\d+/g);
    if (!m) return false;
    const [r, g, b] = m.map(Number);
    return r > 200 && g < 90 && b < 90;
  }

  function findDeleteItem() {
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    if (!items.length) return null;
    const byText = items.find((m) => DELETE_LABELS.includes(norm(m.innerText)));
    if (byText) return byText;
    return items.find((m) => [...m.querySelectorAll('span')].some(isRed)) || null;
  }

  // ---------- ações ----------

  async function deleteTweet(article) {
    if (state.opts.dryRun) return 'deleted';
    const caret = article.querySelector('button[data-testid="caret"]');
    if (!caret) throw new Error('caret not found');
    caret.click();
    const item = await waitFor(findDeleteItem, 3000);
    if (!item) {
      pressEscape();
      await sleep(300);
      return 'skipped';
    }
    item.click();
    const confirm = await waitFor(() => document.querySelector('[data-testid="confirmationSheetConfirm"]'), 3000);
    if (!confirm) {
      pressEscape();
      throw new Error('confirm not found');
    }
    confirm.click();
    return 'deleted';
  }

  async function undoRepost(article) {
    if (state.opts.dryRun) return 'unreposted';
    article.querySelector('[data-testid="unretweet"]').click();
    const confirm = await waitFor(() => document.querySelector('[data-testid="unretweetConfirm"]'), 3000);
    if (!confirm) {
      pressEscape();
      throw new Error('unretweet confirm not found');
    }
    confirm.click();
    return 'unreposted';
  }

  async function unlike(article) {
    if (state.opts.dryRun) return 'unliked';
    article.querySelector('[data-testid="unlike"]').click();
    return 'unliked';
  }

  function handlePostsTab(article) {
    const { user, posts, reposts, keepPinned } = state.opts;
    if (!passesDate(article)) return null;
    if (reposts && article.querySelector('[data-testid="unretweet"]')) return undoRepost(article);
    if (posts && isAuthor(article, user)) {
      if (keepPinned && isPinned(article)) return null;
      return deleteTweet(article);
    }
    return null;
  }

  function handleLikesTab(article) {
    if (!passesDate(article)) return null;
    if (!article.querySelector('[data-testid="unlike"]')) return null;
    return unlike(article);
  }

  // ---------- navegação e laço ----------

  // `aliases`: caminhos para onde o X pode redirecionar (ex.: /usuario/likes vira /i/history/likes).
  async function goTo(path, ...aliases) {
    const targets = [path, ...aliases].map((p) => p.toLowerCase());
    const same = () => targets.includes(location.pathname.toLowerCase());
    if (same()) return;
    log(T.phase(path));
    const link = document.querySelector(`a[href="${path}" i]`);
    if (link) {
      link.click();
    } else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await waitFor(same, 8000);
    await waitFor(() => document.querySelector('article[data-testid="tweet"], [data-testid="emptyState"]'), 8000);
    await sleep(1500);
  }

  async function processTimeline(handler) {
    const seen = new WeakSet();
    let idle = 0;
    while (state.running) {
      const article = [...document.querySelectorAll('article[data-testid="tweet"]')].find((a) => !seen.has(a));
      if (!article) {
        if (++idle > 15) {
          log(T.endOfList);
          return;
        }
        window.scrollBy(0, 1500);
        await sleep(2000);
        continue;
      }
      idle = 0;
      seen.add(article);
      article.scrollIntoView({ block: 'center' });
      await sleep(250);

      try {
        const pending = handler(article);
        if (!pending) {
          state.stats.skipped++;
          render();
          continue;
        }
        const result = await pending;
        state.stats[result]++;
        state.consecutiveErrors = 0;
        render();
        if (result !== 'skipped' && !state.opts.dryRun) await jitter(state.opts.delay);
      } catch (e) {
        state.stats.errors++;
        state.consecutiveErrors++;
        render();
        if (state.consecutiveErrors >= 15) {
          log(T.tooMany);
          state.running = false;
          return;
        }
        if (state.consecutiveErrors % 5 === 0) {
          log(T.pause(60));
          await sleep(60000);
        } else {
          await sleep(1000);
        }
      }
    }
  }

  async function run(opts) {
    state.opts = opts;
    state.running = true;
    state.consecutiveErrors = 0;
    render();
    try {
      const u = '/' + opts.user;
      if (opts.posts || opts.reposts) {
        await goTo(u + '/with_replies');
        await processTimeline(handlePostsTab);
        if (state.running) {
          await goTo(u);
          await processTimeline(handlePostsTab);
        }
      }
      if (opts.likes && state.running) {
        await goTo(u + '/likes', '/i/history/likes');
        await processTimeline(handleLikesTab);
      }
      log(state.running ? T.finished : T.stopped);
    } finally {
      state.running = false;
      render();
    }
  }

  // ---------- painel ----------

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .pill { background:#1d9bf0; color:#fff; border:0; border-radius:999px; padding:10px 16px;
              font-weight:700; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.3); }
      .panel { width:300px; max-width:calc(100vw - 32px); background:#15202b; color:#e7e9ea; border:1px solid #38444d;
               border-radius:16px; padding:14px; box-shadow:0 8px 30px rgba(0,0,0,.45); font-size:13px; }
      .head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
      .head b { font-size:15px; }
      .x { background:none; border:0; color:#8b98a5; font-size:18px; cursor:pointer; }
      .muted { color:#8b98a5; font-size:12px; }
      label { display:flex; gap:8px; align-items:center; margin:6px 0; cursor:pointer; }
      input[type=date], select { width:100%; background:#273340; color:#e7e9ea; border:1px solid #38444d;
                                 border-radius:8px; padding:6px; margin-top:4px; }
      .field { margin:8px 0; }
      .go { width:100%; margin-top:10px; border:0; border-radius:999px; padding:10px; font-weight:700;
            font-size:14px; cursor:pointer; background:#f4212e; color:#fff; }
      .go.stop { background:#e7e9ea; color:#0f1419; }
      .stats { margin-top:10px; line-height:1.6; }
      .log { margin-top:6px; max-height:90px; overflow:auto; color:#8b98a5; font-size:12px; white-space:pre-wrap; }
      .hidden { display:none; }
    </style>
    <button class="pill" part="pill"></button>
    <div class="panel hidden">
      <div class="head"><b></b><button class="x" title="minimizar">×</button></div>
      <div class="muted who"></div>
      <label><input type="checkbox" name="posts" checked> <span data-t="posts"></span></label>
      <label><input type="checkbox" name="reposts" checked> <span data-t="reposts"></span></label>
      <label><input type="checkbox" name="likes"> <span data-t="likes"></span></label>
      <div class="field"><span data-t="before"></span> <span class="muted" data-t="beforeHint"></span>
        <input type="date" name="before"></div>
      <label><input type="checkbox" name="keepPinned"> <span data-t="keepPinned"></span></label>
      <label><input type="checkbox" name="dryRun"> <span data-t="dryRun"></span></label>
      <div class="field"><span data-t="speed"></span>
        <select name="speed">
          <option value="slow" data-t="slow"></option>
          <option value="normal" data-t="normal" selected></option>
          <option value="fast" data-t="fast"></option>
        </select></div>
      <button class="go"></button>
      <div class="stats"></div>
      <div class="log"></div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const pill = $('.pill');
  const panel = $('.panel');
  const goBtn = $('.go');
  pill.textContent = T.collapsed;
  $('.head b').textContent = T.title;
  root.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T[el.dataset.t]));

  const logLines = [];
  function log(msg) {
    logLines.push(`${new Date().toLocaleTimeString()}  ${msg}`);
    if (logLines.length > 30) logLines.shift();
    $('.log').textContent = logLines.join('\n');
    $('.log').scrollTop = 1e9;
    console.log('[X DeleTweets]', msg);
  }

  function render() {
    const user = currentUser();
    $('.who').textContent = user ? `${T.user}: @${user}` : T.noUser;
    goBtn.textContent = state.running ? T.stop : T.start;
    goBtn.classList.toggle('stop', state.running);
    goBtn.disabled = !user && !state.running;
    const s = state.stats;
    const sim = state.opts?.dryRun ? ` ${T.simulated}` : '';
    $('.stats').innerHTML = '';
    [[s.deleted, T.deleted], [s.unreposted, T.unreposted], [s.unliked, T.unliked], [s.skipped, T.skipped], [s.errors, T.errors]]
      .forEach(([n, label]) => {
        const line = document.createElement('div');
        line.textContent = `${n} ${label}`;
        $('.stats').appendChild(line);
      });
    if (sim) $('.stats').firstChild.textContent += sim;
  }

  function open() {
    pill.classList.add('hidden');
    panel.classList.remove('hidden');
    render();
  }
  pill.onclick = open;
  $('.x').onclick = () => {
    panel.classList.add('hidden');
    pill.classList.remove('hidden');
  };

  goBtn.onclick = () => {
    if (state.running) {
      state.running = false;
      render();
      return;
    }
    const user = currentUser();
    if (!user) return;
    const get = (n) => root.querySelector(`[name="${n}"]`);
    const opts = {
      user,
      posts: get('posts').checked,
      reposts: get('reposts').checked,
      likes: get('likes').checked,
      keepPinned: get('keepPinned').checked,
      dryRun: get('dryRun').checked,
      before: get('before').value ? new Date(get('before').value + 'T00:00:00') : null,
      delay: SPEEDS[get('speed').value] || SPEEDS.normal,
    };
    if (!opts.posts && !opts.reposts && !opts.likes) {
      alert(T.nothing);
      return;
    }
    if (!opts.dryRun) {
      const what = [opts.posts && T.posts, opts.reposts && T.reposts, opts.likes && T.likes].filter(Boolean).join(', ');
      if (!confirm(T.confirm(user, what.toLowerCase()))) return;
    }
    state.stats = { deleted: 0, unreposted: 0, unliked: 0, skipped: 0, errors: 0 };
    logLines.length = 0;
    run(opts);
  };

  document.body.appendChild(host);
  window.__xDeleTweets = { open, state };

  // Colado no console, já abre o painel. Como userscript, fica só o botão no canto.
  if (typeof GM_info === 'undefined') open();
})();
