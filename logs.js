let config;
let refreshInterval;
let lastSearchQuery = '';

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

function searchRequests(searchQuery) {
    $('#loading-spinner').show();
    const requestBody = {
        method: null,
        urlPattern: null
    };

    // Определяем, является ли поисковый запрос HTTP методом
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    const upperQuery = searchQuery.toUpperCase();
    
    if (httpMethods.includes(upperQuery)) {
        requestBody.method = upperQuery;
    } else if (searchQuery) {
        requestBody.urlPattern = `.*${searchQuery}.*`;
    }

    // Если строка поиска пуста, используем обычный метод получения всех запросов
    if (!searchQuery) {
        return fetchRequests();
    }

    return fetch(`${config.serverUrl}/__admin/requests/find`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        const requests = (data && data.requests) ? data.requests : [];
        populateRequestList(requests, true);
        $('#loading-spinner').hide();
    })
    .catch(error => {
        console.error('Error searching requests:', error);
        $('#loading-spinner').hide();
    });
}

function fetchRequests() {
    $('#loading-spinner').show();
    return $.get(`${config.serverUrl}/__admin/requests`)
        .then(function(data) {
            populateRequestList(data.requests || [], false);
            $('#loading-spinner').hide();
        })
        .fail(function() {
            $('#loading-spinner').hide();
        });
}

function populateRequestList(requests = [], isSearch = false) {
    function truncateUrl(url, maxLength = 25) {
        return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }

    // Сортируем запросы по дате (новые вверху)
    const sortedRequests = [...requests].sort((a, b) => {
        const dateA = isSearch ? a.loggedDate : a.request.loggedDate;
        const dateB = isSearch ? b.loggedDate : b.request.loggedDate;
        return dateB - dateA;
    });

    let listHTML = '';
    sortedRequests.forEach(request => {
        const reqData = isSearch ? request : request.request;
        if (reqData) {
            const dateTime = reqData.loggedDateString ? getDate(reqData.loggedDateString) : 'Дата не указана';
            const method = reqData.method || 'UNKNOWN';
            const url = reqData.url || 'URL не указан';
            const truncatedUrl = truncateUrl(url);

            listHTML += `<li class="list-group-item" data-request-id="${request.id || ''}" title="${url}">
                            <div style="display: flex; justify-content: space-between;">
                                <div>${method} ${truncatedUrl}</div>
                                <div>${dateTime}</div>
                            </div>
                         </li>`;
        }
    });
    $('#request-list').html(listHTML);
}

function getRequestDetails(requestId) {
    $.get(`${config.serverUrl}/__admin/requests/${requestId}`, function(data) {
        displayRequestDetails(data);
    });
}

function displayRequestDetails(request, isSearch = false) {
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

    // В зависимости от метода (поиск или получение всех запросов) используем разные поля
    const reqData = isSearch ? request : request.request;
    const respData = request.response || {};

    let detailsREQ = `
        <div class="card-header">${reqData.method || 'UNKNOWN'} ${reqData.url || 'URL не указан'}</div>
        <div class="card-body">
            <h5 class="card-title">Request Headers</h5>
            <pre>${formatJSON(reqData.headers)}</pre>
            <h5 class="card-title">Request Body</h5>
            <pre>${formatJSON(reqData.body)}</pre>
        </div>`;

    $('#request-details').html(detailsREQ);

    let detailsRESP = `
        <div class="card-header">${reqData.method || 'UNKNOWN'} ${reqData.url || 'URL не указан'}</div>
        <div class="card-body">
            <h5 class="card-title">Response Headers</h5>
            <pre>${formatJSON(respData.headers)}</pre>
            <h5 class="card-title">Response Body</h5>
            <pre>${formatJSON(respData.body)}</pre>
        </div>`;

    $('#response-details').html(detailsRESP);
}

function clearLogs() {
    $.ajax({
        url: `${config.serverUrl}/__admin/requests`,
        type: 'DELETE',
        success: function() {
            fetchRequests();
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
    refreshInterval = setInterval(() => {
        if (lastSearchQuery) {
            searchRequests(lastSearchQuery);
        } else {
            fetchRequests();
        }
    }, interval);
}

$(document).ready(function() {
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

    $('#search-button').on('click', function() {
        const searchQuery = $('#search-input').val().trim();
        lastSearchQuery = searchQuery;
        searchRequests(searchQuery);
    });

    $('#search-input').on('keypress', function(e) {
        if (e.which === 13) {
            const searchQuery = $(this).val().trim();
            lastSearchQuery = searchQuery;
            searchRequests(searchQuery);
        }
    });

    fetchConfig().then(() => {
        fetchRequests();
        startInterval();
    });
});