"""
High Noon — 스프라이트 생성 파이프라인
======================================
1. --concept      컨셉 시트에서 HQ 4명 추출 (무료, 즉시)
2. --pollinations  Pollinations AI로 나머지 생성 (무료, API 키 불필요)
3. (기본)         Replicate SDXL img2img — 크레딧 필요

sprite-gen (tools/sprite-gen): 추출된 idle PNG → idle/attack atlas 후처리
  ./scripts/run_sprite_gen_atlas.sh player_01

사용법:
  python highnoon_sprite_generator.py --concept
  python highnoon_sprite_generator.py --pollinations
  python highnoon_sprite_generator.py --pollinations "황야의까마귀"
"""

import os
import re
import sys
import time
import base64
import requests
import replicate
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

# 컨셉 시트에 이미 있는 캐릭터 (Pollinations/Replicate 스킵)
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


def get_replicate_client() -> replicate.Client:
    token = os.environ.get("REPLICATE_API_TOKEN", "").strip()
    if not token or token == "YOUR_TOKEN_HERE":
        raise RuntimeError(
            "REPLICATE_API_TOKEN이 없습니다.\n"
            "  export REPLICATE_API_TOKEN=r8_xxx\n"
            "  또는 프로젝트 루트에 .env 파일을 만드세요."
        )
    return replicate.Client(api_token=token)


REPLICATE_CLIENT = None


def replicate_client() -> replicate.Client:
    global REPLICATE_CLIENT
    if REPLICATE_CLIENT is None:
        REPLICATE_CLIENT = get_replicate_client()
    return REPLICATE_CLIENT


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
    """마젠타 크로마만 제거 (갈색/보라 키는 캐릭터 픽셀까지 지움)."""
    return chroma_to_alpha(img, (255, 0, 255), 96)


def remove_background(img: Image.Image) -> Image.Image:
    """크로마 다중 키 → rembg 순으로 배경 제거."""
    keyed = multi_chroma_to_alpha(img)
    w, h = keyed.size
    px = keyed.load()
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    if all(px[c][3] < 32 for c in corners):
        return keyed
    try:
        from rembg import remove

        out = remove(img.convert("RGB"))
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


def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def generate_sprite(
    character: dict,
    reference_image_b64: str,
    strength: float = 0.65,
) -> Image.Image | None:
    name = character.get("name", "unknown")
    char_id = character.get("id", "?")
    desc = character.get("desc", "")
    tier = character.get("tier", "")
    is_boss = character.get("boss", False)

    prompt = BASE_PROMPT.format(character_desc=desc)
    if is_boss:
        prompt += ", boss character, extra detailed, more imposing"

    print(f"\n[{char_id}] {name} ({tier}) 생성 중...")
    print(f"  프롬프트: {prompt[:80]}...")

    try:
        output = replicate_client().run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            input={
                "prompt": prompt,
                "negative_prompt": NEGATIVE_PROMPT,
                "image": f"data:image/jpeg;base64,{reference_image_b64}",
                "strength": strength,
                "num_inference_steps": 40,
                "guidance_scale": 8.5,
                "width": 512,
                "height": 512,
                "scheduler": "K_EULER_ANCESTRAL",
            }
        )

        if output and len(output) > 0:
            image_url = output[0]
            response = requests.get(image_url, timeout=30)
            img = Image.open(BytesIO(response.content))
            return img
        else:
            print(f"  [오류] 출력 없음")
            return None

    except Exception as e:
        print(f"  [오류] {e}")
        return None


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


def generate_all_sprites(reference_path: str):
    print("=" * 50)
    print("High Noon 스프라이트 생성 시작")
    print("=" * 50)

    replicate_client()

    if not os.path.exists(reference_path):
        print(f"[오류] 레퍼런스 이미지 없음: {reference_path}")
        print("reference_sprite.png 파일을 같은 폴더에 넣어주세요.")
        return

    ref_b64 = image_to_base64(reference_path)
    print(f"레퍼런스 이미지 로드 완료: {reference_path}")

    print("\n--- 플레이어 캐릭터 4명 ---")
    for player in PLAYER_DATA:
        img = generate_sprite(player, ref_b64, strength=0.6)
        if img:
            player_num = int(str(player["id"]).lstrip("pP"))
            save_sprite(
                img,
                f"player_{player['id']}_{player['name']}.png",
                assets_idle_name=f"player_{player_num:02d}_idle.png",
            )
        time.sleep(2)

    print("\n--- NPC 22명 ---")
    for npc in NPC_DATA:
        tier_strength = {
            "BRONZE": 0.65,
            "SILVER": 0.65,
            "GOLD": 0.68,
            "PLATINUM": 0.70,
            "DIAMOND": 0.72,
            "MASTER": 0.74,
            "LEGEND": 0.76,
            "HIDDEN": 0.78,
        }.get(npc["tier"], 0.65)

        img = generate_sprite(npc, ref_b64, strength=tier_strength)
        if img:
            filename = f"npc_{npc['id']:02d}_{safe_filename(npc['name'])}.png"
            save_sprite(
                img,
                filename,
                assets_idle_name=f"npc_{npc['id']:02d}_idle.png",
            )
        time.sleep(2)

    print("\n" + "=" * 50)
    print(f"완료! 스프라이트 저장 위치: {OUTPUT_DIR.resolve()}")
    print("=" * 50)


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


def generate_single(char_name: str, reference_path: str, *, backend: str = "replicate"):
    target = find_character(char_name)
    if not target:
        print(f"캐릭터 '{char_name}' 를 찾을 수 없어요.")
        print("예: 황야의까마귀, 까마귀, Pale Rider, The Pale Rider")
        return

    if backend == "pollinations":
        img = generate_sprite_pollinations(target)
    else:
        ref_b64 = image_to_base64(reference_path)
        img = generate_sprite(target, ref_b64)

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
            generate_single(name, REFERENCE_IMAGE_PATH, backend="pollinations")
        else:
            generate_all_sprites_pollinations()
    elif len(sys.argv) > 1 and sys.argv[1] in ("--local", "-l"):
        print("[deprecated] --local(SVG 도트)는 제거됐습니다.")
        print("  python highnoon_sprite_generator.py --concept")
        print("  python highnoon_sprite_generator.py --pollinations")
        sys.exit(1)
    elif len(sys.argv) > 1:
        generate_single(sys.argv[1], REFERENCE_IMAGE_PATH)
    else:
        generate_all_sprites(REFERENCE_IMAGE_PATH)