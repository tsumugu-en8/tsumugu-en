document.addEventListener('DOMContentLoaded', () => {
  const list = document.querySelector('[data-news-list]');
  const article = document.querySelector('[data-news-detail]');
  if (list) loadNewsList(list);
  if (article) loadNewsDetail(article);
});

async function fetchNews(id = '') {
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  const response = await fetch(`/.netlify/functions/news${query}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`News request failed: ${response.status}`);
  return response.json();
}

async function loadNewsList(list) {
  try {
    const { items } = await fetchNews();
    const limit = Number(list.dataset.newsLimit || 0);
    const visibleItems = limit ? items.slice(0, limit) : items;
    list.innerHTML = visibleItems.length
      ? visibleItems.map((item) => newsListItem(item, list.matches('.news-list'))).join('')
      : '<p class="news-empty">現在、お知らせはありません。</p>';
  } catch (error) {
    console.error(error);
    if (!list.children.length) list.innerHTML = '<p class="news-error">お知らせを読み込めませんでした。</p>';
  }
}

async function loadNewsDetail(article) {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;
  try {
    const { item } = await fetchNews(id);
    document.title = `${item.title} | 紡 -tsumugu-`;
    article.innerHTML = `
      <div class="article-meta"><time datetime="${escapeNewsHtml(item.date)}">${formatNewsDate(item.date)}</time><span class="tag">${escapeNewsHtml(item.category)}</span></div>
      <h1 class="article-title">${escapeNewsHtml(item.title)}</h1>
      <div class="article-body">${paragraphs(item.body)}</div>
      <div class="article-back"><a class="button button--sub" href="news.html">お知らせ一覧へ戻る</a></div>`;
  } catch (error) {
    console.error(error);
    article.innerHTML = '<p class="news-error">お知らせが見つかりませんでした。</p><div class="article-back"><a class="button button--sub" href="news.html">お知らせ一覧へ戻る</a></div>';
  }
}

function newsListItem(item, compact) {
  const href = `news-detail.html?id=${encodeURIComponent(item.id)}`;
  const content = `<time datetime="${escapeNewsHtml(item.date)}">${formatNewsDate(item.date)}</time><span class="tag">${escapeNewsHtml(item.category)}</span><${compact ? 'span' : 'strong'}>${escapeNewsHtml(item.title)}</${compact ? 'span' : 'strong'}>`;
  return compact ? `<li><a href="${href}">${content}</a></li>` : `<article class="card news-card"><a href="${href}">${content}</a></article>`;
}

function formatNewsDate(value) {
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${year}.${month}.${day}` : escapeNewsHtml(value);
}

function paragraphs(value) {
  return String(value).split(/\n{2,}/).map((text) => `<p>${escapeNewsHtml(text).replace(/\n/g, '<br>')}</p>`).join('');
}

function escapeNewsHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}
