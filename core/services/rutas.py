"""
Servicio de cálculo de rutas sobre el grafo de pasillos y salas del DCC.
"""
import unicodedata
from itertools import combinations

import networkx as nx

from core.models import Arista, Nodo

# Salas "puente" entre mapas. Se enlazan solas por su nombre (sin tildes ni mayúsculas),
# así que para conectar mapas basta con crear la sala y su nodo con ese nombre:
#   - "Escalera":  une pisos consecutivos de un mismo edificio.
#   - "Conexión":  une edificios distintos que están en el mismo número de piso.
NOMBRE_ESCALERA = 'escalera'
NOMBRE_CONEXION = 'conexion'
COSTO_ESCALERA = 150  # costo fijo de subir/bajar: las coordenadas de dos pisos no se pueden comparar
COSTO_CONEXION = 50   # costo fijo de pasar de un edificio a otro


def construir_grafo_piso(piso):
    """
    Construye y retorna un grafo no dirigido (networkx.Graph) para el piso dado,
    ponderado por la distancia euclidiana de cada arista.
    """
    grafo = nx.Graph()
    aristas = Arista.objects.filter(origen__piso=piso).select_related('origen', 'destino')
    for arista in aristas:
        grafo.add_edge(arista.origen_id, arista.destino_id, weight=arista.peso)
    return grafo


def _normalizar(nombre):
    """Minúsculas y sin tildes: 'Conexión' y 'conexion' son el mismo nombre."""
    descompuesto = unicodedata.normalize('NFD', nombre)
    return ''.join(c for c in descompuesto if unicodedata.category(c) != 'Mn').strip().lower()


def _enlazar_mapas(grafo):
    """Agrega al grafo las aristas entre mapas (escaleras y conexiones) con costo fijo."""
    escaleras = {}   # edificio -> [(numero de piso, id del nodo)]
    conexiones = {}  # numero de piso -> [(edificio, id del nodo)]
    for nodo in Nodo.objects.select_related('piso'):
        nombre = _normalizar(nodo.nombre)
        if nombre == NOMBRE_ESCALERA:
            escaleras.setdefault(nodo.piso.edificio.lower(), []).append((nodo.piso.numero, nodo.id))
        elif nombre == NOMBRE_CONEXION:
            conexiones.setdefault(nodo.piso.numero, []).append((nodo.piso.edificio.lower(), nodo.id))

    for pisos in escaleras.values():
        pisos.sort()
        for (_, a), (_, b) in zip(pisos, pisos[1:]):  # solo pisos consecutivos
            grafo.add_edge(a, b, weight=COSTO_ESCALERA)

    for nodos in conexiones.values():
        for (edificio_a, a), (edificio_b, b) in combinations(nodos, 2):
            if edificio_a != edificio_b:
                grafo.add_edge(a, b, weight=COSTO_CONEXION)


def construir_grafo():
    """Grafo con TODOS los mapas: aristas de cada piso más las escaleras/conexiones entre ellos."""
    grafo = nx.Graph()
    for arista in Arista.objects.select_related('origen', 'destino'):
        grafo.add_edge(arista.origen_id, arista.destino_id, weight=arista.peso)
    _enlazar_mapas(grafo)
    return grafo


def calcular_ruta(sala_origen, sala_destino):
    """
    Ruta más corta entre dos salas de cualquier piso o edificio.

    Los mapas siguen separados: la ruta se devuelve dividida en `tramos`, uno por cada
    mapa por el que pasa, cada uno con sus propios puntos (x, y) en el lienzo de ese mapa.
    Retorna None si no hay camino.
    """
    try:
        distancia, ids = nx.single_source_dijkstra(
            construir_grafo(), sala_origen.nodo_id, sala_destino.nodo_id, weight='weight'
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None

    nodos = Nodo.objects.select_related('piso').in_bulk(ids)
    tramos = []
    for i in ids:
        nodo = nodos[i]
        mapa = (nodo.piso.edificio, nodo.piso.numero)
        if not tramos or (tramos[-1]['edificio'], tramos[-1]['piso']) != mapa:
            tramos.append({'edificio': mapa[0], 'piso': mapa[1], 'puntos': []})
        tramos[-1]['puntos'].append({'x': nodo.x, 'y': nodo.y})

    return {
        'desde': sala_origen.nombre,
        'hasta': sala_destino.nombre,
        'distancia': round(distancia, 1),
        'tramos': tramos,
    }


def calcular_ruta_nodos(piso, nodo_origen, nodo_destino):
    """
    Calcula la ruta más corta mediante Dijkstra entre dos nodos del mismo piso.

    Retorna un diccionario con `desde`, `hasta`, `distancia` y `puntos` (lista de {x, y}),
    o None si no existe camino entre ambos nodos.
    """
    grafo = construir_grafo_piso(piso)
    try:
        distancia, ids = nx.single_source_dijkstra(
            grafo, nodo_origen.id, nodo_destino.id, weight='weight'
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None

    nodos = Nodo.objects.in_bulk(ids)
    return {
        'desde': nodo_origen.nombre,
        'hasta': nodo_destino.nombre,
        'distancia': round(distancia, 1),
        'puntos': [{'x': nodos[i].x, 'y': nodos[i].y} for i in ids],
    }
