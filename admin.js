/* =====================================================================
   UNM Talleres – Panel de encargado (simulado)
   Lee y modifica las mismas reservas que guarda la web del alumno
   (localStorage 'talleresReservas'). Vistas: panel, usuarios, asistencia, reportes.
   ===================================================================== */
(function () {
    const CLAVE = 'talleresReservas';
    const HORARIOS = ['08:00-10:00', '09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
    const ESTADOS = {
        proximo:    { texto: 'Próximo',    clase: 'badge-disponible' },
        'en-curso': { texto: 'En curso',   clase: 'badge-en-curso' },
        finalizado: { texto: 'Finalizado', clase: 'badge-finalizado' },
        cancelado:  { texto: 'Cancelado',  clase: 'badge-no-disponible' }
    };
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const iso = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    const desdeISO = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
    const fechaLarga = (s) => { const t = desdeISO(s).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };
    const hora = (c) => c ? new Date(c).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

    /* ---------- datos ---------- */
    const cargar = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; } };
    const guardar = (l) => { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch (e) { /* storage bloqueado */ } };

    function momento(t, p) {
        const [h, m] = t.horario.split('-')[p].split(':').map(Number);
        const f = desdeISO(t.fecha); f.setHours(h, m, 0, 0); return f;
    }
    function estadoDe(t) {
        if (t.estado === 'cancelado') return 'cancelado';
        const a = new Date();
        return a >= momento(t, 1) ? 'finalizado' : a >= momento(t, 0) ? 'en-curso' : 'proximo';
    }
    function nombreDe(dni) {
        const u = Sesion.USUARIOS.find(x => x.dni === dni);
        return u ? u.nombre : 'Alumno sin registrar';
    }
    const turnosDeHoy = (dni) => cargar().filter(t => t.dni === dni && t.fecha === iso(new Date()) && t.estado !== 'cancelado');

    /* ---------- vistas ---------- */
    function mostrar() {
        const v = ['usuarios', 'asistencia', 'reportes'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'panel';
        document.querySelectorAll('[data-vista]').forEach(s => s.classList.toggle('d-none', s.dataset.vista !== v));
        if (v === 'panel') renderPanel();
        if (v === 'usuarios') renderUsuarios();
        if (v === 'asistencia') irAsis(1, true);
        if (v === 'reportes') renderReportes();
        const t = document.querySelector(`[data-vista="${v}"] h3`);
        if (t) t.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    function renderPanel() {
        const todas = cargar();
        const dnis = new Set(Sesion.USUARIOS.filter(u => u.rol === 'alumno').map(u => u.dni));
        todas.forEach(t => t.dni && dnis.add(t.dni));
        const hoy = todas.filter(t => t.fecha === iso(new Date()) && t.estado !== 'cancelado').length;
        const sinLeer = todas.filter(t => t.reporte && !t.reporte.leido).length;
        $('dato-usuarios').textContent = `${dnis.size} ${dnis.size === 1 ? 'alumno' : 'alumnos'}`;
        $('dato-asistencia').textContent = `${hoy} ${hoy === 1 ? 'turno' : 'turnos'} para hoy`;
        $('dato-reportes').textContent = sinLeer ? `${sinLeer} sin leer` : 'Sin reportes nuevos';
    }

    /* ---------- listado de usuarios ---------- */
    function renderUsuarios() {
        const q = $('buscar-usuario').value.trim().toLowerCase();
        const todas = cargar();
        const dnis = new Set(Sesion.USUARIOS.filter(u => u.rol === 'alumno').map(u => u.dni));
        todas.forEach(t => t.dni && dnis.add(t.dni));

        const filas = [...dnis].map(dni => {
            const ts = todas.filter(t => t.dni === dni);
            const ult = ts.map(t => t.fecha).sort().pop();
            return { dni, nombre: nombreDe(dni), turnos: ts.length, asistio: ts.filter(t => t.asistio).length, ult };
        }).filter(f => !q || f.dni.includes(q) || f.nombre.toLowerCase().includes(q));

        $('tabla-usuarios').innerHTML = filas.length
            ? filas.map(f => `<tr><td>${esc(f.nombre)}</td><td>${esc(f.dni)}</td><td>${f.turnos}</td><td>${f.asistio}</td><td>${f.ult ? esc(fechaLarga(f.ult)) : '-'}</td></tr>`).join('')
            : '<tr><td colspan="5" class="text-center text-secondary py-4">No se encontraron usuarios.</td></tr>';
    }

    /* ---------- validación de asistencia ---------- */
    const PASOS = ['Ingreso de DNI', 'Validación de turno', 'Registro de turno'];
    function irAsis(n, reset) {
        if (reset) { $('asis-dni').value = ''; $('asis-error').textContent = ''; }
        [1, 2, 3].forEach(i => $('asis-' + i).classList.toggle('d-none', i !== n));
        $('asis-stepper').innerHTML = PASOS.map((p, i) =>
            `<li class="paso ${i + 1 === n ? 'activo' : ''} ${i + 1 < n ? 'hecho' : ''}"><span>${i + 1}</span> ${p}</li>`).join('');
        if (n === 1) $('asis-dni').focus({ preventScroll: true });
    }

    function buscarTurno(dni) {
        const ts = turnosDeHoy(dni).sort((a, b) => momento(a, 0) - momento(b, 0));
        $('asis-alumno').textContent = `${nombreDe(dni)} · DNI ${dni}`;
        $('asis-turnos').innerHTML = ts.length ? ts.map(t => {
            const e = estadoDe(t), info = ESTADOS[e];
            const boton = t.asistio
                ? '<button type="button" class="btn btn-accion btn-accion-ok" disabled><i class="bi bi-check2"></i> ASISTENCIA REGISTRADA</button>'
                : e === 'finalizado'
                    ? '<span class="small text-secondary">El horario ya terminó.</span>'
                    : `<button type="button" class="btn btn-accion btn-accion-principal" data-validar="${esc(t.id)}">VALIDAR ASISTENCIA</button>`;
            return `<div class="resumen-turno d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div><strong>${esc(t.compuNombre)}</strong> <span class="badge ${info.clase} ms-1">${info.texto}</span>
                <div class="small mt-1"><i class="bi bi-clock"></i> ${esc(t.horario)} hs · código ${esc(t.codigo)}</div></div>${boton}</div>`;
        }).join('') : '<p class="mb-0">Este alumno no tiene turnos para hoy.</p>';
        irAsis(2);
    }

    function validar(id) {
        const lista = cargar(), t = lista.find(x => x.id === id);
        if (!t) return;
        t.asistio = true; t.asistioEn = new Date().toISOString(); t.confirmado = true;
        guardar(lista);
        $('asis-resumen').innerHTML = `
            <div><i class="bi bi-person"></i> ${esc(nombreDe(t.dni))} · DNI ${esc(t.dni)}</div>
            <div><i class="bi bi-box-seam"></i> ${esc(t.compuNombre)}</div>
            <div><i class="bi bi-calendar-event"></i> ${esc(fechaLarga(t.fecha))}, ${esc(t.horario)} hs</div>
            <div><i class="bi bi-ticket-perforated"></i> Código: <strong>${esc(t.codigo)}</strong></div>
            <div><i class="bi bi-check2-square"></i> Registrado el ${esc(hora(t.asistioEn))}</div>`;
        irAsis(3);
    }

    /* ---------- reporte de usos ---------- */
    function renderReportes() {
        const rs = cargar().filter(t => t.reporte).sort((a, b) =>
            (!!a.reporte.leido - !!b.reporte.leido) || (new Date(b.reporte.enviadoEn) - new Date(a.reporte.enviadoEn)));
        $('lista-reportes').innerHTML = rs.length ? rs.map(t => `
            <article class="panel-caja reporte-item ${t.reporte.leido ? '' : 'sin-leer'}">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <strong>${esc(t.reporte.motivo)}</strong>
                    <span class="badge ${t.reporte.leido ? 'badge-finalizado' : 'badge-pendiente'}">${t.reporte.leido ? 'Leído' : 'Sin leer'}</span>
                </div>
                <p class="mb-2">${esc(t.reporte.detalle)}</p>
                <p class="small text-secondary mb-3">${esc(nombreDe(t.dni))}${t.dni ? ' · DNI ' + esc(t.dni) : ''} · ${esc(t.compuNombre)} · ${esc(fechaLarga(t.fecha))} · enviado el ${esc(hora(t.reporte.enviadoEn))}</p>
                <button type="button" class="btn btn-accion btn-accion-detalle" data-leido="${esc(t.id)}">${t.reporte.leido ? 'MARCAR COMO NO LEÍDO' : 'MARCAR COMO LEÍDO'}</button>
            </article>`).join('')
            : '<p class="text-center text-secondary my-4">Todavía no hay reportes.</p>';
    }

    /* ---------- datos de ejemplo ---------- */
    function cargarDemo() {
        const lista = cargar();
        if (lista.some(t => String(t.id).startsWith('T-EJ'))) return;
        const ahora = new Date().getHours() * 60 + new Date().getMinutes();
        const prox = HORARIOS.find(h => { const [a] = h.split('-')[1].split(':').map(Number); return a * 60 > ahora; }) || HORARIOS[HORARIOS.length - 1];
        const hace = (d) => { const f = new Date(); f.setDate(f.getDate() - d); return iso(f); };
        const base = { estado: 'activo', creadoEn: new Date().toISOString() };
        lista.push(
            { ...base, id: 'T-EJ1', codigo: 'T-EJ1', dni: '40123456', categoria: 'arduino', compuNombre: 'Kits Arduino ×2', img: 'img/icono-arduino.webp', items: [{ id: 'arduino', nombre: 'Kit Arduino', cantidad: 2 }], fecha: iso(new Date()), horario: prox },
            { ...base, id: 'T-EJ2', codigo: 'T-EJ2', dni: '41222333', categoria: 'pc', compuNombre: 'PC', img: 'img/icono-pc.webp', items: [{ id: 'pc', nombre: 'PC', cantidad: 1 }], fecha: iso(new Date()), horario: prox },
            { ...base, id: 'T-EJ3', codigo: 'T-EJ3', dni: '42333444', categoria: 'proyectores', compuNombre: 'Proyector', img: 'img/icono-proyector.webp', items: [{ id: 'proyectores', nombre: 'Proyector', cantidad: 1 }], fecha: hace(2), horario: '14:00-16:00', confirmado: true, asistio: true, asistioEn: new Date().toISOString(),
              reporte: { motivo: 'Problema con el equipo', detalle: 'El proyector se apagaba solo a los 20 minutos de uso.', enviadoEn: new Date().toISOString() } }
        );
        guardar(lista);
        mostrar();
    }

    /* ---------- eventos ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        $('nombre-admin').textContent = (Sesion.actual() || {}).nombre || '';
        $('asis-dni').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
        $('buscar-usuario').addEventListener('input', renderUsuarios);
        $('form-dni').addEventListener('submit', e => {
            e.preventDefault();
            const dni = $('asis-dni').value.trim();
            if (!/^\d{7,8}$/.test(dni)) { $('asis-error').textContent = 'Ingresá un DNI válido (7 u 8 números).'; return; }
            $('asis-error').textContent = '';
            buscarTurno(dni);
        });
        $('asis-turnos').addEventListener('click', e => { const b = e.target.closest('[data-validar]'); if (b) validar(b.dataset.validar); });
        $('asis-otro').addEventListener('click', () => irAsis(1, true));
        $('asis-nuevo').addEventListener('click', () => irAsis(1, true));
        $('lista-reportes').addEventListener('click', e => {
            const b = e.target.closest('[data-leido]'); if (!b) return;
            const lista = cargar(), t = lista.find(x => x.id === b.dataset.leido);
            if (t && t.reporte) { t.reporte.leido = !t.reporte.leido; guardar(lista); renderReportes(); }
        });
        $('btn-demo').addEventListener('click', cargarDemo);
        window.addEventListener('hashchange', mostrar);
        mostrar();
    });
})();