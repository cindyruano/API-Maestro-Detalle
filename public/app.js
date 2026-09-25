let estudiantesData = [];

// Lista de las 5 especificaciones fijas del reto
const especificaciones = [
  { id: 1, nombre: "Crear API" },
  { id: 2, nombre: "Crear Frontend" },
  { id: 3, nombre: "Subir código a GitHub" },
  { id: 4, nombre: "Publicar en hosting" },
  { id: 5, nombre: "Pruebas de Ingreso" }
];

async function cargarDatos() {
  try {
    const res = await fetch('/api/estudiantes');
    estudiantesData = await res.json();

    renderStats(estudiantesData);
    renderCards(estudiantesData);
  } catch (err) {
    console.error(err);
    document.getElementById('estudiantes').innerHTML = `<div class="loading-state">Error al conectar con la API</div>`;
  }
}

function renderStats(estudiantes) {
  const container = document.getElementById('statsOverview');
  const total = estudiantes.length;
  const completados = estudiantes.filter(e => e.misiones.filter(m => m.estado).length === 5).length;
  
  let suma = 0;
  estudiantes.forEach(e => suma += (e.misiones.filter(m => m.estado).length / 5));
  const promedio = total > 0 ? Math.round((suma / total) * 100) : 0;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-number" style="color: var(--text-primary);">${total}</div>
      <div class="stat-label">Alumnos</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color: var(--pink-accent);">${completados}</div>
      <div class="stat-label">Completados</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color: var(--purple-accent);">${promedio}%</div>
      <div class="stat-label">Promedio</div>
    </div>
  `;
}

function renderCards(estudiantes) {
  const grid = document.getElementById('estudiantes');

  if (estudiantes.length === 0) {
    grid.innerHTML = `<div class="loading-state">No se encontraron estudiantes</div>`;
    return;
  }

  grid.innerHTML = estudiantes.map(est => {
    const logradas = est.misiones.filter(m => m.estado).length;
    const pct = Math.round((logradas / 5) * 100);
    const es100 = pct === 100;
    const esMiCarnet = est.carnet.includes('10675'); 

    const misionesHTML = especificaciones.map(spec => {
      const m = est.misiones.find(item => item.misionId === spec.id);
      const completada = m && m.estado;
      return `
        <li class="mission-item ${completada ? 'done' : ''}">
          <span class="check-icon ${completada ? 'done' : 'pending'}">${completada ? '✓' : '○'}</span>
          <span>${spec.nombre}</span>
        </li>
      `;
    }).join('');

    return `
      <article class="card ${esMiCarnet ? 'is-me' : ''}">
        <div>
          <div class="card-header">
            <div>
              <div class="student-name">${est.nombre} ${esMiCarnet ? '🌸' : ''}</div>
              <div class="student-carnet">Carnet ${est.carnet}</div>
            </div>
            <span class="pct-badge ${es100 ? 'complete' : 'partial'}">
              ${pct}%
            </span>
          </div>

          <div class="progress-container">
            <div class="progress-info">
              <span>${logradas} de 5 misiones</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${es100 ? 'fill-complete' : 'fill-partial'}" style="width: ${pct}%;"></div>
            </div>
          </div>
        </div>

        <ul class="missions-list">
          ${misionesHTML}
        </ul>
      </article>
    `;
  }).join('');
}

document.getElementById('buscar').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtrados = estudiantesData.filter(est => 
    est.nombre.toLowerCase().includes(q) || 
    est.carnet.toLowerCase().includes(q)
  );
  renderCards(filtrados);
});

cargarDatos();