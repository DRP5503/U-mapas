"""Regresiones del flujo de favoritos y su aislamiento entre cuentas."""
from django.test import Client, TestCase
from django.urls import reverse

from core.models import LugarFavorito, Piso, Profesor, ProfesorFavorito, Sala, User


class FavoritosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = User.objects.create_user(username='ana', nombre='Ana', rol='ESTUDIANTE')
        cls.otro_usuario = User.objects.create_user(username='pablo', nombre='Pablo', rol='ESTUDIANTE')
        cls.profesor = Profesor.objects.create(nombre='Docente de prueba', jornada='Completa')
        cls.lista_url = reverse('core:mis_lugares_favoritos')
        cls.quitar_url = reverse('core:quitar_favorito', args=[cls.profesor.pk])
        cls.guardar_url = reverse('core:guardar_profesor_favorito', args=[cls.profesor.pk])
        cls.perfil_url = reverse('core:perfil_profesor', args=[cls.profesor.pk])

    def test_requiere_sesion(self):
        for metodo, url in [('get', self.lista_url), ('post', self.lista_url), ('post', self.quitar_url), ('post', self.guardar_url)]:
            with self.subTest(metodo=metodo, url=url):
                respuesta = getattr(self.client, metodo)(url)
                self.assertRedirects(
                    respuesta, f'{reverse("core:login_user")}?next={url}',
                    fetch_redirect_response=False,
                )
        self.assertFalse(ProfesorFavorito.objects.exists())

    def test_guardado_repetido_y_persistencia(self):
        self.client.force_login(self.usuario)
        for _ in range(2):
            respuesta = self.client.post(self.lista_url, {'profesor': self.profesor.pk})
            self.assertRedirects(respuesta, self.lista_url)
        self.assertEqual(ProfesorFavorito.objects.count(), 1)
        self.client.logout()
        self.client.force_login(self.usuario)
        respuesta = self.client.get(self.lista_url)
        self.assertEqual(len(respuesta.context['profesores_favoritos']), 1)
        self.assertContains(respuesta, 'Oficina sin asignar')

    def test_otra_cuenta_no_ve_ni_elimina_favoritos_ajenos(self):
        favorito = ProfesorFavorito.objects.create(usuario=self.usuario, profesor=self.profesor)
        self.client.force_login(self.otro_usuario)
        respuesta = self.client.get(self.lista_url)
        self.assertEqual(len(respuesta.context['profesores_favoritos']), 0)
        self.client.post(self.quitar_url, {'usuario': self.usuario.pk})
        self.assertTrue(ProfesorFavorito.objects.filter(pk=favorito.pk).exists())
        # El usuario del formulario se ignora. Se utiliza la sesión activa.
        self.client.post(self.lista_url, {'profesor': self.profesor.pk, 'usuario': self.usuario.pk})
        self.assertTrue(ProfesorFavorito.objects.filter(usuario=self.otro_usuario).exists())

    def test_quitar_es_post_y_se_puede_repetir(self):
        ProfesorFavorito.objects.create(usuario=self.usuario, profesor=self.profesor)
        self.client.force_login(self.usuario)
        self.assertEqual(self.client.get(self.quitar_url).status_code, 405)
        self.assertEqual(ProfesorFavorito.objects.count(), 1)
        for _ in range(2):
            self.assertRedirects(self.client.post(self.quitar_url), self.lista_url)
        self.assertFalse(ProfesorFavorito.objects.exists())

    def test_seleccion_invalida_conserva_la_pagina_y_los_datos(self):
        self.client.force_login(self.usuario)
        for valor in ['', 'inexistente', self.profesor.pk + 1000]:
            with self.subTest(valor=valor):
                respuesta = self.client.post(self.lista_url, {'profesor': valor})
                self.assertEqual(respuesta.status_code, 200)
                self.assertIn('profesor', respuesta.context['form'].errors)
        self.assertFalse(ProfesorFavorito.objects.exists())

    def test_mutaciones_requieren_csrf(self):
        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.usuario)
        self.assertEqual(cliente.post(self.lista_url, {'profesor': self.profesor.pk}).status_code, 403)
        self.assertEqual(cliente.post(self.quitar_url).status_code, 403)
        self.assertEqual(cliente.post(self.guardar_url).status_code, 403)
        self.assertFalse(ProfesorFavorito.objects.exists())

    def test_guardar_y_quitar_desde_el_perfil(self):
        self.assertContains(self.client.get(self.perfil_url), 'Iniciar sesión para guardar')
        self.client.force_login(self.usuario)
        self.assertEqual(self.client.get(self.guardar_url).status_code, 405)
        for _ in range(2):
            self.assertRedirects(self.client.post(self.guardar_url), self.perfil_url)
        self.assertEqual(ProfesorFavorito.objects.count(), 1)
        respuesta = self.client.get(self.perfil_url)
        self.assertTrue(respuesta.context['es_favorito'])
        self.assertContains(respuesta, 'Quitar de favoritos')
        self.assertContains(self.client.get(self.lista_url), self.perfil_url)
        self.assertRedirects(self.client.post(self.quitar_url, {'desde': 'perfil'}), self.perfil_url)
        self.assertFalse(self.client.get(self.perfil_url).context['es_favorito'])

    def test_coexiste_con_lugares_y_conserva_sus_endpoints(self):
        piso = Piso.objects.create(edificio='Norte', numero=3, ancho=1000, alto=600)
        sala = Sala.objects.create(nombre='N331', piso=piso, tipo='oficina')
        self.profesor.oficina = sala
        self.profesor.save()
        lugar = LugarFavorito.objects.create(usuario=self.usuario, sala=sala)
        self.client.force_login(self.usuario)
        self.client.post(self.guardar_url)
        respuesta = self.client.get(self.lista_url)
        self.assertEqual(list(respuesta.context['favoritos']), [lugar])
        self.assertEqual(len(respuesta.context['profesores_favoritos']), 1)
        self.assertContains(respuesta, 'Oficina N331')
        self.client.post(self.quitar_url)
        self.assertTrue(LugarFavorito.objects.filter(pk=lugar.pk).exists())
        estado = reverse('core:estado_favorito', args=[sala.pk])
        self.assertTrue(self.client.get(estado).json()['favorito'])
        toggle = reverse('core:toggle_favorito', args=[sala.pk])
        self.assertFalse(self.client.post(toggle).json()['favorito'])
        self.assertTrue(self.client.post(toggle).json()['favorito'])
