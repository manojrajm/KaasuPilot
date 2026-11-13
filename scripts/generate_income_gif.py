import math
import os
from PIL import Image, ImageDraw, ImageFont

def generate_income_reaction_gif(output_path, num_frames=32):
    width, height = 320, 320
    frames = []

    # Palette
    bg_color = (13, 17, 26)            # Dark obsidian cockpit #0D111A
    atm_housing = (22, 28, 40)          # Titanium casing
    atm_bezel = (38, 46, 64)            # Metallic bezel
    laser_color = (0, 230, 118)         # Emerald laser #00E676
    gold_sparkle = (255, 215, 0)        # 24K Gold sparkle
    note_base = (76, 175, 140)          # Crisp Indian ₹500 Teal Green tone
    note_border = (45, 130, 100)
    note_text = (225, 255, 240)
    note_detail = (60, 155, 120)

    try:
        font_large = ImageFont.truetype("arialbd.ttf", 15)
        font_med = ImageFont.truetype("arialbd.ttf", 12)
        font_small = ImageFont.truetype("arial.ttf", 9)
        font_mono = ImageFont.truetype("consola.ttf", 13)
    except:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_mono = ImageFont.load_default()

    for i in range(num_frames):
        t = i / num_frames # 0.0 to 1.0
        im = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(im)

        # 1. Subtle radial background glow from center
        glow_rad = 120 + int(10 * math.sin(t * 2 * math.pi))
        draw.ellipse(
            [width//2 - glow_rad, height//2 - glow_rad + 20, width//2 + glow_rad, height//2 + glow_rad + 20],
            fill=(16, 32, 38)
        )

        # 2. ATM Machine Top Housing
        draw.rounded_rectangle([20, 15, width - 20, 105], radius=14, fill=atm_housing, outline=atm_bezel, width=2)
        # Gold top rim
        draw.line([30, 15, width - 30, 15], fill=(255, 215, 0), width=2)

        # Cyber Title
        draw.text((32, 24), "⚡ KASU ATM DISPENSER // VAULT DEPOSIT", fill=(142, 155, 176), font=font_small)

        # Digital LED Counting Display
        draw.rounded_rectangle([32, 42, width - 32, 85], radius=8, fill=(7, 12, 18), outline=(0, 230, 118, 120), width=1)
        
        # Rapidly incrementing counter readout
        count_amount = 12500 + int(t * 37500)
        formatted_count = f"+ ₹ {count_amount:,}  DISPENSED"
        draw.text((44, 52), formatted_count, fill=(0, 230, 118), font=font_mono)
        
        # Status blinking dot
        blink = (math.sin(t * 4 * math.pi) > 0)
        dot_color = (0, 230, 118) if blink else (0, 100, 50)
        draw.ellipse([width - 55, 58, width - 45, 68], fill=dot_color)
        draw.text((width - 85, 58), "ACTIVE", fill=(100, 120, 140), font=font_small)

        # 3. ATM Cash Slot Mechanism
        slot_y = 96
        draw.rectangle([45, slot_y, width - 45, slot_y + 12], fill=(8, 10, 15), outline=(50, 60, 80), width=1)
        # Slot roller teeth
        for rx in range(55, width - 50, 16):
            draw.rectangle([rx, slot_y + 1, rx + 8, slot_y + 11], fill=(28, 35, 48))

        # 4. Notes Dispensing Stack & Motion
        # Accumulated stack at bottom
        stack_top_y = 230
        for s in range(5):
            sy = stack_top_y + (4 - s) * 5
            sx_offset = (s % 2) * 4 - 2
            draw.rounded_rectangle([55 + sx_offset, sy, width - 55 + sx_offset, sy + 38], radius=6, fill=(55, 135, 105), outline=(35, 95, 75), width=1)
            draw.text((70 + sx_offset, sy + 8), "₹ 500", fill=(180, 240, 210), font=font_small)
            draw.text((width - 110 + sx_offset, sy + 8), "RESERVE BANK", fill=(180, 240, 210), font=font_small)

        # Active Ejecting Banknote (animating from slot_y downward to stack)
        note_progress = (t * 2.5) % 1.0 # rapid ejecting cycle
        active_y = slot_y + int(note_progress * (stack_top_y - slot_y))
        
        # 3D Tilt effect
        tilt = int(3 * math.sin(t * 4 * math.pi))
        n_left = 50 + tilt
        n_right = width - 50 - tilt
        n_top = active_y
        n_bottom = active_y + 44

        # Active note drop shadow
        draw.rounded_rectangle([n_left + 2, n_top + 4, n_right + 2, n_bottom + 4], radius=6, fill=(5, 8, 12))
        # Active note body
        draw.rounded_rectangle([n_left, n_top, n_right, n_bottom], radius=6, fill=note_base, outline=note_border, width=2)
        
        # Banknote intricate details:
        # Watermark circle
        draw.ellipse([n_left + 14, n_top + 8, n_left + 42, n_top + 36], outline=note_detail, width=1)
        draw.ellipse([n_left + 20, n_top + 14, n_left + 36, n_top + 30], fill=(85, 185, 150))
        # Central Gandhi / Security Strip
        draw.line([n_left + 65, n_top + 2, n_left + 65, n_bottom - 2], fill=(30, 90, 70), width=2)
        # Denomination Typography
        draw.text((n_left + 78, n_top + 6), "₹ 500", fill=note_text, font=font_large)
        draw.text((n_left + 78, n_top + 24), "BHARAT • INDIA", fill=note_text, font=font_small)
        # Micro Serial & Ashoka Pillar placeholder
        draw.text((n_right - 65, n_top + 6), "500", fill=note_text, font=font_med)
        draw.rounded_rectangle([n_right - 35, n_top + 8, n_right - 12, n_top + 36], radius=3, outline=note_detail, width=1)

        # 5. Laser Telemetry Scanner Line
        laser_y = active_y + 20
        # Laser glow strip
        draw.line([30, laser_y, width - 30, laser_y], fill=laser_color, width=3)
        draw.line([25, laser_y, width - 25, laser_y], fill=(120, 255, 180), width=1)
        
        # Laser emitter heads on sides
        draw.polygon([(24, laser_y - 5), (32, laser_y), (24, laser_y + 5)], fill=(0, 230, 118))
        draw.polygon([(width - 24, laser_y - 5), (width - 32, laser_y), (width - 24, laser_y + 5)], fill=(0, 230, 118))

        # 6. Golden Particle Sparkles flying upwards
        for sp in range(7):
            phase = (t + sp * 0.15) % 1.0
            sp_x = 40 + int(((sp * 43) % (width - 80)))
            sp_y = int(280 - phase * 180)
            sp_size = int(3 + 2 * math.sin(phase * math.pi))
            if sp_size > 0:
                draw.ellipse([sp_x - sp_size, sp_y - sp_size, sp_x + sp_size, sp_y + sp_size], fill=gold_sparkle)

        # 7. Holographic Bottom Verification Seal
        draw.rounded_rectangle([48, 282, width - 48, 308], radius=8, fill=(18, 24, 36), outline=(255, 215, 0, 180), width=1)
        draw.text((58, 289), "✓ HIGH-SPEED COUNT VERIFIED • 100% SECURE", fill=(255, 215, 0), font=font_small)

        frames.append(im)

    # Save animated GIF
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=65, # ~15.4 fps
        loop=0,
        optimize=True
    )
    print(f"Successfully generated custom ATM Cash Inflow GIF at {output_path}")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "images", "reactions")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "happy-income.gif")
    generate_income_reaction_gif(out_file, num_frames=32)
