import type { RequestHandler } from './$types';

const BACKEND_URL = 'http://backend:8080';

export const POST: RequestHandler = async ({ params, request, fetch }) => {
    const path = params.path;

    try {
        const response = await fetch(`${BACKEND_URL}/api/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: await request.text()
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};

export const GET: RequestHandler = async ({ params, fetch }) => {
    const path = params.path;

    try {
        const response = await fetch(`${BACKEND_URL}/api/${path}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
