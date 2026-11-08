/* =====================================================================
   UNM Talleres – Navbar: notificaciones y cierre de sesión
   Se carga en todas las páginas con navbar (index.html, turnos.html).
   Las notificaciones se guardan en localStorage, así que se comparten
   entre páginas: si reservás en el inicio, la ves también en "Mis turnos".

   Para crear una notificación desde cualquier script:
       Notificaciones.agregar('reserva', 'Título', 'Texto del mensaje');
   Tipos disponibles: 'reserva' | 'confirmacion' | 'cancelacion' | 'reporte'
   ===================================================================== */

window.Notificaciones = (function () {
    const CLAVE = 'talleresNotificaciones';
    const MAXIMO = 30; // cantidad máxima que se guardan

    const TIPOS = {
        reserva:      'bi-calendar-plus',
        confirmacion: 'bi-check-circle',
        cancelacion:  'bi-x-circle',
        reporte:      'bi-flag'
    };

    let enMemoria = []; // respaldo por si localStorage no está disponible

    const $ = (id) => document.getElementById(id);

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    /* ---------- almacenamiento ---------- */

    function cargar() {
        try {
            const datos = JSON.parse(localStorage.getItem(CLAVE));
            if (Array.isArray(datos)) return datos;
        } catch (e) { /* storage vacío o bloqueado */ }
        return enMemoria;
    }

    function guardar(lista) {
        enMemoria = lista;
        try {
            localStorage.setItem(CLAVE, JSON.stringify(lista));
        } catch (e) { /* queda solo en memoria */ }
    }

    /* ---------- formato ---------- */

    function hace(iso) {
        const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (min < 1) return 'Recién';
        if (min < 60) return `Hace ${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
        return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    }

    /* ---------- dibujo ---------- */

    function render() {
        const lista = cargar();
        const sinLeer = lista.filter(n => !n.leida).length;

        const badge = $('badgeNotif');
        if (badge) {
            badge.textContent = sinLeer > 9 ? '9+' : sinLeer;
            badge.classList.toggle('d-none', sinLeer === 0);
        }

        const contenedor = $('listaNotif');
        if (!contenedor) return;

        if (lista.length === 0) {
            contenedor.innerHTML = `
                <div class="notif-vacio">
                    <i class="bi bi-bell-slash"></i>
                    <p>No tenés notificaciones.</p>
                </div>`;
            return;
        }

        contenedor.innerHTML = lista.map(n => `
            <div class="notif-item ${n.leida ? '' : 'no-leida'}">
                <div class="notif-icono ${esc(n.tipo)}"><i class="bi ${TIPOS[n.tipo] || 'bi-bell'}"></i></div>
                <div class="notif-contenido">
                    <div class="notif-titulo">${esc(n.titulo)}</div>
                    <div class="notif-texto">${esc(n.texto)}</div>
                    <div class="notif-fecha">${esc(hace(n.fecha))}</div>
                </div>
            </div>`).join('');
    }

    function mostrarToast(n) {
        let caja = $('toastNotif');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'toastNotif';
            caja.className = 'toast-notif-caja';
            caja.setAttribute('aria-live', 'polite');
            document.body.appendChild(caja);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-notif';
        toast.innerHTML = `
            <div class="notif-icono ${esc(n.tipo)}"><i class="bi ${TIPOS[n.tipo] || 'bi-bell'}"></i></div>
            <div class="notif-contenido">
                <div class="notif-titulo">${esc(n.titulo)}</div>
                <div class="notif-texto">${esc(n.texto)}</div>
            </div>`;
        caja.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }

    /* ---------- acciones ---------- */

    function agregar(tipo, titulo, texto) {
        const nueva = {
            id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            tipo, titulo, texto,
            fecha: new Date().toISOString(),
            leida: false
        };
        guardar([nueva, ...cargar()].slice(0, MAXIMO));
        render();
        mostrarToast(nueva);
        return nueva;
    }

    // Aviso emergente que no se guarda en la lista (errores, mensajes de una sola vez)
    function aviso(tipo, titulo, texto) {
        mostrarToast({ tipo, titulo, texto });
    }

    function marcarTodasLeidas() {
        const lista = cargar();
        if (!lista.some(n => !n.leida)) return;
        guardar(lista.map(n => ({ ...n, leida: true })));
        render();
    }

    function borrarTodas() {
        guardar([]);
        render();
    }

    /* ---------- inicio ---------- */

    function iniciar() {
        // La zona de avisos existe desde el inicio para que los lectores de pantalla anuncien los toasts
        if (!$('toastNotif')) {
            const caja = document.createElement('div');
            caja.id = 'toastNotif';
            caja.className = 'toast-notif-caja';
            caja.setAttribute('aria-live', 'polite');
            document.body.appendChild(caja);
        }
        render();

        const menu = $('dropdownNotif');
        if (menu) {
            // Al abrir: refresca los "hace X min" y, en celular, ubica el panel bajo la navbar
            menu.addEventListener('shown.bs.dropdown', () => {
                render();
                const panel = menu.querySelector('.menu-notificaciones');
                const barra = document.querySelector('.navbar');
                if (panel && barra) {
                    panel.style.setProperty('top', (barra.getBoundingClientRect().bottom + 4) + 'px', 'important');
                }
            });
            // Al cerrar: lo que se vio pasa a "leído"
            menu.addEventListener('hidden.bs.dropdown', marcarTodasLeidas);
        }

        const btnBorrar = $('btnBorrarNotif');
        if (btnBorrar) btnBorrar.addEventListener('click', borrarTodas);

        // Si cambian las notificaciones en otra pestaña, se actualiza acá también
        window.addEventListener('storage', (e) => { if (e.key === CLAVE) render(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

    return { agregar, aviso, marcarTodasLeidas, borrarTodas };
})();

/* ---------- Cerrar sesión (simulado) ---------- */
// Borra la sesión simulada; sin esto el login te mandaría de vuelta al inicio.
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cerrar-sesion]')) {
        try { sessionStorage.removeItem('unmUsuario'); } catch (err) { /* nada */ }
    }
});