/* =========================================================
   CALCULADORA — JAVASCRIPT
   Este archivo maneja toda la lógica: qué pasa cuando
   el usuario presiona cada botón, cómo se hacen los
   cálculos y cómo se actualiza la pantalla.
   ========================================================= */


/* ─────────────────────────────────────────────
   1. REFERENCIAS AL DOM
   Guardamos los elementos HTML en variables para
   no tener que buscarlos cada vez que los necesitemos.
   document.getElementById() los encuentra por su id="..."
   ───────────────────────────────────────────── */
const elCurrent = document.getElementById('current');      // Número grande en pantalla
const elHistory = document.getElementById('history');      // Línea pequeña de historial
const elOpBadge = document.getElementById('operatorBadge'); // Badge del operador activo
const elKeypad = document.querySelector('.keypad');        // Contenedor de todos los botones


/* ─────────────────────────────────────────────
   2. ESTADO DE LA CALCULADORA
   Estas variables son la "memoria" del programa.
   Guardan todo lo que la calculadora necesita
   recordar entre un clic y el siguiente.
   ───────────────────────────────────────────── */
let currentValue = '0';   // Lo que se muestra en pantalla (como string/texto)
let previousValue = '';    // El número guardado antes de elegir un operador
let operator = '';    // El operador elegido: '+' '-' '*' '/'
let shouldResetNext = false; // Bandera: si true, el próximo número reemplaza la pantalla


/* ─────────────────────────────────────────────
   3. MAPA DE SÍMBOLOS
   Traduce los operadores reales ('*', '/') a sus
   versiones visuales ('×', '÷') para mostrar en pantalla.
   Un objeto funciona como diccionario: clave → valor.
   ───────────────────────────────────────────── */
const SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };


/* ─────────────────────────────────────────────
   4. FUNCIÓN: render()
   Actualiza TODO lo visual en pantalla de una vez.
   Siempre que cambie algún dato, llamamos render()
   para que la interfaz refleje el nuevo estado.
   ───────────────────────────────────────────── */
function render() {
    // Ajusta el tamaño de fuente según la longitud del número
    // para que no se salga de la pantalla
    const len = currentValue.length;
    elCurrent.style.fontSize =
        len > 12 ? '28px' :
            len > 9 ? '36px' :
                len > 6 ? '44px' : '52px';

    elCurrent.textContent = currentValue;
}


/* ─────────────────────────────────────────────
   5. FUNCIÓN: animatePop()
   Aplica brevemente la clase CSS 'pop' al número
   en pantalla para dar una pequeña animación visual.
   Removemos y re-añadimos el void para forzar
   que el navegador "reinicie" la animación.
   ───────────────────────────────────────────── */
function animatePop() {
    elCurrent.classList.remove('pop');
    void elCurrent.offsetWidth; // Truco para reiniciar la animación CSS
    elCurrent.classList.add('pop');
}


/* ─────────────────────────────────────────────
   6. FUNCIÓN: highlightOperator()
   Marca visualmente el botón del operador activo
   añadiéndole la clase CSS 'is-active' (fondo violeta).
   Primero limpia el botón anterior antes de marcar el nuevo.
   ───────────────────────────────────────────── */
function highlightOperator(op) {
    // Quitamos is-active de cualquier operador que lo tenga
    document.querySelectorAll('.btn--op').forEach(btn => {
        btn.classList.remove('is-active');
    });

    if (op) {
        // Buscamos el botón cuyo data-value coincide con el operador
        const activeBtn = document.querySelector(`.btn--op[data-value="${op}"]`);
        if (activeBtn) activeBtn.classList.add('is-active');

        // Mostramos el badge del operador en la pantalla (ej: "×")
        elOpBadge.textContent = SYMBOLS[op];
        elOpBadge.classList.add('visible');
    } else {
        // Si no hay operador, ocultamos el badge
        elOpBadge.classList.remove('visible');
    }
}


/* ─────────────────────────────────────────────
   7. FUNCIÓN: createRipple()
   Crea el efecto de onda (ripple) al hacer clic en un botón.
   Calcula la posición del clic dentro del botón,
   crea un <span> animado en ese punto y lo elimina
   cuando la animación termina.
   ───────────────────────────────────────────── */
function createRipple(event, button) {
    const rect = button.getBoundingClientRect(); // Posición del botón en pantalla
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px; height:${size}px; left:${x}px; top:${y}px;`;

    button.appendChild(ripple);

    // Cuando termina la animación CSS (0.45s), removemos el span del DOM
    ripple.addEventListener('animationend', () => ripple.remove());
}


/* ─────────────────────────────────────────────
   8. FUNCIÓN: inputNumber()
   Se llama cuando el usuario presiona un dígito (0-9).
   Maneja dos casos:
   a) Reemplazar: si shouldResetNext es true (después
      de un operador), empieza número desde cero.
   b) Concatenar: añade el dígito al número existente.
   ───────────────────────────────────────────── */
function inputNumber(digit) {
    if (shouldResetNext) {
        currentValue = digit;   // Reemplazamos completamente
        shouldResetNext = false;
    } else {
        // Evitamos números demasiado largos (máximo 15 dígitos)
        if (currentValue.length >= 15) return;

        // Si el número actual es solo '0', lo reemplazamos para no tener '07'
        currentValue = currentValue === '0' ? digit : currentValue + digit;
    }
    render();
}


/* ─────────────────────────────────────────────
   9. FUNCIÓN: inputDecimal()
   Agrega el punto decimal al número.
   Tiene dos protecciones:
   - Si viene de un resultado (shouldResetNext), empieza con '0.'
   - Si ya tiene punto, no hace nada (evita '5.3.2')
   ───────────────────────────────────────────── */
function inputDecimal() {
    if (shouldResetNext) {
        currentValue = '0.';
        shouldResetNext = false;
        render();
        return;
    }
    if (!currentValue.includes('.')) {
        currentValue += '.';
        render();
    }
}


/* ─────────────────────────────────────────────
   10. FUNCIÓN: inputOperator()
   Se llama cuando el usuario elige +, -, × o ÷.
   Flujo:
   1. Si ya había una operación pendiente Y el usuario
      ya escribió el segundo número → calcula primero.
   2. Guarda el número actual como "primer operando".
   3. Guarda el operador elegido.
   4. Activa shouldResetNext para el próximo número.
   ───────────────────────────────────────────── */
function inputOperator(op) {
    // Si hay operación pendiente y ya se ingresó el 2do número, calculamos
    if (operator && !shouldResetNext) {
        calculate(false); // false = no animamos (es cálculo encadenado)
    }

    previousValue = currentValue;  // Guardamos el primer número
    operator = op;            // Guardamos el operador
    shouldResetNext = true;          // El próximo dígito empieza número nuevo

    // Mostramos en el historial: "120 ×"
    elHistory.textContent = previousValue + ' ' + SYMBOLS[op];

    highlightOperator(op); // Marcamos visualmente el botón del operador
}


/* ─────────────────────────────────────────────
   11. FUNCIÓN: calculate()
   El núcleo matemático de la calculadora.
   Convierte los strings a números con parseFloat(),
   ejecuta la operación y muestra el resultado.
   Parámetro `animate`: si true, aplica la animación pop.
   ───────────────────────────────────────────── */
function calculate(animate = true) {
    // Si no hay operador guardado, no hay nada que calcular
    if (!operator || shouldResetNext) return;

    // parseFloat() convierte el texto '3.5' al número real 3.5
    const a = parseFloat(previousValue);
    const b = parseFloat(currentValue);

    let result;

    // Ejecutamos la operación según el operador guardado
    if (operator === '+') result = a + b;
    if (operator === '-') result = a - b;
    if (operator === '*') result = a * b;
    if (operator === '/') {
        // División entre cero: matemáticamente indefinida, mostramos error
        if (b === 0) {
            showError('Error: ÷0');
            return;
        }
        result = a / b;
    }

    // Mostramos la expresión completa en el historial: "120 × 3 ="
    elHistory.textContent =
        previousValue + ' ' + SYMBOLS[operator] + ' ' + currentValue + ' =';

    // Formateamos el resultado para evitar decimales infinitos
    // toFixed(10) limita a 10 decimales, parseFloat quita ceros finales
    currentValue = parseFloat(result.toFixed(10)).toString();

    // Limpiamos el estado: la operación terminó
    operator = '';
    previousValue = '';
    shouldResetNext = true;

    highlightOperator(''); // Quitamos el highlight del operador
    if (animate) animatePop();
    render();
}


/* ─────────────────────────────────────────────
   12. FUNCIÓN: clear()
   Reinicia completamente la calculadora al estado inicial.
   Como si la apagaras y encendieras de nuevo.
   ───────────────────────────────────────────── */
function clear() {
    currentValue = '0';
    previousValue = '';
    operator = '';
    shouldResetNext = false;

    elHistory.textContent = '';
    highlightOperator('');
    render();
}


/* ─────────────────────────────────────────────
   13. FUNCIÓN: backspace()
   Borra el último dígito del número actual.
   Si solo queda 1 dígito (o es negativo de 2 chars), vuelve a '0'.
   Si hay un error en pantalla, limpia todo.
   ───────────────────────────────────────────── */
function backspace() {
    if (currentValue === 'Error: ÷0') { clear(); return; }
    if (shouldResetNext) return; // No borrar si ya hay resultado

    // slice(0, -1) elimina el último caracter del string
    currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
    render();
}


/* ─────────────────────────────────────────────
   14. FUNCIÓN: percent()
   Divide el número actual entre 100.
   Ejemplo: 75 → 0.75
   ───────────────────────────────────────────── */
function percent() {
    if (currentValue === 'Error: ÷0') return;
    currentValue = parseFloat((parseFloat(currentValue) / 100).toFixed(10)).toString();
    render();
}


/* ─────────────────────────────────────────────
   15. FUNCIÓN: toggleSign()
   Cambia el signo del número: positivo → negativo y viceversa.
   startsWith('-') verifica si el string empieza con '-'.
   slice(1) elimina el primer caracter (el signo negativo).
   ───────────────────────────────────────────── */
function toggleSign() {
    if (currentValue === '0' || currentValue === 'Error: ÷0') return;
    currentValue = currentValue.startsWith('-')
        ? currentValue.slice(1)        // Era negativo → quitamos el '-'
        : '-' + currentValue;          // Era positivo → agregamos '-'
    render();
}


/* ─────────────────────────────────────────────
   16. FUNCIÓN: showError()
   Muestra un mensaje de error en pantalla y
   resetea el estado para que el usuario pueda seguir.
   ───────────────────────────────────────────── */
function showError(msg) {
    currentValue = msg;
    operator = '';
    previousValue = '';
    shouldResetNext = true;
    highlightOperator('');
    animatePop();
    render();
}


/* ─────────────────────────────────────────────
   17. LISTENER PRINCIPAL — DELEGACIÓN DE EVENTOS
   En vez de poner un onclick en cada botón,
   escuchamos los clics en el contenedor .keypad.
   Cuando se hace clic en cualquier hijo, el evento
   "burbujea" hasta .keypad y lo capturamos aquí.
   Esto se llama "Event Delegation" y es más eficiente.
   ───────────────────────────────────────────── */
elKeypad.addEventListener('click', function (event) {
    // Buscamos el botón más cercano al elemento clicado
    // (el usuario pudo haber clicado el texto dentro del botón)
    const btn = event.target.closest('.btn');
    if (!btn) return; // Si no se clicó un botón, ignoramos

    createRipple(event, btn); // Animación de onda

    // Leemos los atributos data-* que pusimos en el HTML
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    // Ejecutamos la función correcta según la acción del botón
    switch (action) {
        case 'number': inputNumber(value); break;
        case 'operator': inputOperator(value); break;
        case 'equals': calculate(); break;
        case 'decimal': inputDecimal(); break;
        case 'clear': clear(); break;
        case 'backspace': backspace(); break;
        case 'percent': percent(); break;
        case 'sign': toggleSign(); break;
    }
});


/* ─────────────────────────────────────────────
   18. SOPORTE PARA TECLADO FÍSICO
   Escuchamos las teclas del teclado del usuario.
   event.key contiene el nombre de la tecla presionada.
   Así la calculadora también funciona sin el mouse.    
   ───────────────────────────────────────────── */
document.addEventListener('keydown', function (event) {
    const key = event.key;

    // Dígitos del 0 al 9
    if (key >= '0' && key <= '9') { inputNumber(key); return; }

    // Mapa de teclas del teclado a acciones de la calculadora
    const keyMap = {
        '+': () => inputOperator('+'),
        '-': () => inputOperator('-'),
        '*': () => inputOperator('*'),
        '/': () => { event.preventDefault(); inputOperator('/'); }, // Prev. la búsqueda rápida del navegador
        'Enter': () => calculate(),
        '=': () => calculate(),
        'Backspace': () => backspace(),
        'Escape': () => clear(),
        '.': () => inputDecimal(),
        ',': () => inputDecimal(), // Algunos teclados usan coma como separador decimal
        '%': () => percent(),
    };

    // Si la tecla presionada está en nuestro mapa, ejecutamos su función
    if (keyMap[key]) keyMap[key]();
});