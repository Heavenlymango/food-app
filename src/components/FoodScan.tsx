import { useState, useRef, useEffect } from 'react';
import { MenuItem } from '../App';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Camera, Upload, X, Loader2, Plus, CheckCircle2, Flame, Leaf, ArrowLeft, ZoomIn, Flag, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const INFERENCE_API = import.meta.env.VITE_INFERENCE_API ?? 'http://localhost:8000';

const ALL_CLASSES = [
  'amok', 'bai_sach_chrouk', 'banana_pancakes', 'buddha_bowl', 'curry',
  'dumplings', 'french_fries', 'fried_egg', 'fried_rice', 'grilled_corn',
  'grilled_pork_ribs', 'grilled_skewer', 'hamburger', 'khor_ko', 'kuy_teav',
  'laksa', 'lok_lak', 'nom_banh_chok', 'num_pang', 'pad_thai',
  'papaya_salad', 'pho', 'pizza', 'pleah_sach_ko', 'ramen',
  'rice porridge', 'samlor_korko', 'samlor_machu', 'spring_rolls', 'sushi',
  'tofu_bowl', 'tom_yum_soup',
];

interface InferenceResult {
  predictions: ScanResult[];
  modelUsed: 'mobilenet' | 'yolo_small';
  topConfidence: number;
}

// ── Two-stage pipeline via local Python server ───────────────────────────────
async function recognizeFood(file: File, onStatus: (s: string) => void): Promise<InferenceResult> {
  onStatus('Running MobileNetV3…');
  const form = new FormData();
  form.append('file', file, file.name);
  let res: Response;
  try {
    res = await fetch(`${INFERENCE_API}/recognize`, { method: 'POST', body: form });
  } catch {
    throw new Error(
      'Cannot reach inference server at localhost:8000.\n' +
      'Run it with:\n  cd C:\\Users\\school\\Documents\\pp\n  evenv\\Scripts\\python.exe inference_server.py'
    );
  }
  if (!res.ok) throw new Error(`Inference server error (${res.status})`);
  const data = await res.json();
  if (data.model_used === 'yolo_small') onStatus('Upgraded to YOLOv11-small…');
  return {
    predictions: (data.predictions ?? []) as ScanResult[],
    modelUsed: data.model_used ?? 'mobilenet',
    topConfidence: data.top_confidence ?? 0,
  };
}

// ── Keyword mapping for menu search ──────────────────────────────────────────
const FOOD_LABEL_KEYWORDS: Record<string, string[]> = {
  fried_rice: ['fried rice'], fried_egg: ['fried egg', 'egg'],
  pad_thai: ['pad thai', 'noodle'], spring_rolls: ['spring roll'],
  nom_banh_chok: ['noodle', 'khmer noodle', 'nom banh chok'],
  kuy_teav: ['noodle soup', 'kuy teav'], khor_ko: ['khor ko'],
  bai_sach_chrouk: ['pork rice', 'grilled pork', 'bai sach'],
  amok: ['amok'], lok_lak: ['lok lak', 'beef'],
  papaya_salad: ['papaya salad', 'salad'], tom_yum_soup: ['tom yum', 'soup'],
  ramen: ['ramen', 'noodle'], pho: ['pho', 'soup'], pizza: ['pizza'],
  hamburger: ['hamburger', 'burger'], french_fries: ['french fries', 'fries'],
  sushi: ['sushi'], curry: ['curry'], laksa: ['laksa'],
  buddha_bowl: ['buddha bowl', 'bowl'], dumplings: ['dumpling'],
  banana_pancakes: ['pancake', 'banana'], grilled_corn: ['corn'],
  grilled_skewer: ['skewer', 'grilled'], grilled_pork_ribs: ['pork ribs', 'pork'],
  num_pang: ['sandwich', 'num pang'], 'rice porridge': ['porridge', 'congee', 'bobor'],
  tofu_bowl: ['tofu', 'bowl'], samlor_korko: ['samlor korko', 'soup'],
  samlor_machu: ['samlor machu', 'sour soup'],
  pleah_sach_ko: ['pleah sach ko', 'beef salad', 'salad'],
};

interface ScanResult { label: string; confidence: number; }
interface NutritionInfo {
  food_class: string; display_name: string;
  calories_per_serving: number; protein_g: number;
  carbs_g: number; fat_g: number; is_healthy: boolean; description: string;
}
interface FoodScanProps { onAddToCart: (item: MenuItem) => void; onClose: () => void; }
type ScanState = 'idle' | 'camera' | 'processing' | 'results' | 'error';
type ReportStep = 'idle' | 'form' | 'submitting' | 'done';

const C = {
  orange: '#ea580c', orangeLight: '#fff7ed', orangeBorder: '#fed7aa',
  white: '#ffffff', bg: '#fff8f0',
  gray100: '#f3f4f6', gray500: '#6b7280', gray900: '#111827',
  green: '#16a34a', red: '#dc2626', redLight: '#fef2f2',
};

export function FoodScan({ onAddToCart, onClose }: FoodScanProps) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [modelUsed, setModelUsed] = useState<'mobilenet' | 'yolo_small'>('mobilenet');
  const [topConfidence, setTopConfidence] = useState(0);
  const [matchedItems, setMatchedItems] = useState<MenuItem[]>([]);
  const [nutritionList, setNutritionList] = useState<NutritionInfo[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  // Report form
  const [reportStep, setReportStep] = useState<ReportStep>('idle');
  const [reportCorrect, setReportCorrect] = useState<boolean | null>(null);
  const [reportActualLabel, setReportActualLabel] = useState('');
  const [reportIsOther, setReportIsOther] = useState(false);
  const [reportNotes, setReportNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scanState === 'camera' && cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      video.play().catch(() => {});
      video.onloadedmetadata = () => setCameraReady(true);
    }
  }, [scanState, cameraStream]);

  useEffect(() => () => { cameraStream?.getTracks().forEach(t => t.stop()); }, [cameraStream]);

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraReady(false);
  };

  const reset = () => {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); setScanResults([]); setMatchedItems([]);
    setNutritionList([]); setAddedIds(new Set()); setErrorMsg('');
    setStatusMsg(''); setTopConfidence(0);
    setReportStep('idle'); setReportCorrect(null);
    setReportActualLabel(''); setReportIsOther(false); setReportNotes('');
    setScanState('idle');
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setScanState('camera');
    } catch {
      toast.error('Camera not available — using file picker.');
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCamera();
      handleImageSelected(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  const openGallery = () => { fileInputRef.current?.click(); };

  const handleImageSelected = async (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanResults([]); setMatchedItems([]); setNutritionList([]);
    setAddedIds(new Set()); setErrorMsg(''); setStatusMsg('');
    setScanState('processing');
    try {
      const { predictions, modelUsed: mu, topConfidence: tc } = await recognizeFood(file, setStatusMsg);
      const [items, nutrition] = await Promise.all([
        findMatchingMenuItems(predictions), fetchNutritionData(predictions),
      ]);
      setScanResults(predictions); setModelUsed(mu); setTopConfidence(tc);
      setMatchedItems(items); setNutritionList(nutrition);
      setScanState('results');
    } catch (e: any) {
      setErrorMsg(e.message || 'Recognition failed');
      setScanState('error');
    }
  };

  const fetchNutritionData = async (results: ScanResult[]): Promise<NutritionInfo[]> => {
    if (!results.length) return [];
    const { data } = await supabase.from('food_nutrition_reference').select('*')
      .in('food_class', results.slice(0, 3).map(r => r.label));
    return (data as NutritionInfo[]) ?? [];
  };

  const findMatchingMenuItems = async (results: ScanResult[]): Promise<MenuItem[]> => {
    if (!results.length) return [];
    const { data } = await supabase.from('menu_items')
      .select('id, name, description, price, category, calories, is_healthy, is_special, image_url, preparation_time, shops!inner(shop_code, discount_percent)')
      .eq('is_available', true);
    if (!data) return [];

    // Build candidate matches by predicted dish RANK so a low-confidence
    // candidate can't hijack the panel when the top guess has no menu match.
    const toMenuItem = (item: any): MenuItem => {
      const sc = (item.shops as any)?.shop_code ?? '';
      const sp = (item.shops as any)?.discount_percent ?? 0;
      const price = item.price as number;
      return {
        id: item.id, name: item.name, description: item.description ?? '',
        price, discountPercent: sp, discountedPrice: sp > 0 ? price * (1 - sp / 100) : price,
        category: item.category ?? '', calories: item.calories ?? 0,
        isHealthy: item.is_healthy ?? false, isSpecial: item.is_special ?? false,
        image: item.image_url ?? '', preparationTime: item.preparation_time ?? 15, shop: sc,
      };
    };
    const matchedFor = (label: string): MenuItem[] => {
      const kws = FOOD_LABEL_KEYWORDS[label] ?? [label.replace(/_/g, ' ')];
      const out: MenuItem[] = [];
      for (const item of data) {
        const n = (item.name as string).toLowerCase();
        const d = ((item.description as string) ?? '').toLowerCase();
        if (kws.some(kw => n.includes(kw) || d.includes(kw))) out.push(toMenuItem(item));
      }
      return out;
    };

    // Try the top prediction first; only fall back to lower-ranked candidates
    // when nothing matches the top one.
    const top = matchedFor(results[0].label);
    if (top.length > 0) return top.slice(0, 10);
    for (let i = 1; i < results.length; i++) {
      const next = matchedFor(results[i].label);
      if (next.length > 0) return next.slice(0, 10);
    }
    return [];
  };

  const submitReport = async () => {
    if (reportCorrect === null) { toast.error('Please select Correct or Wrong first.'); return; }
    if (!reportCorrect && !reportActualLabel) { toast.error(reportIsOther ? 'Please type the food name.' : 'Please select the actual food.'); return; }
    setReportStep('submitting');
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('scan_reports').insert({
      student_id: session?.user.id ?? null,
      detected_label: scanResults[0]?.label ?? null,
      detected_confidence: topConfidence,
      model_used: modelUsed,
      all_predictions: scanResults,
      is_correct: reportCorrect,
      actual_label: reportCorrect ? null : reportActualLabel,
      notes: reportNotes || null,
    });
    if (error) {
      toast.error('Failed to submit report.');
      setReportStep('form');
    } else {
      setReportStep('done');
      toast.success('Report submitted — thank you!');
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    onAddToCart(item);
    setAddedIds(prev => new Set([...prev, item.id]));
    toast.success(`${item.name} added to cart!`);
  };

  const card: React.CSSProperties = {
    backgroundColor: C.white, border: `1px solid ${C.orangeBorder}`,
    borderRadius: 12, padding: 16,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, color: C.orange, marginBottom: 8,
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', backgroundColor: C.bg,
    }}>
      {/* Header */}
      <div style={{ backgroundColor: C.orange, color: C.white, flexShrink: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(scanState !== 'idle' && scanState !== 'camera') && (
            <button onClick={reset} style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
          )}
          {scanState === 'camera' && (
            <button onClick={() => { stopCamera(); setScanState('idle'); }}
              style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Scan Food</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>
              {{ idle: 'Photo → nutrition & menu matches', camera: 'Point at food, then tap Capture',
                processing: statusMsg || 'Analysing…', results: `${scanResults.length} food(s) detected`,
                error: 'Something went wrong' }[scanState]}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: C.white, border: 'none', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* ── LIVE CAMERA VIEW ─────────────────────────────────────────── */}
      {scanState === 'camera' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#000', minHeight: 0 }}>
          {/* Video */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {/* Viewfinder corners */}
            {[
              { top: 24, left: 24, borderTop: `3px solid ${C.orange}`, borderLeft: `3px solid ${C.orange}` },
              { top: 24, right: 24, borderTop: `3px solid ${C.orange}`, borderRight: `3px solid ${C.orange}` },
              { bottom: 100, left: 24, borderBottom: `3px solid ${C.orange}`, borderLeft: `3px solid ${C.orange}` },
              { bottom: 100, right: 24, borderBottom: `3px solid ${C.orange}`, borderRight: `3px solid ${C.orange}` },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 3, ...s }} />
            ))}
            {!cameraReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ color: C.orange, width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>
          {/* Camera controls */}
          <div style={{ backgroundColor: '#111', padding: '16px 24px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={openGallery}
              style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}>
                <Upload style={{ width: 22, height: 22 }} />
              </div>
              Gallery
            </button>

            {/* Shutter */}
            <button onClick={capturePhoto} disabled={!cameraReady}
              style={{ width: 72, height: 72, borderRadius: '50%', border: `4px solid ${C.white}`, backgroundColor: C.white, cursor: cameraReady ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cameraReady ? 1 : 0.5, flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: cameraReady ? C.orange : '#999' }} />
            </button>

            {/* Placeholder for symmetry */}
            <div style={{ width: 64 }} />
          </div>
        </div>
      )}

      {/* ── NON-CAMERA STATES ─────────────────────────────────────────── */}
      {scanState !== 'camera' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* IDLE */}
            {scanState === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', padding: '32px 24px', gap: 20 }}>
                <div style={{ ...card, textAlign: 'center', width: '100%', maxWidth: 380 }}>
                  <div style={{ backgroundColor: C.orangeLight, borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ZoomIn style={{ color: C.orange, width: 36, height: 36 }} />
                  </div>
                  <p style={{ color: C.gray900, fontWeight: 600, marginBottom: 8, fontSize: 15 }}>Recognize food instantly</p>
                  <p style={{ color: C.gray500, fontSize: 13, lineHeight: 1.6 }}>
                    Use your camera or upload a photo. Runs MobileNetV3 locally — no internet needed for detection.
                  </p>
                  <p style={{ color: C.orange, fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                    First scan loads models (~54 MB) — takes ~10 s
                  </p>
                </div>
              </div>
            )}

            {/* PROCESSING */}
            {scanState === 'processing' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', padding: '24px', gap: 20 }}>
                {previewUrl && (
                  <img src={previewUrl} alt="Food" style={{ width: '100%', maxWidth: 380, maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ backgroundColor: C.orangeLight, borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Loader2 style={{ color: C.orange, width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
                  </div>
                  <p style={{ color: C.gray900, fontWeight: 600, fontSize: 15 }}>{statusMsg || 'Analysing…'}</p>
                  <p style={{ color: C.gray500, fontSize: 12, marginTop: 4 }}>Running on-device AI model</p>
                </div>
              </div>
            )}

            {/* RESULTS */}
            {scanState === 'results' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
                {previewUrl && (
                  <img src={previewUrl} alt="Food" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', height: 180 }} />
                )}

                {/* Model info + detected labels */}
                <div style={card}>
                  {/* Model badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={sectionLabel}>{scanResults.length > 0 ? 'Detected Foods' : 'No food detected'}</p>
                    <span style={{
                      backgroundColor: modelUsed === 'mobilenet' ? '#eff6ff' : '#fdf4ff',
                      color: modelUsed === 'mobilenet' ? '#1d4ed8' : '#7c3aed',
                      border: `1px solid ${modelUsed === 'mobilenet' ? '#bfdbfe' : '#e9d5ff'}`,
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      {modelUsed === 'mobilenet' ? 'MobileNetV3' : 'YOLOv11-small'} · {Math.round(topConfidence * 100)}%
                    </span>
                  </div>
                  {scanResults.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {scanResults.slice(0, 4).map(r => (
                        <span key={r.label} style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                          {r.label.replace(/_/g, ' ')} · {Math.round(r.confidence * 100)}%
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: C.gray500, fontSize: 13 }}>Try a clearer or closer photo.</p>
                  )}
                </div>

                {/* Report section */}
                {reportStep === 'idle' && (
                  <button onClick={() => setReportStep('form')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', border: `1px solid ${C.orangeBorder}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', width: '100%', color: C.gray500, fontSize: 13 }}>
                    <Flag style={{ width: 15, height: 15, color: C.orange }} />
                    <span>Was the detection wrong? Report to admin</span>
                  </button>
                )}

                {reportStep === 'form' && (
                  <div style={{ ...card, border: `1px solid ${C.orangeBorder}` }}>
                    <p style={{ ...sectionLabel, marginBottom: 12 }}>Report Detection</p>

                    {/* Correct / Wrong toggle */}
                    <p style={{ fontSize: 13, color: C.gray700, marginBottom: 8, fontWeight: 500 }}>Was the detection correct?</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {[{ val: true, label: 'Correct', icon: ThumbsUp, col: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
                        { val: false, label: 'Wrong', icon: ThumbsDown, col: '#dc2626', bg: '#fee2e2', border: '#fecaca' }].map(o => (
                        <button key={String(o.val)} onClick={() => setReportCorrect(o.val)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 8, cursor: 'pointer', border: `2px solid ${reportCorrect === o.val ? o.border : '#e5e7eb'}`, backgroundColor: reportCorrect === o.val ? o.bg : C.white, color: reportCorrect === o.val ? o.col : C.gray500, fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
                          <o.icon style={{ width: 15, height: 15 }} />{o.label}
                        </button>
                      ))}
                    </div>

                    {/* Actual label (only when wrong) */}
                    {reportCorrect === false && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 13, color: C.gray700, marginBottom: 6, fontWeight: 500 }}>What food is it actually?</p>
                        <select
                          value={reportIsOther ? '__other__' : reportActualLabel}
                          onChange={e => {
                            if (e.target.value === '__other__') {
                              setReportIsOther(true);
                              setReportActualLabel('');
                            } else {
                              setReportIsOther(false);
                              setReportActualLabel(e.target.value);
                            }
                          }}
                          style={{ width: '100%', border: `1px solid ${C.orangeBorder}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: reportActualLabel || reportIsOther ? C.gray900 : C.gray500, backgroundColor: C.white, outline: 'none' }}>
                          <option value="">— select food —</option>
                          {ALL_CLASSES.map(c => (
                            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                          ))}
                          <option value="__other__">Other (type food name…)</option>
                        </select>
                        {reportIsOther && (
                          <input
                            autoFocus
                            type="text"
                            value={reportActualLabel}
                            onChange={e => setReportActualLabel(e.target.value)}
                            placeholder="Type food name…"
                            style={{ marginTop: 8, width: '100%', border: `1px solid ${C.orange}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.gray900, backgroundColor: C.white, outline: 'none', boxSizing: 'border-box' }}
                          />
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: C.gray700, marginBottom: 6, fontWeight: 500 }}>Notes (optional)</p>
                      <textarea value={reportNotes} onChange={e => setReportNotes(e.target.value)}
                        placeholder="e.g. poor lighting, unusual angle…"
                        rows={2}
                        style={{ width: '100%', border: `1px solid ${C.orangeBorder}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.gray900, backgroundColor: C.white, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setReportStep('idle')}
                        style={{ flex: 1, padding: '10px 0', border: `1px solid #e5e7eb`, borderRadius: 8, cursor: 'pointer', backgroundColor: C.white, color: C.gray500, fontSize: 13, fontWeight: 500 }}>
                        Cancel
                      </button>
                      <button onClick={submitReport}
                        style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer', backgroundColor: C.orange, color: C.white, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Send style={{ width: 14, height: 14 }} /> Submit Report
                      </button>
                    </div>
                  </div>
                )}

                {reportStep === 'submitting' && (
                  <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Loader2 style={{ color: C.orange, width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: C.gray500 }}>Submitting report…</span>
                  </div>
                )}

                {reportStep === 'done' && (
                  <div style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 style={{ color: C.green, width: 18, height: 18, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>Report submitted — thank you for helping improve the model!</span>
                  </div>
                )}

                {/* Nutrition info */}
                {nutritionList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={sectionLabel}>Nutrition (per serving)</p>
                    {nutritionList.map(n => (
                      <div key={n.food_class} style={card}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: C.gray900, fontWeight: 600, fontSize: 14, margin: 0 }}>{n.display_name}</p>
                            <p style={{ color: C.gray500, fontSize: 12, marginTop: 2 }}>{n.description}</p>
                          </div>
                          {n.is_healthy && <Leaf style={{ color: C.green, flexShrink: 0, marginLeft: 8, width: 16, height: 16 }} />}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {[
                            { label: 'Calories', value: String(n.calories_per_serving), unit: 'kcal' },
                            { label: 'Protein', value: String(n.protein_g), unit: 'g' },
                            { label: 'Carbs', value: String(n.carbs_g), unit: 'g' },
                            { label: 'Fat', value: String(n.fat_g), unit: 'g' },
                          ].map(s => (
                            <div key={s.label} style={{ backgroundColor: C.orangeLight, borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                              <p style={{ color: C.orange, fontWeight: 700, fontSize: 14, margin: 0 }}>{s.value}</p>
                              <p style={{ color: C.gray500, fontSize: 10, margin: 0 }}>{s.unit}</p>
                              <p style={{ color: C.gray500, fontSize: 10, margin: 0 }}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matched menu items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={sectionLabel}>
                    {matchedItems.length === 0 ? 'No Matching Menu Items' : `${matchedItems.length} Item${matchedItems.length !== 1 ? 's' : ''} on Menu`}
                  </p>
                  {matchedItems.length === 0 ? (
                    <div style={card}>
                      <p style={{ color: C.gray500, fontSize: 13, textAlign: 'center' }}>No matches found. Browse the menu manually.</p>
                    </div>
                  ) : matchedItems.map(item => {
                    const added = addedIds.has(item.id);
                    return (
                      <div key={item.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, backgroundColor: C.gray100 }}>
                          <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: C.gray900, fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                          <p style={{ color: C.gray500, fontSize: 11, margin: 0 }}>{item.shop}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ color: C.orange, fontWeight: 700, fontSize: 13 }}>${item.discountedPrice.toFixed(2)}</span>
                            {item.calories > 0 && (
                              <span style={{ color: C.gray500, fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Flame style={{ width: 11, height: 11 }} />{item.calories}
                              </span>
                            )}
                            {item.isHealthy && !item.hideHealthyBadge && <Leaf style={{ color: C.green, width: 12, height: 12 }} />}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => !added && handleAddToCart(item)}
                          style={{ flexShrink: 0, backgroundColor: added ? '#16a34a' : C.orange }}>
                          {added ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : <Plus style={{ width: 16, height: 16 }} />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ERROR */}
            {scanState === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', padding: 24, gap: 16, textAlign: 'center' }}>
                {previewUrl && (
                  <img src={previewUrl} alt="Food" style={{ width: '100%', maxWidth: 380, maxHeight: 160, objectFit: 'cover', borderRadius: 12, opacity: 0.6 }} />
                )}
                <div style={{ backgroundColor: C.redLight, border: '1px solid #fecaca', borderRadius: 12, padding: 16, width: '100%', maxWidth: 380 }}>
                  <p style={{ color: C.red, fontWeight: 600, marginBottom: 6 }}>Recognition failed</p>
                  <p style={{ color: '#b91c1c', fontSize: 12, lineHeight: 1.5 }}>{errorMsg}</p>
                </div>
                <Button onClick={reset} style={{ borderColor: C.orange, color: C.orange, backgroundColor: 'transparent', border: `1px solid ${C.orange}` }}>
                  Try Again
                </Button>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          {(scanState === 'idle' || scanState === 'results') && (
            <div style={{ backgroundColor: C.white, borderTop: `1px solid ${C.orangeBorder}`, flexShrink: 0, display: 'flex', gap: 12, padding: '12px 16px' }}>
              <button onClick={startCamera}
                style={{ flex: 1, height: 48, backgroundColor: C.orange, color: C.white, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                <Camera style={{ width: 20, height: 20 }} /> Camera
              </button>
              <button onClick={openGallery}
                style={{ flex: 1, height: 48, backgroundColor: C.white, color: C.orange, border: `1.5px solid ${C.orange}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                <Upload style={{ width: 20, height: 20 }} /> Gallery
              </button>
            </div>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { stopCamera(); handleImageSelected(f); } e.target.value = ''; }} />
    </div>
  );
}
