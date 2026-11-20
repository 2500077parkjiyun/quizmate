"use strict";
/* 로그인(Supabase Auth)과 데이터 저장(Supabase DB)
   앱의 나머지 코드는 Store.docs(Map)에 담긴 문서만 보고 화면을 그린다.
   Store가 그 문서를 Supabase 테이블의 행으로 바꿔 저장하고, 불러올 때 다시 문서로 바꾼다.
     문제 세트(set_)  ↔ quiz_sets + questions
     풀이 기록(att_)  ↔ attempts
     오답노트(wn_)    ↔ wrong_notes
   로그인하지 않고 "체험 모드"를 고르면 이 브라우저(localStorage)에만 저장한다. */

const sb = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const GUEST_KEY = "quizmate.guest", LOCAL_KEY = "quizmate.v1";

/* ---------- 로그인 ---------- */
const Auth = {
  checked:false, user:null, name:"",
  async init(){
    if (!sb) { this.checked = true; return; }
    const {data} = await sb.auth.getSession();
    await this.apply(data.session);
    sb.auth.onAuthStateChange((event, session) => {
      // 같은 사람의 토큰 갱신은 무시하고, 로그인·로그아웃이 바뀔 때만 다시 불러온다
      const uid = session?.user?.id || null;
      if (uid === (this.user?.id || null)) return;
      setTimeout(() => this.apply(session).then(() => { Store.init(); initAI(); }), 0);
    });
  },
  async apply(session){
    this.user = session?.user || null;
    this.name = this.user ? (this.user.user_metadata?.display_name || this.user.email.split("@")[0]) : "";
    this.checked = true;
    if (this.user) try { localStorage.removeItem(GUEST_KEY); } catch (e) {}
  },
  isGuest(){ try { return localStorage.getItem(GUEST_KEY) === "1"; } catch (e) { return false; } },
  needLogin(){ return this.checked && !this.user && !this.isGuest(); },
  async signIn(email, password){
    const {error} = await sb.auth.signInWithPassword({email, password});
    if (error) throw error;
  },
  async signUp(email, password, displayName){
    const {data, error} = await sb.auth.signUp({email, password, options:{
      data:{display_name:displayName || email.split("@")[0]},
      emailRedirectTo:location.origin + location.pathname
    }});
    if (error) throw error;
    return {needConfirm:!data.session};
  },
  async signOut(){ await sb.auth.signOut(); },
  startGuest(){ try { localStorage.setItem(GUEST_KEY, "1"); } catch (e) {} }
};

function authErr(e){
  // Supabase가 알려 주는 오류 코드로 먼저 구분하고, 없으면 메시지 글자로 구분한다
  const byCode = {
    email_address_invalid:"쓸 수 없는 이메일 주소예요. test@example.com 같은 예시 주소 말고 실제로 쓰는 이메일을 넣어 주세요.",
    invalid_credentials:"이메일 또는 비밀번호가 맞지 않아요.",
    email_not_confirmed:"메일함에서 인증 링크를 먼저 눌러 주세요.",
    user_already_exists:"이미 가입한 이메일이에요. 로그인해 주세요.",
    email_exists:"이미 가입한 이메일이에요. 로그인해 주세요.",
    weak_password:"비밀번호는 6자 이상이어야 해요.",
    over_email_send_rate_limit:"인증 메일을 너무 많이 보냈어요. 잠시 후 다시 시도해 주세요.",
    over_request_rate_limit:"요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
    signup_disabled:"지금은 회원가입을 받지 않아요."
  };
  if (byCode[e?.code]) return byCode[e.code];
  const m = String(e?.message || "");
  if (/is invalid/i.test(m) && /email/i.test(m)) return byCode.email_address_invalid;
  if (/invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 맞지 않아요.";
  if (/email not confirmed/i.test(m)) return "메일함에서 인증 링크를 먼저 눌러 주세요.";
  if (/already registered|already been registered/i.test(m)) return "이미 가입한 이메일이에요. 로그인해 주세요.";
  if (/password should be at least/i.test(m)) return "비밀번호는 6자 이상이어야 해요.";
  if (/rate limit|too many/i.test(m)) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (/invalid.*email|unable to validate email/i.test(m)) return "이메일 주소 형식을 확인해 주세요.";
  return "로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

/* ---------- 문서 ↔ 테이블 행 바꾸기 ---------- */
const ms = t => t ? new Date(t).getTime() : 0;
const iso = n => new Date(n || Date.now()).toISOString();

/* DB에 저장된 세트만 외래 키(set_id)로 연결한다.
   예시 세트("example")나 이미 지운 세트를 가리키면 외래 키 규칙에 걸리므로 빈 값(null)으로 둔다. 세트 제목은 set_title에 남는다. */
const savedSetId = id => (id && Store.savedQ.has(id)) ? id : null;

const Rows = {
  setToRow:(id, d) => ({id, title:d.title, subject:d.subject || "기타", difficulty:d.difficulty || "medium", types:d.types || [],
    material:d.material || "", attempt_count:d.attemptCount || 0, last_score:d.lastScore ?? null, best_score:d.bestScore ?? null, created_at:iso(d.createdAt)}),
  questionToRow:(setId, q, i) => ({id:q.id, set_id:setId, position:i + 1, type:q.type, question:q.question, options:q.options || [],
    answer:q.answer, acceptable_answers:q.acceptable_answers || [], rubric:q.rubric || "", explanation:q.explanation || "",
    source_quote:q.source_quote || "", difficulty:q.difficulty || "medium", source_page:q.source_page || null}),
  rowToSet:(r, qs) => ({kind:"set", title:r.title, subject:r.subject, difficulty:r.difficulty, types:r.types, material:r.material,
    attemptCount:r.attempt_count, lastScore:r.last_score, bestScore:r.best_score, createdAt:ms(r.created_at),
    questions:qs.sort((a, b) => a.position - b.position).map(q => ({id:q.id, type:q.type, question:q.question, options:q.options,
      answer:q.answer, acceptable_answers:q.acceptable_answers, rubric:q.rubric, explanation:q.explanation, source_quote:q.source_quote, difficulty:q.difficulty,
      ...(q.source_page ? {source_page:q.source_page} : {})}))}),
  attemptToRow:(id, d) => ({id, set_id:savedSetId(d.setId), title:d.title, subject:d.subject || "", mode:d.mode || "set", score:d.score,
    correct:d.correct, total:d.total, by_type:d.byType || {}, fallback:!!d.fallback, answers:d.answers || [], created_at:iso(d.createdAt)}),
  rowToAttempt:r => ({kind:"attempt", setId:r.set_id, title:r.title, subject:r.subject, mode:r.mode, score:r.score, correct:r.correct,
    total:r.total, byType:r.by_type, fallback:r.fallback, answers:r.answers, createdAt:ms(r.created_at)}),
  wrongToRow:(id, d) => ({id, set_id:savedSetId(d.setId), set_title:d.setTitle || "", subject:d.subject || "기타", question:d.question,
    wrong_answer:d.wrongAnswer ?? null, wrong_count:d.wrongCount || 0, correct_streak:d.correctStreak || 0, memo:d.memo || "",
    status:d.status === "mastered" ? "mastered" : "active", created_at:iso(d.createdAt), updated_at:iso(d.updatedAt || d.createdAt),
    review_stage:d.reviewStage || 0, next_review_at:d.nextReviewAt ? iso(d.nextReviewAt) : null}),
  rowToWrong:r => ({kind:"wrong", setId:r.set_id, setTitle:r.set_title, subject:r.subject, question:r.question, wrongAnswer:r.wrong_answer,
    wrongCount:r.wrong_count, correctStreak:r.correct_streak, memo:r.memo, status:r.status, createdAt:ms(r.created_at), updatedAt:ms(r.updated_at),
    reviewStage:r.review_stage, nextReviewAt:r.next_review_at ? ms(r.next_review_at) : null})
};
const TABLE = {set:"quiz_sets", attempt:"attempts", wrong:"wrong_notes"};

/* ---------- 저장소 ---------- */
const Store = {
  mode:"loading", docs:new Map(), savedQ:new Set(),
  async init(){
    this.docs = new Map(); this.savedQ = new Set(); S.ready = false;
    if (Auth.user && sb) {
      this.mode = "loading"; updateStatus(); render();
      try {
        const [sets, qs, atts, wns] = await Promise.all([
          sb.from("quiz_sets").select("*"),
          sb.from("questions").select("*"),
          sb.from("attempts").select("*").order("created_at", {ascending:false}).limit(200),
          sb.from("wrong_notes").select("*")
        ]);
        const err = sets.error || qs.error || atts.error || wns.error;
        if (err) throw err;
        const bySet = new Map();
        for (const q of qs.data) { if (!bySet.has(q.set_id)) bySet.set(q.set_id, []); bySet.get(q.set_id).push(q); }
        for (const r of sets.data) { this.docs.set(r.id, Rows.rowToSet(r, bySet.get(r.id) || [])); this.savedQ.add(r.id); }
        for (const r of atts.data) this.docs.set(r.id, Rows.rowToAttempt(r));
        for (const r of wns.data) this.docs.set(r.id, Rows.rowToWrong(r));
        this.mode = "cloud";
      } catch (e) {
        this.mode = "error";
        toast("데이터를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.", "bad");
      }
    } else if (Auth.isGuest() || !sb) {
      this.mode = "local";
      try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) this.docs = new Map(Object.entries(JSON.parse(raw))); } catch (e) {}
    } else {
      this.mode = "signedout";
    }
    updateStatus();
    onData();
  },
  saveLocal(){ try { localStorage.setItem(LOCAL_KEY, JSON.stringify(Object.fromEntries(this.docs))); } catch (e) {} },
  async put(id, data){
    this.docs.set(id, data); onData();
    if (this.mode === "local") return this.saveLocal();
    if (this.mode !== "cloud") return;
    try {
      if (data.kind === "set") {
        const r = await sb.from("quiz_sets").upsert(Rows.setToRow(id, data));
        if (r.error) throw r.error;
        if (!this.savedQ.has(id)) {           // 문제는 처음 저장할 때 한 번만 넣는다
          const q = await sb.from("questions").upsert(data.questions.map((x, i) => Rows.questionToRow(id, x, i)));
          if (q.error) throw q.error;
          this.savedQ.add(id);
        }
      } else if (data.kind === "attempt") {
        const r = await sb.from("attempts").upsert(Rows.attemptToRow(id, data)); if (r.error) throw r.error;
      } else if (data.kind === "wrong") {
        const r = await sb.from("wrong_notes").upsert(Rows.wrongToRow(id, data)); if (r.error) throw r.error;
      }
    } catch (e) { dbErr(e); }
  },
  /* 문제 수정 저장: 뺀 문제는 지우고, 남은 문제는 새 순서로 다시 저장 */
  async saveQuestions(id, questions){
    const d = this.docs.get(id); if (!d) return;
    this.docs.set(id, {...d, questions}); onData();
    if (this.mode === "local") return this.saveLocal();
    if (this.mode !== "cloud") return;
    try {
      const keep = questions.map(q => `"${q.id}"`).join(",");
      const r1 = await sb.from("questions").delete().eq("set_id", id).not("id", "in", `(${keep})`);
      if (r1.error) throw r1.error;
      const r2 = await sb.from("questions").upsert(questions.map((q, i) => Rows.questionToRow(id, q, i)));
      if (r2.error) throw r2.error;
    } catch (e) { dbErr(e); }
  },
  async del(id){
    const kind = this.docs.get(id)?.kind;
    this.docs.delete(id); onData();
    if (this.mode === "local") return this.saveLocal();
    if (this.mode !== "cloud" || !TABLE[kind]) return;
    try { const r = await sb.from(TABLE[kind]).delete().eq("id", id); if (r.error) throw r.error; this.savedQ.delete(id); }
    catch (e) { dbErr(e); }
  }
};
function dbErr(e){
  const c = String(e?.code || "");
  if (c === "42501") toast("저장 권한이 없어요. 다시 로그인해 주세요.", "bad");
  else if (c === "23514") toast("저장하지 못했어요. 입력 내용이 너무 길거나 형식이 맞지 않아요.", "bad");
  else toast("저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.", "bad");
}
const allOf = kind => [...Store.docs].filter(([, v]) => v && v.kind === kind).map(([id, v]) => ({...v, id}));
const getSets = () => allOf("set").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const getAttempts = () => allOf("attempt").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const getWrong = () => allOf("wrong");
function findSet(id){ if (id === "example") return EXAMPLE_SET; const d = Store.docs.get(id); return d ? {...d, id} : null; }

function onData(){
  S.ready = Store.mode !== "loading";
  const r = route();
  updateNav(r);
  if (r === "quiz" || r === "new" || r === "edit") return;
  const a = document.activeElement;
  if (a && $("#main").contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) { S.pendingRender = true; return; }
  render();
}
