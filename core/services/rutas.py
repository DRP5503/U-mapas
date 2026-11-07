"""
Servicio de cálculo de rutas sobre el grafo de pasillos y salas del DCC.
"""
import networkx as nx

from core.models import Arista, Nodo


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
