"use strict";

        const ids = [
      "userLevel",
      "userAcc",
      "userAvoid",
      "mobLevel",
      "mobAcc",
      "mobAvoid"
    ];

    const inputs = Object.fromEntries(
      ids.map((id) => [id, document.getElementById(id)])
    );

    const isThiefJob =
      document.getElementById("isThiefJob");

    const rangeInputs = {
      userLevel: document.getElementById("userLevelRange"),
      userAcc: document.getElementById("userAccRange"),
      userAvoid: document.getElementById("userAvoidRange"),
      mobLevel: document.getElementById("mobLevelRange"),
      mobAcc: document.getElementById("mobAccRange"),
      mobAvoid: document.getElementById("mobAvoidRange")
    };

    const activationDefaults = {
      userLevel: 180,
      userAcc: 180,
      userAvoid: 100,
      mobLevel: 180,
      mobAcc: 270,
      mobAvoid: 55
    };

    const activatedInputs = new Set();

    const monsterPresetSearch =
      document.getElementById("monsterPresetSearch");
    const monsterAutocomplete =
      document.getElementById("monsterAutocomplete");
    const mobileAutocompleteMedia =
      window.matchMedia("(max-width: 900px)");

    let mobileListTouchStartY = 0;
    let mobileListTouchMoved = false;
    let mobileListTouchButton = null;
    let suppressAutocompleteClickUntil = 0;

    const monsterPresetSelected =
      document.getElementById("monsterPresetSelected");
    const monsterPresetClear =
      document.getElementById("monsterPresetClear");

    const monsterDetailCard =
      document.getElementById("monsterDetailCard");
    const monsterDetailImage =
      document.getElementById("monsterDetailImage");
    const monsterDetailRegion =
      document.getElementById("monsterDetailRegion");
    const monsterDetailName =
      document.getElementById("monsterDetailName");
    const monsterDetailLevel =
      document.getElementById("monsterDetailLevel");

    const monsterBossBadge =
      document.getElementById("monsterBossBadge");

    const monsterManualBadge =
      document.getElementById("monsterManualBadge");

    const monsterManualOverlay =
      document.getElementById("monsterManualOverlay");

    const monsterDetailValues = {
      hp: document.getElementById("monsterDetailHp"),
      mp: document.getElementById("monsterDetailMp"),
      exp: document.getElementById("monsterDetailExp"),
      acc: document.getElementById("monsterDetailAcc"),
      avoid: document.getElementById("monsterDetailAvoid"),
      speed: document.getElementById("monsterDetailSpeed"),
      watt: document.getElementById("monsterDetailWatt"),
      matt: document.getElementById("monsterDetailMatt"),
      wdef: document.getElementById("monsterDetailWdef"),
      mdef: document.getElementById("monsterDetailMdef")
    };

    let applyingPreset = false;
    let selectedMonsterId = null;
    let autocompleteMatches = [];
    let activeAutocompleteIndex = -1;

    const resultGrid = document.getElementById("resultGrid");
    const emptyMessage = document.getElementById("emptyMessage");
    const errorMessage = document.getElementById("errorMessage");

    const physicalAvoidChange =
      document.getElementById("physicalAvoidChange");
    const physicalAvoidPerOne =
      document.getElementById("physicalAvoidPerOne");
    const physicalAvoidPerFive =
      document.getElementById("physicalAvoidPerFive");
    const physicalAvoidPerTen =
      document.getElementById("physicalAvoidPerTen");

    const magicAvoidChange =
      document.getElementById("magicAvoidChange");
    const magicAvoidPerOne =
      document.getElementById("magicAvoidPerOne");
    const magicAvoidPerFive =
      document.getElementById("magicAvoidPerFive");
    const magicAvoidPerTen =
      document.getElementById("magicAvoidPerTen");

    const avoidChartCard =
      document.getElementById("avoidChartCard");
    const avoidChartSummary =
      document.getElementById("avoidChartSummary");
    const avoidChart =
      document.getElementById("avoidChart");
    const avoidChartContext =
      avoidChart.getContext("2d");

    const avoidChartHoverLine =
      document.getElementById("avoidChartHoverLine");

    const avoidChartTooltip =
      document.getElementById("avoidChartTooltip");

    let avoidChartFrameId = 0;
    let pendingAvoidChartValues = null;
    let avoidChartInteractionState = null;

    const results = {
      requiredAcc: {
        item: document.getElementById("requiredAccItem"),
        value: document.getElementById("requiredAccValue"),
        penaltyRate: document.getElementById("requiredAccPenaltyRate"),
        penaltyTotal: document.getElementById("requiredAccPenaltyTotal")
      },
      hitChance: {
        item: document.getElementById("hitChanceItem"),
        value: document.getElementById("hitChanceValue")
      },
      physicalMiss: {
        item: document.getElementById("physicalMissItem"),
        singleWrap: document.getElementById("physicalSingleResult"),
        singleValue: document.getElementById("physicalMissValue")
      },
      magicMiss: {
        item: document.getElementById("magicMissItem"),
        singleWrap: document.getElementById("magicSingleResult"),
        singleValue: document.getElementById("magicMissValue")
      }
    };

    function getPresetLabel(monster) {
      return `Lv.${monster.level} ${monster.name}`;
    }

    const CHOSEONG = [
      "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ",
      "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ",
      "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
    ];

    function normalizeSearchText(value) {
      return value
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[·ㆍ._\-()[\]{}]/g, "");
    }

    function getChoseong(value) {
      let result = "";

      for (const character of value) {
        const code = character.charCodeAt(0);

        if (code >= 0xac00 && code <= 0xd7a3) {
          const choseongIndex =
            Math.floor((code - 0xac00) / 588);

          result += CHOSEONG[choseongIndex];
        } else if (CHOSEONG.includes(character)) {
          result += character;
        } else if (/[a-z0-9]/i.test(character)) {
          result += character.toLowerCase();
        }
      }

      return result;
    }

    function isSubsequence(query, target) {
      if (query === "") {
        return true;
      }

      let queryIndex = 0;

      for (const character of target) {
        if (character === query[queryIndex]) {
          queryIndex += 1;

          if (queryIndex === query.length) {
            return true;
          }
        }
      }

      return false;
    }

    function getMonsterMatchScore(monster, query) {
      const normalizedQuery = normalizeSearchText(query);

      if (normalizedQuery === "") {
        return null;
      }

      const normalizedName =
        normalizeSearchText(monster.name);
      const nameChoseong =
        getChoseong(normalizedName);
      const queryChoseong =
        getChoseong(normalizedQuery);

      if (normalizedName === normalizedQuery) {
        return 0;
      }

      if (normalizedName.startsWith(normalizedQuery)) {
        return 1;
      }

      if (normalizedName.includes(normalizedQuery)) {
        return 2;
      }

      if (
        queryChoseong !== "" &&
        nameChoseong.startsWith(queryChoseong)
      ) {
        return 3;
      }

      if (
        queryChoseong !== "" &&
        nameChoseong.includes(queryChoseong)
      ) {
        return 4;
      }

      if (isSubsequence(normalizedQuery, normalizedName)) {
        return 5;
      }

      if (
        queryChoseong !== "" &&
        isSubsequence(queryChoseong, nameChoseong)
      ) {
        return 6;
      }

      if (
        String(monster.id).includes(normalizedQuery) ||
        String(monster.level).includes(normalizedQuery)
      ) {
        return 7;
      }

      return null;
    }

    function findMonsterMatches(query) {
      return MONSTER_PRESETS
        .map((monster) => ({
          monster,
          score: getMonsterMatchScore(monster, query)
        }))
        .filter((item) => item.score !== null)
        .sort((a, b) => {
          return (
            a.score - b.score ||
            a.monster.level - b.monster.level ||
            a.monster.name.localeCompare(b.monster.name, "ko")
          );
        })
        .slice(0, 30)
        .map((item) => item.monster);
    }

    function getSelectedMonster() {
      if (selectedMonsterId === null) {
        return null;
      }

      return MONSTER_PRESETS.find(
        (monster) => monster.id === selectedMonsterId
      ) || null;
    }

    function updatePresetClearButton() {
      monsterPresetClear.classList.toggle(
        "hidden",
        monsterPresetSearch.value.trim() === ""
      );
    }

    function updateMobileMonsterListBounds() {
      if (
        !mobileAutocompleteMedia.matches ||
        monsterAutocomplete.classList.contains("hidden")
      ) {
        return;
      }

      const viewport = window.visualViewport;
      const viewportTop =
        viewport ? viewport.offsetTop : 0;
      const viewportHeight =
        viewport ? viewport.height : window.innerHeight;

      const searchRect =
        monsterPresetSearch.getBoundingClientRect();

      const keyboardLikelyOpen =
        viewport &&
        viewportHeight < window.innerHeight * 0.78;

      const top = keyboardLikelyOpen
        ? Math.max(viewportTop + 8, searchRect.bottom + 8)
        : Math.max(viewportTop + 10, searchRect.bottom + 8);

      const availableHeight =
        viewportTop + viewportHeight - top - 10;

      document.documentElement.style.setProperty(
        "--mobile-monster-list-top",
        `${Math.round(top)}px`
      );

      document.documentElement.style.setProperty(
        "--mobile-monster-list-height",
        `${Math.max(180, Math.round(availableHeight))}px`
      );
    }

    function addMobileMonsterListHeader() {
      if (!mobileAutocompleteMedia.matches) {
        return;
      }

      const existing =
        monsterAutocomplete.querySelector(
          ".mobile-monster-list-header"
        );

      if (existing) {
        return;
      }

      const header = document.createElement("div");
      header.className = "mobile-monster-list-header";

      const title = document.createElement("span");
      title.className = "mobile-monster-list-title";
      title.textContent = "몬스터 선택";

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "mobile-monster-list-close";
      closeButton.textContent = "닫기";

      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        monsterPresetSearch.blur();
        closeAutocomplete();
      });

      header.append(title, closeButton);
      monsterAutocomplete.prepend(header);
    }

    function closeAutocomplete() {
      monsterAutocomplete.classList.add("hidden");
      monsterPresetSearch.setAttribute("aria-expanded", "false");
      activeAutocompleteIndex = -1;
    }

    function updateActiveAutocompleteItem() {
      const items =
        monsterAutocomplete.querySelectorAll(".autocomplete-item");

      items.forEach((item, index) => {
        item.classList.toggle(
          "active",
          index === activeAutocompleteIndex
        );
      });

      if (
        activeAutocompleteIndex >= 0 &&
        items[activeAutocompleteIndex]
      ) {
        items[activeAutocompleteIndex].scrollIntoView({
          block: "nearest"
        });
      }
    }

    function createAutocompleteButton(monster, index, selected = false) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "autocomplete-item";
      button.setAttribute("role", "option");
      button.dataset.index = String(index);

      if (selected) {
        button.classList.add("selected");
        button.setAttribute("aria-selected", "true");
      }

      const thumbnailWrap = document.createElement("span");
      thumbnailWrap.className = "autocomplete-thumb-wrap";

      const thumbnail = document.createElement("img");
      thumbnail.className = "autocomplete-thumb";
      thumbnail.src = `images/mob/${monster.id}.png`;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";

      thumbnail.addEventListener("error", () => {
        thumbnail.classList.add("is-missing");
      });

      thumbnailWrap.appendChild(thumbnail);

      const main = document.createElement("span");
      main.className = "autocomplete-item-main";

      const nameWrap = document.createElement("span");
      nameWrap.className = "autocomplete-name-wrap";

      const name = document.createElement("span");
      name.className = "autocomplete-name";
      name.textContent = monster.name;
      name.title = monster.name;

      nameWrap.appendChild(name);

      if (Number(monster.boss) === 1) {
        const bossBadge = document.createElement("span");
        bossBadge.className = "autocomplete-boss-badge";
        bossBadge.textContent = "BOSS";
        nameWrap.appendChild(bossBadge);
      }

      const level = document.createElement("span");
      level.className = "autocomplete-level";
      level.textContent = `Lv.${monster.level}`;

      main.append(nameWrap, level);
      button.append(thumbnailWrap, main);

      button.addEventListener("mousedown", (event) => {
        if (
          !mobileAutocompleteMedia.matches &&
          event.button === 0
        ) {
          event.preventDefault();
          selectMonsterPreset(monster);
        }
      });

      button.addEventListener("click", (event) => {
        if (
          mobileAutocompleteMedia.matches ||
          Date.now() < suppressAutocompleteClickUntil
        ) {
          event.preventDefault();
          return;
        }

        selectMonsterPreset(monster);
      });

      return button;
    }

    function renderAutocomplete(query, options = {}) {
      const normalizedQuery = query.trim();
      const selectedMonster = getSelectedMonster();
      const showFullList =
        options.showFullList === true ||
        (
          selectedMonster !== null &&
          normalizedQuery === selectedMonster.name
        );

      if (showFullList) {
        autocompleteMatches = [...MONSTER_PRESETS];
      } else {
        autocompleteMatches =
          normalizedQuery === ""
            ? [...MONSTER_PRESETS]
            : findMonsterMatches(normalizedQuery);
      }

      activeAutocompleteIndex = -1;
      monsterAutocomplete.innerHTML = "";

      if (autocompleteMatches.length === 0) {
        closeAutocomplete();
        return;
      }

      if (showFullList && selectedMonster) {
        monsterAutocomplete.appendChild(
          createAutocompleteButton(
            selectedMonster,
            -1,
            true
          )
        );

        const separator = document.createElement("div");
        separator.className = "autocomplete-separator";
        separator.setAttribute("aria-hidden", "true");
        monsterAutocomplete.appendChild(separator);
      }

      autocompleteMatches.forEach((monster, index) => {
        monsterAutocomplete.appendChild(
          createAutocompleteButton(monster, index)
        );
      });

      monsterAutocomplete.classList.remove("hidden");
      monsterPresetSearch.setAttribute("aria-expanded", "true");

      if (mobileAutocompleteMedia.matches) {
        addMobileMonsterListHeader();

        window.requestAnimationFrame(
          updateMobileMonsterListBounds
        );
      }
    }

    function formatMonsterNumber(value) {
      return Number.isFinite(value)
        ? value.toLocaleString("ko-KR")
        : "-";
    }

    function showMonsterDetail(monster) {
      monsterDetailImage.src = `images/mob/${monster.id}.png`;
      monsterDetailImage.alt = `${monster.name} 이미지`;
      monsterDetailRegion.textContent = monster.region || "";
      monsterDetailName.textContent = monster.name;
      monsterDetailLevel.textContent = `Lv.${monster.level}`;

      monsterBossBadge.classList.toggle(
        "hidden",
        Number(monster.boss) !== 1
      );

      monsterManualBadge.classList.add("hidden");
      monsterManualOverlay.classList.add("hidden");
      monsterDetailCard.classList.remove("is-manual");

      Object.entries(monsterDetailValues).forEach(([key, element]) => {
        element.textContent = formatMonsterNumber(monster[key]);
      });

      monsterDetailCard.classList.remove("hidden");
    }

    function hideMonsterDetail() {
      monsterDetailCard.classList.add("hidden");
      monsterDetailImage.removeAttribute("src");
      monsterDetailImage.alt = "";
      monsterBossBadge.classList.add("hidden");
      monsterManualBadge.classList.add("hidden");
      monsterManualOverlay.classList.add("hidden");
      monsterDetailCard.classList.remove("is-manual");
    }

    function selectMonsterPreset(monster) {
      applyingPreset = true;
      selectedMonsterId = monster.id;

      monsterPresetSearch.value = monster.name;
      ["mobLevel", "mobAcc", "mobAvoid"].forEach(
        (id) => setInputWaitingState(id, false)
      );

      inputs.mobLevel.value = String(monster.level);
      inputs.mobAcc.value = String(monster.acc);
      inputs.mobAvoid.value = String(monster.avoid);

      rangeInputs.mobLevel.value = String(
        clamp(monster.level, 1, 200)
      );

      rangeInputs.mobAcc.value = String(
        clamp(monster.acc, 1, 500)
      );

      rangeInputs.mobAvoid.value = String(
        clamp(monster.avoid, 1, 500)
      );

      monsterPresetSelected.textContent =
        `${getPresetLabel(monster)} 선택됨`;
      monsterPresetSelected.classList.remove("hidden");
      showMonsterDetail(monster);

      applyingPreset = false;
      updatePresetClearButton();
      closeAutocomplete();
      calculate();

      window.requestAnimationFrame(() => {
        monsterPresetSearch.blur();
      });
    }

    function markPresetAsCustom(options = {}) {
      const {
        preserveDetail = false,
        clearSearch = false
      } = options;

      if (applyingPreset || selectedMonsterId === null) {
        updatePresetClearButton();
        return;
      }

      selectedMonsterId = null;
      monsterPresetSelected.textContent = "";
      monsterPresetSelected.classList.add("hidden");

      if (clearSearch) {
        monsterPresetSearch.value = "";
      }

      if (preserveDetail) {
        monsterManualBadge.classList.add("hidden");
        monsterManualOverlay.classList.remove("hidden");
        monsterDetailCard.classList.add("is-manual");
      } else {
        hideMonsterDetail();
      }

      updatePresetClearButton();
    }

    function sanitizeAndClampInput(input) {
      const digitsOnly = input.value.replace(/\D/g, "");

      if (digitsOnly === "") {
        input.value = "";
        return;
      }

      const min = Number(input.dataset.min);
      const max = Number(input.dataset.max);
      let value = Number(digitsOnly);

      if (value < min) {
        value = min;
      } else if (value > max) {
        value = max;
      }

      input.value = String(value);
    }

    function setInputWaitingState(id, waiting) {
      const input = inputs[id];
      const range = rangeInputs[id];
      const control = input.closest(".user-number-control");

      if (waiting) {
        activatedInputs.delete(id);
        input.value = "";
        range.disabled = true;
        control.classList.add("is-waiting");
      } else {
        activatedInputs.add(id);
        range.disabled = false;
        control.classList.remove("is-waiting");
      }
    }

    function activateInput(id, source = "text") {
      if (activatedInputs.has(id)) {
        return;
      }

      const input = inputs[id];
      const range = rangeInputs[id];
      const initialValue = activationDefaults[id];

      setInputWaitingState(id, false);

      const rangeValue = clamp(
        initialValue,
        Number(range.min),
        Number(range.max)
      );

      range.value = String(rangeValue);
      input.value = String(
        source === "range"
          ? rangeValue
          : initialValue
      );

      calculate();
    }

    function resetAllInputStates() {
      ids.forEach((id) => {
        setInputWaitingState(id, true);
      });
    }

    function syncRangeFromText(id) {
      const range = rangeInputs[id];

      if (!range) {
        return;
      }

      const value = readNumber(inputs[id]);

      if (value === null) {
        return;
      }

      if (!activatedInputs.has(id)) {
        setInputWaitingState(id, false);
      }

      const rangeMin = Number(range.min);
      const rangeMax = Number(range.max);

      range.value = String(
        clamp(value, rangeMin, rangeMax)
      );
    }

    function syncTextFromRange(id) {
      const range = rangeInputs[id];

      if (!range) {
        return;
      }

      inputs[id].value = range.value;
    }

    function readNumber(input) {
      const raw = input.value.trim();

      if (raw === "") {
        return null;
      }

      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function clampProbability(value) {
      if (!Number.isFinite(value)) {
        return null;
      }

      return clamp(value, 0, 1);
    }

    function getPhysicalLimits() {
      return isThiefJob.checked
        ? { min: 0.05, max: 0.95 }
        : { min: 0.02, max: 0.80 };
    }

    function clampPhysicalProbability(value) {
      if (!Number.isFinite(value)) {
        return null;
      }

      const limits = getPhysicalLimits();
      return clamp(value, limits.min, limits.max);
    }

    function formatPercent(value) {
      return `${(value * 100).toFixed(2)}%`;
    }

    function formatPercentagePoint(value) {
      const percentagePoint =
        Math.round(value * 100000) / 1000;

      const sign =
        percentagePoint > 0 ? "+" : "";

      const compactValue =
        Number(
          percentagePoint.toFixed(3)
        );

      return `${sign}${compactValue}%`;
    }

    function getPhysicalMissProbability(
      userAvoid,
      levelDiff,
      mobAcc
    ) {
      const effectiveAvoid =
        userAvoid - levelDiff / 2;

      return effectiveAvoid /
        (4.5 * mobAcc);
    }

    function getMagicMissProbability(
      userAvoid,
      levelDiff,
      mobAcc
    ) {
      const effectiveAvoid =
        userAvoid - levelDiff / 2;

      if (effectiveAvoid <= 0) {
        return 0;
      }

      return (
        10 / 9 -
        mobAcc / (0.9 * effectiveAvoid)
      );
    }

    function showAvoidChangeDetails(
      userAvoid,
      levelDiff,
      mobAcc
    ) {
      const currentPhysical =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            userAvoid, levelDiff, mobAcc
          )
        );

      const physicalPlusOne =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            userAvoid + 1, levelDiff, mobAcc
          )
        );

      const physicalPlusFive =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            userAvoid + 5, levelDiff, mobAcc
          )
        );

      const physicalPlusTen =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            userAvoid + 10, levelDiff, mobAcc
          )
        );

      physicalAvoidPerOne.innerHTML =
        `회피율 1 증가 시 <strong>${formatPercentagePoint(physicalPlusOne - currentPhysical)}</strong>`;
      physicalAvoidPerFive.innerHTML =
        `회피율 5 증가 시 <strong>${formatPercentagePoint(physicalPlusFive - currentPhysical)}</strong>`;
      physicalAvoidPerTen.innerHTML =
        `회피율 10 증가 시 <strong>${formatPercentagePoint(physicalPlusTen - currentPhysical)}</strong>`;
      physicalAvoidChange.classList.remove("hidden");

      const currentMagic = clampProbability(
        getMagicMissProbability(userAvoid, levelDiff, mobAcc)
      );
      const magicPlusOne = clampProbability(
        getMagicMissProbability(userAvoid + 1, levelDiff, mobAcc)
      );
      const magicPlusFive = clampProbability(
        getMagicMissProbability(userAvoid + 5, levelDiff, mobAcc)
      );
      const magicPlusTen = clampProbability(
        getMagicMissProbability(userAvoid + 10, levelDiff, mobAcc)
      );

      magicAvoidPerOne.innerHTML =
        `회피율 1 증가 시 <strong>${formatPercentagePoint(magicPlusOne - currentMagic)}</strong>`;
      magicAvoidPerFive.innerHTML =
        `회피율 5 증가 시 <strong>${formatPercentagePoint(magicPlusFive - currentMagic)}</strong>`;
      magicAvoidPerTen.innerHTML =
        `회피율 10 증가 시 <strong>${formatPercentagePoint(magicPlusTen - currentMagic)}</strong>`;
      magicAvoidChange.classList.remove("hidden");
    }

    function prepareCanvas(canvas, context) {
      const ratio =
        Math.min(window.devicePixelRatio || 1, 2);

      const rect =
        canvas.getBoundingClientRect();

      const width =
        Math.max(1, Math.round(rect.width));
      const height =
        Math.max(1, Math.round(rect.height));

      canvas.width =
        Math.round(width * ratio);
      canvas.height =
        Math.round(height * ratio);

      context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
      );

      return {
        width,
        height
      };
    }

    function scheduleAvoidChart(
      userAvoid,
      levelDiff,
      mobAcc
    ) {
      pendingAvoidChartValues = {
        userAvoid,
        levelDiff,
        mobAcc
      };

      /*
       * display:none 상태에서는 canvas 크기가 0으로 측정됩니다.
       * 먼저 카드를 표시하고 다음 화면 프레임에서 그립니다.
       */
      avoidChartCard.classList.remove("hidden");

      if (avoidChartFrameId) {
        window.cancelAnimationFrame(
          avoidChartFrameId
        );
      }

      avoidChartFrameId =
        window.requestAnimationFrame(() => {
          avoidChartFrameId = 0;

          if (!pendingAvoidChartValues) {
            return;
          }

          const values =
            pendingAvoidChartValues;

          pendingAvoidChartValues = null;

          drawAvoidChart(
            values.userAvoid,
            values.levelDiff,
            values.mobAcc
          );
        });
    }

    function hideAvoidChartTooltip() {
      avoidChartHoverLine.classList.add("hidden");
      avoidChartTooltip.classList.add("hidden");
    }

    function formatHoverPercentage(probability) {
      if (!Number.isFinite(probability)) {
        return "-";
      }

      return `${(
        clampProbability(probability) * 100
      ).toFixed(2)}%`;
    }

    function updateAvoidChartTooltip(event) {
      const state =
        avoidChartInteractionState;

      if (!state) {
        hideAvoidChartTooltip();
        return;
      }

      const rect =
        avoidChart.getBoundingClientRect();

      const pointerX =
        event.clientX - rect.left;

      const plotLeft =
        state.padding.left;

      const plotRight =
        state.width - state.padding.right;

      if (
        pointerX < plotLeft ||
        pointerX > plotRight
      ) {
        if (
          event.pointerType === "mouse" ||
          !window.matchMedia(
            "(max-width: 900px)"
          ).matches
        ) {
          hideAvoidChartTooltip();
        }

        return;
      }

      const ratio =
        (pointerX - plotLeft) /
        state.plotWidth;

      const roundedAvoid =
        Math.max(
          state.minimumAvoid,
          Math.min(
            state.maximumAvoid,
            Math.round(
              state.minimumAvoid +
              ratio *
                (
                  state.maximumAvoid -
                  state.minimumAvoid
                )
            )
          )
        );

      const lineX =
        state.toX(roundedAvoid);

      const physical =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            roundedAvoid,
            state.levelDiff,
            state.mobAcc
          )
        );

      const magic =
        getMagicMissProbability(
          roundedAvoid,
          state.levelDiff,
          state.mobAcc
        );

      const canvasOffsetLeft =
        avoidChart.offsetLeft;

      const canvasOffsetTop =
        avoidChart.offsetTop;

      avoidChartHoverLine.style.left =
        `${canvasOffsetLeft + lineX}px`;

      avoidChartHoverLine.classList.remove(
        "hidden"
      );

      avoidChartTooltip.innerHTML =
        `<div class="chart-tooltip-title">회피율 ${roundedAvoid}</div>` +
        `<div class="chart-tooltip-row">` +
          `<span class="chart-tooltip-label">물리공격 회피</span>` +
          `<strong class="chart-tooltip-physical">${formatHoverPercentage(physical)}</strong>` +
        `</div>` +
        `<div class="chart-tooltip-row">` +
          `<span class="chart-tooltip-label">마법공격 회피</span>` +
          `<strong class="chart-tooltip-magic">${formatHoverPercentage(magic)}</strong>` +
        `</div>`;

      avoidChartTooltip.classList.remove(
        "hidden"
      );

      const tooltipWidth =
        avoidChartTooltip.offsetWidth;

      const tooltipHeight =
        avoidChartTooltip.offsetHeight;

      let tooltipX =
        lineX + 13;

      if (
        tooltipX + tooltipWidth >
        rect.width - 8
      ) {
        tooltipX =
          lineX - tooltipWidth - 13;
      }

      const pointerY =
        event.clientY - rect.top;

      const tooltipY =
        Math.max(
          8,
          Math.min(
            rect.height - tooltipHeight - 8,
            pointerY - tooltipHeight / 2
          )
        );

      avoidChartTooltip.style.left =
        `${canvasOffsetLeft + tooltipX}px`;

      avoidChartTooltip.style.top =
        `${canvasOffsetTop + tooltipY}px`;
    }

    function drawAvoidChart(
      userAvoid,
      levelDiff,
      mobAcc
    ) {
      const { width, height } =
        prepareCanvas(
          avoidChart,
          avoidChartContext
        );

      const context =
        avoidChartContext;

      if (width <= 1 || height <= 1) {
        scheduleAvoidChart(
          userAvoid,
          levelDiff,
          mobAcc
        );
        return;
      }

      const styles =
        getComputedStyle(document.documentElement);

      const gridColor =
        styles.getPropertyValue("--line").trim() ||
        "#343b49";

      const textColor =
        styles.getPropertyValue("--muted").trim() ||
        "#9198a7";

      const physicalColor = "#72b7ff";
      const magicColor = "#d697ff";
      const currentColor = "#ffd477";
      const physicalLimitColor = "#7ee2a8";
      const physicalLimits = getPhysicalLimits();

      context.clearRect(
        0,
        0,
        width,
        height
      );

      const padding = {
        left: 54,
        right: 20,
        top: 20,
        bottom: 42
      };

      const plotWidth =
        width - padding.left - padding.right;
      const plotHeight =
        height - padding.top - padding.bottom;

      const minimumAvoid =
        Math.max(
          1,
          Math.floor(userAvoid - 100)
        );

      const maximumAvoid =
        Math.min(
          1000,
          Math.max(
            minimumAvoid + 20,
            Math.ceil(userAvoid + 100)
          )
        );

      const toX = (avoid) =>
        padding.left +
        (
          (avoid - minimumAvoid) /
          (maximumAvoid - minimumAvoid)
        ) * plotWidth;

      const toY = (probability) =>
        padding.top +
        (
          1 -
          clampProbability(probability)
        ) * plotHeight;

      context.font =
        "12px system-ui, sans-serif";
      context.textAlign = "right";
      context.textBaseline = "middle";

      for (let index = 0; index <= 5; index += 1) {
        const probability =
          index / 5;

        const y =
          padding.top +
          (1 - probability) * plotHeight;

        context.strokeStyle =
          gridColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(
          padding.left,
          y
        );
        context.lineTo(
          width - padding.right,
          y
        );
        context.stroke();

        context.fillStyle =
          textColor;
        context.fillText(
          `${Math.round(probability * 100)}%`,
          padding.left - 9,
          y
        );
      }

      context.textAlign = "center";
      context.textBaseline = "top";

      const xTickCount =
        width < 560 ? 4 : 5;

      for (
        let index = 0;
        index <= xTickCount;
        index += 1
      ) {
        const ratio =
          index / xTickCount;

        const avoid =
          Math.round(
            minimumAvoid +
            ratio *
              (maximumAvoid - minimumAvoid)
          );

        const x = toX(avoid);

        context.strokeStyle =
          gridColor;
        context.beginPath();
        context.moveTo(
          x,
          padding.top
        );
        context.lineTo(
          x,
          height - padding.bottom
        );
        context.stroke();

        context.fillStyle =
          textColor;
        context.fillText(
          String(avoid),
          x,
          height - padding.bottom + 10
        );
      }

      function drawLimitLine(
        probability,
        color,
        dash
      ) {
        const y =
          toY(probability);

        context.save();
        context.strokeStyle = color;
        context.lineWidth = 1.25;
        context.setLineDash(dash);
        context.beginPath();
        context.moveTo(
          padding.left,
          y
        );
        context.lineTo(
          width - padding.right,
          y
        );
        context.stroke();
        context.restore();
      }

      drawLimitLine(
        physicalLimits.max,
        physicalLimitColor,
        [8, 5]
      );

      drawLimitLine(
        physicalLimits.min,
        physicalLimitColor,
        [8, 5]
      );

      function drawLine(
        probabilityFunction,
        color
      ) {
        context.strokeStyle = color;
        context.lineWidth = 2.5;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();

        let started = false;

        for (
          let pixel = 0;
          pixel <= plotWidth;
          pixel += 3
        ) {
          const avoid =
            minimumAvoid +
            (
              pixel / plotWidth
            ) *
              (
                maximumAvoid -
                minimumAvoid
              );

          const probability =
            probabilityFunction(avoid);

          const x =
            padding.left + pixel;
          const y =
            toY(probability);

          if (!started) {
            context.moveTo(x, y);
            started = true;
          } else {
            context.lineTo(x, y);
          }
        }

        context.stroke();
      }

      drawLine(
        (avoid) =>
          clampPhysicalProbability(
            getPhysicalMissProbability(
              avoid,
              levelDiff,
              mobAcc
            )
          ),
        physicalColor
      );

      drawLine(
        (avoid) =>
          getMagicMissProbability(
            avoid,
            levelDiff,
            mobAcc
          ),
        magicColor
      );

      const currentX =
        toX(userAvoid);

      context.strokeStyle =
        currentColor;
      context.lineWidth = 1.5;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(
        currentX,
        padding.top
      );
      context.lineTo(
        currentX,
        height - padding.bottom
      );
      context.stroke();
      context.setLineDash([]);

      const currentPhysical =
        clampPhysicalProbability(
          getPhysicalMissProbability(
            userAvoid,
            levelDiff,
            mobAcc
          )
        );

      const currentMagic =
        clampProbability(
          getMagicMissProbability(
            userAvoid,
            levelDiff,
            mobAcc
          )
        );

      for (
        const [probability, color] of
        [
          [currentPhysical, physicalColor],
          [currentMagic, magicColor]
        ]
      ) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(
          currentX,
          toY(probability),
          4.5,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      context.fillStyle =
        textColor;
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(
        "나의 회피율",
        padding.left +
          plotWidth / 2,
        height - 4
      );

      avoidChartSummary.textContent =
        `몬스터 명중률 ${mobAcc}, 레벨 차이 ${levelDiff}, 현재 회피율 ${userAvoid} 기준`;

      avoidChartInteractionState = {
        width,
        height,
        padding,
        plotWidth,
        plotHeight,
        minimumAvoid,
        maximumAvoid,
        levelDiff,
        mobAcc,
        toX,
        toY
      };

    }

    function hideResults() {
      results.requiredAcc.item.classList.add("hidden");
      results.requiredAcc.penaltyRate.classList.add("hidden");
      results.requiredAcc.penaltyRate.textContent = "";
      results.requiredAcc.penaltyTotal.classList.add("hidden");
      results.requiredAcc.penaltyTotal.textContent = "";
      results.hitChance.item.classList.add("hidden");
      results.physicalMiss.item.classList.add("hidden");
      results.magicMiss.item.classList.add("hidden");

      physicalAvoidChange.classList.add("hidden");
      magicAvoidChange.classList.add("hidden");

      pendingAvoidChartValues = null;
      avoidChartInteractionState = null;
      hideAvoidChartTooltip();

      if (avoidChartFrameId) {
        window.cancelAnimationFrame(
          avoidChartFrameId
        );
        avoidChartFrameId = 0;
      }

      avoidChartCard.classList.add("hidden");
    }

    function showSimpleResult(key, text, probability = null) {
      const target = results[key];

      target.item.classList.remove("hidden");
      target.value.textContent = text;
      target.value.classList.remove("good", "warn");

      if (probability !== null) {
        if (probability >= 1) {
          target.value.classList.add("good");
        } else if (probability <= 0.1) {
          target.value.classList.add("warn");
        }
      }
    }

    function showPhysicalAvoidResult(rawProbability) {
      const target = results.physicalMiss;
      const probability =
        clampPhysicalProbability(rawProbability);

      target.item.classList.remove("hidden");
      target.singleWrap.classList.remove("hidden");
      target.singleValue.textContent =
        formatPercent(probability);
      target.singleValue.classList.remove("good", "warn");

      if (probability <= 0.1) {
        target.singleValue.classList.add("warn");
      }
    }

    function showMagicAvoidResult(rawProbability) {
      const target = results.magicMiss;

      /*
       * 마법 회피에는 도적/타직업 상·하한를 적용하지 않습니다.
       * 확률 UI의 표시 범위만 0%~100%로 정규화합니다.
       */
      const normalized =
        clampProbability(rawProbability);

      target.item.classList.remove("hidden");
      target.singleWrap.classList.remove("hidden");

      target.singleValue.textContent =
        formatPercent(normalized);

      target.singleValue.classList.remove(
        "good",
        "warn"
      );

      if (normalized <= 0.1) {
        target.singleValue.classList.add("warn");
      }
    }

    function calculate() {
      hideResults();
      errorMessage.classList.add("hidden");
      errorMessage.textContent = "";

      const userLevel = readNumber(inputs.userLevel);
      const userAcc = readNumber(inputs.userAcc);
      const userAvoid = readNumber(inputs.userAvoid);
      const mobLevel = readNumber(inputs.mobLevel);
      const mobAcc = readNumber(inputs.mobAcc);
      const mobAvoid = readNumber(inputs.mobAvoid);

      const allInputsReady =
        ids.every((id) => activatedInputs.has(id)) &&
        [
          userLevel,
          userAcc,
          userAvoid,
          mobLevel,
          mobAcc,
          mobAvoid
        ].every((value) => value !== null);

      if (!allInputsReady) {
        return;
      }

      let visibleCount = 0;
      let levelDiff = null;

      if (userLevel !== null && mobLevel !== null) {
        levelDiff = Math.max(mobLevel - userLevel, 0);
      }

      /*
       * 유저 레벨이 비어 있고 몬스터 회피율만 입력된 경우에는
       * 동레벨(levelDiff = 0) 기준 필요 명중률을 보여줍니다.
       */
      if (mobAvoid !== null) {
        const requiredLevelDiff = levelDiff ?? 0;
        const requiredAcc =
          ((51 + 2 * requiredLevelDiff) * mobAvoid) / 14;

        const requiredAccRounded = Math.ceil(requiredAcc);

        showSimpleResult(
          "requiredAcc",
          requiredAccRounded.toString(),
          1
        );

        if (levelDiff !== null && levelDiff > 0) {
          const baseRequiredAcc =
            (51 * mobAvoid) / 14;

          const baseRequiredAccRounded =
            Math.ceil(baseRequiredAcc);

          const additionalRequiredAcc =
            requiredAccRounded - baseRequiredAccRounded;

          const penaltyPerLevel =
            (2 * mobAvoid) / 14;

          results.requiredAcc.penaltyRate.textContent =
            `레벨 차이 명중률 패널티 적용 (1레벨 차이 ≈ ${penaltyPerLevel.toFixed(1)} 명중률)`;

          results.requiredAcc.penaltyTotal.textContent =
            `필요 명중률 ${baseRequiredAccRounded} + 패널티 ${additionalRequiredAcc}`;

          results.requiredAcc.penaltyRate.classList.remove("hidden");
          results.requiredAcc.penaltyTotal.classList.remove("hidden");
        }

        visibleCount += 1;
      }

      if (
        levelDiff !== null &&
        userAcc !== null &&
        mobAvoid !== null
      ) {
        const rawHitChance =
          (28 * userAcc) /
            ((51 + 2 * levelDiff) * mobAvoid) -
          1;

        const hitChance = clampProbability(rawHitChance);

        showSimpleResult(
          "hitChance",
          formatPercent(hitChance),
          hitChance
        );

        visibleCount += 1;
      }

      if (
        levelDiff !== null &&
        userAvoid !== null &&
        mobAcc !== null
      ) {
        const rawPhysicalMiss =
          getPhysicalMissProbability(
            userAvoid,
            levelDiff,
            mobAcc
          );

        showPhysicalAvoidResult(
          rawPhysicalMiss
        );

        const rawMagicMiss =
          getMagicMissProbability(
            userAvoid,
            levelDiff,
            mobAcc
          );

        showMagicAvoidResult(
          rawMagicMiss
        );

        showAvoidChangeDetails(
          userAvoid,
          levelDiff,
          mobAcc
        );

        scheduleAvoidChart(
          userAvoid,
          levelDiff,
          mobAcc
        );

        visibleCount += 2;
      }

      if (visibleCount > 0) {
        resultGrid.classList.remove("hidden");
        emptyMessage.classList.add("hidden");
      } else {
        resultGrid.classList.add("hidden");
        emptyMessage.classList.remove("hidden");
      }
    }

    ids.forEach((id) => {
      inputs[id].addEventListener("pointerdown", () => {
        if (!activatedInputs.has(id)) {
          activateInput(id, "text");
        }
      });

      inputs[id].addEventListener("focus", () => {
        if (!activatedInputs.has(id)) {
          activateInput(id, "text");
        }
      });

      inputs[id].addEventListener("input", (event) => {
        sanitizeAndClampInput(event.currentTarget);
        syncRangeFromText(id);

        if (["mobLevel", "mobAcc", "mobAvoid"].includes(id)) {
          markPresetAsCustom({
            preserveDetail: true,
            clearSearch: true
          });
        }

        calculate();
      });

      inputs[id].addEventListener("blur", (event) => {
        sanitizeAndClampInput(event.currentTarget);
        syncRangeFromText(id);
        calculate();
      });
    });

    Object.entries(rangeInputs).forEach(
      ([id, range]) => {
        const control = range.closest(".user-number-control");

        control.addEventListener("pointerdown", (event) => {
          if (
            activatedInputs.has(id) ||
            event.target === inputs[id]
          ) {
            return;
          }

          activateInput(id, "range");
        });

        range.addEventListener("input", () => {
          syncTextFromRange(id);

          if (["mobLevel", "mobAcc", "mobAvoid"].includes(id)) {
          markPresetAsCustom({
            preserveDetail: true,
            clearSearch: true
          });
        }

          calculate();
        });
      }
    );

    isThiefJob.addEventListener("change", calculate);
    updatePresetClearButton();

    monsterPresetSearch.addEventListener("input", () => {
      markPresetAsCustom({
        preserveDetail: false,
        clearSearch: false
      });
      updatePresetClearButton();
      renderAutocomplete(monsterPresetSearch.value);
    });

    monsterPresetSearch.addEventListener("focus", () => {
      const selectedMonster = getSelectedMonster();

      renderAutocomplete(
        monsterPresetSearch.value,
        {
          showFullList:
            selectedMonster !== null &&
            monsterPresetSearch.value === selectedMonster.name
        }
      );
    });

    monsterPresetSearch.addEventListener("click", () => {
      const selectedMonster = getSelectedMonster();

      if (
        selectedMonster !== null &&
        monsterPresetSearch.value === selectedMonster.name
      ) {
        renderAutocomplete("", { showFullList: true });
      }
    });

    monsterPresetSearch.addEventListener("keydown", (event) => {
      if (monsterAutocomplete.classList.contains("hidden")) {
        if (event.key === "ArrowDown") {
          renderAutocomplete(monsterPresetSearch.value);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        activeAutocompleteIndex =
          Math.min(
            activeAutocompleteIndex + 1,
            autocompleteMatches.length - 1
          );

        updateActiveAutocompleteItem();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();

        activeAutocompleteIndex =
          Math.max(activeAutocompleteIndex - 1, 0);

        updateActiveAutocompleteItem();
      } else if (event.key === "Enter") {
        if (
          activeAutocompleteIndex >= 0 &&
          autocompleteMatches[activeAutocompleteIndex]
        ) {
          event.preventDefault();
          selectMonsterPreset(
            autocompleteMatches[activeAutocompleteIndex]
          );
        }
      } else if (event.key === "Escape") {
        closeAutocomplete();
      }
    });

    monsterPresetClear.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    monsterPresetClear.addEventListener("click", () => {
      monsterPresetSearch.value = "";
      selectedMonsterId = null;
      monsterPresetSelected.textContent = "";
      monsterPresetSelected.classList.add("hidden");
      hideMonsterDetail();
      updatePresetClearButton();

      monsterPresetSearch.focus();
      renderAutocomplete("", { showFullList: true });
    });

    monsterPresetSearch.addEventListener("blur", () => {
      if (
        mobileAutocompleteMedia.matches &&
        !monsterAutocomplete.classList.contains("hidden")
      ) {
        window.setTimeout(
          updateMobileMonsterListBounds,
          180
        );
        return;
      }

      window.setTimeout(closeAutocomplete, 120);
    });

    monsterAutocomplete.addEventListener(
      "touchstart",
      (event) => {
        if (!mobileAutocompleteMedia.matches) {
          return;
        }

        const touch = event.touches[0];

        mobileListTouchStartY =
          touch ? touch.clientY : 0;

        mobileListTouchMoved = false;
        mobileListTouchButton =
          event.target.closest(".autocomplete-item");

        /*
         * iOS often consumes the first tap only to dismiss the keyboard.
         * Blur immediately at touch start, then select explicitly on
         * touch end when this was a tap rather than a scroll.
         */
        if (
          document.activeElement === monsterPresetSearch
        ) {
          monsterPresetSearch.blur();

          window.setTimeout(
            updateMobileMonsterListBounds,
            180
          );
        }
      },
      { passive: true }
    );

    monsterAutocomplete.addEventListener(
      "touchmove",
      (event) => {
        if (!mobileAutocompleteMedia.matches) {
          return;
        }

        const touch = event.touches[0];

        if (!touch) {
          return;
        }

        if (
          Math.abs(
            touch.clientY - mobileListTouchStartY
          ) > 8
        ) {
          mobileListTouchMoved = true;
        }
      },
      { passive: true }
    );

    monsterAutocomplete.addEventListener(
      "touchend",
      (event) => {
        if (!mobileAutocompleteMedia.matches) {
          return;
        }

        const button = mobileListTouchButton;

        mobileListTouchButton = null;

        if (
          mobileListTouchMoved ||
          !button
        ) {
          return;
        }

        const index =
          Number(button.dataset.index);

        let monster = null;

        if (button.classList.contains("selected")) {
          monster = getSelectedMonster();
        } else if (
          Number.isInteger(index) &&
          index >= 0
        ) {
          monster = autocompleteMatches[index] || null;
        }

        if (!monster) {
          return;
        }

        event.preventDefault();
        suppressAutocompleteClickUntil =
          Date.now() + 500;

        selectMonsterPreset(monster);
        closeAutocomplete();
      },
      { passive: false }
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        updateMobileMonsterListBounds
      );

      window.visualViewport.addEventListener(
        "scroll",
        updateMobileMonsterListBounds
      );
    }

    window.addEventListener(
      "orientationchange",
      () => {
        window.setTimeout(
          updateMobileMonsterListBounds,
          180
        );
      }
    );

    document
      .getElementById("resetButton")
      .addEventListener("click", () => {
        resetAllInputStates();

        monsterPresetSearch.value = "";
        updatePresetClearButton();
        isThiefJob.checked = false;
        selectedMonsterId = null;
        monsterPresetSelected.textContent = "";
        monsterPresetSelected.classList.add("hidden");
        hideMonsterDetail();
        closeAutocomplete();

        calculate();
      });

    avoidChart.addEventListener(
      "mousemove",
      updateAvoidChartTooltip
    );

    avoidChart.addEventListener(
      "mouseleave",
      () => {
        if (
          !window.matchMedia(
            "(max-width: 900px)"
          ).matches
        ) {
          hideAvoidChartTooltip();
        }
      }
    );

    avoidChart.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType !== "mouse") {
          updateAvoidChartTooltip(event);
        }
      }
    );

    avoidChart.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse") {
          updateAvoidChartTooltip(event);
        }
      }
    );

    avoidChart.addEventListener(
      "pointerleave",
      (event) => {
        if (event.pointerType === "mouse") {
          hideAvoidChartTooltip();
        }
      }
    );

    let resizeTimer = null;

    window.addEventListener("resize", () => {
      hideAvoidChartTooltip();
      window.clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(() => {
        const userLevel =
          readNumber(inputs.userLevel);
        const userAvoid =
          readNumber(inputs.userAvoid);
        const mobLevel =
          readNumber(inputs.mobLevel);
        const mobAcc =
          readNumber(inputs.mobAcc);

        if (
          userLevel !== null &&
          userAvoid !== null &&
          mobLevel !== null &&
          mobAcc !== null
        ) {
          const levelDiff =
            Math.max(
              mobLevel - userLevel,
              0
            );

          scheduleAvoidChart(
            userAvoid,
            levelDiff,
            mobAcc
          );
        }
      }, 120);
    });

    resetAllInputStates();
    calculate();


    /*
     * Mobile gesture guard
     * - blocks pinch / gesture zoom
     * - blocks double-tap zoom
     * - blocks horizontal page dragging
     * - blocks pull-to-refresh at the page top
     * - keeps range sliders fully draggable
     */
    (() => {
      const mobileMedia =
        window.matchMedia("(max-width: 900px)");

      let lastTouchEnd = 0;
      let touchStartX = 0;
      let touchStartY = 0;

      function isRangeControl(target) {
        return (
          target instanceof HTMLInputElement &&
          target.type === "range"
        );
      }

      function preventGesture(event) {
        if (!mobileMedia.matches) {
          return;
        }

        event.preventDefault();
      }

      document.addEventListener(
        "gesturestart",
        preventGesture,
        { passive: false }
      );

      document.addEventListener(
        "gesturechange",
        preventGesture,
        { passive: false }
      );

      document.addEventListener(
        "gestureend",
        preventGesture,
        { passive: false }
      );

      document.addEventListener(
        "touchstart",
        (event) => {
          if (!mobileMedia.matches) {
            return;
          }

          if (event.touches.length > 1) {
            event.preventDefault();
            return;
          }

          const touch = event.touches[0];

          if (!touch) {
            return;
          }

          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        },
        { passive: false }
      );

      document.addEventListener(
        "touchmove",
        (event) => {
          if (!mobileMedia.matches) {
            return;
          }

          if (event.touches.length > 1) {
            event.preventDefault();
            return;
          }

          if (isRangeControl(event.target)) {
            return;
          }

          const touch = event.touches[0];

          if (!touch) {
            return;
          }

          const deltaX =
            touch.clientX - touchStartX;

          const deltaY =
            touch.clientY - touchStartY;

          /*
           * 가로 이동 의도가 더 강하면 페이지 이동을 차단합니다.
           */
          if (
            Math.abs(deltaX) >
            Math.abs(deltaY)
          ) {
            event.preventDefault();
            return;
          }

          /*
           * 문서 최상단에서 아래로 당기는 동작을 차단해
           * pull-to-refresh와 상단 rubber-band를 막습니다.
           */
          if (
            window.scrollY <= 0 &&
            deltaY > 0
          ) {
            event.preventDefault();
          }
        },
        { passive: false }
      );

      document.addEventListener(
        "touchend",
        (event) => {
          if (!mobileMedia.matches) {
            return;
          }

          const now = Date.now();

          if (
            now - lastTouchEnd <= 300 &&
            !isRangeControl(event.target)
          ) {
            event.preventDefault();
          }

          lastTouchEnd = now;
        },
        { passive: false }
      );

      document.addEventListener(
        "dblclick",
        (event) => {
          if (
            mobileMedia.matches &&
            !isRangeControl(event.target)
          ) {
            event.preventDefault();
          }
        },
        { passive: false }
      );
    })();


    /*
     * Mobile / desktop presentation switch.
     * Desktop mode changes the viewport width before reload so all
     * desktop media-query behavior and layout are preserved.
     */
    (() => {
      const desktopViewButton =
        document.getElementById("desktopViewButton");

      const mobileViewButton =
        document.getElementById("mobileViewButton");

      function setViewMode(mode) {
        const currentMode =
          document.documentElement.classList.contains(
            "force-desktop-view"
          )
            ? "desktop"
            : "mobile";

        if (mode === currentMode) {
          return;
        }

        if (mode === "desktop") {
          localStorage.setItem(
            "accavoidViewMode",
            "desktop"
          );
        } else {
          localStorage.removeItem(
            "accavoidViewMode"
          );
        }

        window.location.reload();
      }

      desktopViewButton?.addEventListener(
        "click",
        () => setViewMode("desktop")
      );

      mobileViewButton?.addEventListener(
        "click",
        () => setViewMode("mobile")
      );
    })();

    /*
     * Touch-only keyboard dismissal.
     *
     * iOS automatically fires window and VisualViewport scroll events while
     * opening the keyboard. Those events must never close the keyboard.
     *
     * The keyboard is dismissed only when the user's finger performs a real,
     * clearly vertical drag after touching outside a range slider.
     */
    (() => {
      const touchDevice =
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches;

      const TOUCH_GRACE_MS = 140;
      const MOVE_THRESHOLD_PX = 14;

      let startX = 0;
      let startY = 0;
      let touchStartedAt = 0;
      let startedOnEditable = false;
      let dismissedForGesture = false;

      function isRangeInput(element) {
        return (
          element instanceof HTMLInputElement &&
          element.type === "range"
        );
      }

      function canOwnKeyboard(element) {
        return (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement ||
          element?.isContentEditable === true
        );
      }

      function dismissKeyboard() {
        const active = document.activeElement;

        if (
          touchDevice &&
          canOwnKeyboard(active) &&
          !isRangeInput(active)
        ) {
          active.blur();
        }
      }

      document.addEventListener(
        "touchstart",
        (event) => {
          if (!touchDevice) {
            return;
          }

          const touch = event.touches[0];

          if (!touch) {
            return;
          }

          startX = touch.clientX;
          startY = touch.clientY;
          touchStartedAt = performance.now();
          startedOnEditable =
            canOwnKeyboard(event.target);
          dismissedForGesture = false;
        },
        {
          passive: true,
          capture: true
        }
      );

      document.addEventListener(
        "touchmove",
        (event) => {
          if (
            !touchDevice ||
            dismissedForGesture ||
            isRangeInput(event.target) ||
            startedOnEditable
          ) {
            return;
          }

          if (
            performance.now() - touchStartedAt <
            TOUCH_GRACE_MS
          ) {
            return;
          }

          const touch = event.touches[0];

          if (!touch) {
            return;
          }

          const deltaX =
            Math.abs(touch.clientX - startX);

          const deltaY =
            Math.abs(touch.clientY - startY);

          const realVerticalDrag =
            deltaY >= MOVE_THRESHOLD_PX &&
            deltaY >= deltaX * 1.2;

          if (realVerticalDrag) {
            dismissedForGesture = true;
            dismissKeyboard();
          }
        },
        {
          passive: true,
          capture: true
        }
      );
    })();
