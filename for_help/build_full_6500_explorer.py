import re
import json
import os

REPORT_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\grouped_categories_report.html"
OUTPUT_JSON_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\MASTER_EXAM_HIERARCHY_DATA.json"
OUTPUT_HTML_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\MASTER_EXAM_DIRECTORY.html"

with open(REPORT_PATH, "r", encoding="utf-8", errors="ignore") as f:
    raw_html = f.read()

# Extract all group blocks
group_pattern = re.compile(r'<div class="group-card" data-group="([^"]+)">(.*?)</div>\s*(?=<div class="group-card"|$)', re.DOTALL)
group_matches = group_pattern.findall(raw_html)

print(f"Total group cards found: {len(group_matches)}")

all_parsed_groups = []
total_exam_count = 0

for g_name, block in group_matches:
    # Extract row items
    row_pattern = re.compile(r'<tr>\s*<td class="sl">(\d+)</td>\s*<td class="id">(\d+)</td>\s*<td class="name">(.*?)</td>\s*</tr>', re.DOTALL)
    rows = row_pattern.findall(block)
    
    exams = []
    for sl, exam_id, exam_name in rows:
        exam_name_clean = exam_name.strip()
        exams.append({
            "sl": int(sl),
            "id": int(exam_id),
            "name": exam_name_clean,
            "group": g_name
        })
    
    total_exam_count += len(exams)
    all_parsed_groups.append({
        "group_name": g_name,
        "count": len(exams),
        "exams": exams
    })

print(f"Total exams extracted across all groups: {total_exam_count}")

# Define comprehensive categories mapping
categories_config = [
    {
        "id": "rajasthan",
        "name": "राजस्थान",
        "name_en": "Rajasthan",
        "icon": "🚩",
        "sub_preview": "RSMSSB • RPSC • पुलिस • CET • पटवारी",
        "keywords": ["rajasthan"]
    },
    {
        "id": "uttar-pradesh",
        "name": "उत्तर प्रदेश",
        "name_en": "Uttar Pradesh",
        "icon": "🟢",
        "sub_preview": "UP पुलिस • UPSSSC • PET • लेखपाल • PCS",
        "keywords": ["uttar pradesh"]
    },
    {
        "id": "bihar",
        "name": "बिहार",
        "name_en": "Bihar",
        "icon": "🟡",
        "sub_preview": "BPSC शिक्षक • BSSC • सिपाही • दारोगा",
        "keywords": ["bihar"]
    },
    {
        "id": "delhi",
        "name": "दिल्ली",
        "name_en": "Delhi NCT",
        "icon": "🔵",
        "sub_preview": "DSSSB PRT/TGT • दिल्ली पुलिस",
        "keywords": ["delhi"]
    },
    {
        "id": "madhya-pradesh",
        "name": "मध्य प्रदेश",
        "name_en": "Madhya Pradesh",
        "icon": "🟣",
        "sub_preview": "MPESB व्यापम • MP पुलिस • पटवारी • MPPSC",
        "keywords": ["madhya pradesh"]
    },
    {
        "id": "haryana",
        "name": "हरियाणा",
        "name_en": "Haryana",
        "icon": "🟠",
        "sub_preview": "HSSC CET Group C/D • हरियाणा पुलिस",
        "keywords": ["haryana"]
    },
    {
        "id": "railways",
        "name": "रेलवे (RRB)",
        "name_en": "Indian Railways",
        "icon": "🚆",
        "sub_preview": "NTPC • Group D • ALP • RPF कांस्टेबल",
        "keywords": ["railway", "rrb"]
    },
    {
        "id": "ssc",
        "name": "SSC आयोग",
        "name_en": "Staff Selection Commission",
        "icon": "🏛️",
        "sub_preview": "CGL • CHSL • GD कांस्टेबल • MTS • CPO",
        "keywords": ["ssc"]
    },
    {
        "id": "upsc-civil",
        "name": "UPSC सिविल सेवा",
        "name_en": "UPSC & Civil Services",
        "icon": "⚖️",
        "sub_preview": "IAS/IPS (CSE) • NDA • CDS • CAPF",
        "keywords": ["upsc", "civil service"]
    },
    {
        "id": "banking",
        "name": "बैंकिंग एवं वित्त",
        "name_en": "Banking & Finance",
        "icon": "🏦",
        "sub_preview": "SBI PO/Clerk • IBPS • RRB ग्रामीण बैंक",
        "keywords": ["bank", "ibps", "sbi", "rbi"]
    },
    {
        "id": "defence",
        "name": "डिफेंस एवं सेनाएं",
        "name_en": "Defence & Armed Forces",
        "icon": "🛡️",
        "sub_preview": "Army अग्निवीर • Airforce • Navy",
        "keywords": ["defence", "army", "navy", "air force", "nda", "cds"]
    },
    {
        "id": "teaching",
        "name": "केंद्रीय शिक्षण",
        "name_en": "Teaching & Academics",
        "icon": "📚",
        "sub_preview": "CTET • UGC NET • CSIR NET • CUET",
        "keywords": ["teaching", "ugc", "net", "ctet", "cuet", "academic"]
    },
    {
        "id": "engineering-psu",
        "name": "इंजीनियरिंग & PSU",
        "name_en": "Engineering & Central PSUs",
        "icon": "⚙️",
        "sub_preview": "GATE • ISRO • DRDO • BARC • BHEL",
        "keywords": ["engineering", "psu", "gate"]
    },
    {
        "id": "medical-health",
        "name": "मेडिकल & नर्सिंग",
        "name_en": "Medical & Nursing",
        "icon": "🩺",
        "sub_preview": "NEET • AIIMS NORCET • ESIC • NHM",
        "keywords": ["medical", "nursing", "neet", "aiims", "nhm"]
    },
    {
        "id": "other-states",
        "name": "अन्य सभी राज्य",
        "name_en": "Other Indian States",
        "icon": "🇮🇳",
        "sub_preview": "महाराष्ट्र • गुजरात • झारखंड • पंजाब आदि",
        "keywords": [] # Fallback
    }
]

# Map groups to categories
categorized_data = {c["id"]: [] for c in categories_config}

for grp in all_parsed_groups:
    g_name_lower = grp["group_name"].lower()
    matched = False
    
    # Check specific categories first
    for cfg in categories_config[:-1]:
        for kw in cfg["keywords"]:
            if kw in g_name_lower:
                categorized_data[cfg["id"]].append(grp)
                matched = True
                break
        if matched:
            break
            
    if not matched:
        categorized_data["other-states"].append(grp)

print("Categorization breakdown:")
for cfg in categories_config:
    grps = categorized_data[cfg["id"]]
    count = sum(g["count"] for g in grps)
    print(f" - {cfg['name_en']:25} : {len(grps):3} boards/groups | {count:5} exams")

# Build Master JSON structure with ALL 6,494 EXAMS
final_categories = []
for cfg in categories_config:
    grps = categorized_data[cfg["id"]]
    boards = []
    
    for g in grps:
        # Create a clean board title
        b_name = g["group_name"]
        short_name = b_name.replace("Exams", "").replace("General Government", "General Govt").strip()
        
        # Extract 2-3 sample exams for sub_preview
        sample_exam_names = [e["name"] for e in g["exams"][:3]]
        sample_str = " • ".join(sample_exam_names[:2]) if sample_exam_names else ""
        
        boards.append({
            "board_id": b_name.lower().replace(" ", "-").replace("&", "and"),
            "name": b_name,
            "short_name": short_name,
            "icon": cfg["icon"],
            "exam_count": g["count"],
            "viral_preview": sample_str,
            "exams": g["exams"]
        })
        
    final_categories.append({
        "category_id": cfg["id"],
        "name": cfg["name"],
        "name_en": cfg["name_en"],
        "icon": cfg["icon"],
        "sub_preview": cfg["sub_preview"],
        "total_exams": sum(b["exam_count"] for b in boards),
        "boards": boards
    })

master_database = {
    "metadata": {
        "title": "सरकारी साथी — संपूर्ण 6,494 परीक्षा डायरेक्टरी (2026)",
        "author": "हरिमोहन शर्मा (संस्थापक, सरकारी साथी)",
        "helpline": "7852004401",
        "total_categories": len(final_categories),
        "total_boards": len(all_parsed_groups),
        "total_exams": total_exam_count,
        "source_file": "grouped_categories_report.html"
    },
    "categories": final_categories
}

with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(master_database, f, ensure_ascii=False, indent=2)

print(f"Saved complete database with {total_exam_count} exams to {OUTPUT_JSON_PATH}!")

# Now generate the high-speed, interactive HTML with full 6,494 exams!
json_str = json.dumps(master_database, ensure_ascii=False)

html_code = f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏛️ सरकारी साथी — संपूर्ण 6,494+ परीक्षा डायरेक्टरी</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg-main: #0B1120;
    --card-bg: #151F32;
    --card-border: #23324D;
    --accent-blue: #38BDF8;
    --accent-orange: #EA580C;
    --accent-green: #10B981;
    --text-primary: #F8FAFC;
    --text-muted: #94A3B8;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', 'Noto Sans Devanagari', sans-serif; }}
  body {{ background-color: var(--bg-main); color: var(--text-primary); min-height: 100vh; padding-bottom: 90px; line-height: 1.5; }}

  /* Top Bar */
  .top-bar {{
    background: rgba(11, 17, 32, 0.95);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--card-border);
    padding: 12px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 1000;
  }}
  .brand-block {{ display: flex; align-items: center; gap: 14px; }}
  .brand-badge {{
    background: linear-gradient(135deg, #EA580C, #C2410C);
    color: white;
    font-weight: 900;
    font-size: 0.9rem;
    padding: 6px 14px;
    border-radius: 999px;
    box-shadow: 0 4px 15px rgba(234, 88, 12, 0.4);
    letter-spacing: 0.5px;
  }}
  .brand-text {{ font-size: 1.15rem; font-weight: 800; color: white; }}
  .brand-sub {{ font-size: 0.8rem; color: var(--text-muted); }}
  .helpline-box {{
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34D399;
    padding: 6px 16px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.86rem;
  }}

  /* Hero Section */
  .hero-box {{
    text-align: center;
    padding: 38px 20px 20px 20px;
    max-width: 950px;
    margin: 0 auto;
  }}
  .hero-tag {{
    display: inline-block;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: var(--accent-blue);
    font-size: 0.78rem;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 999px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }}
  .hero-h1 {{
    font-size: 2.3rem;
    font-weight: 900;
    background: linear-gradient(135deg, #FFFFFF 40%, #94A3B8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
    line-height: 1.25;
  }}
  .hero-desc {{ font-size: 1.02rem; color: var(--text-muted); margin-bottom: 24px; }}

  /* Live Search Box */
  .search-wrap {{
    max-width: 650px;
    margin: 0 auto 28px auto;
    position: relative;
  }}
  .search-input {{
    width: 100%;
    padding: 16px 24px 16px 54px;
    background: #151F32;
    border: 2px solid var(--card-border);
    border-radius: 999px;
    color: white;
    font-size: 1.05rem;
    outline: none;
    transition: all 0.3s ease;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  }}
  .search-input:focus {{
    border-color: var(--accent-blue);
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.3);
    background: #19263E;
  }}
  .search-ico {{
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.25rem;
    color: #64748B;
  }}

  /* Breadcrumb Navigation */
  .breadcrumb-bar {{
    max-width: 1240px;
    margin: 0 auto 24px auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.92rem;
  }}
  .bc-pill {{
    cursor: pointer;
    padding: 6px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--card-border);
    border-radius: 999px;
    color: #CBD5E1;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    font-weight: 600;
  }}
  .bc-pill:hover {{ background: rgba(56, 189, 248, 0.15); border-color: var(--accent-blue); color: white; }}
  .bc-pill.active {{ background: var(--accent-blue); color: #0B1120; font-weight: 800; border-color: var(--accent-blue); }}
  .bc-arrow {{ color: #475569; font-size: 0.9rem; }}

  /* Main Container */
  .container {{ max-width: 1240px; margin: 0 auto; padding: 0 20px; }}

  .sec-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }}
  .sec-header h2 {{ font-size: 1.35rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 10px; }}
  .sec-header p {{ font-size: 0.88rem; color: var(--text-muted); }}

  /* 🌟 GOL GHERE (CIRCULAR BADGES) */
  .circles-grid {{
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    margin-bottom: 40px;
  }}

  /* Main Circle (Level 1) */
  .circle-card {{
    width: 185px;
    height: 185px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #1A253C 0%, #101828 100%);
    border: 2.5px solid var(--card-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px;
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    user-select: none;
    box-shadow: 0 10px 25px rgba(0,0,0,0.35);
  }}
  .circle-card:hover {{
    transform: translateY(-8px) scale(1.06);
    border-color: var(--accent-blue);
    box-shadow: 0 18px 35px rgba(56, 189, 248, 0.35);
  }}
  .circle-card.active {{
    border-color: #38BDF8;
    background: radial-gradient(circle at 35% 30%, #203152 0%, #131E33 100%);
    box-shadow: 0 0 35px rgba(56, 189, 248, 0.45);
    transform: scale(1.06);
  }}

  .circle-ico {{ font-size: 2.3rem; margin-bottom: 6px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4)); }}
  .circle-title {{ font-size: 1.05rem; font-weight: 800; color: white; line-height: 1.25; margin-bottom: 4px; }}
  .circle-sub {{ font-size: 0.72rem; color: #94A3B8; line-height: 1.2; max-width: 155px; font-weight: 500; }}
  .circle-tag {{
    position: absolute;
    bottom: -8px;
    background: #0B1120;
    border: 1px solid var(--card-border);
    color: #38BDF8;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 999px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
  }}

  /* 🏛️ BOARD CIRCLES (Level 2) */
  .boards-box {{
    background: rgba(21, 31, 50, 0.75);
    border: 1px solid var(--card-border);
    border-radius: 26px;
    padding: 32px 24px;
    margin-bottom: 40px;
    backdrop-filter: blur(14px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.3);
  }}
  .board-circle {{
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #162035 0%, #0D1524 100%);
    border: 2.5px solid #23324D;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    position: relative;
  }}
  .board-circle:hover {{
    transform: translateY(-6px) scale(1.05);
    border-color: var(--accent-orange);
    box-shadow: 0 14px 30px rgba(234, 88, 12, 0.35);
  }}
  .board-circle.active {{
    border-color: var(--accent-orange);
    background: radial-gradient(circle at 35% 30%, #2A1F26 0%, #16121C 100%);
    box-shadow: 0 0 30px rgba(234, 88, 12, 0.45);
    transform: scale(1.05);
  }}

  /* 📋 EXAMS CARDS (Level 3) */
  .exams-box {{
    background: rgba(21, 31, 50, 0.9);
    border: 1px solid var(--card-border);
    border-radius: 26px;
    padding: 32px 28px;
    margin-bottom: 40px;
  }}
  .exams-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }}
  .exam-card {{
    background: #0E1626;
    border: 1px solid #23324D;
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.25s ease;
  }}
  .exam-card:hover {{
    border-color: #38BDF8;
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  }}
  .exam-name {{ font-size: 1.08rem; font-weight: 800; color: white; margin-bottom: 6px; line-height: 1.3; }}
  .badge-line {{ display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }}
  .pill-badge {{
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,0.06);
    color: #CBD5E1;
    border: 1px solid rgba(255,255,255,0.08);
  }}

  /* Study Materials */
  .mat-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }}
  .btn-mat {{
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: all 0.2s ease;
  }}
  .btn-test {{ background: #1D4ED8; color: white; }}
  .btn-test:hover {{ background: #2563EB; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }}
  .btn-pdf {{ background: #065F46; color: white; }}
  .btn-pdf:hover {{ background: #059669; box-shadow: 0 4px 12px rgba(5,150,105,0.4); }}
  .btn-notes {{ background: #4338CA; color: white; }}
  .btn-notes:hover {{ background: #4F46E5; box-shadow: 0 4px 12px rgba(79,70,229,0.4); }}
  .btn-mcq {{ background: #374151; color: white; }}
  .btn-mcq:hover {{ background: #4B5563; }}

  .back-link {{
    padding: 8px 18px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--card-border);
    color: white;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }}
  .back-link:hover {{ background: rgba(255,255,255,0.16); }}

  /* Search results container */
  #search-results-sec {{
    display: none;
    background: rgba(21, 31, 50, 0.9);
    border: 1px solid var(--card-border);
    border-radius: 26px;
    padding: 32px 28px;
    margin-bottom: 40px;
  }}
</style>
</head>
<body>

<!-- Top Bar -->
<div class="top-bar">
  <div class="brand-block">
    <div class="brand-badge">सरकारी साथी</div>
    <div>
      <div class="brand-text">संपूर्ण परीक्षा डायरेक्टरी (6,494 परीक्षाएं)</div>
      <div class="brand-sub">हरिमोहन शर्मा • आधिकारिक परीक्षा पदानुक्रम (2026)</div>
    </div>
  </div>
  <div class="helpline-box">
    📞 हेल्पलाइन: 7852004401
  </div>
</div>

<!-- Hero Section -->
<div class="hero-box">
  <span class="hero-tag">कुल 518 भर्ती बोर्ड • 6,494 वास्तविक परीक्षाएं</span>
  <h1 class="hero-h1">🏛️ अपनी परीक्षा एवं भर्ती बोर्ड चुनें</h1>
  <p class="hero-desc">
    राज्य या राष्ट्रीय श्रेणी के गोल घेरे पर क्लिक करें ➡️ बोर्ड चुनें ➡️ परीक्षा सामग्री (टेस्ट, नोट्स, प्रिंट PDF) प्राप्त करें
  </p>

  <!-- Live Search -->
  <div class="search-wrap">
    <span class="search-ico">🔍</span>
    <input type="text" id="search-input" class="search-input" placeholder="किसी भी परीक्षा का नाम लिखें (उदा. पटवारी, CET, SSC, UP Police, VDO)..." oninput="handleSearch()">
  </div>
</div>

<!-- Breadcrumb Navigation -->
<div class="breadcrumb-bar" id="breadcrumb-bar">
  <span class="bc-pill active" onclick="showLevel1()">🏠 मुख्य डायरेक्टरी</span>
</div>

<!-- Main Container -->
<div class="container">

  <!-- SEARCH RESULTS CONTAINER -->
  <div id="search-results-sec">
    <div class="sec-header">
      <div>
        <h2 id="search-heading">🔍 खोज परिणाम</h2>
        <p id="search-count">परिणाम लोड हो रहे हैं...</p>
      </div>
      <button class="back-link" onclick="clearSearch()">✖️ सर्च बंद करें</button>
    </div>
    <div class="exams-grid" id="search-results-grid"></div>
  </div>

  <!-- LEVEL 1: CATEGORY & STATE CIRCLES (गोल घेरे) -->
  <div id="level1-sec">
    <div class="sec-header">
      <h2>🌐 1. राज्य / राष्ट्रीय श्रेणी (श्रेणी चुनें)</h2>
      <p>कुल {len(final_categories)} श्रेणियां एवं राज्य • {total_exam_count} कुल परीक्षाएं</p>
    </div>
    <div class="circles-grid" id="category-circles"></div>
  </div>

  <!-- LEVEL 2: BOARDS SECTION (गोल घेरे) -->
  <div id="level2-sec" class="boards-box" style="display: none;">
    <div class="sec-header">
      <div>
        <h2 id="boards-heading">🏛️ 2. भर्ती बोर्ड / आयोग चुनें</h2>
        <p id="boards-subtitle">संबंधित आयोग या बोर्ड के घेरे पर क्लिक करें</p>
      </div>
      <button class="back-link" onclick="showLevel1()">⬅️ मुख्य श्रेणियां</button>
    </div>
    <div class="circles-grid" id="boards-circles"></div>
  </div>

  <!-- LEVEL 3: EXAMS LIST -->
  <div id="level3-sec" class="exams-box" style="display: none;">
    <div class="sec-header">
      <div>
        <h2 id="exams-heading">📋 3. वास्तविक परीक्षाएं एवं स्टडी सामग्री</h2>
        <p id="exams-subtitle">परीक्षा चुनें और टेस्ट, नोट्स व प्रिंट पीडीएफ पाएं</p>
      </div>
      <button class="back-link" onclick="showLevel2(currentCat)">⬅️ बोर्ड्स पर वापस जाएं</button>
    </div>
    <div class="exams-grid" id="exams-grid"></div>
  </div>

</div>

<!-- Client Script & Embedded JSON -->
<script>
const DATA = {json_str};

let currentCat = null;
let currentBrd = null;

document.addEventListener("DOMContentLoaded", () => {{
  renderCategories();
}});

// Render Level 1 Circles
function renderCategories() {{
  const container = document.getElementById("category-circles");
  container.innerHTML = DATA.categories.map(cat => `
    <div class="circle-card" onclick="selectCategory('${{cat.category_id}}')" id="cat-${{cat.category_id}}">
      <div class="circle-ico">${{cat.icon}}</div>
      <div class="circle-title">${{cat.name}}</div>
      <div class="circle-sub">${{cat.sub_preview || ''}}</div>
      <div class="circle-tag">${{cat.boards.length}} बोर्ड्स (${{cat.total_exams}} परीक्षा)</div>
    </div>
  `).join("");
}}

// Select Category (Show Boards Circles)
function selectCategory(catId) {{
  currentCat = DATA.categories.find(c => c.category_id === catId);
  if (!currentCat) return;

  document.querySelectorAll(".circle-card").forEach(c => c.classList.remove("active"));
  const sel = document.getElementById("cat-" + catId);
  if (sel) sel.classList.add("active");

  updateBreadcrumb([
    {{ text: "🏠 मुख्य डायरेक्टरी", action: "showLevel1()" }},
    {{ text: `${{currentCat.icon}} ${{currentCat.name}}`, active: true }}
  ]);

  const boardsSec = document.getElementById("level2-sec");
  const boardsHeading = document.getElementById("boards-heading");
  const boardsSubtitle = document.getElementById("boards-subtitle");
  const boardsGrid = document.getElementById("boards-circles");

  boardsHeading.innerHTML = `🏛️ ${{currentCat.name}} के भर्ती बोर्ड / आयोग`;
  boardsSubtitle.innerText = `कुल ${{currentCat.boards.length}} भर्ती बोर्ड • ${{currentCat.total_exams}} परीक्षाएं उपलब्ध`;

  boardsGrid.innerHTML = currentCat.boards.map(b => `
    <div class="board-circle" onclick="selectBoard('${{b.board_id}}')" id="brd-${{b.board_id}}">
      <div class="circle-ico">${{b.icon || '🏛️'}}</div>
      <div class="circle-title">${{b.short_name || b.name}}</div>
      <div class="circle-sub">${{b.viral_preview || ''}}</div>
      <div class="circle-tag">${{b.exams.length}} परीक्षाएं</div>
    </div>
  `).join("");

  boardsSec.style.display = "block";
  document.getElementById("level3-sec").style.display = "none";
  document.getElementById("search-results-sec").style.display = "none";
  boardsSec.scrollIntoView({{ behavior: "smooth", block: "start" }});
}}

// Select Board (Show Exams)
function selectBoard(boardId) {{
  if (!currentCat) return;
  currentBrd = currentCat.boards.find(b => b.board_id === boardId);
  if (!currentBrd) return;

  document.querySelectorAll(".board-circle").forEach(b => b.classList.remove("active"));
  const sel = document.getElementById("brd-" + boardId);
  if (sel) sel.classList.add("active");

  updateBreadcrumb([
    {{ text: "🏠 मुख्य डायरेक्टरी", action: "showLevel1()" }},
    {{ text: `${{currentCat.icon}} ${{currentCat.name}}`, action: `selectCategory('${{currentCat.category_id}}')` }},
    {{ text: `${{currentBrd.icon || '🏛️'}} ${{currentBrd.short_name || currentBrd.name}}`, active: true }}
  ]);

  const examsSec = document.getElementById("level3-sec");
  const examsHeading = document.getElementById("exams-heading");
  const examsSubtitle = document.getElementById("exams-subtitle");
  const examsGrid = document.getElementById("exams-grid");

  examsHeading.innerHTML = `📋 ${{currentBrd.name}} की परीक्षाएं`;
  examsSubtitle.innerText = `${{currentBrd.exams.length}} सत्यापित परीक्षाएं • स्टडी मटेरियल एवं अभ्यास सेट`;

  examsGrid.innerHTML = currentBrd.exams.map(exam => renderExamCard(exam, currentBrd.short_name)).join("");

  examsSec.style.display = "block";
  examsSec.scrollIntoView({{ behavior: "smooth", block: "start" }});
}}

// Helper: Render Exam Card
function renderExamCard(exam, boardName) {{
  const isCet12th = exam.name.includes("CET") && exam.name.includes("12");
  
  return `
    <div class="exam-card">
      <div>
        <div class="exam-name">${{exam.name}}</div>
        <div class="badge-line">
          <span class="pill-badge">ID: #${{exam.id}}</span>
          <span class="pill-badge" style="background: rgba(56, 189, 248, 0.15); color: #38BDF8;">${{boardName || exam.group}}</span>
        </div>
      </div>

      <div>
        <div style="font-size: 0.74rem; color: #94A3B8; margin-top: 6px; font-weight: 600;">📚 स्टडी मटेरियल हब:</div>
        <div class="mat-grid">
          ${{isCet12th ? `
            <a href="../../SARKARI_SATHI/cet_pipeline/web_ui/Unit_01_Interactive_Mock_Test.html" target="_blank" class="btn-mat btn-test">🎯 120Q टेस्ट</a>
            <a href="../../SARKARI_SATHI/cet_pipeline/web_ui/printable_tests/Unit_01_Printable_Mock_Test.pdf" target="_blank" class="btn-mat btn-pdf">🖨️ B&W प्रिंट PDF</a>
            <a href="../../SARKARI_SATHI/cet_pipeline/web_ui/notes/Unit_01_Rajasthan_History_Art_Culture.html" target="_blank" class="btn-mat btn-notes">📘 क्लास नोट्स</a>
            <a href="../../SARKARI_SATHI/cet_pipeline/web_ui/mcq_banks/Unit_01_MCQ_Bank_120.html" target="_blank" class="btn-mat btn-mcq">📄 MCQ बैंक</a>
          ` : `
            <span class="btn-mat btn-test">🎯 लाइव टेस्ट</span>
            <span class="btn-mat btn-pdf">🖨️ B&W प्रिंट PDF</span>
            <span class="btn-mat btn-notes">📘 क्लास नोट्स</span>
            <span class="btn-mat btn-mcq">📄 MCQ बैंक</span>
          `}}
        </div>
      </div>
    </div>
  `;
}}

function showLevel1() {{
  currentCat = null;
  currentBrd = null;
  document.querySelectorAll(".circle-card").forEach(c => c.classList.remove("active"));
  document.getElementById("level2-sec").style.display = "none";
  document.getElementById("level3-sec").style.display = "none";
  document.getElementById("search-results-sec").style.display = "none";
  updateBreadcrumb([{{ text: "🏠 मुख्य डायरेक्टरी", active: true }}]);
  window.scrollTo({{ top: 0, behavior: "smooth" }});
}}

function showLevel2(cat) {{
  if (cat) selectCategory(cat.category_id);
}}

function updateBreadcrumb(items) {{
  const bar = document.getElementById("breadcrumb-bar");
  bar.innerHTML = items.map(it => `
    ${{it.active ?
      `<span class="bc-pill active">${{it.text}}</span>` :
      `<span class="bc-pill" onclick="${{it.action}}">${{it.text}}</span>`
    }}
  `).join(`<span class="bc-arrow">›</span>`);
}}

// Instant Global Search across all 6,494 exams!
function handleSearch() {{
  const query = document.getElementById("search-input").value.toLowerCase().trim();
  const searchSec = document.getElementById("search-results-sec");
  const searchGrid = document.getElementById("search-results-grid");
  const searchCount = document.getElementById("search-count");

  if (!query || query.length < 2) {{
    searchSec.style.display = "none";
    document.getElementById("level1-sec").style.display = "block";
    return;
  }}

  // Collect matches across ALL 6,494 exams!
  let matches = [];
  for (const cat of DATA.categories) {{
    for (const b of cat.boards) {{
      for (const ex of b.exams) {{
        if (ex.name.toLowerCase().includes(query)) {{
          matches.push({{ exam: ex, board: b.short_name, category: cat.name }});
          if (matches.length >= 60) break;
        }}
      }}
      if (matches.length >= 60) break;
    }}
    if (matches.length >= 60) break;
  }}

  document.getElementById("level1-sec").style.display = "none";
  document.getElementById("level2-sec").style.display = "none";
  document.getElementById("level3-sec").style.display = "none";
  searchSec.style.display = "block";

  searchCount.innerText = `'${{query}}' के लिए ${{matches.length}} परीक्षाएं प्राप्त हुईं (शीर्ष परिणाम प्रदर्शित)`;
  searchGrid.innerHTML = matches.map(m => renderExamCard(m.exam, `${{m.category}} • ${{m.board}}`)).join("");
}}

function clearSearch() {{
  document.getElementById("search-input").value = "";
  handleSearch();
  showLevel1();
}}
</script>

</body>
</html>
"""

with open(OUTPUT_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_code)

print(f"Generated {OUTPUT_HTML_PATH} with ALL {total_exam_count} exams successfully!")
