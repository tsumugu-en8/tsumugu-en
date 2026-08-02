document.documentElement.style.overflowX = 'hidden';

document.addEventListener('DOMContentLoaded', () => {
  document.body.style.overflowX = 'hidden';
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.global-nav');

  if (menuButton && nav) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
      document.body.classList.toggle('menu-open', !isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  document.querySelectorAll('.faq-button').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      if (panel) panel.hidden = isOpen;
    });
  });

  const form = document.querySelector('[data-confirm-form]');
  const confirmArea = document.querySelector('[data-form-confirm]');
  if (form && confirmArea) {
    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) return;
      if (form.dataset.confirmed === 'true') return;
      event.preventDefault();

      const data = new FormData(form);
      const fields = [
        ['お名前', data.get('name')],
        ['ふりがな', data.get('kana')],
        ['メールアドレス', data.get('email')],
        ['電話番号', data.get('tel') || '未入力'],
        ['お問い合わせ種別', data.get('type')],
        ['お問い合わせ内容', data.get('message')]
      ];

      confirmArea.innerHTML = `
        <h2>入力内容のご確認</h2>
        <dl class="confirm-list">
          ${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || ''))}</dd></div>`).join('')}
        </dl>
        <div class="form-actions">
          <button type="button" class="button button--sub" data-edit>修正する</button>
          <button type="button" class="button" data-send>この内容で送信する</button>
        </div>`;
      form.hidden = true;
      confirmArea.hidden = false;
      confirmArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

      confirmArea.querySelector('[data-edit]').addEventListener('click', () => {
        confirmArea.hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      confirmArea.querySelector('[data-send]').addEventListener('click', () => {
        form.dataset.confirmed = 'true';
        form.requestSubmit();
      });
    });
  }
});

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
