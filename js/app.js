"use strict";
(() => {
  // ===== 구글 스프레드시트 연결 =====
  // Apps Script를 '웹 앱'으로 배포한 뒤 받은 주소를 아래에 붙여넣으세요.
  const SHEET_URL = "여기에_APPS_SCRIPT_웹앱_URL";

  // ===== 질문 목록 (순서 = 화면 순서, key = 시트 열 이름) =====
  const QUESTIONS = [
    { key: "성함", type: "input", text: "예약하신 고객님의<br>성함을 입력해 주세요 :)", placeholder: "성함을 입력해 주세요." },
    { key: "주변에서 듣는 이미지", type: "textarea", text: "평소 주변에서 자주 듣는<br>'나'의 이미지는 어떠한가요?", hint: "ex. 예의 바르고 착하다, 시크하다" },
    { key: "되고 싶은 이미지", type: "textarea", text: "어떤 이미지를 가진 사람이<br>되고 싶으신가요?", hint: "ex. 지적이고 따뜻한 이미지,<br>당당하고 신뢰감을 주는 이미지" },
    { key: "패션 스타일", type: "textarea", text: "평소 패션 스타일을 알려주세요.", hint: "ex. 일-집 루틴으로 편안한 캐주얼 복장<br>약속이 있을 땐 정장 계열, 원피스 선호" },
    { key: "라이프 스타일", type: "textarea", text: "평소 라이프 스타일이<br>어떻게 되시나요?", hint: "ex. 09시~18시 직장, 19시~21시 저녁 및 운동" },
    { key: "관심 키워드", type: "textarea", text: "최근 나의 관심 키워드는<br>무엇인가요?", hint: "ex. 인간관계, 연애, 다이어트,<br>교환학생, 취업준비, 면접, 이사" },
    { key: "MBTI", type: "mbti", text: "MBTI 유형을 알려주세요 :)", placeholder: "예: ENFP" },
    { key: "전화번호", type: "phone", text: "연락받으실 전화번호를<br>입력해주세요.", hint: "010-0000-0000 형식으로 입력돼요.", placeholder: "010-0000-0000" },
    { key: "체험 가능 요일", type: "days", text: "체험 가능한 요일을<br>선택해주세요.", hint: "여러 요일을 함께 고를 수 있어요." },
    { key: "거주지", type: "region", text: "거주지를 알려주세요.", hint: "서울, 경기권만 체험이 가능해요.<br>간단하게 근처 역으로 작성해주세요.", placeholder: "예: 강남역" }
  ];
  const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

  const answers = {};
  let step = -1; // -1 = 첫 화면

  const $ = id => document.getElementById(id);
  const screens = { intro: $("intro"), survey: $("survey"), done: $("done") };

  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo(0, 0);
  }

  function formatPhone(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  function renderStep() {
    const q = QUESTIONS[step];
    const total = QUESTIONS.length;
    $("count").textContent = `${step + 1}/${total}`;
    $("fill").style.width = `${(step / total) * 100}%`;
    $("bar").setAttribute("aria-valuenow", step + 1);
    $("bar").setAttribute("aria-valuemax", total);
    $("qNo").textContent = `Q${step + 1}.`;
    $("qText").innerHTML = q.text;
    $("qHint").innerHTML = q.hint || "";
    $("qHint").style.display = q.hint ? "block" : "none";
    $("error").textContent = "";

    const box = $("answer");
    box.innerHTML = "";
    const saved = answers[q.key] ?? "";

    if (q.type === "input" || q.type === "mbti" || q.type === "phone") {
      const el = document.createElement("input");
      el.className = "field"; el.id = "field"; el.type = "text";
      el.placeholder = q.placeholder || "텍스트를 입력해 주세요.";
      el.value = saved;
      el.setAttribute("aria-label", q.key);
      if (q.type === "phone") {
        el.type = "tel"; el.inputMode = "numeric"; el.autocomplete = "tel";
        el.addEventListener("input", () => { el.value = formatPhone(el.value); el.classList.remove("invalid"); $("error").textContent = ""; });
      }
      if (q.type === "mbti") {
        el.maxLength = 4; el.autocapitalize = "characters";
        el.addEventListener("input", () => { el.value = el.value.toUpperCase().replace(/[^A-Z]/g, ""); });
      }
      el.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); next(); } });
      box.appendChild(el);
    }
    else if (q.type === "textarea") {
      const el = document.createElement("textarea");
      el.className = "field"; el.id = "field";
      el.placeholder = "텍스트를 입력해 주세요.";
      el.value = saved;
      el.setAttribute("aria-label", q.key);
      box.appendChild(el);
    }
    else if (q.type === "days") {
      const picked = saved ? saved.split(", ") : [];
      const wrap = document.createElement("div");
      wrap.className = "chips days";
      DAYS.forEach(d => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = d + "요일";
        b.dataset.day = d;
        b.setAttribute("aria-pressed", picked.includes(d) ? "true" : "false");
        b.addEventListener("click", () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"));
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    }
    else if (q.type === "region") {
      const [savedRegion, savedStation] = saved ? saved.split(" / ") : ["", ""];
      const wrap = document.createElement("div");
      wrap.className = "chips region";
      ["서울", "경기"].forEach(r => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = r;
        b.dataset.region = r;
        b.setAttribute("aria-pressed", r === savedRegion ? "true" : "false");
        b.addEventListener("click", () => {
          wrap.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
        });
        wrap.appendChild(b);
      });
      const el = document.createElement("input");
      el.className = "field"; el.id = "field"; el.type = "text";
      el.placeholder = q.placeholder; el.value = savedStation || "";
      el.setAttribute("aria-label", "근처 역");
      el.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); next(); } });
      box.appendChild(wrap);
      box.appendChild(el);
    }

    box.addEventListener("input", clearError);
    box.addEventListener("click", e => { if (e.target.closest(".chip")) clearError(); });

    $("mainLabel").textContent = step === total - 1 ? "제출하기" : "다음";
    const f = $("field");
    if (f && q.type !== "days") setTimeout(() => f.focus({ preventScroll: true }), 50);
  }

  // 현재 답변 저장 + 검사. 통과하면 true
  function collect() {
    const q = QUESTIONS[step];
    let value = "";
    if (q.type === "days") {
      value = [...document.querySelectorAll(".chip[aria-pressed='true']")].map(b => b.dataset.day).join(", ");
    } else if (q.type === "region") {
      const r = document.querySelector(".chip[aria-pressed='true']");
      const station = $("field").value.trim();
      value = r || station ? `${r ? r.dataset.region : ""} / ${station}` : "";
    } else {
      value = $("field").value.trim();
    }

    answers[q.key] = value;
    const msg = validate(q, value);
    if (msg) {
      $("error").textContent = msg;
      const f = $("field");
      if (f && !(q.type === "region" && !document.querySelector(".chip[aria-pressed='true']"))) {
        if (q.type !== "days") { f.classList.add("invalid"); f.focus(); }
      }
      return false;
    }
    return true;
  }

  // 필수 검사: 문제가 있으면 안내 문구, 없으면 빈 문자열
  const MBTI_RE = /^[EI][SN][TF][JP]$/;
  function validate(q, value) {
    switch (q.type) {
      case "phone":
        if (!value) return "전화번호를 입력해 주세요.";
        if (!/^010-\d{4}-\d{4}$/.test(value)) return "010-0000-0000 형식으로 입력해 주세요.";
        return "";
      case "mbti":
        if (!value) return "MBTI 유형을 입력해 주세요.";
        if (!MBTI_RE.test(value)) return "ENFP처럼 4글자 유형으로 입력해 주세요.";
        return "";
      case "days":
        return value ? "" : "체험 가능한 요일을 하나 이상 골라 주세요.";
      case "region": {
        const [r, s] = value.split(" / ");
        if (!r) return "서울과 경기 중 하나를 골라 주세요.";
        if (!s) return "근처 역을 입력해 주세요.";
        return "";
      }
      default:
        return value ? "" : "답변을 입력해 주세요.";
    }
  }

  async function submit() {
    const btn = $("mainBtn");
    btn.disabled = true;
    $("mainLabel").textContent = "제출 중...";
    const payload = {};
    QUESTIONS.forEach(q => payload[q.key] = answers[q.key] ?? "");
    try {
      if (SHEET_URL.startsWith("http")) {
        await fetch(SHEET_URL, {
          method: "POST",
          mode: "no-cors", // Apps Script는 CORS 응답을 안 주므로 no-cors로 전송
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      } else {
        console.warn("SHEET_URL 미설정 — 테스트 모드로 제출을 건너뜀", payload);
      }
      $("fill").style.width = "100%";
      $("ctaBar").hidden = true;
      show("done");
    } catch (err) {
      $("error").textContent = "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.";
      $("mainLabel").textContent = "제출하기";
    } finally {
      btn.disabled = false;
    }
  }

  function clearError() {
    $("error").textContent = "";
    const f = $("field"); if (f) f.classList.remove("invalid");
  }

  function next() {
    if (step === -1) {
      step = 0;
      $("mainBtn").classList.remove("shine");
      show("survey");
      renderStep();
      return;
    }
    if (!collect()) return;
    if (step === QUESTIONS.length - 1) { submit(); return; }
    step++;
    renderStep();
    window.scrollTo(0, 0);
  }

  function back() {
    if (step > 0) {
      collect_silent();
      step--;
      renderStep();
    } else {
      step = -1;
      $("mainLabel").textContent = "시작하기";
      $("mainBtn").classList.add("shine");
      show("intro");
    }
  }
  // 뒤로 갈 땐 검사 없이 입력값만 보관
  function collect_silent() {
    collect();
    clearError();
  }

  $("mainBtn").addEventListener("click", next);
  $("backBtn").addEventListener("click", back);

  // ===== 모바일 키보드 대응 =====
  // 아이폰은 키보드가 올라와도 화면 크기가 안 바뀌어서 하단 버튼이 키보드 뒤에 숨음.
  // visualViewport(실제로 보이는 영역)를 보고 버튼을 키보드 바로 위로 올려줌.
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const bar = $("ctaBar");
    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const hidden = window.innerHeight - vv.height - vv.offsetTop; // 키보드가 가린 높이
        const open = hidden > 80;
        bar.style.transform = open ? `translateY(${-hidden}px)` : "";
        bar.classList.toggle("kb-open", open);
      });
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
  }

  // 입력칸을 누르면 키보드·버튼에 가리지 않게 화면 가운데로 스크롤
  document.addEventListener("focusin", e => {
    if (e.target.classList && e.target.classList.contains("field")) {
      setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    }
  });
})();
