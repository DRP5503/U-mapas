"""
Comando de gestión: vincular_nodos

Asigna a cada sala de un piso su nodo del grafo de rutas, es decir, el punto
que representa su puerta. Ese vínculo (Sala.nodo) es el que usa la vista
`ruta_json` para saber desde dónde y hasta dónde calcular el camino más corto.

Uso:
    python manage.py vincular_nodos <edificio> <piso>

Ejemplo:
    python manage.py vincular_nodos Norte 3

Requisitos previos:
    - Las salas del piso ya existen (ver el comando `importar_salas`).
    - Los nodos del piso ya fueron creados (por ejemplo, desde el admin).

Cómo se elige el nodo de cada sala (en este orden):
    1. Un nodo cuyo nombre sea igual al de la sala (sin distinguir mayúsculas).
    2. Si no hay, un nodo cuyo nombre contenga el mismo número que la sala.
       Ejemplo: la sala "N331" se enlaza con el nodo "Oficina 331".
    3. Si el número coincide con varios nodos (por ejemplo la puerta
       "Oficina 331" y el punto de pasillo "Oficina 331 Pasillo"), se elige el
       que cae dentro o sobre el borde del rectángulo de la sala. La puerta
       está en el borde de la sala y el punto de pasillo queda afuera.
       Esto requiere que la sala tenga sus coordenadas (x, y, ancho, alto).

Resultado:
    Imprime cuántas salas quedaron enlazadas y dos listas para revisar a mano:
    - "Sin nodo": salas para las que no se encontró ningún nodo.
    - "Ambiguas": salas con varios candidatos que no se pudieron desempatar.
    El comando nunca adivina: si hay duda, deja la sala sin tocar.

Notas:
    - Es seguro ejecutarlo varias veces: solo reescribe el campo `nodo` de las
      salas en las que encuentra un nodo, y no crea ni borra nada más.
    - Una sala tiene un único nodo. Si hay varias puertas, se debe elegir la
      principal.
"""
import re

from django.core.management.base import BaseCommand

from core.models import Nodo, Sala


class Command(BaseCommand):
    """Enlaza cada sala de un piso con su nodo (puerta) en el grafo de rutas."""

    help = 'Asigna a cada sala su nodo (puerta), buscando por nombre y luego por número'

    def add_arguments(self, parser):
        """Define los argumentos: edificio (texto) y número de piso (entero)."""
        parser.add_argument('edificio', help='Nombre del edificio, por ejemplo Norte')
        parser.add_argument('piso', type=int, help='Número del piso, por ejemplo 3')

    def handle(self, *args, **opts):
        """
        Recorre las salas del piso indicado y asigna a cada una su nodo.

        Para cada sala prueba primero el nombre y luego el número (ver la
        descripción del módulo). Al terminar informa cuántas quedaron
        enlazadas y cuáles requieren revisión manual.
        """
        salas = Sala.objects.filter(
            piso__edificio__iexact=opts['edificio'], piso__numero=opts['piso']
        )
        if not salas.exists():
            self.stderr.write('No hay salas en ese piso. Revisa edificio y número.')
            return

        # Contador de éxitos y listas de salas que necesitan revisión manual.
        enlazadas, sin_nodo, ambiguas = 0, [], []
        for s in salas:
            # Solo se consideran los nodos del mismo piso que la sala.
            nodos = Nodo.objects.filter(piso=s.piso)

            # 1) Coincidencia exacta de nombre (sin distinguir mayúsculas).
            n = nodos.filter(nombre__iexact=s.nombre).first()

            # 2) Si no hay coincidencia exacta, buscar por el número del nombre.
            if n is None:
                m = re.search(r'\d+', s.nombre)
                if m:
                    # El número debe aparecer completo: así "31" no coincide con
                    # "331". El patrón exige que a los lados no haya otro dígito.
                    patron = r'(^|[^0-9])' + m.group() + r'([^0-9]|$)'
                    candidatos = list(nodos.filter(nombre__iregex=patron))

                    # 3) Desempate geométrico: si hay varios candidatos, la puerta
                    # es el que cae dentro o sobre el borde de la sala.
                    if len(candidatos) > 1 and s.x is not None:
                        dentro = [
                            c for c in candidatos
                            if s.x <= c.x <= s.x + s.ancho and s.y <= c.y <= s.y + s.alto
                        ]
                        # Solo se acepta si el desempate deja exactamente uno.
                        if len(dentro) == 1:
                            candidatos = dentro

                    if len(candidatos) == 1:
                        n = candidatos[0]
                    elif len(candidatos) > 1:
                        # Sigue habiendo duda: se reporta y no se asigna nada.
                        ambiguas.append((s.nombre, [c.nombre for c in candidatos]))
                        continue

            if n:
                s.nodo = n
                s.save()
                enlazadas += 1
            else:
                sin_nodo.append(s.nombre)

        # Resumen final para revisar a mano lo que no se pudo enlazar.
        self.stdout.write(self.style.SUCCESS(f'{enlazadas} salas enlazadas.'))
        self.stdout.write(f'Sin nodo ({len(sin_nodo)}): {sin_nodo}')
        self.stdout.write(f'Ambiguas ({len(ambiguas)}): {ambiguas}')