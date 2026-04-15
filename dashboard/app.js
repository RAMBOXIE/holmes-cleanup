async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

function renderCounters(status) {
  const counters = status.counters || {};
  const root = document.getElementById('counters');
  root.innerHTML = Object.entries(counters).map(([label, value]) => `
    <div class="counter">
      <span>${humanize(label)}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderTable(rootId, rows) {
  const root = document.getElementById(rootId);
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No items queued.</p>';
    return;
  }

  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  root.innerHTML = `
    <table>
      <thead>
        <tr>${columns.map(column => `<th>${humanize(column)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>${columns.map(column => `<td>${row[column] ?? ''}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function humanize(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
}

try {
  const [retry, manualReview, status] = await Promise.all([
    loadJson('./data/retry-queue.json'),
    loadJson('./data/manual-review-queue.json'),
    loadJson('./data/status.json')
  ]);

  renderCounters(status);
  renderTable('retry-queue', retry);
  renderTable('manual-review-queue', manualReview);
} catch (error) {
  document.body.insertAdjacentHTML('beforeend', `<p class="error">${error.message}</p>`);
}
