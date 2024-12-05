// Глобальная конфигурация
let config;

// DOM элементы
const mappingsContainer = document.getElementById('mappings-container');
const mappingsList = document.getElementById('mappings-list');
const mappingEditor = document.getElementById('mapping-editor');
const saveMapping = document.getElementById('save-mapping');
const filesList = document.getElementById('files-list');
const fileEditor = document.getElementById('file-editor');
const saveFile = document.getElementById('save-file');
const createMapping = document.getElementById('create-mapping');
const createFile = document.getElementById('create-file');
const newFileName = document.getElementById('new-file-name');
const projectFilter = document.getElementById('project-filter');
const fileFilterInput = document.getElementById('file-filter');

// Инициализация приложения
async function initializeApp() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        
        // После загрузки конфигурации инициализируем основные компоненты
        fetchMappings();
        fetchFiles();
        
        // Инициализируем обработчики событий
        setupEventListeners();
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showToast("error", "Ошибка загрузки конфигурации.");
    }
}

function showToast(type, message) {
    const toastElement = document.getElementById(`${type}-toast`);
    const toastBody = toastElement.querySelector('.toast-body');
    toastBody.innerText = message;

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });
    toast.show();
}

function getElementSizeInRem(element) {
    const computedStyle = window.getComputedStyle(element);
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const widthInPixels = parseFloat(computedStyle.width);
    const heightInPixels = parseFloat(computedStyle.height);
    const widthInRem = widthInPixels / rootFontSize;
    const heightInRem = heightInPixels / rootFontSize;
    return {
        width: widthInRem,
        height: heightInRem
    };
}

// Работа с маппингами
function fetchMappings(filter = '') {
    let url;
    url = `${config.serverUrl}/__admin/mappings`;
    let options = {};

    if (filter) {
        url = `${config.serverUrl}/__admin/mappings/find-by-metadata`;
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contains: filter })
        };
    }

    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            mappingsList.innerHTML = '';

            // Собираем проекты для фильтра при загрузке страницы
            if (!filter) {
                const projects = new Set();

                data.mappings.forEach(mapping => {
                    if (mapping.metadata && mapping.metadata.project) {
                        projects.add(mapping.metadata.project);
                    }
                });

                updateProjectFilter(projects);
            }

            data.mappings.forEach(mapping => {
                const card = document.createElement('div');
                card.classList.add('card', 'mapping-card');

                const cardHeader = document.createElement('div');
                cardHeader.classList.add('card-header', 'd-flex', 'justify-content-between', 'align-items-center');

                const mappingTitleContainer = document.createElement('div');
                mappingTitleContainer.classList.add('mapping-title-container');
                const mappingTitle = document.createElement('p');
                const mappingProjectTitle = document.createElement('p');

                if (mapping.metadata && mapping.metadata.project) {
                    mappingProjectTitle.innerHTML = `<strong>${mapping.metadata.project}</strong>`;
                }
                if (mapping.metadata && mapping.metadata.service) {
                    mappingProjectTitle.innerHTML += `<strong>/${mapping.metadata.service}</strong>`;
                }
                mappingTitleContainer.appendChild(mappingProjectTitle);

                let title;
                if (mapping.request.urlPattern) {
                    title = mapping.request.urlPattern;
                } else if (mapping.request.urlPath) {
                    title = mapping.request.urlPath;
                } else if (mapping.request.url) {
                    title = mapping.request.url;
                } else if (mapping.request.urlPathPattern) {
                    title = mapping.request.urlPathPattern;
                }

                if (mapping.response.proxyBaseUrl) {
                    mappingTitle.innerText = title + " (Proxy)";
                } else {
                    mappingTitle.innerText = title;
                }

                mappingTitleContainer.appendChild(mappingTitle);
                cardHeader.appendChild(mappingTitleContainer);

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-danger', 'mb-1', 'ms-3');
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Открываем модальное окно для подтверждения удаления
                    const mappingDeletionModal = new bootstrap.Modal(document.getElementById('deleteMappingModal'));
                    mappingDeletionModal.show();

                    const confirmMappingDeletionBtn = document.getElementById('confirmDeleteMapping');

                    // Удаляем предыдущий обработчик событий, если он существует
                    const newConfirmMappingDeletionBtn = confirmMappingDeletionBtn.cloneNode(true);
                    confirmMappingDeletionBtn.parentNode.replaceChild(newConfirmMappingDeletionBtn, confirmMappingDeletionBtn);

                    // Обработка подтверждения удаления маппинга
                    newConfirmMappingDeletionBtn.addEventListener('click', () => {
                        mappingDeletionModal.hide();
                        deleteMapping(mapping.id);
                    });
                });
                cardHeader.appendChild(deleteButton);
                card.appendChild(cardHeader);

                if (mapping.scenarioName || (mapping.request.bodyPatterns && mapping.request.bodyPatterns.length > 0)) {
                    const cardBody = document.createElement('div');
                    cardBody.classList.add('card-body');

                    if (mapping.request.bodyPatterns && mapping.request.bodyPatterns.length > 0) {
                        const containsPattern = mapping.request.bodyPatterns.find(pattern => pattern.contains);

                        if (containsPattern) {
                            const containsInfo = document.createElement('p');
                            containsInfo.innerHTML = `<strong>Если содержит:</strong> ${containsPattern.contains}`;
                            cardBody.appendChild(containsInfo);
                        }
                    }

                    //Добавляем блок с данными сценария под заголовком маппинга
                    if (mapping.scenarioName) {
                        const scenarioName = document.createElement('p');
                        scenarioName.innerHTML = `<strong>Сценарий:</strong> ${mapping.scenarioName}`;
                        cardBody.appendChild(scenarioName);
                    }

                    if (mapping.requiredScenarioState) {
                        const requiredScenarioState = document.createElement('p');
                        requiredScenarioState.innerHTML = `<strong>Требуемое состояние:</strong> ${mapping.requiredScenarioState}`;
                        cardBody.appendChild(requiredScenarioState);
                    }

                    card.appendChild(cardBody);
                }

                card.addEventListener('click', () => fetchMapping(mapping.id));
                mappingsList.appendChild(card);
            });

        })
        .catch(() => {
            showToast("error", "Ошибка получения данных.");
        });

    const sizeInRem = getElementSizeInRem(mappingEditor);
    mappingsList.style.maxHeight = sizeInRem.height + 5 + 'rem';
}

function updateProjectFilter(projects) {
    // Очищаем фильтр проектов
    const currentValue = projectFilter.value;
    projectFilter.innerHTML = '<option value="">Все проекты</option>';

    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });

    // Сохраняем выбранный ранее фильтр
    if (currentValue) {
        projectFilter.value = currentValue;
    }
}

function deleteMapping(id) {
    fetch(`${config.serverUrl}/__admin/mappings/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                fetchMappings();
                showToast("success", "Удалено.");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error", "Ошибка сохранения.");
        });
}

let isEditing = false;

function fetchMapping(id) {
    fetch(`${config.serverUrl}/__admin/mappings/${id}`)
        .then(response => response.json())
        .then(data => {
            mappingEditor.value = JSON.stringify(data, null, 2);
            isEditing = true;

            // Проверяем наличие bodyFileName и загружаем содержимое файла
            if (data.response && data.response.bodyFileName) {
                fetchFileContent(data.response.bodyFileName);
            }
        });
}

function createNewMapping() {
    mappingEditor.value = JSON.stringify({
        "request": {
            "urlPattern": "/example",
            "method": "ANY"
        },
        "response": {
            "status": 200,
            "bodyFileName": "example.json",
            "headers": {
                "Content-Type": "application/json"
            }
        },
        "persistent": true,
        "metadata": {}
    }, null, 2);

    isEditing = false;
}

function handleSaveMapping() {
    const mapping = JSON.parse(mappingEditor.value);
    let requestUrl;
    let requestMethod;

    if (isEditing && mapping.id) {
        requestUrl = `${config.serverUrl}/__admin/mappings/${mapping.id}`;
        requestMethod = 'PUT';
    } else {
        requestUrl = `${config.serverUrl}/__admin/mappings`;
        requestMethod = 'POST';
    }

    fetch(requestUrl, {
        method: requestMethod,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapping)
    })
        .then((response) => {
            if (response.ok) {
                const selectedProject = projectFilter.value;
                fetchMappings(selectedProject);
                showToast("success", "Сохранено");
                saveMapping.classList.add("btn-success");
                setTimeout(() => {
                    saveMapping.classList.remove("btn-success");
                }, 1000);
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch((error) => {
            console.error("Ошибка:", error);
            showToast("error", "Ошибка сохранения данных.");
            saveMapping.classList.add("btn-danger");
            setTimeout(() => {
                saveMapping.classList.remove("btn-danger");
            }, 1000);
        });
}

// Работа с файлами
function fetchFiles() {
    fetch(`${config.serverUrl}/__admin/files`)
        .then(response => response.json())
        .then(data => {
            // Если файлов больше 6, показываем поле фильтрации
            if (data.length > 6) {
                fileFilterInput.style.display = 'block';

                // Добавляем обработчик события для фильтрации
                fileFilterInput.addEventListener('input', function() {
                    const filterText = this.value.toLowerCase();
                    displayFiles(data, filterText);
                });
            } else {
                fileFilterInput.style.display = 'none';
            }

            // Отображаем файлы (возможно, с фильтрацией)
            displayFiles(data, fileFilterInput.value.toLowerCase());
        });
}

function displayFiles(filesData, filterText) {
    filesList.innerHTML = '';

    filesData.forEach(file => {
        const filePathParts = file.split('/');
        const fileName = filePathParts[filePathParts.length - 1];

        if (fileName.toLowerCase().includes(filterText)) {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'hstack', 'gap-3', 'd-flex', 'justify-content-between');

            // Создаем элемент для имени файла
            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = fileName;
            listItem.appendChild(fileNameSpan);

            // Создаем кнопку "удалить"
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('btn', 'btn-danger', 'mb-1');
            deleteButton.textContent = 'X';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // Открываем модальное окно для подтверждения удаления
                const fileDeletionModal = new bootstrap.Modal(document.getElementById('fileDeletionModal'));
                fileDeletionModal.show();

                const confirmFileDeletionBtn = document.getElementById('confirmFileDeletion');

                // Удаляем предыдущий обработчик событий, если он существует
                const newConfirmFileDeletionBtn = confirmFileDeletionBtn.cloneNode(true);
                confirmFileDeletionBtn.parentNode.replaceChild(newConfirmFileDeletionBtn, confirmFileDeletionBtn);

                // Обработка подтверждения удаления файла
                newConfirmFileDeletionBtn.addEventListener('click', () => {
                    fileDeletionModal.hide();
                    deleteFile(fileName);
                });
            });

            // Создаем элемент для кнопки удаления
            const deleteButtonSpan = document.createElement('span');
            deleteButtonSpan.appendChild(deleteButton);
            listItem.appendChild(deleteButtonSpan);

            listItem.addEventListener('click', () => {
                fetchFileContent(fileName);
                newFileName.value = fileName;
            });
            filesList.appendChild(listItem);
        }
    });
}

function deleteFile(fileName) {
    fetch(`${config.serverUrl}/__admin/files/${fileName}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                fetchFiles();
                showToast("success", "Файл удален.");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error", "Произошла ошибка.");
        });
}

function fetchFileContent(filename) {
    url = `${config.serverUrl}/__files/${filename}`;
    fetch(url)
        .then(response => response.text())
        .then(data => {
            fileEditor.value = data;
            newFileName.value = filename; // Сохраняем имя файла в поле для ввода имени файла
        });
}

function handleSaveFile() {
    const filename = newFileName.value;
    const fileContent = fileEditor.value;

    if (filename === '') {
        showToast("error", "Введите имя или выберите файл из списка.");
        return;
    }

    fetch(`${config.serverUrl}/__admin/files/${filename}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: fileContent
    })
        .then(response => {
            if (response.ok) {
                fetchFiles();
                saveFile.classList.add("btn-success");
                setTimeout(() => {
                    saveFile.classList.remove("btn-success");
                }, 1000);
                showToast("success", "Файл сохранен.");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error", "Ошибка сохранения данных.");
        });
}

function applyMappingOption() {
    const mappingOptionSelect = document.getElementById('mapping-option');
    const mappingOption = mappingOptionSelect.value;
    let currentMapping;

    try {
        currentMapping = JSON.parse(mappingEditor.value);
    } catch (e) {
        showToast("error", "Проверьте корректность данных.");
        mappingOptionSelect.selectedIndex = 0;
        return;
    }

    if (!currentMapping.response) {
        currentMapping.response = {
            "status": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "bodyFileName": "example.json"
        };
    }

    if (mappingOption === 'delay') {
        currentMapping.response.fixedDelayMilliseconds = 5000;
    } else if (mappingOption === 'status500') {
        currentMapping.response.status = 500;
    } else if (mappingOption === 'body-replace') {
        delete currentMapping.response.bodyFileName;
        currentMapping.response.body = "example";
    } else if (mappingOption === 'scenario') {
        currentMapping.scenarioName = "Scenario1";
        currentMapping.newScenarioState = "active";
        currentMapping.requiredScenarioState = "Started";
    } else if (mappingOption === 'priority') {
        currentMapping.priority = 1;
    } else if (mappingOption === 'contains') {
        currentMapping.request.bodyPatterns = [{ "contains": "текст поиска" }];
    } else if (mappingOption === 'proxy') {
        currentMapping.response = {
            "proxyBaseUrl": "http://otherhost.com/proxy"
        };
    } else if (mappingOption === 'project') {
        if (!currentMapping.metadata) {
            currentMapping.metadata = {};
        }
        currentMapping.metadata.project = "Мой проект";
    } else if (mappingOption === 'service') {
        if (!currentMapping.metadata) {
            currentMapping.metadata = {};
        }
        currentMapping.metadata.service = "Мой сервис";
    } else {
        showToast("error", "Ошибка применения опции.");
        mappingOptionSelect.selectedIndex = 0;
        return;
    }

    mappingEditor.value = JSON.stringify(currentMapping, null, 2);
    showToast("info", "Применено, сохраните маппинг.");
    mappingOptionSelect.selectedIndex = 0;
}

// Настройка обработчиков событий
function setupEventListeners() {
    projectFilter.addEventListener('change', () => {
        const selectedProject = projectFilter.value;
        fetchMappings(selectedProject);
    });

    createMapping.addEventListener('click', createNewMapping);
    
    saveMapping.addEventListener('click', handleSaveMapping);
    
    saveFile.addEventListener('click', handleSaveFile);
    
    document.getElementById('mapping-option').addEventListener('change', applyMappingOption);
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeApp);