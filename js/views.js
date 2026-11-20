"use strict";
/* 화면(뷰) 그리기 함수 */
/* ---------- views ---------- */
function loadingView(){ return `<div class="empty"><div class="spin"></div>불러오는 중…</div>`; }

/* 로그인 · 회원가입 화면 */
function viewLogin(){
  const a = S.auth, up = a.mode === "signup", reset = a.mode === "reset";
  if (!sb) return `<div class="card empty">로그인 도구(Supabase)를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.<div class="row" style="justify-content:center;margin-top:16px"><button class="btn" data-act="guest">체험 모드로 둘러보기</button></div></div>`;
  return `
  <section class="auth">
    <div class="auth-intro">
      <p class="eyebrow">AI 학습 도우미</p>
      <h1>공부한 자료로<br><span class="mark">나만의 시험지</span>를</h1>
      <p class="lead">교과서 내용이나 필기를 넣으면 AI가 문제를 만들고, 채점과 오답노트까지 챙겨 줘요. 로그인하면 내 기록이 Supabase 데이터베이스에 안전하게 저장돼요.</p>
      <ul class="facts">
        <li>객관식, O/X, 단답형, 서술형 4가지 유형</li>
        <li>문제마다 해설과 자료 속 근거 문장</li>
        <li>틀린 문제는 오답노트에 자동 저장, 두 번 연속 맞히면 완료</li>
      </ul>
    </div>
    <div class="card auth-card">
      <div class="seg" role="tablist" style="margin-bottom:18px">
        <button role="tab" type="button" aria-selected="${!up}" class="${up || reset ? "" : "on"}" data-act="auth-mode" data-v="login">로그인</button>
        <button role="tab" type="button" aria-selected="${up}" class="${up ? "on" : ""}" data-act="auth-mode" data-v="signup">회원가입</button>
      </div>
      ${a.info ? `<p class="notice info" style="margin-bottom:14px">${esc(a.info)}</p>` : ""}
      ${a.err ? `<p class="notice" role="alert" style="margin-bottom:14px">${esc(a.err)}</p>` : ""}
      ${reset ? `<form id="reset-form" class="auth-form" novalidate>
        <h2 style="margin-bottom:6px">비밀번호 재설정</h2>
        <p class="muted small" style="margin-bottom:10px">가입한 이메일을 넣으면 비밀번호를 새로 정하는 링크를 보내 드려요.</p>
        <label class="lbl" for="rs-email">이메일</label>
        <input id="rs-email" class="field" name="email" type="email" autocomplete="email" required value="${esc(a.email)}">
        <button class="btn primary big" type="submit" ${a.busy ? "disabled" : ""}>${a.busy ? "보내는 중…" : "재설정 링크 보내기"}</button>
        <button class="linkbtn" type="button" data-act="auth-mode" data-v="login" style="margin-top:10px">← 로그인으로 돌아가기</button>
      </form>` : `<form id="auth-form" class="auth-form" novalidate>
        <label class="lbl" for="au-email">이메일</label>
        <input id="au-email" class="field" name="email" type="email" autocomplete="email" required value="${esc(a.email)}" placeholder="you@example.com">
        ${up ? `<label class="lbl" for="au-name">이름 (화면에 보여요)</label>
        <input id="au-name" class="field" name="dname" type="text" autocomplete="nickname" maxlength="20" placeholder="예: 지윤">` : ""}
        <label class="lbl" for="au-pw">비밀번호</label>
        <input id="au-pw" class="field" name="password" type="password" autocomplete="${up ? "new-password" : "current-password"}" required minlength="6" placeholder="6자 이상">
        ${up ? `<label class="lbl" for="au-pw2">비밀번호 확인</label>
        <input id="au-pw2" class="field" name="password2" type="password" autocomplete="new-password" required minlength="6">` : ""}
        <button class="btn primary big" type="submit" ${a.busy ? "disabled" : ""}>${a.busy ? "잠시만요…" : up ? "가입하기" : "로그인"}</button>
        ${up ? "" : `<button class="linkbtn" type="button" data-act="auth-mode" data-v="reset" style="margin-top:10px">비밀번호를 잊었어요</button>`}
      </form>`}
      <p class="muted small" style="margin-top:16px;text-align:center">가입 없이 먼저 써 보고 싶다면 <button class="linkbtn" data-act="guest">체험 모드로 둘러보기</button><br>(체험 모드 기록은 이 브라우저에만 저장돼요)</p>
    </div>
  </section>`;
}

function viewHome(){
  if (!S.ready) return loadingView();
  const at = getAttempts(), wr = getWrong();
  const act = wr.filter(w => w.status !== "mastered"), mas = wr.length - act.length;
  const solved = at.reduce((s, a) => s + (a.total || 0), 0);
  const corr = at.reduce((s, a) => s + (a.correct || 0), 0);
  const rate = solved ? Math.round(corr / solved * 100) : null;
  const sets = getSets();
  const scores = at.slice(0, 12).reverse().map(a => a.score);
  const due = wr.filter(isDue);
  const dueCard = due.length ? `<div class="card resume due"><div><b>오늘 복습할 문제 ${due.length}개</b><p class="muted small">틀린 문제는 1일 뒤, 한 번 맞히면 3일 뒤, 완료하면 7일 뒤에 다시 나와요.</p></div><button class="btn primary" data-act="review-today">오늘 복습 시작</button></div>`
    : act.length ? `<div class="card resume"><div><b>오늘 복습은 끝났어요</b><p class="muted small">다음 복습: ${esc(dueLabel([...wr].filter(w => nextReview(w) != null).sort((a, b) => nextReview(a) - nextReview(b))[0] || {}))}</p></div><a class="btn" href="#notes">오답노트 보기</a></div>` : "";
  const resume = S.quiz ? `<div class="card resume"><div><b>풀던 문제가 있어요</b><p class="muted small">${esc(S.quiz.ctx.title)} · ${Object.values(S.quiz.answers).filter(v => String(v).trim()).length}/${S.quiz.questions.length}문제 답함</p></div><a class="btn primary" href="#quiz">이어서 풀기</a></div>` : "";
  const quick = [...sets.slice(0, 4), EXAMPLE_SET];
  return `
  <section class="hero">
    <div>
      <p class="eyebrow">AI 학습 도우미</p>
      <h1>${act.length ? `복습할 오답이<br><span class="c">${act.length}문제</span> 남았어요` : at.length ? `오답을 모두<br><span class="mark">정리했어요!</span>` : `공부한 자료로<br><span class="mark">나만의 시험지</span>를`}</h1>
      <p class="lead">${at.length ? "틀린 문제는 오답노트에 자동으로 모이고, 두 번 연속 맞히면 완료로 옮겨져요." : "교과서 내용이나 필기를 넣으면 AI가 객관식, O/X, 단답형, 서술형 문제를 만들고 채점과 오답노트까지 챙겨 줘요."}</p>
      <div class="row"><a class="btn primary big" href="#new">+ 새 문제 만들기</a>${act.length ? `<button class="btn big" data-act="notes-retry-all">오답 다시 풀기</button>` : `<button class="btn big" data-act="play-set" data-id="example">예시 문제 풀어 보기</button>`}</div>
    </div>
    <div class="art" aria-hidden="true">
      <div class="fc a"><small>객관식</small>광합성 장소는?<div class="o"><i>1</i>미토콘드리아</div><div class="o s"><i>2</i>엽록체</div><div class="o"><i>3</i>액포</div></div>
      <div class="fc b">O</div>
      <div class="fc c"><small>${rate === null ? "오늘의 목표" : "전체 정답률"}</small><b>${rate === null ? "100점!" : rate + "%"}</b></div>
      <div class="fc d">X</div>
      <div class="fc e">✓</div>
    </div>
  </section>
  ${at.length < 3 ? `<section class="how" aria-label="사용 방법">
    <div class="card"><span class="n">1</span><div><h3>자료 넣기</h3><p>글을 붙여 넣거나 PDF·TXT·사진을 올려요.</p></div></div>
    <div class="card"><span class="n">2</span><div><h3>문제 풀고 채점</h3><p>AI가 만든 문제를 풀면 해설과 함께 바로 채점돼요.</p></div></div>
    <div class="card"><span class="n">3</span><div><h3>오답노트 복습</h3><p>틀린 문제를 모아 두 번 연속 맞힐 때까지 복습해요.</p></div></div>
  </section>` : ""}
  ${resume}
  ${dueCard}
  <section class="tiles" aria-label="학습 요약">
    <div class="card tile"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg></span><div class="k">푼 문제</div><div class="v">${solved}<small>문제</small></div></div>
    <div class="card tile"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span><div class="k">전체 정답률</div><div class="v">${rate === null ? "–" : rate}<small>${rate === null ? "" : "%"}</small></div></div>
    <div class="card tile ${act.length ? "alert" : ""}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span><div class="k">남은 오답</div><div class="v">${act.length}<small>문제</small></div></div>
    <div class="card tile"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg></span><div class="k">완료한 오답</div><div class="v">${mas}<small>문제</small></div></div>
  </section>
  <div class="two">
    <section class="card">
      <h2>최근 점수</h2>
      <figure class="chart">${spark(scores)}${scores.length >= 2 ? `<figcaption class="muted small">최근 ${scores.length}번 푼 점수 (왼쪽이 오래된 기록)</figcaption>` : ""}</figure>
      ${at.length ? `<ul class="list" style="margin-top:10px">${at.slice(0, 5).map(a => `<li><div class="t"><b>${esc(a.title)}</b><span class="muted small">${fmtDateTime(a.createdAt)} · ${a.total}문제 중 ${a.correct}문제 정답</span></div><span class="sc">${a.score}</span></li>`).join("")}</ul>` : `<p class="muted" style="margin-top:6px">아직 푼 기록이 없어요. 오른쪽 예시 세트로 먼저 풀어 보세요.</p>`}
    </section>
    <section class="card">
      <h2>문제 세트</h2>
      <ul class="list">${quick.map(s => `<li><div class="t"><b>${esc(s.title)}</b><span class="muted small">${esc(s.subject || "기타")} · ${s.questions.length}문제${s.example ? " · 체험용" : ""}${s.bestScore != null ? ` · 최고 ${s.bestScore}점` : ""}</span></div><button class="btn small" data-act="play-set" data-id="${esc(s.id)}">풀기</button></li>`).join("")}</ul>
      ${sets.length > 4 ? `<a href="#sets" class="small" style="display:inline-block;margin-top:8px">전체 ${sets.length}개 보기</a>` : ""}
    </section>
  </div>
  ${viewWeak(at, wr)}`;
}

/* 약점 분석: 지금까지의 풀이 기록을 유형별·과목별로 모아 정답률을 계산한다 */
function weakStats(at){
  const byType = {}, bySubj = {};
  for (const a of at) {
    for (const [t, b] of Object.entries(a.byType || {})) { const o = byType[t] ||= {n:0, c:0}; o.n += b.n; o.c += b.c; }
    const sj = (a.subject || "기타").trim() || "기타"; const o = bySubj[sj] ||= {n:0, c:0}; o.n += a.total || 0; o.c += a.correct || 0;
  }
  const rate = o => Math.round(o.c / o.n * 100);
  const types = TYPES.filter(t => byType[t]?.n).map(t => ({key:t, label:TYPE_LABEL[t], n:byType[t].n, c:byType[t].c, pct:rate(byType[t])}));
  const subjects = Object.entries(bySubj).filter(([, o]) => o.n).map(([k, o]) => ({key:k, label:k, n:o.n, c:o.c, pct:rate(o)})).sort((a, b) => a.pct - b.pct);
  return {types, subjects};
}
function viewWeak(at, wr){
  if (!at.length) return "";
  const {types, subjects} = weakStats(at);
  const weakest = [...types].filter(t => t.n >= 2).sort((a, b) => a.pct - b.pct)[0];
  const top = wr.filter(w => w.status !== "mastered" && w.wrongCount >= 1).sort((a, b) => (b.wrongCount - a.wrongCount) || ((b.updatedAt || 0) - (a.updatedAt || 0))).slice(0, 3);
  const bars = (list, attr) => list.map(x => `<div class="tb" ${attr ? `data-t="${x.key}"` : ""}><span>${esc(x.label)}</span><div class="bar" role="img" aria-label="${esc(x.label)} 정답률 ${x.pct}%"><span style="width:${x.pct}%"></span></div><span class="num">${x.pct}%</span></div>`).join("");
  return `<section class="card weak" aria-labelledby="weak-h">
    <h2 id="weak-h">약점 분석</h2>
    <p class="muted small" style="margin:2px 0 14px">지금까지 푼 ${at.reduce((n, a) => n + (a.total || 0), 0)}문제를 모아서 계산했어요.${weakest && weakest.pct < 80 ? ` 가장 약한 유형은 <b>${esc(weakest.label)}</b>(${weakest.pct}%)예요.` : ""}</p>
    <div class="weak-grid">
      <div><h3 class="lbl">유형별 정답률</h3><div class="typebars">${bars(types, true)}</div></div>
      <div><h3 class="lbl">과목별 정답률</h3><div class="typebars subj">${bars(subjects.slice(0, 5), false)}</div></div>
      <div><h3 class="lbl">자주 틀리는 문제</h3>${top.length ? `<ol class="toplist">${top.map(w => `<li><span>${esc(w.question.question)}</span><span class="pill bad">${w.wrongCount}번 틀림</span></li>`).join("")}</ol>
        <button class="btn small" data-act="weak-retry" data-ids="${esc(top.map(w => w.id).join(","))}">이 문제들 다시 풀기</button>` : `<p class="muted small">복습 중인 오답이 없어요.</p>`}</div>
    </div>
  </section>`;
}

function spark(scores){
  if (scores.length < 2) return `<p class="muted small">두 번 이상 풀면 점수 변화가 여기에 그려져요.</p>`;
  const W = 560, H = 150, L = 34, R = 40, T = 14, B = 14;
  const n = scores.length;
  const x = i => L + i * (W - L - R) / (n - 1);
  const y = v => T + (1 - v / 100) * (H - T - B);
  const pts = scores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = scores[n - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 ${n}번의 점수: ${scores.join(", ")}점"><defs><linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4D5BFF" stop-opacity=".28"/><stop offset="1" stop-color="#4D5BFF" stop-opacity="0"/></linearGradient></defs>
    ${[0, 50, 100].map(v => `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="gt" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
    <polygon class="area" points="${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}"/>
    <polyline class="ln" points="${pts}"/>
    <circle class="end" cx="${x(n - 1)}" cy="${y(last)}" r="5"/>
    <text class="et" x="${x(n - 1) + 9}" y="${y(last) + 7}">${last}</text>
  </svg>`;
}

function genBlock(){
  const f = S.form, len = f.text.trim().length;
  if (!S.aiChecked) return "AI 연결을 확인하고 있어요…";
  if (!aiReady()) return S.blockedMsg || "이 화면에서는 AI를 쓸 수 없어요.";
  if (len < MIN_CHARS) return `자료를 ${MIN_CHARS}자 이상 넣어 주세요.`;
  if (len > MAX_CHARS) return `자료가 ${MAX_CHARS.toLocaleString()}자를 넘어요. 줄여 주세요.`;
  if (!TYPES.some(t => f.types[t])) return "문제 유형을 하나 이상 골라 주세요.";
  return "";
}

function viewNew(){
  const f = S.form, len = f.text.trim().length;
  const imgOk = aiReady() && !!S.aiLimits?.images;
  const subjects = [...new Set(getSets().map(s => s.subject).filter(Boolean))];
  const why = genBlock();
  const aiNotice = S.aiChecked && !aiReady() ? `<div class="notice" style="margin-bottom:18px"><b>지금은 AI를 쓸 수 없어요.</b> ${esc(S.blockedMsg || "로그인하면 문제 생성과 서술형 채점을 쓸 수 있어요.")} 그동안 <a href="#" data-act="play-set" data-id="example">예시 문제 세트</a>로 풀이와 오답노트를 체험할 수 있어요.${!Auth.user && sb ? ` <button class="linkbtn" data-act="go-login">로그인하기</button>` : ""}</div>` : "";
  const g = S.gen;
  let bar;
  if (g && g.busy) {
    const pct = Math.min(100, Math.round(g.made / g.total * 100));
    bar = `<div class="genprog" role="status"><b>${g.made ? `AI가 문제를 쓰고 있어요… ${Math.min(g.made, g.total)} / ${g.total}` : (f.verify ? "AI가 문제를 만들고 한 번 더 검토하고 있어요… (보통 30초~1분)" : "AI가 자료를 읽고 문제를 만들고 있어요… (보통 15~40초)")}</b><div class="bar ${g.made ? "" : "indef"}"><span style="${g.made ? `width:${pct}%` : ""}"></span></div></div><button class="btn" data-act="stop-gen">중단</button>`;
  } else {
    bar = `<div class="why" id="gen-why">${g && g.err ? `<span style="color:var(--pen);font-weight:600">${esc(g.err)}</span>` : esc(why || `${f.count}문제 · ${DIFF_LABEL[f.diff]} · ${TYPES.filter(t => f.types[t]).map(t => TYPE_LABEL[t]).join(", ")}`)}</div><button class="btn primary big" id="gen-btn" data-act="generate" ${why ? "disabled" : ""}>${g && g.err ? "다시 시도" : "문제 생성하기"}</button>`;
  }
  return `
  <header class="page-head"><div><p class="eyebrow">새 문제 만들기</p><h1>공부한 자료로 시험지를 만들어요</h1><p class="lead">자료에 있는 내용만으로 문제를 내고, 문제마다 근거 문장을 함께 보여 줘요.</p></div></header>
  ${aiNotice}
  <div class="steps">
    <section class="card">
      <div class="step-h"><span class="n">1</span><h2>학습 자료</h2></div>
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <div class="seg" role="tablist">
          <button role="tab" aria-selected="${f.tab === "text"}" class="${f.tab === "text" ? "on" : ""}" data-act="tab" data-v="text">직접 붙여넣기</button>
          <button role="tab" aria-selected="${f.tab === "file"}" class="${f.tab === "file" ? "on" : ""}" data-act="tab" data-v="file">파일 올리기</button>
        </div>
        <button class="btn ghost small" data-act="example-text">예시 자료 넣기</button>
      </div>
      ${f.tab === "file" ? `
        ${f.extracting ? `<div class="drop"><div class="spin"></div><b>파일에서 글자를 꺼내고 있어요…</b></div>` : `
        <label class="drop" id="drop" for="file-in">
          <input type="file" id="file-in" data-ch="file" multiple accept=".pdf,.txt,.md,text/plain,application/pdf${imgOk ? ",image/png,image/jpeg,image/webp" : ""}">
          <span class="big-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg></span><b>파일을 끌어다 놓거나 눌러서 고르세요</b>
          <span class="muted small">PDF, TXT${imgOk ? `, 사진(교과서·필기 촬영, 한 번에 ${S.aiLimits.images.maxCount}장까지)` : ""}</span>
        </label>`}
        ${f.fileErr ? `<p class="notice" style="margin-top:12px">${esc(f.fileErr)}</p>` : ""}
        <p class="muted small" style="margin-top:10px">꺼낸 글자는 '직접 붙여넣기' 칸에 들어가서 고칠 수 있어요.</p>
      ` : `
        ${f.fileNote ? `<p class="notice info" style="margin-bottom:12px">${esc(f.fileNote)}</p>` : ""}
        <label class="lbl" for="mat">자료 내용</label>
        <textarea id="mat" class="field" rows="12" data-in="text" placeholder="교과서 본문, 수업 필기, 프린트 내용을 붙여 넣으세요.">${esc(f.text)}</textarea>
        <div class="counter ${len > MAX_CHARS ? "over" : ""}" id="counter"><span>${len > MAX_CHARS ? "글자 수 제한을 넘었어요" : "많을수록 다양한 문제가 나와요 (2,000~5,000자 추천)"}</span><span class="mono">${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}자</span></div>
      `}
    </section>
    <section class="card">
      <div class="step-h"><span class="n">2</span><h2>출제 옵션</h2></div>
      <div class="opts-grid">
        <div><label class="lbl" for="f-title">문제 세트 제목</label><input id="f-title" class="field" data-in="title" value="${esc(f.title)}" placeholder="예: 생명과학 3단원 광합성" maxlength="60"></div>
        <div><label class="lbl" for="f-subj">과목</label><input id="f-subj" class="field" data-in="subject" value="${esc(f.subject)}" placeholder="예: 과학" list="subj-list" maxlength="20"><datalist id="subj-list">${subjects.map(s => `<option value="${esc(s)}">`).join("")}</datalist></div>
        <!-- 4주차: 보기가 정해진 값은 라디오(하나만)·체크박스(여러 개)로 고르고, 관련 항목은 fieldset + legend로 묶는다 -->
        <fieldset class="pick"><legend class="lbl">문제 수</legend><div class="seg">${[5, 10, 15, 20].map(n => `<label><input type="radio" name="count" value="${n}" data-ch="count" ${f.count === n ? "checked" : ""}><span>${n}문제</span></label>`).join("")}</div></fieldset>
        <fieldset class="pick"><legend class="lbl">난이도</legend><div class="seg">${["easy", "medium", "hard"].map(d => `<label><input type="radio" name="diff" value="${d}" data-ch="diff" ${f.diff === d ? "checked" : ""}><span>${DIFF_LABEL[d]}</span></label>`).join("")}</div></fieldset>
      </div>
      <fieldset class="pick" style="margin-top:18px"><legend class="lbl">문제 유형 (여러 개 고를 수 있어요)</legend>
        <div class="row">${TYPES.map(t => `<label class="toggle" data-v="${t}"><input type="checkbox" name="types" value="${t}" data-ch="type" ${f.types[t] ? "checked" : ""}><span class="box" aria-hidden="true">✓</span>${TYPE_LABEL[t]}</label>`).join("")}</div>
      </fieldset>
      <label class="check-line"><input type="checkbox" data-ch="verify" ${f.verify ? "checked" : ""}> <span><b>AI가 한 번 더 검토하기</b> <span class="muted small">정답 오류·겹치는 문제를 고치거나 빼요 (10~30초 더 걸려요)</span></span></label>
    </section>
    <section class="card gen-bar" id="genbar">${bar}</section>
  </div>`;
}

function answeredCount(q){ return q.questions.filter(x => String(q.answers[x.id] ?? "").trim()).length; }
function viewQuiz(){
  const q = S.quiz, qq = q.questions[q.idx], n = q.questions.length, cur = q.answers[qq.id] ?? "";
  let input = "";
  if (qq.type === "multiple_choice") {
    input = `<div class="opts" role="radiogroup" aria-label="보기">${qq.options.map((o, i) => `<button class="opt ${cur === o ? "sel" : ""}" role="radio" aria-checked="${cur === o}" data-act="opt" data-i="${i}"><span class="onum">${i + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  } else if (qq.type === "ox") {
    input = `<div class="ox" role="radiogroup" aria-label="O 또는 X">${["O", "X"].map(v => `<button class="${cur === v ? "sel" : ""}" role="radio" aria-checked="${cur === v}" data-act="ox" data-v="${v}">${v}</button>`).join("")}</div>`;
  } else if (qq.type === "short_answer") {
    input = `<div class="ansbox"><label class="lbl" for="ans">답</label><input id="ans" class="field" data-in="ans" value="${esc(cur)}" placeholder="짧게 답을 쓰세요" autocomplete="off" style="font-size:17px;max-width:460px"></div>`;
  } else {
    input = `<div class="ansbox"><label class="lbl" for="ans">답안</label><textarea id="ans" class="field" data-in="ans" rows="7" placeholder="자료의 내용을 근거로 문장으로 써 주세요.">${esc(cur)}</textarea><div class="counter"><span>핵심 내용을 2~4문장으로 쓰면 좋아요</span><span class="mono" id="essay-len">${String(cur).length}자</span></div></div>`;
  }
  const done = answeredCount(q);
  return `<div class="quiz-wrap">
  <header class="quiz-head">
    <div><p class="eyebrow">${esc(q.ctx.title)}</p><h1 class="qtitle">${q.idx + 1}번 <span>/ ${n}문제</span></h1></div>
    <button class="btn ghost" data-act="quit-quiz">그만 풀기</button>
  </header>
  <div class="bar" aria-hidden="true"><span id="qbar" style="width:${done / n * 100}%"></span></div>
  <p class="muted small" style="margin-top:6px" id="qdone">${done}문제 답함 · ${n - done}문제 남음</p>
  <nav class="qnums" aria-label="문제 번호">${q.questions.map((x, i) => `<button class="qn ${i === q.idx ? "cur" : ""} ${String(q.answers[x.id] ?? "").trim() ? "done" : ""}" data-act="qgo" data-i="${i}" aria-label="${i + 1}번 문제">${i + 1}</button>`).join("")}</nav>
  <article class="card qcard">
    <div class="qmeta"><span class="chip t-${qq.type}">${TYPE_LABEL[qq.type]}</span>${qq.difficulty ? `<span class="chip soft">${DIFF_LABEL[qq.difficulty] || ""}</span>` : ""}</div>
    <p class="qtext">${esc(qq.question)}</p>
    ${input}
  </article>
  <div class="qnav">
    <button class="btn" data-act="qprev" ${q.idx === 0 ? "disabled" : ""}>← 이전</button>
    ${q.idx < n - 1 ? `<button class="btn primary" data-act="qnext">다음 →</button>` : `<button class="btn primary" data-act="submit">제출하고 채점하기</button>`}
  </div>
  ${q.idx < n - 1 ? `<div class="row end" style="margin-top:10px"><button class="btn ghost small" data-act="submit">지금 제출하기</button></div>` : ""}
  <p class="muted small" style="margin-top:14px">키보드: 숫자 1~4로 보기 선택, O·X 키, ←·→로 문제 이동</p>
  ${S.grading ? `<div class="overlay" role="status"><div class="card"><div class="spin"></div><span class="pen">채점하고 있어요…</span><p class="muted small">서술형과 단답형은 AI가 뜻을 확인하고 있어요.</p></div></div>` : ""}</div>`;
}

function markClass(q, r){
  if (q.type === "essay" && r.score != null) return r.score >= 90 ? "o" : r.score > 0 ? "tri" : "x";
  return r.correct ? "o" : "x";
}
function optionsReview(q, mine){
  return `<ul class="mini-opts">${q.options.map((o, i) => {
    const right = o === q.answer, my = o === mine;
    return `<li class="${right ? "right" : my ? "mine" : ""}"><span>${CIRCLED[i]}</span><span>${esc(o)}</span>${right ? `<span class="tag">정답</span>` : my ? `<span class="tag">내 답</span>` : ""}</li>`;
  }).join("")}</ul>`;
}
function viewResult(){
  const {attempt:a, questions:qs, savedWrong, mastered} = S.result;
  const byType = TYPES.filter(t => a.byType[t]).map(t => {
    const b = a.byType[t]; const pct = Math.round(b.c / b.n * 100);
    return `<div class="tb" data-t="${t}"><span>${TYPE_LABEL[t]}</span><div class="bar"><span style="width:${pct}%"></span></div><span class="num">${b.c}/${b.n}</span></div>`;
  }).join("");
  const wrongCount = a.answers.filter(r => !r.correct).length;
  const msg = [];
  if (savedWrong) msg.push(`틀린 문제 ${savedWrong}개를 오답노트에 저장했어요.`);
  if (mastered) msg.push(`오답 ${mastered}개를 두 번 연속 맞혀서 완료로 옮겼어요. 7일 뒤에 한 번 더 확인해요.`);
  if (S.result.finalDone) msg.push(`7일 최종 확인 ${S.result.finalDone}개를 통과했어요.`);
  const lvl = a.score >= 80 ? "good" : a.score >= 60 ? "mid" : "low";
  const cheer = a.score === 100 ? "만점이에요!" : a.score >= 80 ? "아주 잘했어요!" : a.score >= 60 ? "좋아요, 조금만 더!" : "오답노트로 다시 도전해요";
  return `
  <section class="card score-hero">
    <div class="ring ${lvl}" style="--p:${a.score}" role="img" aria-label="${a.score}점"><div><b>${a.score}</b><span>점</span></div></div>
    <div>
      <p class="eyebrow">${esc(a.title)} · 채점 결과</p><br><span class="badge-msg ${lvl}">${cheer}</span>
      <h1>${a.total}문제 중 ${a.correct}문제 맞혔어요</h1>
      <div class="typebars">${byType}</div>
      ${msg.length ? `<p class="muted">${msg.join(" ")}</p>` : ""}
      ${a.fallback ? `<p class="notice" style="margin-top:10px">AI를 쓸 수 없어서 단답형은 정답과 글자가 같은지만, 서술형은 핵심어가 얼마나 들어 있는지로 간이 채점했어요.</p>` : ""}
      <div class="row" style="margin-top:14px">
        ${wrongCount ? `<button class="btn primary" data-act="retry-wrong">틀린 문제만 다시 풀기 (${wrongCount})</button>` : ""}
        <a class="btn" href="#notes">오답노트 보기</a>
        <a class="btn ghost" href="#home">대시보드로</a>
      </div>
    </div>
  </section>
  <h2 style="margin:8px 0 14px">문제별 채점</h2>
  <ol class="review">${qs.map((q, i) => {
    const r = a.answers[i];
    const isEssay = q.type === "essay";
    return `<li class="card rv">
      <div><span class="qmark ${markClass(q, r)}" aria-label="${r.correct ? "맞음" : "틀림"}">${i + 1}</span></div>
      <div>
        <div class="qmeta"><span class="chip t-${q.type}">${TYPE_LABEL[q.type]}</span>${isEssay && r.score != null ? `<span class="pen" style="font-size:26px;line-height:1">${r.score}점</span>` : ""}</div>
        <p class="qtext" style="font-size:17px">${esc(q.question)}</p>
        ${q.type === "multiple_choice" ? optionsReview(q, r.user) : ""}
        <dl class="ans">
          <div><dt>내 답</dt><dd class="${r.correct ? "ok" : "bad"} ${isEssay || q.type === "ox" ? "nostrike" : ""}">${esc(r.user) || "(답 없음)"}</dd></div>
          <div><dt>${isEssay ? "모범답안" : "정답"}</dt><dd class="ok">${esc(q.answer)}</dd></div>
        </dl>
        ${r.feedback ? `<p class="feedback ${r.correct ? "good" : ""}">${esc(r.feedback)}</p>` : ""}
        <details class="expl" ${r.correct ? "" : "open"}><summary>해설</summary>
          <p>${esc(q.explanation)}</p>
          ${isEssay && q.rubric ? `<p class="rubric">채점 기준\n${esc(q.rubric)}</p>` : ""}
          ${q.source_quote ? `<p class="src"><span class="hl">${esc(q.source_quote)}</span>${q.source_page ? ` <span class="pg">자료 ${q.source_page}쪽</span>` : ""}</p>` : ""}
        </details>
      </div>
    </li>`;
  }).join("")}</ol>`;
}

const SUBJ_COLORS = [["--t-mc-s","--t-mc"],["--t-ox-s","--t-ox"],["--t-sa-s","--t-sa"],["--t-es-s","--t-es"],["--pen-soft","--pen"]];
function subjStyle(sub){ let h = 0; for (const ch of String(sub || "기타")) h = (h * 31 + ch.codePointAt(0)) >>> 0; const [b, f] = SUBJ_COLORS[h % SUBJ_COLORS.length]; return `--sb:var(${b});--sf:var(${f})`; }

function viewData(){
  if (!S.ready) return loadingView();
  const sets = getSets(), at = getAttempts(), wr = getWrong();
  const cloud = Store.mode === "cloud";
  const total = sets.length + at.length + wr.length;
  const bytes = new Blob([JSON.stringify(Object.fromEntries(Store.docs))]).size;
  const qn = sets.reduce((n, s) => n + (s.questions?.length || 0), 0);
  return `
  <header class="page-head"><div><p class="eyebrow">내 데이터</p><h1>내 학습 기록은 이렇게 저장돼요</h1><p class="lead">문제 세트, 점수 기록, 오답노트는 사용자마다 따로 저장되고 본인만 볼 수 있어요. 언제든 파일로 내려받거나 지울 수 있어요.</p></div></header>
  <div class="stack">
    <section class="card">
      <h2>저장 위치: ${cloud ? `Supabase 데이터베이스 <span class="muted small">(${esc(Auth.user.email)})</span>` : "이 브라우저 (체험 모드 · 로그인하면 Supabase에 저장돼요)"}</h2>
      <div class="flow">
        <div class="st"><b>1. 로그인</b>Supabase Auth가 이메일과 비밀번호를 확인해요. 비밀번호는 암호화되어 저장되고 퀴즈메이트 코드는 볼 수 없어요.</div>
        <div class="st"><b>2. 사용자 ID</b>가입하면 사용자마다 고유한 ID(uuid)가 생기고, 내가 저장하는 모든 행에 이 ID가 붙어요.</div>
        <div class="st"><b>3. 테이블 저장</b>문제 세트, 문제, 풀이 기록, 오답노트를 PostgreSQL 테이블에 나눠 저장해요.</div>
        <div class="st"><b>4. 접근 규칙 (RLS)</b>"로그인한 사람의 ID = 행의 user_id"일 때만 읽고 쓸 수 있어요. 다른 사람의 기록은 보이지 않아요.</div>
      </div>
    </section>
    ${cloud ? `<section class="card">
      <h2>내 정보</h2>
      <form id="name-form" class="name-form" novalidate>
        <div><span class="lbl">이메일</span><p>${esc(Auth.user.email)}</p></div>
        <div><label class="lbl" for="my-name">화면에 보이는 이름</label><input id="my-name" class="field" name="dname" maxlength="20" required value="${esc(Auth.name)}"></div>
        <button class="btn primary" type="submit">이름 저장</button>
      </form>
      <p class="muted small" style="margin-top:10px">비밀번호를 바꾸려면 로그아웃한 뒤 로그인 화면의 '비밀번호를 잊었어요'를 눌러 주세요.</p>
    </section>` : ""}
    <section class="card">
      <h2>데이터 구조</h2>
      <p class="muted small" style="margin:-6px 0 12px">관계형 데이터베이스(PostgreSQL)의 테이블 5개로 나눠 저장해요. 지금 내 기록은 약 ${Math.max(1, Math.round(bytes / 1024))}KB예요.</p>
      <div class="tablewrap"><table class="schema">
        <caption class="sr-only">퀴즈메이트 데이터베이스 테이블 5개와 내 행 수</caption>
        <thead><tr><th scope="col">테이블</th><th scope="col">내 행 수</th><th scope="col">주요 열</th><th scope="col">언제 저장되나요</th></tr></thead>
        <tbody>
          <tr><td><b>회원</b><br><code>profiles</code></td><td class="num">${cloud ? 1 : 0}</td><td>사용자 ID, 화면에 보이는 이름, 가입 시각</td><td>회원가입할 때 자동으로</td></tr>
          <tr><td><b>문제 세트</b><br><code>quiz_sets</code></td><td class="num">${sets.length}</td><td>제목, 과목, 난이도, 원본 자료, 푼 횟수, 최근·최고 점수</td><td>AI가 문제를 만들었을 때</td></tr>
          <tr><td><b>문제</b><br><code>questions</code></td><td class="num">${qn}</td><td>세트 ID(외래 키), 순서, 유형, 보기, 정답, 해설, 근거 문장</td><td>세트와 함께. 세트를 지우면 같이 지워짐</td></tr>
          <tr><td><b>풀이 기록</b><br><code>attempts</code></td><td class="num">${at.length}</td><td>점수, 맞힌 개수, 유형별 정답 수, 문제별 내 답·AI 피드백</td><td>제출하고 채점했을 때</td></tr>
          <tr><td><b>오답노트</b><br><code>wrong_notes</code></td><td class="num">${wr.length}</td><td>틀린 문제, 내 오답, 틀린 횟수, 연속 정답 수, 메모, 상태</td><td>틀렸을 때 생기고, 다시 풀 때마다 바뀜</td></tr>
        </tbody>
      </table></div>
    </section>
    <section class="card">
      <h2>내 데이터 관리</h2>
      <ul class="facts" style="margin-bottom:18px">
        <li>백업 파일(JSON)로 내 기록 전체를 내려받을 수 있어요.</li>
        <li>백업 파일을 불러오면 다른 기기나 계정에서도 기록을 이어서 쓸 수 있어요.</li>
        <li>필요 없으면 내 기록 전체를 바로 지울 수 있어요.</li>
      </ul>
      <div class="row">
        <button class="btn primary" data-act="export" ${total ? "" : "disabled"}>백업 파일 내려받기</button>
        <label class="btn" for="import-in">백업 파일 불러오기<input type="file" id="import-in" data-ch="import" accept=".json,application/json" style="position:absolute;width:1px;height:1px;opacity:0"></label>
      </div>
    </section>
    <section class="card dangerzone">
      <h2>내 기록 전체 삭제</h2>
      <p class="muted" style="margin:-4px 0 14px">문제 세트 ${sets.length}개, 풀이 기록 ${at.length}개, 오답 ${wr.length}개가 모두 지워지고 되돌릴 수 없어요. 먼저 백업 파일을 내려받아 두세요.</p>
      <button class="btn danger solid" data-act="wipe" ${total ? "" : "disabled"}>전체 삭제</button>
    </section>
  </div>`;
}
function backupJson(){
  const docs = {};
  for (const [id, v] of Store.docs) if (v && ["set","attempt","wrong"].includes(v.kind)) docs[id] = v;
  return JSON.stringify({app:"quizmate", version:1, exportedAt:new Date().toISOString(), docs}, null, 1);
}
async function exportData(){
  const json = backupJson();
  const d = new Date(), name = `quizmate-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
  try {
    const url = URL.createObjectURL(new Blob([json], {type:"application/json"}));
    const link = Object.assign(document.createElement("a"), {href:url, download:name});
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("백업 파일을 내려받았어요."); return;
  } catch (e) {}
  try { await navigator.clipboard.writeText(json); toast("이 화면에서는 파일을 저장할 수 없어서 백업 내용을 클립보드에 복사했어요."); }
  catch (e) { toast("백업 파일을 만들지 못했어요.", "bad"); }
}
async function importData(file){
  if (!file) return;
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { toast("JSON 파일이 아니에요. 퀴즈메이트 백업 파일을 골라 주세요.", "bad"); return; }
  if (!obj || obj.app !== "quizmate" || !obj.docs || typeof obj.docs !== "object") { toast("퀴즈메이트 백업 파일이 아니에요.", "bad"); return; }
  const prefix = {set:"set_", attempt:"att_", wrong:"wn_"};
  const items = Object.entries(obj.docs).filter(([id, v]) => v && typeof v === "object" && prefix[v.kind] && id.startsWith(prefix[v.kind]) && /^[A-Za-z0-9_.\-~:@+]{1,180}$/.test(id)
    && (v.kind !== "set" || Array.isArray(v.questions)) && (v.kind !== "wrong" || (v.question && typeof v.question === "object")));
  if (!items.length) { toast("불러올 기록이 없어요.", "bad"); return; }
  const dup = items.filter(([id]) => Store.docs.has(id)).length;
  if (!(await ask({title:`기록 ${items.length}개를 불러올까요?`, body:dup ? `이미 있는 기록 ${dup}개는 백업 파일 내용으로 바뀌어요.` : "지금 기록에 더해져요.", ok:"불러오기"}))) return;
  for (const [id, v] of items) await Store.put(id, v);
  toast(`기록 ${items.length}개를 불러왔어요.`);
}
async function wipeData(){
  const ids = [...Store.docs].filter(([, v]) => v && ["set","attempt","wrong"].includes(v.kind)).map(([id]) => id);
  if (!ids.length) return;
  if (!(await ask({title:"내 기록을 모두 지울까요?", body:`문서 ${ids.length}개가 지워지고 되돌릴 수 없어요.`, ok:"모두 삭제", danger:true}))) return;
  for (const id of ids) await Store.del(id);
  toast("내 기록을 모두 지웠어요.");
}

function confetti(){
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas"); c.id = "confetti"; document.body.append(c);
  const x = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.scale(dpr, dpr);
  const cols = ["#1E90F0","#0FA67A","#FFD23F","#E8468F","#7C55F0","#F04F4F"];
  const ps = Array.from({length:140}, () => ({x:innerWidth / 2 + (Math.random() - .5) * 200, y:innerHeight * .35, vx:(Math.random() - .5) * 14, vy:-Math.random() * 14 - 4, r:Math.random() * 6 + 4, a:Math.random() * 6, va:(Math.random() - .5) * .3, c:cols[Math.floor(Math.random() * cols.length)]}));
  let t = 0;
  (function step(){
    x.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (++t < 150) requestAnimationFrame(step); else c.remove();
  })();
}
function viewSets(){
  if (!S.ready) return loadingView();
  const sets = getSets();
  const card = s => `<article class="card set-card" style="${subjStyle(s.subject)}">
    <div class="set-top"><span class="subj-badge" aria-hidden="true">${esc((s.subject || "기타").trim().charAt(0))}</span><h3>${esc(s.title)}</h3></div>
    <div class="chips"><span class="chip">${esc(s.subject || "기타")}</span><span class="chip soft">${DIFF_LABEL[s.difficulty] || "보통"}</span><span class="chip soft">${s.questions.length}문제</span>${s.example ? `<span class="chip soft">체험용 예시</span>` : ""}</div>
    <p class="muted small">${s.example ? "AI 없이도 풀어 볼 수 있는 예시예요" : `${fmtDate(s.createdAt)} 만듦 · ${s.attemptCount || 0}번 풂`}</p>
    ${s.bestScore != null ? `<div class="scores"><span>최근<span class="pen">${s.lastScore}</span></span><span>최고<span class="pen">${s.bestScore}</span></span></div>` : ""}
    <div class="row"><button class="btn primary small" data-act="play-set" data-id="${esc(s.id)}">풀기</button><button class="btn small" data-act="print-set" data-id="${esc(s.id)}">인쇄</button>${s.example ? "" : `<button class="btn small" data-act="edit-set" data-id="${esc(s.id)}">문제 수정</button>`}${s.example ? "" : `<button class="btn ghost small danger" data-act="del-set" data-id="${esc(s.id)}">삭제</button>`}</div>
  </article>`;
  return `
  <header class="page-head"><div><p class="eyebrow">내 문제 세트</p><h1>만든 시험지 ${sets.length}개</h1><p class="lead">다시 풀면 점수가 기록되고, 틀린 문제는 오답노트에 쌓여요.</p></div><a class="btn primary" href="#new">+ 새 문제 만들기</a></header>
  <div class="grid-cards">${sets.map(card).join("")}${card(EXAMPLE_SET)}</div>`;
}

function viewNotes(){
  if (!S.ready) return loadingView();
  const all = getWrong();
  const act = all.filter(w => w.status !== "mastered"), mas = all.filter(w => w.status === "mastered");
  const nf = S.nf;
  let list = nf.tab === "mastered" ? mas : act;
  const subjects = [...new Set(all.map(w => w.subject || "기타"))];
  const setMap = new Map(); all.forEach(w => setMap.set(w.setId || "-", w.setTitle || "기타"));
  if (nf.subject !== "all") list = list.filter(w => (w.subject || "기타") === nf.subject);
  if (nf.set !== "all") list = list.filter(w => (w.setId || "-") === nf.set);
  if (nf.type !== "all") list = list.filter(w => w.question.type === nf.type);
  if (nf.sort === "due") list.sort((a, b) => (nextReview(a) ?? Infinity) - (nextReview(b) ?? Infinity));
  else list.sort(nf.sort === "most" ? (a, b) => (b.wrongCount - a.wrongCount) || ((b.updatedAt || 0) - (a.updatedAt || 0)) : (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const sel = (name, label, opts) => `<label class="f"><span>${label}</span><select class="field" data-ch="nf" name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${nf[name] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
  let body;
  if (!all.length) body = `<div class="card empty"><span class="pen">아직 오답이 없어요 🎉</span>문제를 풀다가 틀리면 여기에 자동으로 모여요.<div class="row" style="justify-content:center;margin-top:16px"><a class="btn primary" href="#new">문제 만들기</a><button class="btn" data-act="play-set" data-id="example">예시 세트 풀기</button></div></div>`;
  else if (!list.length) body = `<div class="card empty">${nf.tab === "mastered" ? "아직 완료한 문제가 없어요. 오답을 두 번 연속 맞히면 여기로 옮겨져요." : "조건에 맞는 오답이 없어요."}</div>`;
  else body = `<div class="stack">${list.map(noteCard).join("")}</div>`;
  return `
  <header class="page-head"><div><p class="eyebrow">오답노트</p><h1>틀린 문제를 다시 내 것으로</h1><p class="lead">틀린 문제는 자동으로 모여요. 다시 풀어서 두 번 연속 맞히면 '완료'로 옮겨져요.</p></div></header>
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected="${nf.tab === "active"}" class="${nf.tab === "active" ? "on" : ""}" data-act="nf-tab" data-v="active">복습 중 <span class="mono">${act.length}</span></button>
    <button role="tab" aria-selected="${nf.tab === "mastered"}" class="${nf.tab === "mastered" ? "on" : ""}" data-act="nf-tab" data-v="mastered">완료 <span class="mono">${mas.length}</span></button>
  </div>
  ${all.length ? `<div class="toolbar">
    ${sel("subject", "과목", [["all", "전체"], ...subjects.map(s => [s, s])])}
    ${sel("set", "문제 세트", [["all", "전체"], ...[...setMap].map(([k, v]) => [k, v])])}
    ${sel("type", "유형", [["all", "전체"], ...TYPES.map(t => [t, TYPE_LABEL[t]])])}
    ${sel("sort", "정렬", [["recent", "최근 틀린 순"], ["most", "많이 틀린 순"], ["due", "복습 날짜 순"]])}
    <span class="grow"></span>
    ${nf.tab === "active" && list.length ? `<button class="btn primary" data-act="notes-retry-list">보이는 ${list.length}문제 다시 풀기</button>` : ""}
  </div>` : ""}
  ${body}`;
}

function noteCard(w){
  const q = w.question, sim = S.similar[w.id], busy = S.simBusy[w.id];
  const streak = Math.min(2, w.correctStreak || 0);
  return `<article class="card note">
    <div class="note-top">
      <div class="chips"><span class="chip t-${q.type}">${TYPE_LABEL[q.type]}</span><span class="chip soft">${esc(w.subject || "기타")}</span><span class="chip soft">${esc(w.setTitle || "")}</span></div>
      <div class="note-stats">
        ${w.status === "mastered" ? `<span class="pill ok">완료</span>` : `<span class="streak" title="두 번 연속 맞히면 완료">연속 정답 <i class="${streak >= 1 ? "f" : ""}"></i><i class="${streak >= 2 ? "f" : ""}"></i></span>`}
        ${dueLabel(w) ? `<span class="pill ${isDue(w) ? "due" : ""}">${esc(dueLabel(w))}</span>` : ""}
        <span class="pill bad">틀린 횟수 ${w.wrongCount}</span>
        <span class="muted small">${fmtDate(w.updatedAt || w.createdAt)}</span>
      </div>
    </div>
    <p class="qtext" style="font-size:17px">${esc(q.question)}</p>
    ${q.type === "multiple_choice" ? optionsReview(q, w.wrongAnswer) : ""}
    <dl class="ans">
      <div><dt>내가 쓴 답</dt><dd class="bad ${q.type === "essay" || q.type === "ox" ? "nostrike" : ""}">${esc(w.wrongAnswer) || "(답 없음)"}</dd></div>
      <div><dt>${q.type === "essay" ? "모범답안" : "정답"}</dt><dd class="ok">${esc(q.answer)}</dd></div>
    </dl>
    <div class="expl"><p>${esc(q.explanation)}</p>${q.source_quote ? `<p class="src" style="margin-top:6px"><span class="hl">${esc(q.source_quote)}</span>${q.source_page ? ` <span class="pg">자료 ${q.source_page}쪽</span>` : ""}</p>` : ""}</div>
    <div class="memo">
      <label for="memo-${esc(w.id)}">내 메모: 왜 틀렸는지 적어 두세요</label>
      <textarea id="memo-${esc(w.id)}" class="field" rows="2" data-in="memo" placeholder="예: 녹말과 설탕이 바뀌는 때를 헷갈림">${esc(w.memo || "")}</textarea>
      <button class="btn small" data-act="memo-save" data-id="${esc(w.id)}">메모 저장</button>
    </div>
    ${sim ? `<div class="simbox"><p class="small" style="font-weight:700;color:var(--accent);margin-bottom:6px">비슷한 새 문제가 준비됐어요</p><p class="qtext">${esc(sim.question)}</p><div class="row" style="margin-top:10px"><button class="btn primary small" data-act="sim-play" data-id="${esc(w.id)}">바로 풀기</button><button class="btn ghost small" data-act="sim-close" data-id="${esc(w.id)}">닫기</button></div></div>` : ""}
    <div class="note-actions">
      <button class="btn small" data-act="note-retry" data-id="${esc(w.id)}">다시 풀기</button>
      <button class="btn small" data-act="note-similar" data-id="${esc(w.id)}" ${busy || !aiReady() ? "disabled" : ""} ${!aiReady() ? 'title="AI를 쓸 수 있을 때만 가능해요"' : ""}>${busy ? "만드는 중…" : "비슷한 문제 만들기"}</button>
      ${w.status === "mastered" ? `<button class="btn ghost small" data-act="note-restore" data-id="${esc(w.id)}">복습 중으로 되돌리기</button>` : `<button class="btn ghost small" data-act="note-master" data-id="${esc(w.id)}">완료로 옮기기</button>`}
      <button class="btn ghost small danger" data-act="note-del" data-id="${esc(w.id)}">삭제</button>
    </div>
  </article>`;
}

/* 문제 수정 화면: AI가 만든 문제를 직접 고치거나 뺀다 */
function viewEdit(){
  const e = S.edit; if (!e) return "";
  const field = (qi, f, label, val, rows) => {
    const id = `ed-${qi}-${f}`;
    return `<label class="lbl" for="${id}">${label}</label>${rows
      ? `<textarea id="${id}" class="field" rows="${rows}" data-in="edit" data-qi="${qi}" data-f="${f}">${esc(val)}</textarea>`
      : `<input id="${id}" class="field" data-in="edit" data-qi="${qi}" data-f="${f}" value="${esc(val)}">`}`;
  };
  const card = (q, qi) => {
    let body = "";
    if (q.type === "multiple_choice") {
      body = `<fieldset class="pick"><legend class="lbl">보기 (정답에 표시하세요)</legend><div class="ed-opts">${q.options.map((o, oi) => `
        <div class="ed-opt"><input type="radio" name="ans-${qi}" id="ed-${qi}-a${oi}" data-ch="edit-ans" data-qi="${qi}" value="${oi}" ${q.ai === oi ? "checked" : ""}>
        <label class="sr-only" for="ed-${qi}-a${oi}">${oi + 1}번을 정답으로</label>
        <label class="sr-only" for="ed-${qi}-o${oi}">${oi + 1}번 보기</label>
        <input id="ed-${qi}-o${oi}" class="field" data-in="edit" data-qi="${qi}" data-f="opt" data-oi="${oi}" value="${esc(o)}"></div>`).join("")}</div></fieldset>`;
    } else if (q.type === "ox") {
      body = `<fieldset class="pick"><legend class="lbl">정답</legend><div class="seg">${["O", "X"].map(v => `<label><input type="radio" name="ans-${qi}" value="${v}" data-ch="edit-ox" data-qi="${qi}" ${q.answer === v ? "checked" : ""}><span>${v}</span></label>`).join("")}</div></fieldset>`;
    } else if (q.type === "short_answer") {
      body = field(qi, "answer", "정답", q.answer) + field(qi, "acc", "같은 뜻으로 인정할 답 (쉼표로 구분)", (q.acceptable_answers || []).join(", "));
    } else {
      body = field(qi, "answer", "모범답안", q.answer, 3) + field(qi, "rubric", "채점 기준", q.rubric || "", 3);
    }
    return `<article class="card ed-card">
      <div class="note-top"><div class="chips"><span class="chip t-${q.type}">${qi + 1}번 · ${TYPE_LABEL[q.type]}</span></div>
        <button class="btn ghost small danger" data-act="edit-del" data-qi="${qi}" ${e.questions.length <= 1 ? "disabled" : ""}>이 문제 빼기</button></div>
      ${field(qi, "question", "문제", q.question, 2)}
      ${body}
      ${field(qi, "explanation", "해설", q.explanation, 3)}
    </article>`;
  };
  return `
  <header class="page-head"><div><p class="eyebrow">문제 수정</p><h1>${esc(e.title)}</h1><p class="lead">AI가 만든 문제가 어색하면 직접 고치거나 빼세요. 저장하면 다음 풀이부터 바뀐 문제가 나와요.</p></div>
    <div class="row"><button class="btn ghost" data-act="edit-cancel">취소</button><button class="btn primary" data-act="edit-save">저장 (${e.questions.length}문제)</button></div></header>
  ${e.err ? `<p class="notice" role="alert" style="margin-bottom:16px">${esc(e.err)}</p>` : ""}
  <div class="stack">${e.questions.map(card).join("")}</div>
  <div class="row end" style="margin-top:18px"><button class="btn ghost" data-act="edit-cancel">취소</button><button class="btn primary" data-act="edit-save">저장 (${e.questions.length}문제)</button></div>`;
}

/* 시험지 인쇄 화면: 1쪽부터 시험지, 다음 쪽부터 정답과 해설 */
function viewPrint(){
  const st = findSet(S.printId); if (!st) return "";
  const today = new Date(), date = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  const item = q => {
    let body = "";
    if (q.type === "multiple_choice") body = `<ol class="p-opts">${q.options.map((o, i) => `<li><span>${CIRCLED[i]}</span> ${esc(o)}</li>`).join("")}</ol>`;
    else if (q.type === "ox") body = `<p class="p-ox">( O / X )</p>`;
    else if (q.type === "short_answer") body = `<p class="p-line">답: <span></span></p>`;
    else body = `<div class="p-box" aria-label="답안 쓰는 칸"></div>`;
    return `<li class="p-q"><p class="p-text">${esc(q.question)} <small>[${TYPE_LABEL[q.type]}]</small></p>${body}</li>`;
  };
  const ans = (q, i) => `<li><b>${q.type === "multiple_choice" ? `${CIRCLED[q.options.indexOf(q.answer)] || ""} ${esc(q.answer)}` : esc(q.answer)}</b>
    <p>${esc(q.explanation)}</p>${q.type === "essay" && q.rubric ? `<p class="p-rubric">채점 기준: ${esc(q.rubric)}</p>` : ""}${q.source_quote ? `<p class="p-src">근거: ${esc(q.source_quote)}${q.source_page ? ` (자료 ${q.source_page}쪽)` : ""}</p>` : ""}</li>`;
  return `
  <div class="print-bar no-print"><button class="btn ghost" data-act="print-back">← 돌아가기</button><p class="muted small">인쇄 창에서 'PDF로 저장'을 고르면 PDF 파일로도 만들 수 있어요.</p><button class="btn primary" data-act="print-go">인쇄하기</button></div>
  <article class="paper">
    <header class="p-head"><h1>${esc(st.title)}</h1>
      <dl class="p-meta"><div><dt>과목</dt><dd>${esc(st.subject || "기타")}</dd></div><div><dt>문항 수</dt><dd>${st.questions.length}문제</dd></div><div><dt>날짜</dt><dd>${date}</dd></div><div><dt>이름</dt><dd class="p-blank"></dd></div><div><dt>점수</dt><dd class="p-blank"></dd></div></dl>
    </header>
    <ol class="p-list">${st.questions.map(item).join("")}</ol>
  </article>
  <article class="paper p-answers">
    <header class="p-head"><h1>${esc(st.title)} · 정답과 해설</h1></header>
    <ol class="p-alist">${st.questions.map(ans).join("")}</ol>
    <p class="p-foot">퀴즈메이트에서 만든 시험지</p>
  </article>`;
}

/* 재설정 메일 링크로 들어왔을 때: 새 비밀번호 정하기 */
function viewNewPassword(){
  const a = S.auth;
  return `<section class="auth" style="grid-template-columns:minmax(0,1fr);max-width:480px;margin:0 auto">
    <div class="card auth-card">
      <h1 style="font-size:28px;margin-bottom:8px">새 비밀번호 정하기</h1>
      <p class="muted small" style="margin-bottom:14px">${esc(Auth.user?.email || "")} 계정의 비밀번호를 새로 정해요.</p>
      ${a.err ? `<p class="notice" role="alert" style="margin-bottom:14px">${esc(a.err)}</p>` : ""}
      <form id="newpw-form" class="auth-form" novalidate>
        <label class="lbl" for="np-1">새 비밀번호</label>
        <input id="np-1" class="field" name="password" type="password" autocomplete="new-password" required minlength="6" placeholder="6자 이상">
        <label class="lbl" for="np-2">새 비밀번호 확인</label>
        <input id="np-2" class="field" name="password2" type="password" autocomplete="new-password" required minlength="6">
        <button class="btn primary big" type="submit" ${a.busy ? "disabled" : ""}>${a.busy ? "저장하는 중…" : "비밀번호 바꾸기"}</button>
      </form>
    </div>
  </section>`;
}
