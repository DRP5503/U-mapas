/**
 * ==============================================================================
 * CONTROLADOR DE INTERFAZ Y RENDERIZADO SVG DEL MAPA (U-MAPAS)
 * ==============================================================================
 */

const AppState = {
  currentView: 'general',
  currentBuilding: null,
  currentFloor: null,
  origenRuta: null, // { id, nombre, edificio, piso } de la sala de partida
  ruta: null,       // última ruta calculada: { desde, hasta, distancia, tramos }
  irAMapa: null,    // (edificio, piso) => abre ese mapa; se asigna al cargar la página
  salaObjetivo: null, // Para guardar la sala a la que queremos ir por URL
};

const SVG_NS = 'http://www.w3.org/2000/svg';
let renderToken = 0;

/**
 * Escribe `texto` dentro de un <text> SVG, partiéndolo en varias líneas
 * (<tspan>) para que ninguna supere `anchoMax`. Queda centrado vertical y
 * horizontalmente respecto al x/y que ya tiene el <text>.
 */
function ajustarTexto(label, texto, anchoMax) {
  const x = label.getAttribute('x');
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';

  palabras.forEach((palabra) => {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    label.textContent = candidata;
    if (actual && label.getComputedTextLength() > anchoMax) {
      lineas.push(actual); // la línea anterior queda cerrada
      actual = palabra;    // y la palabra pasa a la línea de abajo
    } else {
      actual = candidata;
    }
  });
  if (actual) lineas.push(actual);

  label.textContent = '';
  const interlineado = 1.2; // en em
  lineas.forEach((linea, i) => {
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', x);
    // La 1ª línea sube la mitad del bloque para que todo quede centrado
    tspan.setAttribute('dy', i === 0 ? `${(-(lineas.length - 1) * interlineado) / 2}em` : `${interlineado}em`);
    tspan.textContent = linea;
    label.appendChild(tspan);
  });
}

function showView(name) {
  AppState.currentView = name;
  document.getElementById('vista-general').classList.toggle('active', name === 'general');
  document.getElementById('vista-piso').classList.toggle('active', name === 'piso');
  const controls = document.querySelector('.map-floating-controls');
  if (controls) controls.hidden = name !== 'piso';
}

async function renderFloor(edificio, numero) {
  const token = ++renderToken;
  let piso;
  try {
    piso = await MapAPI.obtenerPlanoPiso(edificio, numero);
  } catch (err) {
    console.error('No se pudo cargar el piso:', err);
    return;
  }
  if (token !== renderToken) return;

  const svg = document.getElementById('floorSvg');
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${piso.ancho} ${piso.alto}`);
  svg.setAttribute('aria-label', `Plano del edificio ${piso.edificio}, piso ${piso.numero}`);
  document.getElementById('floorTitle').textContent =
    `Edificio ${piso.edificio} · Piso ${piso.numero}`;
  document.getElementById('roomPanel').replaceChildren();

  const dibujables = piso.salas.filter(
    (s) => s.x !== null && s.y !== null && s.ancho !== null && s.alto !== null
  );

  dibujables.forEach((sala) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `room room-${sala.tipo}`);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', sala.nombre);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', sala.x);
    rect.setAttribute('y', sala.y);
    rect.setAttribute('width', sala.ancho);
    rect.setAttribute('height', sala.alto);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', sala.x + sala.ancho / 2);
    label.setAttribute('y', sala.y + sala.alto / 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('font-size', '12');

    g.append(rect, label);
    g.addEventListener('click', () => showRoom(sala));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showRoom(sala);
      }
    });
    svg.appendChild(g);
    // Debe ir DESPUÉS de appendChild: para medir el texto, el elemento tiene que estar en el DOM.
    ajustarTexto(label, sala.nombre, sala.ancho - 8);
  });

  if (dibujables.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'Este piso aún no tiene plano dibujado.';
    document.getElementById('roomPanel').appendChild(msg);
  }

  // renderFloor borra el SVG: si hay una ruta guardada, vuelve a dibujar el tramo de este piso
  dibujarRutaActual(piso.edificio, piso.numero);
  // Si venimos desde un favorito, abrimos la sala automáticamente
  if (AppState.salaObjetivo) {
    const salaEncontrada = dibujables.find(s => s.nombre === AppState.salaObjetivo);
    if (salaEncontrada) {
      showRoom(salaEncontrada);
    }
    AppState.salaObjetivo = null; // Limpiamos para no re-abrir si el usuario navega a otro piso
  }
}

/**
 * Dibuja en `svg` un tramo de la ruta. Los mapas siguen separados: cada mapa solo dibuja
 * SU tramo. Verde = origen de la ruta, rojo = destino, ámbar = cambio de mapa.
 */
function dibujarTramo(svg, puntos, esPrimero, esUltimo) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'ruta');
  const linea = document.createElementNS(SVG_NS, 'polyline');
  linea.setAttribute('class', 'ruta-linea');
  linea.setAttribute('points', puntos.map((p) => `${p.x},${p.y}`).join(' '));
  const marca = (p, clase) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('class', clase);
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', 8);
    estiloMarca(c, clase);
    return c;
  };
  g.append(
    linea,
    marca(puntos[0], esPrimero ? 'ruta-inicio' : 'ruta-paso'),
    marca(puntos[puntos.length - 1], esUltimo ? 'ruta-fin' : 'ruta-paso')
  );
  svg.appendChild(g);
}

/** Color y borde blanco del círculo; `clase` coincide con la variable CSS (--ruta-inicio, --ruta-fin, --ruta-paso). */
function estiloMarca(circulo, clase) {
  circulo.style.fill = `var(--${clase})`;
  circulo.style.stroke = '#FFFFFF';
  circulo.style.strokeWidth = '3';
}

/** Marca de inicio apenas se elige "Partir desde aquí", antes de que exista una ruta. */
function dibujarOrigen(svg, edificio, piso) {
  const o = AppState.origenRuta;
  if (!o || o.x == null || o.y == null) return;
  if (String(o.edificio).toLowerCase() !== String(edificio).toLowerCase() || Number(o.piso) !== Number(piso)) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'ruta');
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('class', 'ruta-inicio');
  c.setAttribute('cx', o.x);
  c.setAttribute('cy', o.y);
  c.setAttribute('r', 8);
  estiloMarca(c, 'ruta-inicio');
  g.appendChild(c);
  svg.appendChild(g);
}

function borrarRuta() {
  document.querySelectorAll('#floorSvg .ruta').forEach((el) => el.remove());
}

/** Dibuja, en el piso que se está mostrando, los tramos de la ruta guardada que le tocan. */
function dibujarRutaActual(edificio, piso) {
  borrarRuta();
  const ruta = AppState.ruta;
  const svg = document.getElementById('floorSvg');
  if (!ruta) {
    dibujarOrigen(svg, edificio, piso);
    return;
  }
  ruta.tramos.forEach((t, i) => {
    if (t.edificio.toLowerCase() === String(edificio).toLowerCase() && Number(t.piso) === Number(piso)) {
      dibujarTramo(svg, t.puntos, i === 0, i === ruta.tramos.length - 1);
    }
  });
}

/** Quita la ruta (el origen se mantiene para poder pedir otra). */
function limpiarRuta() {
  AppState.ruta = null;
  borrarRuta();
  renderRouteBar();
}

/**
 * Barra de ruta, fuera de las vistas: persiste al volver al mapa general o cambiar de piso.
 * Muestra origen/ruta y un botón por cada mapa por el que pasa la ruta.
 */
function renderRouteBar() {
  const bar = document.getElementById('routeBar');
  bar.replaceChildren();
  const { origenRuta, ruta } = AppState;
  if (!origenRuta && !ruta) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;

  const titulo = document.createElement('p');
  titulo.className = 'route-bar-title';
  titulo.textContent = ruta
    ? `Ruta: ${ruta.desde} → ${ruta.hasta}`
    : `Origen: ${origenRuta.nombre} (${origenRuta.edificio} · Piso ${origenRuta.piso})`;
  bar.appendChild(titulo);

  if (ruta) {
    const lista = document.createElement('div');
    lista.className = 'route-bar-tramos';
    ruta.tramos.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${t.edificio} · Piso ${t.piso}`;
      b.addEventListener('click', () => AppState.irAMapa?.(t.edificio, t.piso));
      lista.appendChild(b);
    });
    bar.appendChild(lista);
  }

  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.textContent = 'Quitar origen y ruta';
  quitar.addEventListener('click', () => {
    AppState.origenRuta = null;
    limpiarRuta();
  });
  bar.appendChild(quitar);
}

async function pedirRuta(sala, estado) {
  if (!AppState.origenRuta) {
    estado.textContent = 'Primero elige un origen con "Partir desde aquí".';
    return;
  }
  try {
    const { ok, data } = await MapAPI.obtenerRutaSalas(AppState.origenRuta.id, sala.id);
    if (!ok) {
      estado.textContent = data.error || 'No se pudo calcular la ruta.';
      return;
    }
    AppState.ruta = data;
    dibujarRutaActual(AppState.currentBuilding, AppState.currentFloor);
    renderRouteBar();
    estado.textContent = `Ruta de ${data.desde} a ${data.hasta} (${data.distancia} unidades).`;
  } catch (err) {
    console.error('No se pudo pedir la ruta:', err);
    estado.textContent = 'Error al pedir la ruta.';
  }
}

function agregarControlesRuta(sala, panel) {
  const estado = document.createElement('p');
  estado.className = 'route-status';
  if (AppState.origenRuta) estado.textContent = `Origen elegido: ${AppState.origenRuta.nombre}`;
  const acciones = document.createElement('div');
  acciones.className = 'route-actions';
  const boton = (texto, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    b.addEventListener('click', onClick);
    return b;
  };
  acciones.append(
    boton('Partir desde aquí', () => {
      // Se guarda también el edificio y el piso: el origen puede estar en otro mapa que el destino
      AppState.origenRuta = {
        id: sala.id,
        nombre: sala.nombre,
        edificio: AppState.currentBuilding,
        piso: AppState.currentFloor,
        // posición de la puerta (nodo) de la sala, para dibujar el círculo de inicio al tiro
        x: sala.nodo?.x ?? sala.x + sala.ancho / 2,
        y: sala.nodo?.y ?? sala.y + sala.alto / 2,
      };
      limpiarRuta(); // la ruta anterior ya no sirve con otro origen
      dibujarRutaActual(AppState.origenRuta.edificio, AppState.origenRuta.piso); // muestra el círculo de inicio
      estado.textContent = `Origen elegido: ${sala.nombre}`;
    }),
    boton('Ir hasta aquí', () => pedirRuta(sala, estado)),
    boton('Borrar ruta', () => {
      limpiarRuta();
      estado.textContent = '';
    })
  );
  panel.append(acciones, estado);
}

function aplicarEstadoFavorito(btn, activo) {
  if (activo) {
    btn.textContent = '★ Quitar de favoritos';
    btn.style.backgroundColor = '#FEF9C3';
    btn.style.borderColor = '#CA8A04';
    btn.style.color = '#92400E';
  } else {
    btn.textContent = '☆ Agregar a favoritos';
    btn.style.backgroundColor = '#F8FAFC';
    btn.style.borderColor = '#CBD5E1';
    btn.style.color = '#334155';
  }
}

/** Agrega el botón de favorito. El estado ya viene con la sala (sala.favorito): no hay consulta ni espera. */
function agregarBotonFavorito(sala, panel) {
  if (!sala.id) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-favorito';
  btn.style.cssText = 'margin-top: 1rem; padding: 0.5rem 0.9rem; font-family: inherit; font-size: 0.85rem; font-weight: 600; color: #334155; background-color: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; cursor: pointer; width: 100%;';
  aplicarEstadoFavorito(btn, sala.favorito === true);
  panel.appendChild(btn);
  // La animación se activa recién después de pintar el estado inicial: así solo se anima al hacer clic
  requestAnimationFrame(() => { btn.style.transition = 'all 0.15s ease-in-out'; });

  btn.addEventListener('click', async () => {
    try {
      const { ok, status, data } = await MapAPI.toggleFavorito(sala.id);
      if (status === 401 || status === 403) {
        window.location.href = '/login';
        return;
      }
      if (ok) {
        sala.favorito = !!data.favorito; // la sala queda actualizada para la próxima vez que se abra
        aplicarEstadoFavorito(btn, sala.favorito);
      }
    } catch (e) {
      console.error('Error al togglear favorito:', e);
    }
  });
}

function showRoom(sala) {
  const panel = document.getElementById('roomPanel');
  // Todo el contenido se arma fuera de pantalla y se cambia de una sola vez: sin parpadeo
  const contenido = document.createDocumentFragment();

  const titulo = document.createElement('h3');
  titulo.textContent = sala.nombre;
  contenido.appendChild(titulo);

  if (sala.profesores.length) {
    const lista = document.createElement('ul');
    sala.profesores.forEach((nombre) => {
      const li = document.createElement('li');
      li.textContent = nombre;
      lista.appendChild(li);
    });
    contenido.appendChild(lista);
  } else {
    const vacio = document.createElement('p');
    vacio.textContent = 'Sin profesores asignados.';
    contenido.appendChild(vacio);
  }

  agregarBotonFavorito(sala, contenido);
  agregarControlesRuta(sala, contenido);
  panel.replaceChildren(contenido);
}

document.addEventListener('DOMContentLoaded', () => {
  const edificios = document.querySelectorAll('.interactive-building');
  const floorBtn = document.getElementById('floorSelectorBtn');
  const floorMenu = document.getElementById('floorDropdownMenu');
  const floorLabel = document.getElementById('currentFloorLabel');

  if (floorBtn && floorMenu) {
    const toggleFloorMenu = (open) => {
      floorBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        floorMenu.removeAttribute('hidden');
        const activeOption = floorMenu.querySelector('.floor-option.active');
        if (activeOption) activeOption.focus();
      } else {
        floorMenu.setAttribute('hidden', '');
      }
    };

    floorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = floorBtn.getAttribute('aria-expanded') === 'true';
      toggleFloorMenu(!isExpanded);
    });

    const selectFloor = (option) => {
      const floorValue = option.getAttribute('data-floor');
      const floorText =
        option.querySelector('span')?.textContent.trim() || option.textContent.trim();

      if (floorLabel) floorLabel.textContent = floorText;
      floorBtn.setAttribute('aria-label', `Selector de piso. ${floorText} seleccionado`);

      floorMenu.querySelectorAll('.floor-option').forEach((opt) => {
        opt.classList.remove('active');
        opt.removeAttribute('aria-selected');
        const existingCheck = opt.querySelector('.floor-check-icon');
        if (existingCheck) existingCheck.remove();
      });

      option.classList.add('active');
      option.setAttribute('aria-selected', 'true');

      const checkSvg = document.createElementNS(SVG_NS, 'svg');
      checkSvg.setAttribute('class', 'floor-check-icon');
      checkSvg.setAttribute('viewBox', '0 0 24 24');
      checkSvg.setAttribute('width', '14');
      checkSvg.setAttribute('height', '14');
      checkSvg.setAttribute('fill', 'none');
      checkSvg.setAttribute('stroke', 'currentColor');
      checkSvg.setAttribute('stroke-width', '2.5');
      checkSvg.setAttribute('stroke-linecap', 'round');
      checkSvg.setAttribute('stroke-linejoin', 'round');
      checkSvg.setAttribute('aria-hidden', 'true');
      const polyline = document.createElementNS(SVG_NS, 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      checkSvg.appendChild(polyline);
      option.appendChild(checkSvg);

      AppState.currentFloor = parseInt(floorValue, 10) || floorValue;
      renderFloor(AppState.currentBuilding, AppState.currentFloor);

      toggleFloorMenu(false);
      floorBtn.focus();
    };

    const bindOption = (option) => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFloor(option);
      });

      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectFloor(option);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = option.nextElementSibling;
          if (next && next.classList.contains('floor-option')) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = option.previousElementSibling;
          if (prev && prev.classList.contains('floor-option')) prev.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          toggleFloorMenu(false);
          floorBtn.focus();
        }
      });
    };

    const setFloorOptions = (pisos) => {
      floorMenu.replaceChildren();
      pisos.forEach((n) => {
        const li = document.createElement('li');
        li.className = 'floor-option';
        li.setAttribute('role', 'option');
        li.setAttribute('tabindex', '0');
        li.dataset.floor = n;
        const span = document.createElement('span');
        span.textContent = n < 0 ? `Subterráneo ${n}` : `Piso ${n}`;
        li.appendChild(span);
        bindOption(li);
        floorMenu.appendChild(li);
      });
    };

    const openBuilding = async (edificio, pisoObjetivo = null) => {
      let pisos;
      try {
        ({ pisos } = await MapAPI.obtenerPisos(edificio));
      } catch (err) {
        console.error('No se pudieron cargar los pisos:', err);
        return;
      }
      if (!pisos.length) return;

      AppState.currentBuilding = edificio;
      setFloorOptions(pisos);
      showView('piso');
      
      // Si venimos de un favorito con un piso específico, lo buscamos
      let inicial = pisos.includes(3) ? pisos.indexOf(3) : 0;
      if (pisoObjetivo) {
        const idx = pisos.indexOf(parseInt(pisoObjetivo, 10));
        if (idx !== -1) inicial = idx;
      }
      
      floorMenu.querySelectorAll('.floor-option')[inicial].click();
    };

    AppState.irAMapa = (edificio, piso) => openBuilding(edificio, piso);

    edificios.forEach((edificio) => {
      const abrir = () => openBuilding(edificio.dataset.edificio);
      edificio.addEventListener('click', abrir);
      edificio.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrir();
        }
      });
    });

    document.getElementById('backToGeneral')?.addEventListener('click', () => {
      renderToken++;
      AppState.currentBuilding = null;
      AppState.currentFloor = null;
      document.getElementById('floorSvg').replaceChildren();
      document.getElementById('roomPanel').replaceChildren();
      showView('general');
      document.getElementById('vista-general').focus();
    });

    document.addEventListener('click', (e) => {
      if (!floorBtn.contains(e.target) && !floorMenu.contains(e.target)) {
        toggleFloorMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !floorMenu.hasAttribute('hidden')) {
        toggleFloorMenu(false);
        floorBtn.focus();
      }
    });

    // --- NUEVO: Lógica para leer la URL y abrir el favorito automáticamente ---
    const urlParams = new URLSearchParams(window.location.search);
    const paramEdificio = urlParams.get('edificio');
    const paramPiso = urlParams.get('piso');
    const paramSala = urlParams.get('sala');

    if (paramEdificio) {
      AppState.salaObjetivo = paramSala;
      openBuilding(paramEdificio, paramPiso);
    }
  }
});