const tabs = Array.from(document.querySelectorAll('nav button'));
const sections = Array.from(document.querySelectorAll('.tab'));
const connectBtn = document.getElementById('connectBtn');
const apiBase = document.getElementById('apiBase');
const token = document.getElementById('token');
const authStatus = document.getElementById('authStatus');
const agentsData = document.getElementById('agentsData');
const callsData = document.getElementById('callsData');

function setTab(tabId) {
  sections.forEach((section) => section.classList.toggle('active', section.id === tabId));
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabId));
}

tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

async function apiGet(path) {
  const res = await fetch(`${apiBase.value}${path}`, {
    headers: {
      Authorization: `Bearer ${token.value}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  return res.json();
}

connectBtn.addEventListener('click', async () => {
  authStatus.textContent = 'Connecting...';

  try {
    await apiGet('/v1/ready');
    const [agents, calls] = await Promise.all([apiGet('/v1/agents'), apiGet('/v1/calls')]);
    authStatus.textContent = 'Connected';
    authStatus.className = 'ok';
    agentsData.textContent = JSON.stringify(agents, null, 2);
    callsData.textContent = JSON.stringify(calls, null, 2);
  } catch (error) {
    authStatus.textContent = `Failed: ${error.message}`;
    authStatus.className = 'error';
  }
});
