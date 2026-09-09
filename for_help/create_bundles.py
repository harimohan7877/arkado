import json
import os

DB_PATH = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\MASTER_EXAM_HIERARCHY_DATA.json"
BUNDLES_DIR = r"c:\Users\harimohan sharma\Documents\Arkado\sarkari-sathi\for_help\bundles"

os.makedirs(BUNDLES_DIR, exist_ok=True)

with open(DB_PATH, "r", encoding="utf-8") as f:
    master_db = json.load(f)

# Maximum bundle size target: ~50 to 80 items
TARGET_BUNDLE_SIZE = 60

bundles = []
bundle_counter = 1

for cat in master_db["categories"]:
    cat_id = cat["category_id"]
    cat_name = cat["name"]
    cat_icon = cat["icon"]
    
    current_bundle_exams = []
    current_bundle_boards = set()
    
    for board in cat["boards"]:
        board_name = board["name"]
        board_short = board["short_name"]
        exams = board["exams"]
        
        # If board itself is large (> TARGET_BUNDLE_SIZE), chunk it directly
        if len(exams) >= TARGET_BUNDLE_SIZE:
            # Flush any pending combined bundle first
            if current_bundle_exams:
                b_id = f"bundle-{bundle_counter:03d}"
                b_title = f"{cat_name} — " + " + ".join(list(current_bundle_boards)[:3])
                bundles.append({
                    "bundle_id": b_id,
                    "bundle_num": bundle_counter,
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "category_icon": cat_icon,
                    "title": b_title,
                    "total_exams": len(current_bundle_exams),
                    "boards_included": list(current_bundle_boards),
                    "exams": current_bundle_exams
                })
                bundle_counter += 1
                current_bundle_exams = []
                current_bundle_boards = set()
                
            # Now chunk this large board
            chunk_size = TARGET_BUNDLE_SIZE
            for i in range(0, len(exams), chunk_size):
                chunk = exams[i:i + chunk_size]
                part_num = (i // chunk_size) + 1
                total_parts = (len(exams) + chunk_size - 1) // chunk_size
                
                b_id = f"bundle-{bundle_counter:03d}"
                b_title = f"{cat_name} — {board_short} (Part {part_num}/{total_parts})"
                bundles.append({
                    "bundle_id": b_id,
                    "bundle_num": bundle_counter,
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "category_icon": cat_icon,
                    "title": b_title,
                    "total_exams": len(chunk),
                    "boards_included": [board_short],
                    "exams": chunk
                })
                bundle_counter += 1
        else:
            # Board is smaller than TARGET_BUNDLE_SIZE
            # Check if adding it exceeds TARGET_BUNDLE_SIZE * 1.3
            if len(current_bundle_exams) + len(exams) > TARGET_BUNDLE_SIZE * 1.25 and len(current_bundle_exams) >= 35:
                # Flush current
                b_id = f"bundle-{bundle_counter:03d}"
                b_title = f"{cat_name} — " + " • ".join(list(current_bundle_boards)[:3])
                bundles.append({
                    "bundle_id": b_id,
                    "bundle_num": bundle_counter,
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "category_icon": cat_icon,
                    "title": b_title,
                    "total_exams": len(current_bundle_exams),
                    "boards_included": list(current_bundle_boards),
                    "exams": current_bundle_exams
                })
                bundle_counter += 1
                current_bundle_exams = []
                current_bundle_boards = set()
                
            current_bundle_exams.extend(exams)
            current_bundle_boards.add(board_short)
            
    # Flush remaining for this category
    if current_bundle_exams:
        b_id = f"bundle-{bundle_counter:03d}"
        b_title = f"{cat_name} — " + " • ".join(list(current_bundle_boards)[:3])
        bundles.append({
            "bundle_id": b_id,
            "bundle_num": bundle_counter,
            "category_id": cat_id,
            "category_name": cat_name,
            "category_icon": cat_icon,
            "title": b_title,
            "total_exams": len(current_bundle_exams),
            "boards_included": list(current_bundle_boards),
            "exams": current_bundle_exams
        })
        bundle_counter += 1

print(f"Successfully generated {len(bundles)} systematic bundles!")

total_exams_in_bundles = sum(b["total_exams"] for b in bundles)
print(f"Total exams bundled: {total_exams_in_bundles} (Must match 6493)")

# Save each bundle to its own individual JSON file
for b in bundles:
    bundle_file = os.path.join(BUNDLES_DIR, f"{b['bundle_id']}.json")
    with open(bundle_file, "w", encoding="utf-8") as f:
        json.dump(b, f, ensure_ascii=False, indent=2)

# Save Master Bundles Index
index_data = {
    "metadata": {
        "title": "सरकारी साथी — 50-60 परीक्षाओं के सिस्टमैटिक ऑडिट बंडल्स",
        "author": "हरिमोहन शर्मा",
        "helpline": "7852004401",
        "total_bundles": len(bundles),
        "total_exams": total_exams_in_bundles,
        "average_bundle_size": round(total_exams_in_bundles / len(bundles), 1),
        "target_batch_size": "50-70 exams per bundle"
    },
    "bundles": [
        {
            "bundle_id": b["bundle_id"],
            "bundle_num": b["bundle_num"],
            "category_id": b["category_id"],
            "category_name": b["category_name"],
            "category_icon": b["category_icon"],
            "title": b["title"],
            "total_exams": b["total_exams"],
            "boards_included": b["boards_included"],
            "sample_exams": [e["name"] for e in b["exams"][:3]]
        }
        for b in bundles
    ]
}

index_file = os.path.join(BUNDLES_DIR, "BUNDLES_INDEX.json")
with open(index_file, "w", encoding="utf-8") as f:
    json.dump(index_data, f, ensure_ascii=False, indent=2)

print(f"Saved BUNDLES_INDEX.json to {index_file}!")
