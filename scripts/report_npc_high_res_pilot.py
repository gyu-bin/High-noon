#!/usr/bin/env python3
"""Compose the three-NPC high-resolution pilot review deliverables."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "artifacts/npc-high-res-pilot"
FONT = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 30)


def side_by_side(left: Path, right: Path, labels: tuple[str, str], output: Path) -> None:
    images = [Image.open(left).convert("RGB"), Image.open(right).convert("RGB")]
    assert images[0].size == images[1].size == (1206, 2622)
    canvas = Image.new("RGB", (2412, 2686), "#24160f")
    draw = ImageDraw.Draw(canvas)
    for index, (image, label) in enumerate(zip(images, labels)):
        x = index * 1206
        canvas.paste(image, (x, 64))
        draw.text((x + 24, 14), label, font=FONT, fill="#ead3a8")
    canvas.save(output)


def main() -> None:
    side_by_side(
        QA / "device-npc07-current256.png",
        QA / "device-npc07-highres.png",
        ("NPC 07 · CURRENT / effective 256px", "NPC 07 · HIGH-RES / native 1254px"),
        QA / "device-npc07-current-vs-highres.png",
    )
    side_by_side(
        ROOT / "artifacts/npc-final-scale/final-C-npc12.png",
        QA / "device-npc12-highres.png",
        ("NPC 12 · CURRENT / effective 256px", "NPC 12 · HIGH-RES / native 1254px"),
        QA / "device-npc12-current-vs-highres.png",
    )
    side_by_side(
        ROOT / "artifacts/npc-final-scale/final-D-npc15.png",
        QA / "device-npc15-highres.png",
        ("NPC 15 · CURRENT / effective 256px", "NPC 15 · HIGH-RES / native 1254px"),
        QA / "device-npc15-current-vs-highres.png",
    )
    side_by_side(
        QA / "device-character-select-player01.png",
        QA / "device-npc07-highres.png",
        ("CHARACTER SELECT · PLAYER 01 / 1254px", "NPC SELECT · NPC 07 / 1254px"),
        QA / "device-player-vs-highres-npc.png",
    )

    sources = json.loads((QA / "source-audit.json").read_text())
    pilot = json.loads((QA / "pilot-manifest.json").read_text())
    pilot["deviceQualityGate"] = "PASS"
    pilot["qualityCompare"] = "PASS — similar apparent sharpness to the 1254px Player benchmark"
    pilot["layout"] = {
        "characterScaleVsPrevious": 1.50,
        "posterWidthScaleVsPrevious": 1.0676,
        "posterHeightScaleVsPrevious": 1.0980,
        "result": "PASS — full body, weapon and coat visible; no clipping; background remains visible",
    }
    pilot["performance"] = "Only the focused NPC Image is rendered; arrows do not decode previous/next portraits"
    pilot["batch22Executed"] = False
    (QA / "pilot-manifest.json").write_text(json.dumps(pilot, ensure_ascii=False, indent=2) + "\n")

    rows = [
        f'| {item["id"]:02} | {item["name"]} | `{item["currentRuntimeSource"]}` | 256×256 | `{item["highResSource"]}` | 1254×1254 | {item["matchConfidence"]} |'
        for item in sources
    ]
    report = """# NPC High-Resolution Poster Source Migration — 3-NPC Pilot

대표 3명 검증 결과는 **QUALITY_COMPARE=PASS**다. 요청한 STOP 조건에 따라 NPC 07, 12, 15만 런타임에 연결했으며 나머지 19명은 기존 승인 포스터를 유지한다. 22명 일괄 제작은 실행하지 않았다.

```text
PILOT_NPCS=07,12,15
SOURCE_RESOLUTION=1254×1254 native
POSTER_RESOLUTION=1254×1254 native
UPSCALE_256=NO
ALPHA_CHANGED_PIXELS=0
UNSELECTED_VISIBLE_PIXEL_CHANGES=0
QUALITY_COMPARE=PASS
BATCH_22_EXECUTED=NO
STATUS=AWAITING HUMAN APPROVAL
```

## High-resolution source audit

22명 모두 `assets/images/characters/clarity/npc/XX/idle.png`에 1254×1254 원본이 있다. 네 장의 전신 비교표를 직접 검수했으며, hat, face/mask, coat/poncho, build, weapon, accessories, silhouette, palette가 현재 승인 identity와 일치한다.

| ID | 이름 | 기존 승인 source | 해상도 | high-res source | 해상도 | 일치 신뢰도 |
|---:|---|---|---:|---|---:|---|
""" + "\n".join(rows) + """

검수표: [01–06](../artifacts/npc-high-res-pilot/identity-audit-1.png), [07–12](../artifacts/npc-high-res-pilot/identity-audit-2.png), [13–18](../artifacts/npc-high-res-pilot/identity-audit-3.png), [19–22](../artifacts/npc-high-res-pilot/identity-audit-4.png).

## Pilot asset pipeline

각 후보는 1254×1254 clarity idle 원본에서 직접 만들었다. 256px 파일을 입력으로 사용하거나 확대하지 않았다. native 크기를 유지하며 외부 red/orange rim C mask만 주변의 원래 dark material RGB로 교체했다. AI, blur, sharpening, resampling, quantization, 색상 재설계는 사용하지 않았다.

- NPC 07: 외곽 rim 6,307픽셀 교체
- NPC 12: 외곽 rim 995픽셀 교체
- NPC 15: 외곽 rim 8,386픽셀 교체
- 세 파일 모두 alpha 변경 0, 선택 영역 밖 보이는 RGB 변경 0, 미처리 후보 0
- 투명 픽셀 아래 숨은 RGB만 0으로 정리했다. 보이는 픽셀과 alpha에는 영향이 없다.
- NPC 07/12 alpha detector PASS. NPC 15는 특수 캐릭터 보호 규칙상 자동 PASS 대상이 아니므로, 승인된 intentional transparency를 byte-for-byte 보존하고 실제 parchment/dark 합성으로 검수했다.

비교: [현재 256 / high-res source / clean poster — parchment](../artifacts/npc-high-res-pilot/pilot-current-source-clean-parchment.png), [dark background](../artifacts/npc-high-res-pilot/pilot-current-source-clean-dark.png). 상세 수치는 [pilot manifest](../artifacts/npc-high-res-pilot/pilot-manifest.json)에 기록했다.

## iPhone 17 Pro actual app comparison

아래 비교는 모두 iPhone 17 Pro 시뮬레이터의 1206×2622 실제 앱 캡처다. 좌우 화면을 resize하지 않고 같은 크기로 배치했다.

### NPC 07 · current 256 vs high-res 1254

![NPC 07 current vs high-res](../artifacts/npc-high-res-pilot/device-npc07-current-vs-highres.png)

### NPC 12 · current 256 vs high-res 1254

![NPC 12 current vs high-res](../artifacts/npc-high-res-pilot/device-npc12-current-vs-highres.png)

### NPC 15 · current 256 vs high-res 1254

![NPC 15 current vs high-res](../artifacts/npc-high-res-pilot/device-npc15-current-vs-highres.png)

### Character Select Player vs high-res NPC Select

![Player vs high-res NPC](../artifacts/npc-high-res-pilot/device-player-vs-highres-npc.png)

Player와 NPC 모두 1254×1254 source를 사용한다. 실제 화면에서 모자/머리, 의상 주름, 장갑·홀스터, 부츠, 외곽선의 apparent sharpness가 유사하며 NPC에 256px pixel-cluster 확대가 남지 않는다.

## Layout and performance

고해상도 적용 후에도 캐릭터 크기는 이전 대비 1.50×, 포스터는 폭 1.0676×·높이 1.0980×를 유지했다. 세 체형 모두 full body/weapon/coat가 보이고 clipping이 없으며 배경의 sunset과 town silhouette도 읽힌다.

NPC Select는 현재 선택된 NPC의 `Image` 하나만 렌더한다. 이전/다음은 화살표만 표시하므로 22개의 1254px PNG를 동시에 decode/render하지 않는다. carousel translate animation은 유지된다.

Duel registry와 five-pose assets, NPC data/reaction/AI, unlock/DEV, READY/STEADY/BANG, audio/VFX, routing, ranking, progress는 변경하지 않았다. TypeScript, 변경 파일 ESLint, diff whitespace 검사는 통과했다.

## Stop

대표 3명의 human-quality validation까지만 완료했다. 현재 런타임도 07/12/15만 pilot asset을 사용한다. 나머지 19명 batch production은 사람 승인 후 진행한다.
"""
    report = report.replace("../artifacts/npc-high-res-pilot/", f"{QA}/")
    (ROOT / "docs/NPC_HIGH_RES_POSTER_PILOT.md").write_text(report)
    (QA / "README.md").write_text(report)


if __name__ == "__main__":
    main()
