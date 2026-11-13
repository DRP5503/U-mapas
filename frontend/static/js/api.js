/**
 * ==============================================================================
 * CLIENTE HTTP DE LA API DEL MAPA (U-MAPAS)
 * Centraliza todas las peticiones fetch hacia el backend de Django.
 * ==============================================================================
 */

const MapAPI = (() => {
  const getVistaPisoEl = () => document.getElementById('vista-piso');

  const urlPisos = (edificio) =>
    getVistaPisoEl().dataset.urlPisos.replace('EDIFICIO', encodeURIComponent(edificio));

  const urlPiso = (edificio, numero) =>
    getVistaPisoEl().dataset.urlPiso
      .replace('EDIFICIO', encodeURIComponent(edificio))
      .replace(/\/0\/$/, `/${numero}/`);

  const urlRuta = (edificio, numero, desde, hasta) =>
    getVistaPisoEl().dataset.urlRuta
      .replace('EDIFICIO', encodeURIComponent(edificio))
      .replace(
        '/0/DESDE/HASTA/',
        `/${numero}/${encodeURIComponent(desde)}/${encodeURIComponent(hasta)}/`
      );

    // Ruta entre dos salas por id: puede cruzar pisos y edificios (viene dividida en tramos)
  const urlRutaSalas = (desdeId, hastaId) =>
    getVistaPisoEl().dataset.urlRutaSalas.replace(/\/0\/0\/$/, `/${desdeId}/${hastaId}/`);

  async function obtenerPisos(edificio) {
    const res = await fetch(urlPisos(edificio));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function obtenerPlanoPiso(edificio, numero) {
    const res = await fetch(urlPiso(edificio, numero));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function obtenerRuta(edificio, numero, desde, hasta) {
    const res = await fetch(urlRuta(edificio, numero, desde, hasta));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function obtenerRutaSalas(desdeId, hastaId) {
    const res = await fetch(urlRutaSalas(desdeId, hastaId));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  return {
    obtenerPisos,
    obtenerPlanoPiso,
    obtenerRuta,
    obtenerRutaSalas,
  };
})();
