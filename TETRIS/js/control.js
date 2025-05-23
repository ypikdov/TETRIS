// Efectos sonoros
const choque = new Audio("sonidos/choque.mp3");
const lineas = new Audio("sonidos/lineas.mp3");
const derrota = new Audio("sonidos/juego.mp3");

// Tetrominos
const tetrominos = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]]
};

const colors = {
  I: "cyan", O: "yellow", T: "purple",
  S: "green", Z: "red", J: "blue", L: "orange"
};

// Elementos del DOM
const elementos = {
  puntaje: document.getElementById("puntaje"),
  nivel: document.getElementById("nivel"),
  tiempo: document.getElementById("tiempo"),
  mensajes: document.getElementById("mensajes"),
  reiniciar: document.getElementById("reiniciar"),
  pausar: document.getElementById("pausar"),
  continuar: document.getElementById("continuar"),
  guardar: document.getElementById("guardar"),
  salir: document.getElementById("salir"),
  izquierda: document.getElementById("izquierda"),
  abajo: document.getElementById("abajo"),
  derecha: document.getElementById("derecha"),
  rotar: document.getElementById("rotar"),
  canvas: document.getElementById("canvas"),
  tetromino: document.getElementById("tetromino"),
  nombreJugador: document.getElementById("nombreJugador"),
  mejorPuntaje: document.getElementById("mejorPuntaje")
};

// Configuración del juego
const filas = 20;
const columnas = 10;
const tamano = 30;
let tablero = Array(filas).fill().map(() => Array(columnas).fill(0));
let piezaActual = null;
let siguientePieza = null;
let intervaloCaida;
let juegoPausado = false;
let puntaje = 0;
let nivel = 1;
let tiempoTranscurrido = 0;
let intervaloCronometro;
let lineasCompletasTotales = 0;
const ctx = elementos.canvas.getContext("2d");

// Inicialización del canvas
elementos.canvas.width = columnas * tamano;
elementos.canvas.height = filas * tamano;

// Funciones principales del juego
function dibujarTablero() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, elementos.canvas.width, elementos.canvas.height);

  // Dibujar piezas del tablero
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      if (tablero[y][x]) {
        ctx.fillStyle = colors[tablero[y][x]];
        ctx.fillRect(x * tamano, y * tamano, tamano - 1, tamano - 1);
      }
    }
  }

  // Dibujar cuadrícula
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1;
  
  for (let y = 1; y < filas; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tamano + 0.5);
    ctx.lineTo(elementos.canvas.width, y * tamano + 0.5);
    ctx.stroke();
  }
  
  for (let x = 1; x < columnas; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tamano + 0.5, 0);
    ctx.lineTo(x * tamano + 0.5, elementos.canvas.height);
    ctx.stroke();
  }

  // Borde exterior
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.strokeRect(0.5, 0.5, elementos.canvas.width - 1, elementos.canvas.height - 1);
}

function crearPieza() {
  const tipos = Object.keys(tetrominos);
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  return {
    forma: tetrominos[tipo],
    color: tipo,
    x: Math.floor(columnas / 2) - Math.floor(tetrominos[tipo][0].length / 2),
    y: 0
  };
}

function mostrarSiguientePieza() {
  const contenedor = elementos.tetromino;
  contenedor.innerHTML = "";
  const forma = siguientePieza.forma;
  const color = colors[siguientePieza.color];
  const escala = 20;

  forma.forEach((fila, y) => {
    fila.forEach((celda, x) => {
      if (celda) {
        const bloque = document.createElement("div");
        bloque.style.cssText = `
          width: ${escala}px;
          height: ${escala}px;
          background: ${color};
          position: absolute;
          left: ${x * escala}px;
          top: ${y * escala}px;
          border: 1px solid #444;
          box-sizing: border-box;
        `;
        contenedor.appendChild(bloque);
      }
    });
  });

  contenedor.style.cssText = `
    position: relative;
    width: ${forma[0].length * escala}px;
    height: ${forma.length * escala}px;
  `;
}

function hayColision(pieza, moveX = 0, moveY = 0) {
  for (let y = 0; y < pieza.forma.length; y++) {
    for (let x = 0; x < pieza.forma[y].length; x++) {
      if (pieza.forma[y][x]) {
        const newX = pieza.x + x + moveX;
        const newY = pieza.y + y + moveY;
        if (newX < 0 || newX >= columnas || newY >= filas) return true;
        if (newY < 0) continue;
        if (tablero[newY][newX]) return true;
      }
    }
  }
  return false;
}

function fijarPieza() {
  for (let y = 0; y < piezaActual.forma.length; y++) {
    for (let x = 0; x < piezaActual.forma[y].length; x++) {
      if (piezaActual.forma[y][x]) {
        tablero[piezaActual.y + y][piezaActual.x + x] = piezaActual.color;
      }
    }
  }
  limpiarLineas();
  piezaActual = siguientePieza;
  siguientePieza = crearPieza();
  mostrarSiguientePieza();
  
  if (hayColision(piezaActual)) {
    derrota.play();
    gameOver();
  }
}

function limpiarLineas() {
  let lineasCompletas = 0;
  const lineasAEliminar = [];

  for (let y = filas - 1; y >= 0; y--) {
    if (tablero[y].every(celda => celda !== 0)) {
      lineasAEliminar.push(y);
      lineasCompletas++;
    }
  }

  if (lineasCompletas > 0) {
    lineas.play();
    lineasCompletasTotales += lineasCompletas;
    puntaje += lineasCompletas * 100 * nivel;
    actualizarPuntaje();

    // Animación de limpieza
    let contador = 0;
    const animar = () => {
      lineasAEliminar.forEach(y => {
        tablero[y] = Array(columnas).fill(contador % 2 ? "X" : 0);
      });
      dibujarTablero();
      contador++;
      
      if (contador < 6) {
        requestAnimationFrame(animar);
      } else {
        lineasAEliminar.forEach(y => {
          tablero.splice(y, 1);
          tablero.unshift(Array(columnas).fill(0));
        });
        if (lineasCompletasTotales >= 10) {
          lineasCompletasTotales -= 10;
          aumentarNivel();
        }
      }
    };
    animar();
  }
}

// Sistema de puntuación y niveles
function actualizarPuntaje() {
  elementos.puntaje.textContent = puntaje;
}

function aumentarNivel() {
  nivel++;
  elementos.nivel.textContent = nivel;
  clearInterval(intervaloCaida);
  intervaloCaida = setInterval(cicloJuego, Math.max(50, 1000 / nivel));
  
  // Efecto visual
  elementos.nivel.style.transform = "scale(1.2)";
  setTimeout(() => elementos.nivel.style.transform = "scale(1)", 300);
}

// Temporizador
function cronometro() {
  if (!juegoPausado) {
    const minutos = Math.floor(tiempoTranscurrido / 60);
    const segundos = tiempoTranscurrido % 60;
    elementos.tiempo.textContent = 
      `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
    tiempoTranscurrido++;
  }
}

// Gestión del juego
function iniciarJuego() {
  tablero = Array(filas).fill().map(() => Array(columnas).fill(0));
  piezaActual = crearPieza();
  siguientePieza = crearPieza();
  mostrarSiguientePieza();
  
  puntaje = 0;
  nivel = 1;
  tiempoTranscurrido = 0;
  elementos.canvas.style.display = "block";
  elementos.nivel.textContent = "1";
  elementos.puntaje.textContent = "0";
  elementos.tiempo.textContent = "00:00";
  elementos.mensajes.textContent = "😊";
  
  clearInterval(intervaloCaida);
  clearInterval(intervaloCronometro);
  intervaloCaida = setInterval(cicloJuego, 1000 / nivel);
  intervaloCronometro = setInterval(cronometro, 1000);
  
  mostrarMejorPuntaje();
}

function pausarJuego() {
  juegoPausado = true;
  elementos.mensajes.textContent = "⏸️";
  clearInterval(intervaloCaida);
}

function continuarJuego() {
  juegoPausado = false;
  elementos.mensajes.textContent = "😊";
  intervaloCaida = setInterval(cicloJuego, 1000 / nivel);
}

function reiniciarJuego() {
  clearInterval(intervaloCaida);
  clearInterval(intervaloCronometro);
  iniciarJuego();
}

function gameOver() {
  clearInterval(intervaloCaida);
  clearInterval(intervaloCronometro);
  elementos.mensajes.textContent = "💀 HAS PERDIDO 💀";
  guardarPuntaje();
}

// Sistema de guardado
function guardarPuntaje() {
  let nombre = elementos.nombreJugador.value;
  if (!nombre) {
    nombre = prompt("¡Nuevo récord! Ingresa tu nombre:") || "Anónimo";
    elementos.nombreJugador.value = nombre;
  }

  const puntajeActual = {
    nombre: nombre,
    puntaje: puntaje,
    nivel: nivel,
    fecha: new Date().toLocaleString()
  };

  const historial = JSON.parse(localStorage.getItem("puntajesTetris") || "[]");
  historial.push(puntajeActual);
  historial.sort((a, b) => b.puntaje - a.puntaje);
  
  localStorage.setItem("puntajesTetris", JSON.stringify(historial.slice(0, 10)));
  mostrarMejorPuntaje();
}

function mostrarMejorPuntaje() {
  const historial = JSON.parse(localStorage.getItem("puntajesTetris") || "[]");
  elementos.mejorPuntaje.innerHTML = "<h3>🏆 Mejores Puntajes</h3>";
  
  historial.forEach((p, i) => {
    elementos.mejorPuntaje.innerHTML += `
      <p>${i + 1}. ${p.nombre} - ${p.puntaje} pts<br>
      <small>Nivel ${p.nivel} (${p.fecha})</small></p>
    `;
  });
}

// Controles
function configurarControlesVirtuales() {
  const manejarEvento = (elemento, accion) => {
    elemento.addEventListener("click", () => !juegoPausado && accion());
    elemento.addEventListener("touchstart", (e) => {
      e.preventDefault();
      !juegoPausado && accion();
    });
  };

  manejarEvento(elementos.izquierda, () => mover(-1, 0));
  manejarEvento(elementos.derecha, () => mover(1, 0));
  manejarEvento(elementos.abajo, () => mover(0, 1));
  manejarEvento(elementos.rotar, rotarTetromino);
}

function mover(dx, dy) {
  if (!juegoPausado && !hayColision(piezaActual, dx, dy)) {
    piezaActual.x += dx;
    piezaActual.y += dy;
    actualizar();
    return true;
  }
  if (dy === 1) fijarPieza();
  return false;
}

function rotarTetromino() {
  if (juegoPausado || !piezaActual) return;

  const rotated = piezaActual.forma[0].map((_, i) =>
    [...piezaActual.forma.map(row => row[i])].reverse()
  );

  const original = { ...piezaActual, forma: [...piezaActual.forma] };
  piezaActual.forma = rotated;

  // Ajustes de posición al rotar
  if (hayColision(piezaActual)) {
    piezaActual.x -= 1;
    if (hayColision(piezaActual)) {
      piezaActual.x += 2;
      if (hayColision(piezaActual)) {
        piezaActual.x -= 1;
        piezaActual.y -= 1;
        if (hayColision(piezaActual)) {
          Object.assign(piezaActual, original);
        }
      }
    }
  }
  actualizar();
}

// Eventos
document.addEventListener("keydown", (e) => {
  if (!piezaActual || juegoPausado) return;

  const teclas = {
    ArrowLeft: () => mover(-1, 0),
    ArrowRight: () => mover(1, 0),
    ArrowDown: () => mover(0, 1),
    ArrowUp: rotarTetromino
  };

  if (teclas[e.key]) {
    e.preventDefault();
    teclas[e.key]();
  }
});

elementos.reiniciar.addEventListener("click", reiniciarJuego);
elementos.pausar.addEventListener("click", pausarJuego);
elementos.continuar.addEventListener("click", continuarJuego);
elementos.guardar.addEventListener("click", guardarPuntaje);
elementos.salir.addEventListener("click", () => {
  clearInterval(intervaloCaida);
  clearInterval(intervaloCronometro);
  elementos.mensajes.textContent = "¡Gracias por jugar! 🎮";
  elementos.canvas.style.opacity = "0.3";
  elementos.canvas.style.pointerEvents = "none";
});

// Inicialización
function cicloJuego() {
  if (!juegoPausado) {
    mover(0, 1);
    actualizar();
  }
}

function actualizar() {
  dibujarTablero();
  ctx.fillStyle = colors[piezaActual.color];
  
  piezaActual.forma.forEach((fila, y) => {
    fila.forEach((celda, x) => {
      if (celda) {
        ctx.fillRect(
          (piezaActual.x + x) * tamano,
          (piezaActual.y + y) * tamano,
          tamano - 1,
          tamano - 1
        );
      }
    });
  });
}

configurarControlesVirtuales();
iniciarJuego();