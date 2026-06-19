"""
High Noon — 스프라이트 생성 파이프라인
======================================
1. --concept      컨셉 시트에서 HQ 4명 추출 (무료, 즉시)
2. --pollinations  Pollinations AI로 나머지 생성 (무료, API 키 불필요)

sprite-gen (tools/sprite-gen): 추출된 idle PNG → idle/attack atlas 후처리
  ./scripts/run_sprite_gen_atlas.sh player_01

결투 aim/shoot 포즈: scripts/duel_sprite_library.py (idle 기반 procedural)

사용법:
  python highnoon_sprite_generator.py --concept
  python highnoon_sprite_generator.py --pollinations
  python highnoon_sprite_generator.py --pollinations "황야의까마귀"
"""

import os
import re
import sys
import time
import requests
from pathlib import Path
from PIL import Image
from io import BytesIO

REFERENCE_IMAGE_PATH = "reference_sprite.png"
CONCEPT_SHEET_PATH = Path("assets/reference/high_noon_characters_sheet.png")
OUTPUT_DIR = Path("output/sprites")
ASSETS_NPC_DIR = Path("assets/sprites/npc")
ASSETS_PLAYER_DIR = Path("assets/sprites/player")
SPRITE_SIZE = 256
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 컨셉 시트에 이미 있는 캐릭터 (Pollinations 스킵)
CONCEPT_PLAYER_IDS = {1, 4}
CONCEPT_NPC_IDS = {3, 22}

CONCEPT_SHEET_SLOTS = [
    {"col": 0, "player_id": 1},
    {"col": 1, "player_id": 4},
    {"col": 2, "npc_id": 3},
    {"col": 3, "npc_id": 22},
]

POLLINATIONS_STYLE = (
    "detailed pixel art western gunslinger game character sprite, "
    "HIGH NOON dark western fantasy style, front-facing full body idle pose, "
    "rich pixel shading and color depth, crisp pixel edges, single character only, "
    "solid flat magenta background FF00FF, no text, no watermark, no scenery"
)


def load_env_file(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file()


def safe_filename(name: str) -> str:
    return re.sub(r"[^\w가-힣]+", "", name.replace(" ", ""))

BASE_PROMPT = (
    "pixel art western character sprite, front-facing, full body, "
    "idle pose, high quality pixel art, detailed shading, "
    "western cowboy style, game sprite, transparent background, "
    "64x64 pixel art style, {character_desc}"
)

NEGATIVE_PROMPT = (
    "blurry, low quality, realistic, 3d, photograph, "
    "text, watermark, signature, multiple characters, "
    "background scene, cropped, partial body"
)

NPC_DATA = [
    {
        "id": 1, "name": "먼지바람", "tier": "BRONZE",
        "desc": "worn brown cowboy hat, dusty brown vest, beige shirt, "
                "old leather holster, weathered look, warm brown tones"
    },
    {
        "id": 2, "name": "녹슨총구", "tier": "BRONZE",
        "desc": "dark brown cowboy hat, rusted dark outfit, greenish-tinted gun, "
                "worn leather, dark brown and rust color palette"
    },
    {
        "id": 3, "name": "황야의까마귀", "tier": "BRONZE", "boss": True,
        "desc": "black cowboy hat, dark brown and black outfit, sharp eyes, "
                "gold accent trim, menacing look, boss character, "
                "black feather decoration"
    },
    {
        "id": 4, "name": "사막의여우", "tier": "SILVER",
        "desc": "orange-brown hat, agile pose, orange and tan outfit, "
                "quick draw stance, fox-like sharp expression"
    },
    {
        "id": 5, "name": "철가면", "tier": "SILVER",
        "desc": "dark gray hat, silver metal mask covering lower face, "
                "gray armored outfit, silver and charcoal color palette"
    },
    {
        "id": 6, "name": "냉혈한레이첼", "tier": "SILVER", "boss": True,
        "desc": "female character, dark navy hat, cold expression, "
                "dark navy and charcoal outfit, silver badge, "
                "boss female gunslinger"
    },
    {
        "id": 7, "name": "독침선인장", "tier": "GOLD",
        "desc": "brown hat with cactus decoration, green accent clothing, "
                "brown and green outfit, cactus spike pattern on vest"
    },
    {
        "id": 8, "name": "쌍권총로렌조", "tier": "GOLD",
        "desc": "golden brown hat, holding two pistols, gold trim outfit, "
                "dual holsters, elaborate gold decorations, confident stance"
    },
    {
        "id": 9, "name": "황금해골", "tier": "GOLD", "boss": True,
        "desc": "dark hat with skull decoration, gold and dark brown outfit, "
                "gold skull emblem on chest, golden gun, boss character"
    },
    {
        "id": 10, "name": "강철독수리", "tier": "PLATINUM",
        "desc": "dark gray hat with eagle emblem, heavy armor plating on shoulders, "
                "dark charcoal armored outfit, sheriff star badge, "
                "eagle wing decoration, platinum and dark gray tones"
    },
    {
        "id": 11, "name": "침묵의기관차", "tier": "PLATINUM",
        "desc": "black wide-brim hat, massive bulky armored body, "
                "all-black heavy iron armor, intimidating large silhouette, "
                "no visible face, steam-punk iron plating"
    },
    {
        "id": 12, "name": "블랙아이언", "tier": "PLATINUM", "boss": True,
        "desc": "pitch black hat, full black iron armor, "
                "completely dark silhouette, silver trim on armor edges, "
                "boss heavy armor character, most imposing platinum"
    },
    {
        "id": 13, "name": "미러잭", "tier": "DIAMOND",
        "desc": "female character, red bandana headband, crimson red outfit, "
                "mirrored glass decoration, red and black color scheme, "
                "reflective accessories, agile female gunslinger"
    },
    {
        "id": 14, "name": "썬더볼트", "tier": "DIAMOND",
        "desc": "female character, red hat, crimson outfit with lightning bolt pattern, "
                "yellow lightning decorations, electric blue accent, "
                "dynamic energy pose"
    },
    {
        "id": 15, "name": "그림자사냥꾼", "tier": "DIAMOND", "boss": True,
        "desc": "female character, dark red wide hat, long dark red coat, "
                "shadow pattern outfit, dark crimson and black, "
                "boss female in long duster coat"
    },
    {
        "id": 16, "name": "베놈", "tier": "MASTER",
        "desc": "female character, dark red hat, crimson coat with poison green accents, "
                "green vial decoration, dark red and toxic green color scheme, "
                "sinister expression"
    },
    {
        "id": 17, "name": "Dryden", "tier": "MASTER", "boss": True,
        "desc": "female character, very dark crimson coat, black hat, "
                "night-themed outfit, dark red and charcoal black, "
                "multiple decorative fake-out charms, boss female gunslinger"
    },
    {
        "id": 18, "name": "레드아이", "tier": "MASTER", "boss": True,
        "desc": "female character, dark crimson long coat, glowing red eyes, "
                "red eye glow effect, darkest red outfit, "
                "boss character with supernatural red glowing eyes"
    },
    {
        "id": 19, "name": "보이드", "tier": "LEGEND",
        "desc": "dark purple hooded outfit, void purple aura, "
                "purple and black color scheme, otherworldly appearance, "
                "purple mystical energy around body"
    },
    {
        "id": 20, "name": "에코", "tier": "LEGEND",
        "desc": "black outfit with cyan echo effect, dark figure with "
                "ghostly cyan afterimage aura, black and cyan color scheme, "
                "echo/ghost visual effect"
    },
    {
        "id": 21, "name": "Undertaker", "tier": "LEGEND", "boss": True,
        "desc": "all black outfit, skull emblem on hat, dark undertaker aesthetic, "
                "deep black with orange-red accent trim, boss skull character, "
                "most ominous legend"
    },
    {
        "id": 22, "name": "The Pale Rider", "tier": "HIDDEN", "boss": True,
        "desc": "large black wide-brim hat with skull, purple-black long coat, "
                "glowing cyan eyes, supernatural aura, "
                "cyan mystical flames around hands, hidden boss character, "
                "most powerful and mysterious, skull face"
    },
]

PLAYER_DATA = [
    {
        "id": "p1", "name": "무명의총잡이",
        "desc": "classic brown cowboy, simple brown hat and vest, "
                "beginner cowboy look, warm brown tones, straightforward stance"
    },
    {
        "id": "p2", "name": "철의보안관",
        "desc": "dark gray sheriff, heavy iron armor on shoulders, "
                "sheriff star badge, dark armored lawman, "
                "gray and black tones with gold badge"
    },
    {
        "id": "p3", "name": "붉은로사",
        "desc": "female character, red bandana, crimson red outfit, "
                "midriff-showing vest, red pants, female gunslinger, "
                "vibrant red color scheme"
    },
    {
        "id": "p4", "name": "망령사수",
        "desc": "dark purple hooded figure, glowing cyan eyes, "
                "supernatural ghost gunslinger, purple-black outfit, "
                "cyan mystical energy, hidden character aesthetic"
    },
]


def trim_alpha(img: Image.Image, pad: int = 4) -> Image.Image:
    img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox is None:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def chroma_to_alpha(img: Image.Image, key=(255, 0, 255), tolerance: int = 72) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = abs(r - key[0]) + abs(g - key[1]) + abs(b - key[2])
            if dist < tolerance * 3:
                px[x, y] = (r, g, b, 0)
    return img


def multi_chroma_to_alpha(img: Image.Image) -> Image.Image:
    """마젠타·빨강 크로마 제거 (갈색/보라 키는 캐릭터 픽셀까지 지울 수 있어 rembg 폴백)."""
    out = chroma_to_alpha(img, (255, 0, 255), 96)
    return chroma_to_alpha(out, (255, 0, 0), 72)


def flood_remove_magenta(img: Image.Image, *, tol: int = 60) -> Image.Image:
    """가장자리 연결 마젠타만 제거 — 망토·검은 옷 rembg 오인 방지."""
    from collections import deque

    import numpy as np
    from scipy import ndimage

    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]

    def is_magenta(rgb: tuple[int, ...]) -> bool:
        r, g, b = rgb[:3]
        return r > 200 and b > 200 and g < tol

    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_magenta(tuple(a[y, x, :3])) and not bg[y, x]:
                bg[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_magenta(tuple(a[y, x, :3])) and not bg[y, x]:
                bg[y, x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny, nx] and is_magenta(tuple(a[ny, nx, :3])):
                bg[ny, nx] = True
                q.append((nx, ny))

    out = a.copy()
    out[bg, 3] = 0
    mask = out[:, :, 3] > 48
    if mask.any():
        filled = ndimage.binary_fill_holes(mask)
        ys, xs = np.where(mask)
        region = np.zeros_like(filled)
        region[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1] = True
        filled &= region
        hole = filled & (out[:, :, 3] < 48)
        for c, val in enumerate((120, 30, 40)):
            ch = out[:, :, c]
            ch[hole & (ch < 10)] = val
            out[:, :, c] = ch
        out[:, :, 3] = np.where(filled, np.maximum(out[:, :, 3], 255), out[:, :, 3])
    return Image.fromarray(out.astype(np.uint8))


def flood_remove_edge_background(img: Image.Image, *, tol: int = 48) -> Image.Image:
    """가장자리 대표색(마젠타·단색 배경)을 연결 제거."""
    from collections import deque

    import numpy as np

    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]
    samples = [
        a[0, 0, :3],
        a[0, w - 1, :3],
        a[h - 1, 0, :3],
        a[h - 1, w - 1, :3],
        a[0, w // 2, :3],
        a[h - 1, w // 2, :3],
    ]
    bg = np.median(np.stack(samples), axis=0).astype(np.int16)

    def matches(rgb: tuple[int, ...]) -> bool:
        r, g, b = (int(rgb[0]), int(rgb[1]), int(rgb[2]))
        return (
            abs(r - bg[0]) <= tol
            and abs(g - bg[1]) <= tol
            and abs(b - bg[2]) <= tol
        )

    mask = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if matches(tuple(a[y, x, :3])) and not mask[y, x]:
                mask[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if matches(tuple(a[y, x, :3])) and not mask[y, x]:
                mask[y, x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not mask[ny, nx] and matches(tuple(a[ny, nx, :3])):
                mask[ny, nx] = True
                q.append((nx, ny))

    out = a.copy()
    out[mask, 3] = 0
    return Image.fromarray(out.astype(np.uint8))


def _opaque_ratio(img: Image.Image) -> float:
    w, h = img.size
    px = img.load()
    return sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 48) / (w * h)


def _magenta_fraction_at_edges(img: Image.Image, *, tol: int = 60) -> float:
    import numpy as np

    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]

    def is_magenta(rgb: tuple[int, ...]) -> bool:
        r, g, b = rgb[:3]
        return r > 200 and b > 200 and g < tol

    edge_idx = []
    for x in range(w):
        edge_idx.append((0, x))
        edge_idx.append((h - 1, x))
    for y in range(h):
        edge_idx.append((y, 0))
        edge_idx.append((y, w - 1))
    hits = sum(1 for y, x in edge_idx if is_magenta(tuple(a[y, x, :3])))
    return hits / max(1, len(edge_idx))


def _median_corner_rgb(img: Image.Image) -> tuple[int, int, int]:
    import numpy as np

    a = np.array(img.convert("RGB"))
    h, w = a.shape[:2]
    samples = np.stack(
        [a[0, 0], a[0, w - 1], a[h - 1, 0], a[h - 1, w - 1], a[0, w // 2], a[h - 1, w // 2]],
        axis=0,
    )
    return tuple(int(v) for v in np.median(samples, axis=0))


def strip_magenta_pixels(img: Image.Image) -> Image.Image:
    """잔여 FF00FF 마젠타·핑크 크로마 키 제거 (캐릭터 보라/자주는 보존)."""
    import numpy as np

    a = np.array(img.convert("RGBA"))
    rgb = a[:, :, :3].astype(np.int16)
    strict = (rgb[:, :, 0] > 215) & (rgb[:, :, 1] < 90) & (rgb[:, :, 2] > 215)
    fringe = (
        (rgb[:, :, 0] > 185)
        & (rgb[:, :, 1] < 115)
        & (rgb[:, :, 2] > 185)
        & (a[:, :, 3] > 0)
        & (a[:, :, 3] < 250)
    )
    a[strict | fringe, 3] = 0
    return Image.fromarray(a.astype(np.uint8))


def remove_sprite_background(img: Image.Image) -> Image.Image:
    """마젠타 가장자리 → flood 제거. 단색 배경은 좁은 edge flood만 (의상 색 먹음 방지)."""
    if _magenta_fraction_at_edges(img) >= 0.35:
        out = flood_remove_magenta(img)
        if _opaque_ratio(out) < 0.58:
            return out

    out = flood_remove_edge_background(img, tol=22)
    if _opaque_ratio(out) < 0.58:
        return out

    bg = _median_corner_rgb(img)
    keyed = chroma_to_alpha(img, bg, tolerance=24)
    if _opaque_ratio(keyed) < 0.62:
        return strip_magenta_pixels(keyed)
    return strip_magenta_pixels(out)


def remove_background(img: Image.Image) -> Image.Image:
    """크로마 키 → 불투명 비율이 높으면 rembg로 배경 제거."""
    keyed = multi_chroma_to_alpha(img)
    w, h = keyed.size
    px = keyed.load()
    opaque_ratio = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 48) / (w * h)
    if opaque_ratio < 0.32:
        return keyed
    try:
        from rembg import remove

        out = remove(img.convert("RGB"))
        if isinstance(out, Image.Image):
            return out.convert("RGBA")
        return Image.open(BytesIO(out)).convert("RGBA")
    except Exception:
        return keyed


def fit_center_sprite(img: Image.Image, size: int = SPRITE_SIZE) -> Image.Image:
    img = trim_alpha(img)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if img.width == 0 or img.height == 0:
        return canvas
    scale = min(size / img.width, size / img.height) * 0.92
    nw = max(1, int(img.width * scale))
    nh = max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    ox = (size - nw) // 2
    oy = size - nh - int(size * 0.06)
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def extract_concept_characters() -> None:
    """컨셉 시트(HIGH NOON: CHARACTERS)에서 4명 HQ 추출."""
    if not CONCEPT_SHEET_PATH.exists():
        raise RuntimeError(f"컨셉 시트 없음: {CONCEPT_SHEET_PATH}")

    sheet = Image.open(CONCEPT_SHEET_PATH).convert("RGBA")
    w, h = sheet.size
    y0, y1 = 95, h - 8
    label_cut = int((y1 - y0) * 0.88)  # 하단 캡션(P1 — …) 제거
    y1 = y0 + label_cut
    cols = 4

    print(f"컨셉 시트 ({w}x{h})에서 추출...")
    for slot in CONCEPT_SHEET_SLOTS:
        col = slot["col"]
        rw = w // cols
        x0 = col * rw
        x1 = (col + 1) * rw if col < cols - 1 else w
        raw = sheet.crop((x0, y0, x1, y1))
        fitted = fit_center_sprite(raw)

        if "player_id" in slot:
            pid = slot["player_id"]
            name = next(p["name"] for p in PLAYER_DATA if int(str(p["id"]).lstrip("pP")) == pid)
            save_sprite(
                fitted,
                f"player_p{pid}_{name}.png",
                assets_idle_name=f"player_{pid:02d}_idle.png",
            )
        else:
            nid = slot["npc_id"]
            name = next(n["name"] for n in NPC_DATA if n["id"] == nid)
            save_sprite(
                fitted,
                f"npc_{nid:02d}_{safe_filename(name)}.png",
                assets_idle_name=f"npc_{nid:02d}_idle.png",
            )


def generate_sprite_pollinations(character: dict, seed: int | None = None) -> Image.Image | None:
    desc = character.get("desc", "")
    prompt = f"{POLLINATIONS_STYLE}, {desc}"
    url = "https://image.pollinations.ai/prompt/" + requests.utils.quote(prompt)
    params = {"width": 512, "height": 512, "nologo": "true"}
    if seed is not None:
        params["seed"] = seed

    name = character.get("name", "?")
    char_id = character.get("id", "?")
    print(f"\n[{char_id}] {name} — Pollinations 생성 중...")

    try:
        response = requests.get(url, params=params, timeout=120)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        img = remove_background(img)
        return fit_center_sprite(img)
    except Exception as e:
        print(f"  [오류] {e}")
        return None


def generate_all_sprites_pollinations(skip_concept: bool = True) -> None:
    print("=" * 50)
    print("High Noon 스프라이트 생성 (Pollinations — 무료)")
    print("=" * 50)

    if skip_concept and CONCEPT_SHEET_PATH.exists():
        print("\n--- 컨셉 시트 HQ 4명 ---")
        extract_concept_characters()

    print("\n--- 플레이어 (Pollinations) ---")
    for player in PLAYER_DATA:
        pid = int(str(player["id"]).lstrip("pP"))
        if skip_concept and pid in CONCEPT_PLAYER_IDS:
            print(f"  [스킵] player_{pid:02d} — 컨셉 시트")
            continue
        img = generate_sprite_pollinations(player, seed=1000 + pid)
        if img:
            save_sprite(
                img,
                f"player_{player['id']}_{player['name']}.png",
                assets_idle_name=f"player_{pid:02d}_idle.png",
            )
        time.sleep(3)

    print("\n--- NPC (Pollinations) ---")
    for npc in NPC_DATA:
        if skip_concept and npc["id"] in CONCEPT_NPC_IDS:
            print(f"  [스킵] npc_{npc['id']:02d} — 컨셉 시트")
            continue
        img = generate_sprite_pollinations(npc, seed=2000 + npc["id"])
        if img:
            save_sprite(
                img,
                f"npc_{npc['id']:02d}_{safe_filename(npc['name'])}.png",
                assets_idle_name=f"npc_{npc['id']:02d}_idle.png",
            )
        time.sleep(3)

    print("\n" + "=" * 50)
    print(f"완료! {OUTPUT_DIR.resolve()}")
    print("=" * 50)


def save_sprite(img: Image.Image, filename: str, *, assets_idle_name: str | None = None):
    img = fit_center_sprite(img.convert("RGBA"))
    path = OUTPUT_DIR / filename
    img.save(path, "PNG")
    print(f"  저장됨: {path}")

    if assets_idle_name:
        if assets_idle_name.startswith("npc_"):
            assets_path = ASSETS_NPC_DIR / assets_idle_name
        else:
            assets_path = ASSETS_PLAYER_DIR / assets_idle_name
        assets_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(assets_path, "PNG")
        print(f"  앱 에셋: {assets_path}")


def normalize_name(name: str) -> str:
    return re.sub(r"[\s_\-]+", "", name.lower())


NAME_ALIASES: dict[str, str] = {
    "palerider": "The Pale Rider",
    "thepalerider": "The Pale Rider",
    "황야의까마귀": "까마귀",
    "녹슨총구": "녹슨총구",
    "undertaker": "Undertaker",
    "레이첼": "냉혈한레이첼",
    "냉혈한": "냉혈한레이첼",
}


def find_character(char_name: str) -> dict | None:
    if char_name in NAME_ALIASES:
        char_name = NAME_ALIASES[char_name]

    all_chars = NPC_DATA + PLAYER_DATA
    exact = next((c for c in all_chars if c["name"] == char_name), None)
    if exact:
        return exact

    needle = normalize_name(char_name)
    for c in all_chars:
        if normalize_name(c["name"]) == needle:
            return c
    return None


def generate_single(char_name: str, *, backend: str = "pollinations"):
    target = find_character(char_name)
    if not target:
        print(f"캐릭터 '{char_name}' 를 찾을 수 없어요.")
        print("예: 황야의까마귀, 까마귀, Pale Rider, The Pale Rider")
        return

    img = generate_sprite_pollinations(target)

    if img:
        if "tier" in target:
            save_sprite(
                img,
                f"test_{safe_filename(target['name'])}.png",
                assets_idle_name=f"npc_{target['id']:02d}_idle.png",
            )
        else:
            pid = target["id"]
            num = pid[1:] if isinstance(pid, str) and pid.startswith("p") else pid
            save_sprite(
                img,
                f"test_{safe_filename(target['name'])}.png",
                assets_idle_name=f"player_{int(num):02d}_idle.png",
            )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("--concept", "-c"):
        extract_concept_characters()
    elif len(sys.argv) > 1 and sys.argv[1] in ("--pollinations", "--free", "-f"):
        name = sys.argv[2] if len(sys.argv) > 2 else None
        if name:
            generate_single(name)
        else:
            generate_all_sprites_pollinations()
    elif len(sys.argv) > 1 and sys.argv[1] in ("--local", "-l"):
        print("[deprecated] --local(SVG 도트)는 제거됐습니다.")
        print("  python highnoon_sprite_generator.py --concept")
        print("  python highnoon_sprite_generator.py --pollinations")
        sys.exit(1)
    elif len(sys.argv) > 1:
        generate_single(sys.argv[1])
    else:
        print("사용법:")
        print("  python highnoon_sprite_generator.py --concept")
        print("  python highnoon_sprite_generator.py --pollinations [캐릭터이름]")
        sys.exit(1)