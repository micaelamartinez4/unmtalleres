/* =====================================================================
   UNM Talleres – lógica de la página de inicio
   Todo sale de CATEGORIAS: las 4 cards, el pop up de reserva y los límites.
   Para cambiar stock, límites, descripciones o insumos, solo tocá los datos.
   ===================================================================== */

/* ---------- DATOS ---------- */

/*
  tipo 'cantidad': se reserva una cantidad (hasta "limite" por turno) de un stock total.
  tipo 'carrito':  se arma un carrito con distintos insumos (paso extra "Insumos").
  img: ruta de la imagen. Mientras el archivo no exista se ve un recuadro vacío.
*/
const CATEGORIAS = {
    arduino: {
        nombre: 'KIT ARDUINO', singular: 'Kit Arduino', plural: 'Kits Arduino',
        tipo: 'cantidad', stock: 16, limite: 2,
        color: 'celeste', icono: 'bi-cpu',
        imgCard: 'img/card-arduino.webp',     // imagen completa de la card (con el título)
        imgIcono: 'img/icono-arduino.webp',   // imagen cuadrada del pop up
        descripcion: 'Kit compatible con Arduino Uno para experimentar con electrónica, sensores y actuadores en proyectos de animación y multimedia.'
    },
    pc: {
        nombre: 'PC', singular: 'PC', plural: 'PCs',
        tipo: 'cantidad', stock: 2, limite: 1,
        color: 'rosa', icono: 'bi-pc-display',
        imgCard: 'img/card-pc.webp',     // imagen completa de la card (con el título)
        imgIcono: 'img/icono-pc.webp',   // imagen cuadrada del pop up
        descripcion: 'Computadora del taller para trabajar en tus proyectos de animación, edición y diseño. Solo se puede reservar una por turno.'
    },
    proyectores: {
        nombre: 'PROYECTORES', singular: 'Proyector', plural: 'Proyectores',
        tipo: 'cantidad', stock: 3, limite: 2,
        color: 'amarillo', icono: 'bi-projector',
        imgCard: 'img/card-proyector.webp',     // imagen completa de la card (con el título)
        imgIcono: 'img/icono-proyector.webp',   // imagen cuadrada del pop up
        descripcion: 'Proyectores para presentaciones, ensayos y muestras de tus trabajos. Cantidad limitada, por eso se pueden reservar hasta 2 por turno.'
    },
    experimentacion: {
        nombre: 'EXPERIMENTACIÓN', singular: 'Experimentación', plural: 'Experimentación',
        tipo: 'carrito',
        color: 'verde', icono: 'bi-lightbulb',
        imgCard: 'img/card-expe.webp',     // imagen completa de la card (con el título)
        imgIcono: 'img/icono-expe.webp',   // imagen cuadrada del pop up
        descripcion: 'Equipos de distintas épocas para experimentar con animación: casetes, vinilos, pantallas de tubo, DVD y más. Elegí los insumos que quieras usar en tu turno.',
        // Para agregar un insumo, sumá una línea acá (id único, nombre, stock, img)
        items: [
            { id: 'casetera',   nombre: 'Casetera',             stock: 1, img: 'img/item-casetera.webp' },
            { id: 'tocadiscos', nombre: 'Tocadiscos de vinilo', stock: 1, img: 'img/item-tocadiscos.webp' },
            { id: 'pantalla',   nombre: 'Pantalla de tubo',     stock: 2, img: 'img/item-pantalla.webp' },
            { id: 'dvd',        nombre: 'Reproductor de DVD',   stock: 1, img: 'img/item-dvd.webp' }
        ]
    }
};

const HORARIOS_TALLER = ['08:00-10:00', '09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
const DIAS_TALLER = [1, 2, 3, 4, 5]; // 0 = domingo ... 6 = sábado
const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CLAVE_RESERVAS = 'talleresReservas';

/* Turnos ya ocupados de ejemplo (offset = días desde hoy). Reemplazar por datos reales / backend. */
const RESERVAS_DEMO = [
    { categoria: 'arduino',         offset: 1, horario: '09:00-11:00', items: [{ id: 'arduino', cantidad: 15 }] },
    { categoria: 'pc',              offset: 1, horario: '14:00-16:00', items: [{ id: 'pc', cantidad: 2 }] },
    { categoria: 'proyectores',     offset: 2, horario: '08:00-10:00', items: [{ id: 'proyectores', cantidad: 3 }] },
    { categoria: 'experimentacion', offset: 1, horario: '11:00-13:00', items: [{ id: 'tocadiscos', cantidad: 1 }, { id: 'dvd', cantidad: 1 }] }
];

/* ---------- ESTADO ---------- */

const estado = {
    clave: null,    // clave de CATEGORIAS
    cat: null,
    fecha: '',      // 'YYYY-MM-DD'
    horario: '',
    cantidad: 1,    // para tipo 'cantidad'
    carrito: {},    // para tipo 'carrito': { idItem: cantidad }
    flujo: [],      // ids de los pasos del pop up
    paso: 0
};

/* ---------- UTILIDADES ---------- */

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function aISO(fecha) {
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${m}-${d}`;
}

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

function aMinutos(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function seSuperponen(h1, h2) {
    const [a1, b1] = h1.split('-').map(aMinutos);
    const [a2, b2] = h2.split('-').map(aMinutos);
    return a1 < b2 && a2 < b1;
}

/* Recuadro de imagen: si el archivo no existe, queda el recuadro vacío */
function htmlImagen(src, alt, clase = '') {
    return `<div class="img-slot ${clase}">
        <i class="bi bi-image img-slot__ph" aria-hidden="true"></i>
        <img src="${esc(src)}" alt="${esc(alt)}"
             onload="this.parentElement.classList.add('con-imagen')" onerror="this.remove()">
    </div>`;
}

/* ---------- RESERVAS (localStorage + demo) ---------- */

function reservasDemo() {
    return RESERVAS_DEMO.map(r => {
        const f = new Date();
        f.setDate(f.getDate() + r.offset);
        return { categoria: r.categoria, fecha: aISO(f), horario: r.horario, items: r.items };
    });
}

function reservasGuardadas() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_RESERVAS)) || [];
    } catch (e) {
        return [];
    }
}

function guardarReserva(reserva) {
    try {
        const todas = reservasGuardadas();
        todas.push(reserva);
        localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(todas));
    } catch (e) { /* si el navegador bloquea el storage, la reserva igual se confirma en pantalla */ }
}

function todasLasReservas() {
    // Los turnos cancelados (desde "Mis turnos") liberan el stock
    return reservasDemo().concat(reservasGuardadas().filter(r => r.estado !== 'cancelado'));
}

/* Unidades ya reservadas en ese día y horario (de toda la categoría, o de un insumo) */
function unidadesUsadas(clave, fecha, horario, idItem = null) {
    return todasLasReservas()
        .filter(r => r.categoria === clave && r.fecha === fecha && seSuperponen(r.horario, horario))
        .reduce((total, r) => total + (r.items || [])
            .filter(i => !idItem || i.id === idItem)
            .reduce((s, i) => s + i.cantidad, 0), 0);
}

function restantes(cat, clave, fecha, horario) {
    return Math.max(0, cat.stock - unidadesUsadas(clave, fecha, horario));
}

function restantesItem(cat, clave, item, fecha, horario) {
    return Math.max(0, item.stock - unidadesUsadas(clave, fecha, horario, item.id));
}

function horarioPasado(fecha, horario) {
    if (fecha !== aISO(new Date())) return false;
    const ahora = new Date();
    return aMinutos(horario.split('-')[0]) <= ahora.getHours() * 60 + ahora.getMinutes();
}

/* ¿Queda algo para reservar en ese horario? */
function hayDisponibilidad(clave, cat, fecha, horario) {
    if (cat.tipo === 'carrito') {
        return cat.items.some(i => restantesItem(cat, clave, i, fecha, horario) > 0);
    }
    return restantes(cat, clave, fecha, horario) > 0;
}

/* Máximo que se puede pedir en este turno (solo tipo 'cantidad') */
function maxCantidad() {
    if (!estado.fecha || !estado.horario) return 0;
    return Math.min(estado.cat.limite, restantes(estado.cat, estado.clave, estado.fecha, estado.horario));
}

/* ---------- CARDS DE CATEGORÍA ---------- */

function renderCategorias() {
    // La imagen ocupa toda la card. Si todavía no existe el archivo, se ve el color con el nombre.
    $('contenedor-categorias').innerHTML = Object.entries(CATEGORIAS).map(([clave, cat]) => `
        <div class="col-6">
            <button type="button" class="cat-card cat-${cat.color}" data-categoria="${clave}"
                    aria-label="Reservar ${esc(cat.nombre)}">
                <span class="cat-card__fallback">${esc(cat.nombre)}</span>
                <img class="cat-card__img" src="${esc(cat.imgCard)}" alt=""
                     onload="this.parentElement.classList.add('con-imagen')" onerror="this.remove()">
            </button>
        </div>`).join('');
}

/* ---------- POP UP DE RESERVA: PASOS ---------- */

const NOMBRES_PASOS = {
    'paso-turno': 'Turno',
    'paso-insumos': 'Insumos',
    'paso-terminos': 'Términos',
    'paso-confirmado': 'Confirmación'
};
const TODOS_LOS_PASOS = Object.keys(NOMBRES_PASOS);

function irAPaso(indice) {
    estado.paso = indice;
    const actual = estado.flujo[indice];
    TODOS_LOS_PASOS.forEach(id => $(id).classList.toggle('d-none', id !== actual));

    $('stepper').innerHTML = estado.flujo.map((id, i) =>
        `<li class="paso ${i === indice ? 'activo' : ''} ${i < indice ? 'hecho' : ''}" ${i === indice ? 'aria-current="step"' : ''}><span>${i + 1}</span> ${NOMBRES_PASOS[id]}</li>`
    ).join('');
    $('stepper').classList.toggle('d-none', actual === 'paso-confirmado');

    // Al cambiar de paso: vuelve arriba y lleva el foco al contenido nuevo (el botón anterior queda oculto)
    $('modalReserva').scrollTop = 0;
    if (indice > 0) {
        const cont = $(actual);
        cont.setAttribute('tabindex', '-1');
        cont.focus({ preventScroll: true });
    }
}

function siguientePaso() { irAPaso(estado.paso + 1); }
function pasoAnterior() { irAPaso(estado.paso - 1); }

function abrirReserva(clave) {
    const cat = CATEGORIAS[clave];
    if (!cat) return;

    Object.assign(estado, { clave, cat, fecha: '', horario: '', cantidad: 1, carrito: {} });
    estado.flujo = cat.tipo === 'carrito'
        ? ['paso-turno', 'paso-insumos', 'paso-terminos', 'paso-confirmado']
        : ['paso-turno', 'paso-terminos', 'paso-confirmado'];

    $('modalReserva').className = `modal fade cat-${cat.color}`;
    $('modal-titulo').textContent = cat.nombre;
    $('modal-descripcion').textContent = cat.descripcion;
    $('modal-imagen').innerHTML = htmlImagen(cat.imgIcono, cat.nombre, 'img-slot--modal');
    $('modal-dias').textContent = 'Atiende: ' + DIAS_TALLER.map(d => NOMBRES_DIAS[d]).join(', ') + '.';

    const inputFecha = $('input-fecha');
    inputFecha.min = aISO(new Date());
    inputFecha.value = '';

    mostrarAviso('');
    $('check-terminos').checked = false;
    $('btn-confirmar').disabled = true;

    renderHorarios();
    actualizarCantidad();
    actualizarBotonContinuar();
    irAPaso(0);

    bootstrap.Modal.getOrCreateInstance($('modalReserva')).show();
}

/* ---------- PASO 1: FECHA, HORARIO Y CANTIDAD ---------- */

function mostrarAviso(texto) {
    const aviso = $('aviso-fecha');
    aviso.textContent = texto;
    aviso.classList.toggle('d-none', !texto);
}

/* Antes de elegir fecha (o en un día cerrado) se muestran los horarios, deshabilitados */
function horariosBloqueados(cont) {
    HORARIOS_TALLER.forEach(h => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = h;
        b.disabled = true;
        b.className = 'btn btn-sm rounded-pill px-3 py-2 horario-bloqueado';
        cont.appendChild(b);
    });
}

function renderHorarios() {
    const cont = $('modal-horarios');
    cont.innerHTML = '';

    if (!estado.fecha) {
        horariosBloqueados(cont);
        return;
    }

    if (!DIAS_TALLER.includes(desdeISO(estado.fecha).getDay())) {
        mostrarAviso('Ese día el taller está cerrado. Elegí una fecha de lunes a viernes.');
        horariosBloqueados(cont);
        return;
    }
    mostrarAviso('');

    let libres = 0;
    HORARIOS_TALLER.forEach(h => {
        const ocupado = !hayDisponibilidad(estado.clave, estado.cat, estado.fecha, h) || horarioPasado(estado.fecha, h);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = h;
        btn.dataset.horario = h;

        if (ocupado) {
            btn.className = 'btn btn-sm rounded-pill px-3 py-2 horario-ocupado';
            btn.disabled = true;
            btn.title = 'Horario no disponible';
        } else {
            libres++;
            btn.className = 'btn btn-sm rounded-pill px-3 py-2 ' + (h === estado.horario ? 'btn-dark horario-elegido' : 'btn-outline-dark');
        }
        cont.appendChild(btn);
    });

    if (libres === 0) mostrarAviso('No quedan horarios libres ese día. Probá con otra fecha.');
    else if (!estado.horario) cont.insertAdjacentHTML('beforeend', '<p class="text-secondary small mb-0">Elegí un horario para continuar.</p>');
}

function actualizarCantidad() {
    const cat = estado.cat;
    $('bloque-cantidad').classList.toggle('d-none', cat.tipo !== 'cantidad');
    if (cat.tipo !== 'cantidad') return;

    // El bloque se ve desde el inicio y se habilita al elegir fecha y horario
    const listo = !!(estado.fecha && estado.horario);
    const max = listo ? maxCantidad() : 1;
    estado.cantidad = Math.min(Math.max(1, estado.cantidad), Math.max(1, max));

    $('cantidad-valor').textContent = estado.cantidad;
    $('btn-menos').disabled = !listo || estado.cantidad <= 1;
    $('btn-mas').disabled = !listo || estado.cantidad >= max;
    $('controles-cantidad').classList.toggle('d-none', cat.limite === 1);
    $('controles-cantidad').classList.toggle('bloqueado', !listo);

    if (cat.limite === 1) {
        $('cantidad-ayuda').textContent = `Solo se puede reservar 1 ${cat.singular} por turno.`;
    } else if (!listo) {
        $('cantidad-ayuda').textContent = 'Primero elegí fecha y horario.';
    } else {
        const quedan = restantes(cat, estado.clave, estado.fecha, estado.horario);
        $('cantidad-ayuda').textContent = `Máximo ${cat.limite} por turno · quedan ${quedan} en este horario.`;
    }
}

function actualizarBotonContinuar() {
    $('btn-continuar').disabled = !(estado.fecha && estado.horario);
}

/* ---------- PASO EXTRA: CARRITO DE INSUMOS (Experimentación) ---------- */

function totalCarrito() {
    return Object.values(estado.carrito).reduce((s, n) => s + n, 0);
}

function renderInsumos() {
    const cat = estado.cat;

    $('insumos-lista').innerHTML = cat.items.map(item => {
        const libres = restantesItem(cat, estado.clave, item, estado.fecha, estado.horario);
        const enCarrito = estado.carrito[item.id] || 0;

        let control;
        if (libres === 0) {
            control = '<span class="badge badge-no-disponible w-100 py-2">No disponible</span>';
        } else if (enCarrito === 0) {
            control = `<button type="button" class="btn btn-agregar" data-agregar="${item.id}">
                           <i class="bi bi-plus-lg"></i> AGREGAR</button>`;
        } else {
            control = `<div class="cantidad-controles">
                           <button type="button" class="btn-cant" data-quitar="${item.id}" aria-label="Quitar uno">−</button>
                           <span class="cantidad-valor">${enCarrito}</span>
                           <button type="button" class="btn-cant" data-agregar="${item.id}" aria-label="Agregar uno"
                                   ${enCarrito >= libres ? 'disabled' : ''}>+</button>
                       </div>`;
        }

        return `
        <div class="col-6 col-md-4">
            <div class="insumo-card ${enCarrito ? 'en-carrito' : ''} ${libres === 0 ? 'agotado' : ''}">
                ${htmlImagen(item.img, item.nombre, 'img-slot--item')}
                <p class="insumo-nombre">${esc(item.nombre)}</p>
                <p class="insumo-stock">${libres === 0 ? 'Sin stock en este horario' : `Disponibles: ${libres}`}</p>
                ${control}
            </div>
        </div>`;
    }).join('');

    const total = totalCarrito();
    $('carrito-resumen').innerHTML = total === 0
        ? '<span class="text-secondary">Todavía no elegiste insumos. Agregá al menos uno.</span>'
        : cat.items.filter(i => estado.carrito[i.id]).map(i =>
            `<span class="chip-carrito">${esc(i.nombre)} ×${estado.carrito[i.id]}</span>`).join('');
    $('carrito-total').textContent = `${total} ${total === 1 ? 'insumo' : 'insumos'}`;
    $('btn-continuar-insumos').disabled = total === 0;
}

function cambiarCarrito(id, delta) {
    const item = estado.cat.items.find(i => i.id === id);
    if (!item) return;
    const libres = restantesItem(estado.cat, estado.clave, item, estado.fecha, estado.horario);
    const nueva = Math.min(libres, Math.max(0, (estado.carrito[id] || 0) + delta));
    if (nueva === 0) delete estado.carrito[id];
    else estado.carrito[id] = nueva;
    renderInsumos();
}

/* ---------- RESUMEN, CONFIRMACIÓN ---------- */

/* Lista de lo reservado: [{ id, nombre, cantidad }] */
function itemsReservados() {
    const cat = estado.cat;
    if (cat.tipo === 'carrito') {
        return cat.items.filter(i => estado.carrito[i.id])
            .map(i => ({ id: i.id, nombre: i.nombre, cantidad: estado.carrito[i.id] }));
    }
    return [{ id: estado.clave, nombre: cat.singular, cantidad: estado.cantidad }];
}

function nombreReserva() {
    const cat = estado.cat;
    if (cat.tipo === 'carrito') {
        const n = totalCarrito();
        return `Experimentación · ${n} ${n === 1 ? 'insumo' : 'insumos'}`;
    }
    return estado.cantidad > 1 ? `${cat.plural} ×${estado.cantidad}` : cat.singular;
}

function filasResumen() {
    const lista = itemsReservados().map(i => `${esc(i.nombre)} ×${i.cantidad}`).join(', ');
    return `
        <div><i class="bi ${estado.cat.icono}"></i> <strong>${esc(estado.cat.nombre)}</strong></div>
        <div><i class="bi bi-box-seam"></i> ${lista}</div>
        <div><i class="bi bi-calendar-event"></i> ${esc(fechaLarga(estado.fecha))}</div>
        <div><i class="bi bi-clock"></i> ${esc(estado.horario)} hs</div>`;
}

function codigoTurno() {
    return 'T-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/* ¿Sigue habiendo stock para lo elegido? (por si se ocupó mientras el usuario leía los términos) */
function sigueDisponible() {
    const { cat, clave, fecha, horario } = estado;
    if (cat.tipo === 'carrito') {
        return cat.items.every(i => !estado.carrito[i.id] ||
            estado.carrito[i.id] <= restantesItem(cat, clave, i, fecha, horario));
    }
    return estado.cantidad <= restantes(cat, clave, fecha, horario);
}

function confirmarReserva() {
    if (!sigueDisponible()) {
        estado.horario = '';
        estado.carrito = {};
        renderHorarios();
        actualizarCantidad();
        actualizarBotonContinuar();
        irAPaso(0);
        mostrarAviso('Ese horario se acaba de ocupar. Elegí otro.');
        return;
    }

    // Se guarda el turno completo: "Mis turnos" lo lee desde acá
    const codigo = codigoTurno();
    guardarReserva({
        id: codigo,
        codigo,
        categoria: estado.clave,
        compuNombre: nombreReserva(),   // título que se muestra en "Mis turnos"
        img: estado.cat.imgIcono,
        items: itemsReservados(),
        fecha: estado.fecha,
        horario: estado.horario,
        estado: 'activo',
        creadoEn: new Date().toISOString()
    });

    if (window.Notificaciones) {
        Notificaciones.agregar('reserva', 'Turno reservado',
            `${nombreReserva()} · ${fechaLarga(estado.fecha)} · ${estado.horario} hs. Recordá confirmarlo desde "Mis turnos".`);
    }

    $('ok-resumen').innerHTML = filasResumen() +
        `<div><i class="bi bi-ticket-perforated"></i> Código: <strong>${esc(codigo)}</strong></div>`;
    siguientePaso();
}

/* ---------- EVENTOS ---------- */

document.addEventListener('DOMContentLoaded', function () {

    renderCategorias();

    // Click en una card de categoría
    $('contenedor-categorias').addEventListener('click', e => {
        const card = e.target.closest('.cat-card');
        if (card) abrirReserva(card.dataset.categoria);
    });

    // Fecha
    $('input-fecha').addEventListener('change', function () {
        // El campo deja escribir fechas pasadas a mano: se validan acá
        const pasada = this.value && this.value < aISO(new Date());
        if (pasada) this.value = '';
        estado.fecha = this.value;
        estado.horario = '';
        estado.carrito = {};
        renderHorarios();
        actualizarCantidad();
        actualizarBotonContinuar();
        if (pasada) mostrarAviso('Esa fecha ya pasó. Elegí una desde hoy.');
    });

    // Horarios
    $('modal-horarios').addEventListener('click', e => {
        const btn = e.target.closest('button[data-horario]');
        if (!btn || btn.disabled) return;
        estado.horario = btn.dataset.horario;
        estado.carrito = {};
        renderHorarios();
        actualizarCantidad();
        actualizarBotonContinuar();
    });

    // Cantidad (kits / PC / proyectores)
    $('btn-menos').addEventListener('click', () => { estado.cantidad--; actualizarCantidad(); });
    $('btn-mas').addEventListener('click', () => { estado.cantidad++; actualizarCantidad(); });

    // Carrito
    $('insumos-lista').addEventListener('click', e => {
        const mas = e.target.closest('[data-agregar]');
        const menos = e.target.closest('[data-quitar]');
        if (mas && !mas.disabled) cambiarCarrito(mas.dataset.agregar, 1);
        if (menos) cambiarCarrito(menos.dataset.quitar, -1);
    });

    // Navegación entre pasos
    $('btn-continuar').addEventListener('click', () => {
        if (estado.cat.tipo === 'carrito') renderInsumos();
        else $('resumen-reserva').innerHTML = filasResumen();
        siguientePaso();
    });
    $('btn-volver-insumos').addEventListener('click', pasoAnterior);
    $('btn-continuar-insumos').addEventListener('click', () => {
        $('resumen-reserva').innerHTML = filasResumen();
        siguientePaso();
    });
    $('btn-volver').addEventListener('click', pasoAnterior);

    $('check-terminos').addEventListener('change', function () {
        $('btn-confirmar').disabled = !this.checked;
    });
    $('btn-confirmar').addEventListener('click', confirmarReserva);

    // Botón "Reservar turno" del hero: lleva a las categorías
    const hero = document.querySelector('.btn-custom-reservar');
    if (hero) hero.addEventListener('click', e => {
        e.preventDefault();
        $('categorias').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
});