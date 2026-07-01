(function initMissingDataApp() {
  var data = window.MHSB_DATA || {};
  var pieces = data.pieces || {};
  var weaponAugmentTables = data.weaponAugmentTables || {};

  var DRAFT_STORAGE_KEY = "mhsb_missing_data_draft_v1";
  var APPLIED_STORAGE_KEY = "mhsb_missing_data_applied_v1";
  var TAB_AUGMENT = "augment";
  var TAB_BOWGUN = "bowgun";
  var AUGMENT_KEYS = ["attack", "affinity", "sharpness", "slotUnlock", "special_3", "special_4", "special_5", "special_8", "rampageSlot"];
  var WEAPON_ORDER = [
    "大剣", "太刀", "片手剣", "双剣", "ハンマー", "狩猟笛", "ランス", "ガンランス",
    "スラッシュアックス", "チャージアックス", "操虫棍", "ライトボウガン", "ヘビィボウガン", "弓"
  ];
  var BOWGUN_TYPES = ["ライトボウガン", "ヘビィボウガン"];
  var EMPTY_PAYLOAD = {
    weaponAugmentOverrides: {},
    bowgunOverrides: {},
    updatedAt: null,
    appliedAt: null
  };
  var AUGMENT_META = {
    attack: ["攻撃力強化", "攻撃力を上げる錬成です。value は攻撃力の上昇量、cost は消費傀異スロットです。"],
    affinity: ["会心率強化", "会心率を上げる錬成です。value は会心率の上昇量(%)です。"],
    sharpness: ["切れ味強化", "剣士武器用です。value 1 を切れ味ゲージ +10 として扱います。"],
    slotUnlock: ["傀異スロット拡張", "武器の傀異スロット拡張段階です。slotBonus は拡張時の攻撃力や属性値ボーナスです。"],
    special_3: ["属性強化系", "属性武器や一部状態異常武器で使う補正枠です。武器ごとの差が曖昧な場合だけ手動補完します。"],
    special_4: ["状態異常強化系", "主に毒、麻痺、睡眠、爆破などの状態異常武器向けの補正枠です。"],
    special_5: ["特殊強化系", "武器種依存の補正枠です。代表例はガンランスの砲撃強化です。"],
    special_8: ["属性・状態異常強化系", "複合カテゴリ用の補正枠です。通常の属性強化と混ぜず、必要な武器だけに使います。"],
    rampageSlot: ["百竜装飾品スロット拡張", "百竜装飾品スロットを +1 / +2 する錬成です。武器の通常スロットとは別物です。"]
  };

  var tabRow = document.getElementById("tab-row");
  var augmentPanel = document.getElementById("augment-panel");
  var bowgunPanel = document.getElementById("bowgun-panel");
  var storageStats = document.getElementById("storage-stats");
  var jsonPreview = document.getElementById("json-preview");
  var exportButton = document.getElementById("export-json");
  var importTextButton = document.getElementById("import-json-text");
  var importFileInput = document.getElementById("import-json-file");
  var clearAllButton = document.getElementById("clear-all-data");
  var saveStatus = document.getElementById("save-status");
  var applyStatus = document.getElementById("apply-status");
  var savedSummary = document.getElementById("saved-summary");
  var applyToMainButton = document.getElementById("apply-to-main");
  var clearAppliedButton = document.getElementById("clear-applied-data");

  var state = {
    activeTab: TAB_AUGMENT,
    draftPayload: loadPayload(DRAFT_STORAGE_KEY),
    appliedPayload: loadPayload(APPLIED_STORAGE_KEY),
    augmentWeaponType: "",
    augmentWeaponId: "",
    bowgunWeaponType: "",
    bowgunWeaponId: "",
    augmentDrafts: {},
    bowgunDrafts: {}
  };

  var weaponTypes = WEAPON_ORDER.filter(function (type) {
    return (pieces.weapon || []).some(function (weapon) { return weapon.weaponType === type; });
  });
  var bowgunTypes = BOWGUN_TYPES.filter(function (type) {
    return (pieces.weapon || []).some(function (weapon) { return weapon.weaponType === type; });
  });

  normalizeSelection();
  renderAll();

  tabRow.addEventListener("click", function (event) {
    var tab = event.target.dataset.tab;
    if (!tab || tab === state.activeTab) return;
    state.activeTab = tab;
    renderTabs();
  });
  augmentPanel.addEventListener("change", handleAugmentChange);
  augmentPanel.addEventListener("input", handleAugmentInput);
  augmentPanel.addEventListener("click", handleAugmentClick);
  bowgunPanel.addEventListener("change", handleBowgunChange);
  bowgunPanel.addEventListener("input", handleBowgunInput);
  bowgunPanel.addEventListener("click", handleBowgunClick);
  exportButton.addEventListener("click", exportJson);
  importTextButton.addEventListener("click", importJsonFromTextarea);
  importFileInput.addEventListener("change", importJsonFromFile);
  clearAllButton.addEventListener("click", clearAllData);
  applyToMainButton.addEventListener("click", applyDraftToMain);
  clearAppliedButton.addEventListener("click", clearAppliedData);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return 0;
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatDateTime(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString("ja-JP") : "未保存";
  }

  function normalizeAmmoRow(row) {
    row = row || {};
    return {
      name: String(row.name || ""),
      capacity: Number(row.capacity || 0),
      recoilLabel: String(row.recoilLabel || row.recoilText || row.recoil || ""),
      reloadLabel: String(row.reloadLabel || row.reloadText || row.reload || ""),
      handling: String(row.handling || "")
    };
  }

  function normalizeBowgunData(bowgun) {
    var rapidFire;
    bowgun = bowgun || {};
    if (Array.isArray(bowgun.rapidFire)) {
      rapidFire = bowgun.rapidFire.map(function (entry) { return String(entry || "").trim(); }).filter(Boolean);
    } else {
      rapidFire = String(bowgun.rapidFire || "").split(/\r?\n|,/).map(function (entry) {
        return entry.trim();
      }).filter(Boolean);
    }
    return {
      reload: Number(bowgun.reload || 0),
      recoil: Number(bowgun.recoil || 0),
      fluctuation: String(bowgun.fluctuation || ""),
      specialAmmo: String(bowgun.specialAmmo || ""),
      rapidFire: rapidFire,
      ammo: Array.isArray(bowgun.ammo) ? bowgun.ammo.map(normalizeAmmoRow) : []
    };
  }

  function normalizePayload(payload) {
    var next = clone(EMPTY_PAYLOAD);
    payload = payload || {};
    next.updatedAt = payload.updatedAt || null;
    next.appliedAt = payload.appliedAt || null;

    Object.keys(payload.weaponAugmentOverrides || {}).forEach(function (weaponId) {
      var item = payload.weaponAugmentOverrides[weaponId] || {};
      var weapon = getWeaponById(weaponId);
      next.weaponAugmentOverrides[weaponId] = {
        weaponId: weaponId,
        name: (weapon && weapon.name) || item.name || weaponId,
        weaponType: (weapon && weapon.weaponType) || item.weaponType || "",
        customTableNo: weapon ? weapon.customTableNo : item.customTableNo || null,
        notes: String(item.notes || ""),
        config: clone(item.config || {}),
        updatedAt: item.updatedAt || null
      };
    });

    Object.keys(payload.bowgunOverrides || {}).forEach(function (weaponId) {
      var item = payload.bowgunOverrides[weaponId] || {};
      var weapon = getWeaponById(weaponId);
      next.bowgunOverrides[weaponId] = {
        weaponId: weaponId,
        name: (weapon && weapon.name) || item.name || weaponId,
        weaponType: (weapon && weapon.weaponType) || item.weaponType || "",
        notes: String(item.notes || ""),
        bowgun: normalizeBowgunData(item.bowgun || {}),
        updatedAt: item.updatedAt || null
      };
    });
    return next;
  }

  function loadPayload(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      return raw ? normalizePayload(JSON.parse(raw)) : clone(EMPTY_PAYLOAD);
    } catch (_error) {
      return clone(EMPTY_PAYLOAD);
    }
  }

  function persistDraftPayload() {
    state.draftPayload.updatedAt = Date.now();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state.draftPayload));
    renderMeta();
    renderSavedSummary();
  }

  function persistAppliedPayload(payload) {
    state.appliedPayload = normalizePayload(payload);
    state.appliedPayload.appliedAt = Date.now();
    localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(state.appliedPayload));
    renderMeta();
  }

  function getWeaponById(id) {
    return (pieces.weapon || []).find(function (weapon) { return weapon.id === id; }) || null;
  }

  function getWeaponsByType(type) {
    return (pieces.weapon || [])
      .filter(function (weapon) { return weapon.weaponType === type; })
      .slice()
      .sort(function (a, b) {
        return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name, "ja");
      });
  }

  function normalizeSelection() {
    var augmentWeapons;
    var bowguns;
    if (weaponTypes.indexOf(state.augmentWeaponType) === -1) state.augmentWeaponType = weaponTypes[0] || "";
    augmentWeapons = getWeaponsByType(state.augmentWeaponType);
    if (!augmentWeapons.some(function (weapon) { return weapon.id === state.augmentWeaponId; })) {
      state.augmentWeaponId = augmentWeapons[0] ? augmentWeapons[0].id : "";
    }
    if (bowgunTypes.indexOf(state.bowgunWeaponType) === -1) state.bowgunWeaponType = bowgunTypes[0] || "";
    bowguns = getWeaponsByType(state.bowgunWeaponType);
    if (!bowguns.some(function (weapon) { return weapon.id === state.bowgunWeaponId; })) {
      state.bowgunWeaponId = bowguns[0] ? bowguns[0].id : "";
    }
  }

  function getBaseAugmentConfig(weapon) {
    return clone(weaponAugmentTables[String((weapon && weapon.customTableNo) || "")] || {});
  }

  function getSavedAugmentOverride(weapon) {
    return weapon ? state.draftPayload.weaponAugmentOverrides[weapon.id] || null : null;
  }

  function getSavedBowgunOverride(weapon) {
    return weapon ? state.draftPayload.bowgunOverrides[weapon.id] || null : null;
  }

  function getAugmentDraft(weapon) {
    var saved;
    if (!weapon) return null;
    if (!state.augmentDrafts[weapon.id]) {
      saved = getSavedAugmentOverride(weapon);
      state.augmentDrafts[weapon.id] = {
        notes: saved ? saved.notes || "" : "",
        config: clone(saved ? saved.config || {} : getBaseAugmentConfig(weapon))
      };
    }
    return state.augmentDrafts[weapon.id];
  }

  function getBowgunBase(weapon) {
    return normalizeBowgunData((weapon && weapon.bowgun) || {});
  }

  function getBowgunDraft(weapon) {
    var saved;
    if (!weapon) return null;
    if (!state.bowgunDrafts[weapon.id]) {
      saved = getSavedBowgunOverride(weapon);
      state.bowgunDrafts[weapon.id] = {
        notes: saved ? saved.notes || "" : "",
        bowgun: normalizeBowgunData(saved ? saved.bowgun || {} : getBowgunBase(weapon))
      };
    }
    return state.bowgunDrafts[weapon.id];
  }

  function resetAugmentDraft(weapon) {
    if (weapon) delete state.augmentDrafts[weapon.id];
  }

  function resetBowgunDraft(weapon) {
    if (weapon) delete state.bowgunDrafts[weapon.id];
  }

  function getAugmentStatus(weapon) {
    var draft = getAugmentDraft(weapon);
    var saved = getSavedAugmentOverride(weapon);
    var savedBase = saved ? { notes: saved.notes || "", config: saved.config || {} } : { notes: "", config: getBaseAugmentConfig(weapon) };
    return {
      hasSaved: Boolean(saved),
      dirty: JSON.stringify(draft || {}) !== JSON.stringify(savedBase)
    };
  }

  function getBowgunStatus(weapon) {
    var draft = getBowgunDraft(weapon);
    var saved = getSavedBowgunOverride(weapon);
    var savedBase = saved ? { notes: saved.notes || "", bowgun: saved.bowgun || {} } : { notes: "", bowgun: getBowgunBase(weapon) };
    return {
      hasSaved: Boolean(saved),
      dirty: JSON.stringify(draft || {}) !== JSON.stringify(savedBase)
    };
  }

  function optionHtml(value, label, selected) {
    return '<option value="' + escapeAttr(value) + '"' + (selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function weaponOptionsHtml(type, selectedId) {
    return getWeaponsByType(type).map(function (weapon) {
      return optionHtml(weapon.id, weapon.name, weapon.id === selectedId);
    }).join("");
  }

  function weaponTypeOptionsHtml(types, selectedType) {
    return types.map(function (type) {
      return optionHtml(type, type, type === selectedType);
    }).join("");
  }

  function renderAll() {
    normalizeSelection();
    renderTabs();
    renderAugmentPanel();
    renderBowgunPanel();
    renderMeta();
    renderSavedSummary();
  }

  function renderTabs() {
    Array.prototype.forEach.call(tabRow.querySelectorAll(".tab-button"), function (button) {
      button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
    });
    augmentPanel.classList.toggle("is-hidden", state.activeTab !== TAB_AUGMENT);
    bowgunPanel.classList.toggle("is-hidden", state.activeTab !== TAB_BOWGUN);
  }

  function renderMeta() {
    var draftAugmentCount = Object.keys(state.draftPayload.weaponAugmentOverrides).length;
    var draftBowgunCount = Object.keys(state.draftPayload.bowgunOverrides).length;
    storageStats.innerHTML = [
      '<div class="missing-stat">下書き: 武器傀異錬成 ' + draftAugmentCount + '件</div>',
      '<div class="missing-stat">下書き: ボウガン ' + draftBowgunCount + '件</div>',
      '<div class="missing-stat">下書き最終保存: ' + formatDateTime(state.draftPayload.updatedAt) + '</div>'
    ].join("");
    jsonPreview.value = JSON.stringify(state.draftPayload, null, 2);
    saveStatus.textContent = state.draftPayload.updatedAt
      ? "下書き保存: " + formatDateTime(state.draftPayload.updatedAt) + " / localStorage(" + DRAFT_STORAGE_KEY + ")"
      : "まだ下書き保存されていません。localStorage(" + DRAFT_STORAGE_KEY + ") に保存されます。";
    applyStatus.textContent = state.appliedPayload.appliedAt
      ? "本体反映中: " + formatDateTime(state.appliedPayload.appliedAt) + " / localStorage(" + APPLIED_STORAGE_KEY + ")"
      : "まだ本体に反映されていません。内容を確認して「本体保存」を押してください。";
  }

  function renderSavedSummary() {
    var augmentItems = Object.keys(state.draftPayload.weaponAugmentOverrides).map(function (key) {
      return state.draftPayload.weaponAugmentOverrides[key];
    });
    var bowgunItems = Object.keys(state.draftPayload.bowgunOverrides).map(function (key) {
      return state.draftPayload.bowgunOverrides[key];
    });
    savedSummary.innerHTML = [
      renderSavedGroup("武器傀異錬成", augmentItems, "まだ保存された上書きはありません。"),
      renderSavedGroup("ボウガン弾設定", bowgunItems, "まだ保存された上書きはありません。")
    ].join("");
  }

  function renderSavedGroup(title, items, emptyLabel) {
    items.sort(function (a, b) {
      return (a.weaponType || "").localeCompare(b.weaponType || "", "ja") || (a.name || "").localeCompare(b.name || "", "ja");
    });
    if (!items.length) {
      return '<div class="saved-group"><div class="saved-group-title">' + title + '</div><div class="empty-box">' + emptyLabel + '</div></div>';
    }
    return '<div class="saved-group"><div class="saved-group-title">' + title + '</div>' + items.map(function (item) {
      return '<div class="saved-item"><div><strong>' + escapeHtml(item.name) + '</strong><div class="saved-item-meta">' + escapeHtml(item.weaponType) + ' / <span class="mono-text">' + escapeHtml(item.weaponId) + '</span></div></div><div class="saved-item-meta">' + formatDateTime(item.updatedAt) + '</div></div>';
    }).join("") + '</div>';
  }

  function getDecorationLabel(value) {
    return value == null || value === "" ? "" : String(value);
  }

  function renderGuideList(title, items) {
    return [
      '<div class="flow-guide">',
      '<strong>' + escapeHtml(title) + '</strong>',
      '<ul>',
      items.map(function (item) { return '<li>' + item + '</li>'; }).join(""),
      '</ul>',
      '</div>'
    ].join("");
  }

  function getAugmentFieldHelp(field, categoryLabel) {
    var category = escapeHtml(categoryLabel || "このカテゴリ");
    var helps = {
      level: "本体の「武器の傀異錬成」で選ぶ段階です。同じカテゴリ内で Lv1、Lv2 のように並びます。",
      cost: "本体の「使用スロット」に加算されます。合計が武器の傀異スロット上限を超えると超過表示になります。",
      value: category + "を選んだ時に本体へ加算される値です。攻撃力なら攻撃力、会心率なら%、切れ味ならゲージ量、属性系なら属性値/状態異常値として使われます。",
      "slotBonus.attack": "「傀異スロット拡張」を選んだ時、本体の武器攻撃力に追加される攻撃力ボーナスです。",
      "slotBonus.special_3": "特殊な属性/状態異常カテゴリ用の追加ボーナスです。元データにこの欄がある武器だけ編集します。",
      "slotBonus.special_4": "状態異常系の追加ボーナスです。毒、麻痺、睡眠、爆破などの補完に使います。",
      "slotBonus.special_5": "武器種依存の特殊ボーナスです。代表例はガンランスの砲撃強化です。",
      "slotBonus.special_8": "複合属性/状態異常系の追加ボーナスです。通常の属性強化と混ぜず、必要な武器だけ使います。"
    };
    return helps[field] || "";
  }

  function renderAugmentOptionRow(categoryKey, option, index) {
    var slotBonus = option.slotBonus || {};
    var meta = AUGMENT_META[categoryKey] || [categoryKey, ""];
    if (categoryKey === "slotUnlock") {
      return [
        "<tr>",
        '<td><span class="level-chip">Lv' + getDecorationLabel(option.level) + '</span></td>',
        numberCell("cost", categoryKey, index, option.cost, meta[0]),
        numberCell("slotBonus.attack", categoryKey, index, slotBonus.attack, meta[0]),
        numberCell("slotBonus.special_3", categoryKey, index, slotBonus.special_3, meta[0]),
        numberCell("slotBonus.special_4", categoryKey, index, slotBonus.special_4, meta[0]),
        numberCell("slotBonus.special_5", categoryKey, index, slotBonus.special_5, meta[0]),
        numberCell("slotBonus.special_8", categoryKey, index, slotBonus.special_8, meta[0]),
        '<td><button type="button" data-augment-remove-row="' + categoryKey + '" data-augment-index="' + index + '">削除</button></td>',
        "</tr>"
      ].join("");
    }
    return [
      "<tr>",
      '<td><span class="level-chip">Lv' + getDecorationLabel(option.level) + '</span></td>',
      numberCell("cost", categoryKey, index, option.cost, meta[0]),
      numberCell("value", categoryKey, index, option.value, meta[0]),
      '<td><button type="button" data-augment-remove-row="' + categoryKey + '" data-augment-index="' + index + '">削除</button></td>',
      "</tr>"
    ].join("");
  }

  function numberCell(field, categoryKey, index, value, categoryLabel) {
    var help = getAugmentFieldHelp(field, categoryLabel);
    return '<td><input type="number" title="' + escapeAttr(help) + '" aria-label="' + escapeAttr(field + ': ' + help) + '" data-augment-field="' + field + '" data-augment-category="' + categoryKey + '" data-augment-index="' + index + '" value="' + getDecorationLabel(value) + '" /></td>';
  }

  function getUsedAugmentLabels(weapon) {
    var baseConfig = getBaseAugmentConfig(weapon);
    return AUGMENT_KEYS.filter(function (key) {
      var category = baseConfig[key];
      return Boolean(category && category.options && category.options.length);
    }).map(function (key) {
      return (AUGMENT_META[key] || [key])[0];
    });
  }

  function renderAugmentPanel() {
    var weapon = getWeaponById(state.augmentWeaponId);
    var draft = getAugmentDraft(weapon);
    var status = getAugmentStatus(weapon);
    if (!weapon || !draft) {
      augmentPanel.innerHTML = '<div class="empty-box">対象武器がありません。</div>';
      return;
    }
    augmentPanel.innerHTML = [
      '<div class="missing-grid">',
      '<div class="selector-grid">',
      '<label>武器種<select id="augment-weapon-type">' + weaponTypeOptionsHtml(weaponTypes, state.augmentWeaponType) + '</select></label>',
      '<label>武器<select id="augment-weapon-id" data-expandable-select="true">' + weaponOptionsHtml(state.augmentWeaponType, state.augmentWeaponId) + '</select></label>',
      '</div>',
      renderAugmentInfo(weapon, draft, status, getUsedAugmentLabels(weapon)),
      '<div class="augment-category-list">' + renderAugmentCards(weapon, draft) + '</div>',
      '</div>'
    ].join("");
  }

  function renderAugmentInfo(weapon, draft, status, usedLabels) {
    var usedChips = usedLabels && usedLabels.length
      ? usedLabels.map(function (label) { return '<span class="chip">' + escapeHtml(label) + '</span>'; }).join("")
      : '<span class="meta-text">基準データが見つかりませんでした。下の一覧から手動で追加してください。</span>';
    return [
      '<div class="info-card">',
      '<div class="row-header">',
      '<div><strong>' + escapeHtml(weapon.name) + '</strong><div class="meta-text">' + escapeHtml(weapon.weaponType) + ' / <span class="mono-text">' + escapeHtml(weapon.id) + '</span></div></div>',
      '<div class="meta-text">保存状態: ' + (status.hasSaved ? "下書き保存済み" : "未保存") + (status.dirty ? " / 未保存変更あり" : "") + '</div>',
      '</div>',
      renderGuideList("この画面で保存した値の流れ", [
        "この武器の下書きを保存: このツール内の JSON と localStorage に保存します。",
        "本体保存: 下書き全体を本体シミュレーター用データとして保存します。",
        "本体シミュレーターへ戻る: 武器欄の「武器の傀異錬成」に、ここで補完した選択肢と数値が出ます。"
      ]),
      '<div class="help-box"><strong>この武器で実際に使う項目</strong><div class="chip-row">' + usedChips + '</div><div class="meta-text">下の一覧はカテゴリ全種を表示しますが、ここに出ていない項目は「この武器では基準データがない項目」としてまとめて折りたたまれます。</div></div>',
      '<div class="info-grid">',
      '<div><strong>攻撃力</strong>' + weapon.attack + '</div>',
      '<div><strong>会心率</strong>' + weapon.affinity + '%</div>',
      '<div><strong>傀異テーブル</strong>' + (weapon.customTableNo == null ? "なし" : weapon.customTableNo) + '</div>',
      '<div><strong>百竜スロット</strong>' + (weapon.rampageSlot ? "Lv" + weapon.rampageSlot : "なし") + '</div>',
      '</div>',
      '<label>メモ<textarea class="note-box" id="augment-notes">' + escapeHtml(draft.notes || "") + '</textarea></label>',
      '<div class="editor-actions">',
      '<button type="button" id="save-augment-override">この武器の下書きを保存</button>',
      '<button type="button" id="delete-augment-override"' + (status.hasSaved ? "" : " disabled") + '>保存済み下書きを削除</button>',
      '<button type="button" id="reset-augment-draft">編集中の内容を基準値へ戻す</button>',
      '</div>',
      '</div>'
    ].join("");
  }

  function categoryHasData(category, baseCategory) {
    var hasOptions = Boolean(category && category.options && category.options.length);
    var hasBase = Boolean(baseCategory && baseCategory.options && baseCategory.options.length);
    return hasOptions || hasBase;
  }

  function renderAugmentCards(weapon, draft) {
    var baseConfig = getBaseAugmentConfig(weapon);
    var usedCards = [];
    var unusedCards = [];
    AUGMENT_KEYS.forEach(function (key) {
      var category = draft.config[key] || { kind: key, categoryId: "", options: [] };
      var baseCategory = baseConfig[key] || null;
      var card = renderAugmentCard(key, category, baseCategory);
      if (categoryHasData(category, baseCategory)) usedCards.push(card);
      else unusedCards.push(card);
    });
    var unusedBlock = unusedCards.length
      ? [
        '<details class="augment-unused-block">',
        '<summary>この武器では基準データがない項目（' + unusedCards.length + '件・普段は開かなくて大丈夫です）</summary>',
        unusedCards.join(""),
        '</details>'
      ].join("")
      : "";
    return usedCards.join("") + unusedBlock;
  }

  function renderAugmentCard(key, category, baseCategory) {
    var meta = AUGMENT_META[key] || [key, ""];
    var isSlotUnlock = key === "slotUnlock";
    var rows = (category.options || []).map(function (option, index) {
      return { option: option, index: index };
    }).sort(function (a, b) {
      return Number(a.option.level || 0) - Number(b.option.level || 0);
    }).map(function (entry) {
      return renderAugmentOptionRow(key, entry.option, entry.index);
    }).join("");
    var guideItems = isSlotUnlock
      ? [
        '<span class="mono-text">Lv</span>: 本体の「傀異スロット拡張 Lv」です。Lv1 なら本体の傀異スロット上限が 3 から 4 になります。',
        '<span class="mono-text">Cost</span>: その拡張Lvを選ぶための使用スロットです。',
        '<span class="mono-text">攻撃ボーナス</span>: 拡張Lvを選んだ時、本体の武器攻撃力へ加算されます。',
        '<span class="mono-text">属性/状態異常ボーナス</span>: 拡張Lvを選んだ時、本体の属性値または状態異常値へ加算されます。武器やカテゴリに合う欄だけ使います。'
      ]
      : [
        '<span class="mono-text">Lv</span>: 本体の錬成選択ボタンに出る段階です。基本的に固定で、ここでは編集しません。',
        '<span class="mono-text">Cost</span>: 本体の「使用スロット」に加算されます。',
        '<span class="mono-text">値</span>: このカテゴリを選んだ時、攻撃力/会心率/属性値/切れ味などへ加算されます。'
      ];
    var tableHead = isSlotUnlock
      ? '<thead><tr><th>Lv</th><th>Cost</th><th>攻撃ボーナス</th><th>属性/状態異常 special_3</th><th>属性/状態異常 special_4</th><th>特殊 special_5</th><th>複合 special_8</th><th></th></tr></thead>'
      : '<thead><tr><th>Lv</th><th>Cost</th><th>値</th><th></th></tr></thead>';
    var colspan = isSlotUnlock ? 8 : 4;
    return [
      '<div class="augment-card">',
      '<div class="row-header">',
      '<div><strong>' + meta[0] + '</strong><div class="meta-text">' + escapeHtml(meta[1]) + '</div>',
      '<details class="augment-tech-info"><summary>技術情報</summary><div class="meta-text">基準カテゴリID: ' + ((baseCategory && baseCategory.categoryId) || category.categoryId || "未設定") + '</div><div class="meta-text mono-text">内部キー: ' + key + '</div></details>',
      '</div>',
      '<div class="inline-actions"><button type="button" data-augment-add-row="' + key + '">行を追加</button><button type="button" data-augment-reset-category="' + key + '">基準値に戻す</button></div>',
      '</div>',
      renderGuideList(isSlotUnlock ? "傀異スロット拡張の反映先" : "欄の反映先", guideItems),
      '<div class="table-scroll"><table class="data-table augment-data-table ' + (isSlotUnlock ? "is-slot-unlock" : "is-simple") + '">',
      tableHead,
      '<tbody>' + (rows || '<tr><td colspan="' + colspan + '" class="meta-text">行がありません。</td></tr>') + '</tbody>',
      '</table></div></div>'
    ].join("");
  }

  function renderBowgunPanel() {
    var weapon = getWeaponById(state.bowgunWeaponId);
    var draft = getBowgunDraft(weapon);
    var status = getBowgunStatus(weapon);
    if (!weapon || !draft) {
      bowgunPanel.innerHTML = '<div class="empty-box">対象ボウガンがありません。</div>';
      return;
    }
    bowgunPanel.innerHTML = [
      '<div class="missing-grid">',
      '<div class="selector-grid">',
      '<label>武器種<select id="bowgun-weapon-type">' + weaponTypeOptionsHtml(bowgunTypes, state.bowgunWeaponType) + '</select></label>',
      '<label>武器<select id="bowgun-weapon-id" data-expandable-select="true">' + weaponOptionsHtml(state.bowgunWeaponType, state.bowgunWeaponId) + '</select></label>',
      '</div>',
      renderBowgunInfo(weapon, draft, status),
      renderAmmoTable(draft),
      '</div>'
    ].join("");
  }

  function renderBowgunInfo(weapon, draft, status) {
    return [
      '<div class="info-card">',
      '<div class="row-header">',
      '<div><strong>' + escapeHtml(weapon.name) + '</strong><div class="meta-text">' + escapeHtml(weapon.weaponType) + ' / <span class="mono-text">' + escapeHtml(weapon.id) + '</span></div></div>',
      '<div class="meta-text">保存状態: ' + (status.hasSaved ? "下書き保存済み" : "未保存") + (status.dirty ? " / 未保存変更あり" : "") + '</div>',
      '</div>',
      renderGuideList("この画面で保存した値の流れ", [
        "この武器の下書きを保存: このツール内の JSON と localStorage に保存します。",
        "本体保存: 下書き全体を本体シミュレーター用データとして保存します。",
        "本体シミュレーターへ戻る: 武器欄の「ボウガン詳細」に、ここで補完した反動、装填速度、弾リストが出ます。"
      ]),
      '<div class="help-box"><strong>入力の考え方</strong><div class="meta-text">反動 / 装填速度は数値段階で入れます。本体ではスキル「反動軽減」「装填速度」を差し引いた後に、文字表示へ変換されます。</div><div class="meta-text">ブレ、特殊弾、速射、弾ごとの反動/装填速度/補足は本体の「ボウガン詳細」に文字として表示されます。</div></div>',
      '<div class="info-grid">',
      '<label>基準装填速度段階<input type="number" id="bowgun-reload" value="' + draft.bowgun.reload + '" /><span class="cell-hint">本体: ボウガン詳細 → 装填速度。スキル「装填速度」で段階が下がります。1=最速、4=普通、7=かなり遅い。</span></label>',
      '<label>基準反動段階<input type="number" id="bowgun-recoil" value="' + draft.bowgun.recoil + '" /><span class="cell-hint">本体: ボウガン詳細 → 反動。スキル「反動軽減」で段階が下がります。1=小、2=中、3=大。</span></label>',
      '<label>ブレ<input type="text" id="bowgun-fluctuation" value="' + escapeAttr(draft.bowgun.fluctuation || "") + '" placeholder="なし / 左小 / 右大 など" /><span class="cell-hint">本体: ボウガン詳細 → ブレ。表示名をそのまま入れても、None / LeftLittle などの内部名でも扱えます。</span></label>',
      '<label>特殊弾<input type="text" id="bowgun-special-ammo" value="' + escapeAttr(draft.bowgun.specialAmmo || "") + '" placeholder="起爆竜弾 / 機関竜弾 / 狙撃竜弾 など" /><span class="cell-hint">本体: ボウガン詳細 → 特殊弾。空欄なら「なし」表示です。</span></label>',
      '</div>',
      '<label>速射対応弾（1行1件）<textarea id="bowgun-rapid-fire" class="line-textarea">' + escapeHtml((draft.bowgun.rapidFire || []).join("\n")) + '</textarea><span class="cell-hint">本体: ボウガン詳細 → 速射。1行が1つの弾名として表示されます。</span></label>',
      '<label>メモ<textarea class="note-box" id="bowgun-notes">' + escapeHtml(draft.notes || "") + '</textarea></label>',
      '<div class="editor-actions">',
      '<button type="button" id="save-bowgun-override">この武器の下書きを保存</button>',
      '<button type="button" id="delete-bowgun-override"' + (status.hasSaved ? "" : " disabled") + '>保存済み下書きを削除</button>',
      '<button type="button" id="reset-bowgun-draft">編集中の内容を基準値へ戻す</button>',
      '</div></div>'
    ].join("");
  }

  function renderAmmoTable(draft) {
    var rows = (draft.bowgun.ammo || []).map(function (ammo, index) {
      return [
        "<tr>",
        ammoTextCell(index, "name", ammo.name),
        '<td><input type="number" data-bowgun-ammo-field="capacity" data-bowgun-ammo-index="' + index + '" value="' + ammo.capacity + '" /></td>',
        ammoTextCell(index, "recoilLabel", ammo.recoilLabel, "反動小 / 反動中 など"),
        ammoTextCell(index, "reloadLabel", ammo.reloadLabel, "最速 / 速い / 遅い など"),
        ammoTextCell(index, "handling", ammo.handling, "移動射撃 / 単発自動装填 など"),
        '<td><button type="button" data-bowgun-remove-ammo="' + index + '">削除</button></td>',
        "</tr>"
      ].join("");
    }).join("");
    return [
      '<div class="ammo-card">',
      '<div class="row-header"><div><strong>装填弾リスト</strong><div class="meta-text">弾名 / 装填数 / 反動 / 装填速度 / 補足 を編集します。</div></div><div class="inline-actions"><button type="button" id="add-bowgun-ammo">弾を追加</button></div></div>',
      renderGuideList("弾リストの反映先", [
        '<span class="mono-text">弾名</span>: 本体の弾リスト左端に表示されます。',
        '<span class="mono-text">装填数</span>: 本体で「装填数 n」と表示されます。',
        '<span class="mono-text">反動</span> と <span class="mono-text">装填速度</span>: 本体で「反動 / 装填速度」として並びます。ここは文字表示用なので、見たまま入力で大丈夫です。',
        '<span class="mono-text">補足</span>: 移動射撃、移動リロード、単発自動装填などの扱いを表示します。'
      ]),
      '<div class="table-scroll"><table class="data-table">',
      '<thead><tr><th>弾名</th><th>装填数</th><th>反動</th><th>装填速度</th><th>補足</th><th></th></tr></thead>',
      '<tbody>' + (rows || '<tr><td colspan="6" class="meta-text">弾データがありません。</td></tr>') + '</tbody>',
      '</table></div></div>'
    ].join("");
  }

  function ammoTextCell(index, field, value, placeholder) {
    return '<td><input type="text" data-bowgun-ammo-field="' + field + '" data-bowgun-ammo-index="' + index + '" value="' + escapeAttr(value || "") + '"' + (placeholder ? ' placeholder="' + escapeAttr(placeholder) + '"' : "") + ' /></td>';
  }

  function handleAugmentChange(event) {
    if (event.target.id === "augment-weapon-type") {
      state.augmentWeaponType = event.target.value;
      state.augmentWeaponId = getWeaponsByType(state.augmentWeaponType)[0] ? getWeaponsByType(state.augmentWeaponType)[0].id : "";
      renderAll();
      return;
    }
    if (event.target.id === "augment-weapon-id") {
      state.augmentWeaponId = event.target.value;
      renderAll();
      return;
    }
    if (event.target.dataset.augmentField) updateAugmentField(event.target);
  }

  function handleAugmentInput(event) {
    var draft;
    if (event.target.id === "augment-notes") {
      draft = getAugmentDraft(getWeaponById(state.augmentWeaponId));
      if (draft) draft.notes = event.target.value;
      renderMeta();
      return;
    }
    if (event.target.dataset.augmentField) updateAugmentField(event.target);
  }

  function updateAugmentField(input) {
    var draft = getAugmentDraft(getWeaponById(state.augmentWeaponId));
    var categoryKey = input.dataset.augmentCategory;
    var index = Number(input.dataset.augmentIndex);
    var option;
    if (!draft || !categoryKey || Number.isNaN(index) || !input.dataset.augmentField) return;
    if (!draft.config[categoryKey]) draft.config[categoryKey] = { kind: categoryKey, categoryId: "", options: [] };
    option = draft.config[categoryKey].options[index];
    if (!option) return;
    assignPathValue(option, input.dataset.augmentField, input.value);
    renderMeta();
  }

  function handleAugmentClick(event) {
    var weapon = getWeaponById(state.augmentWeaponId);
    var draft = getAugmentDraft(weapon);
    var key;
    var baseConfig;
    if (!weapon || !draft) return;
    if (event.target.dataset.augmentAddRow) {
      key = event.target.dataset.augmentAddRow;
      if (!draft.config[key]) draft.config[key] = { kind: key, categoryId: "", options: [] };
      draft.config[key].options.push({
        level: getNextAugmentLevel(draft.config[key]),
        cost: 0,
        value: key === "slotUnlock" ? undefined : 0,
        slotBonus: key === "slotUnlock" ? {} : undefined
      });
      renderAugmentPanel();
      renderMeta();
      return;
    }
    if (event.target.dataset.augmentRemoveRow !== undefined) {
      key = event.target.dataset.augmentRemoveRow;
      draft.config[key].options.splice(Number(event.target.dataset.augmentIndex), 1);
      renderAugmentPanel();
      renderMeta();
      return;
    }
    if (event.target.dataset.augmentResetCategory) {
      key = event.target.dataset.augmentResetCategory;
      baseConfig = getBaseAugmentConfig(weapon);
      if (baseConfig[key]) draft.config[key] = clone(baseConfig[key]);
      else delete draft.config[key];
      renderAugmentPanel();
      renderMeta();
      return;
    }
    if (event.target.id === "save-augment-override") saveAugmentOverride(weapon, draft);
    if (event.target.id === "delete-augment-override") deleteAugmentOverride(weapon);
    if (event.target.id === "reset-augment-draft") {
      resetAugmentDraft(weapon);
      renderAugmentPanel();
      renderMeta();
    }
  }

  function saveAugmentOverride(weapon, draft) {
    state.draftPayload.weaponAugmentOverrides[weapon.id] = {
      weaponId: weapon.id,
      name: weapon.name,
      weaponType: weapon.weaponType,
      customTableNo: weapon.customTableNo == null ? null : weapon.customTableNo,
      notes: draft.notes || "",
      config: clone(draft.config),
      updatedAt: Date.now()
    };
    persistDraftPayload();
    renderAll();
  }

  function getNextAugmentLevel(category) {
    var maxLevel = (category.options || []).reduce(function (max, option) {
      return Math.max(max, Number(option.level || 0));
    }, 0);
    return maxLevel + 1;
  }

  function deleteAugmentOverride(weapon) {
    delete state.draftPayload.weaponAugmentOverrides[weapon.id];
    resetAugmentDraft(weapon);
    persistDraftPayload();
    renderAll();
  }

  function handleBowgunChange(event) {
    if (event.target.id === "bowgun-weapon-type") {
      state.bowgunWeaponType = event.target.value;
      state.bowgunWeaponId = getWeaponsByType(state.bowgunWeaponType)[0] ? getWeaponsByType(state.bowgunWeaponType)[0].id : "";
      renderAll();
      return;
    }
    if (event.target.id === "bowgun-weapon-id") {
      state.bowgunWeaponId = event.target.value;
      renderAll();
    }
  }

  function handleBowgunInput(event) {
    var draft = getBowgunDraft(getWeaponById(state.bowgunWeaponId));
    var ammo;
    var field;
    var index;
    if (!draft) return;
    if (event.target.id === "bowgun-notes") draft.notes = event.target.value;
    else if (event.target.id === "bowgun-reload") draft.bowgun.reload = toNumber(event.target.value);
    else if (event.target.id === "bowgun-recoil") draft.bowgun.recoil = toNumber(event.target.value);
    else if (event.target.id === "bowgun-fluctuation") draft.bowgun.fluctuation = event.target.value;
    else if (event.target.id === "bowgun-special-ammo") draft.bowgun.specialAmmo = event.target.value;
    else if (event.target.id === "bowgun-rapid-fire") {
      draft.bowgun.rapidFire = event.target.value.split(/\r?\n/).map(function (entry) { return entry.trim(); }).filter(Boolean);
    } else if (event.target.dataset.bowgunAmmoField !== undefined) {
      index = Number(event.target.dataset.bowgunAmmoIndex);
      field = event.target.dataset.bowgunAmmoField;
      ammo = draft.bowgun.ammo[index];
      if (!ammo || !field) return;
      ammo[field] = field === "capacity" ? toNumber(event.target.value) : event.target.value;
    }
    renderMeta();
  }

  function handleBowgunClick(event) {
    var weapon = getWeaponById(state.bowgunWeaponId);
    var draft = getBowgunDraft(weapon);
    if (!weapon || !draft) return;
    if (event.target.dataset.bowgunRemoveAmmo !== undefined) {
      draft.bowgun.ammo.splice(Number(event.target.dataset.bowgunRemoveAmmo), 1);
      renderBowgunPanel();
      renderMeta();
      return;
    }
    if (event.target.id === "add-bowgun-ammo") {
      draft.bowgun.ammo.push({ name: "", capacity: 0, recoilLabel: "", reloadLabel: "", handling: "" });
      renderBowgunPanel();
      renderMeta();
      return;
    }
    if (event.target.id === "save-bowgun-override") saveBowgunOverride(weapon, draft);
    if (event.target.id === "delete-bowgun-override") deleteBowgunOverride(weapon);
    if (event.target.id === "reset-bowgun-draft") {
      resetBowgunDraft(weapon);
      renderBowgunPanel();
      renderMeta();
    }
  }

  function saveBowgunOverride(weapon, draft) {
    state.draftPayload.bowgunOverrides[weapon.id] = {
      weaponId: weapon.id,
      name: weapon.name,
      weaponType: weapon.weaponType,
      notes: draft.notes || "",
      bowgun: normalizeBowgunData(draft.bowgun),
      updatedAt: Date.now()
    };
    persistDraftPayload();
    renderAll();
  }

  function deleteBowgunOverride(weapon) {
    delete state.draftPayload.bowgunOverrides[weapon.id];
    resetBowgunDraft(weapon);
    persistDraftPayload();
    renderAll();
  }

  function assignPathValue(target, path, rawValue) {
    var segments = path.split(".");
    var cursor = target;
    var key;
    var value;
    while (segments.length > 1) {
      key = segments.shift();
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    }
    key = segments[0];
    value = rawValue === "" ? undefined : toNumber(rawValue);
    if (value === undefined) delete cursor[key];
    else cursor[key] = value;
    if (target.slotBonus && Object.keys(target.slotBonus).length === 0) delete target.slotBonus;
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(state.draftPayload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mhsb-missing-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFromTextarea() {
    try {
      applyImportedPayload(JSON.parse(jsonPreview.value));
    } catch (_error) {
      alert("JSON の形式が不正です。");
    }
  }

  function importJsonFromFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    file.text().then(function (text) {
      try {
        applyImportedPayload(JSON.parse(text));
      } catch (_error) {
        alert("JSON の読み込みに失敗しました。UTF-8 形式か確認してください。");
      }
    });
    event.target.value = "";
  }

  function applyImportedPayload(parsed) {
    state.draftPayload = normalizePayload(parsed);
    state.augmentDrafts = {};
    state.bowgunDrafts = {};
    persistDraftPayload();
    renderAll();
  }

  function applyDraftToMain() {
    persistAppliedPayload(clone(state.draftPayload));
    alert("下書き内容を本体用データとして保存しました。本体シミュレーターへ戻ると反映されます。");
  }

  function clearAppliedData() {
    if (!confirm("本体へ反映中の未設定データを削除します。よろしいですか？")) return;
    state.appliedPayload = clone(EMPTY_PAYLOAD);
    localStorage.removeItem(APPLIED_STORAGE_KEY);
    renderMeta();
  }

  function clearAllData() {
    if (!confirm("下書き保存と本体反映の両方をすべて削除します。よろしいですか？")) return;
    state.draftPayload = clone(EMPTY_PAYLOAD);
    state.appliedPayload = clone(EMPTY_PAYLOAD);
    state.augmentDrafts = {};
    state.bowgunDrafts = {};
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem(APPLIED_STORAGE_KEY);
    renderAll();
  }
})();
