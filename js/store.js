"use strict";
/* 데이터 저장소 */
/* ---------- storage: Claude 계정 저장소(db), 안 되면 이 브라우저 ---------- */
const Store = {
  mode:"loading", col:null, docs:new Map(),
  async init(){
    let db = null, user = null, uid = null;
    if (window.claude?.use) {
      try { [db, user] = await Promise.all([claude.use("db"), claude.use("user")]); } catch (e) {}
      if (user) { try { uid = await user.id(); } catch (e) {} }
    }
    if (db && uid) {
      this.mode = "cloud";
      this.col = db.collection("data/users/" + uid);
      this.col.onSnapshot(snap => {
        this.docs = new Map(snap.docs.map(d => [d.id, d.data()]));
        onData();
      }, () => toast("저장소 연결이 끊겼어요. 페이지를 새로고침해 주세요.", "bad"));
    } else {
      this.mode = "local";
      try { const raw = localStorage.getItem("quizmate.v1"); if (raw) this.docs = new Map(Object.entries(JSON.parse(raw))); } catch (e) {}
      onData();
    }
    updateStatus();
  },
  saveLocal(){ try { localStorage.setItem("quizmate.v1", JSON.stringify(Object.fromEntries(this.docs))); } catch (e) {} },
  async put(id, data){
    this.docs.set(id, data); onData();
    if (this.mode === "cloud") { try { await this.col.doc(id).set(data); } catch (e) { dbErr(e); } }
    else this.saveLocal();
  },
  async del(id){
    this.docs.delete(id); onData();
    if (this.mode === "cloud") { try { await this.col.doc(id).delete(); } catch (e) { dbErr(e); } }
    else this.saveLocal();
  }
};
function dbErr(e){
  const c = e && e.code;
  if (c === "quota_exceeded") toast("저장 공간이 가득 찼어요. 오래된 문제 세트를 지워 주세요.", "bad");
  else if (c === "invalid_argument") toast("저장하지 못했어요. 이 화면에서는 저장 권한이 없어요.", "bad");
  else toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "bad");
}
const allOf = kind => [...Store.docs].filter(([, v]) => v && v.kind === kind).map(([id, v]) => ({...v, id}));
const getSets = () => allOf("set").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const getAttempts = () => allOf("attempt").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const getWrong = () => allOf("wrong");
function findSet(id){ if (id === "example") return EXAMPLE_SET; const d = Store.docs.get(id); return d ? {...d, id} : null; }

function onData(){
  S.ready = true;
  const r = route();
  updateNav(r);
  if (r === "quiz" || r === "new") return;
  const a = document.activeElement;
  if (a && $("#main").contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)) { S.pendingRender = true; return; }
  render();
}
