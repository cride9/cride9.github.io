// app.js
// Egyszerű hash-alapú router + renderelés. Nincs build lépés,
// tisztán statikus fájlokból áll -> GitHub Pages-kompatibilis.

const appEl = document.getElementById("app");
const headerActionsEl = document.getElementById("header-actions");
const categoryListEl = document.getElementById("category-list");
const searchInput = document.getElementById("global-search");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "most";
  if (mins < 60) return `${mins} perce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} napja`;
  return new Date(isoString).toLocaleDateString("hu-HU");
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function setLoading(el) {
  el.innerHTML = `<div class="loading">Betöltés…</div>`;
}

function showError(el, err) {
  el.innerHTML = `
    <div class="error-box">
      <h2>Ez most nem sikerült</h2>
      <p>${escapeHtml(err.message || "Ismeretlen hiba történt.")}</p>
      <p class="error-hint">Ellenőrizd, hogy a backend fut-e, és hogy a config.js-ben helyes-e az API_BASE_URL.</p>
    </div>`;
}

// ---------- Fejléc / bejelentkezési állapot ----------

function renderHeader() {
  const user = Auth.getUser();
  if (user) {
    headerActionsEl.innerHTML = `
      <a href="#/uj-temak" class="btn btn-primary">Új téma</a>
      <a href="#/profil" class="user-chip">
        <span class="avatar avatar-sm">${escapeHtml(initials(user.displayName))}</span>
        <span>${escapeHtml(user.displayName)}</span>
      </a>
      <button class="btn btn-ghost" id="logout-btn">Kilépés</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", async () => {
      try { await Api.logout(); } catch { /* mindegy, lokálisan úgyis kilépünk */ }
      Auth.clearTokens();
      renderHeader();
      navigate("#/");
    });
  } else {
    headerActionsEl.innerHTML = `
      <a href="#/bejelentkezes" class="btn btn-ghost">Bejelentkezés</a>
      <a href="#/regisztracio" class="btn btn-primary">Regisztráció</a>
    `;
  }
}

async function loadCategories() {
  try {
    const categories = await Api.getCategories();
    categoryListEl.innerHTML = `
      <li><a href="#/" class="category-link">Összes téma</a></li>
      ${categories
        .map(
          (c) => `
        <li>
          <a href="#/kategoria/${c.id}" class="category-link">
            <span>${escapeHtml(c.name)}</span>
            <span class="category-count">${c.topicCount ?? ""}</span>
          </a>
        </li>`
        )
        .join("")}
    `;
    return categories;
  } catch {
    categoryListEl.innerHTML = `<li class="category-error">A kategóriák nem tölthetők be.</li>`;
    return [];
  }
}

// ---------- Nézetek ----------

async function viewTopicList({ categoryId, page = 1, q } = {}) {
  setLoading(appEl);
  try {
    const [data, categories] = await Promise.all([
      Api.getTopics({ categoryId, page, q }),
      categoryId ? Api.getCategories() : Promise.resolve(null),
    ]);

    const activeCategory = categories?.find((c) => String(c.id) === String(categoryId));
    const heading = q
      ? `Találatok: „${escapeHtml(q)}”`
      : activeCategory
      ? escapeHtml(activeCategory.name)
      : "Összes téma";

    appEl.innerHTML = `
      <div class="view-header">
        <h1>${heading}</h1>
        <a href="#/uj-temak${categoryId ? `?kategoria=${categoryId}` : ""}" class="btn btn-primary">Új téma</a>
      </div>
      ${
        data.items.length === 0
          ? `<div class="empty-state">
               <p>Itt még nincs egy téma sem.</p>
               <p>Legyél te az első, aki elindít egy beszélgetést.</p>
             </div>`
          : `<ul class="topic-list" id="topic-list"></ul>`
      }
      <div class="pagination" id="pagination"></div>
    `;

    if (data.items.length > 0) {
      const listEl = document.getElementById("topic-list");
      const tpl = document.getElementById("tpl-topic-row");
      data.items.forEach((topic) => {
        const node = tpl.content.cloneNode(true);
        if (topic.pinned) node.querySelector(".pin-flag").hidden = false;
        if (topic.locked) node.querySelector(".lock-flag").hidden = false;
        const titleLink = node.querySelector(".topic-title");
        titleLink.textContent = topic.title;
        titleLink.href = `#/temak/${topic.id}`;
        node.querySelector(".topic-author").textContent = topic.author?.displayName || "ismeretlen";
        node.querySelector(".topic-category").textContent = topic.category?.name || "";
        node.querySelector(".topic-time").textContent = timeAgo(topic.lastActivityAt || topic.createdAt);
        node.querySelector(".topic-replies").textContent = topic.replyCount ?? 0;
        listEl.appendChild(node);
      });
    }

    renderPagination(document.getElementById("pagination"), data, (p) =>
      navigate(`#/${categoryId ? `kategoria/${categoryId}` : ""}?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`)
    );
  } catch (err) {
    showError(appEl, err);
  }
}

function renderPagination(el, data, onPage) {
  if (!el || !data || data.totalPages <= 1) return;
  const buttons = [];
  for (let p = 1; p <= data.totalPages; p++) {
    buttons.push(
      `<button class="page-btn ${p === data.page ? "active" : ""}" data-page="${p}">${p}</button>`
    );
  }
  el.innerHTML = buttons.join("");
  el.querySelectorAll(".page-btn").forEach((btn) =>
    btn.addEventListener("click", () => onPage(Number(btn.dataset.page)))
  );
}

async function viewTopicThread(topicId, { page = 1 } = {}) {
  setLoading(appEl);
  try {
    const [topic, posts] = await Promise.all([Api.getTopic(topicId), Api.getPosts(topicId, { page })]);
    const user = Auth.getUser();

    appEl.innerHTML = `
      <div class="thread-header">
        <a href="#/kategoria/${topic.category?.id ?? ""}" class="crumb">${escapeHtml(topic.category?.name || "Kategória")}</a>
        <h1>
          ${topic.pinned ? '<span class="pin-flag">Kitűzve</span>' : ""}
          ${topic.locked ? '<span class="lock-flag">Lezárva</span>' : ""}
          ${escapeHtml(topic.title)}
        </h1>
      </div>
      <div class="post-list" id="post-list"></div>
      <div class="pagination" id="pagination"></div>
      ${
        topic.locked
          ? `<p class="locked-note">Ez a téma le van zárva, új hozzászólás nem írható.</p>`
          : user
          ? `
        <form id="reply-form" class="reply-form">
          <textarea id="reply-text" placeholder="Írj hozzászólást…" required></textarea>
          <button type="submit" class="btn btn-primary">Hozzászólás küldése</button>
        </form>`
          : `<p class="locked-note"><a href="#/bejelentkezes">Jelentkezz be</a>, hogy hozzászólhass.</p>`
      }
    `;

    const postListEl = document.getElementById("post-list");
    const tpl = document.getElementById("tpl-post");
    posts.items.forEach((post) => renderPost(postListEl, tpl, post, user));

    renderPagination(document.getElementById("pagination"), posts, (p) => viewTopicThread(topicId, { page: p }));

    const form = document.getElementById("reply-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const textEl = document.getElementById("reply-text");
        const submitBtn = form.querySelector("button");
        submitBtn.disabled = true;
        try {
          await Api.createPost(topicId, { content: textEl.value.trim() });
          viewTopicThread(topicId, { page });
        } catch (err) {
          alert(err.message || "A hozzászólás küldése nem sikerült.");
          submitBtn.disabled = false;
        }
      });
    }
  } catch (err) {
    showError(appEl, err);
  }
}

function renderPost(listEl, tpl, post, currentUser) {
  const node = tpl.content.cloneNode(true);
  node.querySelector(".avatar").textContent = initials(post.author?.displayName);
  node.querySelector(".post-author").textContent = post.author?.displayName || "ismeretlen";
  if (post.author?.role && post.author.role !== "hallgato") {
    const roleEl = node.querySelector(".post-role");
    roleEl.hidden = false;
    roleEl.textContent = post.author.role === "admin" ? "Admin" : "Moderátor";
  }
  node.querySelector(".post-time").textContent = timeAgo(post.createdAt);
  node.querySelector(".post-time").dateTime = post.createdAt;
  if (post.editedAt) node.querySelector(".post-edited").hidden = false;
  node.querySelector(".post-content").textContent = post.content;

  const isOwner = currentUser && post.author && currentUser.id === post.author.id;
  const isMod = currentUser && (currentUser.role === "admin" || currentUser.role === "moderator");

  if (isOwner || isMod) {
    const editBtn = node.querySelector(".post-edit-btn");
    editBtn.hidden = false;
    editBtn.addEventListener("click", (e) => startEditPost(e.target.closest(".post"), post));

    const delBtn = node.querySelector(".post-delete-btn");
    delBtn.hidden = false;
    delBtn.addEventListener("click", async (e) => {
      if (!confirm("Biztosan törlöd ezt a hozzászólást?")) return;
      try {
        await Api.deletePost(post.id);
        e.target.closest(".post")?.remove();
      } catch (err) {
        alert(err.message || "A törlés nem sikerült.");
      }
    });
  }

  node.querySelector(".post-report-btn").addEventListener("click", async () => {
    if (!currentUser) return navigate("#/bejelentkezes");
    const reason = prompt("Miért jelented ezt a hozzászólást?");
    if (!reason) return;
    try {
      await Api.reportPost(post.id, reason);
      alert("Köszönjük, a jelentést továbbítottuk a moderátoroknak.");
    } catch (err) {
      alert(err.message || "A jelentés küldése nem sikerült.");
    }
  });

  node.querySelector(".post-reply-btn").addEventListener("click", () => {
    const textarea = document.getElementById("reply-text");
    if (textarea) {
      textarea.value += `${textarea.value ? "\n\n" : ""}@${post.author?.displayName}: `;
      textarea.focus();
    }
  });

  listEl.appendChild(node);
}

function startEditPost(articleEl, post) {
  const contentEl = articleEl.querySelector(".post-content");
  contentEl.outerHTML = `
    <form class="edit-form">
      <textarea class="edit-textarea">${escapeHtml(post.content)}</textarea>
      <div class="edit-actions">
        <button type="submit" class="btn btn-primary btn-sm">Mentés</button>
        <button type="button" class="btn btn-ghost btn-sm cancel-edit">Mégse</button>
      </div>
    </form>`;
  const form = articleEl.querySelector(".edit-form");
  form.querySelector(".cancel-edit").addEventListener("click", () => {
    form.outerHTML = `<div class="post-content">${escapeHtml(post.content)}</div>`;
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newContent = form.querySelector(".edit-textarea").value.trim();
    try {
      const updated = await Api.updatePost(post.id, { content: newContent });
      post.content = updated.content;
      post.editedAt = updated.editedAt;
      form.outerHTML = `<div class="post-content">${escapeHtml(post.content)}</div>`;
    } catch (err) {
      alert(err.message || "A szerkesztés nem sikerült.");
    }
  });
}

async function viewNewTopic({ categoryId } = {}) {
  if (!Auth.isLoggedIn()) return navigate("#/bejelentkezes");
  const categories = await loadCategories().catch(() => []);
  appEl.innerHTML = `
    <div class="view-header"><h1>Új téma indítása</h1></div>
    <form id="new-topic-form" class="stacked-form">
      <label>Kategória
        <select id="topic-category" required>
          ${categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(categoryId) ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </label>
      <label>Cím
        <input type="text" id="topic-title" maxlength="140" required>
      </label>
      <label>Első hozzászólás
        <textarea id="topic-content" rows="8" required></textarea>
      </label>
      <button type="submit" class="btn btn-primary">Téma közzététele</button>
    </form>
  `;
  document.getElementById("new-topic-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button");
    submitBtn.disabled = true;
    try {
      const topic = await Api.createTopic({
        categoryId: document.getElementById("topic-category").value,
        title: document.getElementById("topic-title").value.trim(),
        content: document.getElementById("topic-content").value.trim(),
      });
      navigate(`#/temak/${topic.id}`);
    } catch (err) {
      alert(err.message || "A téma létrehozása nem sikerült.");
      submitBtn.disabled = false;
    }
  });
}

function viewLogin() {
  appEl.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Bejelentkezés</h1>
      <form id="login-form" class="stacked-form">
        <label>Személyes e-mail cím
          <input type="email" id="login-email" required>
        </label>
        <label>Jelszó
          <input type="password" id="login-password" required>
        </label>
        <button type="submit" class="btn btn-primary">Bejelentkezés</button>
      </form>
      <p class="auth-switch">Még nincs fiókod? <a href="#/regisztracio">Regisztrálj</a></p>
    </div>
  `;
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button");
    submitBtn.disabled = true;
    try {
      const payload = await Api.login({
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value,
      });
      Auth.setTokens(payload);
      Auth.setUser(payload.user);
      renderHeader();
      navigate("#/");
    } catch (err) {
      alert(err.message || "A bejelentkezés nem sikerült.");
      submitBtn.disabled = false;
    }
  });
}

function viewRegister() {
  appEl.innerHTML = `
    <div class="auth-form-wrap">
      <h1>Regisztráció</h1>
      <form id="register-form" class="stacked-form">
        <label>Név
          <input type="text" id="reg-name" required>
        </label>
        <label>Kollégiumi e-mail cím
          <input type="email" id="reg-email" required>
        </label>
        <label>Szobaszám
          <input type="text" id="reg-room" placeholder="pl. 214">
        </label>
        <label>Jelszó
          <input type="password" id="reg-password" minlength="8" required>
        </label>
        <button type="submit" class="btn btn-primary">Regisztráció</button>
      </form>
      <p class="auth-switch">Már van fiókod? <a href="#/bejelentkezes">Jelentkezz be</a></p>
    </div>
  `;
  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button");
    submitBtn.disabled = true;
    try {
      const payload = await Api.register({
        displayName: document.getElementById("reg-name").value.trim(),
        email: document.getElementById("reg-email").value.trim(),
        room: document.getElementById("reg-room").value.trim(),
        password: document.getElementById("reg-password").value,
      });
      Auth.setTokens(payload);
      Auth.setUser(payload.user);
      renderHeader();
      navigate("#/");
    } catch (err) {
      alert(err.message || "A regisztráció nem sikerült.");
      submitBtn.disabled = false;
    }
  });
}

async function viewProfile() {
  if (!Auth.isLoggedIn()) return navigate("#/bejelentkezes");
  setLoading(appEl);
  try {
    const me = await Api.me();
    Auth.setUser(me);
    appEl.innerHTML = `
      <div class="auth-form-wrap">
        <h1>Profilom</h1>
        <form id="profile-form" class="stacked-form">
          <label>Név
            <input type="text" id="profile-name" value="${escapeHtml(me.displayName)}" required>
          </label>
          <label>Szobaszám
            <input type="text" id="profile-room" value="${escapeHtml(me.room || "")}">
          </label>
          <p class="field-hint">E-mail: ${escapeHtml(me.email)} · Szerepkör: ${escapeHtml(me.role)}</p>
          <button type="submit" class="btn btn-primary">Mentés</button>
        </form>
      </div>
    `;
    document.getElementById("profile-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const updated = await Api.updateProfile({
          displayName: document.getElementById("profile-name").value.trim(),
          room: document.getElementById("profile-room").value.trim(),
        });
        Auth.setUser(updated);
        renderHeader();
        alert("Mentve.");
      } catch (err) {
        alert(err.message || "A mentés nem sikerült.");
      }
    });
  } catch (err) {
    showError(appEl, err);
  }
}

// ---------- Router ----------

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString || "");
  return { path: path.replace(/\/+$/, "") || "/", params };
}

function navigate(hash) {
  if (location.hash === hash) {
    router();
  } else {
    location.hash = hash;
  }
}

function router() {
  const { path, params } = parseHash();
  const page = Number(params.get("page")) || 1;
  const q = params.get("q") || undefined;

  window.scrollTo(0, 0);

  if (path === "/") return viewTopicList({ page, q });
  if (path.startsWith("/kategoria/")) return viewTopicList({ categoryId: path.split("/")[2], page, q });
  if (path.startsWith("/temak/")) return viewTopicThread(path.split("/")[2], { page });
  if (path === "/uj-temak") return viewNewTopic({ categoryId: params.get("kategoria") });
  if (path === "/bejelentkezes") return viewLogin();
  if (path === "/regisztracio") return viewRegister();
  if (path === "/profil") return viewProfile();

  appEl.innerHTML = `<div class="empty-state"><p>Ez az oldal nem található.</p><a href="#/">Vissza a főoldalra</a></div>`;
}

window.addEventListener("hashchange", router);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && searchInput.value.trim()) {
    navigate(`#/?q=${encodeURIComponent(searchInput.value.trim())}`);
  }
});

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// ---------- Indítás ----------

renderHeader();
loadCategories();
router();
