/**
 * ==============================================================================
 * CONTROLADOR DE INTERFAZ Y RENDERIZADO SVG DEL MAPA (U-MAPAS)
 * ==============================================================================
 */

const AppState = {
  currentView: 'general',
  currentBuilding: null,
  currentFloor: null,
  origenRuta: null,
};

const SVG_NS = 'http://www.w3.org/2000/svg';
let renderToken = 0;

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
    label.textContent = sala.nombre;

    g.append(rect, label);
    g.addEventListener('click', () => showRoom(sala));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showRoom(sala);
      }
    });
    svg.appendChild(g);
  });

  if (dibujables.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'Este piso aún no tiene plano dibujado.';
    document.getElementById('roomPanel').appendChild(msg);
  }
}

function dibujarRuta(puntos) {
  const svg = document.getElementById('floorSvg');
  borrarRuta();
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
    return c;
  };
  g.append(linea, marca(puntos[0], 'ruta-inicio'), marca(puntos[puntos.length - 1], 'ruta-fin'));
  svg.appendChild(g);
}

function borrarRuta() {
  document.getElementById('floorSvg').querySelector('.ruta')?.remove();
}

async function pedirRuta(hasta, estado) {
  if (!AppState.origenRuta) {
    estado.textContent = 'Primero elige un origen con "Partir desde aquí".';
    return;
  }
  try {
    const { ok, data } = await MapAPI.obtenerRuta(
      AppState.currentBuilding,
      AppState.currentFloor,
      AppState.origenRuta,
      hasta
    );
    if (!ok) {
      estado.textContent = data.error || 'No se pudo calcular la ruta.';
      return;
    }
    dibujarRuta(data.puntos);
    estado.textContent = `Ruta de ${data.desde} a ${data.hasta} (${data.distancia} unidades).`;
  } catch (err) {
    console.error('No se pudo pedir la ruta:', err);
    estado.textContent = 'Error al pedir la ruta.';
  }
}

function agregarControlesRuta(sala, panel) {
  const estado = document.createElement('p');
  estado.className = 'route-status';
  if (AppState.origenRuta) estado.textContent = `Origen elegido: ${AppState.origenRuta}`;
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
      AppState.origenRuta = sala.nombre;
      estado.textContent = `Origen elegido: ${sala.nombre}`;
    }),
    boton('Ir hasta aquí', () => pedirRuta(sala.nombre, estado)),
    boton('Borrar ruta', () => {
      borrarRuta();
      estado.textContent = '';
    })
  );
  panel.append(acciones, estado);
}

function showRoom(sala) {
  const panel = document.getElementById('roomPanel');
  panel.replaceChildren();

  const titulo = document.createElement('h3');
  titulo.textContent = sala.nombre;
  panel.appendChild(titulo);

  if (sala.profesores.length) {
    const lista = document.createElement('ul');
    sala.profesores.forEach((nombre) => {
      const li = document.createElement('li');
      li.textContent = nombre;
      lista.appendChild(li);
    });
    panel.appendChild(lista);
  } else {
    const vacio = document.createElement('p');
    vacio.textContent = 'Sin profesores asignados.';
    panel.appendChild(vacio);
  }

  agregarControlesRuta(sala, panel);
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

    const openBuilding = async (edificio) => {
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
      const inicial = pisos.includes(3) ? pisos.indexOf(3) : 0;
      floorMenu.querySelectorAll('.floor-option')[inicial].click();
    };

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
  }
});
