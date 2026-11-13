/**
 * ==============================================================================
 * CLIENTE HTTP DE LA API DEL MAPA (U-MAPAS)
 * ==============================================================================
 */

const MapAPI = (() => {
  const getVistaPisoEl = () => document.getElementById('vista-piso');

  const getCookie = (name) => {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  };

  const getCsrfToken = () =>
    document.querySelector('[name=csrfmiddlewaretoken]')?.value || getCookie('csrftoken');

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

  const urlToggleFavorito = (salaId) =>
    getVistaPisoEl().dataset.urlToggleFavorito.replace(/\/0\/$/, `/${salaId}/`);

  const urlEstadoFavorito = (salaId) =>
    getVistaPisoEl().dataset.urlEstadoFavorito.replace(/\/0\/$/, `/${salaId}/`);

  const urlCrearReporte = () => getVistaPisoEl().dataset.urlCrearReporte;

  const urlDetalleReporte = (reporteId) =>
    getVistaPisoEl().dataset.urlDetalleReporte.replace(/\/0\/$/, `/${reporteId}/`);

  const urlConfirmarReporte = (reporteId) =>
    getVistaPisoEl().dataset.urlConfirmarReporte.replace(
      /\/0\/confirmar\/$/,
      `/${reporteId}/confirmar/`
    );

  const urlCerrarReporte = (reporteId) =>
    getVistaPisoEl().dataset.urlCerrarReporte.replace(
      /\/0\/cerrar\/$/,
      `/${reporteId}/cerrar/`
    );

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

  async function toggleFavorito(salaId) {
    const res = await fetch(urlToggleFavorito(salaId), {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() },
    });

    if (res.redirected || res.status === 401 || res.status === 403 || res.status === 404) {
      return { ok: false, status: 401, data: {} };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function estadoFavorito(salaId) {
    const res = await fetch(urlEstadoFavorito(salaId));
    if (res.redirected || res.status === 401 || res.status === 403 || res.status === 404) {
      return { favorito: false };
    }
    return res.json().catch(() => ({ favorito: false }));
  }

  async function crearReporte(payload) {
    const res = await fetch(urlCrearReporte(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function obtenerDetalleReporte(reporteId) {
    const res = await fetch(urlDetalleReporte(reporteId));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function confirmarReporte(reporteId) {
    const res = await fetch(urlConfirmarReporte(reporteId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function cerrarReporte(reporteId) {
    const res = await fetch(urlCerrarReporte(reporteId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  return {
    obtenerPisos,
    obtenerPlanoPiso,
    obtenerRuta,
    toggleFavorito,
    estadoFavorito,
    crearReporte,
    obtenerDetalleReporte,
    confirmarReporte,
    cerrarReporte,
  };
})();