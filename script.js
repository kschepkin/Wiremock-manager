// Загружаем конфиг
let config;
fetch('config.json')
    .then(response => response.json())
    .then(data => {
        config = data;
        fetchMappings();
        fetchFiles();
    });

const mappingsList = document.getElementById('mappings-list');
const mappingEditor = document.getElementById('mapping-editor');
const saveMapping = document.getElementById('save-mapping');
const filesList = document.getElementById('files-list');
const fileEditor = document.getElementById('file-editor');
const saveFile = document.getElementById('save-file');
const createMapping = document.getElementById('create-mapping');
const createFile = document.getElementById('create-file');
const newFileName = document.getElementById('new-file-name');
// const deleteAllMappings = document.getElementById('delete-all-mappings');

function showToast(type, message) {
    const toastElement = document.getElementById(`${type}-toast`);
    const toastBody = toastElement.querySelector('.toast-body');
    toastBody.innerText = message;

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });
    toast.show();
}


// Работа с маппингами
function fetchMappings() {
    fetch(`${config.serverUrl}/__admin/mappings`)
        .then(response => response.json())
        .then(data => {
            mappingsList.innerHTML = '';

            data.mappings.forEach(mapping => {
                const card = document.createElement('div');
                card.classList.add('card', 'mapping-card');

                const cardHeader = document.createElement('div');
                cardHeader.classList.add('card-header', 'd-flex', 'justify-content-between', 'align-items-center');
                const mappingTitle = document.createElement('span');
                mappingTitle.innerText = mapping.request.url;
                cardHeader.appendChild(mappingTitle);

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-danger', 'mb-1', 'ms-3');
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteMapping(mapping.id);
                });
                cardHeader.appendChild(deleteButton);
                card.appendChild(cardHeader);

                if (mapping.scenarioName && mapping.requiredScenarioState) {
                    const cardBody = document.createElement('div');
                    cardBody.classList.add('card-body');

                    const scenarioName = document.createElement('p');
                    scenarioName.innerHTML = `<strong>Сценарий:</strong> ${mapping.scenarioName}`;
                    cardBody.appendChild(scenarioName);

                    const requiredScenarioState = document.createElement('p');
                    requiredScenarioState.innerHTML = `<strong>Требуемое состояние:</strong> ${mapping.requiredScenarioState}`;
                    cardBody.appendChild(requiredScenarioState);

                    card.appendChild(cardBody);
                }

                card.addEventListener('click', () => fetchMapping(mapping.id));
                mappingsList.appendChild(card);
            });
        })
        .catch(() => {
            showToast("error", "Ошибка получения данных.");
        });
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
    const mappingEditor = document.getElementById('mapping-editor');
    let currentMapping;

    try {
        currentMapping = JSON.parse(mappingEditor.value);
    } catch (e) {
        mappingOptionSelect.selectedIndex = 0;
        return;
    }
    delete currentMapping.id;
    delete currentMapping.uuid;

    mappingEditor.value = JSON.stringify(currentMapping, null, 2);
}

let isEditing = false;

function fetchMapping(id) {
    fetch(`${config.serverUrl}/__admin/mappings/${id}`)
        .then(response => response.json())
        .then(data => {
            mappingEditor.value = JSON.stringify(data, null, 2);
            isEditing = true;
        });
}

function createNewMapping() {
    mappingEditor.value = JSON.stringify({
        "request": {
            "url": "/example",
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

createMapping.addEventListener('click', () => { createNewMapping(); });

saveMapping.addEventListener('click', () => {
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
                fetchMappings();
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
});



// Работа с файлами
function fetchFiles() {
    fetch(`${config.serverUrl}/__admin/files`)
        .then(response => response.json())
        .then(data => {
            filesList.innerHTML = '';

            data.forEach(file => {
                const filePathParts = file.split('/');
                const fileName = filePathParts[filePathParts.length - 1];

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
                    e.stopPropagation(); // Останавливаем всплытие события, чтобы избежать выбора файла
                    deleteFile(fileName);
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
            });
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
    fetch(`${config.serverUrl}/__files/${filename}`)
        .then(response => response.text())
        .then(data => {
            fileEditor.value = data;
            newFileName.value = filename; // Сохраняем имя файла в поле для ввода имени файла
        });
}



saveFile.addEventListener('click', () => {
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
});


// deleteAllMappings.addEventListener('click', () => {
//     fetch(`${config.serverUrl}/__admin/mappings`, {
//         method: 'DELETE'
//     }).then(() => {
//         fetchMappings();
//     });
// });

function applyMappingOption() {
    const mappingOptionSelect = document.getElementById('mapping-option');
    const mappingOption = mappingOptionSelect.value;
    const mappingEditor = document.getElementById('mapping-editor');
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
        currentMapping.requiredScenarioState = "started";
    } else {
        showToast("error", "Ошибка применения опции.");
        mappingOptionSelect.selectedIndex = 0;
        return;
    }

    mappingEditor.value = JSON.stringify(currentMapping, null, 2);
    showToast("info", "Применено, сохраните маппинг.");
    mappingOptionSelect.selectedIndex = 0;
}


document.getElementById('mapping-option').addEventListener('change', () => {
    applyMappingOption();
});




fetchMappings();
fetchFiles();