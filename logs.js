let config;
let refreshInterval;
let allRequests = []; // Храним все запросы для фильтрации
let currentFilter = ''; // Текущий фильтр

function fetchConfig() {
    return fetch('config.json')
        .then(response => response.json())
        .then(data => {
            config = data;
        });
}

function getDate(loggedDateString) {
    let date = new Date(loggedDateString);
    let day = ("0" + date.getDate()).slice(-2);
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let year = date.getFullYear();
    let hours = ("0" + date.getHours()).slice(-2);
    let minutes = ("0" + date.getMinutes()).slice(-2);
    let seconds = ("0" + date.getSeconds()).slice(-2);
    return `${hours}:${minutes}:${seconds} ${day}.${month}.${year}`;
}

function filterRequests(filterText) {
    currentFilter = filterText; // Сохраняем текущий фильтр
    const filteredRequests = filterText
        ? allRequests.filter(request => 
            request.request.url.toLowerCase().includes(filterText.toLowerCase()))
        : allRequests;
    
    renderRequestList(filteredRequests);
}

function fetchRequests() {
    $('#loading-spinner').show();
    return $.get(`${config.serverUrl}/__admin/requests`)
        .then(function(data) {
            allRequests = data.requests || []; // Сохраняем все запросы
            filterRequests(currentFilter); // Применяем текущий фильтр
            $('#loading-spinner').hide();
        })
        .fail(function() {
            $('#loading-spinner').hide();
        });
}

// Отдельная функция для отрисовки списка
function renderRequestList(requests) {
    function truncateUrl(url, maxLength = 25) {
        return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }

    // Сортируем запросы по дате (новые вверху)
    const sortedRequests = [...requests].sort((a, b) => {
        return b.request.loggedDate - a.request.loggedDate;
    });

    let listHTML = '<ul class="list-group">';
    
    sortedRequests.forEach(request => {
        const reqData = request.request;
        if (reqData) {
            const dateTime = reqData.loggedDateString ? getDate(reqData.loggedDateString) : 'Дата не указана';
            const method = reqData.method || 'UNKNOWN';
            const url = reqData.url || 'URL не указан';
            const truncatedUrl = truncateUrl(url);
            listHTML += `
                <li class="list-group-item" data-request-id="${request.id}" title="${url}">        
                    <div style="display: flex; justify-content: space-between;">
                        <div>${method} ${truncatedUrl}</div>
                        <div>${dateTime}</div>
                    </div>
                </li>`;
        }
    });
    
    listHTML += '</ul>';
    $('#request-list').html(listHTML);
}

function getRequestDetails(requestId) {
    $.get(`${config.serverUrl}/__admin/requests/${requestId}`, function(data) {
        displayRequestDetails(data);
    });
}

function displayRequestDetails(request) {
    function formatJSON(json) {
        if (!json) return "";
        try {
            return JSON.stringify(json, null, 2)
                .replace(/\\n/g, '\n')
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t')
                .replace(/\}"/g, '}')
                .replace(/"\{/g, '{');
        } catch (e) {
            return "Ошибка форматирования JSON";
        }
    }

    const reqData = request.request;
    const respData = request.response || {};

    let detailsREQ = `
        <div class="card-header">${reqData.method || 'UNKNOWN'} ${reqData.url || 'URL не указан'}</div>
        <div class="card-body">
            <h5 class="card-title">Заголовки запроса</h5>
            <pre>${formatJSON(reqData.headers)}</pre>
            <h5 class="card-title">Тело запроса</h5>
            <pre>${formatJSON(reqData.body)}</pre>
        </div>`;

    $('#request-details').html(detailsREQ);

    let detailsRESP = `
        <div class="card-header">${reqData.method || 'UNKNOWN'} ${reqData.url || 'URL не указан'}</div>
        <div class="card-body">
            <h5 class="card-title">Заголовки ответа</h5>
            <pre>${formatJSON(respData.headers)}</pre>
            <h5 class="card-title">Тело ответа</h5>
            <pre>${formatJSON(respData.body)}</pre>
        </div>`;

    $('#response-details').html(detailsRESP);
}

function clearLogs() {
    $.ajax({
        url: `${config.serverUrl}/__admin/requests`,
        type: 'DELETE',
        success: function() {
            allRequests = []; // Очищаем сохраненные запросы
            renderRequestList([]);
        },
        error: function() {
            alert('Ошибка удаления логов');
        }
    });
}

function startInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    let interval = parseInt($('#refresh-interval').val(), 10);
    refreshInterval = setInterval(fetchRequests, interval);
}

$(document).ready(function() {
    // Обработчик фильтрации
    $('#filter-input').on('input', function() {
        filterRequests($(this).val().trim());
    });

    // Обработчик клика по элементу списка
    $('#request-list').on('click', 'li', function() {
        var requestId = $(this).attr('data-request-id');
        getRequestDetails(requestId);
    });

    $('#clear-logs').on('click', function() {
        clearLogs();
    });

    $('#refresh-interval').on('change', function() {
        startInterval();
    });

    fetchConfig().then(() => {
        fetchRequests();
        startInterval();
    });
});