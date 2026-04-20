import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "mhrice.json"
BACKUP_SOURCE = ROOT / "mhrice.full.backup.json"
TARGET = ROOT / "data.js"

WEAPON_KEY_MAP = {
    "great_sword": ("GreatSword", "大剣"),
    "long_sword": ("LongSword", "太刀"),
    "short_sword": ("ShortSword", "片手剣"),
    "dual_blades": ("DualBlades", "双剣"),
    "hammer": ("Hammer", "ハンマー"),
    "horn": ("Horn", "狩猟笛"),
    "lance": ("Lance", "ランス"),
    "gun_lance": ("GunLance", "ガンランス"),
    "slash_axe": ("SlashAxe", "スラッシュアックス"),
    "charge_axe": ("ChargeAxe", "チャージアックス"),
    "insect_glaive": ("InsectGlaive", "操虫棍"),
    "light_bowgun": ("LightBowgun", "ライトボウガン"),
    "heavy_bowgun": ("HeavyBowgun", "ヘビィボウガン"),
    "bow": ("Bow", "弓"),
}

ARMOR_SLOT_MAP = {
    "Head": ("head", "armor_head_name_msg", "armor_head_name_msg_mr"),
    "Chest": ("chest", "armor_chest_name_msg", "armor_chest_name_msg_mr"),
    "Arm": ("arms", "armor_arm_name_msg", "armor_arm_name_msg_mr"),
    "Waist": ("waist", "armor_waist_name_msg", "armor_waist_name_msg_mr"),
    "Leg": ("legs", "armor_leg_name_msg", "armor_leg_name_msg_mr"),
}

ELEMENT_MAP = {
    "Fire": "fire",
    "Water": "water",
    "Thunder": "thunder",
    "Ice": "ice",
    "Dragon": "dragon",
}

STATUS_MAP = {
    "Poison": "poison",
    "Paralyze": "paralyze",
    "Sleep": "sleep",
    "Blast": "blast",
}

AMMO_INDEX_NAMES = [
    None,
    "通常弾1",
    "通常弾2",
    "通常弾3",
    "貫通弾1",
    "貫通弾2",
    "貫通弾3",
    "散弾1",
    "散弾2",
    "散弾3",
    "徹甲榴弾1",
    "徹甲榴弾2",
    "徹甲榴弾3",
    "拡散弾1",
    "拡散弾2",
    "拡散弾3",
    "毒弾1",
    "毒弾2",
    "麻痺弾1",
    "麻痺弾2",
    "睡眠弾1",
    "睡眠弾2",
    "減気弾1",
    "減気弾2",
    "回復弾1",
    "回復弾2",
    "鬼人弾",
    "硬化弾",
    "斬裂弾",
    "竜撃弾",
    "捕獲用麻酔弾",
    "火炎弾",
    "水冷弾",
    "電撃弾",
    "氷結弾",
    "滅龍弾",
    "貫通火炎弾",
    "貫通水冷弾",
    "貫通電撃弾",
    "貫通氷結弾",
    "貫通滅龍弾",
    "放散弾1",
    "放散弾2",
    "放散弾3",
    "鬼人硬化弾",
    "硬化鬼人弾",
    "重撃弾",
    "爆破弾",
    "鬼人会心弾",
    "硬化回復弾",
    "鉄蟲糸弾",
    "猟具生物弾",
]

AMMO_TYPE_NAME_MAP = {
    "Normal1": "通常弾1",
    "Normal2": "通常弾2",
    "Normal3": "通常弾3",
    "Kantsu1": "貫通弾1",
    "Kantsu2": "貫通弾2",
    "Kantsu3": "貫通弾3",
    "SanW1": "散弾1",
    "SanW2": "散弾2",
    "SanW3": "散弾3",
    "Tekko1": "徹甲榴弾1",
    "Tekko2": "徹甲榴弾2",
    "Tekko3": "徹甲榴弾3",
    "Kakusan1": "拡散弾1",
    "Kakusan2": "拡散弾2",
    "Kakusan3": "拡散弾3",
    "Doku1": "毒弾1",
    "Doku2": "毒弾2",
    "Mahi1": "麻痺弾1",
    "Mahi2": "麻痺弾2",
    "Sui1": "睡眠弾1",
    "Sui2": "睡眠弾2",
    "Genki1": "減気弾1",
    "Genki2": "減気弾2",
    "Kaifuku1": "回復弾1",
    "Kaifuku2": "回復弾2",
    "Kijin": "鬼人弾",
    "Kouka": "硬化弾",
    "Zanretsu": "斬裂弾",
    "Ryugeki": "竜撃弾",
    "Maseki": "捕獲用麻酔弾",
    "Fire": "火炎弾",
    "Water": "水冷弾",
    "Thunder": "電撃弾",
    "Ice": "氷結弾",
    "Dragon": "滅龍弾",
    "FireKantsu": "貫通火炎弾",
    "WaterKantsu": "貫通水冷弾",
    "ThunderKantsu": "貫通電撃弾",
    "IceKantsu": "貫通氷結弾",
    "DragonKantsu": "貫通滅龍弾",
}

BULLET_TYPE_NOTES = {
    "MovingReload": "移動装填",
    "MovingShot": "移動射撃",
    "MovingShotReload": "移動射撃/装填",
    "SingleAuto": "単発自動装填",
    "MovingReloadSingleAuto": "移動装填/単発自動装填",
    "MovingShotSingleAuto": "移動射撃/単発自動装填",
    "MovingShotReloadSingleAuto": "移動射撃/装填/単発自動装填",
}

STATIC_DATA = {
    "slots": [
        {"key": "weapon", "label": "武器"},
        {"key": "head", "label": "頭"},
        {"key": "chest", "label": "胴"},
        {"key": "arms", "label": "腕"},
        {"key": "waist", "label": "腰"},
        {"key": "legs", "label": "脚"},
    ],
    "sharpness": {
        "purple": {"label": "紫", "raw": 1.39, "element": 1.25},
        "white": {"label": "白", "raw": 1.32, "element": 1.15},
        "blue": {"label": "青", "raw": 1.2, "element": 1.0625},
        "green": {"label": "緑", "raw": 1.05, "element": 1.0},
    },
    "weaponAugmentBudget": {
        "10": 10,
    },
}


def parse_numeric_suffix(name: str) -> int | None:
    match = re.search(r"_(\d+)_Name$", name)
    if match:
        return int(match.group(1))
    return None


def build_name_map(entries):
    mapping = {}
    for entry in entries:
        numeric_id = parse_numeric_suffix(entry["name"])
        if numeric_id is None:
            continue
        text = entry["content"][0].strip()
        if not text or "#Rejected#" in text or "テスト用" in text:
            continue
        mapping[numeric_id] = text
    return mapping


def build_msg_index_map(entries):
    mapping = {}
    for index, entry in enumerate(entries):
        text = entry["content"][0].strip()
        if not text or "#Rejected#" in text or "テスト用" in text:
            continue
        mapping[index] = text
    return mapping


def expand_slots(slot_counts):
    slots = []
    for level, count in enumerate(slot_counts, start=1):
        slots.extend([level] * count)
    return sorted(slots, reverse=True)


def get_rampage_slot(slot_counts):
    for level in range(len(slot_counts), 0, -1):
        if slot_counts[level - 1]:
            return level
    return 0


def build_skill_names(data):
    skill_names = {}
    base_skill_names = build_name_map(data["player_skill_name_msg"]["entries"])
    mr_skill_names = build_name_map(data["player_skill_name_msg_mr"]["entries"])

    for skill_id, skill_name in base_skill_names.items():
        skill_names[("Skill", skill_id)] = skill_name

    for skill_id in range(200):
        skill_name = mr_skill_names.get(skill_id + 200)
        if skill_name:
            skill_names[("MrSkill", skill_id)] = skill_name

    return skill_names


def load_cap_source(primary_data):
    if isinstance(primary_data, dict) and "equip_skill" in primary_data:
        return primary_data
    if BACKUP_SOURCE.exists():
        return json.loads(BACKUP_SOURCE.read_text(encoding="utf-8"))
    return primary_data


def build_skill_caps(cap_source, skill_names):
    caps = {}
    for entry in cap_source.get("equip_skill", {}).get("param", []):
        skill_ref = entry.get("id")
        if not isinstance(skill_ref, dict):
            continue
        kind, skill_id = next(iter(skill_ref.items()))
        skill_name = skill_names.get((kind, skill_id))
        if not skill_name:
            continue
        caps[skill_name] = int(entry.get("max_level", 0)) + 1
    return caps


def build_weapons(data):
    weapons = []
    seen = set()
    for top_key, (id_key, label) in WEAPON_KEY_MAP.items():
        payload = data[top_key]
        base_name_map = build_name_map(payload["name"]["entries"])
        mr_name_map = build_name_map(payload["name_mr"]["entries"])
        for item in payload["base_data"]["param"]:
            layers = [item]
            current = item
            while isinstance(current, dict) and "base" in current:
                current = current["base"]
                layers.append(current)

            core = next(layer for layer in layers if isinstance(layer, dict) and "id" in layer)
            stat_layer = next(layer for layer in layers if isinstance(layer, dict) and "atk" in layer)
            element_layer = next(
                (layer for layer in layers if isinstance(layer, dict) and "main_element_type" in layer),
                {},
            )
            weapon_id = core["id"][id_key]
            if core["rare_type"] != 10:
                continue
            name = mr_name_map.get(weapon_id) or base_name_map.get(weapon_id)
            if not name:
                continue

            slots = expand_slots(stat_layer["slot_num_list"])
            rampage_slot = get_rampage_slot(stat_layer["hyakuryu_slot_num_list"])
            element_type = element_layer.get("main_element_type", "None")
            element_value = element_layer.get("main_element_val", 0)

            weapon = {
                "id": f"{top_key}-{weapon_id}",
                "name": name,
                "weaponType": label,
                "sortOrder": core["sort_id"],
                "rarity": core["rare_type"],
                "customTableNo": stat_layer["custom_table_no"],
                "attack": stat_layer["atk"],
                "affinity": stat_layer["critical_rate"],
                "slots": slots,
                "rampageSlot": rampage_slot,
                "skills": {},
            }
            if weapon["attack"] <= 0:
                continue

            sharpness_layer = next(
                (layer for layer in layers if isinstance(layer, dict) and "sharpness_val_list" in layer),
                None,
            )
            if sharpness_layer:
                weapon["sharpness"] = sharpness_layer["sharpness_val_list"]

            if stat_layer.get("def_bonus"):
                weapon["defense"] = stat_layer["def_bonus"]

            if element_type in ELEMENT_MAP and element_value > 0:
                weapon["element"] = {
                    "type": ELEMENT_MAP[element_type],
                    "value": element_value,
                }
            elif element_type in STATUS_MAP and element_value > 0:
                weapon["status"] = {
                    "type": STATUS_MAP[element_type],
                    "value": element_value,
                }
            else:
                weapon["element"] = None

            if top_key in {"light_bowgun", "heavy_bowgun"}:
                bowgun_layer = next(
                    layer for layer in layers if isinstance(layer, dict) and "bullet_equip_flag_list" in layer
                )
                ammo = []
                for index, (enabled, capacity, handling) in enumerate(
                    zip(
                        bowgun_layer["bullet_equip_flag_list"],
                        bowgun_layer["bullet_num_list"],
                        bowgun_layer["bullet_type_list"],
                    )
                ):
                    if not enabled or index >= len(AMMO_INDEX_NAMES) or not AMMO_INDEX_NAMES[index]:
                        continue
                    ammo.append(
                        {
                            "name": AMMO_INDEX_NAMES[index],
                            "capacity": capacity,
                            "handling": BULLET_TYPE_NOTES.get(handling, ""),
                        }
                    )

                weapon["bowgun"] = {
                    "reload": bowgun_layer["reload"],
                    "recoil": bowgun_layer["recoil"],
                    "fluctuation": bowgun_layer["fluctuation"],
                    "ammo": ammo,
                    "rapidFire": [
                        AMMO_TYPE_NAME_MAP.get(ammo_type, ammo_type)
                        for ammo_type in item.get("rapid_shot_list", [])
                        if ammo_type != "None"
                    ],
                    "specialAmmo": {
                        "Setti": "????",
                        "Gatling": "????",
                        "Snipe": "????",
                    }.get(item.get("unique_bullet") or item.get("heavy_bowgun_unique_bullet_type"), ""),
                }

            signature = (
                weapon["weaponType"],
                weapon["name"],
                weapon["attack"],
                weapon["affinity"],
                tuple(weapon["slots"]),
                weapon["rampageSlot"],
                tuple(weapon.get("sharpness", [])),
                tuple(sorted((weapon.get("element") or {}).items())),
                tuple(sorted((weapon.get("status") or {}).items())),
            )
            if signature in seen:
                continue
            seen.add(signature)
            weapons.append(weapon)

    return sorted(weapons, key=lambda item: (item["weaponType"], item["sortOrder"], item["name"]))


def build_armors(data, skill_names):
    armors = {slot_key: [] for slot_key, _, _ in ARMOR_SLOT_MAP.values()}
    seen = {slot_key: set() for slot_key in armors}

    name_maps = {
        part: (
            build_name_map(data[base_key]["entries"]),
            build_name_map(data[mr_key]["entries"]),
        )
        for part, (_, base_key, mr_key) in ARMOR_SLOT_MAP.items()
    }

    for armor in data["armor"]["param"]:
        if not armor["is_valid"] or armor["rare"] != 10:
            continue

        part = next(iter(armor["pl_armor_id"]))
        armor_id = armor["pl_armor_id"][part]
        slot_key = ARMOR_SLOT_MAP[part][0]
        base_name_map, mr_name_map = name_maps[part]
        name = mr_name_map.get(armor_id) or base_name_map.get(armor_id)
        if not name:
            continue

        skills = {}
        for skill_ref, level in zip(armor["skill_list"], armor["skill_lv_list"]):
            if skill_ref == "None" or not level:
                continue
            kind, skill_id = next(iter(skill_ref.items()))
            skill_name = skill_names.get((kind, skill_id))
            if not skill_name:
                continue
            skills[skill_name] = level

        slot_values = expand_slots(armor["decorations_num_list"])
        if not skills and not slot_values:
            continue

        signature = (name, tuple(slot_values), tuple(sorted(skills.items())))
        if signature in seen[slot_key]:
            continue
        seen[slot_key].add(signature)

        armors[slot_key].append(
            {
                "id": f"{slot_key}-{armor_id}",
                "name": name,
                "slots": slot_values,
                "skills": skills,
            }
        )

    for slot_key in armors:
        armors[slot_key].sort(key=lambda item: item["name"])

    return armors


def build_decorations(data, skill_names):
    base_name_map = build_name_map(data["decorations_name_msg"]["entries"])
    mr_name_map = build_name_map(data["decorations_name_msg_mr"]["entries"])

    decorations = [{"id": "none", "name": "なし", "slotSize": 0, "skills": {}}]

    for deco in data["decorations"]["param"]:
        deco_key, deco_id = next(iter(deco["id"].items()))
        if deco_key == "MrDeco":
            name = mr_name_map.get(deco_id + 200) or mr_name_map.get(deco_id) or base_name_map.get(deco_id)
        else:
            name = base_name_map.get(deco_id) or mr_name_map.get(deco_id)
        if not name:
            continue

        skills = {}
        for skill_ref, level in zip(deco["skill_id_list"], deco["skill_lv_list"]):
            if skill_ref == "None" or not level:
                continue
            kind, skill_id = next(iter(skill_ref.items()))
            skill_name = skill_names.get((kind, skill_id))
            if not skill_name:
                continue
            skills[skill_name] = level

        if deco_key == "MrDeco":
            name = format_generated_decoration_name(skills, deco["decoration_lv"], deco_id)
        elif not name:
            name = format_generated_decoration_name(skills, deco["decoration_lv"], deco_id)

        decorations.append(
            {
                "id": f"{deco_key.lower()}-{deco_id}",
                "name": name,
                "slotSize": deco["decoration_lv"],
                "skills": skills,
            }
        )

    decorations.sort(key=lambda item: (item["slotSize"], item["name"]))
    decorations.insert(0, decorations.pop(decorations.index(next(item for item in decorations if item["id"] == "none"))))
    return decorations


def format_generated_decoration_name(skills, slot_size, deco_id):
    skill_entries = list(skills.items())
    if not skill_entries:
        return f"装飾品【{slot_size}】#{deco_id}"

    if len(skill_entries) == 1:
        skill_name, level = skill_entries[0]
        return f"{skill_name}Lv{level}装飾品【{slot_size}】"

    joined = " / ".join(f"{skill_name}Lv{level}" for skill_name, level in skill_entries[:2])
    return f"{joined}装飾品【{slot_size}】"


def build_rampage_decorations(data):
    deco_name_map = build_name_map(data["hyakuryu_decos_name_msg"]["entries"])
    skill_name_map = {
        **build_name_map(data["hyakuryu_skill_name_msg"]["entries"]),
        **build_name_map(data["hyakuryu_skill_name_msg_mr"]["entries"]),
    }
    weapon_order = list(WEAPON_KEY_MAP.values())

    rampage_decos = [{"id": "none", "name": "なし", "slotSize": 0, "skills": {}, "weaponTypes": []}]

    for deco in data["hyakuryu_decos"]["param"]:
        deco_id = next(iter(deco["id"].values()))
        skill_ref = deco["hyakuryu_skill_id"]
        skill_id = next(iter(skill_ref.values()))
        deco_name = deco_name_map.get(deco_id)
        skill_name = skill_name_map.get(skill_id)
        if not deco_name or not skill_name:
            continue

        rampage_decos.append(
            {
                "id": f"rampage-{deco_id}",
                "name": deco_name,
                "sortOrder": deco["sort_id"],
                "slotSize": deco["decoration_lv"],
                "skills": {skill_name: 1},
                "weaponTypes": [
                    weapon_label
                    for enabled, (_, weapon_label) in zip(deco["weapon_equip_flag"], weapon_order)
                    if enabled
                ],
            }
        )

    rampage_decos.sort(key=lambda item: (item["slotSize"], item.get("sortOrder", -1), item["name"]))
    rampage_decos.insert(0, rampage_decos.pop(rampage_decos.index(next(item for item in rampage_decos if item["id"] == "none"))))
    return rampage_decos


def build_weapon_augment_tables(data):
    category_map = {
        1: {"key": "attack", "label": "attack"},
        2: {"key": "affinity", "label": "affinity"},
        3: {"key": "special_3", "label": "special"},
        4: {"key": "special_4", "label": "special"},
        5: {"key": "special_5", "label": "special"},
        6: {"key": "sharpness", "label": "sharpness"},
        7: {"key": "slotUnlock", "label": "slotUnlock"},
        8: {"key": "special_8", "label": "special"},
        9: {"key": "rampageSlot", "label": "rampageSlot"},
    }

    base_lookup = {
        (entry["table_no"], entry["id"]): entry
        for entry in data["custom_buildup_base"]["param"]
    }
    slot_bonus_lookup = {
        (entry["table_no"], entry["id"]): entry
        for entry in data["custom_buildup_slot_bonus"]["param"]
    }

    tables = {}
    for entry in data["custom_buildup_wep_table"]["param"]:
        category_info = category_map.get(entry["category_id"])
        if not category_info:
            continue

        table = tables.setdefault(entry["table_no"], {})
        options = []

        for augment_id in entry["id"]:
            if not augment_id:
                continue
            base_entry = base_lookup.get((entry["table_no"], augment_id))
            if not base_entry:
                continue

            option = {
                "id": augment_id,
                "level": base_entry["lv"],
                "cost": base_entry["cost"],
                "value": next((value for value in base_entry["value_table"] if value), 0),
                "categoryId": entry["category_id"],
            }

            slot_bonus = slot_bonus_lookup.get((entry["table_no"], augment_id))
            if slot_bonus:
                bonus = {}
                for category_id, value in zip(slot_bonus["category_id"], slot_bonus["value_table"]):
                    if not category_id or not value:
                        continue
                    category_bonus = category_map.get(category_id)
                    bonus[(category_bonus or {"key": f"category_{category_id}"})["key"]] = value
                option["slotBonus"] = bonus

            options.append(option)

        if options:
            table[category_info["key"]] = {
                "categoryId": entry["category_id"],
                "kind": category_info["label"],
                "options": options,
            }

    return tables


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    cap_source = load_cap_source(data)
    skill_names = build_skill_names(cap_source)
    all_skills = sorted(set(skill_names.values()))

    pieces = {"weapon": build_weapons(data)}
    pieces.update(build_armors(data, skill_names))

    payload = {
        "pieces": pieces,
        "decorations": build_decorations(data, skill_names),
        "rampageDecorations": build_rampage_decorations(data),
        "weaponAugmentTables": build_weapon_augment_tables(data),
        "allSkills": all_skills,
        "skillCaps": build_skill_caps(cap_source, skill_names),
        **STATIC_DATA,
    }

    TARGET.write_text(
        "window.MHSB_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )

    counts = {key: len(value) for key, value in pieces.items()}
    print(
        json.dumps(
            {
                "pieces": counts,
                "decorations": len(payload["decorations"]),
                "rampageDecorations": len(payload["rampageDecorations"]),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
