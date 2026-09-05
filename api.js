// api.js
// Vékony réteg a backend hívásokhoz. Nem tud semmit a DOM-ról.
// Minden végpont a backend-terv.md alapján van megnevezve.

const Auth = {
  getAccessToken() {
    return localStorage.getItem("kmk_access_token");
  },
  getRefreshToken() {
    return localStorage.getItem("kmk_refresh_token");
  },
  setTokens({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem("kmk_access_token", accessToken);
    if (refreshToken) localStorage.setItem("kmk_refresh_token", refreshToken);
  },
  clearTokens() {
    localStorage.removeItem("kmk_access_token");
    localStorage.removeItem("kmk_refresh_token");
    localStorage.removeItem("kmk_user");
  },
  getUser() {
    const raw = localStorage.getItem("kmk_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem("kmk_user", JSON.stringify(user));
  },
  isLoggedIn() {
    return !!this.getAccessToken();
  },
};

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest(path, { method = "GET", body, auth = false, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = Auth.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Access token lejárt -> próbáljunk frissíteni egyszer, aztán újra hívjuk az endpointot.
  if (res.status === 401 && auth && retry && Auth.getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return apiRequest(path, { method, body, auth, retry: false });
    Auth.clearTokens();
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!res.ok) {
    const message = (payload && payload.message) || `Hiba történt (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }
  return payload;
}

async function tryRefreshToken() {
  try {
    const payload = await apiRequest("/auth/refresh", {
      method: "POST",
      body: { refreshToken: Auth.getRefreshToken() },
      retry: false,
    });
    Auth.setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    return true;
  } catch {
    return false;
  }
}

const Api = {
  // --- Auth ---
  register: (data) => apiRequest("/auth/register", { method: "POST", body: data }),
  login: (data) => apiRequest("/auth/login", { method: "POST", body: data }),
  logout: () => apiRequest("/auth/logout", { method: "POST", auth: true }),
  me: () => apiRequest("/auth/me", { auth: true }),

  // --- Kategóriák ---
  getCategories: () => apiRequest("/categories"),

  // --- Témák (topics) ---
  getTopics: ({ categoryId, page = 1, pageSize, q } = {}) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (q) params.set("q", q);
    params.set("page", page);
    params.set("pageSize", pageSize || window.APP_CONFIG.PAGE_SIZE);
    return apiRequest(`/topics?${params.toString()}`);
  },
  getTopic: (topicId) => apiRequest(`/topics/${topicId}`),
  createTopic: (data) => apiRequest("/topics", { method: "POST", body: data, auth: true }),
  updateTopic: (topicId, data) => apiRequest(`/topics/${topicId}`, { method: "PATCH", body: data, auth: true }),
  deleteTopic: (topicId) => apiRequest(`/topics/${topicId}`, { method: "DELETE", auth: true }),
  pinTopic: (topicId, pinned) => apiRequest(`/topics/${topicId}/pin`, { method: "POST", body: { pinned }, auth: true }),
  lockTopic: (topicId, locked) => apiRequest(`/topics/${topicId}/lock`, { method: "POST", body: { locked }, auth: true }),

  // --- Hozzászólások (posts) ---
  getPosts: (topicId, { page = 1, pageSize } = {}) => {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("pageSize", pageSize || window.APP_CONFIG.PAGE_SIZE);
    return apiRequest(`/topics/${topicId}/posts?${params.toString()}`);
  },
  createPost: (topicId, data) => apiRequest(`/topics/${topicId}/posts`, { method: "POST", body: data, auth: true }),
  updatePost: (postId, data) => apiRequest(`/posts/${postId}`, { method: "PATCH", body: data, auth: true }),
  deletePost: (postId) => apiRequest(`/posts/${postId}`, { method: "DELETE", auth: true }),
  reportPost: (postId, reason) => apiRequest(`/posts/${postId}/report`, { method: "POST", body: { reason }, auth: true }),

  // --- Profil ---
  updateProfile: (data) => apiRequest("/users/me", { method: "PATCH", body: data, auth: true }),
};
