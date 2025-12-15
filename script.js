document.addEventListener("DOMContentLoaded", () => {
  function getSafeTimeZone() {
    try {
      if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
        return "Bilinmiyor";
      }
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (err) {
      console.error("Saat dilimi alınamadı:", err);
      return "Bilinmiyor";
    }
  }

  const REQUIRED_TASK_IDS = ["task-typing", "task-attention", "task-reaction", "task-slider", "task-quiz"];
  const completedTasks = new Set();

  // ====================
  // CİHAZ & ORTAM VERİLERİ (YASAL)
  // ====================
  const deviceData = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    cpuCores: navigator.hardwareConcurrency || "Bilinmiyor",
    memoryGB: navigator.deviceMemory ? navigator.deviceMemory + " GB" : "Bilinmiyor",
    touchSupport: navigator.maxTouchPoints > 0,
    timezone: getSafeTimeZone(),
    localTime: new Date().toLocaleString()
  };

  // ====================
  // VERİLER
  // ====================
  const targetSentence = "Bu, son derece başarılı bir sunum çalışmasıdır.";
  const sliderTarget = Math.floor(Math.random() * 61) + 20; // 20-80 arası rastgele hedef

  let keystrokes = [];
  let backspaces = 0;
  let typingStart = null;
  let typingEnd = null;
  let typingCompleted = false;

  let timerInterval = null;
  let timerStart = null;
  let stoppedTime = null;
  let timerCompleted = false;

  const metrics = {
    reaction: null,
    slider: { target: sliderTarget, value: null, diff: null },
    sessionDuration: null,
    quizAnswer: null
  };

  const passiveSignals = {
    sessionStart: Date.now(),
    focusReturns: 0,
    scrollEvents: 0
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      passiveSignals.focusReturns++;
    }
  });

  window.addEventListener("scroll", () => {
    passiveSignals.scrollEvents++;
  });

  function completeTask(id) {
    const taskEl = document.getElementById(id);
    if (!taskEl || completedTasks.has(id)) {
      return;
    }
    taskEl.classList.add("completed");
    completedTasks.add(id);
    if (completedTasks.size === REQUIRED_TASK_IDS.length) {
      showResults();
    }
  }

  // ====================
  // YAZMA TESTİ
  // ====================
  const typingInput = document.getElementById("typingInput");
  const typingSentenceEl = document.getElementById("typingSentence");
  const checkTypingBtn = document.getElementById("checkTyping");
  const typingStatus = document.getElementById("typingStatus");

  typingSentenceEl.textContent = targetSentence;

  typingInput.addEventListener("keydown", e => {
    if (typingCompleted) return;
    if (!typingStart) typingStart = Date.now();
    if (e.key === "Backspace") backspaces++;
    keystrokes.push({ key: e.key, time: Date.now() });
  });

  typingInput.addEventListener("paste", e => {
    e.preventDefault();
  });

  function finalizeTypingTask() {
    if (typingCompleted) return;
    typingCompleted = true;
    typingEnd = Date.now();
    typingInput.disabled = true;
    checkTypingBtn.disabled = true;
    typingStatus.textContent = "Doğru! Görev tamamlandı.";
    completeTask("task-typing");
  }

  function evaluateTypingInput(showFeedback = false) {
    if (typingCompleted) return true;
    const currentValue = typingInput.value.trim();
    const matches = currentValue === targetSentence.trim();
    if (matches) {
      finalizeTypingTask();
      return true;
    }
    if (showFeedback) {
      typingStatus.textContent = currentValue
        ? "Cümle tamamen eşleşmiyor, lütfen kontrol edin."
        : "Lütfen önce cümleyi yazın.";
    }
    return false;
  }

  typingInput.addEventListener("input", () => {
    evaluateTypingInput();
  });

  checkTypingBtn.addEventListener("click", () => {
    evaluateTypingInput(true);
  });

  // ====================
  // DİKKAT TESTİ – KRONOMETRE
  // ====================
  const timerEl = document.getElementById("timer");
  const startTimerBtn = document.getElementById("startTimer");
  const stopTimerBtn = document.getElementById("stopTimer");
  stopTimerBtn.disabled = true;

  startTimerBtn.onclick = () => {
    if (timerCompleted || timerInterval) return;
    timerStart = Date.now();
    startTimerBtn.disabled = true;
    stopTimerBtn.disabled = false;
    timerInterval = setInterval(() => {
      const t = (Date.now() - timerStart) / 1000;
      timerEl.textContent = t.toFixed(2);
    }, 10);
  };

  stopTimerBtn.onclick = () => {
    if (!timerStart || timerCompleted) return;
    clearInterval(timerInterval);
    stoppedTime = (Date.now() - timerStart) / 1000;
    timerEl.textContent = stoppedTime.toFixed(2);
    timerInterval = null;
    timerStart = null;
    timerCompleted = true;
    stopTimerBtn.disabled = true;
    startTimerBtn.disabled = true;
    completeTask("task-attention");
  };

  // ====================
  // REAKSİYON TESTİ
  // ====================
  const reactionBtn = document.getElementById("reactionBtn");
  const reactionStatus = document.getElementById("reactionStatus");
  let reactionReady = false;
  let reactionStartTime = null;
  let reactionCompleted = false;

  reactionBtn.addEventListener("click", () => {
    if (reactionCompleted) return;
    if (reactionReady) {
      const reactionTime = Date.now() - reactionStartTime;
      metrics.reaction = reactionTime;
      reactionCompleted = true;
      reactionBtn.disabled = true;
      reactionBtn.textContent = "Tamamlandı";
      reactionStatus.textContent = `Reaksiyon süresi: ${reactionTime} ms. Görev tamamlandı.`;
      reactionReady = false;
      completeTask("task-reaction");
      return;
    }

    reactionBtn.disabled = true;
    reactionBtn.textContent = "Bekleyin...";
    reactionStatus.textContent = "Renk değişimini bekleyin.";

    setTimeout(() => {
      reactionReady = true;
      reactionBtn.disabled = false;
      reactionBtn.textContent = "Şimdi tıkla!";
      reactionStatus.textContent = "Butona hemen tıklayın!";
      reactionStartTime = Date.now();
    }, 1000 + Math.random() * 3000);
  });

  // ====================
  // SÜRÜGÜ HASSASİYETİ
  // ====================
  const sliderTargetEl = document.getElementById("sliderTarget");
  const sliderValueEl = document.getElementById("sliderValue");
  const sliderFeedback = document.getElementById("sliderFeedback");
  const precisionSlider = document.getElementById("precisionSlider");
  const sliderCountdownEl = document.getElementById("sliderCountdown");
  const startSliderGameBtn = document.getElementById("startSliderGame");
  let sliderCountdownInterval = null;
  let sliderChallengeTimeout = null;
  let sliderChallengeActive = false;
  let sliderPointerActive = false;
  let sliderDisablePending = false;
  let sliderAttempted = false;

  sliderTargetEl.textContent = sliderTarget;
  precisionSlider.value = "0";
  sliderValueEl.textContent = "0";

  precisionSlider.addEventListener("input", () => {
    sliderValueEl.textContent = precisionSlider.value;
  });

  function markSliderInteractionStart() {
    sliderPointerActive = true;
    sliderDisablePending = false;
  }

  precisionSlider.addEventListener("pointerdown", markSliderInteractionStart);
  precisionSlider.addEventListener("mousedown", markSliderInteractionStart);
  precisionSlider.addEventListener("touchstart", markSliderInteractionStart, { passive: true });

  const handleSliderPointerRelease = () => {
    if (!sliderPointerActive) return;
    sliderPointerActive = false;
    if (sliderDisablePending) {
      sliderDisablePending = false;
      precisionSlider.disabled = true;
    }
  };

  document.addEventListener("pointerup", handleSliderPointerRelease);
  document.addEventListener("pointercancel", handleSliderPointerRelease);
  document.addEventListener("mouseup", handleSliderPointerRelease);
  document.addEventListener("touchend", handleSliderPointerRelease, { passive: true });
  document.addEventListener("touchcancel", handleSliderPointerRelease, { passive: true });
  window.addEventListener("blur", handleSliderPointerRelease);

  function disableSliderSafely() {
    if (sliderPointerActive) {
      sliderDisablePending = true;
      return;
    }
    precisionSlider.disabled = true;
  }

  function resetSliderChallenge() {
    clearInterval(sliderCountdownInterval);
    clearTimeout(sliderChallengeTimeout);
    sliderCountdownInterval = null;
    sliderChallengeTimeout = null;
    sliderChallengeActive = false;
    precisionSlider.value = "0";
    sliderValueEl.textContent = "0";
    disableSliderSafely();
    if (!sliderAttempted) {
      startSliderGameBtn.disabled = false;
      startSliderGameBtn.textContent = "Denemeyi Başlat";
    }
    sliderCountdownEl.textContent = "Hazır mısın?";
    sliderFeedback.textContent = "";
  }

  function finishSliderChallenge() {
    if (!sliderChallengeActive) return;
    sliderChallengeActive = false;
    disableSliderSafely();
    clearInterval(sliderCountdownInterval);
    sliderCountdownEl.textContent = "Süre doldu!";
    const value = Number(precisionSlider.value);
    const diff = Math.abs(value - sliderTarget);
    metrics.slider.value = value;
    metrics.slider.diff = diff;
    sliderFeedback.textContent = `Süre sonunda değer ${value}. Hedefe uzaklık ${diff.toFixed(1)}.`;
    startSliderGameBtn.textContent = "Deneme tamamlandı";
    startSliderGameBtn.disabled = true;
    completeTask("task-slider");
  }

  startSliderGameBtn.addEventListener("click", () => {
    if (sliderAttempted) {
      sliderFeedback.textContent = "Bu görevi yalnızca bir kez yapabilirsiniz.";
      return;
    }
    resetSliderChallenge();
    sliderAttempted = true;
    sliderChallengeActive = true;
    precisionSlider.disabled = false;
    startSliderGameBtn.disabled = true;
    startSliderGameBtn.textContent = "Deneme devam ediyor...";
    let remaining = 2000;
    sliderCountdownEl.textContent = `${(remaining / 1000).toFixed(2)} saniye`;
    sliderCountdownInterval = setInterval(() => {
      remaining -= 50;
      if (remaining <= 0) {
        finishSliderChallenge();
        return;
      }
      sliderCountdownEl.textContent = `${(remaining / 1000).toFixed(2)} saniye`;
    }, 50);
    sliderChallengeTimeout = setTimeout(finishSliderChallenge, 2000);
  });

  resetSliderChallenge();

  // ====================
  // BİLGİ SORUSU
  // ====================
  const quizInput = document.getElementById("quizAnswer");
  const quizStatus = document.getElementById("quizStatus");
  const submitQuizBtn = document.getElementById("submitQuiz");
  const QUIZ_RESULT = 12 + 7 + 5;
  let quizSubmitted = false;

  submitQuizBtn.addEventListener("click", () => {
    if (quizSubmitted) return;
    const value = Number(quizInput.value);
    if (Number.isNaN(value)) {
      quizStatus.textContent = "Lütfen sayısal bir sonuç yazın.";
      return;
    }
    metrics.quizAnswer = {
      value,
      correct: value === QUIZ_RESULT
    };
    quizSubmitted = true;
    quizInput.disabled = true;
    submitQuizBtn.disabled = true;
    quizStatus.textContent =
      value === QUIZ_RESULT
        ? "Doğru! Bu değer açıkça sizin girdiğiniz veridir."
        : `Yanlış ama kaydedildi (doğru cevap ${QUIZ_RESULT}).`;
    completeTask("task-quiz");
  });

  // ====================
  // ANALİZ & SINIFLANDIRMA
  // ====================
  const outputEl = document.getElementById("output");
  const resultEl = document.getElementById("result");
  const classificationSection = document.getElementById("classification");
  const classificationList = document.getElementById("classificationList");
  const evaluateClassificationBtn = document.getElementById("evaluateClassification");
  const classificationFeedback = document.getElementById("classificationFeedback");
  const finishBtn = document.getElementById("finishBtn");
  let classificationItems = [];

  function renderClassification(items) {
    classificationList.innerHTML = "";
    items.forEach(item => {
      const block = document.createElement("div");
      block.className = "classification-item";
      block.dataset.itemId = item.id;
      block.innerHTML = `
        <div class="classification-top">
          <strong>${item.label}</strong>
          <p>${item.value}</p>
        </div>
        <div class="classification-options">
          <label>
            <input type="radio" name="${item.id}" value="digital">
            <span>Digital Exhaust</span>
          </label>
          <label>
            <input type="radio" name="${item.id}" value="explicit">
            <span>Açık Sonuç Verisi</span>
          </label>
        </div>
        <p class="explanation hidden">${item.info}</p>
      `;
      classificationList.appendChild(block);
    });
    classificationFeedback.textContent = "";
  }

  function showResults() {
    const typingTime = typingStart && typingEnd ? ((typingEnd - typingStart) / 1000).toFixed(2) : "—";
    const attentionDiff = stoppedTime ? Math.abs(10 - stoppedTime).toFixed(2) : "—";
    const reactionDisplay = metrics.reaction ? `${metrics.reaction} ms` : "—";
    const sliderDisplay =
      metrics.slider.diff !== null && metrics.slider.value !== null
        ? `${metrics.slider.value} (hedef ${sliderTarget}, fark ${metrics.slider.diff.toFixed(1)})`
        : "—";
    metrics.sessionDuration = ((Date.now() - passiveSignals.sessionStart) / 1000).toFixed(2);

    const output = `
=== CİHAZ & ORTAM ===
Platform: ${deviceData.platform}
Tarayıcı: ${deviceData.userAgent}
Dil: ${deviceData.language}
Saat Dilimi: ${deviceData.timezone}
Yerel Saat: ${deviceData.localTime}

Donanım:
- Ekran: ${deviceData.screenWidth} x ${deviceData.screenHeight}
- Görünür Alan: ${deviceData.viewportWidth} x ${deviceData.viewportHeight}
- DPR: ${deviceData.pixelRatio}
- CPU: ${deviceData.cpuCores}
- RAM: ${deviceData.memoryGB}
- Dokunmatik: ${deviceData.touchSupport ? "Evet" : "Hayır"}

  === GÖREV VERİLERİ ===
  Yazma: ${typingTime} sn, ${keystrokes.length} tuş, ${backspaces} silme
  10 sn Testi: ${stoppedTime ? stoppedTime.toFixed(2) + " sn" : "—"} (sapma ${attentionDiff} sn)
  Reaksiyon: ${reactionDisplay}
  Sürgü Hedefi: ${sliderDisplay}
  Bilgi Sorusu: ${
      metrics.quizAnswer
        ? `${metrics.quizAnswer.value} (${metrics.quizAnswer.correct ? "Doğru" : "Yanlış"})`
        : "—"
    }

=== PASİF İZLER ===
Oturum Süresi: ${metrics.sessionDuration} sn
Sekmeye Geri Dönüş: ${passiveSignals.focusReturns}
Kaydırma Olayı: ${passiveSignals.scrollEvents}

=== AÇIK PAYLAŞIMLAR ===
Bilgi Sorusu (Kullanıcı girişi): ${
      metrics.quizAnswer
        ? `${metrics.quizAnswer.value} (${metrics.quizAnswer.correct ? "Doğru" : "Yanlış"})`
        : "—"
    }

⚠️ Bu verilerden hangileri sisteme otomatik olarak aktarıldı?
`.trim();

    outputEl.textContent = output;
    resultEl.classList.remove("hidden");

    classificationItems = [
      {
        id: "device",
        label: "Cihaz & tarayıcı izleri",
        value: `${deviceData.platform} | ${deviceData.userAgent}`,
        type: "digital",
        info: "Bu bilgiler tarayıcı tarafından otomatik gönderilir; kullanıcı girişi gerekmez."
      },
      {
        id: "session",
        label: "Sayfada kalma süresi",
        value: `${metrics.sessionDuration} sn`,
        type: "digital",
        info: "Sistem oturum süresini arka planda hesaplar, kullanıcı fark etmeden toplanır."
      },
      {
        id: "focus",
        label: "Sekmeye dönüş sayısı",
        value: `${passiveSignals.focusReturns}`,
        type: "digital",
        info: "Tarayıcı sekmeye ne kadar döndüğünüzü otomatik izler."
      },
      {
        id: "typing",
        label: "Yazma davranışı",
        value: `${keystrokes.length} tuş, ${typingTime} sn, ${backspaces} silme`,
        type: "explicit",
        info: "Bu bilgiler yalnızca görevi tamamlamak için yazdığınız verilerden oluşur."
      },
      {
        id: "timer",
        label: "Zamanlama testi",
        value: stoppedTime ? `${stoppedTime.toFixed(2)} sn (sapma ${attentionDiff} sn)` : "—",
        type: "explicit",
        info: "Kronometre sonucu sizin bilinçli eyleminizin çıktısıdır."
      },
      {
        id: "reaction",
        label: "Reaksiyon süresi",
        value: reactionDisplay,
        type: "explicit",
        info: "Butona ne kadar hızlı bastığınız görevi sürdürme kararınıza dayanır."
      },
      {
        id: "slider",
        label: "Sürgü hedef farkı",
        value: sliderDisplay,
        type: "explicit",
        info: "Sürgü konumu kullanıcı olarak verdiğiniz bilinçli değerdir."
      },
      {
        id: "quiz",
        label: "Bilgi sorusu yanıtı",
        value: metrics.quizAnswer
          ? `${metrics.quizAnswer.value} (${metrics.quizAnswer.correct ? "doğru" : "yanlış"})`
          : "—",
        type: "explicit",
        info: "Bu sonuç tamamen sizin hesaplayıp yazdığınız veridir."
      }
    ];

    renderClassification(classificationItems);
    classificationSection.classList.remove("hidden");
  }

  finishBtn.addEventListener("click", () => {
    if (completedTasks.size !== REQUIRED_TASK_IDS.length) {
      outputEl.textContent = "Lütfen tüm görevleri tamamladıktan sonra analizi görüntüleyin.";
      resultEl.classList.remove("hidden");
      classificationSection.classList.add("hidden");
      return;
    }
    showResults();
  });

  evaluateClassificationBtn.addEventListener("click", () => {
    if (!classificationItems.length) return;

    let answeredAll = true;
    const selections = {};

    classificationItems.forEach(item => {
      const choice = document.querySelector(`input[name="${item.id}"]:checked`);
      selections[item.id] = choice;
      if (!choice) {
        answeredAll = false;
      }
    });

    if (!answeredAll) {
      classificationFeedback.textContent = "Lütfen her veri için bir seçim yapın.";
      return;
    }

    let correctCount = 0;

    classificationItems.forEach(item => {
      const block = classificationList.querySelector(`[data-item-id="${item.id}"]`);
      block.classList.remove("correct", "incorrect");
      const explanation = block.querySelector(".explanation");
      explanation?.classList.remove("hidden");
      const choice = selections[item.id];

      if (choice.value === item.type) {
        block.classList.add("correct");
        correctCount++;
      } else {
        block.classList.add("incorrect");
      }
    });

    classificationFeedback.textContent = `Doğru sınıflandırma: ${correctCount}/${classificationItems.length}. Digital exhaust otomatik izlerdir; sonuç verileri ise görev performansını yansıtır.`;
  });
});
