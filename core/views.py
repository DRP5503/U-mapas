from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
 
from .models import Piso, Nodo, Arista, Sala
import networkx as nx
 

def index(request):
    """Renderiza la vista general de la aplicación."""
    return render(request, 'core/index.html')

def pisos_edificio(request, edificio):
    # Obtiene los pisos de un edificio ordenados de mayor a menor
    # y devuelve sus números en formato JSON.
    pisos = Piso.objects.filter(edificio__iexact=edificio).order_by('-numero')
    return JsonResponse({'pisos': [p.numero for p in pisos]})


def piso_json(request, edificio, numero):
    # Obtiene los datos de un piso, sus salas, geometría y profesores,
    # y los devuelve en formato JSON para dibujar el plano.
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    salas = piso.salas.prefetch_related('profesores')
    return JsonResponse({
        'edificio': piso.edificio,
        'numero': piso.numero,
        'ancho': piso.ancho,
        'alto': piso.alto,
        'salas': [
            {
                'nombre': s.nombre,
                'tipo': s.tipo,
                'x': s.x,
                'y': s.y,
                'ancho': s.ancho,
                'alto': s.alto,
                'profesores': [p.nombre for p in s.profesores.all()],
            }
            for s in salas
        ],
    })


def _ruta_entre_nodos(piso, a, b):
    """Calcula la ruta más corta entre dos nodos del mismo piso."""
    # Construye un grafo con las aristas del piso y calcula la ruta
    # más corta mediante Dijkstra; devuelve distancia y coordenadas en JSON.
    G = nx.Graph()
    aristas = Arista.objects.filter(origen__piso=piso).select_related('origen', 'destino')
    for ar in aristas:
        G.add_edge(ar.origen_id, ar.destino_id, weight=ar.peso)

    try:
        distancia, ids = nx.single_source_dijkstra(G, a.id, b.id, weight='weight')
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return JsonResponse({'error': 'No hay camino entre esos puntos'}, status=404)

    nodos = Nodo.objects.in_bulk(ids)
    return JsonResponse({
        'desde': a.nombre,
        'hasta': b.nombre,
        'distancia': round(distancia, 1),
        'puntos': [{'x': nodos[i].x, 'y': nodos[i].y} for i in ids],
    })


def ruta_nodos(request, edificio, numero, desde, hasta):
    """Ruta entre dos nodos, buscados por su nombre."""
    # Busca los nodos de origen y destino dentro del piso indicado
    # y delega el cálculo del recorrido a _ruta_entre_nodos().
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    a = get_object_or_404(Nodo, piso=piso, nombre__iexact=desde)
    b = get_object_or_404(Nodo, piso=piso, nombre__iexact=hasta)
    return _ruta_entre_nodos(piso, a, b)


def ruta_json(request, edificio, numero, desde, hasta):
    """Ruta entre dos salas, usando el nodo asignado a cada una."""
    # Busca las salas de origen y destino, verifica que tengan nodos
    # asignados y solicita el cálculo de la ruta entre esos nodos.
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    sa = get_object_or_404(Sala, piso=piso, nombre__iexact=desde)
    sb = get_object_or_404(Sala, piso=piso, nombre__iexact=hasta)
    if sa.nodo is None or sb.nodo is None:
        return JsonResponse({'error': 'Una de las salas no tiene nodo asignado'}, status=400)
    return _ruta_entre_nodos(piso, sa.nodo, sb.nodo)