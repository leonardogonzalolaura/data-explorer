import { useState, useEffect, useCallback, useRef } from "react";
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

function bucketNodeId(bucket: string): string {
  return `bucket:${bucket}`;
}
function folderNodeId(bucket: string, prefix: string): string {
  return `folder:${bucket}:${prefix}`;
}
function cacheKey(bucket: string, prefix: string): string {
  return `${bucket}::${prefix}`;
}

export default function S3ConnectionModal({ repository, onLoadS3, onClose }: S3ConnectionModalProps) {
  const [profiles, setProfiles] = useState<S3Profile[]>([]);
  const [bucketsByProfile, setBucketsByProfile] = useState<Record<string, string[]>>({});
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeCache, setTreeCache] = useState<Record<string, S3Object[]>>({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [activeBucket, setActiveBucket] = useState<string>("");
  const [activePrefix, setActivePrefix] = useState<string>("");
  const [rightObjects, setRightObjects] = useState<S3Object[]>([]);
  const [rightLoading, setRightLoading] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedScopeRef = useRef<{ bucket: string; profileName: string } | null>(null);
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showNewProfile, setShowNewProfile] = useState(false);

  // Path editing
  const [pathEditing, setPathEditing] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [copied, setCopied] = useState(false);

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

  const getProfile = useCallback((name: string) => profiles.find((p) => p.name === name) ?? null, [profiles]);

  const fetchChildren = useCallback(async (bucket: string, prefix: string, profile: S3Profile) => {
    const ck = cacheKey(bucket, prefix);
    setLoadingNodes((prev) => new Set(prev).add(ck));
    setError(null);
    try {
      const objs = await repository.listS3Objects(bucket, prefix, profile.credentials);
      setTreeCache((prev) => ({ ...prev, [ck]: objs }));
      return objs;
    } catch (err) {
      setError(String(err));
      setTreeCache((prev) => ({ ...prev, [ck]: [] }));
      return [];
    } finally {
      setLoadingNodes((prev) => { const copy = new Set(prev); copy.delete(ck); return copy; });
    }
  }, [repository]);

  const toggleProfile = useCallback((name: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const toggleTreeNode = useCallback(async (bucket: string, prefix: string, profile: S3Profile) => {
    const nodeId = prefix ? folderNodeId(bucket, prefix) : bucketNodeId(bucket);
    const isExpanded = expandedNodes.has(nodeId);
    if (isExpanded) {
      setExpandedNodes((prev) => { const next = new Set(prev); next.delete(nodeId); return next; });
      return;
    }
    setExpandedNodes((prev) => new Set(prev).add(nodeId));
    const ck = cacheKey(bucket, prefix);
    if (!treeCache[ck]) {
      await fetchChildren(bucket, prefix, profile);
    }
  }, [expandedNodes, treeCache, fetchChildren]);

  const navigateTo = useCallback((bucket: string, prefix: string, profileName: string) => {
    if (!selectedScopeRef.current || selectedScopeRef.current.bucket !== bucket || selectedScopeRef.current.profileName !== profileName) {
      setSelectedKeys(new Set());
      selectedScopeRef.current = null;
    }
    setActiveBucket(bucket);
    setActivePrefix(prefix);
    setActiveProfileName(profileName);
    setPathInput(prefix);
    setPathEditing(false);
  }, []);

  const loadRightPanel = useCallback(async (bucket: string, prefix: string, profile: S3Profile) => {
    setRightLoading(true);
    setError(null);
    try {
      const objs = await repository.listS3Objects(bucket, prefix, profile.credentials);
      setRightObjects(objs);
      return objs;
    } catch (err) {
      setError(String(err));
      setRightObjects([]);
      return [];
    } finally {
      setRightLoading(false);
    }
  }, [repository]);

  const selectTreeNode = useCallback(async (bucket: string, prefix: string, profileName: string) => {
    navigateTo(bucket, prefix, profileName);
    const profile = getProfile(profileName);
    if (profile) {
      await loadRightPanel(bucket, prefix, profile);
    }
  }, [navigateTo, getProfile, loadRightPanel]);

  const navigateToPrefix = useCallback(async (bucket: string, prefix: string, profile: S3Profile | null) => {
    if (!selectedScopeRef.current || selectedScopeRef.current.bucket !== bucket || selectedScopeRef.current.profileName !== profile?.name) {
      setSelectedKeys(new Set());
      selectedScopeRef.current = null;
    }
    setActiveBucket(bucket);
    setActivePrefix(prefix);
    setPathInput(prefix);
    if (profile) {
      await loadRightPanel(bucket, prefix, profile);
      const nodeId = prefix ? folderNodeId(bucket, prefix) : bucketNodeId(bucket);
      setExpandedNodes((prev) => new Set(prev).add(nodeId));
      const ck = cacheKey(bucket, prefix);
      if (!treeCache[ck]) {
        await fetchChildren(bucket, prefix, profile);
      }
    }
  }, [loadRightPanel, treeCache, fetchChildren]);

  const goToBreadcrumb = useCallback(async (prefix: string) => {
    const profile = getProfile(activeProfileName);
    await navigateToPrefix(activeBucket, prefix, profile ?? null);
  }, [activeBucket, activeProfileName, getProfile, navigateToPrefix]);

  const goUp = useCallback(async () => {
    if (!activePrefix || !activeBucket) return;
    const trimmed = activePrefix.replace(/\/+$/, "");
    const parts = trimmed.split("/");
    parts.pop();
    const parent = parts.length ? parts.join("/") + "/" : "";
    const profile = getProfile(activeProfileName);
    await navigateToPrefix(activeBucket, parent, profile ?? null);
  }, [activePrefix, activeBucket, activeProfileName, getProfile, navigateToPrefix]);

  const handlePathSubmit = useCallback(async () => {
    if (!activeBucket) {
      // parse bucket from path input
      const parts = pathInput.split("/");
      const b = parts[0];
      const rest = parts.slice(1).join("/");
      if (b) {
        const prefix = rest ? rest + (rest.endsWith("/") ? "" : "/") : "";
        const profile = getProfile(activeProfileName);
        await navigateToPrefix(b, prefix, profile ?? null);
      }
    } else {
      const prefix = pathInput.startsWith(activeBucket + "/")
        ? pathInput.slice(activeBucket.length + 1)
        : pathInput;
      const cleanPrefix = prefix && !prefix.endsWith("/") ? prefix + "/" : prefix;
      const profile = getProfile(activeProfileName);
      await navigateToPrefix(activeBucket, cleanPrefix, profile ?? null);
    }
    setPathEditing(false);
  }, [pathInput, activeBucket, activeProfileName, getProfile, navigateToPrefix]);

  const handleLoadFile = useCallback(async (obj: S3Object) => {
    if (obj.is_dir) return;
    if (!activeBucket) return;
    const profile = getProfile(activeProfileName);
    if (!profile) return;
    const uri = `s3://${activeBucket}/${obj.key}`;
    try {
      await onLoadS3(uri, profile.credentials);
      onClose();
    } catch (err) {
      setError(String(err));
    }
  }, [activeBucket, activeProfileName, getProfile, onLoadS3, onClose]);

  const toggleFile = useCallback((obj: S3Object) => {
    if (obj.is_dir) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(obj.key)) {
        next.delete(obj.key);
      } else {
        next.add(obj.key);
        selectedScopeRef.current = { bucket: activeBucket, profileName: activeProfileName };
      }
      return next;
    });
  }, [activeBucket, activeProfileName]);

  const toggleFileKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    selectedScopeRef.current = null;
  }, []);

  const handleLoadSelected = useCallback(async () => {
    const profile = getProfile(activeProfileName);
    if (!profile || selectedKeys.size === 0) return;
    setError(null);
    const keys = Array.from(selectedKeys).filter((k) => !k.endsWith("/"));
    for (let i = 0; i < keys.length; i++) {
      setLoadingCount(i + 1);
      const uri = `s3://${activeBucket}/${keys[i]}`;
      try {
        await onLoadS3(uri, profile.credentials);
      } catch (err) {
        setError(`Error en ${keys[i]}: ${err}`);
        break;
      }
    }
    setLoadingCount(0);
    clearSelection();
    onClose();
  }, [selectedKeys, activeBucket, activeProfileName, getProfile, onLoadS3, onClose, clearSelection]);

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

  const deleteProfile = useCallback(async (name: string) => {
    try {
      await repository.deleteS3Profile(name);
      setProfiles((prev) => prev.filter((p) => p.name !== name));
      setExpandedProfiles((prev) => { const next = new Set(prev); next.delete(name); return next; });
      if (activeProfileName === name) {
        setActiveBucket("");
        setActivePrefix("");
        setRightObjects([]);
        clearSelection();
      }
    } catch (err) {
      setError(String(err));
    }
  }, [repository, activeProfileName, clearSelection]);

  const copyPath = useCallback(async () => {
    if (!activeBucket) return;
    const path = `s3://${activeBucket}/${activePrefix}`;
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [activeBucket, activePrefix]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape" && !loadingNodes.size) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.7-9c.3-.1.5-.1.8-.1a4.5 4.5 0 1 1-3 7.9" />
          <path d="M12 11v4" /><path d="M14 13h-4" />
        </svg>
        <span className="text-sm font-medium text-gray-200">S3</span>
        <span className="text-[11px] text-gray-600">
          {activeBucket ? `s3://${activeBucket}/${activePrefix || ""}` : ""}
        </span>
        <div className="flex-1" />
        {activeProfileName && <span className="text-[11px] text-gray-600">{activeProfileName}</span>}
        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors">
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
                    <button onClick={() => toggleProfile(p.name)} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={expandedProfiles.has(p.name) ? "" : "-rotate-90"}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleProfile(p.name)}
                      className={`flex-1 text-left text-[11px] px-1.5 py-1 rounded transition-colors ${expandedProfiles.has(p.name) ? "bg-gray-800 text-gray-200" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1.5 text-gray-600">{p.credentials.region}</span>
                      {p.credentials.endpoint && <span className="ml-1 text-gray-700">({p.credentials.endpoint})</span>}
                    </button>
                    <button onClick={() => deleteProfile(p.name)} className="p-1 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded transition-colors" title="Eliminar perfil">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>

                  {/* Profile children: buckets + their tree */}
                  {expandedProfiles.has(p.name) && (
                    <div className="ml-3 pl-2 border-l border-gray-800 space-y-0.5 mt-0.5">
                      {bucketsByProfile[p.name]?.length === 0 && (
                        <p className="text-[11px] text-gray-600 italic px-1.5 py-1">Sin buckets</p>
                      )}
                      {bucketsByProfile[p.name]?.map((b) => (
                        <TreeNode
                          key={b}
                          bucket={b}
                          prefix=""
                          profileName={p.name}
                          profile={p}
                          activeBucket={activeBucket}
                          activePrefix={activePrefix}
                          activeProfileName={activeProfileName}
                          treeCache={treeCache}
                          expandedNodes={expandedNodes}
                          loadingNodes={loadingNodes}
                          onSelect={selectTreeNode}
                          onToggle={toggleTreeNode}
                          onLoadFile={handleLoadFile}
                          renderActions={() => (
                            <button onClick={async () => {
                              try {
                                await repository.deleteS3Bucket(p.name, b);
                                setBucketsByProfile((prev) => ({
                                  ...prev,
                                  [p.name]: (prev[p.name] || []).filter((x) => x !== b),
                                }));
                                if (activeBucket === b && activeProfileName === p.name) {
                                  setActiveBucket(""); setActivePrefix(""); setRightObjects([]);
                                }
                              } catch (err) { setError(String(err)); }
                            }} className="p-0.5 text-gray-600 hover:text-red-400 transition-colors" title="Eliminar bucket">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                          )}
                        />
                      ))}

                      {/* Add bucket */}
                      {addingBucketFor === p.name ? (
                        <div className="flex items-center gap-1 pl-1.5">
                          <input value={newBucketInput} onChange={(e) => setNewBucketInput(e.target.value)} placeholder="nombre del bucket" autoFocus className="flex-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-950/50">
          {!activeBucket ? (
            <div className="flex items-center justify-center flex-1 text-gray-600 text-xs">
              Seleccioná un bucket del panel izquierdo
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Path bar with breadcrumb / edit / copy */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 shrink-0">
                {pathEditing ? (
                  <input
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    autoFocus
                    placeholder={`${activeBucket}/`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[12px] text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => { if (e.key === "Enter") handlePathSubmit(); if (e.key === "Escape") { setPathEditing(false); setPathInput(activePrefix); } }}
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-0.5 min-w-0 overflow-hidden">
                    <button
                      onClick={goUp}
                      disabled={!activePrefix}
                      className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors shrink-0"
                      title="Subir carpeta"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><polyline points="5 12 12 5 19 12" /></svg>
                    </button>
                    <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto">
                      {activePrefix ? activePrefix.split("/").filter(Boolean).map((seg, i, arr) => {
                        const isLast = i === arr.length - 1;
                        const target = arr.slice(0, i + 1).join("/") + "/";
                        return (
                          <span key={i} className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => { if (!isLast) goToBreadcrumb(target); }}
                              disabled={isLast}
                              className={`px-1 py-0.5 rounded text-[12px] font-mono transition-colors ${isLast ? "text-gray-200" : "text-gray-500 hover:text-blue-400 hover:bg-gray-800/50"}`}
                            >
                              {seg}
                            </button>
                            {!isLast && <span className="text-gray-700">/</span>}
                          </span>
                        );
                      }) : (
                        <span className="text-[12px] text-gray-600 font-mono">/</span>
                      )}
                    </div>
                  </div>
                )}
                <button onClick={() => { if (pathEditing) { handlePathSubmit(); } else { setPathInput(activePrefix); setPathEditing(true); } }} className="p-1 text-gray-500 hover:text-gray-300 transition-colors" title={pathEditing ? "Confirmar" : "Editar ruta"}>
                  {pathEditing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                  )}
                </button>
                <button onClick={copyPath} className="relative p-1 text-gray-500 hover:text-gray-300 transition-colors" title="Copiar ruta">
                  {copied ? (
                    <span className="text-[10px] text-green-400 font-medium px-1">Copiado</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </button>
                {rightLoading && <span className="text-[11px] text-gray-600 animate-pulse">cargando...</span>}
              </div>

              {/* Batch load bar */}
              {selectedKeys.size > 0 && (
                <div className="px-4 py-2 border-b border-gray-800 shrink-0 bg-gray-900/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400">{selectedKeys.size} archivo(s) seleccionado(s)</span>
                    <div className="flex-1" />
                    {loadingCount > 0 && (
                      <span className="text-[11px] text-blue-400 animate-pulse">Cargando {loadingCount}/{selectedKeys.size}...</span>
                    )}
                    <button
                      onClick={clearSelection}
                      disabled={loadingCount > 0}
                      className="px-2 py-1 text-[11px] rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-50 transition-colors"
                      title="Limpiar selección"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={handleLoadSelected}
                      disabled={loadingCount > 0}
                      className="px-3 py-1 text-[11px] font-medium rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
                    >
                      {loadingCount > 0 ? "Cargando..." : `Cargar ${selectedKeys.size}`}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-auto">
                    {Array.from(selectedKeys).map((key) => {
                      const name = key.split("/").filter(Boolean).pop() ?? key;
                      return (
                        <span key={key} title={key} className="group inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800/80 text-[10px] text-gray-300 font-mono">
                          {name}
                          <button onClick={() => toggleFileKey(key)} className="text-gray-500 hover:text-red-400 transition-colors" title="Quitar de la selección">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-auto p-3 space-y-0.5">
                {rightObjects.length === 0 && !rightLoading && (
                  <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
                    Bucket vacío
                  </div>
                )}
                {!rightLoading && rightObjects.map((obj) => (
                  obj.is_dir ? (
                    <button key={obj.key} onClick={async () => {
                      const profile = getProfile(activeProfileName);
                      await navigateToPrefix(activeBucket, obj.key, profile ?? null);
                    }} className="flex items-center gap-2 w-full text-left text-[11px] px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {obj.key.replace(activePrefix, "")}
                    </button>
                  ) : (
                    <div key={obj.key} onClick={() => toggleFile(obj)} className={`group flex items-center gap-2 w-full text-left text-[11px] px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedKeys.has(obj.key) ? "bg-blue-950/30 text-blue-300" : "text-gray-400 hover:bg-gray-800/50"}`}>
                      {selectedKeys.has(obj.key) ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                      )}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="flex-1 truncate">{obj.key.replace(activePrefix, "")}</span>
                      <span className="text-gray-600 shrink-0">{formatSize(obj.size)}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleLoadFile(obj); }} className="p-0.5 rounded text-gray-600 hover:text-blue-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Cargar ahora">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  )
                ))}
              </div>
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

// ── Tree node component for nested folders/files ──

interface TreeNodeProps {
  bucket: string;
  prefix: string;
  profileName: string;
  profile: S3Profile;
  activeBucket: string;
  activePrefix: string;
  activeProfileName: string;
  treeCache: Record<string, S3Object[]>;
  expandedNodes: Set<string>;
  loadingNodes: Set<string>;
  onSelect: (bucket: string, prefix: string, profileName: string) => Promise<void>;
  onToggle: (bucket: string, prefix: string, profile: S3Profile) => Promise<void>;
  onLoadFile: (obj: S3Object) => void;
  renderActions?: () => React.ReactNode;
}

function TreeNode({
  bucket, prefix, profileName, profile, activeBucket, activePrefix, activeProfileName,
  treeCache, expandedNodes, loadingNodes, onSelect, onToggle, onLoadFile, renderActions,
}: TreeNodeProps) {
  const nodeId = prefix ? folderNodeId(bucket, prefix) : bucketNodeId(bucket);
  const ck = cacheKey(bucket, prefix);
  const children = treeCache[ck];
  const isLoading = loadingNodes.has(ck);
  const isExpanded = expandedNodes.has(nodeId);
  const isActive = activeBucket === bucket && activePrefix === prefix && activeProfileName === profileName;

  return (
    <div>
      <div className="flex items-center gap-1">
        <button onClick={() => onToggle(bucket, prefix, profile)} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors">
          {isLoading ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.22-8.41" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={isExpanded ? "" : "-rotate-90"}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onSelect(bucket, prefix, profileName)}
          className={`flex-1 text-left text-[11px] px-1.5 py-1 rounded transition-colors flex items-center gap-1.5 ${isActive ? "bg-blue-900/40 text-blue-300" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#60a5fa" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {prefix ? prefix.replace(/\/$/, "").split("/").pop() : bucket}
        </button>
        {renderActions?.()}
      </div>
      {isExpanded && children && (
        <div className="ml-3 pl-2 border-l border-gray-800 space-y-0.5">
          {children.filter((o) => o.is_dir).map((child) => (
            <TreeNode
              key={child.key}
              bucket={bucket}
              prefix={child.key}
              profileName={profileName}
              profile={profile}
              activeBucket={activeBucket}
              activePrefix={activePrefix}
              activeProfileName={activeProfileName}
              treeCache={treeCache}
              expandedNodes={expandedNodes}
              loadingNodes={loadingNodes}
              onSelect={onSelect}
              onToggle={onToggle}
              onLoadFile={onLoadFile}
            />
          ))}
          {children.filter((o) => !o.is_dir).map((child) => (
            <div key={child.key} className="flex items-center gap-1 pl-[18px]">
              <button
                onClick={() => onLoadFile(child)}
                className="flex-1 text-left text-[11px] px-1.5 py-1 rounded transition-colors flex items-center gap-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-950/30"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                {child.key.replace(prefix, "")}
              </button>
            </div>
          ))}
          {children.length === 0 && (
            <p className="text-[11px] text-gray-600 italic px-1.5 py-1">Vacío</p>
          )}
        </div>
      )}
    </div>
  );
}
