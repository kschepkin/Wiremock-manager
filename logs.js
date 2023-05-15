let config;
let refreshInterval;

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

    return `${hours}:${minutes} ${day}.${month}.${year}`;
}


$(document).ready(function () {
    function fetchRequests() {
        $.get(`${config.serverUrl}/__admin/requests`, function (data) {
            var requests = data.requests;
            populateRequestList(requests);
        });
    }
    function populateRequestList(requests) {
        let listHTML = '';
        requests.forEach(request => {
            let dateTime = getDate(request.request.loggedDateString);
            listHTML += `<li class="list-group-item" data-request-id="${request.id}">
                            <div style="display: flex; justify-content: space-between;">
                                <div>${request.request.method} ${request.request.url}</div>
                                <div>${dateTime}</div>
                            </div>
                         </li>`;
        });
        $('#request-list').html(listHTML);
    }
        
    

    function getRequestDetails(requestId) {
        $.get(`${config.serverUrl}/__admin/requests/` + requestId, function (data) {
            displayRequestDetails(data);
        });
    }

    function displayRequestDetails(request) {
        // Функция для форматирования JSON с отступами и переносами строк
        function formatJSON(json) {
            if (!json) return "";
            
            return JSON.stringify(json, null, 2)
                .replace(/\\n/g, '\n') // Замена символов перевода строки
                .replace(/\\'/g, "'") // Удаление экранирования кавычек
                .replace(/\\"/g, '"') // Замена экранированных кавычек
                .replace(/\\t/g, '\t') // Замена символов табуляции
                .replace(/\}"/g, '}') // Удаление кавычек после }
                .replace(/"\{/g, '{'); // Удаление кавычек перед {
        }

        let detailsREQ = `
          <div class="card-header">${request.request.method} ${request.request.url}</div>
          <div class="card-body">
            <h5 class="card-title">Request Headers</h5>
            <pre>${formatJSON(request.request.headers)}</pre>
            <h5 class="card-title">Request Body</h5>
            <pre>${formatJSON(request.request.body)}</pre>
          </div>`;

        $('#request-details').html(detailsREQ);

        let detailsRESP = `
          <div class="card-header">${request.request.method} ${request.request.url}</div>
          <div class="card-body">
            <h5 class="card-title">Response Headers</h5>
            <pre>${formatJSON(request.response.headers)}</pre>
            <h5 class="card-title">Response Body</h5>
            <pre>${formatJSON(request.response.body)}</pre>
          </div>`;

        $('#response-details').html(detailsRESP);

    }



    function clearLogs() {
        $.ajax({
            url: `${config.serverUrl}/__admin/requests`,
            type: 'DELETE',
            success: function () {
                fetchRequests();
            },
            error: function () {
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

    $('#request-list').on('click', 'li', function () {
        var requestId = $(this).attr('data-request-id');
        getRequestDetails(requestId);
    });

    $('#clear-logs').on('click', function () {
        clearLogs();
    });

    $('#refresh-interval').on('change', function () {
        startInterval();
    });

    fetchConfig().then(() => {
        fetchRequests();
        startInterval();
    });
});
