/* Nilufar Shoes — 360° suratlar ombori.
 * Suratlar brauzerning IndexedDB bazasida saqlanadi: localStorage dan ancha keng,
 * shuning uchun bir mahsulotga 36 tagacha kadr sig'adi. */
window.Frames = (function () {
  const DB = "nilufar_frames", STORE = "frames", VER = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("IndexedDB yo'q"));
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  function tx(mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      let out;
      try { out = fn(s); } catch (e) { return rej(e); }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error("abort"));
    }));
  }

  /* Suratni kichraytirib, JPEG blobga aylantiramiz */
  function toBlob(file, max, quality) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? res(b) : rej(new Error("blob xato"))), "image/jpeg", quality || 0.76);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("rasm o'qilmadi")); };
      img.src = url;
    });
  }

  /* Kichik ko'rinish — kartalar uchun (dataURL) */
  function thumb(blob, max) {
    return new Promise(res => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, (max || 420) / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.74));
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(""); };
      img.src = url;
    });
  }

  return {
    supported: !!window.indexedDB,

    /* Fayllarni (yoki tayyor bloblarni) saqlaymiz. onStep — jarayonni ko'rsatish uchun */
    async save(id, files, onStep) {
      const list = Array.prototype.slice.call(files, 0, 48);
      const blobs = [];
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        blobs.push(f instanceof Blob && f.type === "image/jpeg" && !f.name ? f : await toBlob(f, 760, 0.76));
        if (onStep) onStep(i + 1, list.length);
      }
      const bytes = blobs.reduce((s, b) => s + b.size, 0);
      await tx("readwrite", s => s.put({ id, blobs, updated: Date.now(), bytes }));
      return { count: blobs.length, bytes, thumb: blobs.length ? await thumb(blobs[0]) : "" };
    },

    async get(id) {
      try {
        const rec = await tx("readonly", s => s.get(id));
        return rec && rec.blobs ? rec.blobs : null;
      } catch (e) { return null; }
    },

    async info(id) {
      try {
        const rec = await tx("readonly", s => s.get(id));
        return rec ? { count: rec.blobs.length, bytes: rec.bytes || 0 } : null;
      } catch (e) { return null; }
    },

    async remove(id) {
      try { await tx("readwrite", s => s.delete(id)); } catch (e) {}
    },

    /* Bloblardan ko'rsatish uchun havolalar */
    urls(blobs) { return blobs.map(b => URL.createObjectURL(b)); },
    free(urls) { urls.forEach(u => URL.revokeObjectURL(u)); }
  };
})();
