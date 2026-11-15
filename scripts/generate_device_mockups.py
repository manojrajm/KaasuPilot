"""
generate_device_mockups.py
Generates Apple/Linear-grade dark titanium smartphone device mockups and a
flagship triple-device hero banner from KasuPilot screenshots.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "assets", "images", "Screenshots")
MOCKUPS_DIR = os.path.join(BASE_DIR, "assets", "images", "mockups")

os.makedirs(MOCKUPS_DIR, exist_ok=True)

MAPPINGS = {
    "SMS Inbox Page.png": "mockup_sms_radar.png",
    "Txn Page.png": "mockup_transactions.png",
    "Loanpage.png": "mockup_loans.png",
    "ExpenseTxn.png": "mockup_expense.png",
    "IncmeTxn.png": "mockup_income.png",
    "Profilepage.png": "mockup_profile.png",
}

def create_rounded_mask(size, radius):
    """Creates a smooth supersampled mask for rounded rectangles."""
    scale = 4
    w, h = size
    big_size = (w * scale, h * scale)
    mask = Image.new("L", big_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, big_size[0], big_size[1]], radius=radius * scale, fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)

def build_phone_mockup(screenshot_path, output_width=720):
    """Wraps a 1080x2392 screenshot in a high-fidelity titanium chassis with drop shadow."""
    raw_screen = Image.open(screenshot_path).convert("RGBA")
    sw, sh = raw_screen.size  # 1080, 2392

    # Screen corner rounding
    screen_radius = 52
    screen_mask = create_rounded_mask((sw, sh), screen_radius)
    screen_rounded = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    screen_rounded.paste(raw_screen, (0, 0), screen_mask)

    # Chassis dimensions
    bezel_h = 32  # left/right bezel
    bezel_v = 34  # top/bottom bezel
    phone_w = sw + bezel_h * 2  # 1144
    phone_h = sh + bezel_v * 2  # 2460
    phone_radius = 78

    # Create Phone Chassis
    phone = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    phone_mask = create_rounded_mask((phone_w, phone_h), phone_radius)

    # Titanium Chassis Gradient/Fill
    chassis_draw = ImageDraw.Draw(phone)
    # Outer frame
    chassis_draw.rounded_rectangle(
        [0, 0, phone_w - 1, phone_h - 1],
        radius=phone_radius,
        fill=(14, 18, 27, 255),  # Deep space titanium
        outline=(45, 58, 82, 255),  # Chamfered metallic rim
        width=3,
    )

    # Subtle inner metallic rim
    chassis_draw.rounded_rectangle(
        [bezel_h - 4, bezel_v - 4, phone_w - bezel_h + 3, phone_h - bezel_v + 3],
        radius=screen_radius + 4,
        outline=(25, 33, 46, 255),
        width=2,
    )

    # Paste rounded screen
    phone.paste(screen_rounded, (bezel_h, bezel_v), screen_mask)

    # Camera Punch Hole / Dynamic Island
    punch_w = 40
    punch_h = 40
    punch_x = (phone_w - punch_w) // 2
    punch_y = bezel_v + 18
    punch_draw = ImageDraw.Draw(phone)
    punch_draw.ellipse(
        [punch_x, punch_y, punch_x + punch_w, punch_y + punch_h],
        fill=(5, 7, 12, 255),
        outline=(22, 28, 40, 255),
        width=2,
    )
    # Tiny camera lens specular reflection
    punch_draw.ellipse(
        [punch_x + 12, punch_y + 10, punch_x + 18, punch_y + 16],
        fill=(30, 45, 70, 180),
    )

    # Subtle Speaker grill at top
    speaker_w = 120
    speaker_h = 6
    speaker_x = (phone_w - speaker_w) // 2
    speaker_y = bezel_v // 2 - 2
    punch_draw.rounded_rectangle(
        [speaker_x, speaker_y, speaker_x + speaker_w, speaker_y + speaker_h],
        radius=3,
        fill=(20, 26, 38, 255),
    )

    # Now create shadow canvas
    pad_shadow = 120
    canvas_w = phone_w + pad_shadow * 2
    canvas_h = phone_h + pad_shadow * 2

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    # Ambient drop shadow
    shadow_mask = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_mask)
    # Lower offset for 3D elevation
    sdraw.rounded_rectangle(
        [
            pad_shadow - 6,
            pad_shadow + 28,
            pad_shadow + phone_w + 6,
            pad_shadow + phone_h + 38,
        ],
        radius=phone_radius + 4,
        fill=(0, 0, 0, 175),
    )
    shadow_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=36))

    # Composite shadow and phone
    canvas.paste(shadow_blurred, (0, 0), shadow_blurred)
    canvas.paste(phone, (pad_shadow, pad_shadow), phone)

    # Resize to target output width for crisp web rendering
    aspect = canvas_h / canvas_w
    out_h = int(output_width * aspect)
    result = canvas.resize((output_width, out_h), Image.Resampling.LANCZOS)
    return result

def create_triple_hero_banner():
    """Composites a stunning triple-device hero showcase banner."""
    print("Creating Triple-Device Hero Banner...")

    banner_w = 2000
    banner_h = 1120

    # Studio background
    banner = Image.new("RGBA", (banner_w, banner_h), (7, 9, 14, 255))
    draw = ImageDraw.Draw(banner)

    # Background Radial Glows
    glow_cyan = Image.new("RGBA", (banner_w, banner_h), (0, 0, 0, 0))
    gdraw_c = ImageDraw.Draw(glow_cyan)
    gdraw_c.ellipse(
        [banner_w // 2 - 450, banner_h // 2 - 350, banner_w // 2 + 450, banner_h // 2 + 350],
        fill=(0, 240, 255, 38),
    )
    glow_cyan = glow_cyan.filter(ImageFilter.GaussianBlur(radius=140))
    banner.paste(glow_cyan, (0, 0), glow_cyan)

    glow_green = Image.new("RGBA", (banner_w, banner_h), (0, 0, 0, 0))
    gdraw_g = ImageDraw.Draw(glow_green)
    gdraw_g.ellipse(
        [banner_w // 2 - 300, banner_h // 2 - 200, banner_w // 2 + 300, banner_h // 2 + 400],
        fill=(0, 230, 118, 30),
    )
    glow_green = glow_green.filter(ImageFilter.GaussianBlur(radius=120))
    banner.paste(glow_green, (0, 0), glow_green)

    # Load the 3 phones
    phone_center = Image.open(os.path.join(MOCKUPS_DIR, "mockup_transactions.png"))
    phone_left = Image.open(os.path.join(MOCKUPS_DIR, "mockup_loans.png"))
    phone_right = Image.open(os.path.join(MOCKUPS_DIR, "mockup_sms_radar.png"))

    # Scale side phones slightly smaller (0.86)
    side_w = int(phone_left.width * 0.85)
    side_h = int(phone_left.height * 0.85)
    p_left_scaled = phone_left.resize((side_w, side_h), Image.Resampling.LANCZOS)
    p_right_scaled = phone_right.resize((side_w, side_h), Image.Resampling.LANCZOS)

    # Center phone scaling (0.96 for fit)
    center_w = int(phone_center.width * 0.94)
    center_h = int(phone_center.height * 0.94)
    p_center_scaled = phone_center.resize((center_w, center_h), Image.Resampling.LANCZOS)

    # Positions
    center_x = (banner_w - center_w) // 2
    center_y = (banner_h - center_h) // 2 + 20

    left_x = center_x - int(side_w * 0.72)
    left_y = center_y + 40

    right_x = center_x + center_w - int(side_w * 0.28)
    right_y = center_y + 40

    # Paste Left Phone (Behind)
    banner.paste(p_left_scaled, (left_x, left_y), p_left_scaled)

    # Paste Right Phone (Behind)
    banner.paste(p_right_scaled, (right_x, right_y), p_right_scaled)

    # Paste Center Phone (Elevated in front)
    banner.paste(p_center_scaled, (center_x, center_y), p_center_scaled)

    hero_path = os.path.join(MOCKUPS_DIR, "hero_mockup_showcase.png")
    banner.save(hero_path, "PNG", optimize=True)
    print(f"Hero banner saved: {hero_path}")

def main():
    print(f"Reading screenshots from: {SCREENSHOTS_DIR}")
    for raw_name, out_name in MAPPINGS.items():
        src_path = os.path.join(SCREENSHOTS_DIR, raw_name)
        if not os.path.exists(src_path):
            print(f"Warning: {src_path} not found, skipping.")
            continue
        dest_path = os.path.join(MOCKUPS_DIR, out_name)
        print(f"Generating mockup: {raw_name} -> {out_name}...")
        mockup = build_phone_mockup(src_path, output_width=620)
        mockup.save(dest_path, "PNG", optimize=True)
        print(f"Saved: {dest_path}")

    create_triple_hero_banner()
    print("All mockups generated successfully!")

if __name__ == "__main__":
    main()
