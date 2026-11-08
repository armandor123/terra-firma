import { SessionClient, ApiError, containsSimulation, reviewTransitions } from "./client.js";
const api = new SessionClient(), $ = id => document.getElementById(id);
const PAGE_SIZE = 10;
let user = null, page = 0, selected = null, photoUrl = null, location = null, pending = null;
let detailGeneration = 0;
let locationGeneration = 0;
const statusNames = { submitted: "Enviado", under_review: "Em revisão", verified: "Verificado pela cooperativa", rejected: "Rejeitado", escalated: "Encaminhamento interno" };
const classificationNames = { fire_suspected: "Suspeita de fogo", smoke_suspected: "Suspeita de fumaça", dry_vegetation: "Vegetação seca", burned_area: "Indícios de vegetação queimada", no_signs: "Sem indícios visuais", inconclusive: "Inconclusivo" };
const presenceNames = { present: "Presente", absent: "Ausente", uncertain: "Incerto" };
const limitNames = { dark: "Escura", blurry: "Borrada", no_sky: "Sem céu visível", obstructed: "Obstruída", low_resolution: "Baixa resolução", overexposed: "Superexposta", cropped: "Recortada", other: "Outra limitação" };
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = String(text); if (className) el.className = className; return el; }
function date(value) { return value ? new Date(value).toLocaleString("pt-BR", { timeZoneName: "short" }) : "Não informado"; }
function notice(text, error = false) { $("notice").hidden = !text; $("notice").className = error ? "error" : ""; $("notice").textContent = text || ""; }
function simulation(container, value) { if (containsSimulation(value)) container.append(node("strong", "DADOS SIMULADOS", "badge simulated")); }
function warnings(container, values = []) { for (const warning of values) container.append(node("p", warning, "warning")); }
function facts(container, values) { const dl = node("dl"); for (const [key, value] of values) { dl.append(node("dt", key), node("dd", value ?? "Não informado")); } container.append(dl); }
function jsonOptions(payload) { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }; }
function releasePhoto() { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; }
function resetIncident() {
  locationGeneration++; pending = null; location = null; $("incident-form").reset();
  for (const el of $("incident-form").elements) el.disabled = false;
  $("location-status").textContent = "Sem localização. Você pode enviar o relato assim.";
  $("send-incident").textContent = "Enviar relato";
}
function clearScreen() {
  user = null; page = 0; selected = null; detailGeneration++; releasePhoto(); resetIncident();
  $("identity").replaceChildren(); $("incident-list").replaceChildren();
  $("detail").replaceChildren(node("p", "Selecione um incidente para ver as evidências.", "muted"));
  $("temporary-password").textContent = "";
  for (const id of ["login-form", "password-form", "farmer-form", "property-form"]) $(id).reset();
  $("property-form").elements.farmer_id.replaceChildren();
  $("incident-form").elements.property_id.replaceChildren();
  $("workspace").hidden = true; $("password-view").hidden = true; $("login-view").hidden = false;
}
function fail(error) {
  if (error instanceof ApiError && error.status === 401) { api.clear(); clearScreen(); }
  notice(error.name === "AbortError" ? "A resposta demorou. Preserve a tentativa para reenviar com o mesmo UUID." : error.message || "Falha de conexão.", true);
}
async function busy(button, task) {
  button.disabled = true;
  try { await task(); } catch (error) { fail(error); }
  finally { button.disabled = false; }
}
function options(select, items, label) {
  select.replaceChildren();
  if (!items.length) select.append(new Option("Nenhum cadastro disponível", ""));
  for (const item of items) select.append(new Option(label(item), item.id));
}
async function loadFarmers() {
  const farmers = await api.json("/v1/farmers");
  options($("property-form").elements.farmer_id, farmers, f => `${f.name} (${f.username})`);
}
async function startWorkspace() {
  $("login-view").hidden = true;
  $("identity").replaceChildren(node("span", `${user.name} · ${user.role === "farmer" ? "Agricultor" : "Cooperativa"}`));
  const logout = node("button", "Sair", "secondary");
  logout.id = "logout"; logout.onclick = () => busy(logout, async () => { try { await api.logout(); } finally { clearScreen(); notice("Sessão local encerrada."); } });
  $("identity").append(logout);
  if (user.must_change) { $("password-view").hidden = false; return; }
  $("workspace").hidden = false; $("password-view").hidden = true;
  const farmer = user.role === "farmer";
  $("farmer-tools").hidden = !farmer; $("cooperative-tools").hidden = farmer;
  $("role-label").textContent = farmer ? "ÁREA DO AGRICULTOR" : "ÁREA DA COOPERATIVA";
  $("workspace-title").textContent = farmer ? "Seus relatos, acompanhados." : "Evidências para revisar.";
  if (farmer) options($("incident-form").elements.property_id, await api.json("/v1/properties"), p => p.name || `${p.municipality} / ${p.state}`);
  else await loadFarmers();
  await loadIncidents();
}
async function loadIncidents() {
  const items = await api.json(`/v1/incidents?limit=${PAGE_SIZE + 1}&offset=${page * PAGE_SIZE}`);
  $("incident-list").replaceChildren();
  $("page-label").textContent = `Página ${page + 1}`;
  $("previous").disabled = page === 0; $("next").disabled = items.length <= PAGE_SIZE;
  if (!items.length) $("incident-list").append(node("p", "Nenhum incidente nesta página.", "muted"));
  for (const item of items.slice(0, PAGE_SIZE)) {
    const card = node("button", undefined, `incident-card${item.id === selected ? " selected" : ""}`);
    card.type = "button"; card.dataset.id = item.id;
    card.append(node("strong", statusNames[item.status] || item.status), node("span", date(item.created_at)), node("span", item.description || "Relato com fotografia"));
    simulation(card, item);
    card.onclick = () => openIncident(item.id).catch(fail);
    $("incident-list").append(card);
  }
}
async function openIncident(id) {
  const generation = ++detailGeneration;
  const item = await api.json(`/v1/incidents/${encodeURIComponent(id)}`);
  if (generation !== detailGeneration || !user) return;
  selected = id; releasePhoto();
  const root = $("detail"); root.replaceChildren(node("h2", "Detalhe do incidente")); simulation(root, item);
  facts(root, [["Status", statusNames[item.status]], ["Registrado", date(item.created_at)], ["Localização", item.latitude == null ? "Não informada" : `${item.latitude}, ${item.longitude} · não verificada`]]);
  root.append(node("p", item.description || "Sem descrição adicional."));
  const image = node("img"); image.alt = "Foto privada enviada no relato"; root.append(image);
  const ai = item.ai || {};
  root.append(node("h3", "Análise da imagem")); simulation(root, ai);
  facts(root, [["Resultado", classificationNames[ai.classification] || ai.classification || "Não disponível"], ["Estado", ai.status], ["Modelo", ai.model_version], ["Prompt", ai.prompt_version]]);
  for (const [key, title] of [["fire", "Fogo"], ["smoke", "Fumaça"], ["dry_vegetation", "Vegetação seca"], ["burned_vegetation", "Vegetação queimada"]]) {
    const value = ai.signals?.[key]; if (!value) continue;
    const section = node("div", undefined, "signal");
    section.append(node("strong", `${title}: ${presenceNames[value.presence] || value.presence}`), node("p", value.justification));
    section.append(node("p", value.confidence == null ? "Confiança não informada." : `Confiança declarada pelo modelo: ${value.confidence}. Não é acurácia medida.`, "muted")); root.append(section);
  }
  if (ai.limitations?.length) root.append(node("p", `Limitações: ${ai.limitations.map(x => limitNames[x] || x).join(", ")}`));
  warnings(root, [ai.warning].filter(Boolean));
  root.append(node("h3", "Satélite e clima"));
  const evidence = item.evidence, snapshot = item.environment_snapshot;
  if (!evidence || !snapshot) root.append(node("p", "Sem snapshot ambiental histórico. Nenhuma consulta nova foi feita.", "muted"));
  else {
    simulation(root, evidence);
    facts(root, [["Consistência de contexto", evidence.consistency], ["Referência do relato", date(evidence.reference_at)], ["Raio / janela", `${evidence.parameters.radius_km} km / ${evidence.parameters.window_hours} h anteriores`], ["Snapshot recebido", date(snapshot.collected_at)], ["Fonte de focos", snapshot.hotspots?.source], ["Coleta da fonte", date(snapshot.hotspots?.fetched_at)]]);
    root.append(node("p", "Compatibilidade de contexto não confirma incêndio. Ausência de foco não invalida o relato.", "muted"));
    if (evidence.nearby_hotspots == null) root.append(node("p", "Focos indisponíveis ou não consultados.", "warning"));
    else if (!evidence.nearby_hotspots.length) root.append(node("p", "Sem focos retornados compatíveis. Isso não garante ausência de fogo.", "warning"));
    else {
      const wrap = node("div", undefined, "table-wrap"), table = node("table"), header = node("tr");
      for (const title of ["Distância", "Observado", "Diferença", "Confiança VIIRS"]) header.append(node("th", title)); table.append(header);
      for (const point of evidence.nearby_hotspots) { const row = node("tr"); for (const value of [`${point.distance_km.toFixed(2)} km`, date(point.observed_at), `${(point.time_difference_seconds / 3600).toFixed(2)} h`, point.confidence]) row.append(node("td", value)); table.append(row); } wrap.append(table); root.append(wrap);
    }
    const w = evidence.weather;
    simulation(root, w);
    facts(root, [["Fonte meteorológica", w?.source], ["Estado do clima", w?.status], ["Referência do clima", date(w?.observed_at)], ["Coleta do clima", date(w?.fetched_at)]]);
    if (w?.data) facts(root, [["Temperatura", `${w.data.temperature_c} °C`], ["Umidade", `${w.data.humidity_pct} %`], ["Vento", `${w.data.wind_kmh} km/h · ${w.data.wind_direction_deg}°`], ["Precipitação", `${w.data.precipitation_mm} mm`]]);
    else root.append(node("p", "Clima indisponível. Não interpretar como ausência de risco.", "warning"));
    warnings(root, evidence.warnings);
  }
  if (user.role === "cooperative") renderReview(root, item);
  root.append(node("h3", "Histórico de revisão"));
  if (!item.reviews.length) root.append(node("p", "Aguardando revisão humana.", "muted"));
  for (const review of item.reviews) { const entry = node("div", undefined, "review-entry"); entry.append(node("strong", `${statusNames[review.new_status]} · ${date(review.created_at)}`), node("p", review.notes)); root.append(entry); }
  try {
    const response = await api.request(`/v1/incidents/${encodeURIComponent(id)}/photo`);
    const blob = await response.blob();
    if (generation !== detailGeneration || !user) return;
    photoUrl = URL.createObjectURL(blob); image.src = photoUrl;
  } catch (error) { image.remove(); if (generation === detailGeneration) warnings(root, ["Foto indisponível. " + error.message]); }
}
function renderReview(root, item) {
  const transitions = reviewTransitions[item.status] || [];
  if (!transitions.length) { root.append(node("p", "Este estado é final. Não há nova transição disponível.", "muted")); return; }
  const form = node("form", undefined, "stack"); form.method = "post"; form.id = "review-form"; form.append(node("h3", "Revisão humana"));
  const statusLabel = node("label", "Próximo estado"), select = node("select"); select.name = "status";
  for (const status of transitions) select.append(new Option(statusNames[status], status)); statusLabel.append(select);
  const notesLabel = node("label", "Notas da revisão"), notes = node("textarea"); notes.name = "notes"; notes.required = true; notes.minLength = 5; notes.maxLength = 2000; notes.rows = 3; notesLabel.append(notes);
  const submit = node("button", "Salvar revisão"); submit.type = "submit";
  form.append(statusLabel, notesLabel, submit, node("p", "Verificado é uma avaliação humana interna. Encaminhar não envia comunicações.", "muted"));
  form.onsubmit = event => { event.preventDefault(); busy(submit, async () => { await api.json(`/v1/incidents/${encodeURIComponent(item.id)}/review`, { ...jsonOptions({ status: select.value, notes: notes.value }), method: "PATCH" }); await loadIncidents(); await openIncident(item.id); notice("Revisão registrada."); }); };
  root.append(form);
}
$("login-form").onsubmit = event => { event.preventDefault(); const form = event.currentTarget; busy(form.querySelector("button"), async () => { await api.login(form.elements.username.value, form.elements.password.value); form.elements.password.value = ""; user = await api.json("/v1/me"); notice(""); await startWorkspace(); }); };
$("password-form").onsubmit = event => { event.preventDefault(); const form = event.currentTarget; busy(form.querySelector("button"), async () => { await api.json("/v1/auth/password", jsonOptions({ old_password: form.elements.old_password.value, new_password: form.elements.new_password.value })); api.clear(); clearScreen(); notice("Senha alterada. Entre novamente com a nova senha."); }); };
$("get-location").onclick = () => {
  if (!navigator.geolocation || !window.isSecureContext) { notice("Localização exige navegador compatível e contexto seguro (HTTPS ou localhost). O relato pode ser enviado sem localização.", true); return; }
  $("get-location").disabled = true;
  const generation = ++locationGeneration;
  navigator.geolocation.getCurrentPosition(position => { if (generation !== locationGeneration || !user || pending) return; location = { latitude: position.coords.latitude, longitude: position.coords.longitude }; $("location-status").textContent = `Localização autorizada: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`; $("get-location").disabled = false; }, () => { if (generation !== locationGeneration || !user || pending) return; location = null; $("location-status").textContent = "Localização não obtida. O relato pode ser enviado normalmente."; $("get-location").disabled = false; }, { timeout: 10000, maximumAge: 0 });
};
$("incident-form").onsubmit = event => {
  event.preventDefault(); const form = event.currentTarget;
  busy($("send-incident"), async () => {
    if (!pending) {
      const file = form.elements.photo.files[0];
      if (!file || !["image/jpeg", "image/png"].includes(file.type) || file.size > 3000000) throw new Error("Envie uma foto JPEG/PNG de até 3 MB.");
      const metadata = { client_request_id: crypto.randomUUID(), property_id: form.elements.property_id.value, description: form.elements.description.value, location_source: location ? "gps" : "unavailable", location_authorized: !!location, ...(location || {}) };
      pending = { metadata: JSON.stringify(metadata), file };
      for (const el of form.elements) if (el !== $("send-incident") && el !== $("reset-incident")) el.disabled = true;
    }
    const body = new FormData(); body.append("metadata", pending.metadata); body.append("photo", pending.file);
    notice("Enviando e reunindo evidências. Aguarde nesta aba.");
    $("send-incident").textContent = "Enviar novamente";
    $("reset-incident").disabled = true;
    let result;
    try { result = await api.json("/v1/incidents", { method: "POST", body }); }
    finally { $("reset-incident").disabled = false; }
    resetIncident(); page = 0; await loadIncidents(); await openIncident(result.id); notice("Relato registrado. A revisão humana continua obrigatória.");
  });
};
$("reset-incident").onclick = () => { resetIncident(); notice("Tentativa local descartada. Se o servidor já recebeu o relato, ele continua na lista; confira antes de enviar outro."); };
$("farmer-form").onsubmit = event => { event.preventDefault(); const form = event.currentTarget; busy(form.querySelector("button"), async () => { const result = await api.json("/v1/farmers", jsonOptions(Object.fromEntries(new FormData(form)))); $("temporary-password").textContent = `Usuário: ${result.username}. Senha temporária: ${result.temporary_password}. Compartilhe por canal seguro; troca obrigatória no primeiro acesso.`; form.reset(); await loadFarmers(); }); };
$("property-form").onsubmit = event => { event.preventDefault(); const form = event.currentTarget; busy(form.querySelector("button"), async () => { const data = Object.fromEntries(new FormData(form)); data.latitude = Number(data.latitude); data.longitude = Number(data.longitude); await api.json("/v1/properties", jsonOptions(data)); form.reset(); notice("Propriedade cadastrada."); }); };
$("reload").onclick = () => loadIncidents().catch(fail);
$("previous").onclick = () => { if (page) { page--; loadIncidents().catch(fail); } };
$("next").onclick = () => { page++; loadIncidents().catch(fail); };
