"""
Formularios de autenticación y registro de usuarios.
"""
from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from core.models import Profesor, User


class NewUserForm(UserCreationForm):
    """Formulario de registro para crear cuentas con nombre y rol institucional."""

    class Meta:
        model = User
        fields = ['nombre', 'username', 'email', 'rol', 'password1', 'password2']


class LoginForm(AuthenticationForm):
    """Formulario de inicio de sesión estándar."""
    pass


class ProfesorFavoritoForm(forms.Form):
    """Selección de un profesor existente para agregar a favoritos."""

    profesor = forms.ModelChoiceField(
        queryset=Profesor.objects.order_by('nombre', 'pk'),
        label='Profesor',
        empty_label='Selecciona un profesor',
    )
