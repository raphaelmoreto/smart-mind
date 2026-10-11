
export class HttpClient {
    async request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body !== undefined
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...options.headers
            }
        });

        if (!response.ok) {
            let message = `Erro HTTP: ${response.status}`;

            try {
                const errorBody = await response.json();

                message =
                    (Array.isArray(errorBody.message)
                        ? errorBody.message.join(', ')
                        : errorBody.message) ||
                    errorBody.mensagem ||
                    errorBody.error ||
                    message;
            } catch {
                // A resposta pode não conter JSON.
            }

            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        const text = await response.text();

        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error('A API retornou uma resposta JSON inválida.');
        }
    }

    get(url) {
        return this.request(url);
    }

    post(url, body) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }
}