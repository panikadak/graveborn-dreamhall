self.addEventListener('fetch', function(event) {
    if (event.request.url.endsWith('.wav') || event.request.url.endsWith('.ogg')) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                const contentType = event.request.url.endsWith('.wav') ? 'audio/wav' : 'audio/ogg';
                const headers = new Headers(response.headers);
                headers.set('Content-Type', contentType);
                headers.set('Access-Control-Allow-Origin', '*');
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                });
            })
        );
    }
}); 