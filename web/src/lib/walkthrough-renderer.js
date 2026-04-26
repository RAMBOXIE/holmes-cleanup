// Renders a step-by-step walkthrough panel for AI / Face opt-out flows.
// Pure DOM, vanilla JS, no framework. Matches the innerHTML + escape() pattern
// used in main.js. No localStorage; sessionStorage is opt-in per flow.

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
);

const STORAGE_PREFIX = 'vanish:walkthrough:';
const PERSIST_FLAG_PREFIX = 'vanish:walkthrough-persist:';

function storageKey(flowKey) {
  return STORAGE_PREFIX + flowKey;
}

function persistKey(flowKey) {
  return PERSIST_FLAG_PREFIX + flowKey;
}

function hasSessionStorage() {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage !== null;
  } catch {
    return false;
  }
}

function isPersistenceEnabled(flowKey) {
  if (!hasSessionStorage()) return false;
  try {
    return sessionStorage.getItem(persistKey(flowKey)) === '1';
  } catch {
    return false;
  }
}

function setPersistenceEnabled(flowKey, enabled) {
  if (!hasSessionStorage()) return;
  try {
    if (enabled) sessionStorage.setItem(persistKey(flowKey), '1');
    else sessionStorage.removeItem(persistKey(flowKey));
  } catch {
    // sessionStorage may be unavailable (private mode quota etc.) — fail silently.
  }
}

function loadCompletion(flowKey) {
  if (!hasSessionStorage() || !isPersistenceEnabled(flowKey)) return {};
  try {
    const raw = sessionStorage.getItem(storageKey(flowKey));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCompletion(flowKey, completion) {
  if (!hasSessionStorage() || !isPersistenceEnabled(flowKey)) return;
  try {
    sessionStorage.setItem(storageKey(flowKey), JSON.stringify(completion));
  } catch {
    // Quota or disabled — silent.
  }
}

/**
 * Render a walkthrough panel into the given container.
 *
 * @param {HTMLElement} container - DOM node to render into
 * @param {Object} options
 * @param {string} options.flowKey - unique key for sessionStorage namespace
 *                                   (e.g. "ai:openai-chatgpt", "face:pimeyes:opt-out")
 * @param {string} options.serviceName - display name (e.g. "OpenAI ChatGPT")
 * @param {string} [options.optOutUrl] - URL the user opens in a new tab
 * @param {Object} options.walkthrough - walkthrough object from catalog
 * @param {string} [options.walkthrough.targetSetting]
 * @param {string[]} options.walkthrough.steps
 * @param {string} [options.walkthrough.verification]
 * @param {string} [options.walkthrough.tierOverrides]
 * @param {Function} [options.onClose] - called when user clicks the close button
 */
export function renderWalkthrough(container, options) {
  if (!container) return;
  const { flowKey, serviceName, optOutUrl, walkthrough, onClose } = options || {};

  if (!walkthrough || !Array.isArray(walkthrough.steps) || walkthrough.steps.length === 0) {
    container.innerHTML = '';
    return;
  }

  const completed = loadCompletion(flowKey);
  const persistOn = isPersistenceEnabled(flowKey);
  const stepsHtml = walkthrough.steps.map((step, i) => `
    <li class="walkthrough-step ${completed[i] ? 'done' : ''}" data-step-index="${i}">
      <label>
        <input type="checkbox" ${completed[i] ? 'checked' : ''} />
        <span class="walkthrough-step-text">${escape(step)}</span>
      </label>
    </li>
  `).join('');

  container.innerHTML = `
    <div class="walkthrough-panel" data-flow-key="${escape(flowKey || '')}">
      <header class="walkthrough-head">
        <h3>Walk-through: ${escape(serviceName || 'opt-out')}</h3>
        ${onClose ? '<button type="button" class="walkthrough-close" aria-label="Close walkthrough">×</button>' : ''}
      </header>
      ${optOutUrl ? `
        <p class="walkthrough-link">
          <a href="${escape(optOutUrl)}" target="_blank" rel="noopener">Open opt-out page ↗</a>
          <span class="walkthrough-link-hint">Opens in a new tab; come back here to follow the steps.</span>
        </p>
      ` : ''}
      ${walkthrough.targetSetting ? `
        <p class="walkthrough-target">
          Target setting: <strong>"${escape(walkthrough.targetSetting)}"</strong>
        </p>
      ` : ''}
      <ol class="walkthrough-steps">${stepsHtml}</ol>
      ${walkthrough.verification ? `
        <div class="walkthrough-verification">
          <strong>How to confirm it worked:</strong> ${escape(walkthrough.verification)}
        </div>
      ` : ''}
      ${walkthrough.tierOverrides ? `
        <div class="walkthrough-tier-override">
          <strong>⚠ Caveat:</strong> ${escape(walkthrough.tierOverrides)}
        </div>
      ` : ''}
      <div class="walkthrough-progress">
        <label>
          <input type="checkbox" class="walkthrough-remember" ${persistOn ? 'checked' : ''} />
          <span>Remember my progress in this tab</span>
        </label>
        <span class="walkthrough-progress-hint">
          (Uses sessionStorage; cleared when you close this tab. Refresh = lost otherwise.)
        </span>
      </div>
    </div>
  `;

  // Step checkbox handlers
  container.querySelectorAll('.walkthrough-step input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const li = cb.closest('.walkthrough-step');
      const idx = Number(li.dataset.stepIndex);
      const next = { ...loadCompletion(flowKey) };
      next[idx] = cb.checked;
      saveCompletion(flowKey, next);
      li.classList.toggle('done', cb.checked);
    });
  });

  // Persistence toggle handler
  const rememberCb = container.querySelector('.walkthrough-remember');
  if (rememberCb) {
    rememberCb.addEventListener('change', () => {
      setPersistenceEnabled(flowKey, rememberCb.checked);
      if (rememberCb.checked) {
        // Capture current step state at the moment user enables persistence.
        const current = {};
        container.querySelectorAll('.walkthrough-step input[type="checkbox"]').forEach((box, i) => {
          current[i] = box.checked;
        });
        saveCompletion(flowKey, current);
      } else if (hasSessionStorage()) {
        try {
          sessionStorage.removeItem(storageKey(flowKey));
        } catch {
          // ignore
        }
      }
    });
  }

  // Close button handler
  if (onClose) {
    const closeBtn = container.querySelector('.walkthrough-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.innerHTML = '';
        onClose();
      });
    }
  }
}

/** Clear all walkthrough state for a single flow key. */
export function clearWalkthroughState(flowKey) {
  if (!hasSessionStorage()) return;
  try {
    sessionStorage.removeItem(storageKey(flowKey));
    sessionStorage.removeItem(persistKey(flowKey));
  } catch {
    // ignore
  }
}
