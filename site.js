const themeButton = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-label');
const storageKey = 'star-portfolio-theme';

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (themeButton) {
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? '切换日间模式' : '切换夜间模式');
  }
  if (themeLabel) themeLabel.textContent = dark ? '日间' : '夜间';
}

try {
  applyTheme(localStorage.getItem(storageKey) || 'light');
} catch {
  applyTheme('light');
}

themeButton?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(storageKey, next); } catch { /* 页面仍可切换主题 */ }
});

const sectionLinks = [...document.querySelectorAll('.site-nav a[data-section]')];
const sections = sectionLinks.map(link => document.getElementById(link.dataset.section));
if (sectionLinks.length && sections.every(Boolean)) {
  let frame = 0;
  const updateActiveSection = () => {
    frame = 0;
    const threshold = Math.min(180, window.innerHeight * .34);
    let active = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
      active = sections[sections.length - 1].id;
    }
    sectionLinks.forEach(link => {
      const selected = link.dataset.section === active;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  updateActiveSection();
}
