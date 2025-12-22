// Cloudflare Pages Function to proxy API requests
// This helps avoid ad blocker blocking of the API domain

export const onRequest: PagesFunction = async (context) => {
    const { request, params } = context;

    // Get the path from the URL
    const path = (params.path as string[]).join('/');

    // Backend API URL
    const backendUrl = 'https://betpot-api.devsiten.workers.dev/api';

    // Build the full URL to the backend
    const url = new URL(request.url);
    const targetUrl = `${backendUrl}/${path}${url.search}`;

    // Clone the request with the new URL
    const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    // Forward the request to the backend
    const response = await fetch(proxyRequest);

    // Return the response with CORS headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');

    return modifiedResponse;
};
