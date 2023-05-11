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
const deleteAllMappings = document.getElementById('delete-all-mappings');

function showToast(type) {
    const toast = new bootstrap.Toast(document.getElementById(`${type}-toast`), {
        delay: 4000
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
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'hstack', 'gap-3');
                li.innerText = mapping.request.url;

                // Создаем кнопку "удалить"
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-danger', 'mb-1');
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Останавливаем всплытие события, чтобы избежать выбора маппинга
                    deleteMapping(mapping.id);
                });

                li.appendChild(deleteButton);
                li.addEventListener('click', () => fetchMapping(mapping.id));
                mappingsList.appendChild(li);
            });
        });
}

function deleteMapping(id) {
    fetch(`${config.serverUrl}/__admin/mappings/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                fetchMappings();
                showToast("success");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error");
        });
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
                showToast("success");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch((error) => {
            console.error("Ошибка:", error);
            showToast("error");
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
                listItem.classList.add('list-group-item', 'hstack', 'gap-3');
                listItem.textContent = fileName;

                // Создаем кнопку "удалить"
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-danger', 'mb-1');
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Останавливаем всплытие события, чтобы избежать выбора файла
                    deleteFile(fileName);
                });

                listItem.appendChild(deleteButton);
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
                showToast("success");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error");
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
        alert('Пожалуйста, введите имя файла.');
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
                }, 4000);
                showToast("success");
            } else {
                throw new Error("Ошибка сервера");
            }
        })
        .catch(error => {
            console.error("Ошибка:", error);
            showToast("error");
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
        showToast("error");
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
    } else {
        showToast("error");
        mappingOptionSelect.selectedIndex = 0;
        return;
    }

    mappingEditor.value = JSON.stringify(currentMapping, null, 2);
    showToast("success", "Опция применена успешно.");
    mappingOptionSelect.selectedIndex = 0;
}


document.getElementById('mapping-option').addEventListener('change', () => {
    applyMappingOption();
});




fetchMappings();
fetchFiles();