// Tests for walkthrough-renderer.js — the shared step-by-step UI for
// AI / Face opt-out flows. Uses jsdom (configured in vite.config.js).

import { describe, test, expect, beforeEach } from 'vitest';
import { renderWalkthrough, clearWalkthroughState } from '../src/lib/walkthrough-renderer.js';

// Real catalog fixtures lifted from src/ai-scanner/ai-platforms-catalog.json
// and src/face-scanner/face-services-catalog.json. Kept inline so the test
// is self-contained and resilient to catalog reshuffles in unrelated entries.
const CHATGPT_WALKTHROUGH = {
  targetSetting: 'Improve the model for everyone',
  steps: [
    'Click your profile icon (bottom-left in ChatGPT web)',
    'Settings → Data controls',
    "Toggle 'Improve the model for everyone' to OFF"
  ],
  verification: 'Toggle shows grey/off. No confirm button — change saves instantly.',
  tierOverrides: 'Team/Enterprise users are already opted-out — this is only needed for Free/Plus/Pro individual accounts.'
};

const PIMEYES_OPT_OUT = {
  targetSetting: 'Opt-out form',
  steps: [
    'Open pimeyes.com/en/opt-out-form (direct link)',
    'Read and accept the disclaimers about irreversibility',
    'Upload 1-3 clear photos of yourself (front-facing, face visible, sunglasses off)',
    'Enter the email you want confirmations sent to',
    'For EU/UK users: optionally cite GDPR Article 17 (right to erasure) in the message field',
    'Submit the form'
  ],
  verification: 'Email confirmation arrives within 24-72h. Full removal takes 7-30 days.',
  tierOverrides: 'PROtect subscribers ($29.99+/mo) get continuous monitoring.'
};

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('renderWalkthrough', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  test('renders ChatGPT walkthrough with title, target, all 3 steps, verification, and tier-override callout', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:openai-chatgpt',
      serviceName: 'OpenAI ChatGPT',
      optOutUrl: 'https://chat.openai.com/#settings/DataControls',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    expect(host.querySelector('.walkthrough-panel')).toBeTruthy();
    expect(host.querySelector('h3').textContent).toContain('OpenAI ChatGPT');

    const link = host.querySelector('.walkthrough-link a');
    expect(link.getAttribute('href')).toBe('https://chat.openai.com/#settings/DataControls');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');

    expect(host.querySelector('.walkthrough-target').textContent)
      .toContain('Improve the model for everyone');

    const steps = host.querySelectorAll('.walkthrough-step');
    expect(steps.length).toBe(3);
    expect(steps[2].textContent).toContain('Improve the model for everyone');

    expect(host.querySelector('.walkthrough-verification').textContent)
      .toContain('Toggle shows grey/off');

    const tier = host.querySelector('.walkthrough-tier-override');
    expect(tier).toBeTruthy();
    expect(tier.textContent).toContain('Team/Enterprise');
  });

  test('renders PimEyes opt-out walkthrough with all 6 steps', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'face:pimeyes:opt-out',
      serviceName: 'PimEyes',
      optOutUrl: 'https://pimeyes.com/en/opt-out-form',
      walkthrough: PIMEYES_OPT_OUT
    });

    expect(host.querySelectorAll('.walkthrough-step').length).toBe(6);
    expect(host.querySelector('.walkthrough-verification').textContent)
      .toContain('Email confirmation');
  });

  test('renders nothing when walkthrough is null or has no steps', () => {
    const host = makeContainer();
    renderWalkthrough(host, { flowKey: 'x', walkthrough: null });
    expect(host.innerHTML).toBe('');

    renderWalkthrough(host, { flowKey: 'x', walkthrough: { steps: [] } });
    expect(host.innerHTML).toBe('');
  });

  test('checking a step toggles the .done class on the <li>', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:openai-chatgpt',
      serviceName: 'ChatGPT',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    const firstStep = host.querySelector('.walkthrough-step');
    const cb = firstStep.querySelector('input[type="checkbox"]');
    expect(firstStep.classList.contains('done')).toBe(false);

    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    expect(firstStep.classList.contains('done')).toBe(true);

    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    expect(firstStep.classList.contains('done')).toBe(false);
  });

  test('persistence toggle is OFF by default; checking step does not write to sessionStorage', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:openai-chatgpt',
      serviceName: 'ChatGPT',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    const remember = host.querySelector('.walkthrough-remember');
    expect(remember.checked).toBe(false);

    const stepCb = host.querySelector('.walkthrough-step input[type="checkbox"]');
    stepCb.checked = true;
    stepCb.dispatchEvent(new Event('change'));

    expect(sessionStorage.getItem('vanish:walkthrough:ai:openai-chatgpt')).toBeNull();
  });

  test('enabling persistence captures current step state, then changes persist', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:test',
      serviceName: 'Test',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    // Mark step 1 as done first (no persistence yet)
    const firstStepCb = host.querySelector('.walkthrough-step input[type="checkbox"]');
    firstStepCb.checked = true;
    firstStepCb.dispatchEvent(new Event('change'));

    // Now enable persistence — should snapshot current state
    const remember = host.querySelector('.walkthrough-remember');
    remember.checked = true;
    remember.dispatchEvent(new Event('change'));

    const stored = JSON.parse(sessionStorage.getItem('vanish:walkthrough:ai:test'));
    expect(stored[0]).toBe(true);

    // A subsequent step toggle persists too
    const stepCbs = host.querySelectorAll('.walkthrough-step input[type="checkbox"]');
    stepCbs[1].checked = true;
    stepCbs[1].dispatchEvent(new Event('change'));

    const updated = JSON.parse(sessionStorage.getItem('vanish:walkthrough:ai:test'));
    expect(updated[0]).toBe(true);
    expect(updated[1]).toBe(true);
  });

  test('disabling persistence clears stored state', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:test',
      serviceName: 'Test',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    const remember = host.querySelector('.walkthrough-remember');
    remember.checked = true;
    remember.dispatchEvent(new Event('change'));
    expect(sessionStorage.getItem('vanish:walkthrough:ai:test')).not.toBeNull();

    remember.checked = false;
    remember.dispatchEvent(new Event('change'));
    expect(sessionStorage.getItem('vanish:walkthrough:ai:test')).toBeNull();
  });

  test('existing sessionStorage state is restored on render', () => {
    sessionStorage.setItem('vanish:walkthrough-persist:ai:openai-chatgpt', '1');
    sessionStorage.setItem('vanish:walkthrough:ai:openai-chatgpt', JSON.stringify({ 0: true, 2: true }));

    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'ai:openai-chatgpt',
      serviceName: 'ChatGPT',
      walkthrough: CHATGPT_WALKTHROUGH
    });

    const steps = host.querySelectorAll('.walkthrough-step');
    expect(steps[0].classList.contains('done')).toBe(true);
    expect(steps[1].classList.contains('done')).toBe(false);
    expect(steps[2].classList.contains('done')).toBe(true);
  });

  test('close button calls onClose and clears the container', () => {
    const host = makeContainer();
    let closed = false;
    renderWalkthrough(host, {
      flowKey: 'ai:test',
      serviceName: 'Test',
      walkthrough: CHATGPT_WALKTHROUGH,
      onClose: () => { closed = true; }
    });

    const closeBtn = host.querySelector('.walkthrough-close');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();

    expect(closed).toBe(true);
    expect(host.innerHTML).toBe('');
  });

  test('XSS hardening: malicious step text does not inject HTML', () => {
    const host = makeContainer();
    renderWalkthrough(host, {
      flowKey: 'x',
      serviceName: 'Evil <script>alert(1)</script>',
      walkthrough: {
        steps: ['<img src=x onerror=alert(1)>', 'Step 2']
      }
    });

    const html = host.innerHTML;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  test('clearWalkthroughState removes persistence flag and stored state', () => {
    sessionStorage.setItem('vanish:walkthrough:ai:test', JSON.stringify({ 0: true }));
    sessionStorage.setItem('vanish:walkthrough-persist:ai:test', '1');

    clearWalkthroughState('ai:test');

    expect(sessionStorage.getItem('vanish:walkthrough:ai:test')).toBeNull();
    expect(sessionStorage.getItem('vanish:walkthrough-persist:ai:test')).toBeNull();
  });
});
