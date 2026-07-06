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

function renderItems() {
  const container = document.getElementById('items');
  container.innerHTML = '';

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

    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent = item.description || t('noDescription');

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
  document.getElementById('export-btn').addEventListener('click', async () => {
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
    if (event.key === 'Escape' && !deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
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
