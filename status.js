document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const progress = document.getElementById('progress');
  const toggle = document.getElementById('theme-toggle');

  // Theme auto-detect
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  body.classList.add(prefersDark ? 'dark' : 'light');

  toggle.addEventListener('click', () => {
    body.classList.toggle('dark');
    body.classList.toggle('light');
  });

  // Fetch status
  fetch('data/status.json')
    .then(res => res.json())
    .then(data => {
      document.getElementById('status-date').textContent = data.date;
      document.getElementById('status-sources').textContent = data.sources.join(', ');
      document.getElementById('status-count').textContent = data.summaryCount;
      document.getElementById('status-updated').textContent = data.lastUpdated;

      let width = 0;
      const interval = setInterval(() => {
        width += 10;
        progress.style.width = width + '%';
        if (width >= 100) clearInterval(interval);
      }, 150);
    })
    .catch(() => {
      document.getElementById('status-info').innerHTML = '<p>Failed to load status data.</p>';
    });

  document.getElementById('refetch').addEventListener('click', () => location.reload());
});
