"use strict";
/* 화면 전환, 문제 풀이 흐름, 이벤트 처리, 시작 */
/* ---------- routing & chrome ---------- */
const ROUTES = [["home","대시보드","home"],["new","새 문제 만들기","new"],["sets","내 문제 세트","sets"],["notes","오답노트","notes"],["data","내 데이터","data"]];
function route(){ const r = (location.hash || "#home").slice(1); return r || "home"; }
function go(r){ if (location.hash === "#" + r) render(); else location.hash = r; }
function updateNav(r){
  const act = getWrong().filter(w => w.status !== "mastered").length;
  const cur = (r === "quiz" || r === "result") ? "" : (r === "edit" || r === "print") ? "sets" : r;
  const item = ([k, label, ic], mobile) =>
    `<a href="#${k}" class="${cur === k ? "on" : ""}" ${cur === k ? 'aria-current="page"' : ""}>${ICON[ic]}<span>${k === "new" ? "새 문제" : k === "sets" ? "문제 세트" : label}</span>${k === "notes" && act ? `<span class="count">${act}</span>` : ""}</a>`;
  $("#nav").innerHTML = ROUTES.map(x => item(x, false)).join("");
  $("#tabbar").innerHTML = ROUTES.map(x => item(x, true)).join("");
}
function updateStatus(){
  const st = Store.mode === "cloud" ? ["ok","DB 저장 중"] : Store.mode === "local" ? ["","체험 모드"]
    : Store.mode === "error" ? ["no","DB 연결 실패"] : Store.mode === "signedout" ? ["","로그인 필요"] : ["","DB 연결 중"];
  const ai = !S.aiChecked ? ["","AI 확인 중"] : aiReady() ? ["ok","AI 연결됨"] : ["no","AI 사용 불가"];
  const who = Auth.user
    ? `<button class="btn ghost small" data-act="logout" title="${esc(Auth.user.email)}">${esc(Auth.name)}님 · 로그아웃</button>`
    : Store.mode === "local" && sb ? `<button class="btn ghost small" data-act="go-login">로그인</button>` : "";
  $("#status").innerHTML = `<span><i class="dot ${st[0]}"></i>${st[1]}</span><span><i class="dot ${ai[0]}"></i>${ai[1]}</span>${who}`;
}

function render(){
  S.pendingRender = false;
  const r = route();
  document.body.classList.toggle("signed-out", Auth.needLogin());
  let html;
  if (!Auth.checked) html = loadingView();
  else if (Auth.needLogin()) html = viewLogin();
  else if (r === "quiz") { if (!S.quiz) return go("home"); html = viewQuiz(); }
  else if (r === "result") { if (!S.result) return go("home"); html = viewResult(); }
  else if (r === "new") html = viewNew();
  else if (r === "sets") html = viewSets();
  else if (r === "notes") html = viewNotes();
  else if (r === "data") html = viewData();
  else if (r === "print") { if (!findSet(S.printId)) return go("sets"); html = viewPrint(); }
  else if (r === "edit") { if (!S.edit) return go("sets"); html = viewEdit(); }
  else html = viewHome();
  $("#main").innerHTML = html;
  updateNav(r);
  if (r === "quiz") {
    const inp = $("#ans");
    if (inp && window.matchMedia("(min-width:800px)").matches) { inp.focus(); const v = inp.value; inp.value = ""; inp.value = v; }
  }
}


/* ---------- quiz flow ---------- */
function startQuiz(questions, ctx){
  if (!questions.length) { toast("풀 문제가 없어요."); return; }
  S.quiz = {questions:clone(questions), answers:{}, idx:0, ctx};
  S.result = null;
  go("quiz");
}
function startSet(id){
  const s = findSet(id);
  if (!s) { toast("문제 세트를 찾지 못했어요.", "bad"); return; }
  startQuiz(s.questions.map(q => ({...q, setId:s.id, setTitle:s.title, subject:s.subject})), {mode:"set", setId:s.id, title:s.title, subject:s.subject});
}
function questionsFromNotes(list){ return list.map(w => ({...w.question, setId:w.setId, setTitle:w.setTitle, subject:w.subject})); }

function keywordScore(model, user){
  const words = [...new Set(String(model).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 2).map(w => w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|하여|하고|한다|된다|이다)$/, "")).filter(w => w.length >= 2))];
  if (!words.length) return 0;
  const u = norm(user);
  const hit = words.filter(w => u.includes(norm(w))).length;
  return Math.min(100, Math.round(hit / words.length * 130 / 10) * 10);
}

async function gradeQuiz(){
  const q = S.quiz;
  const results = q.questions.map(x => ({qid:x.id, user:String(q.answers[x.id] ?? "").trim(), correct:false, score:null, feedback:""}));
  const needAI = [];
  q.questions.forEach((x, i) => {
    const r = results[i];
    if (!r.user) { r.feedback = "답을 쓰지 않았어요."; if (x.type === "essay") r.score = 0; return; }
    if (x.type === "multiple_choice" || x.type === "ox") r.correct = norm(r.user) === norm(x.answer);
    else if (x.type === "short_answer") {
      if ([x.answer, ...(x.acceptable_answers || [])].some(a => norm(a) === norm(r.user))) r.correct = true;
      else needAI.push(i);
    } else needAI.push(i);
  });
  let fallback = false;
  if (needAI.length) {
    let done = false;
    if (aiReady()) {
      try {
        const items = needAI.map(i => { const x = q.questions[i]; return {id:"q" + (i + 1), type:x.type, question:x.question, answer:x.answer, acceptable_answers:x.acceptable_answers || [], rubric:x.rubric || "", student_answer:results[i].user}; });
        const out = await aiCall("grade", {items});
        const arr = Array.isArray(out?.results) ? out.results : [];
        const byId = new Map(arr.filter(o => o && o.id).map(o => [String(o.id), o]));
        needAI.forEach(i => {
          const o = byId.get("q" + (i + 1)), r = results[i], x = q.questions[i];
          if (!o) { fallbackOne(x, r); fallback = true; return; }
          if (x.type === "essay") {
            let sc = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
            r.score = sc; r.correct = sc >= 60;
          } else { r.correct = o.correct === true || o.correct === "true"; }
          r.feedback = String(o.feedback || "").trim();
        });
        done = true;
      } catch (e) { const m = aiErr(e); toast(m, "bad"); }
    }
    if (!done) { fallback = true; needAI.forEach(i => fallbackOne(q.questions[i], results[i])); }
  }
  return {results, fallback};
}
function fallbackOne(x, r){
  if (x.type === "essay") { r.score = keywordScore(x.answer, r.user); r.correct = r.score >= 60; r.feedback = `모범답안의 핵심어와 비교한 간이 점수예요.`; }
  else { r.correct = false; r.feedback = "정답과 글자가 달라요. 뜻이 같다면 오답노트에서 '완료로 옮기기'를 눌러 주세요."; }
}

async function submitQuiz(force){
  const q = S.quiz; if (!q || S.grading) return;
  const left = q.questions.map((x, i) => String(q.answers[x.id] ?? "").trim() ? null : i + 1).filter(Boolean);
  if (left.length && !force) {
    const ok = await ask({title:`아직 ${left.length}문제를 안 풀었어요`, body:`${left.slice(0, 10).join(", ")}번${left.length > 10 ? " 등" : ""}이 비어 있어요. 빈 문제는 틀린 것으로 채점돼요.`, ok:"그래도 제출", cancel:"계속 풀기"});
    if (!ok) return;
  }
  S.grading = true; render();
  const {results, fallback} = await gradeQuiz();
  const qs = q.questions, ctx = q.ctx, now = Date.now();
  let sum = 0, correct = 0; const byType = {};
  qs.forEach((x, i) => {
    const r = results[i];
    sum += x.type === "essay" ? (r.score || 0) / 100 : (r.correct ? 1 : 0);
    if (r.correct) correct++;
    byType[x.type] = byType[x.type] || {n:0, c:0}; byType[x.type].n++; if (r.correct) byType[x.type].c++;
  });
  const score = Math.round(sum / qs.length * 100);
  const attempt = {kind:"attempt", setId:ctx.setId || null, title:ctx.title, subject:ctx.subject || "", mode:ctx.mode, createdAt:now, score, correct, total:qs.length, byType, fallback, answers:results};

  // 오답노트 반영 계획
  const writes = []; let savedWrong = 0, mastered = 0, finalDone = 0;
  qs.forEach((x, i) => {
    const r = results[i], wid = "wn_" + x.id, ex = Store.docs.get(wid);
    if (!r.correct) {
      const d = ex ? clone(ex) : {kind:"wrong", question:{id:x.id, type:x.type, question:x.question, options:x.options || [], answer:x.answer, acceptable_answers:x.acceptable_answers || [], rubric:x.rubric || "", explanation:x.explanation, source_quote:x.source_quote || "", difficulty:x.difficulty || "medium"}, setId:x.setId || ctx.setId || null, setTitle:x.setTitle || ctx.title, subject:x.subject || ctx.subject || "기타", createdAt:now, wrongCount:0, correctStreak:0, memo:"", status:"active"};
      d.wrongCount = (d.wrongCount || 0) + 1; d.correctStreak = 0; d.status = "active"; d.wrongAnswer = r.user; d.updatedAt = now;
      d.reviewStage = 0; d.nextReviewAt = now + REVIEW_DAYS[0] * DAY;              // 틀리면 1일 뒤 다시
      writes.push([wid, d]); savedWrong++;
    } else if (ex && ex.status !== "mastered") {
      const d = clone(ex); d.correctStreak = (d.correctStreak || 0) + 1; d.updatedAt = now;
      if (d.correctStreak >= 2) { d.status = "mastered"; d.reviewStage = 2; d.nextReviewAt = now + REVIEW_DAYS[2] * DAY; mastered++; } // 완료 → 7일 뒤 최종 확인
      else { d.reviewStage = 1; d.nextReviewAt = now + REVIEW_DAYS[1] * DAY; }  // 한 번 맞히면 3일 뒤
      writes.push([wid, d]);
    } else if (ex && ex.status === "mastered" && ex.nextReviewAt && ex.nextReviewAt <= endOfToday()) {
      const d = clone(ex); d.reviewStage = 3; d.nextReviewAt = null; d.updatedAt = now; // 7일 최종 확인 통과
      writes.push([wid, d]); finalDone++;
    }
  });
  let setWrite = null;
  if (ctx.mode === "set" && ctx.setId && ctx.setId !== "example" && Store.docs.get(ctx.setId)) {
    const s = clone(Store.docs.get(ctx.setId));
    s.attemptCount = (s.attemptCount || 0) + 1; s.lastScore = score; s.bestScore = Math.max(s.bestScore ?? 0, score);
    setWrite = [ctx.setId, s];
  }
  S.result = {attempt, questions:qs, savedWrong, mastered, finalDone};
  S.quiz = null; S.grading = false;
  go("result"); window.scrollTo(0, 0);
  if (score >= 80) setTimeout(confetti, 250);
  await Store.put(mkId("att"), attempt);
  if (setWrite) await Store.put(...setWrite);
  for (const [id, d] of writes) await Store.put(id, d);
}

/* ---------- generation ---------- */
async function generate(){
  if (genBlock() || (S.gen && S.gen.busy)) return;
  const f = S.form;
  const allowed = TYPES.filter(t => f.types[t]);
  const ctl = new AbortController();
  S.gen = {busy:true, made:0, total:f.count, ctl, err:""};
  renderGenBar();
  try {
    const out = await aiCall("generate", {text:f.text.trim(), count:f.count, difficulty:f.diff, types:allowed}, ctl.signal);
    const list = normalizeQuestions(out && out.questions, allowed).slice(0, f.count);
    if (!list.length) throw {code:"invalid_json"};
    const id = mkId("set");
    const title = f.title.trim() || (f.text.trim().split("\n")[0].slice(0, 24) + (f.text.trim().split("\n")[0].length > 24 ? "…" : ""));
    const set = {kind:"set", title, subject:f.subject.trim() || "기타", difficulty:f.diff, types:allowed, createdAt:Date.now(),
      material:f.text.trim().slice(0, MAX_CHARS), questions:list.map((q, i) => ({...q, id:`${id}-q${i + 1}`})), attemptCount:0, lastScore:null, bestScore:null};
    S.gen = null;
    await Store.put(id, set);
    toast(`문제 ${list.length}개를 만들었어요${list.length < f.count ? ` (형식이 맞지 않은 ${f.count - list.length}개는 뺐어요)` : ""}`);
    S.form.title = ""; S.form.fileNote = "";
    startSet(id);
  } catch (e) {
    if (e && e.code === "cancelled") { S.gen = null; toast("문제 생성을 중단했어요."); }
    else S.gen = {busy:false, err:aiErr(e)};
    if (route() === "new") renderGenBar();
  }
}
function renderGenBar(){
  if (route() !== "new") return;
  const el = $("#genbar");
  if (!el) return render();
  const tmp = document.createElement("div"); tmp.innerHTML = viewNew();
  el.innerHTML = tmp.querySelector("#genbar").innerHTML;
}
function refreshCounter(){
  const f = S.form, len = f.text.trim().length, c = $("#counter");
  if (c) {
    c.classList.toggle("over", len > MAX_CHARS);
    c.innerHTML = `<span>${len > MAX_CHARS ? "글자 수 제한을 넘었어요" : "많을수록 다양한 문제가 나와요 (2,000~5,000자 추천)"}</span><span class="mono">${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}자</span>`;
  }
  if (S.gen && S.gen.err) S.gen = null;
  renderGenBar();
}

/* ---------- files ---------- */
async function readTxt(file){
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", {fatal:true}).decode(buf); }
  catch (e) { try { return new TextDecoder("euc-kr").decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } }
}
async function extractPdf(file){
  if (!window.pdfjsLib) throw new Error("PDF 읽기 도구를 아직 불러오지 못했어요. 잠시 후 다시 올려 주세요.");
  try { pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; } catch (e) {}
  const pdf = await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map(it => it.str + (it.hasEOL ? "\n" : "")).join("") + "\n\n";
  }
  return out;
}
const cleanText = t => t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
async function handleFiles(files){
  const arr = [...(files || [])]; if (!arr.length) return;
  const f = S.form;
  f.extracting = true; f.fileErr = ""; render();
  try {
    const imgs = arr.filter(x => x.type.startsWith("image/"));
    const others = arr.filter(x => !x.type.startsWith("image/"));
    let text = "";
    for (const file of others) {
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") text += await extractPdf(file) + "\n\n";
      else if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) text += await readTxt(file) + "\n\n";
      else throw new Error(`'${file.name}'은(는) 읽을 수 없는 형식이에요. PDF, TXT, 사진 파일만 올려 주세요.`);
    }
    if (imgs.length) {
      if (!aiReady() || !S.aiLimits?.images) throw new Error("사진에서 글자를 읽으려면 AI가 필요해요. 이 화면에서는 쓸 수 없으니 글자를 직접 붙여 넣어 주세요.");
      const max = S.aiLimits.images.maxCount || 5;
      if (imgs.length > max) throw new Error(`사진은 한 번에 ${max}장까지 올릴 수 있어요.`);
      const images = await Promise.all(imgs.map(imageToPayload));
      const r = await aiCall("ocr", {images});
      text += (r?.text || "") + "\n\n";
    }
    text = cleanText(text);
    if (text.replace(/\s/g, "").length < 20) throw new Error("파일에서 글자를 거의 찾지 못했어요. 스캔한 PDF라면 페이지를 사진으로 올리거나 글자를 직접 붙여 넣어 주세요.");
    f.text = f.text.trim() ? f.text.trim() + "\n\n" + text : text;
    f.fileNote = `${arr.map(x => x.name).join(", ")}에서 ${text.length.toLocaleString()}자를 가져왔어요. 필요 없는 부분은 지우고 고쳐도 돼요.`;
    f.tab = "text";
    if (!f.title) f.title = arr[0].name.replace(/\.[^.]+$/, "").slice(0, 40);
  } catch (e) {
    f.fileErr = e && e.code ? aiErr(e) : (e && e.message) || "파일을 읽지 못했어요.";
  }
  f.extracting = false;
  if (route() === "new") render();
}

/* ---------- modal & toast ---------- */
function ask({title, body, ok = "확인", cancel = "취소", danger = false}){
  return new Promise(res => {
    const m = $("#modal"), prev = document.activeElement;
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ""}<div class="row end"><button class="btn ghost" data-m="0">${esc(cancel)}</button><button class="btn ${danger ? "danger solid" : "primary"}" data-m="1">${esc(ok)}</button></div></div>`;
    m.hidden = false; m.querySelector('[data-m="1"]').focus();
    const done = v => { m.hidden = true; m.innerHTML = ""; document.removeEventListener("keydown", kd, true); if (prev && prev.focus) prev.focus(); res(v); };
    const kd = e => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    m.onclick = e => { const b = e.target.closest("[data-m]"); if (b) done(b.dataset.m === "1"); else if (e.target === m) done(false); };
    document.addEventListener("keydown", kd, true);
  });
}
function toast(msg, kind = ""){
  const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = msg;
  $("#toasts").append(t); setTimeout(() => t.remove(), 3600);
}

/* ---------- events ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const act = b.dataset.act, id = b.dataset.id, v = b.dataset.v, f = S.form;
  if (b.tagName === "A") e.preventDefault();
  switch (act) {
    case "tab": f.tab = v; f.fileErr = ""; render(); break;
    case "example-text":
      if (f.text.trim() && !(await ask({title:"예시 자료로 바꿀까요?", body:"지금 쓴 자료가 예시 자료(광합성)로 바뀌어요.", ok:"바꾸기"}))) return;
      f.text = EXAMPLE_TEXT; f.tab = "text"; f.fileNote = ""; if (!f.title) f.title = "광합성"; if (!f.subject) f.subject = "과학"; S.gen = null; render(); break;
    case "generate": generate(); break;
    case "stop-gen": S.gen?.ctl?.abort(); break;
    case "opt": { const q = S.quiz, x = q.questions[q.idx]; q.answers[x.id] = x.options[+b.dataset.i]; render(); break; }
    case "ox": { const q = S.quiz, x = q.questions[q.idx]; q.answers[x.id] = v; render(); break; }
    case "qprev": if (S.quiz.idx > 0) { S.quiz.idx--; render(); } break;
    case "qnext": if (S.quiz.idx < S.quiz.questions.length - 1) { S.quiz.idx++; render(); } break;
    case "qgo": S.quiz.idx = +b.dataset.i; render(); break;
    case "submit": submitQuiz(); break;
    case "quit-quiz":
      if (await ask({title:"그만 풀까요?", body:"쓴 답은 남아 있어서 대시보드에서 이어 풀 수 있어요.", ok:"그만 풀기", cancel:"계속 풀기"})) go("home");
      break;
    case "play-set": startSet(id); break;
    case "del-set": {
      const s = findSet(id); if (!s) return;
      if (await ask({title:`'${s.title}' 세트를 삭제할까요?`, body:"오답노트에 저장된 문제와 점수 기록은 그대로 남아요.", ok:"삭제", danger:true})) { await Store.del(id); toast("문제 세트를 삭제했어요."); }
      break;
    }
    case "retry-wrong": {
      const {attempt:a, questions:qs} = S.result;
      startQuiz(qs.filter((_, i) => !a.answers[i].correct), {mode:"retry", setId:a.setId, title:a.title.replace(/ · 틀린 문제$/, "") + " · 틀린 문제", subject:a.subject});
      break;
    }
    case "weak-retry": {
      const list = String(b.dataset.ids || "").split(",").map(i => ({...Store.docs.get(i), id:i})).filter(w => w.question);
      startQuiz(questionsFromNotes(list), {mode:"review", title:"자주 틀리는 문제"}); break;
    }
    case "print-set": S.printId = id; go("print"); break;
    case "print-go": window.print(); break;
    case "print-back": go("sets"); break;
    case "edit-set": {
      const st = findSet(id); if (!st || st.example) return;
      S.edit = {id, title:st.title, dirty:false, err:"", questions:clone(st.questions).map(q => q.type === "multiple_choice" ? {...q, ai:q.options.indexOf(q.answer)} : q)};
      go("edit"); break;
    }
    case "edit-del":
      S.edit.questions.splice(+b.dataset.qi, 1); S.edit.dirty = true; render(); break;
    case "edit-cancel":
      if (S.edit?.dirty && !(await ask({title:"고친 내용을 버릴까요?", body:"저장하지 않은 수정은 사라져요.", ok:"버리기", cancel:"계속 고치기"}))) return;
      S.edit = null; go("sets"); break;
    case "edit-save": saveEdit(); break;
    case "review-today": startQuiz(questionsFromNotes(getWrong().filter(isDue)), {mode:"review", title:"오늘의 복습"}); break;
    case "notes-retry-all": startQuiz(questionsFromNotes(getWrong().filter(w => w.status !== "mastered")), {mode:"review", title:"오답노트 복습"}); break;
    case "notes-retry-list": {
      const ids = [...document.querySelectorAll('[data-act="note-retry"]')].map(x => x.dataset.id);
      startQuiz(questionsFromNotes(ids.map(i => ({...Store.docs.get(i), id:i})).filter(w => w.question)), {mode:"review", title:"오답노트 복습"});
      break;
    }
    case "nf-tab": S.nf.tab = v; render(); break;
    case "note-retry": { const w = Store.docs.get(id); if (w) startQuiz(questionsFromNotes([w]), {mode:"review", title:"오답 다시 풀기", subject:w.subject}); break; }
    case "memo-save": {
      const w = Store.docs.get(id), ta = document.getElementById("memo-" + id); if (!w || !ta) return;
      const d = clone(w); d.memo = ta.value.trim(); await Store.put(id, d); toast("메모를 저장했어요."); break;
    }
    case "note-master": case "note-restore": {
      const w = Store.docs.get(id); if (!w) return; const d = clone(w);
      d.status = act === "note-master" ? "mastered" : "active"; if (d.status === "active") d.correctStreak = 0; d.updatedAt = Date.now();
      if (d.status === "mastered") { d.reviewStage = 2; d.nextReviewAt = d.updatedAt + REVIEW_DAYS[2] * DAY; }
      else { d.reviewStage = 0; d.nextReviewAt = d.updatedAt + REVIEW_DAYS[0] * DAY; }
      await Store.put(id, d); toast(act === "note-master" ? "완료로 옮겼어요." : "복습 중으로 되돌렸어요."); break;
    }
    case "note-del":
      if (await ask({title:"이 오답을 삭제할까요?", body:"메모도 함께 지워져요.", ok:"삭제", danger:true})) { await Store.del(id); toast("오답을 삭제했어요."); }
      break;
    case "note-similar": makeSimilar(id); break;
    case "auth-mode": S.auth.mode = v; S.auth.err = ""; S.auth.info = ""; render(); break;
    case "guest": Auth.startGuest(); await Store.init(); go("home"); toast("체험 모드예요. 기록은 이 브라우저에만 저장돼요."); break;
    case "go-login": try { localStorage.removeItem(GUEST_KEY); } catch (err) {} S.auth.mode = "login"; Store.mode = "signedout"; updateStatus(); render(); break;
    case "logout":
      if (await ask({title:"로그아웃할까요?", body:"기록은 Supabase에 저장되어 있어서 다시 로그인하면 그대로 보여요.", ok:"로그아웃"})) {
        S.quiz = null; S.result = null; await Auth.signOut(); toast("로그아웃했어요.");
      }
      break;
    case "export": exportData(); break;
    case "wipe": wipeData(); break;
    case "sim-close": delete S.similar[id]; render(); break;
    case "sim-play": {
      const w = Store.docs.get(id), sq = S.similar[id]; if (!w || !sq) return;
      startQuiz([{...sq, setId:w.setId, setTitle:w.setTitle, subject:w.subject}], {mode:"similar", setId:w.setId, title:"비슷한 문제", subject:w.subject});
      delete S.similar[id]; break;
    }
  }
});
/* 문제 수정 저장: 빈칸·정답 오류를 검사하고 DB에 반영한다 */
async function saveEdit(){
  const e = S.edit; if (!e) return;
  const out = [];
  for (const [i, q] of e.questions.entries()) {
    const n = `${i + 1}번 문제`, x = {...q, question:q.question.trim(), explanation:(q.explanation || "").trim()};
    if (!x.question) { e.err = `${n}의 문제 내용이 비어 있어요.`; return render(); }
    if (x.type === "multiple_choice") {
      x.options = x.options.map(o => o.trim());
      if (x.options.some(o => !o)) { e.err = `${n}에 빈 보기가 있어요.`; return render(); }
      if (new Set(x.options.map(norm)).size !== x.options.length) { e.err = `${n}에 같은 보기가 두 번 있어요.`; return render(); }
      if (!(x.ai >= 0)) { e.err = `${n}의 정답을 골라 주세요.`; return render(); }
      x.answer = x.options[x.ai];
    } else {
      x.answer = String(x.answer || "").trim();
      if (!x.answer) { e.err = `${n}의 정답이 비어 있어요.`; return render(); }
    }
    delete x.ai; out.push(x);
  }
  e.err = "";
  await Store.saveQuestions(e.id, out);
  toast(`'${e.title}' 문제 ${out.length}개를 저장했어요.`);
  S.edit = null; go("sets");
}

async function makeSimilar(id){
  const w = Store.docs.get(id); if (!w || !aiReady()) return;
  S.simBusy[id] = true; render();
  try {
    const s = w.setId ? findSet(w.setId) : null;
    const out = await aiCall("similar", {question:w.question, material:(s && s.material) || ""});
    const one = normalizeQuestions([out && out.question ? out.question : out], [w.question.type])[0];
    if (!one) throw {code:"invalid_json"};
    S.similar[id] = {...one, id:"sim_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)};
  } catch (e) { toast(aiErr(e), "bad"); }
  delete S.simBusy[id];
  if (route() === "notes") render();
}
document.addEventListener("input", e => {
  const el = e.target, k = el.dataset && el.dataset.in; if (!k) return;
  if (k === "ans" && S.quiz) {
    const q = S.quiz, x = q.questions[q.idx]; q.answers[x.id] = el.value;
    const done = answeredCount(q), n = q.questions.length;
    const bar = $("#qbar"); if (bar) bar.style.width = (done / n * 100) + "%";
    const qd = $("#qdone"); if (qd) qd.textContent = `${done}문제 답함 · ${n - done}문제 남음`;
    const btn = document.querySelector(`.qn[data-i="${q.idx}"]`); if (btn) btn.classList.toggle("done", !!el.value.trim());
    const el2 = $("#essay-len"); if (el2) el2.textContent = el.value.length + "자";
  } else if (k === "text") { S.form.text = el.value; refreshCounter(); }
  else if (k === "title") S.form.title = el.value;
  else if (k === "subject") S.form.subject = el.value;
  else if (k === "edit" && S.edit) {
    const q = S.edit.questions[+el.dataset.qi], f = el.dataset.f; S.edit.dirty = true;
    if (f === "opt") q.options[+el.dataset.oi] = el.value;
    else if (f === "acc") q.acceptable_answers = el.value.split(",").map(x => x.trim()).filter(Boolean);
    else q[f] = el.value;
  }
});
document.addEventListener("change", e => {
  const el = e.target, k = el.dataset && el.dataset.ch; if (!k) return;
  if (k === "file") handleFiles(el.files);
  else if (k === "import") { importData(el.files && el.files[0]); el.value = ""; }
  else if (k === "nf") { S.nf[el.name] = el.value; render(); }
  else if (k === "edit-ans" && S.edit) { S.edit.questions[+el.dataset.qi].ai = +el.value; S.edit.dirty = true; }
  else if (k === "edit-ox" && S.edit) { S.edit.questions[+el.dataset.qi].answer = el.value; S.edit.dirty = true; }
  else if (k === "count") { S.form.count = +el.value; S.gen = null; renderGenBar(); }
  else if (k === "diff") { S.form.diff = el.value; S.gen = null; renderGenBar(); }
  else if (k === "type") { S.form.types[el.value] = el.checked; S.gen = null; renderGenBar(); }
});
document.addEventListener("focusout", () => { setTimeout(() => { if (S.pendingRender && !($("#main").contains(document.activeElement) && /^(TEXTAREA|INPUT|SELECT)$/.test(document.activeElement.tagName))) render(); }, 150); });
document.addEventListener("dragover", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
document.addEventListener("dragleave", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) d.classList.remove("over"); });
document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.remove("over"); handleFiles(e.dataTransfer.files); } });
document.addEventListener("keydown", e => {
  if (route() !== "quiz" || !S.quiz || S.grading || !$("#modal").hidden) return;
  const t = e.target, typing = /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName);
  const q = S.quiz, x = q.questions[q.idx];
  if (typing) {
    if (e.key === "Enter" && t.tagName === "INPUT" && !e.isComposing) { e.preventDefault(); if (q.idx < q.questions.length - 1) { q.idx++; render(); } else submitQuiz(); }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (x.type === "multiple_choice" && /^[1-5]$/.test(e.key) && x.options[+e.key - 1] != null) { q.answers[x.id] = x.options[+e.key - 1]; render(); }
  else if (x.type === "ox" && /^[oOxX]$/.test(e.key)) { q.answers[x.id] = e.key.toUpperCase(); render(); }
  else if (e.key === "ArrowRight" && q.idx < q.questions.length - 1) { q.idx++; render(); }
  else if (e.key === "ArrowLeft" && q.idx > 0) { q.idx--; render(); }
});
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

/* 로그인·회원가입 폼: 수업 4장의 form 요소를 쓰고, 제출은 JavaScript가 Supabase로 보낸다 */
document.addEventListener("submit", async e => {
  const form = e.target; if (form.id !== "auth-form") return;
  e.preventDefault();
  const a = S.auth; if (a.busy) return;
  const email = form.email.value.trim(), password = form.password.value, name = form.dname ? form.dname.value.trim() : "";
  a.email = email; a.err = ""; a.info = "";
  if (a.mode === "signup" && password !== form.password2.value) { a.err = "비밀번호 두 칸이 서로 달라요."; return render(); }
  a.busy = true; render();
  try {
    if (a.mode === "login") { await Auth.signIn(email, password); toast("로그인했어요."); }
    else {
      const {needConfirm} = await Auth.signUp(email, password, name);
      if (needConfirm) { a.mode = "login"; a.info = `${email}로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.`; }
      else toast("가입을 마쳤어요. 환영해요!");
    }
  } catch (err) { a.err = authErr(err); }
  a.busy = false;
  if (Auth.needLogin()) render();
});

/* ---------- boot ---------- */
async function start(){
  updateNav(route()); updateStatus(); render();
  try { await Auth.init(); } catch (e) { Auth.checked = true; }
  await Store.init();
  initAI();
}
start();
