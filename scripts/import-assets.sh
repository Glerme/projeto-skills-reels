#!/usr/bin/env bash
# Import CC0 low-poly GLBs and register their names.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
python3 - "$ROOT" "$@" <<'PY'
import fcntl, json, os, pathlib, re, shutil, struct, subprocess, sys, tempfile, zipfile
root = pathlib.Path(sys.argv[1])
if len(sys.argv) < 4:
    sys.exit('uso: scripts/import-assets.sh <zip> <prefixo> [modelo ...]')
archive, prefix, *selected = sys.argv[2:]
if not re.fullmatch(r'[A-Za-z0-9_-]+', prefix):
    sys.exit('prefixo inválido')
kit = root / 'kit/kenney'
registry = root / 'kit/models.json'
lock = os.open(root / 'kit', os.O_RDONLY)
fcntl.flock(lock, fcntl.LOCK_EX)
try:
    with tempfile.TemporaryDirectory(prefix='shorts-assets-') as temp:
        temp = pathlib.Path(temp)
        with zipfile.ZipFile(archive) as z:
            for entry in z.infolist():
                if not (temp / entry.filename).resolve().is_relative_to(temp):
                    raise ValueError('caminho fora do zip: ' + entry.filename)
            z.extractall(temp)
        sources = sorted(temp.rglob('*.glb'))
        wanted = {pathlib.Path(n).stem for n in selected}
        if wanted - {p.stem for p in sources}:
            raise ValueError('modelos não encontrados: ' + ', '.join(sorted(wanted - {p.stem for p in sources})))
        sources = [p for p in sources if not wanted or p.stem in wanted]
        if not sources:
            raise ValueError('nenhum .glb encontrado')
        names = [prefix + '-' + p.stem for p in sources]
        if len(set(names)) != len(names):
            raise ValueError('nomes de modelos repetidos no zip')
        stage = temp / 'staged'
        stage.mkdir()
        textures = {}
        for src, name in zip(sources, names):
            if (kit / (name + '.glb')).exists():
                raise ValueError('recusa sobrescrever: ' + name + '.glb')
            data = src.read_bytes()
            size = struct.unpack('<I', data[12:16])[0]
            gltf = json.loads(data[20:20 + size])
            uris = {i['uri'] for i in gltf.get('images', []) if 'uri' in i and not i['uri'].startswith('data:')}
            dst = stage / (name + '.glb')
            shutil.copyfile(src, dst)
            for uri in uris:
                texture = (src.parent / uri).resolve()
                if not texture.is_relative_to(temp) or not texture.is_file():
                    raise ValueError('textura ausente ou fora do pacote: ' + uri)
                renamed = texture.stem + '-' + prefix + texture.suffix
                target = 'Textures/' + renamed
                content = texture.read_bytes()
                if target in textures and textures[target] != content:
                    raise ValueError('texturas diferentes com mesmo nome: ' + target)
                if (kit / target).exists() and (kit / target).read_bytes() != content:
                    raise ValueError('recusa sobrescrever textura: ' + target)
                textures[target] = content
                subprocess.run([sys.executable, str(root / 'scripts/retex_glb.py'), str(dst), str(dst), uri, target], check=True)
        models = json.loads(registry.read_text())
        # Preflight completes before any installed asset changes; exclusive creation prevents clobbering.
        kit.mkdir(parents=True, exist_ok=True)
        created = []
        try:
            for target, content in textures.items():
                dest = kit / target
                dest.parent.mkdir(parents=True, exist_ok=True)
                if not dest.exists():
                    with dest.open('xb') as f:
                        created.append(dest)
                        f.write(content)
            for name in names:
                dest = kit / (name + '.glb')
                with dest.open('xb') as f:
                    created.append(dest)
                    f.write((stage / dest.name).read_bytes())
            updated = list(dict.fromkeys(models + names))
            replacement = registry.with_suffix('.json.tmp')
            replacement.write_text(json.dumps(updated, indent=2) + '\n')
            replacement.replace(registry)
        except BaseException:
            for dest in reversed(created):
                dest.unlink()
            raise
        print('importados: ' + ', '.join(names))
except (ValueError, OSError, zipfile.BadZipFile, subprocess.CalledProcessError) as e:
    sys.exit(str(e))
PY
