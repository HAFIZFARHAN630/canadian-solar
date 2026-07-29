'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Toaster, toast } from 'sonner';

function formatProdDate(d: string) {
  if (!d || d.length !== 8) return d || '-';
  return `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`;
}

export default function Home() {
  const [serialNumber, setSerialNumber] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaUuid, setCaptchaUuid] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultModal, setResultModal] = useState<'success' | 'notfound' | 'limit' | null>(null);
  const [moduleInfo, setModuleInfo] = useState<Record<string, string> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);
  const adminTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAdminTap = () => {
    if (adminTimerRef.current) clearTimeout(adminTimerRef.current);
    const next = adminClicks + 1;
    setAdminClicks(next);
    if (next >= 5) { setAdminClicks(0); window.location.href = '/admin'; return; }
    adminTimerRef.current = setTimeout(() => setAdminClicks(0), 3000);
  };

  const refreshCaptcha = useCallback(() => {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    setCaptchaUuid(uuid);
    setCaptchaSvg('');
    fetch(`/api/captcha?uuid=${uuid}`).then(r => r.text()).then(svg => setCaptchaSvg(svg)).catch(() => {});
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) refreshCaptcha(); }, [mounted, refreshCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) { toast.error('Please input the product serial number'); return; }
    if (!captchaCode.trim()) { toast.error('Please input the verification code'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/query-module', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: captchaCode, moduleSn: serialNumber.trim(), queryTime: new Date().toISOString(), uuid: captchaUuid })
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setModuleInfo(data.data); setResultModal('success');
      } else if (data.code === 2 || data.data === null) { setResultModal('notfound'); }
      else { toast.error(data.msg || 'Verification failed'); }
    } catch { toast.error('Network error, please try again'); }
    setLoading(false); refreshCaptcha(); setCaptchaCode('');
  };

  const closeModal = () => { setResultModal(null); setModuleInfo(null); };

  return (
    <>
      <Toaster position="top-center" richColors />
      <style>{`
        @media (max-width: 600px) {
          .csi-card { padding: 20px 15px !important; }
          .csi-title { font-size: 26px !important; }
          .csi-sn-input { width: 100% !important; }
          .csi-captcha-row { flex-wrap: wrap; gap: 10px !important; }
          .csi-captcha-input { width: 100% !important; box-sizing: border-box; }
          .csi-captcha-svg { width: 120px !important; height: 36px !important; }
          .csi-loc-img { width: 200px !important; }
          .csi-logo { width: 180px !important; }
          .csi-modal-success { maxHeight: 90vh !important; }
          .csi-modal-title { font-size: 20px !important; padding: 14px 10px !important; }
          .csi-modal-table-wrap { width: 94% !important; }
          .csi-td-label, .csi-td-value { font-size: 12px !important; padding: 8px 4px !important; }
          .csi-warranty { font-size: 12px !important; padding: 8px 10px 16px 10px !important; }
          .csi-modal-body { font-size: 15px !important; line-height: 26px !important; padding: 20px 16px 10px 16px !important; }
          .csi-modal-small { max-width: 95% !important; }
        }
        @media (max-width: 380px) {
          .csi-card { padding: 15px 10px !important; }
          .csi-title { font-size: 22px !important; }
          .csi-captcha-svg { width: 100px !important; height: 32px !important; }
        }
      `}</style>

      {/* Prevent hydration mismatch - only render after mount */}
      {!mounted && <div style={{ minHeight: '100vh', background: '#1a1a2e' }} />}
      {mounted && <>
      {/* Full-page background image */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/bg_chaxun.jpg)', backgroundSize: '100% 100%',
        backgroundPosition: 'center top', backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed', zIndex: 0,
      }} />

      {/* Main content layer */}
      <div style={{ position: 'relative', zIndex: 100, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#fff' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 15px' }}>
            <a href="https://cn.csisolar.com" style={{ display: 'inline-block', lineHeight: '60px' }}>
              <img src="/enlogo.png" alt="Canadian Solar" className="csi-logo" style={{ width: '260px', height: 'auto', verticalAlign: 'middle', maxWidth: '60%' }} />
            </a>
          </div>
        </header>

        {/* Main container */}
        <div style={{ flex: 1, padding: '100px 0 80px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '1200px', padding: '0 15px' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="csi-card" style={{ background: '#fff', width: '550px', maxWidth: '100%', margin: '0 auto', borderRadius: '5px', boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)', padding: '30px 55px', boxSizing: 'border-box' }}>
              <form onSubmit={handleSubmit}>
                <div>
                  <div className="csi-title" style={{ fontSize: '38px', fontWeight: 'bold', paddingBottom: '10px', marginBottom: '20px', borderBottom: '3px solid #000', color: '#000' }}>
                    Module Authenticity
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ display: 'block', fontSize: '20px', color: '#000', marginBottom: '5px' }}>Input Product Serial Number</span>
                    <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} autoComplete="off"
                      placeholder="Please input the product serial number"
                      className="csi-sn-input" style={{ border: '1px solid #D8D8D8', width: 'calc(100% - 20px)', maxWidth: '100%', padding: '10px', fontSize: '16px', borderRadius: '5px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <img src="/chaxun_ma.jpg" alt="Module serial number location" className="csi-loc-img" style={{ display: 'block', width: '300px', maxWidth: '100%' }} />
                    <span style={{ display: 'block', fontSize: '16px', color: '#4F4F4F', margin: '3px 0 10px 0' }}>
                      Module serial number location（A string of numbers&amp;letter combinations）
                    </span>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ display: 'block', fontSize: '20px', color: '#000', marginBottom: '5px' }}>Input Verification Code</span>
                    <div className="csi-captcha-row" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <input type="text" value={captchaCode} onChange={e => setCaptchaCode(e.target.value)} autoComplete="off"
                        placeholder="Please input the verification code"
                        className="csi-captcha-input"
                        style={{ border: '1px solid #D8D8D8', width: '200px', padding: '10px', fontSize: '16px', borderRadius: '5px', outline: 'none', fontFamily: 'inherit', flex: '1 1 auto', minWidth: 0, boxSizing: 'border-box' }} />
                      <button type="button" onClick={refreshCaptcha} title="Click to refresh"
                        style={{ cursor: 'pointer', border: 'none', padding: 0, background: 'none', flexShrink: 0 }}>
                        {captchaSvg ? <div dangerouslySetInnerHTML={{ __html: captchaSvg }} className="csi-captcha-svg" style={{ width: '140px', height: '40px' }} />
                          : <div className="csi-captcha-svg" style={{ width: '140px', height: '40px', background: '#f3f4f6', borderRadius: '4px' }} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <button type="submit" disabled={loading}
                      style={{ display: 'block', background: 'rgb(206, 4, 18)', marginBottom: '20px', borderRadius: '5px', padding: '10px', textAlign: 'center', fontSize: '20px', color: '#fff', fontWeight: 'bold', border: '0', cursor: loading ? 'not-allowed' : 'pointer', width: '100%', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {loading ? 'Verifying...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
            <div style={{ clear: 'both' }} />
          </div>
        </div>

        {/* Footer */}
        <footer style={{ position: 'fixed', left: 0, bottom: 0, zIndex: 100, width: '100%', background: '#535353', padding: '10px', textAlign: 'center', cursor: 'default' }}>
          <p style={{ margin: 0, color: '#ccc', fontSize: '13px' }} onClick={handleAdminTap}>Copyright © Canadian Solar. All rights reserved (c)</p>
        </footer>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {resultModal === 'success' && moduleInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="csi-modal-overlay"
            style={{ position: 'fixed', left: 0, top: 0, zIndex: 998, height: '100%', width: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="csi-modal-success"
              style={{ background: '#fff', width: '550px', maxWidth: '100%', borderRadius: '8px', boxShadow: '0 0 30px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ textAlign: 'right', background: 'rgb(206,4,18)', padding: '10px 30px' }}>
                <button onClick={closeModal} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }} aria-label="Close">
                  <X style={{ color: '#fff', width: 18, height: 18 }} />
                </button>
              </div>
              <div className="csi-modal-title" style={{ fontSize: '24px', color: 'rgb(206,4,18)', textAlign: 'center', padding: '20px 0', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>Module Information</div>
              <div className="csi-modal-table-wrap" style={{ borderLeft: '1px solid #D8D8D8', borderTop: '1px solid #D8D8D8', width: '80%', margin: '0 auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif' }}>
                  <tbody>
                    {[
                      ['Serial Number', moduleInfo.moduleSn],
                      ['Module Type', moduleInfo.moduleType],
                      ['Power', moduleInfo.power],
                      ['Module Grade', moduleInfo.moduleGrade],
                      ['Ship To Country', moduleInfo.endMarketCountry],
                      ...(moduleInfo.customerDesc ? [["Importer's Name", moduleInfo.customerDesc]] : []),
                      ...(moduleInfo.productionDate ? [['Date of Production', formatProdDate(moduleInfo.productionDate)]] : []),
                      ...(moduleInfo.actualMovementDate ? [['Date of Shipment', formatProdDate(moduleInfo.actualMovementDate)]] : []),
                      ['Query Date', moduleInfo.queryTime || new Date().toLocaleString()],
                      ['Query Times', String(moduleInfo.queryNumber)],
                    ].map(([label, value], i) => (
                      <tr key={i}>
                        <td className="csi-td-label" style={{ padding: '10px', borderBottom: '1px solid #D8D8D8', borderRight: '1px solid #D8D8D8', fontSize: '14px', color: '#000', width: '40%', textAlign: 'center', wordBreak: 'break-word' }}>{label}</td>
                        <td className="csi-td-value" style={{ padding: '10px', borderBottom: '1px solid #D8D8D8', borderRight: '1px solid #D8D8D8', fontSize: '14px', color: '#000', textAlign: 'center', wordBreak: 'break-word' }}>{value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="csi-warranty" style={{ textAlign: 'center', fontSize: '14px', color: 'rgb(206,4,18)', padding: '10px 0 20px 0', fontFamily: 'Arial, sans-serif' }}>
                Warranty is effective only in the above ship to Country
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Found Modal */}
      <AnimatePresence>
        {resultModal === 'notfound' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', left: 0, top: 0, zIndex: 998, height: '100%', width: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="csi-modal-small"
              style={{ background: '#fff', width: '550px', maxWidth: '100%', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'right', background: 'rgb(206, 4, 18)', padding: '10px 20px' }}>
                <button onClick={closeModal} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }} aria-label="Close">
                  <X style={{ color: '#fff', width: 18, height: 18 }} />
                </button>
              </div>
              <div className="csi-modal-body" style={{ fontSize: '18px', textAlign: 'center', color: '#000', lineHeight: '32px', padding: '28px 20px 10px 20px' }}>
                No information found,<br />please click{' '}
                <a href="https://www.csisolar.com/contactus/" style={{ fontSize: '20px', color: 'rgb(206, 4, 18)', fontWeight: 'bold', textDecoration: 'none' }}>here</a>
                {' '}to contact us.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit Modal */}
      <AnimatePresence>
        {resultModal === 'limit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', left: 0, top: 0, zIndex: 998, height: '100%', width: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="csi-modal-small"
              style={{ background: '#fff', width: '550px', maxWidth: '100%', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'right', background: 'rgb(206, 4, 18)', padding: '10px 20px' }}>
                <button onClick={closeModal} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }} aria-label="Close">
                  <X style={{ color: '#fff', width: 18, height: 18 }} />
                </button>
              </div>
              <div className="csi-modal-body" style={{ fontSize: '18px', textAlign: 'center', color: '#000', lineHeight: '32px', padding: '28px 20px 10px 20px' }}>
                Serial number cannot be found. Please email{' '}
                <a href="mailto:verification@csisolar.com" style={{ color: 'rgb(206, 4, 18)' }}>verification@csisolar.com</a>
                {' '}for further assistance.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      </>}
    </>
  );
}