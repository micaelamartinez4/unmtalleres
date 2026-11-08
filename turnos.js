/* =====================================================================
   UNM Talleres – página "Mis turnos"
   Lee los turnos que se guardan al confirmar una reserva (javascript.js)
   y maneja: turnos activos, historial, detalles, cancelación, reportes
   y descarga del comprobante en PDF.
   ===================================================================== */

const CLAVE_RESERVAS = 'talleresReservas'; // misma clave que usa javascript.js

const MOTIVOS_REPORTE = [
    'Problema con el equipo',
    'El software no funcionaba',
    'Problema de conexión a internet',
    'Estado o limpieza del puesto',
    'Otro'
];

const NOMBRES_CATEGORIA = {
    arduino: 'KIT ARDUINO',
    pc: 'PC',
    proyectores: 'PROYECTORES',
    experimentacion: 'EXPERIMENTACIÓN'
};

const SALON_DEFAULT = 'Salón I001'; // para turnos guardados sin salón

const ESTADOS = {
    'pendiente': { texto: 'Por confirmar', clase: 'badge-pendiente' },
    'confirmado': { texto: 'Confirmado', clase: 'badge-disponible' },
    'en-curso': { texto: 'En curso', clase: 'badge-en-curso' },
    'finalizado': { texto: 'Finalizado', clase: 'badge-finalizado' },
    'cancelado': { texto: 'Cancelado', clase: 'badge-no-disponible' }
};

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let turnoActual = null; // turno sobre el que se abrió un pop up

/* ---------- FECHAS ---------- */

function desdeISO(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
}

function fechaLarga(iso) {
    const txt = desdeISO(iso).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function fechaHora(isoCompleto) {
    if (!isoCompleto) return '-';
    return new Date(isoCompleto).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function momento(t, parte) { // parte: 0 = inicio, 1 = fin
    const [h, m] = t.horario.split('-')[parte].split(':').map(Number);
    const f = desdeISO(t.fecha);
    f.setHours(h, m, 0, 0);
    return f;
}

function estadoActual(t) {
    if (t.estado === 'cancelado') return 'cancelado';
    const ahora = new Date();
    if (ahora >= momento(t, 1)) return 'finalizado';
    if (ahora >= momento(t, 0)) return 'en-curso';
    return t.confirmado ? 'confirmado' : 'pendiente';
}

/* ---------- ALMACENAMIENTO ---------- */

function cargarTurnos() {
    let crudos = [];
    try {
        crudos = JSON.parse(localStorage.getItem(CLAVE_RESERVAS)) || [];
    } catch (e) { /* storage vacío o bloqueado */ }

    // Completa datos faltantes (por si hay reservas guardadas con un formato anterior)
    return crudos.map(r => ({
        ...r,
        id: r.id || r.codigo || `${r.compuId}|${r.fecha}|${r.horario}`,
        codigo: r.codigo || ('T-' + String(r.compuId) + r.fecha.replace(/-/g, '').slice(2)),
        compuNombre: r.compuNombre || `Computadora Nº${r.compuId}`,
        salon: r.salon || SALON_DEFAULT,
        img: r.img || '',
        items: r.items || (r.software || []).map(s => ({ nombre: s, cantidad: 1 })),
        estado: r.estado || 'activo'
    }));
}

function guardarTurnos(lista) {
    try {
        localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(lista));
    } catch (e) { /* si no se puede guardar, el cambio vale solo en esta sesión */ }
}

function actualizarTurno(id, cambios) {
    const lista = cargarTurnos();
    const t = lista.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, cambios);
    guardarTurnos(lista);
    return t;
}

function buscarTurno(id) {
    return cargarTurnos().find(t => t.id === id) || null;
}

/* ---------- LISTADOS ---------- */

function htmlCard(t) {
    const est = estadoActual(t);
    const info = ESTADOS[est];
    const id = esc(t.id);

    const btn = (accion, clase, texto, extra = '') =>
        `<button type="button" class="btn btn-accion ${clase}" data-accion="${accion}" data-id="${id}" ${extra}>${texto}</button>`;

    let acciones = '';
    if (est === 'pendiente') {
        acciones = btn('confirmar', 'btn-accion-principal', 'CONFIRMAR') +
            btn('detalles', 'btn-accion-detalle', 'VER DETALLE') +
            btn('cancelar', 'btn-accion-cancelar', 'CANCELAR TURNO');
    } else if (est === 'confirmado') {
        acciones = btn('', 'btn-accion-ok', '<i class="bi bi-check2"></i> CONFIRMADO', 'disabled') +
            btn('detalles', 'btn-accion-detalle', 'VER DETALLE') +
            btn('cancelar', 'btn-accion-cancelar', 'CANCELAR TURNO');
    } else if (est === 'finalizado') {
        acciones = btn('detalles', 'btn-accion-detalle', 'VER DETALLE') +
            (t.reporte
                ? btn('', 'btn-accion-ok', '<i class="bi bi-check2"></i> REPORTE ENVIADO', 'disabled')
                : btn('reportar', 'btn-accion-principal', 'HACER UN REPORTE'));
    } else { // en curso o cancelado
        acciones = btn('detalles', 'btn-accion-detalle', 'VER DETALLE');
    }

    return `
    <article class="turno-card">
        <img src="${esc(t.img)}" alt="" class="turno-img" onerror="this.style.visibility='hidden'">
        <div class="turno-cuerpo">
            <div class="turno-cabecera">
                <div class="d-flex flex-wrap align-items-center gap-2">
                    <h4 class="turno-titulo">${esc(t.compuNombre)}</h4>
                    <span class="badge ${info.clase}">${info.texto}</span>
                </div>
                <button type="button" class="btn-descarga" data-accion="descargar" data-id="${id}"
                    title="Descargar comprobante" aria-label="Descargar comprobante en PDF">
                    <i class="bi bi-download"></i>
                </button>
            </div>
            <ul class="turno-datos list-unstyled">
                <li><i class="bi bi-geo-alt"></i> ${esc(t.salon)}</li>
                <li><i class="bi bi-calendar-event"></i> ${esc(fechaLarga(t.fecha))}</li>
                <li><i class="bi bi-clock"></i> ${esc(t.horario)}</li>
            </ul>
            <div class="turno-acciones">${acciones}</div>
        </div>
    </article>`;
}

let firmaRender = '';

function renderTurnos() {
    const todos = cargarTurnos();
    // Solo se redibuja si algo cambió: evita que cada 30 s se pierda el foco o el botón bajo el cursor
    const firma = JSON.stringify(todos.map(t => [t.id, estadoActual(t), !!t.confirmado, !!t.reporte]));
    if (firma === firmaRender) return;
    firmaRender = firma;

    const activos = [];
    const historial = [];

    todos.forEach(t => {
        const est = estadoActual(t);
        (est === 'finalizado' || est === 'cancelado' ? historial : activos).push(t);
    });

    activos.sort((a, b) => momento(a, 0) - momento(b, 0));      // el más próximo primero
    historial.sort((a, b) => momento(b, 0) - momento(a, 0));    // el más reciente primero

    $('lista-activos').innerHTML = activos.map(htmlCard).join('');
    $('lista-historial').innerHTML = historial.map(htmlCard).join('');
    $('vacio-activos').classList.toggle('d-none', activos.length > 0);
    $('vacio-historial').classList.toggle('d-none', historial.length > 0);
    $('cuenta-activos').textContent = activos.length;
    $('cuenta-historial').textContent = historial.length;
    const btnBorrar = $('btn-borrar-historial');
    if (btnBorrar) btnBorrar.classList.toggle('d-none', historial.length === 0);
}

function mostrarPestania(cual) {
    const activos = cual === 'activos';
    $('panel-activos').classList.toggle('d-none', !activos);
    $('panel-historial').classList.toggle('d-none', activos);
    $('tab-activos').classList.toggle('activa', activos);
    $('tab-historial').classList.toggle('activa', !activos);
    $('tab-activos').setAttribute('aria-selected', activos);
    $('tab-historial').setAttribute('aria-selected', !activos);
}

/* ---------- POP UPS ---------- */

const modal = (id) => bootstrap.Modal.getOrCreateInstance($(id));

function filasResumen(t) {
    return `
        <div><i class="bi bi-display"></i> ${esc(t.compuNombre)}</div>
        <div><i class="bi bi-geo-alt"></i> ${esc(t.salon)}</div>
        <div><i class="bi bi-calendar-event"></i> ${esc(fechaLarga(t.fecha))}</div>
        <div><i class="bi bi-clock"></i> ${esc(t.horario)} hs</div>`;
}

/* Detalles */
function abrirDetalles(t) {
    const est = ESTADOS[estadoActual(t)];

    $('det-titulo').textContent = NOMBRES_CATEGORIA[t.categoria] || t.compuNombre;
    $('det-img').style.display = '';
    $('det-img').src = t.img;
    $('det-img').alt = t.compuNombre;
    $('det-estado').className = 'badge ' + est.clase;
    $('det-estado').textContent = est.texto;
    $('det-salon').textContent = t.salon;
    $('det-fecha').textContent = fechaLarga(t.fecha);
    $('det-horario').textContent = t.horario;
    $('det-codigo').textContent = t.codigo;
    $('det-reservado').textContent = fechaHora(t.creadoEn);

    $('det-software').innerHTML = t.items.map(i => `<span class="tag-software">${esc(i.nombre)} ×${i.cantidad}</span>`).join('');

    $('det-cancelado-fila').classList.toggle('d-none', !t.canceladoEn);
    $('det-cancelado').textContent = fechaHora(t.canceladoEn);

    $('det-reporte-fila').classList.toggle('d-none', !t.reporte);
    if (t.reporte) {
        $('det-reporte-motivo').textContent = t.reporte.motivo;
        $('det-reporte-detalle').textContent = t.reporte.detalle;
    }

    modal('modalDetalles').show();
}

/* Confirmar turno → pop up de turno confirmado */
function confirmarTurno(t) {
    const actualizado = actualizarTurno(t.id, { confirmado: true, confirmadoEn: new Date().toISOString() });
    if (window.Notificaciones) {
        Notificaciones.agregar('confirmacion', 'Turno confirmado',
            `${t.compuNombre} · ${fechaLarga(t.fecha)} · ${t.horario} hs. ¡Te esperamos!`);
    }
    $('confirmado-resumen').innerHTML = filasResumen(actualizado || t);
    renderTurnos();
    modal('modalConfirmado').show();
}

/* Cancelar: confirmación → turno cancelado, todo en el mismo pop up */
function abrirCancelar(t) {
    turnoActual = t;
    $('cancelar-resumen').innerHTML = filasResumen(t);
    $('cancelar-paso-1').classList.remove('d-none');
    $('cancelar-paso-2').classList.add('d-none');
    modal('modalCancelar').show();
}

function confirmarCancelacion() {
    if (!turnoActual) return;
    actualizarTurno(turnoActual.id, { estado: 'cancelado', canceladoEn: new Date().toISOString() });
    if (window.Notificaciones) {
        Notificaciones.agregar('cancelacion', 'Turno cancelado',
            `Cancelaste ${turnoActual.compuNombre} · ${fechaLarga(turnoActual.fecha)} · ${turnoActual.horario} hs.`);
    }
    $('cancelado-resumen').innerHTML = filasResumen(turnoActual);
    $('cancelar-paso-1').classList.add('d-none');
    $('cancelar-paso-2').classList.remove('d-none');
    renderTurnos();
}

/* Reporte */
function abrirReporte(t) {
    turnoActual = t;
    $('reporte-resumen').innerHTML = filasResumen(t);
    $('reporte-motivo').value = '';
    $('reporte-detalle').value = '';
    $('reporte-error').classList.add('d-none');
    $('reporte-paso-1').classList.remove('d-none');
    $('reporte-paso-2').classList.add('d-none');
    modal('modalReporte').show();
}

function enviarReporte() {
    const motivo = $('reporte-motivo').value;
    const detalle = $('reporte-detalle').value.trim();
    const error = $('reporte-error');

    if (!motivo || detalle.length < 10) {
        error.textContent = !motivo
            ? 'Elegí un motivo para el reporte.'
            : 'Contanos un poco más (mínimo 10 caracteres).';
        error.classList.remove('d-none');
        (!motivo ? $('reporte-motivo') : $('reporte-detalle')).focus();
        return;
    }

    actualizarTurno(turnoActual.id, {
        reporte: { motivo, detalle, enviadoEn: new Date().toISOString() }
    });
    if (window.Notificaciones) {
        Notificaciones.agregar('reporte', 'Reporte enviado',
            `Tu reporte (${motivo}) sobre ${turnoActual.compuNombre} fue enviado. ¡Gracias por avisarnos!`);
    }
    $('reporte-paso-1').classList.add('d-none');
    $('reporte-paso-2').classList.remove('d-none');
    renderTurnos();
}

/* ---------- BORRAR HISTORIAL ---------- */

// Cuenta los turnos que están en el historial (finalizados o cancelados)
function turnosDelHistorial() {
    return cargarTurnos().filter(t => {
        const est = estadoActual(t);
        return est === 'finalizado' || est === 'cancelado';
    });
}

// Crea el botón y el pop up de confirmación (no hace falta tocar el HTML)
function crearBorradoHistorial() {
    $('panel-historial').querySelector('.titulo-seccion').insertAdjacentHTML('afterend', `
        <div class="text-end mb-3">
            <button type="button" id="btn-borrar-historial" class="btn btn-accion btn-accion-cancelar d-none">
                <i class="bi bi-trash3"></i> BORRAR HISTORIAL
            </button>
        </div>`);

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalBorrarHistorial" tabindex="-1" aria-labelledby="borrar-titulo" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; padding: 20px;">
                    <div class="modal-header border-0 pb-0">
                        <button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body text-center">

                        <div id="borrar-paso-1">
                            <i class="bi bi-exclamation-triangle-fill icono-alerta"></i>
                            <h3 id="borrar-titulo" class="fw-bold mt-2 mb-2" style="color: var(--color-texto);">¿Borrar todo tu historial?</h3>
                            <p id="borrar-texto" class="text-secondary mb-4"></p>
                            <div class="d-flex flex-wrap justify-content-center gap-3">
                                <button type="button" class="btn btn-outline-dark rounded-pill px-4 py-2 fw-semibold" data-bs-dismiss="modal">VOLVER</button>
                                <button type="button" id="btn-confirmar-borrado" class="btn btn-peligro rounded-pill px-4 py-2 fw-semibold">BORRAR HISTORIAL</button>
                            </div>
                        </div>

                        <div id="borrar-paso-2" class="d-none">
                            <i class="bi bi-check-circle-fill icono-exito"></i>
                            <h3 class="fw-bold mt-2 mb-2" style="color: var(--color-principal);">Historial borrado</h3>
                            <p class="text-secondary mb-4">Tus turnos activos no se modificaron.</p>
                            <button type="button" class="btn btn-turno px-5" data-bs-dismiss="modal">CERRAR</button>
                        </div>

                    </div>
                </div>
            </div>
        </div>`);

    $('btn-borrar-historial').addEventListener('click', abrirBorrarHistorial);
    $('btn-confirmar-borrado').addEventListener('click', borrarHistorial);
}

function abrirBorrarHistorial() {
    const n = turnosDelHistorial().length;
    if (n === 0) return;
    $('borrar-texto').textContent = `Se van a eliminar ${n} ${n === 1 ? 'turno' : 'turnos'} (finalizados y cancelados). Esta acción no se puede deshacer.`;
    $('borrar-paso-1').classList.remove('d-none');
    $('borrar-paso-2').classList.add('d-none');
    modal('modalBorrarHistorial').show();
}

function borrarHistorial() {
    // Se conservan solo los turnos que NO están en el historial (pendientes, confirmados y en curso)
    const quedan = cargarTurnos().filter(t => {
        const est = estadoActual(t);
        return est !== 'finalizado' && est !== 'cancelado';
    });
    guardarTurnos(quedan);
    $('borrar-paso-1').classList.add('d-none');
    $('borrar-paso-2').classList.remove('d-none');
    renderTurnos();
}

/* ---------- COMPROBANTE PDF ---------- */

function crearPDF(t) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const est = ESTADOS[estadoActual(t)].texto;
    const AZUL = [0, 30, 103], TEXTO = [14, 12, 52], SUB = [102, 119, 153], FONDO = [244, 246, 250];

    // Encabezado
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Universidad Nacional de Moreno', 15, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Área de Talleres', 15, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('COMPROBANTE DE TURNO', 195, 21, { align: 'right' });

    // Código
    doc.setTextColor(...SUB);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Código de turno', 15, 58);
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(t.codigo, 15, 69);

    // Filas de datos
    const filas = [
        ['Turno', t.compuNombre],
        ['Salón', t.salon],
        ['Fecha', fechaLarga(t.fecha)],
        ['Horario', t.horario + ' hs'],
        ['Estado', est],
        ['Reservado', t.items.map(i => i.nombre + ' x' + i.cantidad).join(', ') || '-'],
        ['Reservado el', fechaHora(t.creadoEn)]
    ];
    if (t.canceladoEn) filas.push(['Cancelado el', fechaHora(t.canceladoEn)]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const medidas = filas.map(([, v]) => doc.splitTextToSize(String(v), 105));
    const alto = medidas.reduce((s, l) => s + 7 * l.length + 3, 0) + 10;

    let y = 80;
    doc.setFillColor(...FONDO);
    doc.roundedRect(15, y, 180, alto, 4, 4, 'F');
    y += 12;

    filas.forEach(([etiqueta], i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...SUB);
        doc.text(etiqueta, 22, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...TEXTO);
        doc.text(medidas[i], 70, y);
        y += 7 * medidas[i].length + 3;
    });

    // Nota
    y = 80 + alto + 14;
    doc.setFontSize(10);
    doc.setTextColor(...SUB);
    const nota = t.estado === 'cancelado'
        ? 'Este turno fue cancelado: el comprobante no es válido para ingresar al taller.'
        : 'Presentate en el taller con tu credencial de estudiante. Pasados 15 minutos del inicio sin presentarte, el turno se cancela.';
    doc.text(doc.splitTextToSize(nota, 180), 15, y);

    // Pie
    doc.setDrawColor(...SUB);
    doc.line(15, 262, 195, 262);
    doc.setFontSize(9);
    doc.text('Av. Bme. Mitre N° 1891, Moreno (B1744OHC) - Provincia de Buenos Aires', 105, 269, { align: 'center' });
    doc.text('(0237) 460-9300  |  talleres@unm.edu.ar', 105, 275, { align: 'center' });
    doc.text('Comprobante generado el ' + fechaHora(new Date().toISOString()), 105, 281, { align: 'center' });

    return doc;
}

function descargarComprobante(t) {
    if (!window.jspdf) {
        const msg = 'El generador de PDF no cargó. Revisá tu conexión e intentá de nuevo.';
        if (window.Notificaciones) Notificaciones.aviso('cancelacion', 'No se pudo descargar', msg);
        else alert(msg);
        return;
    }
    crearPDF(t).save(`comprobante-${t.codigo}.pdf`);
}

/* ---------- TURNO DE EJEMPLO (pasado) ----------
   Se crea una sola vez, con el formato actual, para ver cómo se ve el historial.
   Para borrarlo: borrá el historial desde "Mis turnos". */
function sembrarTurnoPasado() {
    const MARCA = 'talleresDemoSembrado';
    try {
        if (localStorage.getItem(MARCA)) return;

        const hace = (dias) => { const f = new Date(); f.setDate(f.getDate() - dias); return f; };
        const iso = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

        // Se descartan reservas viejas de prueba (formato anterior, sin categoría)
        const lista = (JSON.parse(localStorage.getItem(CLAVE_RESERVAS)) || []).filter(r => r.categoria);
        lista.push({
            id: 'T-DEMO01',
            codigo: 'T-DEMO01',
            categoria: 'arduino',
            compuNombre: 'Kits Arduino ×2',
            img: 'img/icono-arduino.webp',
            items: [{ id: 'arduino', nombre: 'Kit Arduino', cantidad: 2 }],
            fecha: iso(hace(3)),
            horario: '09:00-11:00',
            confirmado: true,
            estado: 'activo',
            creadoEn: hace(5).toISOString()
        });
        localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(lista));
        localStorage.setItem(MARCA, '1');
    } catch (e) { /* storage bloqueado: no se crea el ejemplo */ }
}

/* ---------- INICIO ---------- */

function iniciar() {
    sembrarTurnoPasado();
    $('tab-activos').addEventListener('click', () => mostrarPestania('activos'));
    $('tab-historial').addEventListener('click', () => mostrarPestania('historial'));

    // Botones de las cards (delegación: las cards se regeneran)
    document.querySelector('main').addEventListener('click', e => {
        const btn = e.target.closest('[data-accion]');
        if (!btn || btn.disabled) return;
        const t = buscarTurno(btn.dataset.id);
        if (!t) return;

        if (btn.dataset.accion === 'detalles') abrirDetalles(t);
        if (btn.dataset.accion === 'confirmar') confirmarTurno(t);
        if (btn.dataset.accion === 'cancelar') abrirCancelar(t);
        if (btn.dataset.accion === 'reportar') abrirReporte(t);
        if (btn.dataset.accion === 'descargar') descargarComprobante(t);
    });

    $('btn-confirmar-cancelacion').addEventListener('click', confirmarCancelacion);
    $('btn-enviar-reporte').addEventListener('click', enviarReporte);

    $('reporte-motivo').innerHTML = '<option value="">Elegí un motivo</option>' +
        MOTIVOS_REPORTE.map(m => `<option>${esc(m)}</option>`).join('');

    crearBorradoHistorial();
    renderTurnos();
    mostrarPestania('activos');

    // Si cambian los turnos en otra pestaña, se actualiza acá también
    window.addEventListener('storage', e => { if (e.key === CLAVE_RESERVAS) renderTurnos(); });

    // Los turnos pasan solos al historial cuando termina su horario
    setInterval(renderTurnos, 30000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}