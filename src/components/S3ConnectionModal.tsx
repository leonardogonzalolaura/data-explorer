import { useState, useEffect, useCallback } from "react";
import type { S3Credentials, S3Profile, S3Object } from "../types";
import type { DataRepository } from "../services/dataRepository";

interface S3ConnectionModalProps {
  repository: DataRepository;
  onLoadS3: (uri: string, credentials: S3Credentials) => Promise<void>;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function S3ConnectionModal({ repository, onLoadS3, onClose }: S3ConnectionModalProps) {
  const [profiles, setProfiles] = useState<S3Profile[]>([]);
  const [bucketsByProfile, setBucketsByProfile] = useState<Record<string, string[]>>({});
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewProfile, setShowNewProfile] = useState(false);

  // New profile form
  const [newName, setNewName] = useState("");
  const [newAccessKeyId, setNewAccessKeyId] = useState("");
  const [newSecretAccessKey, setNewSecretAccessKey] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newEndpoint, setNewEndpoint] = useState("");

  // New bucket inline
  const [newBucketInput, setNewBucketInput] = useState("");
  const [addingBucketFor, setAddingBucketFor] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    const p = await repository.listS3Profiles();
    setProfiles(p);
    const bucketsMap: Record<string, string[]> = {};
    await Promise.all(p.map(async (profile) => {
      try {
        bucketsMap[profile.name] = await repository.listS3Buckets(profile.name);
      } catch { bucketsMap[profile.name] = []; }
    }));
    setBucketsByProfile(bucketsMap);
  }, [repository]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const browseBucket = useCallback(async (bucket: string, profile: S3Profile, pfx: string) => {
    setSelectedBucket(bucket);
    setPrefix(pfx);
    setLoading(true);
    setError(null);
    try {
      const objs = await repository.listS3Objects(bucket, pfx, profile.credentials);
      setObjects(objs);
    } catch (err) {
      setError(String(err));
      setObjects([]);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const navigateFolder = useCallback(async (folderKey: string) => {
    if (!selectedBucket) return;
    const profile = profiles.find((p) =>
      bucketsByProfile[p.name]?.includes(selectedBucket)
    );
    if (!profile) return;
    await browseBucket(selectedBucket, profile, folderKey);
  }, [selectedBucket, profiles, bucketsByProfile, browseBucket]);

  const navigateUp = useCallback(async () => {
    if (!prefix || !selectedBucket) return;
    const profile = profiles.find((p) =>
      bucketsByProfile[p.name]?.includes(selectedBucket)
    );
    if (!profile) return;
    const parts = prefix.replace(/\/$/, "").split("/");
    parts.pop();
    const parent = parts.length > 0 ? parts.join("/") + "/" : "";
    await browseBucket(selectedBucket, profile, parent);
  }, [prefix, selectedBucket, profiles, bucketsByProfile, browseBucket]);

  const handleLoadFile = useCallback(async (obj: S3Object) => {
    if (!selectedBucket || obj.is_dir) return;
    const profile = profiles.find((p) =>
      bucketsByProfile[p.name]?.includes(selectedBucket)
    );
    if (!profile) return;
    const uri = `s3://${selectedBucket}/${obj.key}`;
    setLoading(true);
    setError(null);
    try {
      await onLoadS3(uri, profile.credentials);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, profiles, bucketsByProfile, onLoadS3, onClose]);

  const addBucket = useCallback(async (profileName: string) => {
    if (!newBucketInput.trim()) return;
    try {
      await repository.saveS3Bucket(profileName, newBucketInput.trim());
      setBucketsByProfile((prev) => ({
        ...prev,
        [profileName]: [...(prev[profileName] || []), newBucketInput.trim()].sort(),
      }));
      setNewBucketInput("");
      setAddingBucketFor(null);
    } catch (err) {
      setError(String(err));
    }
  }, [newBucketInput, repository]);

  const deleteBucket = useCallback(async (profileName: string, bucket: string) => {
    try {
      await repository.deleteS3Bucket(profileName, bucket);
      setBucketsByProfile((prev) => ({
        ...prev,
        [profileName]: (prev[profileName] || []).filter((b) => b !== bucket),
      }));
      if (selectedBucket === bucket) {
        setSelectedBucket(null);
        setObjects([]);
        setPrefix("");
      }
    } catch (err) {
      setError(String(err));
    }
  }, [repository, selectedBucket]);

  const deleteProfile = useCallback(async (name: string) => {
    try {
      await repository.deleteS3Profile(name);
      setProfiles((prev) => prev.filter((p) => p.name !== name));
      if (expandedProfile === name) setExpandedProfile(null);
      if (bucketsByProfile[name]?.includes(selectedBucket ?? "")) {
        setSelectedBucket(null);
        setObjects([]);
        setPrefix("");
      }
    } catch (err) {
      setError(String(err));
    }
  }, [repository, expandedProfile, bucketsByProfile, selectedBucket]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape" && !loading) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.7-9c.3-.1.5-.1.8-.1a4.5 4.5 0 1 1-3 7.9" />
          <path d="M12 11v4" /><path d="M14 13h-4" />
        </svg>
        <span className="text-sm font-medium text-gray-200">S3</span>
        <span className="text-[11px] text-gray-600">
          {selectedBucket ? `${selectedBucket}/${prefix}` : "seleccioná un bucket"}
        </span>
        <div className="flex-1" />
        <button onClick={onClose} disabled={loading} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Split body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: tree */}
        <div className="w-64 shrink-0 border-r border-gray-800 overflow-auto bg-gray-950 p-2">
          {showNewProfile ? (
            <div className="space-y-2 p-2">
              <p className="text-[11px] text-gray-500 font-medium">Nuevo perfil</p>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              <input value={newAccessKeyId} onChange={(e) => setNewAccessKeyId(e.target.value)} placeholder="Access Key ID" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              <input type="password" value={newSecretAccessKey} onChange={(e) => setNewSecretAccessKey(e.target.value)} placeholder="Secret Access Key" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2">
                <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="Región" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500" />
                <input value={newEndpoint} onChange={(e) => setNewEndpoint(e.target.value)} placeholder="Endpoint (opc)" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!newName.trim() || !newAccessKeyId || !newSecretAccessKey || !newRegion) {
                    setError("Campos obligatorios incompletos"); return;
                  }
                  try {
                    await repository.saveS3Profile(newName.trim(), {
                      access_key_id: newAccessKeyId, secret_access_key: newSecretAccessKey,
                      region: newRegion, endpoint: newEndpoint || null,
                    });
                    await loadAllData();
                    setShowNewProfile(false);
                    setNewName(""); setNewAccessKeyId(""); setNewSecretAccessKey(""); setNewRegion(""); setNewEndpoint("");
                  } catch (err) { setError(String(err)); }
                }} className="flex-1 px-2 py-1 text-[11px] font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                  Guardar
                </button>
                <button onClick={() => setShowNewProfile(false)} className="px-2 py-1 text-[11px] rounded bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <button onClick={() => setShowNewProfile(true)} className="w-full text-left text-[11px] px-2 py-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Nuevo perfil
              </button>
              {profiles.length === 0 && (
                <p className="text-[11px] text-gray-600 text-center py-6">No hay perfiles</p>
              )}
              {profiles.map((p) => (
                <div key={p.name}>
                  {/* Profile header */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedProfile(expandedProfile === p.name ? null : p.name)}
                      className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={expandedProfile === p.name ? "" : "-rotate-90"}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setExpandedProfile(expandedProfile === p.name ? null : p.name)}
                      className={`flex-1 text-left text-[11px] px-1.5 py-1 rounded transition-colors ${expandedProfile === p.name ? "bg-gray-800 text-gray-200" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1.5 text-gray-600">{p.credentials.region}</span>
                      {p.credentials.endpoint && <span className="ml-1 text-gray-700">({p.credentials.endpoint})</span>}
                    </button>
                    <button onClick={() => deleteProfile(p.name)} className="p-1 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded transition-colors" title="Eliminar perfil">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                  {/* Buckets under profile */}
                  {expandedProfile === p.name && (
                    <div className="ml-3 pl-2 border-l border-gray-800 space-y-0.5 mt-0.5">
                      {bucketsByProfile[p.name]?.length === 0 && (
                        <p className="text-[11px] text-gray-600 italic px-1.5 py-1">Sin buckets</p>
                      )}
                      {bucketsByProfile[p.name]?.map((b) => (
                        <div key={b} className="flex items-center gap-1">
                          <button
                            onClick={() => browseBucket(b, p, "")}
                            className={`flex-1 text-left text-[11px] px-1.5 py-1 rounded transition-colors flex items-center gap-1.5 ${selectedBucket === b ? "bg-blue-900/40 text-blue-300" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selectedBucket === b ? "#60a5fa" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            {b}
                          </button>
                          <button onClick={() => deleteBucket(p.name, b)} className="p-0.5 text-gray-600 hover:text-red-400 transition-colors" title="Eliminar bucket">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ))}
                      {/* Add bucket button / input */}
                      {addingBucketFor === p.name ? (
                        <div className="flex items-center gap-1 pl-1.5">
                          <input
                            value={newBucketInput}
                            onChange={(e) => setNewBucketInput(e.target.value)}
                            placeholder="nombre del bucket"
                            autoFocus
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => { if (e.key === "Enter") addBucket(p.name); if (e.key === "Escape") { setAddingBucketFor(null); setNewBucketInput(""); } }}
                          />
                          <button onClick={() => addBucket(p.name)} disabled={!newBucketInput.trim()} className="p-1 text-gray-500 hover:text-green-400 disabled:opacity-30 transition-colors" title="Guardar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </button>
                          <button onClick={() => { setAddingBucketFor(null); setNewBucketInput(""); }} className="p-1 text-gray-600 hover:text-gray-400 transition-colors" title="Cancelar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingBucketFor(p.name); setNewBucketInput(""); }} className="flex items-center gap-1 w-full text-left text-[11px] px-1.5 py-1 rounded text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Agregar bucket
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: file browser */}
        <div className="flex-1 overflow-auto bg-gray-950/50 p-3">
          {!selectedBucket ? (
            <div className="flex items-center justify-center h-full text-gray-600 text-xs">
              Seleccioná un bucket del panel izquierdo
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Breadcrumb bar */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                <button
                  onClick={() => { setObjects([]); setPrefix(""); }}
                  className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {selectedBucket}
                </button>
                {prefix && (
                  <>
                    <span className="text-gray-700 text-[11px]">/</span>
                    <button onClick={navigateUp} className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">..</button>
                    {prefix.replace(/\/$/, "").split("/").map((part, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-gray-700 text-[11px]">/</span>
                        <span className="text-[11px] text-gray-400">{part}</span>
                      </span>
                    ))}
                  </>
                )}
                <div className="flex-1" />
                {loading && <span className="text-[11px] text-gray-600 animate-pulse">cargando...</span>}
              </div>

              {objects.length === 0 && !loading && (
                <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
                  Bucket vacío
                </div>
              )}
              {!loading && objects.map((obj) => (
                obj.is_dir ? (
                  <button key={obj.key} onClick={() => navigateFolder(obj.key)} className="flex items-center gap-2 w-full text-left text-[11px] px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {obj.key.replace(prefix, "")}
                  </button>
                ) : (
                  <button key={obj.key} onClick={() => handleLoadFile(obj)} className="flex items-center gap-2 w-full text-left text-[11px] px-2 py-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="flex-1 truncate">{obj.key.replace(prefix, "")}</span>
                    <span className="text-gray-600 shrink-0">{formatSize(obj.size)}</span>
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 border-t border-gray-800 shrink-0">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
