# Addon Specification: Elemental & Artifacts (Bedrock 1.21+)

## Overview
**Elemental & Artifacts** is a feature-rich, high-quality Minecraft Bedrock Edition Addon designed for Minecraft 1.21+. It introduces powerful elemental magic wands, legendary weapons, custom ores, ritual altars, elemental projectiles, and a formidable custom boss mob: the **Elemental Golem Boss**.

---

## Pack Structure
- **Behavior Pack (`elemental_bp`)**: Contains entity behaviors, item mechanics, block properties, recipes, and loot tables.
- **Resource Pack (`elemental_rp`)**: Contains textures, geometry models, render controllers, client entities, sound mappings, and localization (`es_ES` and `en_US`).

---

## 1. Custom Items
1. `elemental:inferno_wand` (Báculo de Fuego)
   - Category: Equipment / Weapons
   - Mechanics: Shoots `elemental:fire_projectile` on use.
2. `elemental:frost_wand` (Báculo de Hielo)
   - Category: Equipment / Weapons
   - Mechanics: Shoots `elemental:ice_projectile` on use (freezes/slows targets).
3. `elemental:storm_wand` (Báculo de Tormenta)
   - Category: Equipment / Weapons
   - Mechanics: Shoots `elemental:lightning_projectile` on use (summons lightning strike).
4. `elemental:voidblade` (Espada del Vacío)
   - Category: Equipment / Weapons
   - High melee damage, high durability, futuristic dark pixel texture.
5. `elemental:elemental_core` (Núcleo Elemental)
   - Category: Items / Crafting Material
   - Dropped by Elemental Ore and Boss; used in crafting high-tier artifacts.

---

## 2. Custom Blocks
1. `elemental:elemental_ore` (Mena Elemental)
   - Spawns in overworld / craftable. Drops `elemental:elemental_core`.
2. `elemental:elemental_altar` (Altar Elemental)
   - Decorative ritual block with unique pixel art textures.

---

## 3. Custom Entities & Projectiles
1. `elemental:elemental_boss` (Gólem Elemental)
   - Boss Entity with high HP, custom attack behaviors, unique loot table dropping Voidblade components and cores.
2. `elemental:fire_projectile`
   - Projectile that sets targets on fire and explodes/deals damage.
3. `elemental:ice_projectile`
   - Projectile that applies slowness and deals damage.
4. `elemental:lightning_projectile`
   - Projectile that summons lightning on impact.

---

## 4. UUIDs and Namespaces
- **Namespace**: `elemental`
- **Behavior Pack UUID**: `8f4b1230-01a2-4c8d-9001-e28a1a31b001`
- **Resource Pack UUID**: `8f4b1230-01a2-4c8d-9002-e28a1a31b002`
- **BP Module UUID**: `8f4b1230-01a2-4c8d-9003-e28a1a31b003`
- **RP Module UUID**: `8f4b1230-01a2-4c8d-9004-e28a1a31b004`
- **Format Version**: `1.21.0` / `2`
