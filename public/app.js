const TOKEN_KEY = 'eventia_token';

const els = {
  session: document.getElementById('session'),
  logout: document.getElementById('logout'),
  panelAuth: document.getElementById('panel-auth'),
  panelWelcome: document.getElementById('panel-welcome'),
  panelOrganizador: document.getElementById('panel-organizador'),
  panelInscribir: document.getElementById('panel-inscribir'),
  welcomeText: document.getElementById('welcome-text'),
  inscripcionesList: document.getElementById('inscripciones-list'),
  eventosGrid: document.getElementById('eventos-grid'),
  eventosEmpty: document.getElementById('eventos-empty'),
  insEvento: document.getElementById('ins-evento'),
  toastStack: document.getElementById('toast-stack'),
};

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function parseJwt(t) {
  try {
    const part = t.split('.')[1];
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function toast(message, ok = true) {
  const el = document.createElement('div');
  el.className = `toast ${ok ? 'ok' : 'err'}`;
  el.textContent = message;
  els.toastStack.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function formatMessage(body) {
  if (!body) return 'Listo';
  if (typeof body === 'string') return body;
  if (body.message) {
    return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
  }
  return 'Operación completada';
}

async function api(path, options = {}, silent = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(path, { ...options, headers });
  let body;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!silent) {
    toast(formatMessage(body), res.ok);
  }
  return { res, body };
}

function formatFecha(iso) {
  try {
    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPrecio(n) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 2,
  }).format(n);
}

let lastEventos = [];

function fillInscripcionSelect(eventos) {
  els.insEvento.innerHTML = '';
  const abiertos = eventos.filter((e) => e.estado === 'abierto' && e.disponibles > 0);
  if (!abiertos.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No hay eventos abiertos con cupo';
    els.insEvento.appendChild(opt);
    els.insEvento.disabled = true;
    return;
  }
  els.insEvento.disabled = false;
  for (const ev of abiertos) {
    const opt = document.createElement('option');
    opt.value = String(ev.id);
    opt.textContent = `${ev.titulo} (${ev.disponibles} lugares)`;
    els.insEvento.appendChild(opt);
  }
}

function renderEventos(eventos) {
  lastEventos = eventos;
  els.eventosGrid.innerHTML = '';
  const logged = !!token();
  if (!Array.isArray(eventos) || !eventos.length) {
    els.eventosEmpty.classList.remove('hidden');
    fillInscripcionSelect([]);
    return;
  }
  els.eventosEmpty.classList.add('hidden');

  for (const ev of eventos) {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.innerHTML = `
      <header>
        <h3>${escapeHtml(ev.titulo)}</h3>
        <span class="badge ${escapeHtml(ev.estado)}">${escapeHtml(ev.estado)}</span>
      </header>
      <p class="event-meta"><strong>${formatFecha(ev.fecha)}</strong></p>
      <p class="event-meta">${formatPrecio(ev.precio)} · ${ev.disponibles} de ${ev.cupo} lugares</p>
      ${ev.descripcion ? `<p class="event-desc">${escapeHtml(ev.descripcion)}</p>` : ''}
    `;
    if (logged && ev.estado === 'abierto' && ev.disponibles > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = 'Inscribirme';
      btn.addEventListener('click', () => {
        els.insEvento.value = String(ev.id);
        els.panelInscribir.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      card.appendChild(btn);
    }
    els.eventosGrid.appendChild(card);
  }
  fillInscripcionSelect(eventos);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadEventos(q) {
  const url = q ? `/api/eventos?q=${encodeURIComponent(q)}` : '/api/eventos';
  const { res, body } = await api(url, {}, true);
  if (res.ok && Array.isArray(body)) {
    renderEventos(body);
  }
}

async function loadInscripciones() {
  els.inscripcionesList.innerHTML = '';
  if (!token()) return;
  const { res, body } = await api('/api/inscripciones/mias', {}, true);
  if (!res.ok || !Array.isArray(body)) {
    const li = document.createElement('li');
    li.textContent = 'No se pudieron cargar tus inscripciones.';
    els.inscripcionesList.appendChild(li);
    return;
  }
  if (!body.length) {
    const li = document.createElement('li');
    li.textContent = 'Aún no te has inscrito a ningún evento.';
    els.inscripcionesList.appendChild(li);
    return;
  }
  for (const ins of body) {
    const ev = lastEventos.find((e) => e.id === ins.eventoId);
    const li = document.createElement('li');
    li.textContent = ev
      ? `${ev.titulo} · cantidad ${ins.cantidad}`
      : `Evento #${ins.eventoId} · cantidad ${ins.cantidad}`;
    els.inscripcionesList.appendChild(li);
  }
}

function refreshSession() {
  const t = token();
  const payload = t ? parseJwt(t) : null;

  if (t && payload) {
    els.session.textContent = payload.correo || 'Sesión activa';
    els.session.classList.add('active');
    els.logout.hidden = false;
    els.panelAuth.classList.add('hidden');
    els.panelWelcome.classList.remove('hidden');
    els.panelInscribir.classList.remove('hidden');
    els.welcomeText.textContent = `Rol: ${payload.rol}. Explora eventos o gestiona tus reservas.`;
    els.panelOrganizador.classList.toggle('hidden', payload.rol !== 'organizador');
    loadInscripciones();
  } else {
    els.session.textContent = 'Sin sesión';
    els.session.classList.remove('active');
    els.logout.hidden = true;
    els.panelAuth.classList.remove('hidden');
    els.panelWelcome.classList.add('hidden');
    els.panelOrganizador.classList.add('hidden');
    els.panelInscribir.classList.add('hidden');
  }
  renderEventos(lastEventos);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.tab;
    document.getElementById('tab-login').classList.toggle('hidden', name !== 'login');
    document.getElementById('tab-register').classList.toggle('hidden', name !== 'register');
  });
});

els.logout.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  refreshSession();
  toast('Sesión cerrada', true);
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const { res } = await api('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      nombre: fd.get('nombre'),
      correo: fd.get('correo'),
      password: fd.get('password'),
    }),
  });
  if (res.ok) e.target.reset();
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const { res, body } = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      correo: fd.get('correo'),
      password: fd.get('password'),
    }),
  });
  if (res.ok && body.accessToken) {
    localStorage.setItem(TOKEN_KEY, body.accessToken);
    refreshSession();
    await loadEventos();
    await loadInscripciones();
  }
});

document.getElementById('form-search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = new FormData(e.target).get('q');
  await loadEventos(q || undefined);
});

document.getElementById('btn-reload').addEventListener('click', async () => {
  document.querySelector('#form-search input[name="q"]').value = '';
  await loadEventos();
});

document.getElementById('form-evento').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const local = fd.get('fecha');
  const fecha = local ? new Date(local).toISOString() : '';
  const { res } = await api('/api/eventos', {
    method: 'POST',
    body: JSON.stringify({
      titulo: fd.get('titulo'),
      fecha,
      cupo: Number(fd.get('cupo')),
      precio: Number(fd.get('precio')),
      descripcion: fd.get('descripcion') || undefined,
    }),
  });
  if (res.ok) {
    e.target.reset();
    await loadEventos();
  }
});

document.getElementById('form-inscripcion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const eventoId = fd.get('eventoId');
  if (!eventoId) return;
  const { res } = await api(`/api/eventos/${eventoId}/inscripciones`, {
    method: 'POST',
    body: JSON.stringify({ cantidad: Number(fd.get('cantidad')) }),
  });
  if (res.ok) {
    await loadEventos();
    await loadInscripciones();
  }
});

refreshSession();
loadEventos();
