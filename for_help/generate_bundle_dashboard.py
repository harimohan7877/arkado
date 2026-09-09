import json
import os

INDEX_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\bundles\BUNDLES_INDEX.json"
BUNDLES_DIR = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\bundles"
OUTPUT_HTML_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\BUNDLES_AUDIT_EXPLORER.html"

with open(INDEX_PATH, "r", encoding="utf-8") as f:
    index_data = json.load(f)

# Load all full bundles data for embedded offline viewing
all_bundles_map = {}
for b_meta in index_data["bundles"]:
    b_id = b_meta["bundle_id"]
    b_file = os.path.join(BUNDLES_DIR, f"{b_id}.json")
    if os.path.exists(b_file):
        with open(b_file, "r", encoding="utf-8") as f:
            all_bundles_map[b_id] = json.load(f)

print(f"Loaded {len(all_bundles_map)} full bundles into explorer memory.")

index_json_str = json.dumps(index_data, ensure_ascii=False)
bundles_json_str = json.dumps(all_bundles_map, ensure_ascii=False)

html_content = f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📦 50-50 परीक्षाओं के ऑडिट बंडल्स — सरकारी साथी (6,494 परीक्षा सत्यापन)</title>
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
  .stats-pill {{
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38BDF8;
    padding: 6px 16px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.86rem;
  }}

  /* Hero Section */
  .hero-box {{
    text-align: center;
    padding: 36px 20px 20px 20px;
    max-width: 950px;
    margin: 0 auto;
  }}
  .hero-tag {{
    display: inline-block;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34D399;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 4px 16px;
    border-radius: 999px;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }}
  .hero-h1 {{
    font-size: 2.2rem;
    font-weight: 900;
    background: linear-gradient(135deg, #FFFFFF 40%, #94A3B8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }}
  .hero-desc {{ font-size: 1.02rem; color: var(--text-muted); margin-bottom: 24px; }}

  /* Search & Filter Bar */
  .filter-wrap {{
    max-width: 1240px;
    margin: 0 auto 24px auto;
    padding: 0 20px;
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
    left: 40px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.25rem;
    color: #64748B;
  }}

  /* Category Filter Pills */
  .category-filter-bar {{
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 18px;
  }}
  .cat-btn {{
    padding: 7px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--card-border);
    border-radius: 999px;
    color: #CBD5E1;
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }}
  .cat-btn:hover {{ background: rgba(56, 189, 248, 0.15); border-color: var(--accent-blue); color: white; }}
  .cat-btn.active {{ background: var(--accent-blue); color: #0B1120; font-weight: 800; border-color: var(--accent-blue); }}

  /* Main Container */
  .container {{ max-width: 1240px; margin: 0 auto; padding: 0 20px; }}

  /* Bundles Grid */
  .bundles-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
    margin-top: 24px;
  }}

  .bundle-card {{
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.25s ease;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  }}
  .bundle-card:hover {{
    border-color: #38BDF8;
    transform: translateY(-4px);
    box-shadow: 0 14px 30px rgba(56, 189, 248, 0.25);
  }}

  .bundle-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }}
  .bundle-badge {{
    background: rgba(234, 88, 12, 0.15);
    border: 1px solid rgba(234, 88, 12, 0.35);
    color: #FB923C;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }}
  .bundle-count {{
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38BDF8;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
  }}
  .bundle-title {{
    font-size: 1.15rem;
    font-weight: 800;
    color: white;
    margin-bottom: 8px;
    line-height: 1.3;
  }}
  .bundle-samples {{
    background: rgba(0,0,0,0.25);
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.8rem;
    color: #94A3B8;
    margin-bottom: 16px;
    line-height: 1.45;
  }}
  .bundle-samples strong {{ color: #E2E8F0; }}

  .btn-open-bundle {{
    width: 100%;
    padding: 11px 16px;
    background: linear-gradient(135deg, #2563EB, #1D4ED8);
    border: none;
    border-radius: 12px;
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }}
  .btn-open-bundle:hover {{
    background: linear-gradient(135deg, #38BDF8, #2563EB);
    box-shadow: 0 4px 15px rgba(37,99,235,0.4);
    transform: scale(1.02);
  }}

  /* MODAL FOR BUNDLE DETAILS */
  .modal-overlay {{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    z-index: 2000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }}
  .modal-box {{
    background: #101726;
    border: 2px solid var(--card-border);
    border-radius: 24px;
    width: 100%;
    max-width: 950px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 60px rgba(0,0,0,0.6);
  }}
  .modal-head {{
    padding: 20px 28px;
    border-bottom: 1px solid var(--card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .modal-head h3 {{ font-size: 1.3rem; font-weight: 800; color: white; }}
  .btn-close {{
    background: rgba(255,255,255,0.1);
    border: none;
    color: white;
    font-size: 1.2rem;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .btn-close:hover {{ background: #EF4444; }}

  .modal-body {{
    padding: 24px 28px;
    overflow-y: auto;
    flex: 1;
  }}

  /* Exam Table */
  .exam-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }}
  .exam-table th {{
    background: #151F32;
    padding: 12px 14px;
    text-align: left;
    color: #94A3B8;
    font-weight: 700;
    border-bottom: 2px solid var(--card-border);
  }}
  .exam-table td {{
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: #E2E8F0;
  }}
  .exam-table tr:hover td {{ background: rgba(56, 189, 248, 0.05); }}
  .btn-google {{
    padding: 4px 10px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    color: #38BDF8;
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }}
  .btn-google:hover {{ background: #38BDF8; color: #0B1120; }}
</style>
</head>
<body>

<!-- Top Bar -->
<div class="top-bar">
  <div class="brand-block">
    <div class="brand-badge">सरकारी साथी</div>
    <div>
      <div class="brand-text">परीक्षा ऑडिट एवं सत्यापन डैशबोर्ड</div>
      <div class="brand-sub">6,494 परीक्षाओं के 50-50 के सिस्टमैटिक बंडल्स</div>
    </div>
  </div>
  <div class="stats-pill">
    📦 कुल {index_data['metadata']['total_bundles']} बंडल्स • 6,494 परीक्षाएं
  </div>
</div>

<!-- Hero Section -->
<div class="hero-box">
  <span class="hero-tag">✓ सिस्टमैटिक 50-item ऑडिट सिस्टम</span>
  <h1 class="hero-h1">🔍 सभी परीक्षाओं की बंडलवार जांच</h1>
  <p class="hero-desc">
    सभी 6,494 परीक्षाओं को 50-50 के 126 बंडल्स में बाँट दिया गया है। किसी भी बंडल को खोलकर प्रत्येक परीक्षा का नाम, बोर्ड व सत्यापन आसानी से चेक करें।
  </p>
</div>

<!-- Search & Filter Bar -->
<div class="filter-wrap" style="position: relative;">
  <span class="search-ico">🔍</span>
  <input type="text" id="search-bundles" class="search-input" placeholder="किसी भी परीक्षा, बोर्ड या राज्य का नाम लिखें..." oninput="filterBundles()">
  
  <div class="category-filter-bar" id="category-filter-bar">
    <button class="cat-btn active" onclick="filterCategory('all', this)">🌐 सभी बंडल्स (126)</button>
    <button class="cat-btn" onclick="filterCategory('rajasthan', this)">🚩 राजस्थान</button>
    <button class="cat-btn" onclick="filterCategory('uttar-pradesh', this)">🟢 उत्तर प्रदेश</button>
    <button class="cat-btn" onclick="filterCategory('bihar', this)">🟡 बिहार</button>
    <button class="cat-btn" onclick="filterCategory('delhi', this)">🔵 दिल्ली</button>
    <button class="cat-btn" onclick="filterCategory('madhya-pradesh', this)">🟣 मध्य प्रदेश</button>
    <button class="cat-btn" onclick="filterCategory('haryana', this)">🟠 हरियाणा</button>
    <button class="cat-btn" onclick="filterCategory('railways', this)">🚆 रेलवे RRB</button>
    <button class="cat-btn" onclick="filterCategory('ssc', this)">🏛️ SSC</button>
    <button class="cat-btn" onclick="filterCategory('upsc-civil', this)">⚖️ UPSC</button>
    <button class="cat-btn" onclick="filterCategory('banking', this)">🏦 बैंकिंग</button>
    <button class="cat-btn" onclick="filterCategory('defence', this)">🛡️ डिफेंस</button>
    <button class="cat-btn" onclick="filterCategory('teaching', this)">📚 शिक्षण</button>
    <button class="cat-btn" onclick="filterCategory('engineering-psu', this)">⚙️ इंजीनियरिंग</button>
    <button class="cat-btn" onclick="filterCategory('medical-health', this)">🩺 मेडिकल</button>
    <button class="cat-btn" onclick="filterCategory('other-states', this)">🇮🇳 अन्य राज्य</button>
  </div>
</div>

<!-- Main Container -->
<div class="container">
  <div class="bundles-grid" id="bundles-grid"></div>
</div>

<!-- MODAL POPUP FOR BUNDLE DETAILS -->
<div class="modal-overlay" id="bundle-modal" onclick="closeModal(event)">
  <div class="modal-box" onclick="event.stopPropagation()">
    <div class="modal-head">
      <h3 id="modal-title">बंडल विवरण</h3>
      <button class="btn-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div id="modal-summary" style="margin-bottom: 16px; color: #94A3B8; font-size: 0.9rem;"></div>
      <table class="exam-table">
        <thead>
          <tr>
            <th style="width: 60px;">SL</th>
            <th style="width: 80px;">ID</th>
            <th>परीक्षा का नाम</th>
            <th>भर्ती बोर्ड / ग्रुप</th>
            <th style="width: 130px; text-align: center;">सत्यापन सर्च</th>
          </tr>
        </thead>
        <tbody id="modal-table-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- Embedded Client Logic -->
<script>
const INDEX = {index_json_str};
const BUNDLES_MAP = {bundles_json_str};

let activeCategory = "all";

document.addEventListener("DOMContentLoaded", () => {{
  renderBundles(INDEX.bundles);
}});

function renderBundles(bundlesList) {{
  const grid = document.getElementById("bundles-grid");
  grid.innerHTML = bundlesList.map(b => `
    <div class="bundle-card" data-cat="${{b.category_id}}" data-title="${{b.title.toLowerCase()}}">
      <div>
        <div class="bundle-header">
          <span class="bundle-badge">#${{b.bundle_id.toUpperCase()}}</span>
          <span class="bundle-count">📋 ${{b.total_exams}} परीक्षाएं</span>
        </div>
        <div class="bundle-title">${{b.category_icon}} ${{b.title}}</div>
        <div class="bundle-samples">
          <strong>नमूना परीक्षाएं:</strong><br>
          ${{b.sample_exams.slice(0, 2).join(" • ")}}
        </div>
      </div>
      <button class="btn-open-bundle" onclick="openBundleModal('${{b.bundle_id}}')">
        🔍 बंडल खोलें (${{b.total_exams}} परीक्षाएं देखें)
      </button>
    </div>
  `).join("");
}}

function filterCategory(catId, btn) {{
  activeCategory = catId;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const cards = document.querySelectorAll(".bundle-card");
  cards.forEach(card => {{
    if (catId === "all" || card.getAttribute("data-cat") === catId) {{
      card.style.display = "flex";
    }} else {{
      card.style.display = "none";
    }}
  }});
}}

function filterBundles() {{
  const query = document.getElementById("search-bundles").value.toLowerCase().trim();
  const cards = document.querySelectorAll(".bundle-card");
  
  cards.forEach(card => {{
    const title = card.getAttribute("data-title");
    const cat = card.getAttribute("data-cat");
    const matchesCat = (activeCategory === "all" || cat === activeCategory);
    const matchesQuery = (!query || title.includes(query));
    
    card.style.display = (matchesCat && matchesQuery) ? "flex" : "none";
  }});
}}

function openBundleModal(bundleId) {{
  const bundle = BUNDLES_MAP[bundleId];
  if (!bundle) return;

  document.getElementById("modal-title").innerHTML = `${{bundle.category_icon}} ${{bundle.title}}`;
  document.getElementById("modal-summary").innerHTML = `
    <strong>बंडल ID:</strong> ${{bundle.bundle_id}} • 
    <strong>कुल परीक्षाएं:</strong> ${{bundle.total_exams}} • 
    <strong>श्रेणी:</strong> ${{bundle.category_name}}
  `;

  const tbody = document.getElementById("modal-table-body");
  tbody.innerHTML = bundle.exams.map((ex, idx) => `
    <tr>
      <td style="color: #64748B;">${{idx + 1}}</td>
      <td style="color: #38BDF8; font-weight: 700;">#${{ex.id}}</td>
      <td style="font-weight: 700; color: white;">${{ex.name}}</td>
      <td style="color: #94A3B8;">${{ex.group}}</td>
      <td style="text-align: center;">
        <a href="https://www.google.com/search?q=${{encodeURIComponent(ex.name + ' official recruitment board')}}" target="_blank" class="btn-google">
          🌐 गूगल सर्च
        </a>
      </td>
    </tr>
  `).join("");

  document.getElementById("bundle-modal").style.display = "flex";
}}

function closeModal(event) {{
  document.getElementById("bundle-modal").style.display = "none";
}}
</script>

</body>
</html>
"""

with open(OUTPUT_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated BUNDLES_AUDIT_EXPLORER.html successfully at {OUTPUT_HTML_PATH}!")
