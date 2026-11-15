/**
 * ==============================================================================
 * CONTROLADOR DE INTERFAZ Y RENDERIZADO SVG DEL MAPA (U-MAPAS)
 * ==============================================================================
 */

const AppState = {
  currentView: 'general',
  currentBuilding: null,
  currentFloor: null,
  origenRuta: null, // { id, nombre, edificio, piso, x, y } de la sala de partida
  ruta: null,       // última ruta calculada: { desde, hasta, distancia, tramos }
  irAMapa: null,    // (edificio, piso) => abre ese mapa; se asigna al cargar la página
  selectedRoomName: null,
  highlightedReportId: null,
  reportPanelView: 'closed', // 'closed' | 'list' | 'form'
  reportsExpanded: false,
  salaObjetivo: null, // Para guardar la sala a la que queremos ir por URL
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_REPORTES_VISIBLES = 2;
const MAX_SLOTS_ICONOS = 4;
let renderToken = 0;

const TODOS_LOS_ESPACIOS = ['sala', 'lab', 'oficina', 'bano', 'escalera', 'conexion', 'otro'];

const CATEGORIAS_REPORTE = [
  {
    codigo: 'bano_fuera_servicio',
    titulo: 'Baño fuera de servicio',
    corto: 'Clausurado',
    severidad: 'critica',
    aplicaEn: ['bano'],
  },
  {
    codigo: 'falta_papel',
    titulo: 'Falta papel',
    corto: 'Falta papel',
    severidad: 'media',
    aplicaEn: ['bano'],
  },
  {
    codigo: 'falta_jabon',
    titulo: 'Falta jabón',
    corto: 'Falta jabón',
    severidad: 'media',
    aplicaEn: ['bano'],
  },
  {
    codigo: 'espacio_cerrado',
    titulo: 'Espacio cerrado',
    corto: 'Espacio cerrado',
    severidad: 'critica',
    aplicaEn: ['sala', 'lab', 'oficina', 'otro'],
  },
  {
    codigo: 'proyector',
    titulo: 'Falla proyector',
    corto: 'Proyector',
    severidad: 'media',
    aplicaEn: ['sala', 'lab', 'otro'],
  },
  {
    codigo: 'microfono',
    titulo: 'Falla micrófono',
    corto: 'Micrófono',
    severidad: 'media',
    aplicaEn: ['sala', 'otro'],
  },
  {
    codigo: 'computadores',
    titulo: 'Falla computador',
    corto: 'Computador',
    severidad: 'media',
    aplicaEn: ['lab', 'sala', 'otro'],
  },
  {
    codigo: 'luz',
    titulo: 'Sin luz',
    corto: 'Sin luz',
    severidad: 'media',
    aplicaEn: TODOS_LOS_ESPACIOS,
  },
  {
    codigo: 'aire_acondicionado',
    titulo: 'Falla aire acondicionado',
    corto: 'Aire acond.',
    severidad: 'media',
    aplicaEn: ['sala', 'lab', 'oficina', 'otro'],
  },
  {
    codigo: 'gotera',
    titulo: 'Goteras',
    corto: 'Goteras',
    severidad: 'media',
    aplicaEn: TODOS_LOS_ESPACIOS,
  },
  {
    codigo: 'aseo',
    titulo: 'Problema de limpieza',
    corto: 'Limpieza',
    severidad: 'media',
    aplicaEn: TODOS_LOS_ESPACIOS,
  },
  {
    codigo: 'en_mantenimiento',
    titulo: 'En mantenimiento',
    corto: 'Mantenimiento',
    severidad: 'media',
    aplicaEn: TODOS_LOS_ESPACIOS,
  },
  {
    codigo: 'otro',
    titulo: 'Otro inconveniente',
    corto: 'Otro',
    severidad: 'media',
    aplicaEn: TODOS_LOS_ESPACIOS,
  },
];

const ETIQUETA_TIPO_SALA = {
  sala: 'Sala de clases',
  lab: 'Laboratorio',
  oficina: 'Oficina',
  bano: 'Baño',
  escalera: 'Escalera',
  conexion: 'Conexión',
  otro: 'Espacio común',
};

/* Trazados SVG (viewBox 0 0 24 24) para categorías e íconos de interfaz */
const ICONOS_SVG = {
  bano_fuera_servicio: {
    mode: 'stroke',
    paths: [
      { tag: 'circle', cx: '12', cy: '12', r: '9' },
      { tag: 'line', x1: '5.8', y1: '5.8', x2: '18.2', y2: '18.2' },
    ],
  },
  falta_papel: {
    mode: 'stroke',
    paths: [
      { tag: 'path', d: 'M16 4H8a4 4 0 0 0-4 4v5a4 4 0 0 0 4 4h2' },
      { tag: 'ellipse', cx: '16', cy: '8.5', rx: '3', ry: '4.5' },
      { tag: 'path', d: 'M13 13v7l2.5-1.5L18 20l2-1.5V8.5' },
      { tag: 'circle', cx: '16', cy: '8.5', r: '0.9' },
    ],
  },
  falta_jabon: {
    mode: 'stroke',
    paths: [
      { tag: 'path', d: 'M10 3h5l2 2' },
      { tag: 'line', x1: '12', y1: '3', x2: '12', y2: '8' },
      { tag: 'rect', x: '7', y: '8', width: '10', height: '13', rx: '2' },
    ],
  },
  aseo: {
    mode: 'stroke',
    paths: [
      { tag: 'path', d: 'M19 4l-6.5 6.5' },
      { tag: 'path', d: 'M9 10l5 5-4.5 5.5a2 2 0 0 1-2.8 0L4 17.8a2 2 0 0 1 0-2.8L9 10z' },
      { tag: 'line', x1: '7', y1: '16', x2: '5', y2: '18' },
    ],
  },
  espacio_cerrado: {
    mode: 'stroke',
    paths: [
      { tag: 'rect', x: '4', y: '11', width: '16', height: '9', rx: '2' },
      { tag: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
    ],
  },
  proyector: {
    mode: 'stroke',
    paths: [
      { tag: 'rect', x: '2', y: '8', width: '15', height: '9', rx: '2' },
      { tag: 'circle', cx: '13', cy: '12.5', r: '2.2' },
      { tag: 'path', d: 'M17 11l5-2.5v8L17 14' },
    ],
  },
  microfono: {
    mode: 'stroke',
    paths: [
      { tag: 'rect', x: '9', y: '3', width: '6', height: '10', rx: '3' },
      { tag: 'path', d: 'M5 11a7 7 0 0 0 14 0' },
      { tag: 'line', x1: '12', y1: '18', x2: '12', y2: '21' },
      { tag: 'line', x1: '8', y1: '21', x2: '16', y2: '21' },
    ],
  },
  computadores: {
    mode: 'stroke',
    paths: [
      { tag: 'rect', x: '3', y: '4', width: '18', height: '12', rx: '2' },
      { tag: 'line', x1: '8', y1: '20', x2: '16', y2: '20' },
      { tag: 'line', x1: '12', y1: '16', x2: '12', y2: '20' },
    ],
  },
  luz: {
    mode: 'stroke',
    paths: [
      { tag: 'path', d: 'M9 18h6' },
      { tag: 'path', d: 'M10 21h4' },
      {
        tag: 'path',
        d: 'M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14',
      },
    ],
  },
  aire_acondicionado: {
    mode: 'stroke',
    paths: [
      { tag: 'line', x1: '12', y1: '2', x2: '12', y2: '22' },
      { tag: 'line', x1: '2', y1: '12', x2: '22', y2: '12' },
      { tag: 'path', d: 'M19 9l-3 3 3 3' },
      { tag: 'path', d: 'M5 9l3 3-3 3' },
      { tag: 'path', d: 'M9 5l3 3 3-3' },
      { tag: 'path', d: 'M9 19l3-3 3 3' },
    ],
  },
  gotera: {
    mode: 'stroke',
    paths: [
      { tag: 'path', d: 'M12 2.7l5.3 5.7a7.5 7.5 0 1 1-10.6 0z' },
    ],
  },
  en_mantenimiento: {
    mode: 'stroke',
    paths: [
      {
        tag: 'path',
        d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
      },
    ],
  },
  otro: {
    mode: 'stroke',
    paths: [
      {
        tag: 'path',
        d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      },
      { tag: 'line', x1: '12', y1: '9', x2: '12', y2: '13' },
      { tag: 'line', x1: '12', y1: '17', x2: '12.01', y2: '17' },
    ],
  },
  thumb: {
    mode: 'fill',
    paths: [
      {
        tag: 'path',
        d: 'M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11zm2-11l3.7-7.4A1.5 1.5 0 0 1 15.5 4.2L14.5 9h5.3a2 2 0 0 1 2 2.3l-1.3 8a2 2 0 0 1-2 1.7H9V11z',
      },
    ],
  },
  check: {
    mode: 'stroke',
    paths: [
      { tag: 'polyline', points: '20 6 9 17 4 12' },
    ],
  },
  close: {
    mode: 'stroke',
    paths: [
      { tag: 'line', x1: '6', y1: '6', x2: '18', y2: '18' },
      { tag: 'line', x1: '18', y1: '6', x2: '6', y2: '18' },
    ],
  },
  plus: {
    mode: 'stroke',
    paths: [
      { tag: 'line', x1: '12', y1: '5', x2: '12', y2: '19' },
      { tag: 'line', x1: '5', y1: '12', x2: '19', y2: '12' },
    ],
  },
  chevronDown: {
    mode: 'stroke',
    paths: [
      { tag: 'polyline', points: '6 9 12 15 18 9' },
    ],
  },
  origin: {
    mode: 'stroke',
    paths: [
      { tag: 'circle', cx: '12', cy: '10', r: '3' },
      { tag: 'path', d: 'M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z' },
    ],
  },
  navigate: {
    mode: 'stroke',
    paths: [
      { tag: 'polygon', points: '3 11 22 2 13 21 11 13 3 11' },
    ],
  },
};

function crearSvgIcon(clave, size, className = '') {
  const def = ICONOS_SVG[clave] || ICONOS_SVG.otro;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);

  if (def.mode === 'fill') {
    svg.setAttribute('fill', 'currentColor');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }

  def.paths.forEach(({ tag, ...attrs }) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    svg.appendChild(node);
  });

  return svg;
}

function getCategoria(codigo) {
  return CATEGORIAS_REPORTE.find((c) => c.codigo === codigo) || CATEGORIAS_REPORTE[CATEGORIAS_REPORTE.length - 1];
}

function isAuthenticated() {
  return document.getElementById('vista-piso')?.dataset.authenticated === 'true';
}

function getLoginUrl() {
  return document.getElementById('vista-piso')?.dataset.loginUrl || '/login';
}

function formatearHaceCuanto(minutos) {
  const m = Number(minutos) || 0;
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
}

function marcarSalaSeleccionada() {
  document.querySelectorAll('#floorSvg .room').forEach((g) => {
    g.classList.toggle('room-selected', g.dataset.nombre === AppState.selectedRoomName);
  });
}

function cerrarPanelSala() {
  AppState.selectedRoomName = null;
  AppState.highlightedReportId = null;
  AppState.reportPanelView = 'closed';
  AppState.reportsExpanded = false;
  document.getElementById('roomPanel')?.replaceChildren();
  marcarSalaSeleccionada();
}

function hayRutaActiva() {
  return Boolean(AppState.ruta);
}

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

/**
 * Ordena los reportes por prioridad de visualización: resaltado activo,
 * severidad crítica, más confirmaciones y más reciente.
 */
function ordenarReportesPorPrioridad(reportes, highlightReportId = null) {
  return [...reportes].sort((a, b) => {
    if (highlightReportId) {
      if (a.id === highlightReportId) return -1;
      if (b.id === highlightReportId) return 1;
    }
    const sevA = getCategoria(a.tipo).severidad === 'critica' ? 0 : 1;
    const sevB = getCategoria(b.tipo).severidad === 'critica' ? 0 : 1;
    if (sevA !== sevB) return sevA - sevB;

    const confDiff = (b.confirmaciones || 0) - (a.confirmaciones || 0);
    if (confDiff !== 0) return confDiff;

    const fechaDiff = (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0);
    if (fechaDiff !== 0) return fechaDiff;

    return (b.id || 0) - (a.id || 0);
  });
}

/** Dibuja el pin circular SVG estilo Waze sobre la esquina de la sala reportada. */
function crearPinAlerta(sala, reportes) {
  const pinPrincipal = ordenarReportesPorPrioridad(reportes)[0];
  const cat = getCategoria(pinPrincipal.tipo);

  const pin = document.createElementNS(SVG_NS, 'g');
  pin.setAttribute('class', `report-pin sev-${cat.severidad}`);
  pin.setAttribute('role', 'button');
  pin.setAttribute('tabindex', '0');
  pin.setAttribute('aria-label', `${sala.nombre}: ${cat.titulo}`);

  const cx = sala.x + sala.ancho - 6;
  const cy = sala.y + 6;
  const radio = 14;

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('class', 'pin-bg');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', String(radio));

  const iconSize = 16;
  const iconSvg = crearSvgIcon(cat.codigo, iconSize, 'pin-icon');
  iconSvg.setAttribute('x', String(cx - iconSize / 2));
  iconSvg.setAttribute('y', String(cy - iconSize / 2));
  iconSvg.style.pointerEvents = 'none';

  pin.append(circle, iconSvg);

  if (reportes.length > 1) {
    const countCircle = document.createElementNS(SVG_NS, 'circle');
    countCircle.setAttribute('class', 'pin-count');
    countCircle.setAttribute('cx', String(cx + 11));
    countCircle.setAttribute('cy', String(cy + 10));
    countCircle.setAttribute('r', '7');

    const countText = document.createElementNS(SVG_NS, 'text');
    countText.setAttribute('class', 'pin-count-text');
    countText.setAttribute('x', String(cx + 11));
    countText.setAttribute('y', String(cy + 10));
    countText.setAttribute('text-anchor', 'middle');
    countText.setAttribute('dominant-baseline', 'central');
    countText.setAttribute('font-size', '9');
    countText.setAttribute('font-weight', '800');
    countText.textContent = String(reportes.length);

    pin.append(countCircle, countText);
  }

  const abrirPin = (e) => {
    e.stopPropagation();
    showRoom(sala, { highlightReportId: pinPrincipal.id });
  };

  pin.addEventListener('click', abrirPin);
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirPin(e);
    }
  });

  return pin;
}

async function renderFloor(edificio, numero, options = {}) {
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

  if (!options.preservePanel) {
    cerrarPanelSala();
  }

  const dibujables = piso.salas.filter(
    (s) => s.x !== null && s.y !== null && s.ancho !== null && s.alto !== null
  );

  const pines = [];
  dibujables.forEach((sala) => {
    const reportes = sala.reportes_activos || [];

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `room room-${sala.tipo}`);
    g.dataset.nombre = sala.nombre;
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute(
      'aria-label',
      reportes.length ? `${sala.nombre}, ${reportes.length} alerta activa` : sala.nombre
    );

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
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      showRoom(sala);
    });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showRoom(sala);
      }
    });
    svg.appendChild(g);
    // Debe ir DESPUÉS de appendChild: para medir el texto, el elemento tiene que estar en el DOM.
    ajustarTexto(label, sala.nombre, sala.ancho - 8);
    if (reportes.length) pines.push(crearPinAlerta(sala, reportes));
  });

  // Los pines se agregan al final para quedar por encima de las salas vecinas
  pines.forEach((pin) => svg.appendChild(pin));

  if (dibujables.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'Este piso aún no tiene plano dibujado.';
    document.getElementById('roomPanel').appendChild(msg);
    return;
  }

  if (options.preservePanel && AppState.selectedRoomName) {
    const salaActualizada = piso.salas.find((s) => s.nombre === AppState.selectedRoomName);
    if (salaActualizada) {
      showRoom(salaActualizada, {
        highlightReportId: options.highlightReportId,
        openReportsView: options.openReportsView,
      });
    }
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
    document.querySelectorAll('#roomPanel .route-actions button[aria-pressed="true"]').forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
    });
    const statusEl = document.querySelector('#roomPanel .route-status');
    if (statusEl) statusEl.textContent = '';
    const clearBtn = document.querySelector('#roomPanel .route-block .link-btn');
    if (clearBtn) clearBtn.hidden = true;
  });
  bar.appendChild(quitar);
}

async function pedirRuta(sala, estado, btnBorrar) {
  if (!AppState.origenRuta) {
    estado.textContent = 'Elige primero un origen con "Desde aquí".';
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
    if (btnBorrar) {
      btnBorrar.textContent = 'Borrar ruta';
      btnBorrar.hidden = false;
    }
    estado.textContent = `Ruta de ${data.desde} a ${data.hasta} (${data.distancia} u).`;
  } catch (err) {
    console.error('No se pudo pedir la ruta:', err);
    estado.textContent = 'Error al pedir la ruta.';
  }
}

function agregarSeccionRuta(sala, panel) {
  const block = document.createElement('div');
  block.className = 'route-block';

  const acciones = document.createElement('div');
  acciones.className = 'route-actions';

  const estado = document.createElement('p');
  estado.className = 'route-status';
  estado.setAttribute('role', 'status');
  if (AppState.origenRuta) {
    estado.textContent = `Origen: ${AppState.origenRuta.nombre}`;
  }

  const btnDesde = document.createElement('button');
  btnDesde.type = 'button';
  btnDesde.setAttribute('aria-pressed', AppState.origenRuta?.id === sala.id ? 'true' : 'false');
  const lblDesde = document.createElement('span');
  lblDesde.textContent = 'Desde aquí';
  btnDesde.append(crearSvgIcon('origin', 14), lblDesde);

  const btnBorrar = document.createElement('button');
  btnBorrar.type = 'button';
  btnBorrar.className = 'link-btn';
  btnBorrar.textContent = hayRutaActiva() ? 'Borrar ruta' : 'Limpiar origen';
  btnBorrar.hidden = !hayRutaActiva() && !AppState.origenRuta;
  btnBorrar.addEventListener('click', () => {
    AppState.origenRuta = null;
    limpiarRuta();
    btnDesde.setAttribute('aria-pressed', 'false');
    estado.textContent = '';
    btnBorrar.hidden = true;
  });

  btnDesde.addEventListener('click', () => {
    AppState.origenRuta = {
      id: sala.id,
      nombre: sala.nombre,
      edificio: AppState.currentBuilding,
      piso: AppState.currentFloor,
      x: sala.nodo?.x ?? sala.x + sala.ancho / 2,
      y: sala.nodo?.y ?? sala.y + sala.alto / 2,
    };
    limpiarRuta();
    dibujarRutaActual(AppState.origenRuta.edificio, AppState.origenRuta.piso);
    renderRouteBar();
    btnDesde.setAttribute('aria-pressed', 'true');
    estado.textContent = `Origen: ${sala.nombre}`;
    btnBorrar.textContent = 'Limpiar origen';
    btnBorrar.hidden = false;
  });

  const btnHasta = document.createElement('button');
  btnHasta.type = 'button';
  const lblHasta = document.createElement('span');
  lblHasta.textContent = 'Hasta aquí';
  btnHasta.append(crearSvgIcon('navigate', 14), lblHasta);
  btnHasta.addEventListener('click', () => pedirRuta(sala, estado, btnBorrar));

  acciones.append(btnDesde, btnHasta);
  block.append(acciones, estado, btnBorrar);
  panel.appendChild(block);
}

/**
 * Crea una tarjeta oscura autoexplicativa estilo Waze con el ícono SVG circular
 * y el botón pill azul de confirmación [👍 N].
 */
function crearTarjetaReporte(reporte, highlighted) {
  const cat = getCategoria(reporte.tipo);

  const li = document.createElement('li');
  li.className = 'report-card';
  li.dataset.reportId = String(reporte.id);
  if (highlighted) li.classList.add('is-highlighted');

  const titulo = document.createElement('p');
  titulo.className = 'report-card-title';
  titulo.textContent = cat.titulo;

  const meta = document.createElement('span');
  meta.className = 'report-card-meta';
  meta.textContent = formatearHaceCuanto(reporte.hace_min);

  const iconWrap = document.createElement('div');
  iconWrap.className = `report-card-icon sev-${cat.severidad}`;
  iconWrap.appendChild(crearSvgIcon(cat.codigo, 22));

  li.append(titulo, meta, iconWrap);

  if (reporte.descripcion && reporte.descripcion.trim()) {
    const desc = document.createElement('p');
    desc.className = 'report-card-desc';
    desc.textContent = reporte.descripcion;
    li.appendChild(desc);
  }

  const footer = document.createElement('div');
  footer.className = 'report-card-footer';

  const countSpan = document.createElement('span');
  countSpan.textContent = String(reporte.confirmaciones);

  if (isAuthenticated()) {
    if (reporte.es_autor) {
      footer.classList.add('is-author');

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'close-report-pill';
      closeBtn.textContent = 'Cerrar reporte';

      closeBtn.addEventListener('click', async () => {
        closeBtn.disabled = true;
        const { ok, data } = await MapAPI.cerrarReporte(reporte.id);
        if (!ok) {
          closeBtn.disabled = false;
          if (data?.error) meta.textContent = data.error;
          return;
        }
        await renderFloor(AppState.currentBuilding, AppState.currentFloor, {
          preservePanel: true,
        });
      });

      const badge = document.createElement('span');
      badge.className = 'thumb-pill is-readonly';
      badge.setAttribute('aria-label', `Confirmaciones: ${reporte.confirmaciones}`);
      badge.append(crearSvgIcon('thumb', 15), countSpan);

      footer.append(closeBtn, badge);
    } else {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'thumb-pill';
      pill.setAttribute('aria-pressed', reporte.ya_confirmado ? 'true' : 'false');
      pill.setAttribute(
        'aria-label',
        reporte.ya_confirmado
          ? `Confirmado (${reporte.confirmaciones})`
          : `Confirmar que sigue ocurriendo (${reporte.confirmaciones})`
      );
      pill.append(crearSvgIcon('thumb', 15), countSpan);

      pill.addEventListener('click', async () => {
        if (reporte.ya_confirmado) return;
        pill.setAttribute('aria-pressed', 'true');
        const { ok, data } = await MapAPI.confirmarReporte(reporte.id);
        if (!ok) {
          pill.setAttribute('aria-pressed', 'false');
          if (data?.error) meta.textContent = data.error;
          return;
        }
        await renderFloor(AppState.currentBuilding, AppState.currentFloor, {
          preservePanel: true,
          highlightReportId: reporte.id,
        });
      });

      footer.appendChild(pill);
    }
  } else {
    const linkPill = document.createElement('a');
    linkPill.href = getLoginUrl();
    linkPill.className = 'thumb-pill';
    linkPill.setAttribute('aria-label', `Inicia sesión para confirmar (${reporte.confirmaciones})`);
    linkPill.append(crearSvgIcon('thumb', 15), countSpan);
    footer.appendChild(linkPill);
  }

  li.appendChild(footer);
  return li;
}

function crearFormularioReporte(sala, onDuplicateReport = null) {
  const form = document.createElement('form');
  form.className = 'report-form';
  form.hidden = true;
  form.noValidate = true;

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'category-grid';

  const legend = document.createElement('legend');
  legend.className = 'visually-hidden';
  legend.textContent = 'Tipo de problema';
  fieldset.appendChild(legend);

  const categorias = CATEGORIAS_REPORTE.filter((c) => c.aplicaEn.includes(sala.tipo));
  const listaCats = categorias.length ? categorias : CATEGORIAS_REPORTE;

  listaCats.forEach((cat, idx) => {
    const tile = document.createElement('label');
    tile.className = 'category-tile';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'tipo';
    radio.value = cat.codigo;
    radio.className = 'visually-hidden';
    if (idx === 0) radio.checked = true;

    const iconCircle = document.createElement('span');
    iconCircle.className = `category-tile-icon sev-${cat.severidad}`;
    iconCircle.appendChild(crearSvgIcon(cat.codigo, 18));

    const labelText = document.createElement('span');
    labelText.textContent = cat.corto;

    tile.append(radio, iconCircle, labelText);
    fieldset.appendChild(tile);
  });

  const idDesc = `reporte-desc-${sala.id}`;
  const labelDesc = document.createElement('label');
  labelDesc.className = 'report-form-label';
  labelDesc.htmlFor = idDesc;

  const textarea = document.createElement('textarea');
  textarea.id = idDesc;
  textarea.name = 'descripcion';
  textarea.rows = 2;
  textarea.maxLength = 500;

  const estado = document.createElement('div');
  estado.className = 'report-form-status';
  estado.setAttribute('role', 'alert');
  estado.hidden = true;

  const estadoTexto = document.createElement('span');
  const btnVerDuplicado = document.createElement('button');
  btnVerDuplicado.type = 'button';
  btnVerDuplicado.className = 'report-status-link';
  btnVerDuplicado.textContent = 'Ver reporte';
  btnVerDuplicado.hidden = true;
  let duplicateTargetId = null;

  btnVerDuplicado.addEventListener('click', () => {
    if (duplicateTargetId) onDuplicateReport?.(duplicateTargetId);
  });

  estado.append(estadoTexto, btnVerDuplicado);

  const limpiarEstado = () => {
    estado.hidden = true;
    estadoTexto.textContent = '';
    btnVerDuplicado.hidden = true;
    duplicateTargetId = null;
  };

  const getSelectedTipo = () =>
    form.querySelector('input[name="tipo"]:checked')?.value || listaCats[0].codigo;

  const actualizarObligatoriedad = () => {
    const esOtro = getSelectedTipo() === 'otro';
    textarea.required = esOtro;
    labelDesc.textContent = esOtro ? 'Detalle (obligatorio)' : 'Detalle (opcional)';
    textarea.placeholder = esOtro ? 'Describe el problema...' : 'Agregar nota...';
    if (!esOtro) textarea.removeAttribute('aria-invalid');
  };

  fieldset.addEventListener('change', () => {
    actualizarObligatoriedad();
    limpiarEstado();
  });
  textarea.addEventListener('input', () => {
    textarea.removeAttribute('aria-invalid');
    if (!textarea.required || textarea.value.trim()) {
      limpiarEstado();
    }
  });
  actualizarObligatoriedad();

  const acciones = document.createElement('div');
  acciones.className = 'report-form-actions';

  const btnCancelar = document.createElement('button');
  btnCancelar.type = 'button';
  btnCancelar.className = 'btn-ghost-sm';
  btnCancelar.textContent = 'Cancelar';

  const btnEnviar = document.createElement('button');
  btnEnviar.type = 'submit';
  btnEnviar.className = 'btn-primary-sm';
  btnEnviar.textContent = 'Reportar';

  acciones.append(btnCancelar, btnEnviar);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarEstado();

    const tipoSeleccionado = getSelectedTipo();
    if (tipoSeleccionado === 'otro' && !textarea.value.trim()) {
      estado.hidden = false;
      estadoTexto.textContent = 'Describe el problema al elegir «Otro».';
      textarea.setAttribute('aria-invalid', 'true');
      textarea.focus();
      return;
    }

    btnEnviar.disabled = true;
    const { ok, status, data } = await MapAPI.crearReporte({
      sala_id: sala.id,
      tipo: tipoSeleccionado,
      descripcion: textarea.value.trim(),
    });
    btnEnviar.disabled = false;

    if (!ok) {
      estado.hidden = false;
      estadoTexto.textContent = data.error || 'No se pudo enviar el reporte.';
      if (status === 409 && data.reporte_existente && onDuplicateReport) {
        duplicateTargetId = data.reporte_existente.id;
        btnVerDuplicado.hidden = false;
      }
      return;
    }

    await renderFloor(AppState.currentBuilding, AppState.currentFloor, {
      preservePanel: true,
      highlightReportId: data.reporte?.id,
      openReportsView: 'list',
    });
  });

  form.append(fieldset, labelDesc, textarea, estado, acciones);
  return { form, btnCancelar, firstRadio: fieldset.querySelector('input[type="radio"]') };
}

/**
 * Construye la fila compacta de íconos de reportes activos con un tope visible
 * y badge de excedente ("+2", "+3", ...) cuando corresponde.
 */
function crearBarraIconosReportes(ordenados) {
  const iconsWrap = document.createElement('span');
  iconsWrap.className = 'report-summary-icons';
  iconsWrap.setAttribute('aria-hidden', 'true');

  const visibles =
    ordenados.length > MAX_SLOTS_ICONOS
      ? ordenados.slice(0, MAX_SLOTS_ICONOS - 1)
      : ordenados;
  const ocultos = ordenados.length - visibles.length;

  visibles.forEach((rep) => {
    const cat = getCategoria(rep.tipo);
    const mini = document.createElement('span');
    mini.className = `report-mini-icon sev-${cat.severidad}`;
    mini.appendChild(crearSvgIcon(cat.codigo, 11));
    iconsWrap.appendChild(mini);
  });

  if (ocultos > 0) {
    const extra = document.createElement('span');
    extra.className = 'report-mini-overflow';
    extra.textContent = `+${ocultos}`;
    iconsWrap.appendChild(extra);
  }

  return iconsWrap;
}

function crearBotonResumenReportes(ordenados, slotId) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'report-summary-btn';

  const label = document.createElement('span');
  label.className = 'report-summary-label';
  label.textContent = 'Reportes';
  btn.appendChild(label);

  if (ordenados.length > 0) {
    btn.setAttribute('aria-controls', slotId);
    btn.setAttribute(
      'aria-label',
      `Reportes: ${ordenados.length} ${ordenados.length === 1 ? 'alerta activa' : 'alertas activas'}`
    );
    btn.append(
      crearBarraIconosReportes(ordenados),
      crearSvgIcon('chevronDown', 14, 'report-summary-chevron')
    );
  } else {
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Reportes: sin alertas activas');
    const emptyTag = document.createElement('span');
    emptyTag.className = 'report-summary-empty';
    emptyTag.textContent = 'Sin alertas';
    btn.appendChild(emptyTag);
  }

  return btn;
}

function crearControlListaReportes(ordenados, highlightReportId, onShowReportList) {
  const excedente = ordenados.length - MAX_REPORTES_VISIBLES;
  const wrap = document.createElement('div');
  wrap.className = 'report-list-wrap';
  wrap.hidden = true;

  const lista = document.createElement('ul');
  lista.id = 'roomReportCards';
  lista.className = 'report-cards';
  lista.setAttribute('role', 'list');

  let btnToggle = null;
  if (excedente > 0) {
    btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.className = 'report-more-btn';
    btnToggle.setAttribute('aria-controls', lista.id);
  }

  const sincronizarLista = (activeHighlightId = highlightReportId) => {
    const expandir = excedente > 0 && AppState.reportsExpanded;
    const visibles = expandir ? ordenados : ordenados.slice(0, MAX_REPORTES_VISIBLES);

    lista.classList.toggle('is-expanded', expandir);
    lista.replaceChildren(
      ...visibles.map((rep) => crearTarjetaReporte(rep, rep.id === activeHighlightId))
    );

    if (btnToggle) {
      btnToggle.setAttribute('aria-expanded', expandir ? 'true' : 'false');
      btnToggle.textContent = expandir
        ? 'Mostrar menos'
        : `Ver ${excedente} ${excedente === 1 ? 'reporte más' : 'reportes más'}`;
    }
  };

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      AppState.reportsExpanded = !AppState.reportsExpanded;
      sincronizarLista();
    });
  }

  const enfocarReporte = (reporteId) => {
    onShowReportList();
    let card = lista.querySelector(`.report-card[data-report-id="${reporteId}"]`);
    if (!card && excedente > 0 && !AppState.reportsExpanded) {
      AppState.reportsExpanded = true;
      sincronizarLista(reporteId);
      card = lista.querySelector(`.report-card[data-report-id="${reporteId}"]`);
    } else if (card) {
      card.classList.remove('is-highlighted');
      requestAnimationFrame(() => card.classList.add('is-highlighted'));
    }
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  sincronizarLista();
  wrap.appendChild(lista);
  if (btnToggle) wrap.appendChild(btnToggle);
  return { wrap, enfocarReporte };
}

function agregarSeccionReportes(sala, panel, options = {}) {
  const ordenados = ordenarReportesPorPrioridad(
    sala.reportes_activos || [],
    options.highlightReportId
  );

  const bar = document.createElement('div');
  bar.className = 'report-bar';

  const slot = document.createElement('div');
  slot.id = 'roomReportSlot';
  slot.className = 'report-slot';

  const btnResumen = crearBotonResumenReportes(ordenados, slot.id);
  let listCtrl = null;
  let form = null;
  let btnAgregar = null;

  const sincronizarSeccion = () => {
    if (AppState.reportPanelView === 'list' && !listCtrl) AppState.reportPanelView = 'closed';
    if (AppState.reportPanelView === 'form' && !form) AppState.reportPanelView = 'closed';

    const vista = AppState.reportPanelView;
    slot.hidden = vista === 'closed';
    if (listCtrl) listCtrl.wrap.hidden = vista !== 'list';
    if (form) form.hidden = vista !== 'form';
    if (ordenados.length > 0) btnResumen.setAttribute('aria-expanded', vista === 'list' ? 'true' : 'false');
    if (btnAgregar?.tagName === 'BUTTON') {
      btnAgregar.setAttribute('aria-expanded', vista === 'form' ? 'true' : 'false');
    }
  };

  if (ordenados.length > 0) {
    listCtrl = crearControlListaReportes(ordenados, options.highlightReportId, () => {
      AppState.reportPanelView = 'list';
      sincronizarSeccion();
    });
    slot.appendChild(listCtrl.wrap);
    btnResumen.addEventListener('click', () => {
      AppState.reportPanelView = AppState.reportPanelView === 'list' ? 'closed' : 'list';
      sincronizarSeccion();
    });
  }

  if (isAuthenticated()) {
    const formCtrl = crearFormularioReporte(sala, listCtrl?.enfocarReporte || null);
    form = formCtrl.form;
    slot.appendChild(form);

    btnAgregar = document.createElement('button');
    btnAgregar.type = 'button';
    btnAgregar.className = 'report-add-btn';
    btnAgregar.setAttribute('aria-controls', slot.id);
    btnAgregar.addEventListener('click', () => {
      AppState.reportPanelView = AppState.reportPanelView === 'form' ? 'closed' : 'form';
      sincronizarSeccion();
      if (AppState.reportPanelView === 'form') formCtrl.firstRadio?.focus();
    });
    formCtrl.btnCancelar.addEventListener('click', () => {
      AppState.reportPanelView = 'closed';
      sincronizarSeccion();
      btnAgregar.focus();
    });
  } else {
    btnAgregar = document.createElement('a');
    btnAgregar.href = getLoginUrl();
    btnAgregar.className = 'report-add-btn';
  }

  btnAgregar.setAttribute('aria-label', 'Nuevo reporte');
  btnAgregar.setAttribute('title', 'Nuevo reporte');
  btnAgregar.appendChild(crearSvgIcon('plus', 17));

  sincronizarSeccion();
  bar.append(btnResumen, btnAgregar);
  panel.append(bar, slot);
}

/** Agrega el botón de favorito. El estado ya viene con la sala (`sala.favorito`). */
function agregarBotonFavorito(sala, panel) {
  if (!sala.id) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-favorito';

  const aplicarEstiloFavorito = (esFavorito) => {
    btn.textContent = esFavorito ? '★ Quitar de favoritos' : '☆ Agregar a favoritos';
    btn.style.backgroundColor = esFavorito ? '#FEF9C3' : '#F8FAFC';
    btn.style.borderColor = esFavorito ? '#CA8A04' : '#CBD5E1';
    btn.style.color = esFavorito ? '#92400E' : '#334155';
  };

  btn.style.cssText = 'padding: 0.5rem 0.9rem; font-family: inherit; font-size: 0.85rem; font-weight: 600; border: 1.5px solid #CBD5E1; border-radius: 8px; cursor: pointer; width: 100%;';
  aplicarEstiloFavorito(sala.favorito === true);
  panel.appendChild(btn);
  requestAnimationFrame(() => { btn.style.transition = 'all 0.15s ease-in-out'; });

  btn.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      window.location.href = getLoginUrl();
      return;
    }
    try {
      const { ok, status, data } = await MapAPI.toggleFavorito(sala.id);
      if (status === 401 || status === 403) {
        window.location.href = getLoginUrl();
        return;
      }
      if (ok) {
        sala.favorito = Boolean(data.favorito);
        aplicarEstiloFavorito(sala.favorito);
      }
    } catch (e) {
      console.error('Error al togglear favorito:', e);
    }
  });
}

function showRoom(sala, options = {}) {
  const mismaSala = AppState.selectedRoomName === sala.nombre;
  const reportes = sala.reportes_activos || [];
  AppState.selectedRoomName = sala.nombre;
  AppState.highlightedReportId = options.highlightReportId || null;
  if (!mismaSala) {
    AppState.reportPanelView = options.openReportsView || 'closed';
    AppState.reportsExpanded = false;
  } else {
    if (options.openReportsView) {
      AppState.reportPanelView = options.openReportsView;
    } else if (reportes.length === 0 && AppState.reportPanelView === 'list') {
      AppState.reportPanelView = 'closed';
    }
    if (reportes.length <= MAX_REPORTES_VISIBLES) {
      AppState.reportsExpanded = false;
    }
  }
  marcarSalaSeleccionada();

  const panel = document.getElementById('roomPanel');
  // Todo el contenido se arma fuera de pantalla y se cambia de una sola vez: sin parpadeo
  const contenido = document.createDocumentFragment();

  // 1. Encabezado: nombre y tipo de espacio
  const header = document.createElement('div');
  header.className = 'room-panel-header';

  const tituloWrap = document.createElement('div');
  const titulo = document.createElement('h3');
  titulo.textContent = sala.nombre;
  const tipo = document.createElement('span');
  tipo.className = 'room-type';
  tipo.textContent = ETIQUETA_TIPO_SALA[sala.tipo] || 'Espacio';
  tituloWrap.append(titulo, tipo);

  const btnCerrar = document.createElement('button');
  btnCerrar.type = 'button';
  btnCerrar.className = 'icon-btn';
  btnCerrar.setAttribute('aria-label', 'Cerrar panel');
  btnCerrar.appendChild(crearSvgIcon('close', 16));
  btnCerrar.addEventListener('click', () => cerrarPanelSala());

  header.append(tituloWrap, btnCerrar);
  contenido.appendChild(header);

  if (sala.profesores.length) {
    const lista = document.createElement('ul');
    lista.className = 'room-prof-list';
    sala.profesores.forEach((nombre) => {
      const li = document.createElement('li');
      li.textContent = nombre;
      lista.appendChild(li);
    });
    contenido.appendChild(lista);
  }

  // 2. Tarjetas estilo Waze (si hay alertas) + botón de reportar
  agregarSeccionReportes(sala, contenido, options);

  // 3. Favoritos y navegación
  agregarBotonFavorito(sala, contenido);
  agregarSeccionRuta(sala, contenido);
  panel.replaceChildren(contenido);
}

document.addEventListener('DOMContentLoaded', () => {
  const edificios = document.querySelectorAll('.interactive-building');
  const floorBtn = document.getElementById('floorSelectorBtn');
  const floorMenu = document.getElementById('floorDropdownMenu');
  const floorLabel = document.getElementById('currentFloorLabel');
  const vistaPiso = document.getElementById('vista-piso');
  const roomPanel = document.getElementById('roomPanel');

  // Evita que un click dentro del panel de sala lo cierre
  roomPanel?.addEventListener('click', (e) => e.stopPropagation());

  // Cierra el panel de sala al hacer click en cualquier zona vacía del piso (pasillos, fondo, etc.)
  vistaPiso?.addEventListener('click', (e) => {
    if (
      AppState.selectedRoomName &&
      !e.target.closest('.room') &&
      !e.target.closest('.report-pin') &&
      !e.target.closest('#roomPanel') &&
      !e.target.closest('.map-floating-controls') &&
      !e.target.closest('#backToGeneral')
    ) {
      cerrarPanelSala();
    }
  });

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
      cerrarPanelSala();
      document.getElementById('floorSvg').replaceChildren();
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

/** Buscador del navbar: busca profesores y abre su oficina en el mapa. */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.search-input');
  const boton = document.querySelector('.search-action-btn');
  const lista = document.getElementById('searchResults');
  if (!input || !lista) return;

  let timer = null;
  let token = 0;

  const cerrar = () => { lista.hidden = true; lista.replaceChildren(); };

  const irAOficina = (r) => {
    cerrar();
    input.value = r.profesor;
    if (AppState.irAMapa) {
      // Ya estamos en el mapa: reutiliza el mecanismo de favoritos
      AppState.salaObjetivo = r.sala;
      AppState.irAMapa(r.edificio, r.piso);
    } else {
      // Estamos en login/registro/favoritos: vuelve al mapa con los parámetros en la URL
      const p = new URLSearchParams({ edificio: r.edificio, piso: r.piso, sala: r.sala });
      window.location.href = `${input.dataset.urlIndex}?${p}`;
    }
  };

  const mostrar = (resultados, q) => {
    lista.replaceChildren();
    if (!resultados.length) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = `Sin resultados para «${q}»`;
      lista.appendChild(li);
    }
    resultados.forEach((r) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'search-result';
      const nombre = document.createElement('strong');
      nombre.textContent = r.profesor;
      const detalle = document.createElement('span');
      detalle.textContent = r.tipo === 'sala'
      ? `${r.edificio} · Piso ${r.piso}`
      : `${r.sala} · ${r.edificio} · Piso ${r.piso}`;
      b.append(nombre, detalle);
      b.addEventListener('click', () => irAOficina(r));
      li.appendChild(b);
      lista.appendChild(li);
    });
    lista.hidden = false;
  };

  const buscar = async () => {
    const q = input.value.trim();
    if (q.length < 2) { cerrar(); return null; }
    const mio = ++token;
    try {
      const res = await fetch(`${input.dataset.urlBuscar}?q=${encodeURIComponent(q)}`);
      if (!res.ok) return null;
      const { resultados } = await res.json();
      if (mio !== token) return null; // llegó una respuesta más nueva
      mostrar(resultados, q);
      return resultados;
    } catch (err) {
      console.error('Error en la búsqueda:', err);
      return null;
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(buscar, 250); // debounce
  });

  const confirmar = async () => {
    const resultados = await buscar();
    if (resultados?.length) irAOficina(resultados[0]);
  };
  boton?.addEventListener('click', confirmar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
    if (e.key === 'Escape') cerrar();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-search')) cerrar();
  });
});