/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Play, ArrowLeft, Loader2, AlertCircle, RefreshCw, Table as TableIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

function Home() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleVisualize = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/view?url=${encodeURIComponent(url.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-4xl space-y-12 text-center relative z-10">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10" />
              <div className="relative p-10 bg-white rounded-[3rem] border-4 border-blue-100 shadow-xl">
                <TableIcon size={100} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-8xl font-black tracking-tighter uppercase leading-none text-zinc-900">
              TV <span className="text-blue-600">TABLE</span>
            </h1>
            <p className="text-3xl text-zinc-400 font-bold uppercase tracking-widest">
              Visualización Profesional de Excel
            </p>
          </div>
        </div>

        <form onSubmit={handleVisualize} className="space-y-8">
          <div className="relative group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega el enlace de SharePoint aquí..."
              className="w-full bg-zinc-50 border-4 border-zinc-200 rounded-[2.5rem] px-10 py-10 text-4xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-300 font-bold shadow-inner"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!url.trim()}
            className="group relative w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white py-10 rounded-[2.5rem] text-5xl font-black transition-all overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.2)] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-6">
              <Play size={60} fill="currentColor" />
              <span>CARGAR TABLA</span>
            </div>
          </button>
        </form>

        <div className="pt-16 flex justify-center gap-12 opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-600 rounded-full" />
            <span className="text-xl font-bold uppercase tracking-widest">Fondo Claro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-600 rounded-full" />
            <span className="text-xl font-bold uppercase tracking-widest">Todas las Columnas</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-600 rounded-full" />
            <span className="text-xl font-bold uppercase tracking-widest">TV Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const url = searchParams.get('url');
  
  const [tableData, setTableData] = useState<{ title: string; headers: string[]; rows: string[][] }>({ title: '', headers: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const fetchData = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      let finalUrl = targetUrl.trim();
      
      if (finalUrl.includes('sharepoint.com')) {
        const urlObj = new URL(finalUrl);
        urlObj.searchParams.set('download', '1');
        finalUrl = urlObj.toString();
      }

      if (finalUrl.includes('docs.google.com/spreadsheets')) {
        const match = finalUrl.match(/\/d\/([^/]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          finalUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        }
      }

      const proxies = [
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url: string) => url
      ];

      let response: Response | null = null;
      let lastError: any = null;

      for (const getProxyUrl of proxies) {
        try {
          const fetchUrl = getProxyUrl(finalUrl);
          const res = await fetch(fetchUrl);
          if (res.ok) {
            response = res;
            break;
          }
          lastError = new Error(`Status ${res.status}`);
        } catch (e) {
          lastError = e;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastError?.message || "No se pudo conectar.");
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true });
      
      if (jsonData.length === 0) {
        throw new Error('Archivo vacío.');
      }

      let title = "";
      let headerRowIndex = -1;
      let dataStartIndex = -1;

      const spanishDateFormatter = new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long'
      });

      const cleanRows = jsonData.map(row => 
        (row || []).map(cell => {
          if (cell instanceof Date && !isNaN(cell.getTime())) {
            // Format date to Spanish: "5 de febrero"
            return spanishDateFormatter.format(cell);
          }
          return (cell === null || cell === undefined) ? "" : String(cell).trim();
        })
      ).filter(row => row.some(cell => cell !== ""));

      if (cleanRows.length === 0) throw new Error("No hay datos.");

      for (let i = 0; i < cleanRows.length; i++) {
        const nonInternalEmpty = cleanRows[i].filter(c => c !== "").length;
        if (nonInternalEmpty > 1) {
          headerRowIndex = i;
          dataStartIndex = i + 1;
          if (i > 0 && cleanRows[i-1].filter(c => c !== "").length === 1) {
            title = cleanRows[i-1].find(c => c !== "") || "";
          }
          break;
        }
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        dataStartIndex = 1;
      }

      setTableData({
        title: title || (headerRowIndex > 0 ? cleanRows[0].find(c => c !== "") : ""),
        headers: cleanRows[headerRowIndex],
        rows: cleanRows.slice(dataStartIndex)
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url) {
      fetchData(url);
    } else {
      navigate('/');
    }
  }, [url, fetchData, navigate]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleAction = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 4000);
    };

    window.addEventListener('mousemove', handleAction);
    window.addEventListener('touchstart', handleAction);
    timeout = setTimeout(() => setShowControls(false), 4000);

    return () => {
      window.removeEventListener('mousemove', handleAction);
      window.removeEventListener('touchstart', handleAction);
      clearTimeout(timeout);
    };
  }, []);

  if (loading && !tableData.rows.length) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-8">
        <Loader2 className="animate-spin text-blue-600" size={100} />
        <p className="text-4xl font-black text-[#1a365d] animate-pulse uppercase tracking-widest">Sincronizando Datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-12 text-center gap-8">
        <div className="flex flex-col items-center gap-6 text-red-600 bg-red-50 p-16 rounded-[3rem] border-4 border-red-100 shadow-2xl">
          <AlertCircle size={100} />
          <h2 className="text-6xl font-black uppercase">Error de Conexión</h2>
          <p className="text-3xl font-bold text-red-500 max-w-2xl">{error}</p>
          <div className="mt-8 p-8 bg-white rounded-2xl border border-red-200 text-xl text-zinc-500 font-normal text-left">
            Tip: Asegúrate de que el archivo esté configurado como "Cualquier persona con el enlace" (Público). En Google Sheets usa "Compartir" &rarr; "Cualquier persona con el enlace".
          </div>
          <button 
            onClick={() => navigate('/')}
            className="mt-8 px-12 py-6 bg-red-600 text-white text-3xl font-black rounded-full hover:bg-red-700 transition-all"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  const { title, headers, rows } = tableData;
  const rowCount = rows.length;
  const baseFontSize = rowCount > 0 ? Math.min(6, 75 / (rowCount + 2)) : 6;

  return (
    <div className="fixed inset-0 bg-[#f4f4f4] flex flex-col overflow-hidden text-[#1a365d] font-sans select-none">
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 transition-all duration-500 bg-white/95 backdrop-blur-md border-b border-[#c5a059] shadow-xl",
          showControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-8 py-4 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#1a365d] rounded-none transition-all text-2xl font-bold border border-[#c5a059]"
        >
          <ArrowLeft size={32} />
          <span>Cambiar URL</span>
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => url && fetchData(url)}
            disabled={loading}
            className="flex items-center gap-3 px-8 py-4 bg-[#1a365d] hover:bg-[#2c5282] text-white rounded-none transition-all text-2xl font-bold shadow-md disabled:opacity-50 border border-[#c5a059]"
          >
            {loading ? <Loader2 className="animate-spin" size={32} /> : <RefreshCw size={32} />}
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full h-full p-0 bg-[#f4f4f4]">
        <div className="flex-1 flex flex-col border-b-8 border-[#c5a059] bg-white">
          {title && (
            <div 
              className="bg-[#1a365d] text-[#c5a059] flex items-center justify-center font-black uppercase tracking-[0.3em] border-b-4 border-[#c5a059]"
              style={{ height: `${baseFontSize * 2}vh`, fontSize: `${baseFontSize * 1.1}vh` }}
            >
              {title}
            </div>
          )}

          <div 
            className="grid grid-cols-[18%_1fr_22%] bg-[#f8f9fa] border-b-2 border-[#c5a059]"
            style={{ height: `${baseFontSize * 1.3}vh` }}
          >
            {headers.map((header, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex items-center px-2 font-black uppercase tracking-widest border-r border-[#e2e8f0] last:border-r-0",
                  "justify-start text-left text-[#1a365d]"
                )}
                style={{ fontSize: `${baseFontSize * 0.65}vh` }}
              >
                {header}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            {rows.map((row, rowIdx) => (
              <div 
                key={rowIdx} 
                className={cn(
                  "grid grid-cols-[18%_1fr_22%] border-b border-[#94a3b8] transition-colors flex-1",
                  rowIdx % 4 === 0 ? "bg-white" : 
                  rowIdx % 4 === 1 ? "bg-[#f1f5f9]" :
                  rowIdx % 4 === 2 ? "bg-[#e2e8f0]" :
                  "bg-[#cbd5e1]"
                )}
              >
                {headers.map((_, colIdx) => {
                  const cell = row[colIdx];
                  return (
                    <div 
                      key={colIdx} 
                      className={cn(
                        "flex items-center px-1 font-bold tracking-tight border-r border-[#f1f5f9] last:border-r-0",
                        "justify-start text-left",
                        colIdx === 0 ? "text-[#1a365d] font-mono" : 
                        colIdx === 1 ? "text-[#334155]" : 
                        "text-[#64748b] font-medium italic"
                      )}
                      style={{ 
                        fontSize: `${Math.min(baseFontSize * 0.85, (75 / rowCount))}vh`,
                        lineHeight: '1.1'
                      }}
                    >
                      <span className={cn(
                        "w-full break-words",
                        colIdx === 0 ? "" : "line-clamp-2"
                      )}>
                        {cell}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-4 bg-[#1a365d] w-full border-t border-[#c5a059]" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/view" element={<TableView />} />
    </Routes>
  );
}
