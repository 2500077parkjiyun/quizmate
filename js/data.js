"use strict";
/* 상수, 예시 문제 세트, 도우미 함수, 앱 상태 */
/* ---------- constants ---------- */
const MAX_CHARS = 15000, MIN_CHARS = 50;
const TYPES = ["multiple_choice","ox","short_answer","essay"];
const TYPE_LABEL = {multiple_choice:"객관식", ox:"O/X", short_answer:"단답형", essay:"서술형"};
const DIFF_LABEL = {easy:"쉬움", medium:"보통", hard:"어려움"};
const DIFF_DESC = {
  easy:"자료의 핵심 용어와 사실을 그대로 확인하는 기본 문제",
  medium:"개념을 이해했는지 확인하고, 개념끼리 비교하거나 간단히 적용하는 문제",
  hard:"여러 내용을 연결해 추론하거나 원인과 결과를 설명해야 하는 문제"
};
const CIRCLED = ["①","②","③","④","⑤"];
const ICON = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  new:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 12v6M9 15h6"/></svg>',
  sets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  data:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v6.5c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V5.5"/><path d="M4 12v6.5c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V12"/></svg>',
  notes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/><path d="M8 8l4 4M12 8l-4 4"/></svg>'
};

const EXAMPLE_TEXT = `광합성은 식물이 빛에너지를 이용하여 이산화탄소와 물로 포도당을 만드는 과정이다. 광합성은 주로 잎을 이루는 세포의 엽록체에서 일어나며, 엽록체 속의 엽록소가 빛을 흡수한다. 엽록소는 주로 청자색 빛과 적색 빛을 흡수하고 초록색 빛은 대부분 반사하기 때문에 잎이 초록색으로 보인다.

광합성 과정을 식으로 나타내면 '이산화탄소 + 물 → 포도당 + 산소'이며, 이 반응에는 빛에너지가 필요하다. 광합성 결과 만들어진 산소는 잎의 기공을 통해 공기 중으로 나간다. 기공은 주로 잎의 뒷면에 많이 분포하며, 기공을 둘러싼 공변세포가 기공을 열고 닫는다.

광합성으로 만들어진 포도당은 물에 잘 녹지 않는 녹말로 바뀌어 잎에 잠시 저장된다. 녹말은 주로 밤에 물에 잘 녹는 설탕으로 바뀌어 체관을 통해 뿌리, 줄기, 열매 등 식물의 각 부분으로 이동한다.

광합성량에 영향을 주는 환경 요인에는 빛의 세기, 이산화탄소 농도, 온도가 있다. 빛의 세기와 이산화탄소 농도가 증가하면 광합성량도 증가하다가, 일정 수준 이상에서는 더 이상 증가하지 않는다. 온도는 적정 온도(약 30~35℃)까지는 높아질수록 광합성량이 증가하지만, 그보다 높아지면 광합성에 관여하는 효소의 활성이 떨어져 광합성량이 급격히 감소한다.

식물은 광합성과 함께 호흡도 한다. 호흡은 포도당을 분해하여 생명 활동에 필요한 에너지를 얻는 과정으로, 빛과 관계없이 낮과 밤 모두 일어난다.`;

const EXAMPLE_SET = {
  id:"example", kind:"set", example:true, title:"광합성 (예시 세트)", subject:"과학", difficulty:"medium", createdAt:0, material:EXAMPLE_TEXT,
  questions:[
    {id:"example-q1", type:"multiple_choice", question:"광합성이 주로 일어나는 세포 속 구조는?", options:["미토콘드리아","엽록체","핵","액포"], answer:"엽록체", acceptable_answers:[], rubric:"", explanation:"광합성은 잎을 이루는 세포의 엽록체에서 일어나고, 엽록체 속 엽록소가 빛을 흡수한다. 미토콘드리아는 호흡, 핵은 유전 정보, 액포는 물질 저장과 관련이 있다.", source_quote:"광합성은 주로 잎을 이루는 세포의 엽록체에서 일어나며", difficulty:"easy"},
    {id:"example-q2", type:"ox", question:"엽록소가 초록색 빛을 가장 많이 흡수하기 때문에 잎이 초록색으로 보인다.", options:[], answer:"X", acceptable_answers:[], rubric:"", explanation:"엽록소는 청자색 빛과 적색 빛을 주로 흡수하고, 초록색 빛은 대부분 반사한다. 반사된 초록색 빛이 눈에 들어오기 때문에 잎이 초록색으로 보인다.", source_quote:"초록색 빛은 대부분 반사하기 때문에 잎이 초록색으로 보인다", difficulty:"medium"},
    {id:"example-q3", type:"short_answer", question:"잎의 기공을 둘러싸고 있으면서 기공을 열고 닫는 세포의 이름은?", options:[], answer:"공변세포", acceptable_answers:["공변 세포"], rubric:"", explanation:"기공을 둘러싼 공변세포가 모양을 바꾸며 기공을 열고 닫는다. 광합성으로 생긴 산소는 이 기공을 통해 공기 중으로 나간다.", source_quote:"기공을 둘러싼 공변세포가 기공을 열고 닫는다", difficulty:"easy"},
    {id:"example-q4", type:"multiple_choice", question:"광합성으로 만들어진 포도당이 잎에 잠시 저장될 때의 형태는?", options:["설탕","녹말","지방","단백질"], answer:"녹말", acceptable_answers:[], rubric:"", explanation:"포도당은 물에 잘 녹지 않는 녹말로 바뀌어 잎에 잠시 저장된다. 설탕은 녹말이 이동할 때(주로 밤) 바뀌는 형태이고, 지방과 단백질은 자료에서 저장 형태로 나오지 않는다.", source_quote:"포도당은 물에 잘 녹지 않는 녹말로 바뀌어 잎에 잠시 저장된다", difficulty:"medium"},
    {id:"example-q5", type:"ox", question:"식물의 호흡은 빛이 있는 낮에만 일어난다.", options:[], answer:"X", acceptable_answers:[], rubric:"", explanation:"호흡은 빛과 관계없이 낮과 밤 모두 일어난다. 빛이 필요한 것은 광합성이다.", source_quote:"빛과 관계없이 낮과 밤 모두 일어난다", difficulty:"easy"},
    {id:"example-q6", type:"short_answer", question:"광합성량에 영향을 주는 환경 요인 세 가지 중, 빛의 세기와 온도를 제외한 나머지 하나는?", options:[], answer:"이산화탄소 농도", acceptable_answers:["이산화탄소","CO2 농도","CO2","이산화 탄소 농도"], rubric:"", explanation:"광합성량에 영향을 주는 환경 요인은 빛의 세기, 이산화탄소 농도, 온도이다. 이산화탄소는 광합성의 재료이므로 농도가 높을수록 일정 수준까지 광합성량이 증가한다.", source_quote:"광합성량에 영향을 주는 환경 요인에는 빛의 세기, 이산화탄소 농도, 온도가 있다", difficulty:"medium"},
    {id:"example-q7", type:"essay", question:"온도가 광합성량에 어떤 영향을 주는지, 그 까닭과 함께 서술하시오.", options:[], answer:"적정 온도(약 30~35℃)까지는 온도가 높아질수록 광합성량이 증가한다. 하지만 그보다 온도가 높아지면 광합성에 관여하는 효소의 활성이 떨어지기 때문에 광합성량이 급격히 감소한다.", acceptable_answers:[], rubric:"① 적정 온도까지는 온도가 높아질수록 광합성량이 증가한다\n② 적정 온도보다 높으면 광합성량이 급격히 감소한다\n③ 감소하는 까닭: 효소의 활성이 떨어지기 때문", explanation:"온도는 광합성에 관여하는 효소의 활성에 영향을 준다. 그래서 적정 온도까지는 광합성량이 늘지만, 너무 높은 온도에서는 효소가 제 기능을 못 해 광합성량이 급격히 줄어든다.", source_quote:"그보다 높아지면 광합성에 관여하는 효소의 활성이 떨어져 광합성량이 급격히 감소한다", difficulty:"hard"}
  ]
};

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const mkId = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s ?? "").toLowerCase().normalize("NFC").replace(/[\s.,·:;\-_'"`()\[\]{}!?~]/g, "");
const fmtDate = ts => { if (!ts) return ""; const d = new Date(ts); return `${d.getMonth()+1}월 ${d.getDate()}일`; };
const fmtDateTime = ts => { const d = new Date(ts); return `${d.getMonth()+1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

/* ---------- state ---------- */
const S = {
  ai:null, aiLimits:null, aiChecked:false, aiBlocked:false, blockedMsg:"",
  ready:false, quiz:null, result:null, gen:null, grading:false,
  similar:{}, simBusy:{}, pendingRender:false,
  form:{tab:"text", text:"", title:"", subject:"", count:10, diff:"medium",
        types:{multiple_choice:true, ox:true, short_answer:true, essay:false},
        fileNote:"", fileErr:"", extracting:false},
  nf:{tab:"active", subject:"all", set:"all", type:"all", sort:"recent"}
};
