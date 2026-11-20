"use strict";
/* AI 연결과 프롬프트 */
/* ---------- AI (Supabase Edge Function → Claude API) ----------
   브라우저는 AI 키를 갖고 있지 않다. 로그인한 사용자의 요청을 Supabase의 "ai" 함수로 보내면,
   함수가 서버에 숨겨 둔 Claude API 키로 문제를 만들고 결과만 돌려준다. */
const AI_MAX_IMAGES = 5;

async function aiCall(action, payload = {}, signal){
  if (!sb || !Auth.user) throw {code:"login_required"};
  let res;
  try { res = await sb.functions.invoke("ai", {body:{action, ...payload}, signal}); }
  catch (e) { if (signal?.aborted || e?.name === "AbortError") throw {code:"cancelled"}; throw {code:"network"}; }
  if (signal?.aborted) throw {code:"cancelled"};
  if (res.error) {
    let info = null;
    try { info = await res.error.context.json(); } catch (e) {}
    if (signal?.aborted || res.error.name === "FunctionsFetchError" && /abort/i.test(res.error.message)) throw {code:"cancelled"};
    throw {code:info?.error?.code || "network", message:info?.error?.message};
  }
  return res.data?.data;
}

async function initAI(){
  S.ai = null; S.aiLimits = null; S.aiBlocked = false; S.blockedMsg = "";
  if (Auth.user) {
    try {
      const r = await aiCall("ping");
      if (r?.configured) { S.ai = true; S.aiLimits = {images:{maxCount:AI_MAX_IMAGES}}; }
      else { S.aiBlocked = true; S.blockedMsg = "AI 서버에 Claude API 키가 아직 등록되지 않았어요."; }
    } catch (e) { S.blockedMsg = aiErr(e); }
  } else {
    S.blockedMsg = sb ? "AI 기능은 로그인하면 쓸 수 있어요."
                      : "AI 서버에 연결하지 못했어요.";
  }
  S.aiChecked = true;
  updateStatus();
  if (route() === "new" && !S.gen && !S.form.extracting) render();
}
const aiReady = () => !!S.ai && !S.aiBlocked;
function aiErr(e){
  const c = e && e.code;
  return ({
    login_required:"AI 기능은 로그인해야 쓸 수 있어요.",
    unauthorized:"로그인이 만료됐어요. 다시 로그인해 주세요.",
    not_configured:"AI 서버에 Claude API 키가 아직 등록되지 않았어요.",
    bad_key:"AI 서버의 Claude API 키가 올바르지 않아요. 키를 다시 등록해 주세요.",
    no_credit:"Claude API 크레딧이 부족해요. Claude Console에서 크레딧을 충전해 주세요.",
    model_not_found:"AI 모델을 찾지 못했어요. 잠시 후 다시 시도해 주세요.",
    rate_limited:"AI 요청이 너무 많아요. 1~2분 뒤에 다시 시도해 주세요.",
    prompt_too_large:"자료가 너무 길어요. 조금 줄여서 다시 시도해 주세요.",
    too_short:"자료가 너무 짧아요. 50자 이상 넣어 주세요.",
    invalid_json:"AI 응답을 읽지 못했어요. 다시 시도해 주세요.",
    refused:"이 자료로는 문제를 만들 수 없어요. 다른 자료로 시도해 주세요.",
    empty_completion:"AI가 답을 만들지 못했어요. 문제 수를 줄여서 다시 시도해 주세요.",
    image_rejected:"이 사진은 읽을 수 없어요. JPG나 PNG 파일로 다시 올려 주세요.",
    network:"AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.",
    cancelled:"중단했어요."
  })[c] || "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

/* 사진을 긴 변 1600px 이하 JPEG로 줄여 base64로 바꾼다 (전송 용량 줄이기) */
async function imageToPayload(file){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return {mime:"image/jpeg", data:url.slice(url.indexOf(",") + 1)};
}

/* AI가 돌려준 문제를 검사하고 형식을 맞춘다 */
function normalizeQuestions(arr, allowed){
  const out = [];
  if (!Array.isArray(arr)) return out;
  const alias = {mc:"multiple_choice", multiple:"multiple_choice", "객관식":"multiple_choice", "o/x":"ox", ox:"ox", "short":"short_answer", "단답형":"short_answer", "서술형":"essay", essay:"essay"};
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    let type = String(raw.type || "").toLowerCase().trim();
    type = TYPES.includes(type) ? type : (alias[type] || "");
    if (!type || (allowed && !allowed.includes(type))) continue;
    const question = String(raw.question || "").trim();
    if (!question) continue;
    const q = {type, question, options:[], answer:"", acceptable_answers:[], rubric:"",
      explanation:String(raw.explanation || "").trim(), source_quote:String(raw.source_quote || "").trim().slice(0, 200),
      difficulty:["easy","medium","hard"].includes(raw.difficulty) ? raw.difficulty : "medium"};
    const pg = Number(raw.source_page);
    if (Number.isInteger(pg) && pg > 0) q.source_page = pg;
    let ans = String(raw.answer ?? "").trim();
    if (type === "multiple_choice") {
      const opts = (Array.isArray(raw.options) ? raw.options : []).map(o => String(o ?? "").replace(/^\s*(?:[①②③④⑤]|[1-5A-Ea-e][.)]|\([1-5A-Ea-e]\))\s*/, "").trim()).filter(Boolean).slice(0, 5);
      if (opts.length < 2) continue;
      let hit = opts.find(o => o === ans) || opts.find(o => norm(o) === norm(ans));
      if (!hit) {
        let m = ans.match(/^[①②③④⑤]/); if (m) hit = opts[CIRCLED.indexOf(m[0])];
        if (!hit && /^[1-5]$/.test(ans)) hit = opts[+ans - 1];
        if (!hit && /^[A-Ea-e]$/.test(ans)) hit = opts[ans.toUpperCase().charCodeAt(0) - 65];
        if (!hit) { const strip = ans.replace(/^\s*(?:[①②③④⑤]|[1-5A-Ea-e][.)])\s*/, ""); hit = opts.find(o => norm(o) === norm(strip)); }
      }
      if (!hit) continue;
      // AI는 정답을 1번 보기에 자주 두므로 보기 순서를 무작위로 섞는다 (정답은 글자로 저장되어 순서와 무관)
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      q.options = opts; q.answer = hit;
    } else if (type === "ox") {
      const a = norm(ans);
      if (["o","○","참","true","맞음","예"].includes(a)) q.answer = "O";
      else if (["x","×","거짓","false","틀림","아니오"].includes(a)) q.answer = "X";
      else continue;
    } else if (type === "short_answer") {
      if (!ans) continue;
      q.answer = ans;
      q.acceptable_answers = (Array.isArray(raw.acceptable_answers) ? raw.acceptable_answers : []).map(x => String(x ?? "").trim()).filter(Boolean).slice(0, 8);
    } else {
      if (!ans) continue;
      q.answer = ans; q.rubric = String(raw.rubric || "").trim();
    }
    if (!q.explanation) q.explanation = "자료의 근거 문장을 다시 읽어 보세요.";
    out.push(q);
  }
  return out;
}

/* 프롬프트(AI에게 주는 지시문)는 서버 함수 supabase/functions/ai/index.ts 에 있다. */
