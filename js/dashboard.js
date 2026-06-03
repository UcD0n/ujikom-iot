// ====================================
// IMPORTS
// ====================================
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  ref, 
  onValue, 
  set, 
  get, 
  update,
  push,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ====================================
// AUTH GUARD & LOGOUT
// ====================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  // Update avatar dengan inisial user
  const avatar = document.querySelector('.avatar');
  if (avatar && user.email) {
    avatar.textContent = user.email.charAt(0).toUpperCase();
  }
  
  // Update nama user di topbar (opsional)
  const usernameEl = document.getElementById('username');
  if (usernameEl) {
    usernameEl.textContent = user.displayName || user.email || 'User';
  }
});

// Logout handler
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  
  if (!confirm('Apakah Anda yakin ingin keluar?')) return;
  
  try {
    await signOut(auth);
    showToast('Berhasil keluar dari sistem', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Gagal keluar. Coba lagi.', 'error');
  }
});

// ====================================
// DOM REFERENCES
// ====================================
const elements = {
  statSuhu: document.getElementById('statSuhu'),
  statCahaya: document.getElementById('statCahaya'),
  trendSuhu: document.getElementById('trendSuhu'),
  trendCahaya: document.getElementById('trendCahaya'),
  dataTable: document.getElementById('dataTable'),
  relayToggle: document.getElementById('relayToggle'),
  relayLabel: document.getElementById('relayLabel'),
  relayStatus: document.getElementById('relayStatus'),
  activityList: document.getElementById('activityList'),
  connectionPill: document.getElementById('connectionPill'),
  connectionText: document.getElementById('connectionText'),
};

// ====================================
// SENSOR DATA - REAL-TIME
// ====================================
const sensorRef = ref(db, 'sensor');
let isConnected = true;

// Real-time listener untuk data sensor
onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();
  
  if (data) {
    updateStats(data);
    updateTable(data.history || []);
    updateConnectionStatus(true);
    
    // Kirim data ke chart (jika chart module ada)
    window.__sensorData = data;
    if (typeof window.renderChart === 'function') {
      window.renderChart(data.chart || []);
    }
    
    // Catat aktivitas
    addActivity('Data sensor diperbarui dari Firebase', 'online');
  } else {
    // Jika data kosong, load dummy
    loadDummyData();
    updateConnectionStatus(false);
  }
}, (error) => {
  console.error('Firebase read error:', error);
  loadDummyData();
  updateConnectionStatus(false);
  showToast('Gagal terhubung ke database', 'error');
});

// ====================================
// UPDATE STATS
// ====================================
function updateStats(data) {
  const { statSuhu, statCahaya, trendSuhu, trendCahaya } = elements;
  
  // Suhu
  const suhu = data.suhu ?? '--';
  if (statSuhu) {
    statSuhu.textContent = suhu !== '--' ? `${suhu}°C` : '--°C';
  }
  
  if (trendSuhu) {
    if (suhu === '--') {
      trendSuhu.textContent = '↻ Memuat...';
      trendSuhu.className = 'trend';
    } else if (suhu > 35) {
      trendSuhu.textContent = '🔴 Panas!';
      trendSuhu.className = 'trend down';
    } else if (suhu > 28) {
      trendSuhu.textContent = '✅ Normal';
      trendSuhu.className = 'trend up';
    } else {
      trendSuhu.textContent = '❄️ Dingin';
      trendSuhu.className = 'trend down';
    }
  }
  
  // Cahaya
  const cahaya = data.cahaya ?? '--';
  if (statCahaya) {
    statCahaya.textContent = cahaya !== '--' ? `${cahaya} lx` : '-- lx';
  }
  
  if (trendCahaya) {
    if (cahaya === '--') {
      trendCahaya.textContent = '↻ Memuat...';
      trendCahaya.className = 'trend';
    } else if (cahaya > 400) {
      trendCahaya.textContent = '☀️ Terang';
      trendCahaya.className = 'trend up';
    } else if (cahaya > 100) {
      trendCahaya.textContent = '🌤️ Redup';
      trendCahaya.className = 'trend';
    } else {
      trendCahaya.textContent = '🌙 Gelap';
      trendCahaya.className = 'trend down';
    }
  }
}

// ====================================
// UPDATE TABLE
// ====================================
function updateTable(rows) {
  const { dataTable } = elements;
  if (!dataTable) return;
  
  if (!rows || rows.length === 0) {
    dataTable.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:20px;color:#64748b;">
          📭 Belum ada data sensor
        </td>
      </tr>
    `;
    return;
  }
  
  // Ambil 10 data terbaru
  const recentRows = rows.slice(-10).reverse();
  
  dataTable.innerHTML = recentRows.map(r => {
    const statusClass = r.status === 'OK' ? 'normal' : 
                        r.status === 'WARN' ? 'warning' : 'critical';
    const statusText = r.status === 'OK' ? 'Normal' : 
                       r.status === 'WARN' ? 'Waspada' : 'Kritis';
    
    return `
      <tr>
        <td>${r.waktu || r.tanggal || '--'}</td>
        <td>${r.sensor || '--'}</td>
        <td><strong>${r.nilai || '--'}</strong></td>
        <td><span class="badge-status ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

// ====================================
// CONNECTION STATUS
// ====================================
function updateConnectionStatus(online) {
  const { connectionPill, connectionText } = elements;
  
  if (!connectionPill || !connectionText) return;
  
  const dot = connectionPill.querySelector('.dot');
  if (!dot) return;
  
  if (online) {
    dot.className = 'dot online';
    connectionText.textContent = 'Terhubung';
    isConnected = true;
  } else {
    dot.className = 'dot off';
    connectionText.textContent = 'Terputus';
    isConnected = false;
    addActivity('Koneksi ke server terputus', 'off');
  }
}

// ====================================
// LOAD DUMMY DATA (FALLBACK)
// ====================================
async function loadDummyData() {
  try {
    const res = await fetch('data/dummy.json');
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await res.json();
    console.log('✅ Dummy data loaded');
    
    updateStats(data);
    updateTable(data.history || []);
    
    window.__sensorData = data;
    if (typeof window.renderChart === 'function') {
      window.renderChart(data.chart || []);
    }
    
    addActivity('Menggunakan data lokal (offline mode)', 'warn');
  } catch (e) {
    console.warn('⚠️ Tidak bisa memuat data dummy:', e.message);
    
    // Tampilkan data kosong
    updateStats({ suhu: '--', cahaya: '--' });
    updateTable([]);
    addActivity('Gagal memuat data. Periksa koneksi.', 'off');
  }
}

// ====================================
// RELAY CONTROL
// ====================================
const relayRef = ref(db, 'relay/1');
const { relayToggle, relayLabel, relayStatus } = elements;

// Real-time listener untuk relay
if (relayRef) {
  onValue(relayRef, (snapshot) => {
    const val = snapshot.val();
    const isOn = val === 1 || val === true || val === '1';
    
    updateRelayUI(isOn);
  }, (error) => {
    console.error('Relay read error:', error);
    updateRelayUI(false);
  });
}

// Toggle relay handler
if (relayToggle) {
  relayToggle.addEventListener('change', async () => {
    const newState = relayToggle.checked ? 1 : 0;
    const previousState = relayToggle.checked ? 0 : 1;
    
    try {
      // Update Firebase
      await set(relayRef, newState);
      
      // Update UI
      updateRelayUI(newState === 1);
      
      // Catat ke history
      await saveRelayHistory(newState === 1 ? 'ON' : 'OFF');
      
      // Tampilkan toast
      const message = newState === 1 ? 'Relay dinyalakan ✅' : 'Relay dimatikan 🔴';
      showToast(message, 'success');
      addActivity(`Relay ${newState === 1 ? 'dinyalakan' : 'dimatikan'} oleh user`, newState === 1 ? 'online' : 'off');
      
    } catch (err) {
      console.error('❌ Gagal mengubah relay:', err);
      
      // Kembalikan toggle ke posisi sebelumnya
      relayToggle.checked = previousState === 1;
      updateRelayUI(previousState === 1);
      
      showToast('Gagal mengubah status relay. Coba lagi.', 'error');
    }
  });
}

function updateRelayUI(isOn) {
  if (relayToggle) relayToggle.checked = isOn;
  
  if (relayLabel) {
    relayLabel.textContent = isOn ? 'ON' : 'OFF';
    relayLabel.style.color = isOn ? '#10b981' : 'var(--text-muted, #64748b)';
  }
  
  if (relayStatus) {
    relayStatus.textContent = isOn 
      ? 'Status: 🟢 Menyala — perangkat aktif' 
      : 'Status: 🔴 Mati — perangkat non-aktif';
  }
}

async function saveRelayHistory(state) {
  try {
    const historyRef = ref(db, 'sensor/history');
    const snapshot = await get(historyRef);
    let history = snapshot.val() || [];
    
    // Konversi dari object ke array jika perlu
    if (!Array.isArray(history)) {
      history = Object.values(history);
    }
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    
    // Tambahkan entry baru
    history.push({
      waktu: timeStr,
      tanggal: dateStr,
      sensor: 'Relay 1',
      nilai: state,
      status: 'OK',
      timestamp: Date.now()
    });
    
    // Batasi maksimal 50 data
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    await set(historyRef, history);
    console.log('✅ Relay history saved');
    
  } catch (err) {
    console.error('❌ Gagal menyimpan riwayat relay:', err);
  }
}

// ====================================
// ACTIVITY LOG
// ====================================
function addActivity(message, dotClass = 'online') {
  const { activityList } = elements;
  if (!activityList) return;
  
  const now = new Date();
  const timeAgo = 'Baru saja';
  
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="dot ${dotClass}"></span> 
    ${message} 
    <small>${timeAgo}</small>
  `;
  
  activityList.prepend(li);
  
  // Batasi maksimal 10 aktivitas
  const items = activityList.querySelectorAll('li');
  if (items.length > 10) {
    items[items.length - 1].remove();
  }
}

// ====================================
// TOAST NOTIFICATION
// ====================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type] || ''} ${message}`;
  
  container.appendChild(toast);
  
  // Animasi hilang
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ====================================
// INITIALIZATION
// ====================================
function init() {
  console.log('🚀 Dashboard IoT initialized');
  addActivity('Sistem monitoring dimulai', 'online');
  
  // Cek koneksi awal
  updateConnectionStatus(true);
  
  // Update waktu setiap menit (untuk label "Baru saja")
  setInterval(() => {
    const smalls = document.querySelectorAll('.activity-list small');
    smalls.forEach(small => {
      if (small.textContent === 'Baru saja') {
        small.textContent = '1 menit lalu';
      }
    });
  }, 60000);
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', init);

// Export untuk digunakan di file lain (opsional)
export { updateStats, updateTable, addActivity, showToast };