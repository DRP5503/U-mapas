/**
 * ==============================================================================
 * CLIENTE HTTP DE LA API DEL MAPA (U-MAPAS)
 * ==============================================================================
 */

const MapAPI = (() => {
  const getVistaPisoEl = () => document.getElementById('vista-piso');

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };

  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || getCookie('csrftoken');
  };

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
      headers: { 'X-CSRFToken': getCSRFToken() },
    });
    
    // Si Django nos redirige al login, detenemos esto
    if (res.redirected || res.status === 404) {
      window.location.href = '/login';
      return { ok: false, status: 401, data: {} };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function estadoFavorito(salaId) {
    const res = await fetch(urlEstadoFavorito(salaId));
    
    // Si el usuario no está logueado, no hacer nada
    if (res.redirected || res.status === 404) {
      return { favorito: false };
    }

    return res.json().catch(() => ({ favorito: false }));
  }

  return {
    obtenerPisos,
    obtenerPlanoPiso,
    obtenerRuta,
    toggleFavorito,
    estadoFavorito,
  };
})();