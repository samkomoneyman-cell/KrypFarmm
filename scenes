import { GAME_CONFIG } from "../core/config.js";
import { loadState, saveState, wipeState } from "../core/save.js";
import { START_UNLOCKED, SHOP_CATALOG, seedById, upgradeCost, computeGrowSec, computeYield } from "../core/economy.js";
import { nowMs, makeEmptyPlots, deploySeed, canClaim, claimAndReplant, seedLevel, isBoostActive } from "../core/model.js";

export class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  create() {
    this.state = this._defaultState();
    this._mergeSave(loadState());

    this._buildFrame();
    this._buildHUD();
    this._buildGrid();
    this._buildBottomBar();
    this._buildModal();

    this._applyOfflineEarnings();

    this.time.addEvent({ delay: 1500, loop: true, callback: () => this._persist() });
    this.time.addEvent({ delay: 250,  loop: true, callback: () => this._refreshAll() });

    this._refreshAll();
  }

  _defaultState() {
    const totalPlots = GAME_CONFIG.grid.cols * GAME_CONFIG.grid.rows;
    return {
      version: 2,
      credits: 150,
      energyCells: 2,
      selectedSeedId: "SOL",
      unlockedSeeds: [...START_UNLOCKED],
      seedLevels: {},
      plotsUnlocked: GAME_CONFIG.progression.startingPlotsUnlocked,
      plots: makeEmptyPlots(totalPlots),
      boost: { activeUntil: 0 },
      stats: { totalClaims: 0, totalEarned: 0 },
      meta: { lastSeenMs: nowMs() },
    };
  }

  _mergeSave(saved) {
    if (!saved) return;
    this.state = { ...this.state, ...saved };
    this.state.seedLevels = saved.seedLevels ?? this.state.seedLevels;
    this.state.unlockedSeeds = saved.unlockedSeeds ?? this.state.unlockedSeeds;
    this.state.plots = Array.isArray(saved.plots) ? saved.plots : this.state.plots;
    this.state.meta = saved.meta ?? this.state.meta;
    this.state.boost = saved.boost ?? this.state.boost;
    this.state.stats = saved.stats ?? this.state.stats;
  }

  _persist() {
    this.state.meta.lastSeenMs = nowMs();
    saveState(this.state);
  }

  _applyOfflineEarnings() {
    if (!GAME_CONFIG.offline.enabled) return;
    const last = this.state.meta?.lastSeenMs ?? nowMs();
    const elapsed = Math.min(GAME_CONFIG.offline.capMs, Math.max(0, nowMs() - last));
    if (elapsed < 5000) return;

    let gained = 0;
    for (let i = 0; i < this.state.plotsUnlocked; i++) {
      const p = this.state.plots[i];
      if (!p.seedId) continue;
      const seed = seedById(p.seedId);
      const lvl = seedLevel(this.state, seed.id);
      const cycleMs = computeGrowSec(seed, lvl) * 1000;
      const cycles = Math.floor(elapsed / cycleMs);
      if (cycles <= 0) continue;
      gained += cycles * computeYield(seed, lvl);
    }
    gained = Math.floor(gained * GAME_CONFIG.offline.efficiency);
    if (gained > 0) {
      this.state.credits += gained;
      this._toast(`Offline rewards: +${gained} FC`);
    }
  }

  // ---------- UI BUILD ----------
  _buildFrame() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x2cf6ff, 0.22);
    g.strokeRoundedRect(12, 12, GAME_CONFIG.width - 24, GAME_CONFIG.height - 24, 16);

    this.add.text(24, 18, "KrypFarm", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "22px",
      color: "#C8F7FF",
      fontStyle: "700",
    });
    this.add.text(24, 44, "Futuristic crypto farming outpost", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "12px",
      color: "rgba(255,255,255,0.65)",
    });
  }

  _buildHUD() {
    this.hudCredits = this.add.text(GAME_CONFIG.width - 24, 22, "", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "16px",
      color: "#FFFFFF",
    }).setOrigin(1, 0);

    this.hudEnergy = this.add.text(GAME_CONFIG.width - 24, 44, "", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "12px",
      color: "rgba(255,255,255,0.75)",
    }).setOrigin(1, 0);

    this.hudBoost = this.add.text(GAME_CONFIG.width - 24, 62, "", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "12px",
      color: "rgba(44,246,255,0.9)",
    }).setOrigin(1, 0);
  }

  _buildGrid() {
    this.plotViews = [];
    const { cols, rows, cellW, cellH, originX, originY, gapX, gapY } = GAME_CONFIG.grid;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = originX + c * (cellW + gapX);
        const y = originY + r * (cellH + gapY);

        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        const title = this.add.text(10, 10, "", this._txt12("#ffffff", 0.85));
        const sub = this.add.text(10, 30, "", this._txt12("#ffffff", 0.65));
        const action = this.add.text(10, cellH - 26, "", this._txt12("#2CF6FF", 1.0));

        const hit = this.add.rectangle(cellW / 2, cellH / 2, cellW, cellH, 0x000000, 0.001)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this._onPlotClick(idx));

        container.add([bg, title, sub, action, hit]);
        this.plotViews.push({ idx, bg, title, sub, action, w: cellW, h: cellH });
      }
    }
  }

  _buildBottomBar() {
    const barY = GAME_CONFIG.height - 72;

    const g = this.add.graphics();
    g.fillStyle(0x0b1223, 0.95);
    g.fillRoundedRect(18, barY, GAME_CONFIG.width - 36, 54, 14);
    g.lineStyle(1, 0x2cf6ff, 0.25);
    g.strokeRoundedRect(18, barY, GAME_CONFIG.width - 36, 54, 14);

    this.seedText = this.add.text(32, barY + 10, "", this._txt12("#ffffff", 0.85));

    this._makeButton(360, barY + 27, 92, 30, "Seeds",   () => this._openSeedPicker());
    this._makeButton(470, barY + 27, 92, 30, "Shop",    () => this._openShop());
    this._makeButton(580, barY + 27, 92, 30, "Upgrades",() => this._openUpgrades());
    this._makeButton(700, barY + 27, 92, 30, "Boost",   () => this._activateBoost());
    this._makeButton(820, barY + 27, 92, 30, "Reset",   () => this._reset());
  }

  _buildModal() {
    this.modal = this.add.container(0, 0).setVisible(false);

    const overlay = this.add.rectangle(0, 0, GAME_CONFIG.width, GAME_CONFIG.height, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setInteractive()
      .on("pointerdown", () => this._hideModal());

    const px = 120, py = 90, pw = GAME_CONFIG.width - 240, ph = GAME_CONFIG.height - 220;

    const panel = this.add.graphics();
    panel.fillStyle(0x0b1223, 0.98);
    panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(1, 0x2cf6ff, 0.35);
    panel.strokeRoundedRect(px, py, pw, ph, 16);

    this.modalTitle = this.add.text(px + 18, py + 14, "", {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "16px",
      color: "#C8F7FF",
    });

    this.modalList = this.add.container(px + 18, py + 52);
    this.modalFooter = this.add.text(px + 18, py + ph - 40, "", this._txt12("#ffffff", 0.6));

    this.modalClose = this._makeButton(px + pw - 104, py + 12, 86, 28, "Close", () => this._hideModal());

    this.modal.add([overlay, panel, this.modalTitle, this.modalList, this.modalFooter, this.modalClose]);
  }

  _txt12(color, alpha=1) {
    return {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "12px",
      color,
      alpha
    };
  }

  _makeButton(cx, cy, w, h, label, onClick) {
    const c = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0x101a33, 1);
    bg.fillRoundedRect(-w/2, -h/2, w, h, 10);
    bg.lineStyle(1, 0x2cf6ff, 0.35);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, 10);

    const t = this.add.text(0, 1, label, this._txt12("#ffffff", 1)).setOrigin(0.5, 0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onClick);

    c.add([bg, t, hit]);
    return c;
  }

  // ---------- GAMEPLAY ----------
  _plotUnlockCost() {
    const n = this.state.plotsUnlocked - GAME_CONFIG.progression.startingPlotsUnlocked;
    return Math.floor(GAME_CONFIG.progression.plotUnlockBaseCost * Math.pow(GAME_CONFIG.progression.plotUnlockCostMult, Math.max(0, n)));
  }

  _onPlotClick(idx) {
    // Locked plot -> unlock
    if (idx >= this.state.plotsUnlocked) {
      const cost = this._plotUnlockCost();
      if (this.state.credits < cost) return this._toast(`Not enough FC (need ${cost}).`);
      this.state.credits -= cost;
      this.state.plotsUnlocked += 1;
      this._toast(`Hash Plot unlocked (−${cost} FC).`);
      return;
    }

    const p = this.state.plots[idx];

    // Empty -> deploy selected
    if (!p.seedId) {
      const sid = this.state.selectedSeedId;
      if (!this.state.unlockedSeeds.includes(sid)) return this._toast("Seed locked.");
      deploySeed(this.state, idx, sid);
      this._toast(`Deployed ${sid}.`);
      return;
    }

    // Ready -> claim
    if (canClaim(this.state, idx)) {
      const res = claimAndReplant(this.state, idx, GAME_CONFIG.boost.yieldMultiplier);
      this._toast(`Claimed +${res.earned} FC${res.note ? ` (${res.note})` : ""}.`);
      return;
    }

    // Not ready
    const remain = Math.max(0, p.readyAtMs - nowMs());
    this._toast(`Maturing… ${Math.ceil(remain/1000)}s`);
  }

  _activateBoost() {
    if (isBoostActive(this.state)) return this._toast("Boost already active.");
    if (this.state.energyCells < GAME_CONFIG.boost.energyCellCost) return this._toast("Not enough Energy Cells.");

    this.state.energyCells -= GAME_CONFIG.boost.energyCellCost;
    this.state.boost.activeUntil = nowMs() + GAME_CONFIG.boost.durationMs;
    this._toast("Hash Booster active (x2 yield).");
  }

  _reset() {
    wipeState();
    this.scene.restart();
  }

  // ---------- MODALS (clickable lists; mobile-friendly) ----------
  _showModal(title, footer, items) {
    this.modalTitle.setText(title);
    this.modalFooter.setText(footer ?? "");
    this.modalList.removeAll(true);
    this.modal.setVisible(true);

    let y = 0;
    for (const it of items) {
      const row = this.add.container(0, y);

      const bg = this.add.graphics();
      bg.fillStyle(0x101a33, 1);
      bg.fillRoundedRect(0, 0, 540, 34, 10);
      bg.lineStyle(1, 0x2cf6ff, 0.22);
      bg.strokeRoundedRect(0, 0, 540, 34, 10);

      const label = this.add.text(12, 9, it.label, this._txt12("#ffffff", 0.88));
      const meta  = this.add.text(540 - 12, 9, it.meta ?? "", this._txt12("#C8F7FF", 0.95)).setOrigin(1, 0);

      const hit = this.add.rectangle(270, 17, 540, 34, 0x000000, 0.001)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => it.onClick());

      row.add([bg, label, meta, hit]);
      this.modalList.add(row);

      y += 42;
    }
  }

  _hideModal() { this.modal.setVisible(false); }

  _openSeedPicker() {
    const items = this.state.unlockedSeeds.map(sid => {
      const seed = seedById(sid);
      const lvl = seedLevel(this.state, sid);
      const t = computeGrowSec(seed, lvl).toFixed(0);
      const y = Math.floor(computeYield(seed, lvl));
      const selected = (sid === this.state.selectedSeedId);

      return {
        label: `${selected ? "✓ " : ""}${sid} — ${seed.name}`,
        meta: `Lvl ${lvl} • ${t}s • ${y} FC`,
        onClick: () => {
          this.state.selectedSeedId = sid;
          this._toast(`Selected ${sid}.`);
          this._hideModal();
        }
      };
    });

    this._showModal(
      "Seed Selection",
      "Tap a seed to select it. Then tap an empty plot to Deploy.",
      items
    );
  }

  _openShop() {
    const items = SHOP_CATALOG.map(entry => {
      const owned = this.state.unlockedSeeds.includes(entry.id);
      const seed = seedById(entry.id);
      return {
        label: `${entry.id} — ${seed.name}`,
        meta: owned ? "Owned" : `${entry.cost} FC`,
        onClick: () => {
          if (owned) return this._toast("Already owned.");
          if (this.state.credits < entry.cost) return this._toast("Not enough FC.");
          this.state.credits -= entry.cost;
          this.state.unlockedSeeds.push(entry.id);
          this._toast(`Unlocked ${entry.id}.`);
          this._openShop(); // refresh list
        }
      };
    });

    this._showModal(
      "Seed Shop",
      "Unlock new crypto-seeds (one-time). No real purchases.",
      items
    );
  }

  _openUpgrades() {
    const items = this.state.unlockedSeeds.map(sid => {
      const seed = seedById(sid);
      const lvl = seedLevel(this.state, sid);
      const cost = upgradeCost(sid, lvl);
      const t = computeGrowSec(seed, lvl).toFixed(0);
      const y = Math.floor(computeYield(seed, lvl));

      return {
        label: `${sid} — Protocol Upgrade`,
        meta: `Lvl ${lvl} • ${t}s • ${y} FC • ${cost} FC`,
        onClick: () => {
          if (this.state.credits < cost) return this._toast("Not enough FC.");
          this.state.credits -= cost;
          this.state.seedLevels[sid] = lvl + 1;
          this._toast(`${sid} upgraded to Lvl ${lvl + 1}.`);
          this._openUpgrades();
        }
      };
    });

    this._showModal(
      "Upgrades",
      "Rule: +20% yield per level, −3% time per level (min 50% base).",
      items
    );
  }

  // ---------- RENDER REFRESH ----------
  _refreshAll() {
    this.hudCredits.setText(`${Math.floor(this.state.credits)} FC`);
    this.hudEnergy.setText(`Energy Cells: ${this.state.energyCells}`);

    const remain = Math.max(0, (this.state.boost.activeUntil ?? 0) - nowMs());
    this.hudBoost.setText(remain > 0 ? `Boost: x2 (${Math.ceil(remain/1000)}s)` : "");

    const sel = seedById(this.state.selectedSeedId);
    const selLvl = seedLevel(this.state, sel.id);
    this.seedText.setText(`Selected: ${sel.id} — ${sel.name} (Lvl ${selLvl})`);

    for (const v of this.plotViews) {
      const locked = v.idx >= this.state.plotsUnlocked;

      v.bg.clear();
      v.bg.fillStyle(locked ? 0x0b0f1e : 0x0c1428, 1);
      v.bg.fillRoundedRect(0, 0, v.w, v.h, 14);
      v.bg.lineStyle(1, 0x2cf6ff, locked ? 0.18 : 0.30);
      v.bg.strokeRoundedRect(0, 0, v.w, v.h, 14);

      if (locked) {
        const cost = this._plotUnlockCost();
        v.title.setText("Locked Hash Plot");
        v.sub.setText(`Unlock: ${cost} FC`);
        v.action.setText("Tap to Unlock");
        continue;
      }

      const p = this.state.plots[v.idx];
      if (!p.seedId) {
        v.title.setText("Empty Plot");
        v.sub.setText("Tap to Deploy Seed");
        v.action.setText(`Deploy ${this.state.selectedSeedId}`);
        continue;
      }

      const seed = seedById(p.seedId);
      const lvl = seedLevel(this.state, seed.id);
      const remainMs = Math.max(0, p.readyAtMs - nowMs());

      v.title.setText(`${seed.id} • Lvl ${lvl}`);
      if (remainMs > 0) {
        v.sub.setText(`Maturing: ${Math.ceil(remainMs/1000)}s`);
        v.action.setText("Stabilize Network…");
      } else {
        const est = Math.floor(computeYield(seed, lvl) * (isBoostActive(this.state) ? GAME_CONFIG.boost.yieldMultiplier : 1));
        v.sub.setText("Ready: Claim Rewards");
        v.action.setText(`Claim (+~${est} FC)${p.lastNote ? ` • ${p.lastNote}` : ""}`);
      }
    }
  }

  _toast(msg) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = this.add.text(GAME_CONFIG.width/2, 82, msg, {
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "12px",
      color: "#FFFFFF",
      backgroundColor: "rgba(16,26,51,0.85)",
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 1600,
      delay: 900,
      onComplete: () => { if (this.toastText) this.toastText.destroy(); this.toastText = null; }
    });
  }
}
