"""
Formularios de autenticación, registro de usuarios y gestión de horarios docentes.
"""
from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.core.exceptions import ValidationError

from core.models import BloqueHorario, Profesor, User


class NewUserForm(UserCreationForm):
    """Formulario de registro para crear cuentas con nombre y rol institucional."""

    profesor = forms.ModelChoiceField(
        queryset=Profesor.objects.none(),
        required=False,
        label='Perfil docente',
        empty_label='Selecciona tu nombre de profesor...',
    )

    class Meta:
        model = User
        fields = ['nombre', 'username', 'email', 'rol', 'password1', 'password2']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Se consulta dinámicamente para excluir profesores que ya crearon cuenta
        self.fields['profesor'].queryset = Profesor.objects.filter(
            user__isnull=True
        ).order_by('nombre', 'pk')

    def clean(self):
        cleaned_data = super().clean()
        rol = cleaned_data.get('rol')
        profesor = cleaned_data.get('profesor')

        if rol == 'PROFESOR' and not profesor:
            self.add_error('profesor', 'Debes seleccionar tu perfil docente de la lista.')
        elif rol != 'PROFESOR':
            cleaned_data['profesor'] = None

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=commit)
        profesor = self.cleaned_data.get('profesor')
        if commit and user.rol == 'PROFESOR' and profesor:
            profesor.user = user
            profesor.save(update_fields=['user'])
        return user


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


class BloqueHorarioForm(forms.ModelForm):
    """Formulario para crear bloques semanales de atención de un profesor."""

    class Meta:
        model = BloqueHorario
        fields = ['dia_semana', 'hora_inicio', 'hora_fin']
        widgets = {
            'hora_inicio': forms.TimeInput(attrs={'type': 'time', 'required': True}),
            'hora_fin': forms.TimeInput(attrs={'type': 'time', 'required': True}),
        }

    def __init__(self, *args, profesor=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.profesor = profesor

    def clean(self):
        cleaned_data = super().clean()
        dia = cleaned_data.get('dia_semana')
        inicio = cleaned_data.get('hora_inicio')
        fin = cleaned_data.get('hora_fin')

        if inicio and fin:
            if inicio >= fin:
                raise ValidationError('La hora de término debe ser posterior a la de inicio.')

            if self.profesor and dia:
                solapados = BloqueHorario.objects.filter(
                    profesor=self.profesor,
                    dia_semana=dia,
                    hora_inicio__lt=fin,
                    hora_fin__gt=inicio,
                )
                if solapados.exists():
                    raise ValidationError(f'Ya tienes un bloque que se cruza en ese horario el {dia}.')

        return cleaned_data