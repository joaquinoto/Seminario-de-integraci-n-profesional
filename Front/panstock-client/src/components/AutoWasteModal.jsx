import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAutoWasteBatches,
  confirmAutoWaste,
} from '../features/waste/autoWasteNotificationSlice';

/**
 * AutoWasteModal
 *
 * Modal global que aparece cuando el sistema descartó lotes vencidos
 * automáticamente durante el día y el usuario aún no confirmó haberlos
 * procesado físicamente.
 *
 * Props:
 *   onDismiss — callback para ocultar el modal temporalmente
 *               (se vuelve a mostrar al navegar a otra ruta).
 */
export default function AutoWasteModal({ onDismiss }) {
  const dispatch  = useDispatch();
  const batches   = useSelector(selectAutoWasteBatches);
  const backdropRef = useRef(null);

  // Bloquear scroll del body mientras el modal está visible
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Cerrar con Escape (dismiss temporal)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onDismiss?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onDismiss]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onDismiss?.();
  };

  const handleConfirm = () => {
    dispatch(confirmAutoWaste());
  };

  const totalUnits = batches.reduce(
    (sum, b) => sum + Number(b.quantity || 0), 0
  );

  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 520;

  const modal = (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="awm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="awm-title"
    >
      <div className={`awm-sheet ${isNarrow ? 'awm-sheet--bottom' : ''}`}>

        {/* ── Header ── */}
        <div className="awm-header">
          <div className="awm-icon-wrap">
            <span className="awm-icon" role="img" aria-label="descarte automático">🗑️</span>
          </div>
          <div className="awm-header-text">
            <h2 className="awm-title" id="awm-title">
              Lotes descartados hoy
            </h2>
            <p className="awm-subtitle">
              El sistema registró{' '}
              <strong>{batches.length} lote{batches.length !== 1 ? 's' : ''}</strong>
              {' '}como merma por vencimiento
            </p>
          </div>
          {/* Botón cerrar temporal */}
          <button
            className="awm-close"
            onClick={onDismiss}
            aria-label="Cerrar temporalmente"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Info banner ── */}
        <div className="awm-info-banner">
          <span aria-hidden="true">ℹ️</span>
          <p>
            Estos lotes fueron dados de baja automáticamente. Por favor
            <strong> retiralos físicamente</strong> del mostrador o depósito
            y presioná el botón de confirmación.
          </p>
        </div>

        {/* ── Lista de lotes ── */}
        <div className="awm-list-wrap">
          <div className="awm-list">
            {batches.map((batch, i) => (
              <div
                key={batch.batchId}
                className="awm-batch-row"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="awm-batch-indicator" />
                <div className="awm-batch-body">
                  <span className="awm-batch-name">{batch.productName}</span>
                  <div className="awm-batch-meta">
                    <span className="awm-batch-chip awm-chip--qty">
                      📦 {Number(batch.quantity).toLocaleString('es-AR')} u. descartadas
                    </span>
                    <span className="awm-batch-chip awm-chip--id">
                      Lote #{batch.batchId}
                    </span>
                    {batch.wasteRecordId && (
                      <span className="awm-batch-chip awm-chip--rec">
                        Registro #{batch.wasteRecordId}
                      </span>
                    )}
                  </div>
                </div>
                <span className="awm-batch-icon" aria-hidden="true">💀</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Totalizador ── */}
        <div className="awm-total-row">
          <span className="awm-total-label">Total descartado hoy</span>
          <span className="awm-total-value">
            {Number(totalUnits).toLocaleString('es-AR')} unidades
          </span>
        </div>

        {/* ── Acciones ── */}
        <div className="awm-actions">
          <button
            className="awm-btn-dismiss"
            onClick={onDismiss}
          >
            Cerrar por ahora
          </button>
          <button
            className="awm-btn-confirm"
            onClick={handleConfirm}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2.5 8.5l4 4 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ya descarte los lotes
          </button>
        </div>

        {/* ── Hint reaparición ── */}
        <p className="awm-reappear-hint">
          Este aviso volverá a aparecer al navegar hasta que confirmes el descarte físico.
        </p>

      </div>

      <style>{`
        /* ── Backdrop ── */
        .awm-backdrop {
          position: fixed;
          inset: 0;
          z-index: 8000;
          background: rgba(28, 17, 8, 0.65);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: awmFadeIn 0.25s ease;
        }

        @keyframes awmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Sheet ── */
        .awm-sheet {
          width: 100%;
          max-width: 480px;
          max-height: calc(100dvh - 32px);
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(28, 17, 8, 0.30);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: awmSlideUp 0.3s cubic-bezier(0.34, 1.26, 0.64, 1);
        }

        /* En mobile → bottom sheet */
        @media (max-width: 519px) {
          .awm-backdrop {
            align-items: flex-end;
            padding: 0;
          }
          .awm-sheet {
            max-width: 100%;
            max-height: 92dvh;
            border-radius: 24px 24px 0 0;
          }
        }

        @keyframes awmSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }

        /* ── Header ── */
        .awm-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid #EDE6DB;
          flex-shrink: 0;
        }

        .awm-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(192, 57, 43, 0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .awm-icon { font-size: 1.25rem; line-height: 1; }

        .awm-header-text { flex: 1; min-width: 0; }
        .awm-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1C1108;
          margin-bottom: 3px;
          line-height: 1.3;
        }
        .awm-subtitle {
          font-size: 0.8rem;
          color: #8C7B6B;
          line-height: 1.4;
        }
        .awm-subtitle strong { color: #C0392B; }

        .awm-close {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #F7F3EE;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8C7B6B;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
          margin-top: 2px;
        }
        .awm-close:hover { background: #EDE6DB; color: #1C1108; }

        /* ── Info banner ── */
        .awm-info-banner {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin: 14px 16px 0;
          padding: 11px 13px;
          border-radius: 12px;
          background: rgba(192, 57, 43, 0.06);
          border: 1px solid rgba(192, 57, 43, 0.22);
          flex-shrink: 0;
        }
        .awm-info-banner p {
          font-size: 0.8rem;
          color: #8C7B6B;
          line-height: 1.5;
          margin: 0;
        }
        .awm-info-banner strong { color: #1C1108; }

        /* ── Lista scroll ── */
        .awm-list-wrap {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 12px 16px 0;
          min-height: 0;
        }

        .awm-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Batch row ── */
        .awm-batch-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 13px;
          background: #F7F3EE;
          border: 1.5px solid #EDE6DB;
          border-radius: 14px;
          animation: awmFadeIn 0.3s ease both;
          transition: border-color 0.15s;
        }
        .awm-batch-row:hover { border-color: rgba(192, 57, 43, 0.35); }

        .awm-batch-indicator {
          width: 4px;
          height: 36px;
          border-radius: 2px;
          background: #C0392B;
          flex-shrink: 0;
        }

        .awm-batch-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .awm-batch-name {
          font-weight: 700;
          font-size: 0.92rem;
          color: #1C1108;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .awm-batch-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .awm-batch-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .awm-chip--qty {
          background: rgba(192, 57, 43, 0.10);
          color: #C0392B;
        }
        .awm-chip--id {
          background: rgba(28, 17, 8, 0.06);
          color: #8C7B6B;
        }
        .awm-chip--rec {
          background: rgba(46, 125, 50, 0.08);
          color: #2E7D32;
        }

        .awm-batch-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
          opacity: 0.7;
        }

        /* ── Totalizador ── */
        .awm-total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 12px 16px 0;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(192, 57, 43, 0.05);
          border: 1px solid rgba(192, 57, 43, 0.18);
          flex-shrink: 0;
        }
        .awm-total-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #8C7B6B;
        }
        .awm-total-value {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1rem;
          font-weight: 700;
          color: #C0392B;
        }

        /* ── Acciones ── */
        .awm-actions {
          display: flex;
          gap: 10px;
          padding: 14px 16px;
          flex-shrink: 0;
        }

        .awm-btn-dismiss {
          padding: 12px 16px;
          background: #F7F3EE;
          border: 1.5px solid #EDE6DB;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 0.84rem;
          font-weight: 600;
          color: #8C7B6B;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .awm-btn-dismiss:hover {
          border-color: #8C7B6B;
          color: #1C1108;
        }

        .awm-btn-confirm {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          background: #2E7D32;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 16px rgba(46, 125, 50, 0.28);
        }
        .awm-btn-confirm:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(46, 125, 50, 0.34);
        }
        .awm-btn-confirm:active { transform: translateY(0); }

        /* ── Hint ── */
        .awm-reappear-hint {
          text-align: center;
          font-size: 0.7rem;
          color: #B5A898;
          padding: 0 16px 14px;
          line-height: 1.4;
          flex-shrink: 0;
        }

        /* ── Mobile extra tweaks ── */
        @media (max-width: 380px) {
          .awm-header { padding: 16px 14px 14px; }
          .awm-info-banner,
          .awm-total-row { margin-left: 12px; margin-right: 12px; }
          .awm-list-wrap { padding-left: 12px; padding-right: 12px; }
          .awm-actions   { padding: 12px 12px; flex-direction: column; }
          .awm-btn-dismiss { order: 2; text-align: center; }
          .awm-btn-confirm { order: 1; }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}