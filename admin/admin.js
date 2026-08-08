import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout
} from 'https://cdn.jsdelivr.net/npm/@netlify/identity@1.2.0/+esm';

const API_URL = '/.netlify/functions/news';
let newsItems = [];
let inviteToken = '';

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  document.querySelector('[data-login-form]').addEventListener('submit', submitLogin);
  document.querySelector('[data-invite-form]').addEventListener('submit', submitInvite);
  document.querySelector('[data-logout]').addEventListener('click', submitLogout);
  document.querySelector('[data-news-form]').addEventListener('submit', saveNews);
  document.querySelector('[data-cancel]').addEventListener('click', resetForm);
  document.querySelector('[data-export]').addEventListener('click', exportBackup);

  try {
    const callback = await handleAuthCallback();
    if (callback?.type === 'invite' && callback.token) {
      inviteToken = callback.token;
      showAuthPanel('invite');
      return;
    }
    updateAuthView(await getUser());
  } catch (error) {
    showAuthPanel('login');
    showAuthError('[data-login-error]', authMessage(error));
  }
}

async function submitInvite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.password.value;
  const confirmation = form.elements.passwordConfirm.value;
  const button = form.querySelector('button[type="submit"]');
  showAuthError('[data-invite-error]', '');

  if (!inviteToken) {
    showAuthError('[data-invite-error]', '招待情報を確認できません。新しい招待メールからもう一度お試しください。');
    return;
  }
  if (password !== confirmation) {
    showAuthError('[data-invite-error]', '確認用パスワードが一致しません。');
    return;
  }

  button.disabled = true;
  button.textContent = '登録中…';
  try {
    const user = await acceptInvite(inviteToken, password);
    inviteToken = '';
    form.reset();
    updateAuthView(user);
    showStatus('パスワードを登録しました。お知らせ管理をご利用いただけます。');
  } catch (error) {
    showAuthError('[data-invite-error]', authMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = 'パスワードを登録する';
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  showAuthError('[data-login-error]', '');
  button.disabled = true;
  button.textContent = 'ログイン中…';
  try {
    const user = await login(form.elements.email.value, form.elements.password.value);
    form.reset();
    updateAuthView(user);
  } catch (error) {
    showAuthError('[data-login-error]', authMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = 'ログイン';
  }
}

async function submitLogout() {
  try {
    await logout();
  } finally {
    updateAuthView(null);
  }
}

function showAuthPanel(panel) {
  document.querySelector('[data-invite-panel]').hidden = panel !== 'invite';
  document.querySelector('[data-login-panel]').hidden = panel !== 'login';
  document.querySelector('[data-admin-content]').hidden = true;
  document.querySelector('[data-logout]').hidden = true;
}

function updateAuthView(user) {
  const isLoggedIn = Boolean(user);
  document.querySelector('[data-invite-panel]').hidden = true;
  document.querySelector('[data-login-panel]').hidden = isLoggedIn;
  document.querySelector('[data-admin-content]').hidden = !isLoggedIn;
  document.querySelector('[data-logout]').hidden = !isLoggedIn;
  if (isLoggedIn) {
    setDefaultDate();
    loadAdminNews();
  }
}

async function request(method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(API_URL, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '処理に失敗しました。');
  return result;
}

async function loadAdminNews() {
  const list = document.querySelector('[data-admin-list]');
  list.innerHTML = '<p>読み込み中です…</p>';
  try {
    const result = await request();
    newsItems = result.items || [];
    renderAdminNews();
  } catch (error) {
    list.innerHTML = `<p class="empty">${escapeAdminHtml(error.message)}</p>`;
  }
}

function renderAdminNews() {
  const list = document.querySelector('[data-admin-list]');
  if (!newsItems.length) {
    list.innerHTML = '<p class="empty">登録されているお知らせはありません。</p>';
    return;
  }
  list.innerHTML = newsItems.map((item) => `
    <article class="admin-item">
      <time datetime="${escapeAdminHtml(item.date)}">${formatAdminDate(item.date)}</time>
      <span class="category">${escapeAdminHtml(item.category)}</span>
      <h3>${escapeAdminHtml(item.title)}</h3>
      <div class="item-actions">
        <button type="button" class="secondary-button" data-edit-id="${escapeAdminHtml(item.id)}">編集</button>
        <button type="button" class="danger-button" data-delete-id="${escapeAdminHtml(item.id)}">削除</button>
      </div>
    </article>`).join('');
  list.querySelectorAll('[data-edit-id]').forEach((button) => button.addEventListener('click', () => editNews(button.dataset.editId)));
  list.querySelectorAll('[data-delete-id]').forEach((button) => button.addEventListener('click', () => deleteNews(button.dataset.deleteId)));
}

async function saveNews(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[data-submit]');
  const data = Object.fromEntries(new FormData(form));
  const method = data.id ? 'PUT' : 'POST';
  submit.disabled = true;
  submit.textContent = '保存中…';
  try {
    await request(method, data);
    showStatus(data.id ? 'お知らせを更新しました。' : 'お知らせを登録しました。');
    resetForm();
    await loadAdminNews();
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
}

function editNews(id) {
  const item = newsItems.find((entry) => entry.id === id);
  if (!item) return;
  const form = document.querySelector('[data-news-form]');
  ['id', 'date', 'category', 'title', 'body'].forEach((name) => { form.elements[name].value = item[name] || ''; });
  document.querySelector('[data-form-title]').textContent = 'お知らせを編集';
  form.querySelector('[data-submit]').textContent = '更新する';
  document.querySelector('[data-cancel]').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteNews(id) {
  const item = newsItems.find((entry) => entry.id === id);
  if (!item || !confirm(`「${item.title}」を削除しますか？\nこの操作は元に戻せません。`)) return;
  try {
    await request('DELETE', { id });
    showStatus('お知らせを削除しました。');
    resetForm();
    await loadAdminNews();
  } catch (error) {
    showStatus(error.message, true);
  }
}

function resetForm() {
  const form = document.querySelector('[data-news-form]');
  form.reset();
  form.elements.id.value = '';
  document.querySelector('[data-form-title]').textContent = '新しいお知らせを登録';
  form.querySelector('[data-submit]').textContent = '登録する';
  document.querySelector('[data-cancel]').hidden = true;
  setDefaultDate();
}

function setDefaultDate() {
  const input = document.querySelector('[name="date"]');
  if (input && !input.value) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    input.value = local.toISOString().slice(0, 10);
  }
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), items: newsItems }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tsumugu-news-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showStatus(message, isError = false) {
  const status = document.querySelector('[data-status]');
  status.textContent = message;
  status.className = `status is-visible${isError ? ' is-error' : ''}`;
  status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showAuthError(selector, message) {
  document.querySelector(selector).textContent = message;
}

function authMessage(error) {
  const message = String(error?.message || '認証処理に失敗しました。');
  if (/invalid login|invalid.*credentials|email or password/i.test(message)) return 'メールアドレスまたはパスワードが正しくありません。';
  if (/expired|invalid.*token/i.test(message)) return '招待リンクの有効期限が切れているか、すでに使用されています。新しい招待メールからお試しください。';
  return message;
}

function formatAdminDate(value) {
  return String(value).replace(/-/g, '.');
}

function escapeAdminHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
