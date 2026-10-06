/**
 * ==============================================================================
 * CONTROLADOR PRINCIPAL DEL MAPA INTERACTIVO DCC (BEAUCHEF 851)
 * CC4401 - Ingeniería de Software (Primavera 2026)
 * ==============================================================================
 */

// Estado global de la aplicación
const AppState = {
  currentView: 'general',   // 'general' | 'piso'
  currentBuilding: null,    // 'Norte' | 'Poniente' (igual que Piso.edificio)
  currentFloor: null,       // antes 3 fijo; ahora se define al abrir un edificio
};

// [NUEVO] ---------------------------------------------------------------------
const SVG_NS = 'http://www.w3.org/2000/svg';
 
// Se incrementa en cada renderFloor(). Si el usuario cambia de piso rápido,
// la respuesta de un fetch viejo puede llegar después de la nueva; el token
// permite descartarla para no dibujar el piso equivocado.
let renderToken = 0;
 
// URLs de la API: vienen del template ({% url %}), con EDIFICIO como marcador.
const vistaPisoEl = () => document.getElementById('vista-piso');
const urlPisos = (edificio) =>
  vistaPisoEl().dataset.urlPisos.replace('EDIFICIO', encodeURIComponent(edificio));
const urlPiso = (edificio, numero) =>
  vistaPisoEl().dataset.urlPiso
    .replace('EDIFICIO', encodeURIComponent(edificio))
    .replace(/\/0\/$/, `/${numero}/`);
 
// Alterna entre la vista del campus y la vista de piso. El control flotante
// del selector solo es visible en la vista de piso.
function showView(name) {
  AppState.currentView = name;
  document.getElementById('vista-general').classList.toggle('active', name === 'general');
  document.getElementById('vista-piso').classList.toggle('active', name === 'piso');
  const controls = document.querySelector('.map-floating-controls');
  if (controls) controls.hidden = name !== 'piso';
}
 
// Pide el piso al backend y dibuja un <g> (rect + etiqueta) por sala.
async function renderFloor(edificio, numero) {
  const token = ++renderToken;
  let piso;
  try {
    const res = await fetch(urlPiso(edificio, numero));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    piso = await res.json();
  } catch (err) {
    console.error('No se pudo cargar el piso:', err);
    return;
  }
  if (token !== renderToken) return; // llegó una respuesta más nueva: descartar
 
  const svg = document.getElementById('floorSvg');
  svg.replaceChildren();
  // El viewBox usa el tamaño del lienzo guardado en Piso: las coordenadas de
  // las salas quedan en ese sistema y el SVG escala a cualquier pantalla.
  svg.setAttribute('viewBox', `0 0 ${piso.ancho} ${piso.alto}`);
  svg.setAttribute('aria-label', `Plano del edificio ${piso.edificio}, piso ${piso.numero}`);
  document.getElementById('floorTitle').textContent =
    `Edificio ${piso.edificio} · Piso ${piso.numero}`;
  document.getElementById('roomPanel').replaceChildren();
 
  // Las salas sin geometría (x === null) existen en la BD pero aún no se
  // dibujan; se omiten.
  const dibujables = piso.salas.filter((s) => s.x !== null && s.y !== null
    && s.ancho !== null && s.alto !== null);
 
  dibujables.forEach((sala) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `room room-${sala.tipo}`); // el CSS colorea por tipo
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', sala.nombre);
 
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', sala.x);
    rect.setAttribute('y', sala.y);
    rect.setAttribute('width', sala.ancho);
    rect.setAttribute('height', sala.alto);
 
    // Etiqueta centrada en el rectángulo.
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
 
// Muestra el detalle de la sala clickeada. Se usa textContent (no innerHTML)
// para que nombres de la BD nunca se interpreten como HTML.
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
}
// -----------------------------------------------------------------------------
 
 

document.addEventListener('DOMContentLoaded', () => {
  // Manejo de accesibilidad por teclado para los edificios
  const edificios = document.querySelectorAll('.interactive-building');
  edificios.forEach(edificio => {
    edificio.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Elementos interactivos reservados para futura navegación
      }
    });
  });

  // Control interactivo del selector de piso
  const floorBtn = document.getElementById('floorSelectorBtn');
  const floorMenu = document.getElementById('floorDropdownMenu');
  const floorLabel = document.getElementById('currentFloorLabel');
  const floorOptions = document.querySelectorAll('.floor-option');

  if (floorBtn && floorMenu) {
    // Alternar visibilidad del menú desplegable
    floorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = floorBtn.getAttribute('aria-expanded') === 'true';
      toggleFloorMenu(!isExpanded);
    });

    const toggleFloorMenu = (open) => {
      floorBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        floorMenu.removeAttribute('hidden');
        // Enfocar la opción actualmente activa
        const activeOption = floorMenu.querySelector('.floor-option.active');
        if (activeOption) {
          activeOption.focus();
        }
      } else {
        floorMenu.setAttribute('hidden', '');
      }
    };

    const selectFloor = (option) => {
      const floorValue = option.getAttribute('data-floor');
      const floorText = option.querySelector('span')?.textContent.trim() || option.textContent.trim();

      // Actualizar etiqueta del botón
      if (floorLabel) {
        floorLabel.textContent = floorText;
      }
      floorBtn.setAttribute('aria-label', `Selector de piso. ${floorText} seleccionado`);

      // Actualizar clases activas y atributos ARIA
      floorOptions.forEach(opt => {
        opt.classList.remove('active');
        opt.removeAttribute('aria-selected');
        // Remover cualquier check icon previo
        const existingCheck = opt.querySelector('.floor-check-icon');
        if (existingCheck) existingCheck.remove();
      });

      option.classList.add('active');
      option.setAttribute('aria-selected', 'true');

      // Agregar icono checkmark a la opción seleccionada
      const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
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
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      checkSvg.appendChild(polyline);
      option.appendChild(checkSvg);

      // Guardar estado
      AppState.currentFloor = parseInt(floorValue, 10) || floorValue;

      // Cerrar menú y devolver foco al botón
      toggleFloorMenu(false);
      floorBtn.focus();
    };

    // Selección de opciones de piso
    floorOptions.forEach(option => {
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
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!floorBtn.contains(e.target) && !floorMenu.contains(e.target)) {
        toggleFloorMenu(false);
      }
    });

    // Cerrar con Escape desde cualquier parte si está abierto
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !floorMenu.hasAttribute('hidden')) {
        toggleFloorMenu(false);
        floorBtn.focus();
      }
    });
  }
});
