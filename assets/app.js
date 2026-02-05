const $ = (sel) => document.querySelector(sel);

const state = {
  grade: null,
  lesson: null,
  tab: "diagnostic" // diagnostic | formative | summative
};

const LS_KEY = "SCI_ASSESS_1447_V2";

/* ====== Storage ====== */
function loadStore(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveStore(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
function resetStore(){ localStorage.removeItem(LS_KEY); }

function lessonKey(gradeNum, lessonTitle){
  return `g${gradeNum}::${lessonTitle}`;
}

/* ====== Default Templates (PDF) ====== */
function defaultWorksheetTemplate(kind, lessonTitle){
  const emoji = kind === "diagnostic" ? "🔎" : "🧩";
  const title = kind === "diagnostic" ? "تقويم تشخيصي (بداية الدرس)" : "تقويم تكويني (أثناء الدرس)";
  return {
    header: `${emoji} ${title} — ${lessonTitle}`,
    teacherNotes: "اكتبي هنا تعليمات التنفيذ/الزمن/الدرجة…",
    activities: [
      { icon:"🧠", text:"تمهيد سريع: ماذا تعرف/ماذا تريد أن تعرف؟ (KWL مختصر)" },
      { icon:"✅", text:"تحقق مفاهيم: سؤالان قصيران (صح/خطأ أو اختيار من متعدد)" },
      { icon:"🧪", text:"نشاط استقصاء بسيط: توقّع → لاحظ → فسّر (POE)" },
      { icon:"✍️", text:"سؤال تفكير أعلى: علّل/قارن/استنتج (إجابة قصيرة)" }
    ]
  };
}

/* ====== UI ====== */
function renderGradesNav(){
  const nav = $("#gradesNav");
  nav.innerHTML = "";

  window.CURRICULUM_1447.grades.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "grade-btn" + (state.grade?.grade === g.grade ? " active" : "");
    btn.innerHTML = `<span>📚 ${g.name}</span><span class="badge">${g.grade}</span>`;
    btn.addEventListener("click", () => {
      state.grade = g;
      state.lesson = null;
      state.tab = "diagnostic";
      updateHash();
      render();
    });
    nav.appendChild(btn);
  });
}

function viewHome(){
  return `
    <div class="card">
      <div class="row">
        <span class="badge">✅ تشخيصي + تكويني = ورقة عمل PDF (A4)</span>
        <span class="badge">✅ ختامي = اختبار إلكتروني ذكي لكل درس</span>
        <span class="badge">💾 حفظ التعديلات داخل نفس المتصفح</span>
      </div>
      <div class="hr"></div>
      <h2 style="margin:0 0 6px">ابدئي باختيار الصف</h2>
      <p class="note" style="margin:0">
        بعد اختيار الصف، اختاري الترم ثم الدرس، وبعدها نوع التقويم (تشخيصي/تكويني/ختامي).
      </p>
    </div>
  `;
}

function viewGrade(g){
  const termCards = g.terms.map(t => {
    const items = t.lessons.map(lsn => `
      <li class="item" data-lesson="${escapeHtml(lsn)}">
        <div class="title">
          <span class="t">${escapeHtml(lsn)}</span>
          <small>افتحي التقويم</small>
        </div>
      </li>
    `).join("");
    return `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 style="margin:0;font-size:16px">${t.title}</h2>
          <span class="badge">عدد الدروس: ${t.lessons.length}</span>
        </div>
        <div class="hr"></div>
        <ul class="list">${items}</ul>
      </div>
    `;
  }).join("");

  return `<div class="grid2">${termCards}</div>`;
}

function viewLesson(g, lessonTitle){
  const tabs = [
    {id:"diagnostic", label:"🔎 تشخيصي (PDF)"},
    {id:"formative",  label:"🧩 تكويني (PDF)"},
    {id:"summative",  label:"📝 ختامي (إلكتروني)"}
  ];

  const tabsHtml = `
    <div class="tabs">
      ${tabs.map(t => `
        <button class="tab ${state.tab===t.id?"active":""}" data-tab="${t.id}">
          ${t.label}
        </button>
      `).join("")}
    </div>
  `;

  const body = state.tab === "summative"
    ? viewQuizEditor(g.grade, lessonTitle)
    : viewWorksheetEditor(g.grade, lessonTitle, state.tab);

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div class="badge">${g.name}</div>
          <h2 style="margin:8px 0 0;font-size:18px">${escapeHtml(lessonTitle)}</h2>
        </div>
        <button class="btn ghost" id="btnBack">↩︎ الرجوع للدروس</button>
      </div>

      ${tabsHtml}
      <div class="hr"></div>
      ${body}
    </div>
  `;
}

/* ====== Worksheet Editor (PDF) ====== */
function viewWorksheetEditor(gradeNum, lessonTitle, kind){
  const store = loadStore();
  const k = lessonKey(gradeNum, lessonTitle);
  const existing = store[k]?.[kind] || defaultWorksheetTemplate(kind, lessonTitle);

  const activitiesHtml = existing.activities.map((a, idx) => `
    <div class="field">
      <label>نشاط ${idx+1} (رمز + نص)</label>
      <div class="row" style="gap:8px;align-items:flex-start">
        <input type="text" value="${escapeAttr(a.icon)}" data-aicon="${idx}" style="max-width:140px" />
        <textarea data-atext="${idx}">${escapeHtml(a.text)}</textarea>
      </div>
    </div>
  `).join("");

  return `
    <div class="row">
      <button class="btn ok" id="btnSave">💾 حفظ</button>
      <button class="btn" id="btnPdf">🖨️ حفظ كـ PDF (A4)</button>
      <button class="btn ghost" id="btnAddActivity">➕ إضافة نشاط</button>
    </div>

    <div class="field">
      <label>عنوان الورقة</label>
      <input type="text" id="wsHeader" value="${escapeAttr(existing.header)}" />
    </div>

    <div class="field">
      <label>تعليمات/ملاحظات المعلمة</label>
      <textarea id="wsNotes">${escapeHtml(existing.teacherNotes)}</textarea>
    </div>

    ${activitiesHtml}

    <div class="note">
      💡 اكتبي أسئلة اختيار من متعدد/أكملي الفراغ داخل الأنشطة، ثم احفظي واطبعي كـ PDF.
    </div>
  `;
}

function collectWorksheetFromUI(){
  const header = $("#wsHeader").value.trim();
  const teacherNotes = $("#wsNotes").value.trim();

  const icons = [...document.querySelectorAll("[data-aicon]")].map(el => el.value.trim());
  const texts = [...document.querySelectorAll("[data-atext]")].map(el => el.value.trim());

  const activities = texts.map((t,i)=>({ icon: icons[i] || "✍️", text: t || "" }));
  return { header, teacherNotes, activities };
}

/* ====== Print (A4 PDF) ====== */
function openPrint(gradeName, lessonTitle, kind, worksheet){
  const title = kind === "diagnostic" ? "تقويم تشخيصي" : "تقويم تكويني";
  const html = `
    <div style="font-family:Tahoma, Arial; direction:rtl">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div>
          <h2 style="margin:0 0 6px">${escapeHtml(worksheet.header || title)}</h2>
          <div style="color:#444;font-size:12px;line-height:1.6">
            <div><b>الصف:</b> ${escapeHtml(gradeName)}</div>
            <div><b>الدرس:</b> ${escapeHtml(lessonTitle)}</div>
            <div><b>النوع:</b> ${title}</div>
          </div>
        </div>
        <div style="text-align:left;color:#666;font-size:12px;line-height:1.8">
          <div>التاريخ: ____________</div>
          <div>اسم الطالبة: ____________</div>
          <div>الشعبة: ____________</div>
        </div>
      </div>

      <hr style="margin:12px 0"/>

      <div style="margin-bottom:10px">
        <b>تعليمات المعلمة:</b>
        <div style="margin-top:6px;white-space:pre-wrap">${escapeHtml(worksheet.teacherNotes || "")}</div>
      </div>

      <hr style="margin:12px 0"/>

      <ol style="padding-right:18px">
        ${
          (worksheet.activities || []).map(a => `
            <li style="margin:10px 0">
              <div style="display:flex;gap:10px;align-items:flex-start">
                <div style="min-width:28px">${escapeHtml(a.icon || "✍️")}</div>
                <div style="white-space:pre-wrap">${escapeHtml(a.text || "")}</div>
              </div>
              <div style="margin-top:10px;border:1px dashed #bbb;border-radius:10px;min-height:60px"></div>
            </li>
          `).join("")
        }
      </ol>

      <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:12px;color:#555">
        <div>✅ تغذية راجعة: 😊 ممتاز | 🙂 جيد | 💡 يحتاج دعم</div>
        <div>توقيع المعلمة: ____________</div>
      </div>
    </div>
  `;

  $("#printArea").innerHTML = html;
  $("#printOverlay").classList.remove("hidden");
  $("#printOverlay").setAttribute("aria-hidden","false");
}

/* ====== Quiz (Summative) ====== */
function getSummativeQuiz(gradeNum, lessonTitle){
  const store = loadStore();
  const k = lessonKey(gradeNum, lessonTitle);
  return store[k]?.summative || window.SUMMATIVE_GEN.makeLessonQuiz(gradeNum, lessonTitle);
}

function viewQuizEditor(gradeNum, lessonTitle){
  const quiz = getSummativeQuiz(gradeNum, lessonTitle);

  const qHtml = (quiz.questions || []).map((q, idx) => {
    const head = `
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="badge">سؤال ${idx+1}</div>
        <div class="badge">مهارة: ${escapeHtml(q.skill || "—")}</div>
        <button class="btn danger ghost" data-delq="${idx}">حذف</button>
      </div>
      <div class="field">
        <label>نص السؤال</label>
        <textarea data-qprompt="${idx}">${escapeHtml(q.prompt || "")}</textarea>
      </div>
    `;

    if(q.type === "tf"){
      return `
        <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
          ${head}
          <div class="field">
            <label>الإجابة الصحيحة</label>
            <select data-qtf="${idx}">
              <option value="true" ${q.correctTF===true?"selected":""}>صحيحة</option>
              <option value="false" ${q.correctTF===false?"selected":""}>خاطئة</option>
            </select>
          </div>
          <div class="grid2">
            <div class="field">
              <label>تغذية راجعة عند الصحيح</label>
              <input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"أحسنتِ ✅")}" />
            </div>
            <div class="field">
              <label>تغذية راجعة عند الخطأ</label>
              <input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"راجعي الفكرة 💡")}" />
            </div>
          </div>
        </div>
      `;
    }

    if(q.type === "short"){
      const kw = Array.isArray(q.keywords) ? q.keywords.join(", ") : "";
      return `
        <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
          ${head}
          <div class="field">
            <label>كلمات مفتاحية للتصحيح الآلي (اختياري) — افصلي بينها بفاصلة</label>
            <input type="text" data-qkw="${idx}" value="${escapeAttr(kw)}" placeholder="مثال: مدار, مائل, اصطفاف" />
          </div>
          <div class="grid2">
            <div class="field">
              <label>تغذية راجعة عند قبول الإجابة</label>
              <input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"إجابة موفقة 🎯✅")}" />
            </div>
            <div class="field">
              <label>تغذية راجعة عند عدم التطابق</label>
              <input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"حاولي ذكر مفاهيم أساسية 🙂")}" />
            </div>
          </div>
        </div>
      `;
    }

    const opts = (q.options || ["","","",""]).slice(0,4);
    return `
      <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
        ${head}
        <div class="field">
          <label>الخيارات (4)</label>
          <div class="grid2">
            ${opts.map((op,i)=>`
              <input type="text" data-qopt="${idx}:${i}" value="${escapeAttr(op)}" placeholder="خيار ${i+1}" />
            `).join("")}
          </div>
        </div>
        <div class="field">
          <label>رقم الإجابة الصحيحة (1-4)</label>
          <input type="text" data-qcorrect="${idx}" value="${escapeAttr(String((q.correct ?? 0)+1))}" />
        </div>
        <div class="grid2">
          <div class="field">
            <label>تغذية راجعة عند الصحيح</label>
            <input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"أحسنتِ ✅🌟")}" />
          </div>
          <div class="field">
            <label>تغذية راجعة عند الخطأ</label>
            <input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"راجعي الفكرة 🙂🔁")}" />
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="row">
      <button class="btn ok" id="btnSaveQuiz">💾 حفظ الاختبار</button>
      <button class="btn ghost" id="btnAddMCQ">➕ سؤال (اختيار متعدد)</button>
      <button class="btn ghost" id="btnAddTF">➕ سؤال (صح/خطأ)</button>
      <button class="btn ghost" id="btnAddShort">➕ سؤال (إجابة قصيرة)</button>
      <button class="btn" id="btnStartQuiz">▶️ بدء الاختبار (وضع الطالبة)</button>
    </div>

    <div class="field">
      <label>عنوان الاختبار</label>
      <input type="text" id="quizTitle" value="${escapeAttr(quiz.title || "")}" />
    </div>
    <div class="field">
      <label>تعليمات/وصف</label>
      <textarea id="quizIntro">${escapeHtml(quiz.intro || "")}</textarea>
    </div>

    ${qHtml}

    <div id="quizRunner" class="card hidden" style="margin-top:12px; background: rgba(10,16,32,.35)"></div>
  `;
}

function collectQuizFromUI(){
  const title = $("#quizTitle").value.trim();
  const intro = $("#quizIntro").value.trim();

  const promptEls = [...document.querySelectorAll("[data-qprompt]")];
  const count = promptEls.length;

  const questions = [];
  for(let i=0;i<count;i++){
    const prompt = promptEls[i].value.trim();

    const tfSel = document.querySelector(`[data-qtf="${i}"]`);
    const kwInp = document.querySelector(`[data-qkw="${i}"]`);

    const fc = (document.querySelector(`[data-qfc="${i}"]`)?.value || "").trim();
    const fw = (document.querySelector(`[data-qfw="${i}"]`)?.value || "").trim();

    if(tfSel){
      questions.push({
        type:"tf",
        skill: inferSkill(prompt),
        prompt,
        correctTF: tfSel.value === "true",
        feedbackCorrect: fc,
        feedbackWrong: fw
      });
    } else if(kwInp){
      const keywords = kwInp.value.split(",").map(s=>s.trim()).filter(Boolean);
      questions.push({
        type:"short",
        skill: inferSkill(prompt),
        prompt,
        keywords,
        feedbackCorrect: fc,
        feedbackWrong: fw
      });
    } else {
      const opts = [0,1,2,3].map(j => (document.querySelector(`[data-qopt="${i}:${j}"]`)?.value || "").trim());
      const corrRaw = (document.querySelector(`[data-qcorrect="${i}"]`)?.value || "1").trim();
      let corr = parseInt(corrRaw,10);
      if(!Number.isFinite(corr) || corr < 1 || corr > 4) corr = 1;

      questions.push({
        type:"mcq",
        skill: inferSkill(prompt),
        prompt,
        options: opts,
        correct: corr - 1,
        feedbackCorrect: fc,
        feedbackWrong: fw
      });
    }
  }

  return { title, intro, questions };
}

function runQuiz(quiz){
  const runner = $("#quizRunner");
  runner.classList.remove("hidden");

  let idx = 0;
  let score = 0;

  const calcEmoji = (pct) => pct >= 90 ? "🏆🎯" : pct >= 70 ? "😊👏" : pct >= 60 ? "🙂📌" : "💡💪";

  const showDone = () => {
    const total = quiz.questions.length;
    const pct = total ? Math.round((score/total)*100) : 0;
    const emoji = calcEmoji(pct);

    const verdict =
      pct >= 90 ? "🎯 ممتاز: فهم عميق"
      : pct >= 70 ? "🙂 جيد جدًا"
      : pct >= 60 ? "📌 مقبول مع مراجعة"
      : "💡 يحتاج دعم";

    runner.innerHTML = `
      <h3 style="margin:0 0 8px">انتهى الاختبار ${emoji}</h3>
      <p class="note" style="margin:0">
        درجتك: <b>${score}</b> من <b>${total}</b> — <b>${pct}%</b><br>
        <span>${escapeHtml(verdict)}</span>
      </p>
      <div class="hr"></div>
      <button class="btn" id="btnRestart">🔁 إعادة</button>
    `;
    $("#btnRestart").onclick = () => { idx=0; score=0; showQuestion(); };
  };

  const showQuestion = () => {
    const q = quiz.questions[idx];
    if(!q){ showDone(); return; }

    const head = `
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="badge">سؤال ${idx+1} / ${quiz.questions.length}</div>
        <div class="badge">مهارة: ${escapeHtml(q.skill || "—")}</div>
      </div>
      <h3 style="margin:10px 0 6px">${escapeHtml(q.prompt || "")}</h3>
    `;

    if(q.type === "tf"){
      runner.innerHTML = `
        ${head}
        <div class="row">
          <button class="btn" data-ans="true">صحيحة</button>
          <button class="btn" data-ans="false">خاطئة</button>
        </div>
        <div id="fb" class="note" style="margin-top:10px"></div>
      `;
      runner.querySelectorAll("[data-ans]").forEach(b=>{
        b.onclick = ()=>{
          const ans = b.getAttribute("data-ans")==="true";
          const ok = ans === q.correctTF;
          if(ok) score++;
          $("#fb").textContent = ok ? (q.feedbackCorrect || "أحسنتِ ✅") : (q.feedbackWrong || "راجعي الفكرة 💡");
          setTimeout(()=>{ idx++; showQuestion(); }, 900);
        };
      });
      return;
    }

    if(q.type === "short"){
      runner.innerHTML = `
        ${head}
        <div class="field">
          <label>اكتبي إجابتك</label>
          <textarea id="shortAns" placeholder="اكتبي هنا..."></textarea>
        </div>
        <div class="row">
          <button class="btn ok" id="btnCheckShort">تحقق ✅</button>
          <button class="btn ghost" id="btnSkipShort">تخطي ↩️</button>
        </div>
        <div id="fb" class="note" style="margin-top:10px"></div>
      `;

      $("#btnCheckShort").onclick = ()=>{
        const ans = ($("#shortAns").value || "").trim().toLowerCase();
        const kws = (q.keywords || []).map(x => String(x).toLowerCase()).filter(Boolean);

        if(!kws.length){
          $("#fb").textContent = "تم استلام الإجابة ✅ (يُقيَّم ذاتيًا من المعلمة) 🙂";
          setTimeout(()=>{ idx++; showQuestion(); }, 1100);
          return;
        }

        const ok = ans.length > 0 && kws.some(k => ans.includes(k));
        if(ok) score++;
        $("#fb").textContent = ok ? (q.feedbackCorrect || "إجابة موفقة 🎯✅") : (q.feedbackWrong || "حاولي ذكر كلمات أساسية 🙂");
        setTimeout(()=>{ idx++; showQuestion(); }, 1100);
      };

      $("#btnSkipShort").onclick = ()=>{ idx++; showQuestion(); };
      return;
    }

    const opts = (q.options && q.options.length) ? q.options : ["أ","ب","ج","د"];
    runner.innerHTML = `
      ${head}
      <div class="list">
        ${opts.slice(0,4).map((op,i)=>`
          <button class="item" style="text-align:right" data-opt="${i}">
            ${escapeHtml(op || `خيار ${i+1}`)}
          </button>
        `).join("")}
      </div>
      <div id="fb" class="note" style="margin-top:10px"></div>
    `;
    runner.querySelectorAll("[data-opt]").forEach(b=>{
      b.onclick = ()=>{
        const pick = parseInt(b.getAttribute("data-opt"),10);
        const ok = pick === q.correct;
        if(ok) score++;
        $("#fb").textContent = ok ? (q.feedbackCorrect || "أحسنتِ ✅🌟") : (q.feedbackWrong || "راجعي الفكرة 🙂🔁");
        setTimeout(()=>{ idx++; showQuestion(); }, 900);
      };
    });
  };

  showQuestion();
}

/* ====== Events + Routing ====== */
function bindHandlers(){
  $("#btnHome").onclick = () => {
    state.grade = null;
    state.lesson = null;
    state.tab = "diagnostic";
    updateHash();
    render();
  };

  $("#btnReset").onclick = () => {
    if(confirm("هل تريدين مسح جميع التعديلات المحفوظة على هذا المتصفح؟")){
      resetStore();
      alert("تم المسح ✅");
      render();
    }
  };

  $("#btnPrintNow").onclick = () => window.print();
  $("#btnClosePrint").onclick = () => {
    $("#printOverlay").classList.add("hidden");
    $("#printOverlay").setAttribute("aria-hidden","true");
  };

  window.addEventListener("hashchange", () => { readHash(); render(); });
}

function updateHash(){
  if(!state.grade){ location.hash = "#/"; return; }
  const g = state.grade.grade;
  const l = state.lesson ? encodeURIComponent(state.lesson) : "";
  const t = state.tab || "diagnostic";
  location.hash = l ? `#/g/${g}/l/${l}/t/${t}` : `#/g/${g}`;
}

function readHash(){
  const h = location.hash || "#/";
  const parts = h.replace("#/","").split("/").filter(Boolean);

  state.grade = null; state.lesson = null; state.tab = "diagnostic";

  if(parts[0] === "g" && parts[1]){
    const gnum = parseInt(parts[1],10);
    const g = window.CURRICULUM_1447.grades.find(x=>x.grade===gnum);
    if(g) state.grade = g;

    const lIndex = parts.indexOf("l");
    if(lIndex !== -1 && parts[lIndex+1]) state.lesson = decodeURIComponent(parts[lIndex+1]);

    const tIndex = parts.indexOf("t");
    if(tIndex !== -1 && parts[tIndex+1]) state.tab = parts[tIndex+1];
  }
}

function render(){
  renderGradesNav();
  const view = $("#view");

  if(!state.grade){
    view.innerHTML = viewHome();
    return;
  }

  if(!state.lesson){
    view.innerHTML = viewGrade(state.grade);
    view.querySelectorAll("[data-lesson]").forEach(li=>{
      li.addEventListener("click", ()=>{
        state.lesson = li.getAttribute("data-lesson");
        state.tab = "diagnostic";
        updateHash();
        render();
      });
    });
    return;
  }

  view.innerHTML = viewLesson(state.grade, state.lesson);

  $("#btnBack").onclick = () => {
    state.lesson = null;
    state.tab = "diagnostic";
    updateHash();
    render();
  };

  view.querySelectorAll("[data-tab]").forEach(b=>{
    b.onclick = ()=>{
      state.tab = b.getAttribute("data-tab");
      updateHash();
      render();
    };
  });

  // Worksheet handlers
  if(state.tab !== "summative"){
    $("#btnAddActivity").onclick = ()=>{
      const kind = state.tab;
      const store = loadStore();
      const k = lessonKey(state.grade.grade, state.lesson);
      const existing = store[k]?.[kind] || defaultWorksheetTemplate(kind, state.lesson);
      existing.activities.push({icon:"✍️", text:"سؤال/نشاط جديد…"});
      store[k] = store[k] || {};
      store[k][kind] = existing;
      saveStore(store);
      render();
    };

    $("#btnSave").onclick = ()=>{
      const kind = state.tab;
      const ws = collectWorksheetFromUI();
      const store = loadStore();
      const k = lessonKey(state.grade.grade, state.lesson);
      store[k] = store[k] || {};
      store[k][kind] = ws;
      saveStore(store);
      alert("تم الحفظ ✅");
    };

    $("#btnPdf").onclick = ()=>{
      const kind = state.tab;
      const ws = collectWorksheetFromUI();
      openPrint(state.grade.name, state.lesson, kind, ws);
    };
  }

  // Summative handlers
  if(state.tab === "summative"){
    // delete question
    view.querySelectorAll("[data-delq]").forEach(btn=>{
      btn.onclick = ()=>{
        const idx = parseInt(btn.getAttribute("data-delq"),10);
        const store = loadStore();
        const key = lessonKey(state.grade.grade, state.lesson);
        const quiz = getSummativeQuiz(state.grade.grade, state.lesson);
        quiz.questions.splice(idx,1);
        store[key] = store[key] || {};
        store[key].summative = quiz;
        saveStore(store);
        render();
      };
    });

    $("#btnAddMCQ").onclick = ()=>{
      const store = loadStore();
      const key = lessonKey(state.grade.grade, state.lesson);
      const quiz = getSummativeQuiz(state.grade.grade, state.lesson);
      quiz.questions.push({
        type:"mcq",
        skill:"فهم",
        prompt:"سؤال اختيار من متعدد:",
        options:["أ","ب","ج","د"],
        correct:0,
        feedbackCorrect:"أحسنتِ ✅🌟",
        feedbackWrong:"راجعي الفكرة 🙂🔁"
      });
      store[key] = store[key] || {};
      store[key].summative = quiz;
      saveStore(store);
      render();
    };

    $("#btnAddTF").onclick = ()=>{
      const store = loadStore();
      const key = lessonKey(state.grade.grade, state.lesson);
      const quiz = getSummativeQuiz(state.grade.grade, state.lesson);
      quiz.questions.push({
        type:"tf",
        skill:"تطبيق",
        prompt:"عبارة صح/خطأ:",
        correctTF:true,
        feedbackCorrect:"صحيح ✅🙂",
        feedbackWrong:"غير صحيح ❌💡"
      });
      store[key] = store[key] || {};
      store[key].summative = quiz;
      saveStore(store);
      render();
    };

    $("#btnAddShort").onclick = ()=>{
      const store = loadStore();
      const key = lessonKey(state.grade.grade, state.lesson);
      const quiz = getSummativeQuiz(state.grade.grade, state.lesson);
      quiz.questions.push({
        type:"short",
        skill:"تحليل",
        prompt:"سؤال إجابة قصيرة/تفكير أعلى:",
        keywords:[],
        feedbackCorrect:"إجابة موفقة 🎯✅",
        feedbackWrong:"حاولي ذكر مفاهيم أساسية 🙂"
      });
      store[key] = store[key] || {};
      store[key].summative = quiz;
      saveStore(store);
      render();
    };

    $("#btnSaveQuiz").onclick = ()=>{
      const qz = collectQuizFromUI();
      const store = loadStore();
      const key = lessonKey(state.grade.grade, state.lesson);
      store[key] = store[key] || {};
      store[key].summative = qz;
      saveStore(store);
      alert("تم حفظ الاختبار ✅");
    };

    $("#btnStartQuiz").onclick = ()=>{
      const qz = collectQuizFromUI();
      runQuiz(qz);
      $("#quizRunner").scrollIntoView({behavior:"smooth", block:"start"});
    };
  }
}

/* ====== Helpers ====== */
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("\n"," "); }

function inferSkill(text){
  const t = String(text||"");
  if(t.includes("علل") || t.includes("فسر") || t.includes("لماذا")) return "تحليل";
  if(t.includes("قارن") || t.includes("استنتج")) return "تحليل";
  if(t.includes("احسب") || t.includes("طبق")) return "تطبيق";
  if(t.includes("قيّم") || t.includes("برر")) return "تقييم";
  if(t.includes("ابتكر") || t.includes("اقترح") || t.includes("صمم")) return "إبداع";
  return "فهم";
}

/* ====== Init ====== */
function init(){
  bindHandlers();
  readHash();
  render();
}
init();
