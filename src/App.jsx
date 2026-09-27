import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  RefreshCcw,
  Search,
  Settings,
  Upload,
  Users,
} from 'lucide-react'
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

const STORAGE_KEY = 'updateskp_records_v1'

const SKP_META = {
  BWP: { name: 'Badan Wakil Pelajar', short: 'BWP' },
  LDP: { name: 'Lembaga Disiplin Pelajar', short: 'LDP' },
  BADAR: { name: 'Badan Kerohanian dan Moral (BADAR)', short: 'BADAR' },
  SRM: { name: 'Sidang Redaksi', short: 'SRM' },
  EMC: { name: 'English Motivational Committee', short: 'EMC' },
  PPSP: { name: 'Pengawas Pusat Sumber Pembelajaran', short: 'PPSP' },
  PRS: { name: 'Pembimbing Rakan Sebaya', short: 'PRS' },
  JPA: { name: 'Jawatankuasa Pengurusan Asrama', short: 'JPA' },
  ALK: { name: 'Ahli Lembaga Koperasi', short: 'ALK' },
  PUM: { name: 'Program Usahawan Muda', short: 'PUM' },
}

const FULLNAME_TO_CODE = Object.fromEntries(
  Object.entries(SKP_META).map(([code, meta]) => [meta.name.toLowerCase(), code]),
)

function normalizeSkp(value = '') {
  const text = String(value).trim()
  if (SKP_META[text]) return text
  return FULLNAME_TO_CODE[text.toLowerCase()] || text
}

function parseOptions(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || '')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeRecord(row, index = 0) {
  const rowNumber =
    row.row_number ??
    row.row ??
    row['Row testi.xlsx'] ??
    row['Row testi'] ??
    row['ROW TESTI.XLSX'] ??
    null

  const nomak =
    row.nomak ??
    row['No. Maktab'] ??
    row['NO. MAKTAB'] ??
    row['No Maktab'] ??
    ''

  const name =
    row.name ??
    row.nama ??
    row['Nama Pelajar'] ??
    row['NAMA PELAJAR'] ??
    ''

  const skp = normalizeSkp(
    row.skp ??
      row.SKP ??
      row['SKP'] ??
      '',
  )

  const oldRole =
    row.old_role ??
    row.oldRole ??
    row['Jawatan Semasa (CR)'] ??
    row['JAWATAN SEMASA (CR)'] ??
    ''

  const options = parseOptions(
    row.options ??
      row['Pilihan Jawatan Rasmi 2026'] ??
      row['PILIHAN JAWATAN RASMI 2026'] ??
      '',
  )

  const selectedRole =
    row.selected_role ??
    row.selectedRole ??
    row['Keputusan Biyamin (Pilih Dropdown)'] ??
    row['Keputusan Biyamin'] ??
    ''

  const id = String(
    row.id || `${String(nomak).trim()}-${rowNumber || index + 1}`,
  )

  return {
    id,
    row_number: rowNumber ? Number(rowNumber) : null,
    nomak: String(nomak || '').trim(),
    name: String(name || '').trim(),
    skp,
    skp_name: SKP_META[skp]?.name || String(row.skp_name || skp),
    old_role: String(oldRole || '').trim(),
    options,
    selected_role: String(selectedRole || '').trim(),
    updated_at: row.updated_at || null,
  }
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLocal(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function Donut({ value, size = 112 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div
      className="donut"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--track) 0deg)`,
      }}
    >
      <div className="donut-inner">
        <strong>{pct}%</strong>
        <span>siap</span>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div className="progress-track" aria-label={`${pct}% selesai`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function statusFor(done, total) {
  if (!total) return { label: 'Tiada rekod', tone: 'neutral' }
  if (done === 0) return { label: 'Belum mula', tone: 'neutral' }
  if (done === total) return { label: 'Selesai', tone: 'success' }
  return { label: 'Dalam proses', tone: 'warning' }
}

function Dashboard({ records, onSelectSkp, onAdmin }) {
  const groups = useMemo(() => {
    const map = new Map()
    records.forEach((r) => {
      const key = r.skp || 'LAIN'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [records])

  const done = records.filter((r) => r.selected_role).length
  const overall = records.length ? (done / records.length) * 100 : 0

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">MRSM TUMPAT · SKP 2026</p>
          <h1>Kemaskini Penjawatan SKP</h1>
          <p className="hero-copy">
            Guru penasihat pilih jawatan rasmi 2026 untuk pelajar di bawah SKP masing-masing.
          </p>
        </div>
        <button className="icon-btn" onClick={onAdmin} title="Admin">
          <Settings size={20} />
        </button>
      </header>

      <section className="overview-card">
        <Donut value={overall} />
        <div className="overview-info">
          <span className="muted">Kemajuan keseluruhan</span>
          <strong>{done} / {records.length} selesai</strong>
          <ProgressBar value={overall} />
          <small>{records.length ? Math.round(overall) : 0}% semua keputusan telah dikemaskini.</small>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h2>Pilih SKP</h2>
          <p>Tekan organisasi untuk mula mengemaskini.</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <section className="empty-state">
          <FileSpreadsheet size={36} />
          <h3>Belum ada data</h3>
          <p>Admin perlu import fail semakan jawatan terlebih dahulu.</p>
          <button className="primary-btn" onClick={onAdmin}>
            <Upload size={17} /> Import data
          </button>
        </section>
      ) : (
        <section className="skp-grid">
          {groups.map(([code, list]) => {
            const completed = list.filter((r) => r.selected_role).length
            const pct = list.length ? (completed / list.length) * 100 : 0
            const status = statusFor(completed, list.length)
            const meta = SKP_META[code] || { name: list[0]?.skp_name || code, short: code }
            return (
              <button className="skp-card" key={code} onClick={() => onSelectSkp(code)}>
                <div className="skp-card-top">
                  <div className="skp-badge">{meta.short}</div>
                  <span className={`status-pill ${status.tone}`}>{status.label}</span>
                </div>
                <h3>{meta.name}</h3>
                <div className="skp-metrics">
                  <span><strong>{completed}</strong> / {list.length}</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <ProgressBar value={pct} />
                <div className="open-row">
                  <span>Kemaskini jawatan</span>
                  <ChevronRight size={18} />
                </div>
              </button>
            )
          })}
        </section>
      )}
    </>
  )
}

function SkpPage({ code, records, onBack, onChange }) {
  const [search, setSearch] = useState('')
  const meta = SKP_META[code] || { name: records[0]?.skp_name || code, short: code }
  const completed = records.filter((r) => r.selected_role).length
  const pct = records.length ? (completed / records.length) * 100 : 0

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.nomak.toLowerCase().includes(q) ||
      r.old_role.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <header className="sub-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={19} /> Dashboard
        </button>
        <div className="sub-title">
          <div className="skp-badge small">{meta.short}</div>
          <div>
            <h1>{meta.name}</h1>
            <p>{completed} / {records.length} selesai · {Math.round(pct)}%</p>
          </div>
        </div>
        <ProgressBar value={pct} />
      </header>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / no. maktab / jawatan lama"
          />
        </div>
        <span className="record-count">{filtered.length} rekod</span>
      </div>

      <section className="student-list">
        {filtered.map((r) => (
          <article className={`student-card ${r.selected_role ? 'done' : ''}`} key={r.id}>
            <div className="student-card-head">
              <div>
                <span className="nomak">{r.nomak}</span>
                <h3>{r.name}</h3>
              </div>
              {r.selected_role && <CheckCircle2 className="done-icon" size={22} />}
            </div>

            <div className="old-role">
              <span>Jawatan lama</span>
              <strong>{r.old_role || 'Kosong'}</strong>
            </div>

            <label className="select-label">
              Jawatan rasmi SKP 2026
              <select
                value={r.selected_role || ''}
                onChange={(e) => onChange(r.id, e.target.value)}
              >
                <option value="">— Pilih jawatan —</option>
                {r.options.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </label>

            <div className="save-state">
              {r.selected_role ? '✓ Disimpan' : 'Belum dikemaskini'}
            </div>
          </article>
        ))}
      </section>

      {records.length > 0 && completed === records.length && (
        <div className="complete-banner">
          <CheckCircle2 size={22} />
          <div>
            <strong>Semua penjawatan {meta.short} selesai.</strong>
            <span>Tiada rekod berbaki untuk dikemaskini.</span>
          </div>
        </div>
      )}
    </>
  )
}

function AdminPage({ records, onBack, onImport, onReset, onRefresh }) {
  const [busy, setBusy] = useState(false)
  const done = records.filter((r) => r.selected_role).length

  async function handleFile(file) {
    if (!file) return
    setBusy(true)
    try {
      const data = await file.arrayBuffer()
      const book = XLSX.read(data)
      const sheetName =
        book.SheetNames.find((x) => x.toLowerCase().includes('perlu keputusan')) ||
        book.SheetNames[0]
      const rows = XLSX.utils.sheet_to_json(book.Sheets[sheetName], { defval: '' })
      const normalized = rows
        .filter((r) => r['No. Maktab'] || r.nomak || r['Nama Pelajar'])
        .map((r, i) => normalizeRecord(r, i))
        .filter((r) => r.nomak && r.skp && r.options.length)

      if (!normalized.length) {
        alert('Tiada rekod yang boleh dibaca. Pastikan fail ialah fail semakan jawatan yang dijana.')
        return
      }
      await onImport(normalized)
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const rows = records.map((r) => ({
      'No. Maktab': r.nomak,
      'Nama Pelajar': r.name,
      SKP: r.skp_name || r.skp,
      'Jawatan Lama': r.old_role,
      'Jawatan Dipilih 2026': r.selected_role,
      Status: r.selected_role ? 'Selesai' : 'Belum Selesai',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Keputusan')
    XLSX.writeFile(wb, 'KEPUTUSAN_PENJAWATAN_SKP_2026.xlsx')
  }

  return (
    <>
      <header className="sub-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={19} /> Dashboard
        </button>
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Pengurusan Data</h1>
          <p>{done} / {records.length} keputusan telah lengkap.</p>
        </div>
      </header>

      <section className="admin-grid">
        <article className="admin-card">
          <Upload size={28} />
          <h3>Import fail semakan</h3>
          <p>
            Upload fail Excel <strong>SEMAKAN_JAWATAN_SKP_2026...</strong>.
            Sistem akan baca nama, SKP, jawatan lama dan pilihan jawatan rasmi.
          </p>
          <label className="primary-btn file-btn">
            <Upload size={17} />
            {busy ? 'Memproses...' : 'Pilih fail Excel'}
            <input
              hidden
              type="file"
              accept=".xlsx,.xls"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </article>

        <article className="admin-card">
          <Download size={28} />
          <h3>Export keputusan</h3>
          <p>Download keputusan semasa untuk semakan atau proses kemas kini PAJSK seterusnya.</p>
          <button className="secondary-btn" onClick={exportCsv} disabled={!records.length}>
            <Download size={17} /> Export Excel
          </button>
        </article>

        <article className="admin-card">
          <RefreshCcw size={28} />
          <h3>Sync data</h3>
          <p>
            {isFirebaseConfigured
              ? 'Firebase aktif. Muat semula keputusan terbaru daripada pangkalan data.'
              : 'Firebase belum dikonfigurasi. App sedang menggunakan localStorage pada peranti ini.'}
          </p>
          <button className="secondary-btn" onClick={onRefresh}>
            <RefreshCcw size={17} /> Refresh
          </button>
        </article>

        <article className="admin-card danger-zone">
          <Users size={28} />
          <h3>Reset data tempatan</h3>
          <p>Padam data pada browser ini sahaja. Data Firestore tidak dipadam.</p>
          <button className="danger-btn" onClick={onReset}>Reset local data</button>
        </article>
      </section>

      <section className="connection-note">
        <strong>Status backend:</strong>{' '}
        {isFirebaseConfigured ? 'Firebase connected' : 'Demo/local mode'}
      </section>
    </>
  )
}

export default function App() {
  const [records, setRecords] = useState([])
  const [view, setView] = useState('dashboard')
  const [selectedSkp, setSelectedSkp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  async function fetchRecords() {
    setLoading(true)
    try {
      if (isFirebaseConfigured) {
        const snapshot = await getDocs(collection(db, 'role_updates'))
        const normalized = snapshot.docs
          .map((snap) => normalizeRecord({ id: snap.id, ...snap.data() }))
          .sort((a, b) => a.skp.localeCompare(b.skp) || a.name.localeCompare(b.name))
        setRecords(normalized)
        saveLocal(normalized)
      } else {
        setRecords(loadLocal().map(normalizeRecord))
      }
    } catch (error) {
      console.error(error)
      const local = loadLocal().map(normalizeRecord)
      setRecords(local)
      setToast('Firebase tidak dapat dicapai. Data tempatan digunakan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  async function updateRole(id, selectedRole) {
    const updated = records.map((r) =>
      r.id === id
        ? { ...r, selected_role: selectedRole, updated_at: new Date().toISOString() }
        : r,
    )
    setRecords(updated)
    saveLocal(updated)

    if (isFirebaseConfigured) {
      try {
        const record = updated.find((r) => r.id === id)
        await updateDoc(doc(db, 'role_updates', record.id), {
          selected_role: selectedRole || null,
          updated_at: new Date().toISOString(),
        })
        setToast('Disimpan')
      } catch (error) {
        console.error(error)
        setToast('Gagal sync ke Firebase. Pilihan masih disimpan pada browser ini.')
      }
    } else {
      setToast('Disimpan pada browser')
    }
  }

  async function importRecords(incoming) {
    const cleaned = incoming.map(normalizeRecord)
    setRecords(cleaned)
    saveLocal(cleaned)

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db)
        cleaned.forEach((r) => {
          batch.set(doc(db, 'role_updates', r.id), {
            row_number: r.row_number,
            nomak: r.nomak,
            name: r.name,
            skp: r.skp,
            skp_name: r.skp_name,
            old_role: r.old_role,
            options: r.options,
            selected_role: r.selected_role || null,
            updated_at: r.updated_at || new Date().toISOString(),
          }, { merge: true })
        })
        await batch.commit()
      } catch (error) {
        console.error(error)
        alert('Data masuk ke browser tetapi gagal sync Firebase: ' + error.message)
        return
      }
    }
    setToast(`${cleaned.length} rekod berjaya diimport`)
    setView('dashboard')
  }

  function resetLocal() {
    if (!confirm('Padam semua data tempatan pada browser ini?')) return
    localStorage.removeItem(STORAGE_KEY)
    if (!isFirebaseConfigured) setRecords([])
    setToast('Data tempatan dipadam')
  }

  const selectedRecords = useMemo(
    () => records.filter((r) => r.skp === selectedSkp),
    [records, selectedSkp],
  )

  if (loading) {
    return (
      <main className="app-shell loading-screen">
        <div className="spinner" />
        <strong>Memuatkan SKP 2026…</strong>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {view === 'dashboard' && (
        <Dashboard
          records={records}
          onSelectSkp={(code) => {
            setSelectedSkp(code)
            setView('skp')
          }}
          onAdmin={() => setView('admin')}
        />
      )}

      {view === 'skp' && (
        <SkpPage
          code={selectedSkp}
          records={selectedRecords}
          onBack={() => setView('dashboard')}
          onChange={updateRole}
        />
      )}

      {view === 'admin' && (
        <AdminPage
          records={records}
          onBack={() => setView('dashboard')}
          onImport={importRecords}
          onReset={resetLocal}
          onRefresh={fetchRecords}
        />
      )}

      {toast && (
        <button className="toast" onClick={() => setToast('')}>
          {toast}
        </button>
      )}

      <footer>
        <LayoutDashboard size={15} />
        <span>SKP 2026 · MRSM Tumpat</span>
      </footer>
    </main>
  )
}
