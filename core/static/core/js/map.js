/**
 * ==============================================================================
 * CONTROLADOR PRINCIPAL DEL MAPA INTERACTIVO DCC (BEAUCHEF 851)
 * CC4401 - Ingeniería de Software (Primavera 2026)
 * ==============================================================================
 */

// Estado global de la aplicación
const AppState = {
  currentView: 'general',
  currentFloor: 3,
};

document.addEventListener('DOMContentLoaded', () => {
  // Manejo de accesibilidad por teclado para los edificios
  const edificios = document.querySelectorAll('.interactive-building');
  edificios.forEach(edificio => {
    edificio.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Elementos interactivos reservados para futura navegación
      }
    });
  });

  // Control interactivo del selector de piso
  const floorBtn = document.getElementById('floorSelectorBtn');
  const floorMenu = document.getElementById('floorDropdownMenu');
  const floorLabel = document.getElementById('currentFloorLabel');
  const floorOptions = document.querySelectorAll('.floor-option');

  if (floorBtn && floorMenu) {
    // Alternar visibilidad del menú desplegable
    floorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = floorBtn.getAttribute('aria-expanded') === 'true';
      toggleFloorMenu(!isExpanded);
    });

    const toggleFloorMenu = (open) => {
      floorBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        floorMenu.removeAttribute('hidden');
        // Enfocar la opción actualmente activa
        const activeOption = floorMenu.querySelector('.floor-option.active');
        if (activeOption) {
          activeOption.focus();
        }
      } else {
        floorMenu.setAttribute('hidden', '');
      }
    };

    const selectFloor = (option) => {
      const floorValue = option.getAttribute('data-floor');
      const floorText = option.querySelector('span')?.textContent.trim() || option.textContent.trim();

      // Actualizar etiqueta del botón
      if (floorLabel) {
        floorLabel.textContent = floorText;
      }
      floorBtn.setAttribute('aria-label', `Selector de piso. ${floorText} seleccionado`);

      // Actualizar clases activas y atributos ARIA
      floorOptions.forEach(opt => {
        opt.classList.remove('active');
        opt.removeAttribute('aria-selected');
        // Remover cualquier check icon previo
        const existingCheck = opt.querySelector('.floor-check-icon');
        if (existingCheck) existingCheck.remove();
      });

      option.classList.add('active');
      option.setAttribute('aria-selected', 'true');

      // Agregar icono checkmark a la opción seleccionada
      const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      checkSvg.setAttribute('class', 'floor-check-icon');
      checkSvg.setAttribute('viewBox', '0 0 24 24');
      checkSvg.setAttribute('width', '14');
      checkSvg.setAttribute('height', '14');
      checkSvg.setAttribute('fill', 'none');
      checkSvg.setAttribute('stroke', 'currentColor');
      checkSvg.setAttribute('stroke-width', '2.5');
      checkSvg.setAttribute('stroke-linecap', 'round');
      checkSvg.setAttribute('stroke-linejoin', 'round');
      checkSvg.setAttribute('aria-hidden', 'true');
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      checkSvg.appendChild(polyline);
      option.appendChild(checkSvg);

      // Guardar estado
      AppState.currentFloor = parseInt(floorValue, 10) || floorValue;

      // Cerrar menú y devolver foco al botón
      toggleFloorMenu(false);
      floorBtn.focus();
    };

    // Selección de opciones de piso
    floorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFloor(option);
      });

      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectFloor(option);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = option.nextElementSibling;
          if (next && next.classList.contains('floor-option')) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = option.previousElementSibling;
          if (prev && prev.classList.contains('floor-option')) prev.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          toggleFloorMenu(false);
          floorBtn.focus();
        }
      });
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!floorBtn.contains(e.target) && !floorMenu.contains(e.target)) {
        toggleFloorMenu(false);
      }
    });

    // Cerrar con Escape desde cualquier parte si está abierto
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !floorMenu.hasAttribute('hidden')) {
        toggleFloorMenu(false);
        floorBtn.focus();
      }
    });
  }
});
