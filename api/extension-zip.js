const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const entries = [];
  let offset = 0;
  const localParts = [];

  for (const { name, data } of files) {
    const nb = Buffer.from(name, "utf8");
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0, 8);
    const crc = crc32(data);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nb.length, 26);
    entries.push({ name: nb, data, crc, offset });
    localParts.push(h, nb, data);
    offset += 30 + nb.length + data.length;
  }

  const cdParts = [];
  for (const e of entries) {
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt32LE(e.crc, 16);
    cd.writeUInt32LE(e.data.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(e.name.length, 28);
    cd.writeUInt32LE(e.offset, 42);
    cdParts.push(cd, e.name);
  }
  const centralDir = Buffer.concat(cdParts);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

module.exports = async (req, res) => {
  try {
    const ext = path.join(process.cwd(), "Extension", "ping-analyst_v1");
    const files = [
      "manifest.json", "sidepanel.html", "sidepanel.js", "background.js",
      "icons/icon16.png", "icons/icon48.png", "icons/icon128.png"
    ].map(f => ({
      name: "ping-analyst-extension/" + f,
      data: fs.readFileSync(path.join(ext, f))
    }));

    const zip = buildZip(files);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="ping-analyst-extension.zip"');
    res.setHeader("Cache-Control", "no-cache");
    res.send(zip);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
