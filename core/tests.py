"""
Pruebas automatizadas para modelos, servicios de rutas, reportes y endpoints de la API.
"""
from datetime import timedelta
import json

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from core.models import Arista, Nodo, Piso, Profesor, Reporte, Sala, User
from core.services.rutas import calcular_ruta_nodos


class MapaRutasTests(TestCase):
    """Verifica el modelo de datos, el servicio Dijkstra y los endpoints JSON."""

    def setUp(self):
        self.piso = Piso.objects.create(edificio='Norte', numero=3, ancho=1000, alto=600)
        self.nodo_a = Nodo.objects.create(piso=self.piso, nombre='Entrada', x=0, y=0)
        self.nodo_p = Nodo.objects.create(piso=self.piso, nombre='Pasillo', x=30, y=0)
        self.nodo_b = Nodo.objects.create(piso=self.piso, nombre='N331', x=30, y=40)

        Arista.objects.create(origen=self.nodo_a, destino=self.nodo_p)
        Arista.objects.create(origen=self.nodo_p, destino=self.nodo_b)

        self.sala_entrada = Sala.objects.create(
            nombre='Entrada', piso=self.piso, tipo='sala',
            x=0, y=0, ancho=20, alto=20, nodo=self.nodo_a,
        )
        self.sala_oficina = Sala.objects.create(
            nombre='N331', piso=self.piso, tipo='oficina',
            x=25, y=35, ancho=20, alto=20, nodo=self.nodo_b,
        )
        Profesor.objects.create(
            nombre='Docente Prueba', oficina=self.sala_oficina, jornada='Completa',
        )

    def test_arista_peso_euclidiano(self):
        arista = Arista.objects.get(origen=self.nodo_p, destino=self.nodo_b)
        self.assertAlmostEqual(arista.peso, 40.0)

    def test_servicio_calcular_ruta_nodos(self):
        resultado = calcular_ruta_nodos(self.piso, self.nodo_a, self.nodo_b)
        self.assertIsNotNone(resultado)
        self.assertEqual(resultado['distancia'], 70.0)
        self.assertEqual(len(resultado['puntos']), 3)

    def test_endpoint_pisos_y_piso_json(self):
        res_pisos = self.client.get(reverse('core:pisos_edificio', args=['Norte']))
        self.assertEqual(res_pisos.status_code, 200)
        self.assertEqual(res_pisos.json(), {'pisos': [3]})

        res_piso = self.client.get(reverse('core:piso_json', args=['Norte', 3]))
        self.assertEqual(res_piso.status_code, 200)
        data = res_piso.json()
        self.assertEqual(len(data['salas']), 2)

    def test_endpoint_ruta_json(self):
        res = self.client.get(reverse('core:ruta_json', args=['Norte', 3, 'Entrada', 'N331']))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['distancia'], 70.0)

    def test_vistas_autenticacion(self):
        res_login = self.client.get(reverse('core:login_user'))
        self.assertEqual(res_login.status_code, 200)

        res_register = self.client.get(reverse('core:register_user'))
        self.assertEqual(res_register.status_code, 200)

        user = User.objects.create_user(
            username='estudiante1', password=' TestPass123!', nombre='Estudiante', rol='ESTUDIANTE'
        )
        self.assertEqual(user.rol, 'ESTUDIANTE')


class SistemaReportesTests(TestCase):
    """Verifica creación, duplicados, confirmaciones, cierre por autor y expiración de reportes."""

    def setUp(self):
        self.piso = Piso.objects.create(edificio='Norte', numero=3, ancho=1000, alto=600)
        self.sala = Sala.objects.create(
            nombre='Auditorio',
            piso=self.piso,
            tipo='sala',
            x=10,
            y=10,
            ancho=100,
            alto=80,
        )
        self.autor = User.objects.create_user(
            username='autor1',
            password='Password123!',
            nombre='Autor Prueba',
            rol='ESTUDIANTE',
        )
        self.otro_usuario = User.objects.create_user(
            username='companero1',
            password='Password123!',
            nombre='Compañero Prueba',
            rol='ESTUDIANTE',
        )

    def _post_json(self, url_name, payload=None, args=None):
        return self.client.post(
            reverse(url_name, args=args),
            data=json.dumps(payload or {}),
            content_type='application/json',
        )

    def test_ttl_definido_para_todas_las_categorias(self):
        for codigo, _ in Reporte.TIPO:
            self.assertIn(codigo, Reporte.TTL_MINUTOS_POR_TIPO)

    def test_crear_reporte_requiere_sesion_y_valida_otro(self):
        res_anon = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'espacio_cerrado', 'descripcion': ''},
        )
        self.assertEqual(res_anon.status_code, 401)

        self.client.force_login(self.autor)
        res_otro_vacio = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'otro', 'descripcion': '   '},
        )
        self.assertEqual(res_otro_vacio.status_code, 400)

        res_ok = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'espacio_cerrado', 'descripcion': 'Con llave'},
        )
        self.assertEqual(res_ok.status_code, 201)
        data = res_ok.json()['reporte']
        self.assertEqual(data['confirmaciones'], 0)
        self.assertTrue(data['es_autor'])
        self.assertFalse(data['ya_confirmado'])

        reporte = Reporte.objects.get(pk=data['id'])
        self.assertEqual(reporte.autor, self.autor)
        duracion_seg = (reporte.expira_en - reporte.fecha).total_seconds()
        self.assertAlmostEqual(duracion_seg, 15 * 60, delta=5)

    def test_bloquear_reporte_duplicado_activo_y_permitir_distinto_tipo(self):
        self.client.force_login(self.autor)
        r1 = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'proyector', 'descripcion': 'Sin señal'},
        )
        self.assertEqual(r1.status_code, 201)

        r_dup = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'proyector', 'descripcion': 'Tampoco prende'},
        )
        self.assertEqual(r_dup.status_code, 409)
        self.assertEqual(r_dup.json()['codigo'], 'REPORTE_DUPLICADO')
        self.assertIn('reporte_existente', r_dup.json())

        r_otro_tipo = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'microfono', 'descripcion': ''},
        )
        self.assertEqual(r_otro_tipo.status_code, 201)

    def test_confirmar_reporte_renueva_ttl_y_bloquea_autor_y_duplicados(self):
        antigua_fecha = timezone.now() - timedelta(minutes=20)
        reporte = Reporte.objects.create(
            sala=self.sala,
            autor=self.autor,
            tipo='proyector',
            expira_en=antigua_fecha + timedelta(minutes=60),
        )

        self.client.force_login(self.autor)
        res_autor = self._post_json('core:confirmar_reporte', args=[reporte.id])
        self.assertEqual(res_autor.status_code, 400)

        self.client.force_login(self.otro_usuario)
        expira_anterior = reporte.expira_en
        res_confirm = self._post_json('core:confirmar_reporte', args=[reporte.id])
        self.assertEqual(res_confirm.status_code, 200)
        rep_json = res_confirm.json()['reporte']
        self.assertEqual(rep_json['confirmaciones'], 1)
        self.assertTrue(rep_json['ya_confirmado'])

        reporte.refresh_from_db()
        self.assertGreater(reporte.expira_en, expira_anterior)

        res_repetida = self._post_json('core:confirmar_reporte', args=[reporte.id])
        self.assertEqual(res_repetida.status_code, 400)

    def test_cerrar_reporte_exclusivo_del_autor_y_permite_nuevo_reporte(self):
        reporte = Reporte.objects.create(
            sala=self.sala,
            autor=self.autor,
            tipo='luz',
        )

        res_anon = self._post_json('core:cerrar_reporte', args=[reporte.id])
        self.assertEqual(res_anon.status_code, 401)

        self.client.force_login(self.otro_usuario)
        res_ajeno = self._post_json('core:cerrar_reporte', args=[reporte.id])
        self.assertEqual(res_ajeno.status_code, 403)

        self.client.force_login(self.autor)
        res_autor = self._post_json('core:cerrar_reporte', args=[reporte.id])
        self.assertEqual(res_autor.status_code, 200)
        self.assertEqual(res_autor.json()['reporte']['estado'], 'RESUELTO')

        res_piso = self.client.get(reverse('core:piso_json', args=['Norte', 3]))
        self.assertEqual(res_piso.json()['salas'][0]['reportes_activos'], [])

        res_nuevo = self._post_json(
            'core:crear_reporte',
            {'sala_id': self.sala.id, 'tipo': 'luz'},
        )
        self.assertEqual(res_nuevo.status_code, 201)

    def test_expiracion_automatica_oculta_reporte_y_bloquea_acciones(self):
        reporte = Reporte.objects.create(
            sala=self.sala,
            autor=self.autor,
            tipo='aseo',
            expira_en=timezone.now() - timedelta(minutes=2),
        )

        res_detalle = self.client.get(reverse('core:detalle_reporte', args=[reporte.id]))
        self.assertEqual(res_detalle.status_code, 200)
        self.assertEqual(res_detalle.json()['reporte']['estado'], 'EXPIRADO')
        self.assertEqual(res_detalle.json()['reporte']['tiempo_restante_min'], 0)

        res_piso = self.client.get(reverse('core:piso_json', args=['Norte', 3]))
        self.assertEqual(res_piso.json()['salas'][0]['reportes_activos'], [])

        self.client.force_login(self.otro_usuario)
        res_confirm = self._post_json('core:confirmar_reporte', args=[reporte.id])
        self.assertEqual(res_confirm.status_code, 400)

        self.client.force_login(self.autor)
        res_cerrar = self._post_json('core:cerrar_reporte', args=[reporte.id])
        self.assertEqual(res_cerrar.status_code, 400)
