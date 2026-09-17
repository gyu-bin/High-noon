import AppKit

let root = "/Users/mungyubin/Desktop/Coding/High-noon"
let output = "\(root)/high_noon_terra_asset_pack/output_v3_cinematic_pixel/qa/npc_duel_validation/npc_duel_v3_validation_board.png"
let canvas = NSSize(width: 1560, height: 1840)
let cardWidth: CGFloat = 480
let cardHeight: CGFloat = 280
let columns: CGFloat = 3

struct Frame {
  let title: String
  let note: String
  let background: String
  let npc: String
  let pose: String
  let cue: String
  let vfx: String?
  let dark: CGFloat
  let weapon: String?
  let portrait: Bool
}

let frames: [Frame] = [
  .init(title: "01 · NPC 01 READY", note: "IDLE · FIRST-PERSON WEAPON IDLE", background: "bronze_day", npc: "01", pose: "idle", cue: "READY", vfx: nil, dark: 0, weapon: "idle", portrait: false),
  .init(title: "02 · NPC 01 STEADY", note: "DRAW · TENSION CUE", background: "bronze_day", npc: "01", pose: "draw", cue: "STEADY", vfx: nil, dark: 0, weapon: "idle", portrait: false),
  .init(title: "03 · NPC 01 BANG", note: "FIRE · ENGINE-ALIGNED CUE", background: "bronze_day", npc: "01", pose: "fire", cue: "BANG!", vfx: "muzzle", dark: 0, weapon: "idle", portrait: false),
  .init(title: "04 · PLAYER FIRE", note: "DRAW → FIRE · 40–70ms MUZZLE · SMOKE FADE", background: "bronze_day", npc: "01", pose: "fire", cue: "BANG!", vfx: "muzzle", dark: 0, weapon: "fire", portrait: false),
  .init(title: "05 · NPC HIT", note: "FAST IMPACT · NO BLOOD / GORE", background: "bronze_day", npc: "01", pose: "hit", cue: "", vfx: "impact", dark: 0, weapon: "fire", portrait: false),
  .init(title: "06 · NPC DOWN", note: "HIT → DOWN · GROUND-ALIGNED DUST", background: "bronze_day", npc: "01", pose: "down", cue: "", vfx: "dust", dark: 0, weapon: "idle", portrait: false),
  .init(title: "07 · THUNDERBOLT", note: "HIDDEN BANG · BRIEF LIGHTNING ONLY", background: "master_night", npc: "14", pose: "draw", cue: "···", vfx: "thunderbolt", dark: 0, weapon: nil, portrait: false),
  .init(title: "08 · SHADOW HUNTER", note: "BLIND BANG · READABLE SILHOUETTE", background: "master_night", npc: "15", pose: "draw", cue: "BANG!", vfx: nil, dark: 0.52, weapon: nil, portrait: false),
  .init(title: "09 · DRYDEN", note: "MASTER NIGHT FIXED · MEDIUM VISUAL SHAKE", background: "master_night", npc: "17", pose: "draw", cue: "STEADY", vfx: nil, dark: 0, weapon: "idle", portrait: false),
  .init(title: "10 · RED EYE", note: "HEAVY SHAKE · RESTRAINED OMEN FLASH", background: "legend_night", npc: "18", pose: "draw", cue: "", vfx: "red_eye", dark: 0, weapon: nil, portrait: false),
  .init(title: "11 · VOID WALKER", note: "VOID SHROUD · SHORT CRACK AT BANG", background: "legend_night", npc: "19", pose: "draw", cue: "", vfx: "void_crack", dark: 0.42, weapon: nil, portrait: false),
  .init(title: "12 · ECHO PHANTOM", note: "RUNTIME DUPLICATE · NO BAKED CLONE", background: "legend_night", npc: "20", pose: "draw", cue: "BANG!", vfx: "echo", dark: 0, weapon: nil, portrait: false),
  .init(title: "13 · PALE RIDER", note: "UNLOCKED ONLY · HIDDEN BACKGROUND · NEGATIVE SPACE", background: "hidden_pale_rider", npc: "22", pose: "idle", cue: "", vfx: nil, dark: 0.42, weapon: nil, portrait: false),
  .init(title: "14 · PORTRAIT LAYOUT", note: "CLEAR CENTER LANE · WEAPON LOWER RIGHT", background: "bronze_day", npc: "01", pose: "idle", cue: "READY", vfx: nil, dark: 0, weapon: "idle", portrait: true),
  .init(title: "15 · LANDSCAPE LAYOUT", note: "WIDER ENVIRONMENT · FIXED TAP SURFACE", background: "bronze_day", npc: "01", pose: "idle", cue: "READY", vfx: nil, dark: 0, weapon: "idle", portrait: false),
]

func image(_ path: String) -> NSImage? { NSImage(contentsOfFile: path) }
func bgPath(_ name: String) -> String { "\(root)/high_noon_terra_asset_pack/output_v3_cinematic_pixel/backgrounds/\(name).png" }
func npcPath(_ id: String, _ pose: String) -> String {
  id == "22" ? "\(root)/assets/images/hidden/pale_rider_\(pose).png" : "\(root)/assets/images/characters/enemy/\(id)/\(pose).png"
}
func weaponPath(_ pose: String) -> String { "\(root)/assets/images/weapons/player_fp/player_fp_revolver_\(pose).png" }
func vfxPath(_ name: String) -> String {
  let file = ["muzzle": "vfx_muzzle_flash", "impact": "vfx_bullet_impact", "dust": "vfx_fall_dust", "thunderbolt": "vfx_thunderbolt_lightning", "red_eye": "vfx_red_eye_flash", "void_crack": "vfx_void_crack"][name] ?? "vfx_gun_smoke"
  return "\(root)/assets/images/vfx/production/\(file).png"
}

func drawCover(_ image: NSImage, in rect: NSRect, opacity: CGFloat = 1) {
  let size = image.size
  let sourceRatio = size.width / size.height
  let targetRatio = rect.width / rect.height
  let source: NSRect
  if sourceRatio > targetRatio {
    let width = size.height * targetRatio
    source = NSRect(x: (size.width - width) / 2, y: 0, width: width, height: size.height)
  } else {
    let height = size.width / targetRatio
    source = NSRect(x: 0, y: (size.height - height) / 2, width: size.width, height: height)
  }
  image.draw(in: rect, from: source, operation: .sourceOver, fraction: opacity, respectFlipped: true, hints: nil)
}

func drawText(_ text: String, at point: NSPoint, font: NSFont, color: NSColor) {
  let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .kern: 1.0]
  text.draw(at: point, withAttributes: attrs)
}

let board = NSImage(size: canvas)
board.lockFocus()
NSColor(calibratedRed: 0.039, green: 0.039, blue: 0.039, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: canvas)).fill()
drawText("HIGH NOON · V3 NPC DUEL PRESENTATION VALIDATION", at: .init(x: 32, y: 1800), font: .boldSystemFont(ofSize: 20), color: NSColor(calibratedRed: 0.96, green: 0.90, blue: 0.78, alpha: 1))

for (index, frame) in frames.enumerated() {
  let col = CGFloat(index % 3)
  let row = CGFloat(index / 3)
  let x = 20 + col * 520
  let y = 1514 - row * 360
  let rect = NSRect(x: x, y: y, width: cardWidth, height: cardHeight)
  if let background = image(bgPath(frame.background)) { drawCover(background, in: rect) }
  if frame.portrait, let background = image(bgPath(frame.background)) {
    drawCover(background, in: NSRect(x: x + 150, y: y, width: 180, height: cardHeight))
  }
  if let npcImage = image(npcPath(frame.npc, frame.pose)) {
    let npcRect = NSRect(x: x + 148, y: y + 40, width: 185, height: 185)
    npcImage.draw(in: npcRect, from: .zero, operation: .sourceOver, fraction: frame.npc == "22" ? 0.7 : 1, respectFlipped: true, hints: nil)
    if frame.vfx == "echo" { npcImage.draw(in: npcRect.offsetBy(dx: -22, dy: 7), from: .zero, operation: .sourceOver, fraction: 0.25, respectFlipped: true, hints: nil) }
  }
  if let weapon = frame.weapon, let weaponImage = image(weaponPath(weapon)) {
    weaponImage.draw(in: NSRect(x: x + 315, y: y - 28, width: 200, height: 200), from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
  }
  if let vfx = frame.vfx, vfx != "echo", let vfxImage = image(vfxPath(vfx)) {
    let fxRect = vfx == "thunderbolt" ? rect.insetBy(dx: 55, dy: 8) : NSRect(x: x + 185, y: y + 72, width: 130, height: 130)
    vfxImage.draw(in: fxRect, from: .zero, operation: .sourceOver, fraction: 0.88, respectFlipped: true, hints: nil)
  }
  if frame.dark > 0 {
    NSColor(calibratedWhite: 0, alpha: frame.dark).setFill(); NSBezierPath(rect: rect).fill()
  }
  if !frame.cue.isEmpty {
    let cueColor = frame.cue == "BANG!" ? NSColor(calibratedRed: 0.94, green: 0.27, blue: 0.27, alpha: 1) : frame.cue == "STEADY" ? NSColor(calibratedRed: 0.78, green: 0.53, blue: 0.04, alpha: 1) : NSColor(calibratedRed: 0.96, green: 0.90, blue: 0.78, alpha: 1)
    let font = NSFont(name: "Rye-Regular", size: 42) ?? .boldSystemFont(ofSize: 42)
    let size = frame.cue.size(withAttributes: [.font: font])
    drawText(frame.cue, at: .init(x: x + (cardWidth - size.width) / 2, y: y + 124), font: font, color: cueColor)
  }
  NSColor(calibratedRed: 0.78, green: 0.53, blue: 0.04, alpha: 1).setStroke(); let border = NSBezierPath(roundedRect: rect, xRadius: 4, yRadius: 4); border.lineWidth = 2; border.stroke()
  drawText(frame.title, at: .init(x: x, y: y - 29), font: .boldSystemFont(ofSize: 18), color: NSColor(calibratedRed: 0.96, green: 0.90, blue: 0.78, alpha: 1))
  drawText(frame.note, at: .init(x: x, y: y - 49), font: .boldSystemFont(ofSize: 11), color: NSColor(calibratedRed: 1, green: 0.84, blue: 0, alpha: 1))
}
board.unlockFocus()

guard let tiff = board.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else { fatalError("Could not render validation board") }
try png.write(to: URL(fileURLWithPath: output))
print(output)
