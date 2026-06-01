import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector }                          from 'react-redux';
import { useNavigate }                                       from 'react-router-dom';
import {
  fetchRestockSuggestions,
  clearRestockState,
  selectRestockItems,
  selectRestockStatus,
  selectRestockError,
  selectRestockLastFetch,
} from '../features/stock/restockSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { TableSkeleton }           from '../components/ui/CatalogUI';
import AppTopbar                   from '../components/layout/AppTopbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNIT_LABELS = {
  UNIT: 'u.', KG: 'kg', GRAM: 'g',
  TRAY: 'band.', BAG: 'bolsa', LITER: 'L', PACK: 'pack',
};

const formatDate = (d) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const formatFmt = (d) => {
  if (!d) return null;
  const now  = new Date();
  const then = new Date(d);
  const diff = Math.floor((now - then) / 86_400_000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7)  return `hace ${diff} días`;
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem.`;
  return `hace ${Math.floor(diff / 30)} mes(es)`;
};

const urgency = (pct) => {
  if (pct == null || pct === 0) return 'critical';
  if (pct < 30) return 'high';
  if (pct < 70) return 'medium';
  return 'low';
};

const URGENCY_CONFIG = {
  critical: { color: '#C0392B', bg: 'rgba(192,57,43,0.10)', label: 'Crítico',  icon: '🔴' },
  high:     { color: '#E67E22', bg: 'rgba(230,126,34,0.10)', label: 'Urgente', icon: '🟠' },
  medium:   { color: '#D68910', bg: 'rgba(214,137,16,0.09)', label: 'Medio',   icon: '🟡' },
  low:      { color: '#2E7D32', bg: 'rgba(46,125,50,0.09)',  label: 'Bajo',    icon: '🟢' },
};

const URGENCY_TEXT = { critical: 'CRÍTICO', high: 'URGENTE', medium: 'MEDIO', low: 'BAJO' };

const ORIGIN_LABELS = {
  FRANCHISE: { icon: '🏷', label: 'Franquicia' },
  EXTERNAL:  { icon: '🌐', label: 'Externo'    },
};

// ─── Export helpers ────────────────────────────────────────────────────────────

function buildPlainText(items, user) {
  const now  = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const owner = user ? `${user.firstName} ${user.lastName}` : '';

  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════╗');
  lines.push('║          PANSTOCK — LISTA DE REPOSICIÓN DE STOCK         ║');
  lines.push('╚══════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Generado: ${now}`);
  if (owner) lines.push(`  Por: ${owner}`);
  lines.push(`  Total de productos a reponer: ${items.length}`);
  lines.push('');
  lines.push('──────────────────────────────────────────────────────────');

  const groups = { critical: [], high: [], medium: [], low: [] };
  items.forEach((i) => groups[urgency(i.stockPercentage)].push(i));

  const groupOrder = ['critical', 'high', 'medium', 'low'];
  const groupTitles = {
    critical: '🔴 CRÍTICO — Sin stock o prácticamente vacío',
    high:     '🟠 URGENTE — Stock muy bajo (< 30% del mínimo)',
    medium:   '🟡 MEDIO — Stock bajo (30–69% del mínimo)',
    low:      '🟢 BAJO — Cerca del mínimo (70–99%)',
  };

  groupOrder.forEach((gKey) => {
    const gItems = groups[gKey];
    if (!gItems.length) return;

    lines.push('');
    lines.push(groupTitles[gKey]);
    lines.push('');

    gItems.forEach((item, idx) => {
      const ul      = UNIT_LABELS[item.unitType] || '';
      const missing = item.minimumStock != null && item.currentStock != null
        ? parseFloat((item.minimumStock - item.currentStock).toFixed(3))
        : null;

      lines.push(`  ${idx + 1}. ${item.productName.toUpperCase()}`);
      lines.push(`     Categoría : ${item.categoryName || '—'}`);
      lines.push(`     Origen    : ${item.origin === 'FRANCHISE' ? 'Franquicia' : 'Externo'}`);
      lines.push(`     Stock     : ${Number(item.currentStock).toLocaleString('es-AR')} ${ul}  /  Mínimo: ${Number(item.minimumStock).toLocaleString('es-AR')} ${ul}  (${item.stockPercentage ?? 0}%)`);
      if (missing != null) {
        lines.push(`     A reponer : +${Number(missing).toLocaleString('es-AR')} ${ul}`);
      }
      lines.push(`     Proveedor : ${item.supplierName || '—'}`);
      lines.push(`     Pedidos   : ${item.supplierOrderSchedule || 'Consultar con el proveedor'}`);
      if (item.lastBatchReceivedDate) {
        const ago = formatFmt(item.lastBatchReceivedDate);
        lines.push(`     Último lote: ${formatDate(item.lastBatchReceivedDate)}${ago ? ` (${ago})` : ''}  —  Cantidad: ${item.lastBatchQuantity != null ? `${Number(item.lastBatchQuantity).toLocaleString('es-AR')} ${ul}` : '—'}`);
      }
      lines.push('');
    });

    lines.push('──────────────────────────────────────────────────────────');
  });

  lines.push('');
  lines.push('  Dulce Hora · PanStock — Sistema de gestión de inventario');
  return lines.join('\n');
}

/**
 * Abre una ventana HTML que el navegador guarda como PDF.
 * No se necesitan bibliotecas externas — usa window.print() con CSS @media print.
 */
function openPrintWindow(items, user) {
  const now  = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const owner = user ? `${user.firstName} ${user.lastName}` : '';

  const urgencyColors = {
    critical: '#C0392B', high: '#E67E22', medium: '#D68910', low: '#2E7D32',
  };
  const urgencyLabels = {
    critical: 'Crítico', high: 'Urgente', medium: 'Medio', low: 'Bajo',
  };

  const groups = { critical: [], high: [], medium: [], low: [] };
  items.forEach((i) => groups[urgency(i.stockPercentage)].push(i));
  const groupOrder = ['critical', 'high', 'medium', 'low'];

  // Build rows HTML
  let rowsHtml = '';
  let globalIdx = 0;

  groupOrder.forEach((gKey) => {
    const gItems = groups[gKey];
    if (!gItems.length) return;
    const gColor = urgencyColors[gKey];
    const gLabel = urgencyLabels[gKey];

    rowsHtml += `
      <tr class="group-header-row">
        <td colspan="7" style="background:${gColor}18; color:${gColor}; font-weight:700; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; padding:6px 10px; border-left:3px solid ${gColor};">
          ${gLabel.toUpperCase()} — ${gItems.length} producto${gItems.length !== 1 ? 's' : ''}
        </td>
      </tr>`;

    gItems.forEach((item) => {
      globalIdx++;
      const ul      = UNIT_LABELS[item.unitType] || '';
      const missing = item.minimumStock != null && item.currentStock != null
        ? parseFloat((item.minimumStock - item.currentStock).toFixed(3))
        : null;
      const pct = item.stockPercentage ?? 0;

      rowsHtml += `
        <tr class="data-row">
          <td class="td-idx">${globalIdx}</td>
          <td class="td-product">
            <div class="product-name">${item.productName}</div>
            <div class="product-cat">${item.categoryName || '—'}</div>
          </td>
          <td class="td-origin">${item.origin === 'FRANCHISE' ? 'Franquicia' : 'Externo'}</td>
          <td class="td-stock">
            <div class="stock-current" style="color:${gColor}">${Number(item.currentStock).toLocaleString('es-AR')} ${ul}</div>
            <div class="stock-min">mín. ${Number(item.minimumStock).toLocaleString('es-AR')} ${ul}</div>
            <div class="stock-bar-wrap">
              <div class="stock-bar-track">
                <div class="stock-bar-fill" style="width:${Math.min(pct,100)}%; background:${gColor}"></div>
              </div>
              <span class="stock-bar-pct" style="color:${gColor}">${pct}%</span>
            </div>
          </td>
          <td class="td-reponer" style="color:#C0392B; font-weight:800;">
            ${missing != null ? `+${Number(missing).toLocaleString('es-AR')} ${ul}` : '—'}
          </td>
          <td class="td-supplier">
            <div class="sup-name">${item.supplierName || '—'}</div>
            <div class="sup-schedule">${item.supplierOrderSchedule || 'Consultar'}</div>
          </td>
          <td class="td-lastbatch">
            ${item.lastBatchReceivedDate
              ? `<div>${formatDate(item.lastBatchReceivedDate)}</div><div class="last-ago">${formatFmt(item.lastBatchReceivedDate) || ''}</div><div class="last-qty">${item.lastBatchQuantity != null ? `${Number(item.lastBatchQuantity).toLocaleString('es-AR')} ${ul}` : '—'}</div>`
              : '<span style="color:#B5A898">Sin registros</span>'}
          </td>
        </tr>`;
    });
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reposición de stock — PanStock</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 11px;
    color: #1C1108;
    background: #fff;
    padding: 24px 28px;
  }

  /* ── Header ── */
  .doc-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; padding-bottom: 14px;
    border-bottom: 2px solid #1C1108;
  }
  .doc-brand { display: flex; flex-direction: column; gap: 2px; }
  .doc-brand-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px; font-weight: 700; color: #1C1108; letter-spacing: -0.02em;
  }
  .doc-brand-sub { font-size: 9px; color: #8C7B6B; letter-spacing: 0.1em; text-transform: uppercase; }
  .doc-meta { text-align: right; font-size: 9px; color: #8C7B6B; line-height: 1.7; }
  .doc-meta strong { color: #1C1108; }
  .doc-title-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .doc-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15px; font-weight: 700; color: #1C1108;
  }
  .doc-count {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: #8C7B6B; padding: 3px 10px; border-radius: 20px; border: 1px solid #EDE6DB;
  }

  /* ── Summary badges ── */
  .summary-strip { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .summary-pill {
    display: flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 20px; font-size: 9px; font-weight: 700;
  }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }
  thead th {
    background: #1C1108; color: #F7F3EE;
    font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 7px 8px; text-align: left;
  }
  .data-row td { padding: 7px 8px; border-bottom: 1px solid #F0EAE0; vertical-align: top; }
  .data-row:nth-child(even) td { background: #FDFBF8; }
  .group-header-row td { border-bottom: none; }

  .td-idx { color: #B5A898; font-size: 9px; font-weight: 600; width: 24px; text-align: center; }
  .td-product { min-width: 130px; }
  .product-name { font-weight: 700; font-size: 10.5px; color: #1C1108; }
  .product-cat  { font-size: 8.5px; color: #8C7B6B; margin-top: 1px; }
  .td-origin  { font-size: 9px; color: #8C7B6B; white-space: nowrap; }
  .td-stock   { min-width: 100px; }
  .stock-current { font-weight: 800; font-size: 11px; }
  .stock-min     { font-size: 8.5px; color: #8C7B6B; margin-top: 1px; }
  .stock-bar-wrap { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .stock-bar-track { flex: 1; height: 5px; background: #EDE6DB; border-radius: 3px; overflow: hidden; }
  .stock-bar-fill  { height: 100%; border-radius: 3px; }
  .stock-bar-pct   { font-size: 8px; font-weight: 700; min-width: 26px; }
  .td-reponer { font-size: 11px; white-space: nowrap; }
  .td-supplier { min-width: 110px; }
  .sup-name     { font-weight: 600; font-size: 10px; color: #1C1108; }
  .sup-schedule { font-size: 8px; color: #8C7B6B; margin-top: 2px; line-height: 1.4; }
  .td-lastbatch { min-width: 90px; font-size: 9px; line-height: 1.5; }
  .last-ago  { color: #B5A898; font-size: 8px; }
  .last-qty  { font-weight: 600; color: #1C1108; font-size: 9px; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 20px; padding-top: 12px;
    border-top: 1px solid #EDE6DB;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 8.5px; color: #B5A898;
  }
  .doc-footer strong { color: #8C7B6B; }

  /* ── Print ── */
  @media print {
    body { padding: 12px 16px; }
    @page { margin: 1cm; size: A4 landscape; }
    .no-print { display: none !important; }
    .data-row { page-break-inside: avoid; }
  }

  /* ── Print button (screen only) ── */
  .print-bar {
    position: fixed; bottom: 20px; right: 20px;
    display: flex; gap: 10px;
    z-index: 999;
  }
  .print-btn {
    padding: 12px 22px;
    background: #1C1108; color: #F7F3EE;
    border: none; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; box-shadow: 0 8px 24px rgba(28,17,8,0.25);
    transition: all 0.15s ease;
  }
  .print-btn:hover { background: #2E1D0E; transform: translateY(-2px); }
  .print-btn.close-btn {
    background: transparent; color: #8C7B6B;
    border: 1.5px solid #EDE6DB; box-shadow: none;
    padding: 12px 16px;
  }
  .print-btn.close-btn:hover { border-color: #C0392B; color: #C0392B; }
</style>
</head>
<body>

<!-- ── Document header ── -->
<div class="doc-header">
  <div class="doc-brand">
    <div class="doc-brand-name">PanStock</div>
    <div class="doc-brand-sub">Dulce Hora · Gestión de inventario</div>
  </div>
  <div class="doc-meta">
    <div><strong>Generado:</strong> ${now}</div>
    ${owner ? `<div><strong>Por:</strong> ${owner}</div>` : ''}
    <div><strong>Total a reponer:</strong> ${items.length} producto${items.length !== 1 ? 's' : ''}</div>
  </div>
</div>

<!-- ── Title + count ── -->
<div class="doc-title-row">
  <div class="doc-title">Lista de reposición de stock</div>
  <div class="doc-count">${items.length} producto${items.length !== 1 ? 's' : ''} bajo el mínimo</div>
</div>

<!-- ── Summary pills ── -->
<div class="summary-strip">
  ${['critical','high','medium','low']
    .filter((k) => groups[k].length > 0)
    .map((k) => `<div class="summary-pill" style="color:${urgencyColors[k]};background:${urgencyColors[k]}18;">${urgencyLabels[k]}: ${groups[k].length}</div>`)
    .join('')}
</div>

<!-- ── Table ── -->
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Producto</th>
      <th>Origen</th>
      <th>Stock actual / Mínimo</th>
      <th>A reponer</th>
      <th>Proveedor / Horario pedidos</th>
      <th>Último lote</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<!-- ── Footer ── -->
<div class="doc-footer">
  <div>PanStock · Dulce Hora · Sistema de gestión de inventario</div>
  <div>Generado el ${now}${owner ? ` · ${owner}` : ''}</div>
</div>

<!-- ── Print bar (screen only) ── -->
<div class="print-bar no-print-hide">
  <button class="print-btn close-btn" onclick="window.close()">✕ Cerrar</button>
  <button class="print-btn" onclick="window.print()">🖨 Guardar como PDF</button>
</div>

<script>
  // Auto-trigger print dialog after fonts load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      // Small delay so the user sees the preview first
      setTimeout(() => window.print(), 600);
    });
  }
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes');
  if (!win) {
    alert('Tu navegador bloqueó la ventana emergente. Por favor permití las ventanas emergentes para este sitio y volvé a intentarlo.');
    return false;
  }
  win.document.write(html);
  win.document.close();
  return true;
}

// ─── ExportToolbar component ───────────────────────────────────────────────────

function ExportToolbar({ items, user, visible }) {
  const [copyState,   setCopyState]   = useState('idle'); // idle | copying | done | error
  const [exportState, setExportState] = useState('idle'); // idle | opening | done | error

  const handleCopy = useCallback(async () => {
    if (copyState !== 'idle') return;
    setCopyState('copying');
    try {
      const text = buildPlainText(items, user);
      await navigator.clipboard.writeText(text);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      try {
        const ta = document.createElement('textarea');
        ta.value = buildPlainText(items, user);
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyState('done');
        setTimeout(() => setCopyState('idle'), 2500);
      } catch {
        setCopyState('error');
        setTimeout(() => setCopyState('idle'), 2500);
      }
    }
  }, [items, user, copyState]);

  const handleExportPDF = useCallback(() => {
    if (exportState !== 'idle') return;
    setExportState('opening');
    const ok = openPrintWindow(items, user);
    if (ok) {
      setExportState('done');
      setTimeout(() => setExportState('idle'), 2500);
    } else {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 2500);
    }
  }, [items, user, exportState]);

  if (!visible) return null;

  const copyLabel = {
    idle:    '📋 Copiar lista',
    copying: 'Copiando...',
    done:    '✅ ¡Copiado!',
    error:   '⚠ Sin permiso',
  }[copyState];

  const exportLabel = {
    idle:    '📄 Exportar PDF',
    opening: 'Abriendo...',
    done:    '✅ Abierto',
    error:   '⚠ Bloqueado',
  }[exportState];

  const copyColor   = copyState   === 'done' ? '#2E7D32' : copyState   === 'error' ? '#C0392B' : undefined;
  const exportColor = exportState === 'done' ? '#2E7D32' : exportState === 'error' ? '#C0392B' : undefined;

  return (
    <div className="et-wrap">
      <div className="et-label">
        <span className="et-label-icon">📤</span>
        <span>Exportar</span>
      </div>

      <div className="et-buttons">
        {/* Copy to clipboard */}
        <button
          className={`et-btn copy ${copyState}`}
          onClick={handleCopy}
          disabled={copyState === 'copying'}
          style={copyColor ? { '--et-accent': copyColor } : {}}
          title="Copiar la lista completa como texto al portapapeles"
        >
          <span className="et-btn-icon">
            {copyState === 'done'    ? '✅' :
             copyState === 'error'   ? '⚠️' :
             copyState === 'copying' ? <span className="et-spinner" /> :
             <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
               <rect x="5" y="2" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
               <path d="M2 5v8a1.5 1.5 0 001.5 1.5H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
             </svg>}
          </span>
          <span>{copyLabel}</span>
        </button>

        {/* Export to PDF */}
        <button
          className={`et-btn pdf ${exportState}`}
          onClick={handleExportPDF}
          disabled={exportState === 'opening'}
          style={exportColor ? { '--et-accent': exportColor } : {}}
          title="Abrir vista de impresión para guardar como PDF"
        >
          <span className="et-btn-icon">
            {exportState === 'done'    ? '✅' :
             exportState === 'error'   ? '⚠️' :
             exportState === 'opening' ? <span className="et-spinner" /> :
             <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
               <path d="M4 1h5.5L13 4.5V15H4V1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
               <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
             </svg>}
          </span>
          <span>{exportLabel}</span>
        </button>
      </div>

      {/* Contextual hint */}
      {(exportState === 'error') && (
        <p className="et-hint error">
          ⚠ Tu navegador bloqueó la ventana emergente. Habilitá las ventanas emergentes para este sitio.
        </p>
      )}
      {(copyState === 'error') && (
        <p className="et-hint error">
          ⚠ No se pudo acceder al portapapeles. Verificá los permisos del navegador.
        </p>
      )}
      {(exportState === 'done') && (
        <p className="et-hint success">
          Se abrió la vista de impresión. En el diálogo, seleccioná "Guardar como PDF" como destino.
        </p>
      )}
      {(copyState === 'done') && (
        <p className="et-hint success">
          Lista copiada. Podés pegarla en WhatsApp, un correo o cualquier app.
        </p>
      )}

      <style>{`
        .et-wrap {
          display: flex; flex-direction: column; gap: 8px;
          padding: 12px 14px; border-radius: var(--radius-lg);
          background: white; border: 1.5px solid var(--cream-dark);
          box-shadow: var(--shadow-sm);
          animation: fadeIn 0.25s ease;
        }
        .et-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--warm-gray);
        }
        .et-label-icon { font-size: 0.85rem; }
        .et-buttons { display: flex; gap: 8px; flex-wrap: wrap; }

        .et-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 16px; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
          white-space: nowrap; flex: 1; min-width: 140px; justify-content: center;
          border: 1.5px solid transparent;
        }
        .et-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Copy button */
        .et-btn.copy {
          background: var(--espresso); color: var(--cream);
          box-shadow: var(--shadow-md);
        }
        .et-btn.copy:hover:not(:disabled) {
          background: var(--espresso-mid); transform: translateY(-1px);
          box-shadow: var(--shadow-lg);
        }
        .et-btn.copy.done  { background: #2E7D32; color: white; }
        .et-btn.copy.error { background: #C0392B; color: white; }

        /* PDF button */
        .et-btn.pdf {
          background: white; color: var(--espresso);
          border-color: var(--cream-dark);
          box-shadow: var(--shadow-sm);
        }
        .et-btn.pdf:hover:not(:disabled) {
          border-color: var(--espresso); background: var(--cream);
          transform: translateY(-1px); box-shadow: var(--shadow-md);
        }
        .et-btn.pdf.done  { background: #2E7D32; color: white; border-color: #2E7D32; }
        .et-btn.pdf.error { background: #C0392B; color: white; border-color: #C0392B; }

        .et-btn-icon {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; width: 16px; height: 16px;
        }

        .et-spinner {
          width: 13px; height: 13px;
          border: 2px solid currentColor; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.65s linear infinite;
          display: block;
        }

        .et-hint {
          font-size: 0.74rem; line-height: 1.5; padding: 6px 10px;
          border-radius: var(--radius-md); animation: fadeIn 0.2s ease;
        }
        .et-hint.success {
          background: rgba(46,125,50,0.08); color: #1E6B24;
          border: 1px solid rgba(46,125,50,0.2);
        }
        .et-hint.error {
          background: rgba(192,57,43,0.08); color: #A0392B;
          border: 1px solid rgba(192,57,43,0.2);
        }

        @media (max-width: 480px) {
          .et-btn { min-width: unset; }
        }
      `}</style>
    </div>
  );
}

// ─── StockBar ─────────────────────────────────────────────────────────────────
function StockBar({ pct, color }) {
  const clamped = Math.min(pct ?? 0, 100);
  return (
    <div className="sbar-wrap">
      <div className="sbar-track">
        <div className="sbar-fill" style={{ width: `${clamped}%`, background: color }} />
        <div className="sbar-min-line" title="Stock mínimo" />
      </div>
      <span className="sbar-pct" style={{ color }}>{clamped}%</span>
      <style>{`
        .sbar-wrap  { display: flex; align-items: center; gap: 8px; }
        .sbar-track {
          flex: 1; height: 8px; border-radius: 4px;
          background: var(--cream-dark); position: relative; overflow: visible;
        }
        .sbar-fill  { height: 100%; border-radius: 4px; transition: width 0.5s ease; min-width: 4px; }
        .sbar-min-line {
          position: absolute; right: 0; top: -3px;
          width: 2px; height: 14px; background: var(--espresso);
          border-radius: 1px; opacity: 0.25;
        }
        .sbar-pct { font-size: 0.72rem; font-weight: 700; min-width: 32px; text-align: right; }
      `}</style>
    </div>
  );
}

// ─── RestockCard ──────────────────────────────────────────────────────────────
function RestockCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const u   = urgency(item.stockPercentage);
  const cfg = URGENCY_CONFIG[u];
  const ul  = UNIT_LABELS[item.unitType] || '';
  const org = ORIGIN_LABELS[item.origin] || ORIGIN_LABELS.EXTERNAL;

  const missing = item.minimumStock != null && item.currentStock != null
    ? parseFloat((item.minimumStock - item.currentStock).toFixed(3))
    : null;

  return (
    <div
      className={`rc-card ${expanded ? 'open' : ''}`}
      style={{ '--urg-color': cfg.color, '--urg-bg': cfg.bg, animationDelay: `${index * 0.05}s` }}
    >
      <div className="rc-header" onClick={() => setExpanded((v) => !v)} role="button" aria-expanded={expanded}>
        <div className="rc-urgency-bar" style={{ background: cfg.color }} />
        <div className="rc-main">
          <div className="rc-row1">
            <div className="rc-name-group">
              <span className="rc-name">{item.productName}</span>
              <span className="rc-category">{item.categoryName}</span>
            </div>
            <span className="rc-badge" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div className="rc-bar-row">
            <StockBar pct={item.stockPercentage} color={cfg.color} />
          </div>
          <div className="rc-nums">
            <div className="rc-num-item">
              <span className="rc-num-label">Stock actual</span>
              <span className="rc-num-val" style={{ color: cfg.color }}>
                {Number(item.currentStock).toLocaleString('es-AR')} {ul}
              </span>
            </div>
            <div className="rc-num-sep" />
            <div className="rc-num-item">
              <span className="rc-num-label">Stock mínimo</span>
              <span className="rc-num-val">
                {Number(item.minimumStock).toLocaleString('es-AR')} {ul}
              </span>
            </div>
            {missing != null && (
              <>
                <div className="rc-num-sep" />
                <div className="rc-num-item">
                  <span className="rc-num-label">A reponer</span>
                  <span className="rc-num-val" style={{ color: '#C0392B', fontWeight: 800 }}>
                    +{Number(missing).toLocaleString('es-AR')} {ul}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="rc-supplier-row">
            <span className="rc-origin-chip" style={{ background: 'rgba(28,17,8,0.06)' }}>
              {org.icon} {org.label}
            </span>
            {item.supplierName && (
              <span className="rc-supplier-chip">🚚 {item.supplierName}</span>
            )}
            <span className="rc-expand-icon">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="rc-detail">
          <div className="rc-schedule">
            <span className="rc-schedule-icon">🕐</span>
            <div>
              <span className="rc-schedule-label">Horario de pedidos</span>
              <span className="rc-schedule-val">{item.supplierOrderSchedule || 'Consultar con el proveedor'}</span>
            </div>
          </div>
          <div className="rc-detail-grid">
            <div className="rc-detail-item">
              <span className="rc-detail-label">Último pedido</span>
              <span className="rc-detail-val">
                {item.lastBatchReceivedDate
                  ? <>{formatDate(item.lastBatchReceivedDate)} <span className="rc-detail-ago">({formatFmt(item.lastBatchReceivedDate)})</span></>
                  : 'Sin registros'}
              </span>
            </div>
            <div className="rc-detail-item">
              <span className="rc-detail-label">Cantidad pedida</span>
              <span className="rc-detail-val">
                {item.lastBatchQuantity != null
                  ? `${Number(item.lastBatchQuantity).toLocaleString('es-AR')} ${ul}`
                  : '—'}
              </span>
            </div>
            {item.supplierId && (
              <div className="rc-detail-item">
                <span className="rc-detail-label">Proveedor</span>
                <span className="rc-detail-val">{item.supplierName}</span>
              </div>
            )}
            <div className="rc-detail-item">
              <span className="rc-detail-label">Producto ID</span>
              <span className="rc-detail-val" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{item.productId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SummaryStrip ─────────────────────────────────────────────────────────────
function SummaryStrip({ items }) {
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    items.forEach((i) => { c[urgency(i.stockPercentage)]++; });
    return c;
  }, [items]);

  const pills = [
    { key: 'critical', ...URGENCY_CONFIG.critical },
    { key: 'high',     ...URGENCY_CONFIG.high     },
    { key: 'medium',   ...URGENCY_CONFIG.medium   },
    { key: 'low',      ...URGENCY_CONFIG.low      },
  ].filter((p) => counts[p.key] > 0);

  if (!pills.length) return null;

  return (
    <div className="ss-strip">
      {pills.map((p) => (
        <div key={p.key} className="ss-pill" style={{ color: p.color, background: p.bg }}>
          <span className="ss-pill-icon">{p.icon}</span>
          <span className="ss-pill-count">{counts[p.key]}</span>
          <span className="ss-pill-label">{p.label}</span>
        </div>
      ))}
      <style>{`
        .ss-strip { display: flex; flex-wrap: wrap; gap: 7px; }
        .ss-pill  {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 13px; border-radius: 20px;
          font-family: var(--font-body); font-size: 0.78rem;
        }
        .ss-pill-count { font-weight: 800; font-size: 1rem; line-height: 1; }
        .ss-pill-label { font-weight: 600; }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RestockPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const token     = useSelector(selectToken);
  const user      = useSelector(selectUser);
  const items     = useSelector(selectRestockItems);
  const status    = useSelector(selectRestockStatus);
  const error     = useSelector(selectRestockError);
  const lastFetch = useSelector(selectRestockLastFetch);

  const [search,       setSearch]       = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [expandAll,    setExpandAll]    = useState(false);

  // Guard: redirect non-OWNER
  useEffect(() => {
    if (user && user.role !== 'OWNER') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Fetch on mount
  useEffect(() => {
    if (!token) return;
    dispatch(clearRestockState());
    dispatch(fetchRestockSuggestions({ token }));
  }, [token, dispatch]);

  const refresh = () => {
    dispatch(clearRestockState());
    dispatch(fetchRestockSuggestions({ token }));
  };

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterOrigin) list = list.filter((i) => i.origin === filterOrigin);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          (i.productName  || '').toLowerCase().includes(q) ||
          (i.categoryName || '').toLowerCase().includes(q) ||
          (i.supplierName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, search, filterOrigin]);

  const isLoading   = status === 'loading';
  const hasResults  = status === 'succeeded' && filtered.length > 0;

  const lastFetchStr = lastFetch
    ? new Date(lastFetch).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (user && user.role !== 'OWNER') return null;

  return (
    <div className="rp-page">
      <AppTopbar />

      <div className="rp-content">

        {/* ── Header ── */}
        <div className="rp-header">
          <div className="rp-header-text">
            <h1 className="rp-title">📋 Reposición de stock</h1>
            <p className="rp-sub">
              Productos por debajo del stock mínimo
              {status === 'succeeded' && (
                <> · <strong>{items.length}</strong> producto{items.length !== 1 ? 's' : ''} a reponer</>
              )}
              {lastFetchStr && <> · actualizado {lastFetchStr}</>}
            </p>
          </div>
          <button
            className="rp-refresh-btn"
            onClick={refresh}
            disabled={isLoading}
            title="Actualizar sugerencias"
          >
            <span className={isLoading ? 'spin' : ''}>↻</span>
          </button>
        </div>

        {/* ── Info banner ── */}
        <div className="rp-info-banner">
          <span>ℹ️</span>
          <p>
            Productos con <strong>stock mínimo configurado</strong> cuyo inventario actual
            esté por debajo de ese mínimo. El porcentaje indica cuánto stock disponible
            queda respecto al mínimo exigido.
          </p>
        </div>

        {error && <div className="rp-error">⚠ {error}</div>}
        {isLoading && <TableSkeleton rows={5} />}

        {/* ── Summary strip ── */}
        {status === 'succeeded' && items.length > 0 && (
          <SummaryStrip items={filtered.length ? filtered : items} />
        )}

        {/* ── Export toolbar — aparece cuando hay resultados ── */}
        <ExportToolbar
          items={filtered.length > 0 ? filtered : items}
          user={user}
          visible={status === 'succeeded' && items.length > 0}
        />

        {/* ── Filters + controls ── */}
        {status === 'succeeded' && items.length > 0 && (
          <div className="rp-controls">
            <div className="rp-search-wrap">
              <span className="rp-search-icon">🔍</span>
              <input
                className="rp-search"
                placeholder="Buscar producto, categoría o proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="rp-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <select
              className="rp-filter-sel"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
            >
              <option value="">Todos los orígenes</option>
              <option value="FRANCHISE">🏷 Franquicia</option>
              <option value="EXTERNAL">🌐 Externo</option>
            </select>
            <button
              className="rp-expand-btn"
              onClick={() => setExpandAll((v) => !v)}
            >
              {expandAll ? '▲ Contraer' : '▼ Expandir'}
            </button>
          </div>
        )}

        {/* ── Empty: all good ── */}
        {status === 'succeeded' && items.length === 0 && (
          <div className="rp-empty-ok">
            <span className="rp-empty-icon">✅</span>
            <h3 className="rp-empty-title">¡Todo en orden!</h3>
            <p className="rp-empty-desc">
              No hay productos por debajo del stock mínimo. El inventario está completo.
            </p>
            <button className="rp-btn-stock" onClick={() => navigate('/stock')}>
              Ver inventario completo
            </button>
          </div>
        )}

        {/* ── Empty: search/filter no match ── */}
        {status === 'succeeded' && items.length > 0 && filtered.length === 0 && (
          <div className="rp-empty-search">
            <span>🔍</span>
            <p>Sin resultados para los filtros aplicados.</p>
            <button className="rp-btn-clear" onClick={() => { setSearch(''); setFilterOrigin(''); }}>
              Limpiar filtros
            </button>
          </div>
        )}

        {/* ── Cards list ── */}
        {hasResults && (
          <div className="rp-list">
            {filtered.map((item, i) => (
              <RestockCard key={item.productId} item={item} index={i} forceExpand={expandAll} />
            ))}
          </div>
        )}

        {hasResults && (
          <p className="rp-count">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
            {(search || filterOrigin) && ` · filtrado${filtered.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* ── Quick nav ── */}
        {status === 'succeeded' && (
          <div className="rp-quick-nav">
            <button className="rp-nav-btn" onClick={() => navigate('/stock')}>📦 Ver stock completo</button>
            <button className="rp-nav-btn" onClick={() => navigate('/products')}>🥐 Editar productos</button>
            <button className="rp-nav-btn" onClick={() => navigate('/suppliers')}>🚚 Ver proveedores</button>
          </div>
        )}

      </div>

      <style>{`
        .rp-page    { min-height: 100vh; background: var(--cream); }
        .rp-content {
          max-width: 860px; margin: 0 auto;
          padding: var(--space-lg) var(--space-md);
          display: flex; flex-direction: column; gap: var(--space-md);
        }
        .rp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .rp-title { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: var(--espresso); margin-bottom: 4px; }
        .rp-sub   { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.5; }
        .rp-refresh-btn {
          width: 38px; height: 38px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-size: 1.1rem; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--warm-gray); transition: all var(--transition-fast);
        }
        .rp-refresh-btn:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .rp-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { display: inline-block; animation: spin 0.7s linear infinite; }

        .rp-info-banner {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 11px 14px; border-radius: var(--radius-md);
          background: rgba(200,137,58,0.07); border: 1px solid rgba(200,137,58,0.22);
        }
        .rp-info-banner p { font-size: 0.8rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }

        .rp-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem;
        }

        .rp-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .rp-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .rp-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; pointer-events: none; }
        .rp-search {
          width: 100%; padding: 9px 34px;
          font-family: var(--font-body); font-size: 0.86rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none; box-sizing: border-box;
          transition: border-color var(--transition-base);
        }
        .rp-search:focus { border-color: var(--amber); }
        .rp-search-clear {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }
        .rp-filter-sel {
          padding: 9px 12px; font-family: var(--font-body); font-size: 0.84rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          cursor: pointer; -webkit-appearance: none;
          transition: border-color var(--transition-base);
        }
        .rp-filter-sel:focus { border-color: var(--amber); }
        .rp-expand-btn {
          padding: 9px 14px; background: var(--cream-dark);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .rp-expand-btn:hover { border-color: var(--amber); color: var(--espresso); }

        .rp-list { display: flex; flex-direction: column; gap: 9px; }

        /* ── RestockCard ── */
        .rc-card {
          background: white; border-radius: var(--radius-lg);
          border: 1.5px solid var(--cream-dark);
          box-shadow: var(--shadow-sm); overflow: hidden;
          animation: fadeIn 0.3s ease both;
          transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
        }
        .rc-card:hover { box-shadow: var(--shadow-md); }
        .rc-card.open  { border-color: var(--urg-color); }
        .rc-header { display: flex; align-items: stretch; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .rc-urgency-bar { width: 4px; background: var(--urg-color); flex-shrink: 0; }
        .rc-main { flex: 1; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .rc-row1 { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .rc-name-group { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .rc-name     { font-weight: 700; font-size: 0.96rem; color: var(--espresso); word-break: break-word; }
        .rc-category { font-size: 0.74rem; color: var(--warm-gray); }
        .rc-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700; flex-shrink: 0; white-space: nowrap;
        }
        .rc-nums {
          display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
          background: var(--cream); border-radius: var(--radius-md); padding: 8px 12px;
        }
        .rc-num-item { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 80px; }
        .rc-num-sep  { width: 1px; height: 28px; background: var(--cream-dark); flex-shrink: 0; margin: 0 4px; }
        .rc-num-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--warm-gray-light); }
        .rc-num-val   { font-size: 0.88rem; font-weight: 700; color: var(--espresso); }
        .rc-supplier-row { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
        .rc-origin-chip, .rc-supplier-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600; color: var(--warm-gray);
        }
        .rc-expand-icon { font-size: 0.65rem; color: var(--warm-gray-light); margin-left: auto; flex-shrink: 0; }
        .rc-detail {
          border-top: 1px solid var(--cream-dark);
          background: var(--urg-bg, rgba(200,137,58,0.03));
          padding: 14px 18px; display: flex; flex-direction: column; gap: 12px;
          animation: fadeIn 0.2s ease;
        }
        .rc-schedule {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; border-radius: var(--radius-md);
          background: white; border: 1.5px solid var(--urg-color, var(--amber));
        }
        .rc-schedule-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
        .rc-schedule-label { display: block; font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--warm-gray-light); margin-bottom: 3px; }
        .rc-schedule-val   { display: block; font-size: 0.9rem; font-weight: 700; color: var(--espresso); }
        .rc-detail-grid { display: flex; flex-wrap: wrap; gap: 14px; }
        .rc-detail-item { display: flex; flex-direction: column; gap: 2px; min-width: 110px; flex: 1; }
        .rc-detail-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--warm-gray-light); }
        .rc-detail-val   { font-size: 0.84rem; font-weight: 600; color: var(--espresso); }
        .rc-detail-ago   { font-size: 0.72rem; color: var(--warm-gray); font-weight: 400; }

        /* Empty states */
        .rp-empty-ok {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 56px 24px; text-align: center;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);
        }
        .rp-empty-icon  { font-size: 3rem; }
        .rp-empty-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--espresso); }
        .rp-empty-desc  { font-size: 0.85rem; color: var(--warm-gray); max-width: 320px; line-height: 1.6; }
        .rp-btn-stock {
          padding: 11px 22px; background: var(--espresso); color: var(--cream);
          border: none; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast); box-shadow: var(--shadow-md);
        }
        .rp-btn-stock:hover { background: var(--espresso-mid); transform: translateY(-1px); }
        .rp-empty-search { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 24px; text-align: center; }
        .rp-empty-search > span { font-size: 2rem; opacity: 0.4; }
        .rp-empty-search > p { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--espresso); }
        .rp-btn-clear {
          padding: 8px 18px; background: var(--cream-dark); border: none;
          border-radius: var(--radius-md); font-family: var(--font-body);
          font-size: 0.84rem; font-weight: 600; color: var(--warm-gray);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .rp-btn-clear:hover { background: var(--cream-medium); color: var(--espresso); }
        .rp-count { text-align: right; font-size: 0.75rem; color: var(--warm-gray-light); }
        .rp-quick-nav {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding-top: var(--space-sm); border-top: 1px solid var(--cream-dark); margin-top: var(--space-sm);
        }
        .rp-nav-btn {
          padding: 9px 16px; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.82rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .rp-nav-btn:hover { border-color: var(--amber); color: var(--espresso); }

        @media (max-width: 480px) {
          .rp-content    { padding: var(--space-md) var(--space-sm); }
          .rc-nums       { flex-direction: column; gap: 8px; }
          .rc-num-sep    { display: none; }
          .rc-num-item   { flex-direction: row; justify-content: space-between; min-width: unset; }
          .rp-controls   { flex-direction: column; align-items: stretch; }
          .rp-filter-sel { width: 100%; }
          .rp-expand-btn { align-self: flex-start; }
          .rc-detail-grid { gap: 10px; }
          .rc-detail-item { min-width: 90px; }
        }
      `}</style>
    </div>
  );
}