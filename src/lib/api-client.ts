export class ApiClient {
  static instance: ApiClient;

  constructor(public baseUrl: string = "") {
    if (ApiClient.instance) {
      return ApiClient.instance;
    } else {
      this.baseUrl = baseUrl;
      ApiClient.instance = this;
    }
  }

  static getInstance() {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }

    return ApiClient.instance;
  }

  /**
   * Constructs a query string from an object.
   * @param {Object} params - The query parameters as key-value pairs.
   * @returns {string} The query string.
   */
  buildQueryString(params: object = {}): string {
    const queryString = Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
    return queryString ? `?${queryString}` : "";
  }

  /**
   * GET request with dynamic path and query parameters.
   * @param {string} pathTemplate - The path template with placeholders for dynamic params, e.g., '/users/:id'.
   * @param {Object} pathParams - An object containing the dynamic path parameters, e.g., { id: 123 }.
   * @param {Object} queryParams - An object containing the query parameters, e.g., { sort: 'asc', page: 2 }.
   * @returns {Promise} The response from the API.
   */
  async get<T>(
    pathTemplate: string,
    pathParams: object = {},
    queryParams: object = {}
  ): Promise<string> {
    // Replace placeholders in the path template with actual values
    const path = pathTemplate.replace(/:([a-zA-Z]+)/g, (_, key) =>
      encodeURIComponent(pathParams[key])
    );

    // Build the query string
    const queryString = this.buildQueryString(queryParams);

    // Construct the full URL
    const url = `${this.baseUrl}${path}${queryString}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {},
        credentials: "include",
      });

      if (!response.ok) {
        const errorResponse = await response.text();

        throw new Error(errorResponse ?? response.status.toString());
      }
      return await response.text();
    } catch (error) {
      throw error;
    }
  }

  /**
   * non-GET request that can handle both JSON and FormData.
   * @param {string} method - non-GET Http request method, e.g., 'POST', 'PUT'.
   * @param {string} pathTemplate - The path template with placeholders for dynamic params, e.g., '/users/:id'.
   * @param {Object} pathParams - An object containing the dynamic path parameters, e.g., { id: 123 }.
   * @param {Object|FormData} body - The request body, either a JSON object or FormData.
   * @param {Object} [queryParams] - An object containing optional query parameters, e.g., { sort: 'asc' }.
   * @returns {Promise} The response from the API.
   */
  async _nonGet<T, R>(
    method: string = "POST",
    pathTemplate: string,
    pathParams: object = {},
    body: object | FormData = {},
    queryParams: object = {}
  ): Promise<R> {
    const path = pathTemplate.replace(/:([a-zA-Z]+)/g, (_, key) =>
      encodeURIComponent(pathParams[key])
    );
    const queryString = this.buildQueryString(queryParams);
    const url = `${this.baseUrl}${path}${queryString}`;

    const isFormData = body instanceof FormData;

    try {
      const response = await fetch(url, {
        method: method,
        headers: isFormData
          ? {
              Accept: "*/*",
            } // Let the browser set the Content-Type for FormData
          : { "Content-Type": "application/json" },
        body: isFormData ? body : JSON.stringify(body), // Send FormData directly or JSON string
        credentials: "include",
      });

      if (!response.ok) {
        const errorResponse = await response.json();

        throw new Error(errorResponse?.message ?? response.status);
      }

      return await response.json();
    } catch (error) {
      console.error(`${method} request failed`, error);
      throw error;
    }
  }

  /**
   * POST request that can handle both JSON and FormData.
   * @param {string} pathTemplate - The path template with placeholders for dynamic params, e.g., '/users/:id'.
   * @param {Object} pathParams - An object containing the dynamic path parameters, e.g., { id: 123 }.
   * @param {Object|FormData} body - The request body, either a JSON object or FormData.
   * @param {Object} [queryParams] - An object containing optional query parameters, e.g., { sort: 'asc' }.
   * @returns {Promise} The response from the API.
   */
  async post<T, R>(
    pathTemplate: string,
    pathParams: object = {},
    body: object | FormData = {},
    queryParams: object = {}
  ): Promise<R> {
    return await this._nonGet(
      "POST",
      pathTemplate,
      pathParams,
      body,
      queryParams
    );
  }

  /**
   * PUT request that can handle both JSON and FormData.
   * @param {string} pathTemplate - The path template with placeholders for dynamic params, e.g., '/users/:id'.
   * @param {Object} pathParams - An object containing the dynamic path parameters, e.g., { id: 123 }.
   * @param {Object|FormData} body - The request body, either a JSON object or FormData.
   * @param {Object} [queryParams] - An object containing optional query parameters, e.g., { sort: 'asc' }.
   * @returns {Promise} The response from the API.
   */
  async put<T, R>(
    pathTemplate: string,
    pathParams: object = {},
    body: object | FormData = {},
    queryParams: object = {}
  ): Promise<R> {
    return await this._nonGet(
      "PUT",
      pathTemplate,
      pathParams,
      body,
      queryParams
    );
  }
}
