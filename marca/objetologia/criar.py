from pathlib import Path
import math
import subprocess

ROOT = Path(__file__).resolve().parent
DEFS = '''<defs>
 <radialGradient id="bg" cx="45%" cy="38%" r="72%"><stop stop-color="#1f2c5c"/><stop offset=".55" stop-color="#141d42"/><stop offset="1" stop-color="#0b112a"/></radialGradient>
 <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".28"/></filter>
</defs>'''

def base(y=665):
    return f'''<g><rect x="451" y="{y}" width="178" height="122" rx="27" fill="#8f9ab5"/>
<path d="M478 {y+14}h125v90H478z" fill="#c9d1e3"/>
<path d="M462 {y+32}l156 -12m-156 48l156 -12m-156 48l156 -12" stroke="#5b6688" stroke-width="13" stroke-linecap="round"/>
<path d="M495 {y+122}h90v12a27 27 0 0 1 -27 27h-36a27 27 0 0 1 -27 -27z" fill="#8f9ab5"/></g>'''

GLASS = '''<path d="M451 670v-31c0-62-102-97-102-228a191 191 0 1 1 382 0c0 131-102 166-102 228v31z" fill="#f5b82e"/>
<path d="M540 220a191 191 0 0 1 191 191c0 131-102 166-102 228v31h-34v-38c0-79 94-109 94-221 0-93-63-166-149-191z" fill="#d99a20"/>
<path d="M393 412c0-72 43-126 100-143" fill="none" stroke="#fff0b8" stroke-width="25" stroke-linecap="round"/>'''
FILAMENT = '''<path d="M508 663v-112l-51-66q-13-20 6-26 12-3 25 15l26 36 26-39 26 39 26-36q13-18 25-15 19 6 6 26l-51 66v112" fill="none" stroke="#94601c" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>'''
RAYS = '''<path d="M540 148v-48m-243 137-34-34m-11 212h-48m579-178 34-34m11 212h48" fill="none" stroke="#f5b82e" stroke-width="23" stroke-linecap="round"/>'''

def gear():
    teeth = ''.join(f'<rect x="521" y="322" width="38" height="64" rx="9" transform="rotate({a} 540 432)"/>' for a in range(0,360,45))
    return f'''<g fill="#5b6688">{teeth}<circle cx="540" cy="432" r="83"/></g><circle cx="540" cy="432" r="39" fill="#f5b82e"/><path d="M508 665V548h64v117" fill="none" stroke="#94601c" stroke-width="17" stroke-linejoin="round"/>'''

# Each symbol stays well inside the circular avatar crop.
variants = {
'a': RAYS + '<g filter="url(#shadow)">'+GLASS+FILAMENT+base()+'</g>',
'b': '<g filter="url(#shadow)">'+GLASS+gear()+base()+'</g>',
'c': '''<g filter="url(#shadow)"><path d="M391 437c-27-37-42-74-42-116a191 191 0 1 1 382 0c0 42-15 79-42 116z" fill="#f5b82e"/>
<path d="M540 130a191 191 0 0 1 191 191c0 42-15 79-42 116h-38c26-39 38-76 38-116 0-93-63-166-149-191z" fill="#d99a20"/>
<path d="M394 320c0-70 42-122 99-139" fill="none" stroke="#fff0b8" stroke-width="25" stroke-linecap="round"/>
<path d="M421 437h238" stroke="#94601c" stroke-width="12" stroke-linecap="round"/>
<path d="M508 635v-63l-44-54m108 117v-63l44-54m-152 0 38 20 38-26 38 26 38-20" fill="none" stroke="#c9d1e3" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M540 458v24m0 179v23" stroke="#8f9ab5" stroke-width="8" stroke-linecap="round"/>'''+base(715)+'</g>',
'd': '<g filter="url(#shadow)">'+GLASS+'''<path d="M522 667V525" stroke="#94601c" stroke-width="17" stroke-linecap="round"/>
<path d="M489 370c-25 8-42 32-42 59 0 34 24 63 57 69v58h72v-58c33-6 57-35 57-69 0-27-17-51-42-59v61l-51 29-51-29z" fill="#5b6688"/>
<path d="M514 543h48" stroke="#c9d1e3" stroke-width="11" stroke-linecap="round"/>'''+base()+'</g>'
}

def svg(content, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-labelledby="title"><title id="title">{title}</title>{DEFS}<rect width="1080" height="1080" fill="url(#bg)"/>{content}</svg>'''

for key, content in variants.items():
    (ROOT/f'logo-{key}.svg').write_text(svg(content, f'Objetologia — símbolo {key.upper()}'))
name = '<g transform="translate(108 5) scale(.8)">'+variants['b']+'</g><text x="540" y="865" text-anchor="middle" fill="#e8ecf5" font-family="sans-serif" font-size="66" font-weight="800" letter-spacing=".12em">OBJETOLOGIA</text>'
(ROOT/'logo-b-nome.svg').write_text(svg(name, 'Objetologia — lâmpada com engrenagem e nome'))
for path in sorted(ROOT.glob('logo-*.svg')):
    subprocess.run(['rsvg-convert','-w','1080',str(path),'-o',str(path.with_suffix('.png'))], check=True)

# Comparison: large originals, then actual 110 px circular avatar crops.
from PIL import Image, ImageDraw, ImageFont
sheet = Image.new('RGB', (1440, 660), '#0b112a')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('DejaVuSans.ttf', 20)
labels = ['A · ACESA', 'B · ENGRENAGEM', 'C · VISTA EXPLODIDA', 'D · FERRAMENTA']
for i, key in enumerate(variants):
    source = Image.open(ROOT/f'logo-{key}.png').convert('RGB')
    sheet.paste(source.resize((340,340), Image.Resampling.LANCZOS),(i*360+10,45))
    draw.text((i*360+180,18), labels[i], font=font, fill='#e8ecf5', anchor='mt')
    mask = Image.new('L',(110,110),0)
    ImageDraw.Draw(mask).ellipse((0,0,109,109),fill=255)
    sheet.paste(source.resize((110,110), Image.Resampling.LANCZOS),(i*360+125,455),mask)
    draw.text((i*360+180,588),'110 px · corte circular',font=font,fill='#c9d1e3',anchor='mt')
sheet.save(ROOT/'folha.png')
assert len(list(ROOT.glob('logo-*.svg'))) == 5
for path in ROOT.glob('logo-*.png'):
    assert Image.open(path).size == (1080,1080)
print('5 SVGs, 5 PNGs e folha.png gerados; dimensões verificadas.')
