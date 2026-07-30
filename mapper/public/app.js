// ===== STATE =====
let currentScan = null;
let mappings = [];
let filter = 'campus'; // 'all', 'campus', 'other'

// ===== DOM ELEMENTS =====
const scanBtn = document.getElementById('scan-btn');
const scanStatus = document.getElementById('scan-status');
const networkList = document.getElementById('network-list');
const mappingsList = document.getElementById('mappings-list');
const saveBtn = document.getElementById('save-btn');
const roomInput = document.getElementById('room-input');
const buildingInput = document.getElementById('building-input');
const floorInput = document.getElementById('floor-input');
const descInput = document.getElementById('desc-input');
const scanSummary = document.getElementById('scan-summary');
const totalMapped = document.getElementById('total-mapped');
const filterTabs = document.querySelectorAll('.filter-tab');

// ===== HELPERS =====
function getSignalClass(signal) {
  if (signal >= 70) return 'signal-excellent';
  if (signal >= 50) return 'signal-good';
  if (signal >= 35) return 'signal-fair';
  if (signal >= 20) return 'signal-weak';
  return 'signal-very-weak';
}

function getSignalColor(signal) {
  if (signal >= 70) return 'var(--green)';
  if (signal >= 50) return 'var(--cyan)';
  if (signal >= 35) return 'var(--yellow)';
  if (signal >= 20) return 'var(--orange)';
  return 'var(--red)';
}

function getFreqBand(freq) {
  if (!freq) return '?';
  const mhz = parseInt(freq);
  if (mhz >= 5000) return '5G';
  return '2.4G';
}

function getFreqClass(freq) {
  return getFreqBand(freq) === '5G' ? 'freq-5g' : 'freq-2g';
}

function isCampusNetwork(ssid) {
  return ssid && ssid.trim().toUpperCase() === 'VITBPL';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== SCANNING =====
async function performScan() {
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<div class="spinner"></div> Scanning...';
  scanStatus.textContent = 'Scanning nearby access points...';
  scanStatus.className = 'scan-status scanning';
  networkList.innerHTML = '';
  
  try {
    const res = await fetch('/api/scan');
    const data = await res.json();
    
    if (!data.success) throw new Error(data.error || 'Scan failed');
    
    currentScan = data;
    renderNetworks(data.networks);
    
    const campusCount = data.networks.filter(n => isCampusNetwork(n.ssid)).length;
    scanStatus.textContent = `Found ${data.networks.length} networks (${campusCount} campus APs)`;
    scanStatus.className = 'scan-status';
    
    scanSummary.innerHTML = `<strong>${campusCount}</strong> campus APs detected | Strongest: <strong>${data.networks[0]?.signal || 0}%</strong> signal`;
    scanSummary.style.display = 'block';
    
    saveBtn.disabled = false;
    showToast(`Scan complete — ${data.networks.length} networks found`);
    
  } catch (error) {
    scanStatus.textContent = 'Scan failed: ' + error.message;
    scanStatus.className = 'scan-status';
    showToast('Scan failed: ' + error.message, 'error');
  }
  
  scanBtn.disabled = false;
  scanBtn.innerHTML = '📡 Scan WiFi';
}

function renderNetworks(networks) {
  let filtered = networks;
  if (filter === 'campus') {
    filtered = networks.filter(n => isCampusNetwork(n.ssid));
  } else if (filter === 'other') {
    filtered = networks.filter(n => !isCampusNetwork(n.ssid));
  }
  
  if (filtered.length === 0) {
    networkList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📡</div>
        <p>No networks found.<br>Click "Scan WiFi" to detect nearby access points.</p>
      </div>`;
    return;
  }
  
  networkList.innerHTML = filtered.map(net => {
    const signalClass = getSignalClass(net.signal);
    const signalColor = getSignalColor(net.signal);
    const freqBand = getFreqBand(net.frequency);
    const freqClass = getFreqClass(net.frequency);
    const isCampus = isCampusNetwork(net.ssid);
    
    return `
      <div class="network-card ${isCampus ? 'campus' : ''}">
        <div class="signal-indicator ${signalClass}">
          ${net.signal}%
        </div>
        <div class="network-info">
          <div class="network-ssid">${net.ssid || '<Hidden>'} ${isCampus ? '🏫' : ''}</div>
          <div class="network-bssid">${net.bssid}</div>
          <div class="signal-bar-container">
            <div class="signal-bar" style="width: ${net.signal}%; background: ${signalColor}"></div>
          </div>
        </div>
        <div class="network-meta">
          <span class="network-freq ${freqClass}">${freqBand}</span>
          <span class="network-channel">Ch ${net.channel}</span>
        </div>
      </div>`;
  }).join('');
}

// ===== SAVING =====
async function saveMapping() {
  const room = roomInput.value.trim();
  if (!room) {
    showToast('Please enter a room number', 'error');
    roomInput.focus();
    return;
  }
  
  if (!currentScan || !currentScan.networks.length) {
    showToast('Please scan WiFi first', 'error');
    return;
  }
  
  // Only save campus networks
  const campusNetworks = currentScan.networks.filter(n => isCampusNetwork(n.ssid));
  if (campusNetworks.length === 0) {
    showToast('No campus WiFi APs found in scan', 'error');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Saving...';
  
  try {
    const res = await fetch('/api/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room,
        building: buildingInput.value,
        floor: floorInput.value,
        description: descInput.value,
        networks: campusNetworks
      })
    });
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    showToast(`Saved mapping for Room ${room} (${campusNetworks.length} APs)`);
    
    // Clear form
    roomInput.value = '';
    descInput.value = '';
    
    // Refresh mappings
    await loadMappings();
    
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
  
  saveBtn.disabled = false;
  saveBtn.innerHTML = '💾 Save Mapping';
}

// ===== MAPPINGS =====
async function loadMappings() {
  try {
    const res = await fetch('/api/mappings');
    const data = await res.json();
    mappings = data.locations || [];
    renderMappings();
    totalMapped.textContent = mappings.length;
  } catch (error) {
    console.error('Failed to load mappings:', error);
  }
}

function renderMappings() {
  if (mappings.length === 0) {
    mappingsList.innerHTML = `
      <div class="empty-state">
        <div class="icon">🗺️</div>
        <p>No locations mapped yet.<br>Scan WiFi and save your first mapping!</p>
      </div>`;
    return;
  }
  
  mappingsList.innerHTML = mappings
    .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
    .map(m => {
      const locationParts = [m.building, m.floor ? `Floor ${m.floor}` : ''].filter(Boolean);
      const locationStr = locationParts.length ? locationParts.join(', ') : '';
      
      return `
        <div class="mapping-item">
          <div class="mapping-header">
            <span class="mapping-room">📍 Room ${m.room}</span>
            <button class="btn btn-danger" onclick="deleteMapping(${m.id})">✕ Remove</button>
          </div>
          ${locationStr ? `<div class="mapping-location">🏢 ${locationStr}</div>` : ''}
          ${m.description ? `<div class="mapping-location">📝 ${m.description}</div>` : ''}
          <div class="mapping-aps">
            ${m.networks.slice(0, 5).map(n => 
              `<span class="ap-tag" title="Signal: ${n.signal}%">${n.bssid} (${n.signal}%)</span>`
            ).join('')}
            ${m.networks.length > 5 ? `<span class="ap-tag">+${m.networks.length - 5} more</span>` : ''}
          </div>
          <div class="mapping-time">🕐 ${timeAgo(m.scannedAt)}</div>
        </div>`;
    }).join('');
}

async function deleteMapping(id) {
  if (!confirm('Delete this mapping?')) return;
  
  try {
    await fetch(`/api/mappings/${id}`, { method: 'DELETE' });
    showToast('Mapping deleted');
    await loadMappings();
  } catch (error) {
    showToast('Failed to delete', 'error');
  }
}

// ===== EVENT LISTENERS =====
scanBtn.addEventListener('click', performScan);
saveBtn.addEventListener('click', saveMapping);

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filter = tab.dataset.filter;
    if (currentScan) renderNetworks(currentScan.networks);
  });
});

// Enter key to save
roomInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveMapping();
});

// ===== INIT =====
loadMappings();
