"""
Vistas de autenticación, registro y cierre de sesión de usuarios.
"""
from django.contrib.auth import login, logout
from django.shortcuts import redirect, render

from core.forms import LoginForm, NewUserForm


def register_user(request):
    """Registra una nueva cuenta de usuario e inicia sesión automáticamente."""
    if request.user.is_authenticated:
        return redirect('core:index')

    if request.method == 'POST':
        form_user = NewUserForm(request.POST)
        if form_user.is_valid():
            user = form_user.save()
            login(request, user)
            return redirect('core:index')
    else:
        form_user = NewUserForm()
    return render(request, 'register.html', {'register_form': form_user})


def login_user(request):
    """Autentica a un usuario existente mediante sus credenciales."""
    if request.user.is_authenticated:
        return redirect('core:index')

    if request.method == 'POST':
        form_user = LoginForm(request, data=request.POST)
        if form_user.is_valid():
            login(request, form_user.get_user())
            return redirect('core:index')
    else:
        form_user = LoginForm(request)

    return render(request, 'login.html', {'login_form': form_user})


def logout_user(request):
    """Cierra la sesión activa y redirige a la vista principal."""
    logout(request)
    return redirect('core:index')
