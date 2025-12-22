// Cloudflare Pages Function to proxy API requests
// This helps avoid ad blocker blocking of the API domain

interface Env { }

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, params } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Address',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Get the path from the URL
    const pathArray = params.path as string[];
    const path = pathArray ? pathArray.join('/') : '';

    // Backend API URL
    const backendUrl = 'https://betpot-api.devsiten.workers.dev/api';

    // Build the full URL to the backend
    const url = new URL(request.url);
    const targetUrl = `${backendUrl}/${path}${url.search}`;

    // Clone headers and remove problematic ones
    const headers = new Headers(request.headers);
    headers.delete('host');

    // Create the proxy request
    const init: RequestInit = {
        method: request.method,
        headers: headers,
    };

    // Add body for methods that support it
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body;
    }

    try {
        // Forward the request to the backend
        const response = await fetch(targetUrl, init);

        // Clone response and add CORS headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Proxy error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
