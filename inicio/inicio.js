/* =====================================================================
   UNM Talleres – Login SIMULADO
   No hay servidor: cualquier DNI válido (7 u 8 números) con una
   contraseña de al menos 4 caracteres deja entrar.
   ===================================================================== */

const formLogin = document.getElementById('formLogin');
const inputDni = document.getElementById('dni');
const inputPassword = document.getElementById('password');
const errorDni = document.getElementById('errorDni');
const errorPassword = document.getElementById('errorPassword');
const errorGeneral = document.getElementById('errorGeneral');
const btnIngresar = document.getElementById('btnIngresar');
const btnVerPassword = document.getElementById('verPassword');

const dniValido = (dni) => /^\d{7,8}$/.test(dni);

function marcarError(input, contenedor, mensaje) {
    input.classList.toggle('is-invalid', Boolean(mensaje));
    contenedor.textContent = mensaje || '';
}

// Solo permitir números en los campos de DNI
document.querySelectorAll('#dni, #dniRecuperar').forEach((campo) => {
    campo.addEventListener('input', () => {
        campo.value = campo.value.replace(/\D/g, '');
    });
});

// Mostrar / ocultar contraseña
btnVerPassword.addEventListener('click', () => {
    const visible = inputPassword.type === 'text';
    inputPassword.type = visible ? 'password' : 'text';
    btnVerPassword.innerHTML = visible ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    btnVerPassword.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

// ---------- Login ----------
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    errorGeneral.textContent = '';

    const dni = inputDni.value.trim();
    const password = inputPassword.value;

    marcarError(inputDni, errorDni, dniValido(dni) ? '' : 'Ingresá un DNI válido (7 u 8 números).');
    marcarError(inputPassword, errorPassword, password.length >= 4 ? '' : 'La contraseña debe tener al menos 4 caracteres.');

    if (!dniValido(dni) || password.length < 4) return;

    // Simulamos el tiempo de espera de un servidor
    btnIngresar.disabled = true;
    btnIngresar.textContent = 'INGRESANDO...';

    setTimeout(() => {
        // "Sesión" simulada: la guardamos para que otras páginas puedan consultarla
        sessionStorage.setItem('unmUsuario', JSON.stringify({ dni, ingreso: Date.now() }));
        window.location.href = 'index.html';
    }, 800);
});

// Limpiar el error de cada campo al escribir
inputDni.addEventListener('input', () => marcarError(inputDni, errorDni, ''));
inputPassword.addEventListener('input', () => marcarError(inputPassword, errorPassword, ''));

// ---------- Recuperar contraseña ----------
const modalRecuperar = document.getElementById('modalRecuperar');
const formRecuperar = document.getElementById('formRecuperar');
const inputDniRecuperar = document.getElementById('dniRecuperar');
const errorRecuperar = document.getElementById('errorRecuperar');
const recuperarOk = document.getElementById('recuperarOk');
const dniEnviado = document.getElementById('dniEnviado');

formRecuperar.addEventListener('submit', (e) => {
    e.preventDefault();
    const dni = inputDniRecuperar.value.trim();

    if (!dniValido(dni)) {
        marcarError(inputDniRecuperar, errorRecuperar, 'Ingresá un DNI válido (7 u 8 números).');
        return;
    }

    marcarError(inputDniRecuperar, errorRecuperar, '');
    dniEnviado.textContent = dni;
    formRecuperar.classList.add('d-none');
    recuperarOk.classList.remove('d-none');
});

// Al cerrar el modal, volver al paso 1
modalRecuperar.addEventListener('hidden.bs.modal', () => {
    formRecuperar.reset();
    marcarError(inputDniRecuperar, errorRecuperar, '');
    formRecuperar.classList.remove('d-none');
    recuperarOk.classList.add('d-none');
});

// Si ya hay una sesión simulada, ir directo al index
if (sessionStorage.getItem('unmUsuario')) {
    window.location.replace('index.html');
}