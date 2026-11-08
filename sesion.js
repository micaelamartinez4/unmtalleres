/* =====================================================================
   UNM Talleres – Sesión SIMULADA con roles (alumno / administrador)
   Cuando exista el servidor, reemplazar USUARIOS y validar() por una
   llamada a la API que valide DNI + contraseña del campus virtual.
   ===================================================================== */
window.Sesion = (function () {
    const CLAVE = 'unmUsuario';

    const USUARIOS = [
        { dni: '40123456', password: '1234',  rol: 'alumno',        nombre: 'Lucía Pérez' },
        { dni: '41222333', password: '1234',  rol: 'alumno',        nombre: 'Mateo Gómez' },
        { dni: '42333444', password: '1234',  rol: 'alumno',        nombre: 'Sofía Ruiz' },
        { dni: '20111222', password: 'admin', rol: 'administrador', nombre: 'Encargado de Talleres' }
    ];

    const inicioDe = (rol) => rol === 'administrador' ? 'admin.html' : 'index.html';

    function actual() {
        try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch (e) { return null; }
    }

    function validar(dni, password) {
        return USUARIOS.find(u => u.dni === dni && u.password === password) || null;
    }

    function guardar(u) {
        sessionStorage.setItem(CLAVE, JSON.stringify({ dni: u.dni, nombre: u.nombre, rol: u.rol, ingreso: Date.now() }));
    }

    /* Se llama al inicio de cada página (páginas en la raíz): sin sesión → login; rol equivocado → su inicio */
    function requerir(rol) {
        const u = actual();
        if (!u) location.replace('inicio/inicio.html');
        else if (u.rol !== rol) location.replace(inicioDe(u.rol));
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-cerrar-sesion]')) {
            try { sessionStorage.removeItem(CLAVE); } catch (err) { /* nada */ }
        }
    });

    return { USUARIOS, actual, validar, guardar, requerir, inicioDe };
})();