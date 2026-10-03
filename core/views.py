from django.shortcuts import render


def index(request):
    """Renderiza la vista general de la aplicación."""
    return render(request, 'core/index.html')

