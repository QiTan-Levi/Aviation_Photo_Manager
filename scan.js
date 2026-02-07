// scan.js
// UTF-8 BOM + 映射（model / airline / location）+ 去重表头

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

/* ================== 配置 ================== */
const ROOT_DIR = "E:/摄像存档/航空摄影";
const OUTPUT = "data.csv";
const MAP_FILE = "main.csv"; // 你给的 type,id,name_cn,name_en,... 那个文件

/* ================== 读取映射 ================== */
const mapRaw = fs.readFileSync(MAP_FILE, "utf8");
const mapParsed = Papa.parse(mapRaw, { header: true, skipEmptyLines: true });

// 创建映射表
const modelMap = {};        // 机型中文名 -> 机型ID
const modelEnMap = {};      // 机型ID -> 机型英文名
const airlineMap = {};      // 航空公司中文名 -> 航空公司英文名
const airlineIdMap = {};    // 航空公司中文名 -> 航空公司ID
const locationList = [];    // 用于包含匹配的location数组 [{id, name_en, name_cn}]

for (const r of mapParsed.data) {
  if (r.type === "model") {
    modelMap[r.name_cn] = r.id;           // 中文机型名 -> 机型ID
    modelEnMap[r.id] = r.name_en || r.id; // 机型ID -> 英文机型名
  }
  if (r.type === "airline") {
    airlineMap[r.name_cn] = r.name_en || r.id; // 中文航空公司 -> 英文航空公司
    airlineIdMap[r.name_cn] = r.id;             // 中文航空公司 -> 航空公司ID
  }
  if (r.type === "location") {
    locationList.push({
      id: r.id,
      name_en: r.name_en || r.id,
      name_cn: r.name_cn
    });
  }
}

/* ================== 地点包含匹配函数 ================== */
function findLocationMatch(locationName) {
  if (!locationName) return { id: locationName, name_en: locationName };
  
  // 遍历所有location记录，检查是否包含目标字符串
  for (const loc of locationList) {
    if (loc.name_cn && loc.name_cn.includes(locationName)) {
      return { id: loc.id, name_en: loc.name_en };
    }
  }
  
  // 如果没有找到包含匹配，返回原始值
  return { id: locationName, name_en: locationName };
}

/* ================== 工具 ================== */
let ID = 1;
const rows = [];

function walk(dir) {
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of list) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      parseFolder(full);
      walk(full);
    }
  }
}

function parseFolder(folder) {
  const rel = path.relative(ROOT_DIR, folder);
  const parts = rel.split(path.sep);
  if (parts.length < 3) return;

  const model = parts[0];
  const airline = parts[1];
  const rest = parts.slice(2).join("_");

  let reg = "";
  let livery = "";
  let location = "";

  const segs = rest.split("_");
  if (segs.length >= 1) reg = segs[0];
  if (segs.length === 2) location = segs[1];
  if (segs.length >= 3) {
    livery = segs[1];
    location = segs[2];
  }

  // 使用映射表转换中文为英文
  const modelId = modelMap[model] || model;
  const modelEn = modelEnMap[modelId] || model;
  const airlineEn = airlineMap[airline] || airline;
  const airlineId = airlineIdMap[airline] || airline;
  
  // 关键修改：使用包含匹配查找location
  const { id: locationId, name_en: locationEn } = findLocationMatch(location);

  rows.push({
    id: ID++,
    registration: reg,
    model_id: modelId,
    airline_id: airlineId,
    location_id: locationId,  // 使用包含匹配找到的ID
    livery,
    tags: "",
    remark: "",
    folder
  });
}

/* ================== 扫描 ================== */
walk(ROOT_DIR);

/* ================== 输出 CSV（UTF-8 BOM） ================== */
const csv = Papa.unparse(rows, { quotes: true });
const bom = "\uFEFF";
fs.writeFileSync(OUTPUT, bom + csv, "utf8");

console.log("DONE:", rows.length);
console.log("输出文件:", OUTPUT);