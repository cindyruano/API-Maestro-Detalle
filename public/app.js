async function cargarEstudiantes() {
  const resEst = await fetch('/api/estudiantes');
  const estudiantes = await resEst.json();
  const contenedor = document.getElementById('estudiantes');

  contenedor.innerHTML = estudiantes.map(e => {
    const completadas = e.misiones.filter(m => m.estado).length;
    const pct = Math.round((completadas / 5) * 100);
    return `
      <div class="card">
        <h3>${e.nombre} (${e.carnet})</h3>
        <p>Progreso: ${completadas}/5 (${pct}%)</p>
      </div>
    `;
  }).join('');
}
cargarEstudiantes();