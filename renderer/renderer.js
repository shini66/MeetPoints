let state = {
  items: [],
  pendingDeleteId: null,
  lastDeleteTrigger: null
};

const STORAGE_KEYS = {
  theme: 'meetpoints.theme',
  language: 'meetpoints.language'
};

const preferences = {
  theme: localStorage.getItem(STORAGE_KEYS.theme) || 'light',
  language: localStorage.getItem(STORAGE_KEYS.language) || 'es'
};

const copy = {
  es: {
    appTitle: 'Checklist de entrevista',
    newInterview: 'Nueva entrevista',
    addPoint: 'Agregar punto',
    closeForm: 'Cerrar formulario',
    titlePlaceholder: 'Título',
    descriptionPlaceholder: 'Descripción',
    add: 'Agregar',
    delete: 'Eliminar',
    cancel: 'Cancelar',
    deletePointTitle: 'Eliminar punto',
    resetTooltip: 'Desmarca todos los checks sin borrar los puntos.',
    emptyState: 'Todavía no hay puntos cargados.',
    noDescription: 'Sin descripción.',
    saved: 'Guardado',
    deleted: 'Punto eliminado',
    resetDone: 'Checklist listo para una nueva entrevista',
    error: 'Algo falló. Probá de nuevo.',
    exportLabel: 'Exportar',
    exported: 'Exportado correctamente',
    importLabel: 'Importar',
    imported: 'Importado correctamente',
    dataMenuLabel: 'Más opciones',
    progress: '{checked}/{total} completados',
    deleteAria: 'Eliminar punto {title}',
    deleteMessage: 'Vas a eliminar "{title}". Esta acción no se puede deshacer.',
    deleteFallbackTitle: 'este punto',
    themeLabel: 'Modo oscuro',
    languageLabel: 'English',
    documentTitle: 'MeetPoints'
  },
  en: {
    appTitle: 'Interview checklist',
    newInterview: 'New interview',
    addPoint: 'Add point',
    closeForm: 'Close form',
    titlePlaceholder: 'Title',
    descriptionPlaceholder: 'Description',
    add: 'Add',
    delete: 'Delete',
    cancel: 'Cancel',
    deletePointTitle: 'Delete point',
    resetTooltip: 'Uncheck every item without deleting any points.',
    emptyState: 'There are no points yet.',
    noDescription: 'No description.',
    saved: 'Saved',
    deleted: 'Point deleted',
    resetDone: 'Checklist ready for a new interview',
    error: 'Something went wrong. Please try again.',
    exportLabel: 'Export',
    exported: 'Exported successfully',
    importLabel: 'Import',
    imported: 'Imported successfully',
    dataMenuLabel: 'More options',
    progress: '{checked}/{total} completed',
    deleteAria: 'Delete point {title}',
    deleteMessage: 'You are about to delete "{title}". This action cannot be undone.',
    deleteFallbackTitle: 'this point',
    themeLabel: 'Dark mode',
    languageLabel: 'Español',
    documentTitle: 'MeetPoints'
  }
};

function t(key, params = {}) {
  const value = copy[preferences.language][key] || key;

  return Object.entries(params).reduce((message, [paramKey, paramValue]) => {
    return message.replaceAll(`{${paramKey}}`, paramValue);
  }, value);
}

function syncDocumentLanguage() {
  document.documentElement.lang = preferences.language;
  document.title = t('documentTitle');
}

function updateControlButtons() {
  document.querySelector('#theme-toggle-btn input').checked = preferences.theme === 'dark';
  document.querySelector('#language-toggle-btn input').checked = preferences.language === 'en';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });

  updateControlButtons();
  syncDocumentLanguage();
}

function applyTheme() {
  document.documentElement.dataset.theme = preferences.theme;
}

function setStatus(message) {
  const element = document.getElementById('status');
  element.textContent = message;

  if (!message) {
    return;
  }

  setTimeout(() => {
    if (element.textContent === message) {
      element.textContent = '';
    }
  }, 1200);
}

function setFormVisible(isVisible) {
  const form = document.getElementById('add-point-form');
  const toggleButton = document.getElementById('toggle-form-btn');

  form.classList.toggle('hidden', !isVisible);
  toggleButton.setAttribute('aria-expanded', String(isVisible));
  toggleButton.textContent = isVisible ? t('closeForm') : t('addPoint');

  if (isVisible) {
    document.getElementById('point-title').focus();
  }
}

function resetForm() {
  document.getElementById('point-title').value = '';
  document.getElementById('point-description').value = '';
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  modal.classList.add('hidden');
  state.pendingDeleteId = null;

  if (state.lastDeleteTrigger?.isConnected) {
    state.lastDeleteTrigger.focus();
  }

  state.lastDeleteTrigger = null;
}

function openDeleteModal(item, triggerButton) {
  const modal = document.getElementById('delete-modal');
  const message = document.getElementById('delete-modal-message');
  const confirmButton = document.getElementById('confirm-delete-btn');
  const safeTitle = item.title || t('deleteFallbackTitle');

  state.pendingDeleteId = item.id;
  state.lastDeleteTrigger = triggerButton;
  message.textContent = t('deleteMessage', { title: safeTitle });
  modal.classList.remove('hidden');
  confirmButton.focus();
}

async function confirmDelete() {
  if (state.pendingDeleteId === null) {
    return;
  }

  try {
    state = {
      ...state,
      ...(await window.api.deleteItem(state.pendingDeleteId))
    };
    renderItems();
    closeDeleteModal();
    setStatus(t('deleted'));
  } catch (err) {
    console.error(err);
    setStatus(t('error'));
  }
}

function updateProgress() {
  const progressEl = document.getElementById('progress');
  const total = state.items.length;

  if (!total) {
    progressEl.textContent = '';
    return;
  }

  const checked = state.items.filter((item) => item.checked).length;
  progressEl.textContent = t('progress', { checked, total });
}

async function commitFieldEdit(item, field, value) {
  const newTitle = field === 'title' ? value : item.title;
  const newDescription = field === 'description' ? value : item.description;

  if (field === 'title' && !newTitle) {
    renderItems();
    return;
  }

  if (newTitle === item.title && newDescription === item.description) {
    renderItems();
    return;
  }

  try {
    state = await window.api.updateItem(item.id, newTitle, newDescription);
    renderItems();
    setStatus(t('saved'));
  } catch (err) {
    console.error(err);
    setStatus(t('error'));
  }
}

function startEditingField(item, element, field) {
  const isDescription = field === 'description';
  const input = document.createElement(isDescription ? 'textarea' : 'input');

  if (!isDescription) {
    input.type = 'text';
  } else {
    input.rows = 3;
  }

  input.className = isDescription ? 'item-description-input' : 'item-title-input';
  input.value = field === 'title' ? item.title : item.description;
  element.replaceWith(input);
  input.focus();
  input.select();

  let settled = false;

  input.addEventListener('blur', () => {
    if (settled) return;
    settled = true;
    commitFieldEdit(item, field, input.value.trim());
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !isDescription) {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Escape') {
      settled = true;
      renderItems();
    }
  });
}

async function moveItem(draggedId, targetId) {
  if (draggedId === targetId) return;

  const ids = state.items.map((item) => item.id);
  const fromIndex = ids.indexOf(draggedId);
  const toIndex = ids.indexOf(targetId);

  if (fromIndex === -1 || toIndex === -1) return;

  ids.splice(toIndex, 0, ids.splice(fromIndex, 1)[0]);

  try {
    state = await window.api.reorderItems(ids);
    renderItems();
  } catch (err) {
    console.error(err);
    setStatus(t('error'));
  }
}

function renderItems() {
  const container = document.getElementById('items');
  container.innerHTML = '';
  updateProgress();

  if (!state.items.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = t('emptyState');
    container.appendChild(emptyState);
    return;
  }

  state.items.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'item-row';
    row.draggable = true;

    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.id));
      row.classList.add('dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
    });

    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });

    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedId = Number(event.dataTransfer.getData('text/plain'));
      moveItem(draggedId, item.id);
    });

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⠿';
    dragHandle.setAttribute('aria-hidden', 'true');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', async () => {
      try {
        state = await window.api.toggleItem(item.id, checkbox.checked);
        renderItems();
        setStatus(t('saved'));
      } catch (err) {
        console.error(err);
        checkbox.checked = !checkbox.checked;
        setStatus(t('error'));
      }
    });

    const content = document.createElement('div');
    content.className = 'item-content';

    const title = document.createElement('h2');
    title.className = 'item-title';
    title.textContent = item.title;
    title.addEventListener('click', () => startEditingField(item, title, 'title'));

    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent = item.description || t('noDescription');
    description.addEventListener('click', () => startEditingField(item, description, 'description'));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-item-btn';
    deleteButton.textContent = t('delete');
    deleteButton.setAttribute('aria-label', t('deleteAria', { title: item.title }));
    deleteButton.addEventListener('click', () => {
      openDeleteModal(item, deleteButton);
    });

    if (item.checked) {
      row.classList.add('checked');
    }

    content.appendChild(title);
    content.appendChild(description);
    row.appendChild(dragHandle);
    row.appendChild(checkbox);
    row.appendChild(content);
    row.appendChild(deleteButton);
    container.appendChild(row);
  });
}

async function handleAddPoint() {
  const titleInput = document.getElementById('point-title');
  const descriptionInput = document.getElementById('point-description');
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  try {
    state = await window.api.addItem(title, description);
    renderItems();
    resetForm();
    setFormVisible(false);
    setStatus(t('saved'));
  } catch (err) {
    console.error(err);
    setStatus(t('error'));
  }
}

function setLanguage(language) {
  preferences.language = language;
  localStorage.setItem(STORAGE_KEYS.language, language);
  applyTranslations();
  renderItems();
  setFormVisible(!document.getElementById('add-point-form').classList.contains('hidden'));

  if (state.pendingDeleteId !== null) {
    const currentItem = state.items.find((item) => item.id === state.pendingDeleteId);

    if (currentItem) {
      openDeleteModal(currentItem, state.lastDeleteTrigger);
    }
  }
}

function toggleTheme() {
  preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.theme, preferences.theme);
  applyTheme();
  updateControlButtons();
}

function toggleLanguage() {
  setLanguage(preferences.language === 'es' ? 'en' : 'es');
}

async function init() {
  applyTheme();
  applyTranslations();

  try {
    state = await window.api.getState();
  } catch (err) {
    console.error(err);
    setStatus(t('error'));
  }

  setFormVisible(false);
  renderItems();

  const toggleFormButton = document.getElementById('toggle-form-btn');
  const submitPointButton = document.getElementById('submit-point-btn');
  const titleInput = document.getElementById('point-title');
  const deleteModal = document.getElementById('delete-modal');
  const cancelDeleteButton = document.getElementById('cancel-delete-btn');
  const confirmDeleteButton = document.getElementById('confirm-delete-btn');
  const themeToggleButton = document.getElementById('theme-toggle-btn');
  const languageToggleButton = document.getElementById('language-toggle-btn');

  toggleFormButton.addEventListener('click', () => {
    const isFormHidden = document.getElementById('add-point-form').classList.contains('hidden');

    if (!isFormHidden) {
      resetForm();
    }

    setFormVisible(isFormHidden);
  });

  submitPointButton.addEventListener('click', handleAddPoint);

  const dataMenuButton = document.getElementById('data-menu-btn');
  const dataMenu = document.getElementById('data-menu');

  function setDataMenuVisible(isVisible) {
    dataMenu.classList.toggle('hidden', !isVisible);
    dataMenuButton.setAttribute('aria-expanded', String(isVisible));
  }

  dataMenuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setDataMenuVisible(dataMenu.classList.contains('hidden'));
  });

  document.addEventListener('click', (event) => {
    if (!dataMenu.classList.contains('hidden') && !dataMenu.contains(event.target)) {
      setDataMenuVisible(false);
    }
  });

  document.getElementById('export-btn').addEventListener('click', async () => {
    setDataMenuVisible(false);
    try {
      const result = await window.api.exportData();
      if (result.exported) {
        setStatus(t('exported'));
      }
    } catch (err) {
      console.error(err);
      setStatus(t('error'));
    }
  });
  document.getElementById('import-btn').addEventListener('click', async () => {
    setDataMenuVisible(false);
    try {
      const result = await window.api.importData();
      if (result.imported) {
        state = result.state;
        renderItems();
        setStatus(t('imported'));
      }
    } catch (err) {
      console.error(err);
      setStatus(t('error'));
    }
  });
  cancelDeleteButton.addEventListener('click', closeDeleteModal);
  confirmDeleteButton.addEventListener('click', confirmDelete);
  themeToggleButton.querySelector('input').addEventListener('change', toggleTheme);
  languageToggleButton.querySelector('input').addEventListener('change', toggleLanguage);
  titleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddPoint();
    }
  });

  deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (!deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
    } else if (!dataMenu.classList.contains('hidden')) {
      setDataMenuVisible(false);
    }
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    try {
      state = await window.api.resetInterview();
      renderItems();
      setStatus(t('resetDone'));
    } catch (err) {
      console.error(err);
      setStatus(t('error'));
    }
  });
}

init();
