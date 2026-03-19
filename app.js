(function initApp() {
  const {
    pieces,
    decorations,
    rampageDecorations,
    slots,
    sharpness,
    skillCaps,
    allSkills = [],
    weaponAugmentTables = {},
    weaponAugmentBudget = {},
  } = window.MHSB_DATA;
  const equipmentRoot = document.getElementById("equipment-grid");
  const summaryRoot = document.getElementById("skill-summary");
  const damageForm = document.getElementById("damage-form");
  const damageOutput = document.getElementById("damage-output");
  const presetPanel = document.getElementById("preset-panel");
  const presetSelect = document.getElementById("preset-select");
  const presetNameInput = document.getElementById("preset-name");
  const presetSaveButton = document.getElementById("preset-save");
  const presetUpdateButton = document.getElementById("preset-update");
  const presetApplyButton = document.getElementById("preset-apply");
  const presetDeleteButton = document.getElementById("preset-delete");

  const PRESET_STORAGE_KEY = "mhsb_presets_v1";
  const LAST_STATE_KEY = "mhsb_last_state_v1";

  const nonePiece = { id: "none", name: "なし", slots: [], skills: {} };
  const armorSlotKeys = ["head", "chest", "arms", "waist", "legs"];
  armorSlotKeys.forEach((slotKey) => {
    if (!pieces[slotKey]) {
      pieces[slotKey] = [];
    }
    if (!pieces[slotKey].length || pieces[slotKey][0].id !== `${slotKey}-none`) {
      pieces[slotKey].unshift({ ...nonePiece, id: `${slotKey}-none` });
    }
  });

  if (!pieces.charm) {
    pieces.charm = [{ ...nonePiece, id: "charm-none" }];
  } else if (!pieces.charm.length || pieces.charm[0].id !== "charm-none") {
    pieces.charm.unshift({ ...nonePiece, id: "charm-none" });
  }

  if (!slots.some((slot) => slot.key === "charm")) {
    slots.push({ key: "charm", label: "護石" });
  }

  const state = {
    selectedWeaponType: "",
    rampageDecoration: "none",
    selected: Object.fromEntries(slots.map(({ key }) => [key, pieces[key][0]?.id ?? ""])),
    decorations: {},
    weaponAugment: {},
    armorAugment: {},
    presets: [],
    activePresetId: "",
  };

  const preferredWeaponOrder = [
    "大剣",
    "太刀",
    "片手剣",
    "双剣",
    "ハンマー",
    "狩猟笛",
    "ランス",
    "ガンランス",
    "スラッシュアックス",
    "チャージアックス",
    "操虫棍",
    "ライトボウガン",
    "ヘビィボウガン",
    "弓",
  ];

  const weaponTypes = preferredWeaponOrder.filter((weaponType) =>
    pieces.weapon.some((weapon) => weapon.weaponType === weaponType)
  );
  state.selectedWeaponType = weaponTypes[0] ?? "";
  state.selected.weapon =
    pieces.weapon.find((weapon) => weapon.weaponType === state.selectedWeaponType)?.id ?? "";

  const excludedArmorAugmentSkills = new Set([
    "伏魔響命",
    "狂化",
    "弓溜め段階解放",
    "雷紋の一致",
    "風紋の一致",
    "風雷合一",
    "天衣無崩",
    "血氣覚醒",
  ]);

  const armorSkillOptions = collectSkillOptions(excludedArmorAugmentSkills);
  const charmSkillOptions = collectSkillOptions(null);

  function collectSkillOptions(excludedSet) {
    return allSkills
      .filter((skillName) => skillName && !(excludedSet && excludedSet.has(skillName)))
      .sort((a, b) => a.localeCompare(b, "ja"));
  }

  function getVisibleWeapons() {
    return pieces.weapon.filter((weapon) => weapon.weaponType === state.selectedWeaponType);
  }

  function getPiece(slotKey) {
    return pieces[slotKey].find((piece) => piece.id === state.selected[slotKey]) ?? null;
  }

  function getWeaponAugmentState() {
    if (!state.weaponAugment[state.selected.weapon]) {
      state.weaponAugment[state.selected.weapon] = {};
    }
    return state.weaponAugment[state.selected.weapon];
  }

  function getArmorAugmentState(slotKey) {
    if (!state.armorAugment[slotKey]) {
      state.armorAugment[slotKey] = {
        extraSlots: [0, 0, 0],
        addSkillName: "",
        addSkillLevel: 1,
        addSkillName2: "",
        addSkillLevel2: 1,
        minusSkillName: "",
        minusSkillLevel: 1,
      };
    }
    return state.armorAugment[slotKey];
  }

  function getDecorationOptions(slotSize) {
    return decorations.filter((deco) => deco.slotSize <= slotSize);
  }

  function getRampageDecorationOptions(piece) {
    if (!piece?.rampageSlot) {
      return [rampageDecorations[0]];
    }
    return rampageDecorations.filter((deco) => {
      if (deco.id === "none") {
        return true;
      }
      return deco.slotSize <= piece.rampageSlot && deco.weaponTypes.includes(piece.weaponType);
    });
  }

  function ensureDecorationState(slotKey, piece) {
    const count = piece?.slots?.length ?? 0;
    const current = state.decorations[slotKey] ?? [];
    state.decorations[slotKey] = Array.from({ length: count }, (_, index) => current[index] ?? "none");
  }

  function addSkills(target, skillsToAdd) {
    Object.entries(skillsToAdd || {}).forEach(([skillName, level]) => {
      target[skillName] = (target[skillName] ?? 0) + level;
    });
  }

  function getWeaponAugmentConfig(piece) {
    if (!piece) {
      return {};
    }
    const directConfig = { ...(weaponAugmentTables[piece.customTableNo] ?? {}) };
    const genericRampageConfig =
      ((getPiece("weapon")?.rampageSlot || piece.rampageSlot || 0) < 3)
        ? {
            rampageSlot: {
              categoryId: 9,
              options: [
                { level: 1, value: 1, cost: 4 },
                { level: 2, value: 2, cost: 7 },
              ],
            },
          }
        : {};

    if (piece.weaponType === "ライトボウガン" || piece.weaponType === "ヘビィボウガン") {
      return {
        attack: {
          categoryId: 1,
          options: [
            { level: 1, value: 5, cost: 2 },
            { level: 2, value: 10, cost: 4 },
            { level: 3, value: 15, cost: 6 },
            { level: 4, value: 20, cost: 8 },
          ],
        },
        affinity: {
          categoryId: 2,
          options: [
            { level: 1, value: 5, cost: 3 },
            { level: 2, value: 10, cost: 6 },
            { level: 3, value: 15, cost: 8 },
          ],
        },
        ...genericRampageConfig,
      };
    }
    return {
      ...directConfig,
      ...genericRampageConfig,
    };
  }

  function getWeaponBudget(piece) {
    return weaponAugmentBudget[String(piece?.rarity ?? "")] ?? 0;
  }

  function getVisibleWeaponAugmentEntries(piece) {
    return Object.entries(getWeaponAugmentConfig(piece)).filter(([key]) => {
      if (key === "sharpness" && (piece.weaponType === "ライトボウガン" || piece.weaponType === "ヘビィボウガン")) {
        return false;
      }
      if (key === "special_3" && !(piece.element || piece.status)) {
        return false;
      }
      if (key === "special_4" && !piece.status) {
        return false;
      }
      if (key === "special_8" && !(piece.element || piece.status)) {
        return false;
      }
      if (key === "special_5") {
        return piece.weaponType === "ガンランス";
      }
      return true;
    });
  }

  function getWeaponUsedBudget(piece) {
    const config = getWeaponAugmentConfig(piece);
    const selected = getWeaponAugmentState();
    return Object.entries(selected).reduce((sum, [key, level]) => {
      if (!level) {
        return sum;
      }
      const option = config[key]?.options?.find((entry) => entry.level === level);
      return sum + (option?.cost ?? 0);
    }, 0);
  }

  function applySlotUnlock(summary, piece, option) {
    const slotBonus = option.slotBonus || {};
    summary.slotBonusAttack += slotBonus.attack ?? 0;
    summary.slotBonusAttribute +=
      (slotBonus.special_3 ?? 0) +
      (slotBonus.special_4 ?? 0) +
      (slotBonus.special_5 ?? 0) +
      (slotBonus.special_8 ?? 0);
    summary.quriousSlotLevel = Math.max(summary.quriousSlotLevel, option.level ?? 0);
  }

  function getWeaponAugmentSummary(piece) {
    const selected = getWeaponAugmentState();
    const config = getWeaponAugmentConfig(piece);
    const summary = {
      attack: 0,
      affinity: 0,
      attribute: 0,
      sharpness: 0,
      rampageSlot: 0,
      quriousSlotLevel: 0,
      slotBonusAttack: 0,
      slotBonusAttribute: 0,
      specials: [],
    };

    Object.entries(selected).forEach(([key, level]) => {
      if (!level) {
        return;
      }
      const option = config[key]?.options?.find((entry) => entry.level === level);
      if (!option) {
        return;
      }

      switch (key) {
        case "attack":
          summary.attack += option.value;
          break;
        case "affinity":
          summary.affinity += option.value;
          break;
        case "sharpness":
          summary.sharpness += option.value * 10;
          break;
        case "rampageSlot":
          summary.rampageSlot += option.value;
          break;
        case "slotUnlock":
          applySlotUnlock(summary, piece, option);
          break;
        default:
          if (key === "special_4" && piece.status) {
            summary.attribute += option.value;
          } else if ((key === "special_3" || key === "special_8") && piece.element) {
            summary.attribute += option.value;
          } else if (key === "special_5" && piece.weaponType !== "ガンランス" && (piece.element || piece.status)) {
            summary.attribute += option.value;
          } else {
            summary.specials.push({
              key,
              value: option.value,
            });
          }
          break;
      }
    });

    summary.attack += summary.slotBonusAttack;
    summary.attribute += summary.slotBonusAttribute;
    return summary;
  }

  function getEffectiveWeapon() {
    const piece = getPiece("weapon");
    if (!piece) {
      return null;
    }

    const augment = getWeaponAugmentSummary(piece);
    const effective = {
      ...piece,
      attack: piece.attack + augment.attack,
      affinity: piece.affinity + augment.affinity,
      rampageSlot: Math.min(3, (piece.rampageSlot || 0) + augment.rampageSlot),
      augment,
    };

    if (piece.element) {
      effective.element = {
        ...piece.element,
        value: piece.element.value + augment.attribute,
      };
    }
    if (piece.status) {
      effective.status = {
        ...piece.status,
        value: piece.status.value + augment.attribute,
      };
    }
    if (Array.isArray(piece.sharpness)) {
      effective.sharpness = [...piece.sharpness];
      effective.sharpness[effective.sharpness.length - 1] += augment.sharpness;
    }

    return effective;
  }

  function getEffectiveArmorPiece(slotKey) {
    const piece = getPiece(slotKey);
    const isCharm = slotKey === "charm";
    if (!piece) {
      return null;
    }

    const augment = getArmorAugmentState(slotKey);
    const skills = { ...piece.skills };
    const slots = Array.from({ length: 3 }, (_, index) => {
      const baseLevel = piece.slots?.[index] ?? 0;
      const bonusLevel = Number(augment.extraSlots?.[index] ?? 0);
      return Math.min(4, baseLevel + bonusLevel);
    }).filter((level) => level > 0);

    if (augment.addSkillName) {
      skills[augment.addSkillName] = (skills[augment.addSkillName] ?? 0) + Number(augment.addSkillLevel || 0);
    }
    if (augment.addSkillName2) {
      skills[augment.addSkillName2] = (skills[augment.addSkillName2] ?? 0) + Number(augment.addSkillLevel2 || 0);
    }
    if (!isCharm && augment.minusSkillName) {
      skills[augment.minusSkillName] = (skills[augment.minusSkillName] ?? 0) - Number(augment.minusSkillLevel || 0);
      if (skills[augment.minusSkillName] <= 0) {
        delete skills[augment.minusSkillName];
      }
    }

    return {
      ...piece,
      slots: slots.sort((a, b) => b - a),
      skills,
      augment,
    };
  }

  function aggregateSkills() {
    const totals = {};

    slots.forEach(({ key }) => {
      const piece = key === "weapon" ? getEffectiveWeapon() : getEffectiveArmorPiece(key);
      if (!piece) {
        return;
      }

      addSkills(totals, piece.skills);
      ensureDecorationState(key, piece);
      state.decorations[key].forEach((decorationId) => {
        const deco = decorations.find((entry) => entry.id === decorationId);
        if (deco) {
          addSkills(totals, deco.skills);
        }
      });
    });

    const weapon = getEffectiveWeapon();
    const rampageDeco = getRampageDecorationOptions(weapon).find(
      (entry) => entry.id === state.rampageDecoration
    );
    if (rampageDeco) {
      addSkills(totals, rampageDeco.skills);
    }

    const overcap = {};
    Object.keys(totals).forEach((skillName) => {
      const cap = skillCaps[skillName];
      if (cap && totals[skillName] > cap) {
        overcap[skillName] = totals[skillName] - cap;
        totals[skillName] = cap;
      }
      if (totals[skillName] <= 0) {
        delete totals[skillName];
      }
    });

    return { totals, overcap };
  }

  function formatSlots(piece) {
    if (!piece?.slots?.length) {
      return '<span class="chip">スロットなし</span>';
    }
    return piece.slots.map((slotSize) => `<span class="slot-badge">Lv${slotSize}</span>`).join("");
  }

  function formatSkills(skillsMap) {
    const entries = Object.entries(skillsMap || {});
    if (!entries.length) {
      return '<div class="empty">スキルなし</div>';
    }
    return entries
      .sort((a, b) => a[0].localeCompare(b[0], "ja"))
      .map(([skillName, level]) => `<span class="skill-badge">${skillName} Lv${level}</span>`)
      .join("");
  }

  function getWeaponAugmentLabel(piece, key, categoryId) {
    if (key === "attack") return "攻撃力強化";
    if (key === "affinity") return "会心率強化";
    if (key === "sharpness") return "切れ味強化";
    if (key === "slotUnlock") return "傀異スロット拡張";
    if (key === "rampageSlot") return "百竜装飾品スロット拡張";
    if (key === "special_4") return "状態異常強化";
    if (key === "special_8") return piece.status ? "双属性・状態異常強化" : "双属性強化";
    if (key === "special_3") return piece.status && !piece.element ? "状態異常強化" : "属性強化";
    if (key === "special_5" && piece.weaponType === "ガンランス" && !piece.element && !piece.status) {
      return "砲撃強化";
    }
    if (key === "special_5" && piece.weaponType === "ガンランス") {
      return "砲撃強化";
    }
    if (key === "special_5") return "属性・状態異常強化";
    if (piece.element) return "属性強化";
    if (piece.status) return "状態異常強化";
    return `特殊強化 ${categoryId}`;
  }

  function getSelectedCost(piece, key) {
    const config = getWeaponAugmentConfig(piece);
    const level = getWeaponAugmentState()[key] ?? 0;
    return config[key]?.options?.find((entry) => entry.level === level)?.cost ?? 0;
  }

  function formatWeaponAugmentOption(piece, key, option) {
    if (key === "slotUnlock") {
      const bonus = [];
      if (option.slotBonus?.attack) bonus.push(`攻撃+${option.slotBonus.attack}`);
      const attrBonus =
        (option.slotBonus?.special_3 ?? 0) +
        (option.slotBonus?.special_4 ?? 0) +
        (option.slotBonus?.special_5 ?? 0) +
        (option.slotBonus?.special_8 ?? 0);
      if (attrBonus) {
        bonus.push(`${piece.status ? "状態異常" : "属性"}+${attrBonus}`);
      }
      return `解放Lv${option.level} / cost ${option.cost}${bonus.length ? ` / ${bonus.join(" ")}` : ""}`;
    }
    if (key === "attack") return `+${option.value} / cost ${option.cost}`;
    if (key === "affinity") return `+${option.value}% / cost ${option.cost}`;
    if (key === "sharpness") return `+${option.value * 10} / cost ${option.cost}`;
    if (key === "rampageSlot") return `+${option.value} / cost ${option.cost}`;
    return `+${option.value} / cost ${option.cost}`;
  }

  function renderWeaponAugmentPanel(piece) {
    if (!piece) {
      return "";
    }

    const config = getWeaponAugmentConfig(piece);
    const selected = getWeaponAugmentState();
    const entries = getVisibleWeaponAugmentEntries(piece);
    if (!entries.length) {
      return "";
    }

    const absoluteBudget = getWeaponBudget(piece);
    const selectedSlotUnlockLevel = Number(selected.slotUnlock ?? 0);
    const budget = Math.min(absoluteBudget, 3 + selectedSlotUnlockLevel);
    const used = getWeaponUsedBudget(piece);
    const remain = budget - used;
    const summary = piece.augment ?? getWeaponAugmentSummary(piece);

    const notes = [];
    if (summary.attack) notes.push(`攻撃力 +${summary.attack}`);
    if (summary.affinity) notes.push(`会心率 +${summary.affinity}%`);
    if (summary.attribute) notes.push(`${piece.status ? "状態異常値" : "属性値"} +${summary.attribute}`);
    if (summary.rampageSlot) notes.push(`百竜スロット +${summary.rampageSlot}`);
    if (summary.quriousSlotLevel) notes.push(`傀異スロット ${3 + summary.quriousSlotLevel}`);
    if (summary.sharpness) notes.push(`切れ味 +${summary.sharpness}`);
    summary.specials.forEach((entry) =>
      notes.push(`${getWeaponAugmentLabel(piece, entry.key, Number(entry.key.replace("special_", "")) || 0)} +${entry.value}`)
    );

    const controls = entries
      .map(([key, category]) => {
        const label = getWeaponAugmentLabel(piece, key, category.categoryId);
        const currentCost = getSelectedCost(piece, key);
        return `
          <div class="augment-row">
            <div class="augment-label">${label}</div>
            <div class="augment-options">
              <button
                type="button"
                class="augment-chip ${(selected[key] ?? 0) === 0 ? "is-active" : ""}"
                data-weapon-augment-key="${key}"
                data-weapon-augment-level="0"
              >
                なし
              </button>
              ${category.options
                .map((option) => {
                  const active = (selected[key] ?? 0) === option.level;
                  const wouldUse = used - currentCost + option.cost;
                  const nextSlotUnlockLevel = key === "slotUnlock" ? option.level : selectedSlotUnlockLevel;
                  const nextBudget = Math.min(absoluteBudget, 3 + Number(nextSlotUnlockLevel || 0));
                  const exceedsRampageCap =
                    key === "rampageSlot" && ((piece.rampageSlot || 0) + option.value > 3);
                  const disabled = !active && (wouldUse > nextBudget || exceedsRampageCap);
                  return `
                    <button
                      type="button"
                      class="augment-chip ${active ? "is-active" : ""}"
                      data-weapon-augment-key="${key}"
                      data-weapon-augment-level="${option.level}"
                      ${disabled ? "disabled" : ""}
                    >
                      Lv${option.level} ${formatWeaponAugmentOption(piece, key, option)}
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="augment-panel">
        <div class="piece-summary">武器の傀異錬成</div>
        <div class="augment-budget ${remain < 0 ? "status-warn" : ""}">
          使用スロット ${used} / ${budget} ${remain >= 0 ? `（残り ${remain}）` : `（超過 ${Math.abs(remain)}）`}
        </div>
        ${controls}
        <div class="augment-summary">
          <span class="chip">傀異スロット上限 ${budget} / 10</span>
          ${notes.length ? notes.map((note) => `<span class="chip">${note}</span>`).join("") : '<span class="chip">未設定</span>'}
        </div>
      </div>
    `;
  }

  function renderArmorAugmentPanel(slotKey) {
    const augment = getArmorAugmentState(slotKey);
    const basePiece = getPiece(slotKey);
    const isCharm = slotKey === "charm";
    const optionsSource = isCharm ? charmSkillOptions : armorSkillOptions;
    const skillOptionsHtml = [
      '<option value="">なし</option>',
      ...optionsSource.map(
        (skillName) =>
          `<option value="${skillName}" ${augment.addSkillName === skillName ? "selected" : ""}>${skillName}</option>`
      ),
    ].join("");
    const skillOptionsHtml2 = [
      '<option value="">なし</option>',
      ...optionsSource.map(
        (skillName) =>
          `<option value="${skillName}" ${augment.addSkillName2 === skillName ? "selected" : ""}>${skillName}</option>`
      ),
    ].join("");
    const minusOptionsHtml = [
      '<option value="">なし</option>',
      ...Object.keys(basePiece?.skills || {})
        .sort((a, b) => a.localeCompare(b, "ja"))
        .map(
          (skillName) =>
            `<option value="${skillName}" ${augment.minusSkillName === skillName ? "selected" : ""}>${skillName}</option>`
        ),
    ].join("");
    const minusBlock = isCharm
      ? ""
      : `
          <label class="decoration-label">
            減算スキル
            <select data-armor-minus-name="${slotKey}" data-expandable-select="true">
              ${minusOptionsHtml}
            </select>
          </label>
          <label class="decoration-label">
            減算Lv
            <select data-armor-minus-level="${slotKey}">
              ${[1, 2, 3].map((level) => `<option value="${level}" ${level === augment.minusSkillLevel ? "selected" : ""}>Lv${level}</option>`).join("")}
            </select>
          </label>
        `;
    const slotControls = Array.from({ length: 3 }, (_, index) => {
      const baseLevel = basePiece?.slots?.[index] ?? 0;
      const currentBonus = Number(augment.extraSlots?.[index] ?? 0);
      return `
        <label class="decoration-label">
          ${isCharm ? "護石スロット" : "追加スロット"}${index + 1}
          <select data-armor-slot="${slotKey}" data-armor-slot-index="${index}">
            ${[0, 1, 2, 3, 4]
              .map((level) => {
                const totalLevel = baseLevel + level;
                const disabled = level > 0 && totalLevel > 4;
                const selected = level === currentBonus ? "selected" : "";
                return `<option value="${level}" ${selected} ${disabled ? "disabled" : ""}>${level ? `+${level} → Lv${Math.min(4, totalLevel)}` : "なし"}</option>`;
              })
              .join("")}
          </select>
        </label>
      `;
    }).join("");

    return `
      <div class="augment-panel">
        <div class="piece-summary">${isCharm ? "護石の設定" : "防具の傀異錬成"}</div>
        <div class="armor-augment-grid">
          ${slotControls}
          <label class="decoration-label">
            追加スキル
            <select data-armor-skill-name="${slotKey}" data-expandable-select="true">
              ${skillOptionsHtml}
            </select>
          </label>
          <label class="decoration-label">
            追加Lv
            <select data-armor-skill-level="${slotKey}">
              ${[1, 2, 3].map((level) => `<option value="${level}" ${level === augment.addSkillLevel ? "selected" : ""}>Lv${level}</option>`).join("")}
            </select>
          </label>
          <label class="decoration-label">
            追加スキル2
            <select data-armor-skill-name2="${slotKey}" data-expandable-select="true">
              ${skillOptionsHtml2}
            </select>
          </label>
          <label class="decoration-label">
            追加Lv2
            <select data-armor-skill-level2="${slotKey}">
              ${[1, 2, 3].map((level) => `<option value="${level}" ${level === augment.addSkillLevel2 ? "selected" : ""}>Lv${level}</option>`).join("")}
            </select>
          </label>
          ${minusBlock}
        </div>
        <div class="meta-text">${isCharm ? "護石は結果入力型です。各スロット1〜3に加算して反映します。" : "防具の傀異錬成は結果入力型です。追加スロットは既存のスロット1〜3に加算して反映します。"}</div>
      </div>
    `;
  }

  function renderEquipment(skills) {
    equipmentRoot.innerHTML = slots
      .map(({ key, label }) => {
        const piece = key === "weapon" ? getEffectiveWeapon() : getEffectiveArmorPiece(key);
        if (piece) {
          ensureDecorationState(key, piece);
        }

        const sourcePieces = key === "weapon" ? getVisibleWeapons() : pieces[key];
        const options = sourcePieces
          .map((entry) => {
            const optionLabel = key === "weapon" ? formatWeaponOptionLabel(entry) : formatArmorOptionLabel(entry);
            return `<option value="${entry.id}" ${entry.id === state.selected[key] ? "selected" : ""}>${optionLabel}</option>`;
          })
          .join("");

        const detailBits = [];
        if (key === "weapon" && piece) {
          detailBits.push(`<span class="chip">武器種: ${piece.weaponType}</span>`);
          detailBits.push(`<span class="chip">攻撃力 ${piece.attack}</span>`);
          detailBits.push(`<span class="chip">会心率 ${piece.affinity}%</span>`);
          detailBits.push(`<span class="chip">${formatWeaponAttribute(piece)}</span>`);
          detailBits.push(`<span class="chip">百竜スロット: ${piece.rampageSlot ? `Lv${piece.rampageSlot}` : "なし"}</span>`);
          detailBits.push(`<span class="chip">傀異スロット: ${3 + (piece.augment?.quriousSlotLevel ?? 0)}</span>`);
          if (piece.augment?.sharpness) {
            detailBits.push(`<span class="chip">切れ味補正 +${piece.augment.sharpness}</span>`);
          }
        }

        const rampageDecorationField =
          key === "weapon" && piece?.rampageSlot
            ? `
              <label class="decoration-label">
                百竜装飾品
                <select data-rampage-decoration="true" data-expandable-select="true">
                  ${getRampageDecorationOptions(piece)
                    .map((entry) => {
                      const selected = entry.id === state.rampageDecoration ? "selected" : "";
                      return `<option value="${entry.id}" ${selected}>${formatRampageDecorationOption(entry)}</option>`;
                    })
                    .join("")}
                </select>
              </label>
            `
            : "";

        const decorationFields = (piece?.slots ?? [])
          .map((slotSize, index) => {
            const decoOptions = getDecorationOptions(slotSize)
              .map((entry) => {
                const selected = state.decorations[key][index] === entry.id ? "selected" : "";
                return `<option value="${entry.id}" ${selected}>${entry.name}</option>`;
              })
              .join("");

            return `
              <label class="decoration-label">
                装飾品${index + 1} (Lv${slotSize})
                <select data-slot-key="${key}" data-decoration-index="${index}" data-expandable-select="true">
                  ${decoOptions}
                </select>
              </label>
            `;
          })
          .join("");

        return `
          <article class="piece-card">
            <div class="piece-header">
              <div class="piece-title">${label}</div>
              <div class="piece-type">${key === "weapon" ? piece?.weaponType ?? "武器" : "防具"}</div>
            </div>
            ${
              key === "weapon"
                ? `
                  <label>
                    武器種を選択
                    <select data-weapon-type="true" data-expandable-select="true">
                      ${weaponTypes
                        .map(
                          (weaponType) =>
                            `<option value="${weaponType}" ${weaponType === state.selectedWeaponType ? "selected" : ""}>${weaponType}</option>`
                        )
                        .join("")}
                    </select>
                  </label>
                `
                : ""
            }
            <label>
              ${label}を選択
              <select data-piece-slot="${key}" data-expandable-select="true">
                ${options}
              </select>
            </label>
            <div class="piece-meta">
              <div class="chip-row">${detailBits.join("")}</div>
              <div>
                <div class="piece-summary">スロット</div>
                <div class="slot-row">${formatSlots(piece)}</div>
              </div>
              <div>
                <div class="piece-summary">付与スキル</div>
                <div class="skill-row">${formatSkills(piece?.skills)}</div>
              </div>
              <div>
                <div class="piece-summary">装飾品</div>
                <div class="decoration-grid">
                  ${rampageDecorationField}
                  ${decorationFields || '<div class="empty">この装備に空きスロットはありません。</div>'}
                </div>
              </div>
              ${key === "weapon" ? renderWeaponAugmentPanel(piece) : renderArmorAugmentPanel(key)}
              ${key === "weapon" ? renderBowgunDetails(piece, skills) : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderSummary(skills, overcap) {
    const entries = Object.entries(skills).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0], "ja");
    });

    if (!entries.length) {
      summaryRoot.innerHTML = '<div class="empty">装備を選ぶとここに合計スキルが表示されます。</div>';
      return;
    }

    summaryRoot.innerHTML = entries
      .map(
        ([skillName, level]) => {
          const isOver = overcap && overcap[skillName] > 0;
          return `
          <div class="summary-item">
            <span>${skillName}</span>
            <strong class="${isOver ? "overcap" : ""}" ${isOver ? "style=\"color:#a13b26\"" : ""}>Lv${level}</strong>
          </div>
        `;
        }
      )
      .join("");
  }

  function renderDamage(skills) {
    const weapon = getEffectiveWeapon();
    if (!weapon) {
      damageOutput.innerHTML = '<div class="empty">武器を選択してください。</div>';
      return;
    }

    const formData = new FormData(damageForm);
    const motionValue = clampNumber(formData.get("motionValue"), 1, 500, 48);
    const hits = clampNumber(formData.get("hits"), 1, 20, 1);
    const hitzone = clampNumber(formData.get("hitzone"), 1, 100, 45);
    const elementHitzone = clampNumber(formData.get("elementHitzone"), 0, 100, 20);
    const sharpnessKey = formData.get("sharpness");
    const monsterState = formData.get("monsterState");
    const burstState = formData.get("burstState");
    const weakspotMode = formData.get("weakspot");

    const sharpnessState = sharpness[sharpnessKey] ?? sharpness.white;
    const weaponElement = weapon.element?.value ?? 0;
    const weaponStatus = weapon.status?.value ?? 0;
    const elementSkillName = weapon.element ? `${elementLabel(weapon.element.type)}属性攻撃強化` : null;

    const rawBoost = getAttackBoost(skills["攻撃"] ?? 0);
    const critEye = getCriticalEye(skills["見切り"] ?? 0);
    const agitator = monsterState === "enraged" ? getAgitator(skills["挑戦者"] ?? 0) : { raw: 0, affinity: 0 };
    const maximumMight = getMaximumMight(skills["渾身"] ?? 0);
    const latentPower = getLatentPower(skills["力の解放"] ?? 0);
    const burstBoost = burstState === "on" ? getBurst(weaponElement > 0, skills["連撃"] ?? 0) : { raw: 0, element: 0 };

    const weakspotApplies = weakspotMode === "force" || (weakspotMode === "auto" && hitzone >= 45);
    const wexAffinity = weakspotApplies ? getWeaknessExploit(skills["弱点特効"] ?? 0) : 0;

    const totalAffinity = clamp(
      weapon.affinity + critEye + agitator.affinity + maximumMight + latentPower.affinity + wexAffinity,
      -100,
      100
    );

    const critMultiplier = getCriticalBoost(skills["超会心"] ?? 0);
    const rawAttack = Math.floor((weapon.attack + rawBoost.flat + agitator.raw + burstBoost.raw) * rawBoost.multiplier);
    const expectedCritFactor =
      totalAffinity >= 0
        ? 1 + (totalAffinity / 100) * (critMultiplier - 1)
        : 1 + (totalAffinity / 100) * 0.25;

    const rawDamagePerHit = Math.floor(
      rawAttack * sharpnessState.raw * (motionValue / 100) * (hitzone / 100) * expectedCritFactor
    );

    const elementBoost = getElementBoost(elementSkillName ? skills[elementSkillName] ?? 0 : 0);
    const finalElementValue = weaponElement
      ? Math.floor((weaponElement + elementBoost.flat + burstBoost.element) * elementBoost.multiplier)
      : 0;
    const elementDamagePerHit = weaponElement
      ? Math.floor(finalElementValue * sharpnessState.element * (elementHitzone / 100))
      : 0;

    const totalPerHit = rawDamagePerHit + elementDamagePerHit;
    const totalDamage = totalPerHit * hits;

    damageOutput.innerHTML = `
      <div class="damage-card">
        1コンボ期待ダメージ
        <strong>${totalDamage}</strong>
      </div>
      <div class="damage-breakdown">
        <div>1ヒット: ${totalPerHit}</div>
        <div>物理: ${rawDamagePerHit} / 属性: ${elementDamagePerHit}</div>
        <div>表示攻撃力: ${rawAttack}</div>
        <div>会心率: ${totalAffinity}% / 会心補正期待値: ${expectedCritFactor.toFixed(3)}</div>
        <div>${weapon.element ? "属性値" : weapon.status ? "状態異常値" : "属性値"}: ${weapon.element ? finalElementValue : weaponStatus || 0}</div>
        ${
          weapon.augment?.sharpness
            ? `<div class="status-good">切れ味強化 +${weapon.augment.sharpness} は武器表示に反映済みです。色段階の自動判定は未対応です。</div>`
            : ""
        }
        <div class="meta-text">黒曜本の考え方に寄せた簡易計算です。モーション値、肉質、会心、属性を使って概算しています。</div>
      </div>
    `;
  }

    function serializeState() {
    return JSON.parse(
      JSON.stringify({
        selectedWeaponType: state.selectedWeaponType,
        selected: state.selected,
        decorations: state.decorations,
        weaponAugment: state.weaponAugment,
        armorAugment: state.armorAugment,
        rampageDecoration: state.rampageDecoration,
      })
    );
  }

  function normalizeSelection() {
    if (!weaponTypes.includes(state.selectedWeaponType)) {
      state.selectedWeaponType = weaponTypes[0] ?? "";
    }

    const chosenWeapon = pieces.weapon.find((weapon) => weapon.id === state.selected.weapon);
    if (chosenWeapon) {
      state.selectedWeaponType = chosenWeapon.weaponType;
    }

    if (!getVisibleWeapons().some((weapon) => weapon.id === state.selected.weapon)) {
      const firstWeapon = getVisibleWeapons()[0];
      if (firstWeapon) {
        state.selected.weapon = firstWeapon.id;
      }
    }

    slots.forEach(({ key }) => {
      if (!pieces[key].some((piece) => piece.id === state.selected[key])) {
        state.selected[key] = pieces[key][0]?.id ?? "";
      }
    });

    const weapon = getPiece("weapon");
    if (!getRampageDecorationOptions(weapon).some((entry) => entry.id === state.rampageDecoration)) {
      state.rampageDecoration = "none";
    }
  }

  function applySnapshot(snapshot) {
    if (!snapshot) {
      return;
    }
    state.selectedWeaponType = snapshot.selectedWeaponType ?? state.selectedWeaponType;
    state.selected = { ...state.selected, ...(snapshot.selected ?? {}) };
    state.decorations = snapshot.decorations ?? {};
    state.weaponAugment = snapshot.weaponAugment ?? {};
    state.armorAugment = snapshot.armorAugment ?? {};
    state.rampageDecoration = snapshot.rampageDecoration ?? "none";
    normalizeSelection();
  }

  function loadPresets() {
    if (!presetPanel) {
      return;
    }
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const payload = JSON.parse(raw);
      if (Array.isArray(payload)) {
        state.presets = payload;
      } else if (payload && Array.isArray(payload.presets)) {
        state.presets = payload.presets;
        state.activePresetId = payload.activePresetId ?? "";
      }
    } catch (error) {
      state.presets = [];
      state.activePresetId = "";
    }
  }

  function persistPresets() {
    if (!presetPanel) {
      return;
    }
    const payload = {
      presets: state.presets,
      activePresetId: state.activePresetId,
    };
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
  }

  function loadLastState() {
    if (!presetPanel) {
      return null;
    }
    try {
      const raw = localStorage.getItem(LAST_STATE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function saveLastState() {
    if (!presetPanel) {
      return;
    }
    localStorage.setItem(LAST_STATE_KEY, JSON.stringify(serializeState()));
  }

  function renderPresetControls() {
    if (!presetPanel) {
      return;
    }
    if (!presetSelect) {
      return;
    }
    const options = [
      '<option value="">(none)</option>',
      ...state.presets
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((preset) => `<option value="${preset.id}">${preset.name}</option>`),
    ];
    presetSelect.innerHTML = options.join("");
    presetSelect.value = state.activePresetId || "";

    const active = state.presets.find((preset) => preset.id === state.activePresetId);
    if (presetNameInput) {
      presetNameInput.value = active ? active.name : "";
    }

    const hasActive = Boolean(active);
    if (presetUpdateButton) presetUpdateButton.disabled = !hasActive;
    if (presetDeleteButton) presetDeleteButton.disabled = !hasActive;
    if (presetApplyButton) presetApplyButton.disabled = !presetSelect.value;
  }
  function renderAll() {
    const { totals, overcap } = aggregateSkills();
    renderEquipment(totals);
    renderSummary(totals, overcap);
    renderDamage(totals);
    saveLastState();
  }

  equipmentRoot.addEventListener("change", (event) => {
    const weaponType = event.target.dataset.weaponType;
    const rampageDecoration = event.target.dataset.rampageDecoration;
    const pieceSlot = event.target.dataset.pieceSlot;
    const slotKey = event.target.dataset.slotKey;
    const decorationIndex = event.target.dataset.decorationIndex;
    const armorSlot = event.target.dataset.armorSlot;
    const armorSlotIndex = event.target.dataset.armorSlotIndex;
    const armorSkillName = event.target.dataset.armorSkillName;
    const armorSkillName2 = event.target.dataset.armorSkillName2;
    const armorSkillLevel = event.target.dataset.armorSkillLevel;
    const armorSkillLevel2 = event.target.dataset.armorSkillLevel2;
    const armorMinusName = event.target.dataset.armorMinusName;
    const armorMinusLevel = event.target.dataset.armorMinusLevel;

    if (weaponType) {
      state.selectedWeaponType = event.target.value;
      const firstWeapon = getVisibleWeapons()[0];
      if (firstWeapon) {
        state.selected.weapon = firstWeapon.id;
      }
      state.decorations.weapon = [];
      state.rampageDecoration = "none";
  renderAll();
      return;
    }

    if (rampageDecoration) {
      state.rampageDecoration = event.target.value;
  renderAll();
      return;
    }

    if (pieceSlot) {
      state.selected[pieceSlot] = event.target.value;
      state.decorations[pieceSlot] = [];
      if (pieceSlot === "weapon") {
        state.rampageDecoration = "none";
      }
  renderAll();
      return;
    }

    if (slotKey && decorationIndex !== undefined) {
      state.decorations[slotKey][Number(decorationIndex)] = event.target.value;
  renderAll();
      return;
    }

    if (armorSlot && armorSlotIndex !== undefined) {
      getArmorAugmentState(armorSlot).extraSlots[Number(armorSlotIndex)] = Number(event.target.value);
      state.decorations[armorSlot] = [];
  renderAll();
      return;
    }

    if (armorSkillName) {
      getArmorAugmentState(armorSkillName).addSkillName = event.target.value;
      renderAll();
      return;
    }

    if (armorSkillName2) {
      getArmorAugmentState(armorSkillName2).addSkillName2 = event.target.value;
      renderAll();
      return;
    }

    if (armorSkillLevel) {
      getArmorAugmentState(armorSkillLevel).addSkillLevel = Number(event.target.value);
      renderAll();
      return;
    }

    if (armorSkillLevel2) {
      getArmorAugmentState(armorSkillLevel2).addSkillLevel2 = Number(event.target.value);
      renderAll();
      return;
    }

    if (armorMinusName) {
      getArmorAugmentState(armorMinusName).minusSkillName = event.target.value;
  renderAll();
      return;
    }

    if (armorMinusLevel) {
      getArmorAugmentState(armorMinusLevel).minusSkillLevel = Number(event.target.value);
  renderAll();
    }
  });

  equipmentRoot.addEventListener("click", (event) => {
    const key = event.target.dataset.weaponAugmentKey;
    const level = event.target.dataset.weaponAugmentLevel;
    if (!key || level === undefined) {
      return;
    }

    getWeaponAugmentState()[key] = Number(level);
    if (key === "rampageSlot") {
      state.rampageDecoration = "none";
    }
    renderAll();
  });

  damageForm.addEventListener("input", renderAll);

  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      state.activePresetId = presetSelect.value;
  renderPresetControls();
      persistPresets();
    });
  }

  if (presetSaveButton) {
    presetSaveButton.addEventListener("click", () => {
      const name = presetNameInput ? presetNameInput.value.trim() : "";
      if (!name) {
        return;
      }
      const data = serializeState();
      const existing = state.presets.find((preset) => preset.name === name);
      if (existing) {
        existing.data = data;
        existing.updatedAt = Date.now();
        state.activePresetId = existing.id;
      } else {
        const id = `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        state.presets.push({ id, name, data, updatedAt: Date.now() });
        state.activePresetId = id;
      }
      persistPresets();
  renderPresetControls();
    });
  }

  if (presetUpdateButton) {
    presetUpdateButton.addEventListener("click", () => {
      const active = state.presets.find((preset) => preset.id === state.activePresetId);
      if (!active) {
        return;
      }
      const name = presetNameInput ? presetNameInput.value.trim() : "";
      if (name) {
        active.name = name;
      }
      active.data = serializeState();
      active.updatedAt = Date.now();
      persistPresets();
  renderPresetControls();
    });
  }

  if (presetApplyButton) {
    presetApplyButton.addEventListener("click", () => {
      if (!presetSelect) {
        return;
      }
      const preset = state.presets.find((entry) => entry.id === presetSelect.value);
      if (!preset) {
        return;
      }
      state.activePresetId = preset.id;
      applySnapshot(preset.data);
  renderPresetControls();
  renderAll();
      persistPresets();
    });
  }

  if (presetDeleteButton) {
    presetDeleteButton.addEventListener("click", () => {
      if (!state.activePresetId) {
        return;
      }
      state.presets = state.presets.filter((preset) => preset.id !== state.activePresetId);
      state.activePresetId = "";
      persistPresets();
  renderPresetControls();
    });
  }

  document.addEventListener("focusin", (event) => {
    if (!event.target.matches("select[data-expandable-select]")) {
      return;
    }
    event.target.size = Math.min(10, event.target.options.length);
  });

  document.addEventListener("focusout", (event) => {
    if (!event.target.matches("select[data-expandable-select]")) {
      return;
    }
    event.target.size = 1;
  });

  document.addEventListener("change", (event) => {
    if (!event.target.matches("select[data-expandable-select]")) {
      return;
    }
    event.target.size = 1;
  });

  function clampNumber(rawValue, min, max, fallback) {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return clamp(parsed, min, max);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function elementLabel(type) {
    const map = {
      fire: "火",
      water: "水",
      thunder: "雷",
      ice: "氷",
      dragon: "龍",
      poison: "毒",
      paralyze: "麻痺",
      sleep: "睡眠",
      blast: "爆破",
    };
    return map[type] ?? type;
  }

  function formatWeaponAttribute(piece) {
    if (piece.element) {
      return `属性: ${elementLabel(piece.element.type)} ${piece.element.value}`;
    }
    if (piece.status) {
      return `状態異常: ${elementLabel(piece.status.type)} ${piece.status.value}`;
    }
    return "属性: なし";
  }

  function formatArmorOptionLabel(piece) {
    const skills = Object.entries(piece.skills || {})
      .map(([skillName, level]) => `${skillName}Lv${level}`)
      .join(" / ");
    return skills ? `${piece.name}（${skills}）` : piece.name;
  }

  function formatWeaponOptionLabel(piece) {
    const marker = getWeaponMarker(piece);
    return marker ? `${piece.name} ${marker}` : piece.name;
  }

  function formatRampageDecorationOption(piece) {
    const skills = Object.keys(piece.skills || {}).join(" / ");
    return skills ? `${piece.name}（${skills}）` : piece.name;
  }

  function getWeaponMarker(piece) {
    if (piece.element) {
      return {
        fire: "🔥",
        water: "💧",
        thunder: "⚡",
        ice: "❄",
        dragon: "🐉",
      }[piece.element.type] ?? "";
    }
    if (piece.status) {
      return {
        poison: "☠",
        paralyze: "⚡",
        sleep: "💤",
        blast: "💥",
      }[piece.status.type] ?? "";
    }
    return "";
  }

  function renderBowgunDetails(piece, skills) {
    if (!piece?.bowgun) {
      return "";
    }

    const recoilSkill = skills["反動軽減"] ?? 0;
    const reloadSkill = skills["装填速度"] ?? 0;
    const recoilAdjusted = Math.max(1, piece.bowgun.recoil - recoilSkill);
    const reloadAdjusted = Math.max(1, piece.bowgun.reload - reloadSkill);
    const recoilChanged = recoilAdjusted !== piece.bowgun.recoil;
    const reloadChanged = reloadAdjusted !== piece.bowgun.reload;

    return `
      <div class="bowgun-panel">
        <div class="piece-summary">ボウガン詳細</div>
        <div class="bowgun-meta">
          <div class="bowgun-meta-item">
            反動
            <div class="${recoilChanged ? "status-good" : "status-base"}">${formatRecoil(recoilAdjusted)}${recoilChanged ? ` (${formatRecoil(piece.bowgun.recoil)} → ${formatRecoil(recoilAdjusted)})` : ""}</div>
          </div>
          <div class="bowgun-meta-item">
            装填速度
            <div class="${reloadChanged ? "status-good" : "status-base"}">${formatReload(reloadAdjusted)}${reloadChanged ? ` (${formatReload(piece.bowgun.reload)} → ${formatReload(reloadAdjusted)})` : ""}</div>
          </div>
          <div class="bowgun-meta-item">
            ブレ
            <div>${formatFluctuation(piece.bowgun.fluctuation)}</div>
          </div>
          <div class="bowgun-meta-item">
            速射 / 特殊弾
            <div>${piece.bowgun.specialAmmo || "なし"}${piece.bowgun.rapidFire.length ? ` / 速射 ${piece.bowgun.rapidFire.join("、")}` : ""}</div>
          </div>
        </div>
        <div class="ammo-grid">
          ${piece.bowgun.ammo
            .map(
              (ammo) => `
                <div class="ammo-row">
                  <div>${ammo.name}</div>
                  <div>装填数 ${ammo.capacity}</div>
                  <div class="ammo-note">${ammo.handling || "通常"}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function formatRecoil(value) {
    const map = { 1: "小", 2: "中", 3: "大", 4: "特大", 5: "最大", 6: "最大" };
    return map[value] ?? `段階${value}`;
  }

  function formatReload(value) {
    const map = {
      1: "最速",
      2: "速い",
      3: "やや速い",
      4: "普通",
      5: "やや遅い",
      6: "遅い",
      7: "かなり遅い",
      8: "最遅",
    };
    return map[value] ?? `段階${value}`;
  }

  function formatFluctuation(value) {
    const map = {
      None: "なし",
      LeftLittle: "左 / 小",
      RightLittle: "右 / 小",
      LeftMuch: "左 / 大",
      RightMuch: "右 / 大",
      RightAndLeftLittle: "左右 / 小",
      RightAndLeftMuch: "左右 / 大",
    };
    return map[value] ?? value;
  }

  function getAttackBoost(level) {
    const table = {
      0: { flat: 0, multiplier: 1 },
      1: { flat: 3, multiplier: 1 },
      2: { flat: 6, multiplier: 1 },
      3: { flat: 9, multiplier: 1 },
      4: { flat: 7, multiplier: 1.05 },
      5: { flat: 8, multiplier: 1.06 },
      6: { flat: 9, multiplier: 1.08 },
      7: { flat: 10, multiplier: 1.1 },
    };
    return table[level] ?? table[0];
  }

  function getCriticalEye(level) {
    return [0, 5, 10, 15, 20, 25, 30, 40][level] ?? 0;
  }

  function getWeaknessExploit(level) {
    return [0, 15, 30, 50][level] ?? 0;
  }

  function getCriticalBoost(level) {
    return [1.25, 1.3, 1.35, 1.4][level] ?? 1.25;
  }

  function getAgitator(level) {
    const table = {
      0: { raw: 0, affinity: 0 },
      1: { raw: 4, affinity: 3 },
      2: { raw: 8, affinity: 5 },
      3: { raw: 12, affinity: 7 },
      4: { raw: 16, affinity: 10 },
      5: { raw: 20, affinity: 15 },
    };
    return table[level] ?? table[0];
  }

  function getMaximumMight(level) {
    return [0, 10, 20, 30][level] ?? 0;
  }

  function getLatentPower(level) {
    return { affinity: [0, 10, 20, 30, 40, 50][level] ?? 0 };
  }

  function getBurst(hasElement, level) {
    return {
      raw: [0, 10, 12, 15][level] ?? 0,
      element: hasElement ? [0, 8, 10, 15][level] ?? 0 : 0,
    };
  }

  function getElementBoost(level) {
    const table = {
      0: { flat: 0, multiplier: 1 },
      1: { flat: 2, multiplier: 1.05 },
      2: { flat: 3, multiplier: 1.1 },
      3: { flat: 4, multiplier: 1.15 },
      4: { flat: 4, multiplier: 1.18 },
      5: { flat: 4, multiplier: 1.2 },
    };
    return table[level] ?? table[0];
  }

        loadPresets();
  const lastState = loadLastState();
  if (lastState) {
    applySnapshot(lastState);
  }
  renderPresetControls();
  renderAll();
})();































