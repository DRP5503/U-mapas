"""
Comando de gestión: vincular_nodos

Importa el grafo de rutas (nodos y aristas) desde dos archivos CSV.

Uso:
    python manage.py vincular_nodos <ruta_nodos> <ruta_aristas>

Ejemplo:
    python manage.py vincular_nodos data/raw/nodos.csv data/raw/aristas.csv

Formato de los CSV:
    nodos.csv    -> edificio,piso,nombre,x,y
    aristas.csv  -> edificio,piso,origen,destino

Cómo funciona:
    Pasada 1: crea o actualiza cada nodo (se identifica por piso y nombre).
    Pasada 2: crea las aristas entre nodos que ya existen.
    Las filas inválidas se omiten con un aviso y no detienen la importación.

Notas:
    - Es seguro ejecutarlo varias veces: no duplica nodos ni aristas.
    - Cada conexión se escribe una sola vez en el CSV; el grafo la trata
      como bidireccional.
    - Este comando no enlaza salas con nodos: para eso está `vincular_nodos`.
"""
import csv

from django.core.management.base import BaseCommand

from core.models import Piso, Nodo, Arista, Sala


class Command(BaseCommand):
    """Importa nodos y aristas del grafo de rutas desde dos CSV."""

    help = 'Importa nodos y aristas del grafo de rutas desde dos CSV'

    def add_arguments(self, parser):
        parser.add_argument('ruta_nodos', help='Ruta al CSV de nodos')
        parser.add_argument('ruta_aristas', help='Ruta al CSV de aristas')

    def _nodo(self, edificio, piso, nombre):
        # El nombre solo es único dentro de un piso, así que se filtra por piso.
        return Nodo.objects.get(
            piso__edificio__iexact=edificio,
            piso__numero=int(piso),
            nombre=nombre,
        )

    def handle(self, *args, **opts):
        with open(opts['ruta_nodos'], encoding='utf-8') as archivo:
            nodos = list(csv.DictReader(archivo))
        with open(opts['ruta_aristas'], encoding='utf-8') as archivo:
            aristas = list(csv.DictReader(archivo))

        # Pasada 1: crear o actualizar los nodos.
        for fila in nodos:
            try:
                x = float(fila['x'])
                y = float(fila['y'])
                piso = Piso.objects.get(
                    edificio__iexact=fila['edificio'], numero=int(fila['piso'])
                )
            except (ValueError, Piso.DoesNotExist):
                self.stdout.write(self.style.WARNING(f"Nodo inválido, se omite: {fila}"))
                continue

            Nodo.objects.update_or_create(
                nombre=fila['nombre'],
                piso=piso,
                defaults={'x': x, 'y': y},
            )

        # Pasada 2: crear las aristas.
        for fila in aristas:
            try:
                origen = self._nodo(fila['edificio'], fila['piso'], fila['origen'])
                destino = self._nodo(fila['edificio'], fila['piso'], fila['destino'])
            except (ValueError, Nodo.DoesNotExist):
                self.stdout.write(self.style.WARNING(f"Arista inválida, se omite: {fila}"))
                continue

            Arista.objects.get_or_create(origen=origen, destino=destino)

        self.stdout.write(self.style.SUCCESS(
            f"Listo: {Nodo.objects.count()} nodos y {Arista.objects.count()} aristas en total."
        ))

        vinculadas = 0
        sin_coincidencia = []

        for sala in Sala.objects.filter(nodo__isnull=True):
            nodo = Nodo.objects.filter(
                piso=sala.piso,
                nombre__iexact=sala.nombre
            ).first()

            if nodo:
                sala.nodo = nodo
                sala.save(update_fields=["nodo"])
                vinculadas += 1
            else:
                sin_coincidencia.append(sala.nombre)

        print("Salas vinculadas:", vinculadas)
        print("Salas sin nodo coincidente:", sin_coincidencia)