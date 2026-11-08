export function containsSimulation(value) {
  return value !== null && typeof value === "object" &&
    (value.simulated === true || Object.values(value).some(containsSimulation));
}
export const reviewTransitions = {
  submitted: ["under_review"], under_review: ["verified", "rejected"],
  verified: ["escalated"], rejected: [], escalated: [],
};
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export class SessionClient {
  #session = null;
  #epoch = 0;
  #renewing = null;
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }
  clear() { this.#epoch++; this.#session = null; this.#renewing = null; }
  async #send(path, options, access) {
    if (!path.startsWith("/v1/")) throw new Error("Caminho de API inválido");
    const headers = new Headers(options.headers);
    if (access) headers.set("Authorization", `Bearer ${access}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110000);
    try { return await this.fetcher(path, { ...options, headers, signal: controller.signal, cache: "no-store" }); }
    finally { clearTimeout(timer); }
  }
  async #checked(response) {
    if (response.ok) return response;
    let data = {};
    try { data = await response.json(); } catch { /* Nginx pode retornar erro sem JSON. */ }
    const message = typeof data.detail === "string" ? data.detail :
      ({ 401: "Sessão inválida. Entre novamente.", 413: "Arquivo/requisição acima do limite.",
         422: "Verifique os campos e o formato da imagem.", 429: "Limite de requisições atingido. Aguarde e tente novamente.",
         503: "Serviço indisponível. Tente novamente mais tarde." }[response.status] || `Requisição recusada (${response.status}).`);
    throw new ApiError(response.status, message);
  }
  async login(username, password) {
    this.clear();
    const epoch = this.#epoch;
    const response = await this.#checked(await this.#send("/v1/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
    }));
    const result = await response.json();
    if (epoch !== this.#epoch) throw new Error("Sessão alterada");
    this.#session = result;
    return { role: result.role, must_change_password: result.must_change_password };
  }
  async #renew(epoch) {
    if (this.#renewing) return this.#renewing;
    const refresh = this.#session?.refresh_token;
    if (!refresh) throw new ApiError(401, "Entre novamente.");
    const promise = (async () => {
      const response = await this.#checked(await this.#send("/v1/auth/refresh", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refresh }),
      }));
      const tokens = await response.json();
      if (epoch !== this.#epoch) throw new Error("Sessão alterada");
      this.#session = { ...this.#session, ...tokens };
    })();
    this.#renewing = promise;
    try { await promise; }
    finally { if (this.#renewing === promise) this.#renewing = null; }
  }
  async request(path, options = {}) {
    const epoch = this.#epoch, access = this.#session?.access_token;
    if (!access) throw new ApiError(401, "Entre novamente.");
    let response = await this.#send(path, options, access);
    if (epoch !== this.#epoch) throw new Error("Sessão alterada");
    if (response.status === 401) {
      if (this.#session.access_token === access) await this.#renew(epoch);
      if (epoch !== this.#epoch) throw new Error("Sessão alterada");
      response = await this.#send(path, options, this.#session.access_token);
    }
    if (epoch !== this.#epoch) throw new Error("Sessão alterada");
    return this.#checked(response);
  }
  async json(path, options = {}) {
    const response = await this.request(path, options);
    return response.status === 204 ? null : response.json();
  }
  async logout() {
    try { if (this.#session) await this.request("/v1/auth/logout", { method: "POST" }); }
    finally { this.clear(); }
  }
}
