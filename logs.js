let config;
let refreshInterval;

function fetchConfig() {
    return fetch('config.json')
        .then(response => response.json())
        .then(data => {
            config = data;
        });
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
            listHTML += `<li class="list-group-item" data-request-id="${request.id}">${request.request.method} ${request.request.url}</li>`;
        });
        $('#request-list').html(listHTML);
    }

    function getRequestDetails(requestId) {
        $.get(`${config.serverUrl}/__admin/requests/` + requestId, function (data) {
            displayRequestDetails(data);
        });
    }

    function displayRequestDetails(request) {
        let detailsHTML = `
            <div class="card-header">${request.request.method} ${request.request.url}</div>
            <div class="card-body">
                <h5 class="card-title">Request Headers</h5>
                <pre>${JSON.stringify(request.request.headers, null, 2)}</pre>
                <h5 class="card-title">Request Body</h5>
                <pre>${JSON.stringify(request.request.body, null, 2)}</pre>
            </div>`;
        $('#request-details').html(detailsHTML);
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
