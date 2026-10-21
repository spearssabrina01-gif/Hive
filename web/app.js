// Amazon Hive — demo orchestration + REAL MCP client for the Alexa+ UI.
//
// The Echo-style panel is a real MCP client: it performs
// initialize → notifications/initialized → tools/list → tools/call against
// POST /api/mcp and renders the result, with the raw JSON-RPC shown in the
// MCP inspector panel. Speech via speechSynthesis ("Your cleaner is here").

const log = (id, msg) => {
  const el = document.getElementById(id);
  el.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + '\n';
  el.scrollTop = el.scrollHeight;
};
const insp = (msg) => {
  const el = document.getElementById('mcp-inspector');
  el.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + '\n';
};

// ---------- Real MCP client (Alexa+ experience) ----------
let mcpId = 1;
async function mcpRpc(method, params = {}) {
  const req = { jsonrpc: '2.0', id: mcpId++, method, params };
  insp('→ ' + JSON.stringify(req));
  const res = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(req),
  });
  const json = await res.json();
  insp('← ' + JSON.stringify(json).slice(0, 2000));
  if (json.error) throw new Error('MCP error: ' + JSON.stringify(json.error));
  return json.result;
}

async function mcpHandshake() {
  const init = await mcpRpc('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'alexa-plus-web-experience', version: '0.1.0' },
  });
  insp('✓ initialized — server: ' + JSON.stringify(init.serverInfo));
  // notifications/initialized is a notification (no id); send it, ignore body.
  await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
  insp('→ notifications/initialized (notification)');
  const tools = await mcpRpc('tools/list');
  insp('✓ tools: ' + tools.tools.map((t) => t.name).join(', '));
  return tools;
}

async function mcpCallTool(name, args) {
  const result = await mcpRpc('tools/call', { name, arguments: args });
  const text = result.content?.[0]?.text;
  return JSON.parse(text);
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) { console.warn('speech unavailable', e); }
}

document.getElementById('mcp-connect').onclick = async (e) => {
  e.target.disabled = true;
  insp('=== MCP handshake (spec 2025-11-25, Streamable HTTP, stateless) ===');
  try {
    await mcpHandshake();
    log('log3', '✓ Real MCP handshake complete against /api/mcp');
  } catch (err) {
    log('log3', '✗ ' + err.message);
  }
  e.target.disabled = false;
};

// ---------- Live hub events (SSE) ----------
const evtSource = new EventSource('/api/events');
evtSource.onmessage = (e) => {
  const ev = JSON.parse(e.data);
  switch (ev.type) {
    case 'expected_visit_logged':
      log('log1', '✓ Expected visit stored: ' + JSON.stringify(ev.visitor));
      refreshState();
      break;
    case 'bee_utterance':
      if (!ev.parsed) log('log1', '(utterance did not match an expected-visitor pattern)');
      break;
    case 'door_event':
      log('log2', '✓ Door event verified+parsed: ' + ev.doorEvent.kind);
      break;
    case 'announcement': {
      const banner = document.getElementById('announce-banner');
      banner.style.display = 'block';
      banner.textContent = '🔊 Alexa+ says: “' + ev.text + '”';
      const echo = document.getElementById('echo');
      echo.classList.add('speaking');
      speak(ev.text);
      log('log3', '✓ Announcement via MCP: ' + ev.text);
      setTimeout(() => echo.classList.remove('speaking'), 2500);
      break;
    }
    case 'visitor_overlay': {
      const q = new URLSearchParams({ who: 'Your ' + ev.visitor_name + ' is here', when: new Date(ev.at).toLocaleTimeString() });
      if (ev.quiet || ev.mode === 'pip') q.set('pip', '1');
      document.getElementById('firetv').src = '/firetv/overlay.html?' + q.toString();
      log('log4', ev.quiet
        ? '✓ Fire TV quiet picture-in-picture (Focus Mode — no announcement): ' + ev.title
        : '✓ Fire TV overlay triggered (SIMULATED panel): ' + ev.title);
      break;
    }
    case 'announcement_suppressed': {
      const banner = document.getElementById('announce-banner');
      banner.style.display = 'block';
      banner.textContent = '🔇 Focus Mode — Alexa+ stayed silent for ' + ev.visitor_name + '. (Door is on Fire TV, quietly.)';
      log('log3', '🔇 Focus Mode: announcement held for ' + ev.visitor_name + ' — no MCP announce call, no audio.');
      break;
    }
    case 'focus_mode':
      renderFocus(ev.enabled);
      log('logfocus', ev.enabled
        ? '🔇 Focus Mode ON — Ring still watches, Alexa+ holds announcements, Fire TV goes quiet PiP, Bee still logs.'
        : '🔊 Focus Mode OFF — normal 5-step flow (announce + full-screen overlay).');
      break;
    case 'brain_dump': {
      document.getElementById('dashboard-tv').src = '/firetv/dashboard.html?t=' + Date.now();
      const d = ev.dashboard || {};
      log('logdump', `✓ Brain Dump composed by hub: ${d.expected_visitors?.length ?? 0} expected visit(s), ` +
        `${d.ring_events?.length ?? 0} Ring event(s), ${d.bee_notes?.length ?? 0} Bee note(s)` +
        (d.focus_mode ? ' · Focus Mode ON' : ''));
      break;
    }
    case 'visit_logged':
      log('daynotes', ''); // placeholder, refreshed below
      refreshState();
      log('log2', '✓ Visit logged to day notes.');
      break;
    case 'reset':
      ['log1','log2','log3','log4','logfocus','logdump'].forEach((id) => (document.getElementById(id).textContent = ''));
      document.getElementById('daynotes').innerHTML = '';
      refreshState();
      break;
  }
};

// ---------- Step run buttons ----------
document.querySelectorAll('button.run[data-step]').forEach((btn) => {
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const step = btn.dataset.step;
      if (step === '1') {
        log('log1', '→ Bee heard: "I\'m expecting the cleaner at 3"');
        const r = await fetch('/api/demo/utterance', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: "I'm expecting the cleaner at 3" }),
        }).then((r) => r.json());
        log('log1', 'Hub: ' + JSON.stringify(r.result));
      } else if (step === '2') {
        log('log2', '→ Mock Ring: human motion at front door (signed payload)…');
        const r = await fetch('/api/demo/ring-human', { method: 'POST' }).then((r) => r.json());
        log('log2', 'Ring webhook: HTTP ' + r.ring.status + ' ' + JSON.stringify(r.ring.body));
      } else if (step === 'braindump') {
        log('logdump', '→ “Alexa, show my brain dump” — hub composes the dashboard…');
        await fetch('/api/demo/brain-dump', { method: 'POST' });
        // The brain_dump SSE event renders the dashboard iframe + summary.
      } else if (step === '5refresh' || step === 'state') {
        await refreshState();
      }
    } catch (err) {
      log('log1', '✗ ' + err.message);
    }
    btn.disabled = false;
  };
});

// ---------- Hive Focus Mode (tap Bee) ----------
function renderFocus(on) {
  const btn = document.getElementById('focus-toggle');
  btn.textContent = on ? '🐝 Focus Mode: ON — tap Bee to release' : 'Tap Bee — Focus: OFF';
  btn.classList.toggle('on', !!on);
}
document.getElementById('focus-toggle').onclick = async (e) => {
  e.target.disabled = true;
  try {
    const r = await fetch('/api/demo/focus', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
    }).then((r) => r.json());
    renderFocus(r.focus_mode); // the focus_mode SSE event logs it
  } catch (err) {
    log('logfocus', '✗ ' + err.message);
  }
  e.target.disabled = false;
};

async function refreshState() {
  const s = await fetch('/api/state').then((r) => r.json());
  renderFocus(s.focus_mode);
  document.getElementById('state').textContent = JSON.stringify(s, null, 2);
  document.getElementById('daynotes').innerHTML = s.day_notes
    .map((n) => `<li>${new Date(n.at).toLocaleTimeString()} — ${n.text}</li>`)
    .join('') || '<li>(no visits logged yet)</li>';
  return s;
}

document.getElementById('reset').onclick = async () => {
  await fetch('/api/demo/reset', { method: 'POST' });
};

window.addEventListener('message', (e) => {
  if (e.data?.type === 'firetv_dismissed') log('log4', '(overlay dismissed)');
});

refreshState();
