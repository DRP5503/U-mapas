"""
Formularios de autenticación y registro de usuarios.
"""
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from core.models import User


class NewUserForm(UserCreationForm):
    """Formulario de registro para crear cuentas con nombre y rol institucional."""

    class Meta:
        model = User
        fields = ['nombre', 'username', 'email', 'rol', 'password1', 'password2']


class LoginForm(AuthenticationForm):
    """Formulario de inicio de sesión estándar."""
    pass
