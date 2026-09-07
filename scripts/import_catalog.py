import os
import re
import json
import shutil
import unicodedata

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def safe_filename(name):
    # Keep filename web safe
    name = re.sub(r'[^\w\s\.-]', '', name).strip()
    return re.sub(r'[-\s]+', '_', name).lower()

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_path = os.path.join(base_dir, 'for_help', 'grouped_categories_report.html')
src_logo_dir = os.path.join(base_dir, 'for_help', 'category_logos')
dest_logo_dir = os.path.join(base_dir, 'public', 'logos', 'category_logos')

os.makedirs(dest_logo_dir, exist_ok=True)

# 1. Map all logo files in source directory
src_logos = os.listdir(src_logo_dir) if os.path.exists(src_logo_dir) else []
logo_index = {}
for f in src_logos:
    name_no_ext = os.path.splitext(f)[0].lower().strip()
    clean = re.sub(r'[^a-z0-9]', '', name_no_ext)
    logo_index[name_no_ext] = f
    logo_index[clean] = f

# 2. Read existing exams to preserve active courses
existing_exams_path = os.path.join(base_dir, 'data', 'exams-new.json')
existing_active_exams = {}
if os.path.exists(existing_exams_path):
    with open(existing_exams_path, 'r', encoding='utf-8') as f:
        try:
            curr = json.load(f)
            for e in curr:
                existing_active_exams[e.get('id')] = e
        except Exception as err:
            print("Notice: Could not parse existing exams-new.json", err)

# 3. Read HTML file
print("Reading grouped_categories_report.html...")
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

group_pattern = re.compile(
    r'<div class="group-card" data-group="([^"]+)">.*?<div class="table-container">\s*<table>.*?<tbody>(.*?)</tbody>\s*</table>',
    re.DOTALL
)
row_pattern = re.compile(
    r'<tr>\s*<td class="sl">(\d+)</td>\s*<td class="id">(\d+)</td>\s*<td class="name">([^<]+)</td>\s*</tr>',
    re.DOTALL
)

matches = group_pattern.findall(content)
print(f"Found {len(matches)} groups in HTML.")

parsed_categories = []
parsed_exams = []
seen_exam_ids = set()
copied_logos = {}

for priority, (group_name, tbody) in enumerate(matches, 1):
    group_name = group_name.strip()
    cat_slug = slugify(group_name)
    
    # Match logo
    gn_lower = group_name.lower().strip()
    gn_clean = re.sub(r'[^a-z0-9]', '', gn_lower)
    matched_logo_file = logo_index.get(gn_lower) or logo_index.get(gn_clean)
    
    if not matched_logo_file:
        # Fallback for CUET
        if "cuet" in gn_lower:
            matched_logo_file = logo_index.get("national academics - nta exams") or "National Academics - NTA Exams.jpg"
        else:
            # Partial search
            for k, v in logo_index.items():
                if k in gn_lower or gn_lower in k:
                    matched_logo_file = v
                    break
                    
    logo_web_url = ""
    if matched_logo_file and os.path.exists(os.path.join(src_logo_dir, matched_logo_file)):
        dest_filename = safe_filename(os.path.splitext(matched_logo_file)[0]) + ".jpg"
        if dest_filename not in copied_logos:
            src_p = os.path.join(src_logo_dir, matched_logo_file)
            dst_p = os.path.join(dest_logo_dir, dest_filename)
            shutil.copy2(src_p, dst_p)
            copied_logos[dest_filename] = True
        logo_web_url = f"/logos/category_logos/{dest_filename}"
    
    # State / Department derivation
    state_or_group = "Other"
    first_word = group_name.split()[0]
    if "Rajasthan" in group_name:
        state_or_group = "Rajasthan"
    elif "Banking" in group_name or "Bank" in group_name:
        state_or_group = "Banking & Finance"
    elif "Defence" in group_name or "Police" in group_name:
        state_or_group = "Defence & Police"
    elif "Railways" in group_name or "Railway" in group_name:
        state_or_group = "Railways"
    elif "Staff Selection" in group_name or "SSC" in group_name:
        state_or_group = "SSC"
    elif "UPSC" in group_name or "Civil Services" in group_name:
        state_or_group = "UPSC"
    elif "Teaching" in group_name or "TET" in group_name or "School" in group_name or "REET" in group_name:
        state_or_group = "Teaching"
    elif "Engineering" in group_name or "PSU" in group_name:
        state_or_group = "Engineering & PSU"
    elif "Medical" in group_name or "Nursing" in group_name:
        state_or_group = "Medical & Health"
    elif first_word in ["Uttar", "Madhya", "Bihar", "Haryana", "Punjab", "Gujarat", "Maharashtra", "Odisha", "Jharkhand", "Chhattisgarh", "Karnataka", "Kerala", "Tamil", "Telangana", "West", "Assam", "Himachal", "Uttarakhand", "Delhi"]:
        state_or_group = f"{first_word} State"

    rows = row_pattern.findall(tbody)
    exam_ids_for_cat = []

    for sl, raw_id, exam_name in rows:
        exam_name = exam_name.strip()
        exam_slug = slugify(f"{exam_name}-{raw_id}")
        
        # Check if this exam matches an existing active exam
        is_existing_active = False
        course_ids = []
        status = "upcoming"
        board = group_name
        
        # Find if existing active exam matches
        for ex_id, ex_obj in existing_active_exams.items():
            if ex_id == exam_slug or ex_obj.get("name", "").lower() == exam_name.lower():
                is_existing_active = ex_obj.get("is_active", True)
                course_ids = ex_obj.get("course_ids", [])
                status = ex_obj.get("status", "upcoming")
                board = ex_obj.get("board", group_name)
                exam_slug = ex_id
                break
        
        exam_entry = {
            "id": exam_slug,
            "category_id": cat_slug,
            "name": exam_name,
            "short_name": exam_name[:30],
            "board": board,
            "logo_url": logo_web_url,
            "description": f"Complete pattern-decoded syllabus, weightage analysis and preparation kit for {exam_name}.",
            "status": status,
            "priority": len(exam_ids_for_cat) + 1,
            "is_active": is_existing_active, # Set to False for all imported exams as requested
            "course_ids": course_ids,
            "created_at": "2026-09-07T00:00:00Z",
            "updated_at": "2026-09-07T00:00:00Z"
        }
        
        if exam_slug not in seen_exam_ids:
            seen_exam_ids.add(exam_slug)
            parsed_exams.append(exam_entry)
            exam_ids_for_cat.append(exam_slug)

    category_entry = {
        "id": cat_slug,
        "name": group_name,
        "name_hi": group_name,
        "icon": "📋",
        "logo_url": logo_web_url,
        "color": "bg-amber-700" if "Rajasthan" in group_name else "bg-stone-800",
        "priority": priority,
        "is_active": True,
        "state_or_group": state_or_group,
        "exam_count": len(exam_ids_for_cat),
        "exam_ids": exam_ids_for_cat,
        "created_at": "2026-09-07T00:00:00Z",
        "updated_at": "2026-09-07T00:00:00Z"
    }
    parsed_categories.append(category_entry)

# Ensure any active exams not in HTML are preserved
for ex_id, ex_obj in existing_active_exams.items():
    if ex_id not in seen_exam_ids:
        parsed_exams.insert(0, ex_obj)
        seen_exam_ids.add(ex_id)

print(f"Total categories generated: {len(parsed_categories)}")
print(f"Total exams generated: {len(parsed_exams)}")
print(f"Total logos copied to public/logos/category_logos/: {len(copied_logos)}")

active_exams_count = sum(1 for e in parsed_exams if e.get("is_active"))
inactive_exams_count = sum(1 for e in parsed_exams if not e.get("is_active"))
print(f"Active exams: {active_exams_count} | Inactive (deactive) exams: {inactive_exams_count}")

# Save to data/categories.json and data/exams-new.json
categories_dest = os.path.join(base_dir, 'data', 'categories.json')
exams_dest = os.path.join(base_dir, 'data', 'exams-new.json')

with open(categories_dest, 'w', encoding='utf-8') as f:
    json.dump(parsed_categories, f, ensure_ascii=False, indent=2)

with open(exams_dest, 'w', encoding='utf-8') as f:
    json.dump(parsed_exams, f, ensure_ascii=False, indent=2)

print("SUCCESS: Ingestion completed and saved to data/categories.json & data/exams-new.json.")
