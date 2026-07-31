:root {
  --bg: #F5F5F7;
  --card: #FFFFFF;
  --card-secondary: #FBFBFD;
  --border: #E4E4E7;
  --border-subtle: #F0F0F4;
  --text: #1D1D1F;
  --text-heading: #000000;
  --muted: #6E6E73;
  --red: #FF3B30;
  --red-soft: #FFF1F0;
  --green: #34C759;
  --green-soft: #EAFBF0;
  --yellow: #FF9F0A;
  --yellow-soft: #FFF8EC;
  --blue: #0071E3;
  --blue-soft: #EBF3FE;
  --apple-black: #000000;
  --apple-white: #FFFFFF;
  --apple-blue: #0071E3;
}

* { 
  box-sizing: border-box; 
  margin: 0;
  padding: 0;
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: "SF Pro Display", "SF Pro Text", "SF Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: -0.022em;
  font-size: 16px;
}

/* Apple Header */
header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 48px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border);
}

.brand { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
}

.brand-logo {
  width: 72px; 
  height: 72px;
  border-radius: 12px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
}

.brand-name { 
  font-size: 24px; 
  font-weight: 700; 
  color: var(--text-heading);
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.brand-sub { 
  font-size: 15px; 
  color: var(--muted); 
  font-weight: 400;
  margin-top: 1px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.btn-primary {
  background: var(--apple-black);
  color: var(--apple-white);
  border: none;
  padding: 11px 24px;
  border-radius: 980px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.btn-primary:hover { 
  opacity: 0.9;
  transform: scale(1.02);
}

.btn-primary:active { 
  transform: scale(0.97); 
}

/* Page Layout */
.wrap {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 36px 24px 70px;
}

.layout-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.card {
  background: var(--card);
  border-radius: 22px;
  border: 1px solid var(--border);
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
}

/* Apple-style Large Bold Section Headlines */
.section-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-heading);
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.count-pill {
  font-size: 14px;
  font-weight: 600;
  color: var(--red);
  background: var(--red-soft);
  padding: 6px 16px;
  border-radius: 980px;
  border: 1px solid rgba(255, 59, 48, 0.2);
}

/* Segmented Control (Apple Light Toggle) */
.view-segmented-control {
  display: flex;
  background: #EBEBEF;
  border-radius: 980px;
  padding: 4px;
  gap: 3px;
}

.segmented-btn {
  background: transparent;
  border: none;
  padding: 8px 18px;
  border-radius: 980px;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.segmented-btn.active {
  background: var(--apple-white);
  color: var(--apple-black);
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 3D Toolbar Controls */
.toolbar-3d {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-btn {
  background: #F5F5F7;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: 980px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #EBEBEF;
  border-color: #D1D1D6;
}

/* ALERTS SECTION */
.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 10px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s ease;
  border-radius: 14px;
}
.alert-row:last-child { border-bottom: none; }
.alert-row:hover { background: rgba(0, 0, 0, 0.015); }

.alert-left { display: flex; align-items: center; gap: 16px; }
.alert-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 12px rgba(255, 59, 48, 0.4);
}
.alert-row.resolved .alert-dot { 
  background: var(--green); 
  box-shadow: 0 0 12px rgba(52, 199, 89, 0.4);
}
.alert-room { 
  font-size: 20px; 
  font-weight: 700; 
  color: var(--text-heading);
  letter-spacing: -0.025em;
}
.alert-meta { 
  font-size: 15px; 
  color: var(--muted); 
  margin-top: 3px; 
}

.alert-guard-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--blue);
}

.status-pill {
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 980px;
}
.status-pill.active { background: var(--red-soft); color: var(--red); border: 1px solid rgba(255, 59, 48, 0.2); }
.status-pill.resolved { background: var(--green-soft); color: #1F9C46; border: 1px solid rgba(52, 199, 89, 0.2); }

.resolve-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 18px;
  border-radius: 980px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.resolve-btn:hover { 
  background: var(--apple-black);
  color: var(--apple-white);
  border-color: var(--apple-black);
}

/* GUARDS ON DUTY PANEL */
.guards-summary-pill {
  font-size: 14px;
  font-weight: 600;
  color: var(--green);
  background: var(--green-soft);
  padding: 6px 16px;
  border-radius: 980px;
  border: 1px solid rgba(52, 199, 89, 0.2);
}

.guards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.guard-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: var(--card-secondary);
  transition: all 0.2s ease;
}

.guard-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.guard-avatar.available { background: var(--green-soft); color: var(--green); border: 2px solid var(--green); }
.guard-avatar.responding { background: var(--yellow-soft); color: var(--yellow); border: 2px solid var(--yellow); }
.guard-avatar.off-duty { background: #F0F0F4; color: #A1A1A6; border: 2px solid #D1D1D6; opacity: 0.6; }

.guard-status-pill.available { background: var(--green-soft); color: #1F9C46; border: 1px solid rgba(52, 199, 89, 0.2); }
.guard-status-pill.responding { background: var(--yellow-soft); color: #CC7F08; border: 1px solid rgba(255, 159, 10, 0.2); }
.guard-status-pill.off-duty { background: #F0F0F4; color: #8E8E93; border: 1px solid #D1D1D6; }

.guard-toggle-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 5px 12px;
  border-radius: 980px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* 3D VIEWPORT FRAME */
.map-wrapper-3d {
  position: relative;
  width: 100%;
  height: 580px;
  background: #EBF3FE;
  border-radius: 18px;
  border: 1px solid #C2DCFF;
  overflow: hidden;
}

#canvas-container-3d { width: 100%; height: 100%; }

/* 2D FLOOR PLAN GRID */
.floor-grid {
  min-width: 900px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto auto auto;
  gap: 12px;
  background: #EBF3FE;
  border: 1px solid #C2DCFF;
  border-radius: 18px;
  padding: 26px;
}

.room {
  background: #F4F8FF;
  border: 1px solid #C2DCFF;
  border-radius: 14px;
  padding: 16px 10px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-heading);
  position: relative;
}

.room.flagged {
  background: var(--red-soft) !important;
  border-color: var(--red) !important;
  color: var(--red) !important;
}