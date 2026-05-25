#!/usr/bin/env python3
import json
import math
import struct
import sys
import zlib
from collections import deque
from pathlib import Path


def read_png(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")

    pos = 8
    width = height = color_type = bit_depth = None
    idat = bytearray()

    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length

        if ctype == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk)
        elif ctype == b"IDAT":
            idat.extend(chunk)
        elif ctype == b"IEND":
            break

    if bit_depth != 8 or color_type not in (2, 6):
        raise ValueError(f"Unsupported PNG format: bit_depth={bit_depth}, color_type={color_type}")

    channels = 4 if color_type == 6 else 3
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    rows = []
    prev = [0] * stride
    i = 0

    for _ in range(height):
        f = raw[i]
        i += 1
        scan = list(raw[i:i + stride])
        i += stride
        out = [0] * stride

        for x, val in enumerate(scan):
            left = out[x - channels] if x >= channels else 0
            up = prev[x]
            up_left = prev[x - channels] if x >= channels else 0
            if f == 0:
                recon = val
            elif f == 1:
                recon = val + left
            elif f == 2:
                recon = val + up
            elif f == 3:
                recon = val + ((left + up) // 2)
            elif f == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                pred = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
                recon = val + pred
            else:
                raise ValueError(f"Unsupported PNG filter {f}")
            out[x] = recon & 255

        rows.append(out)
        prev = out

    return width, height, channels, rows


def pixel(row, channels, x):
    o = x * channels
    return row[o], row[o + 1], row[o + 2]


def organ_label(stem):
    return {
        "心脏": ("heart", "心脏"),
        "肝脏": ("liver", "肝脏"),
        "肠子": ("intestine", "肠道"),
        "胃": ("stomach", "胃"),
        "肾": ("kidney", "肾脏"),
    }.get(stem, (stem, stem))


def simplify_polygon(points, max_points=24):
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    return [points[int(i * step)] for i in range(max_points)]


def trace_box_polygon(xs, ys, w, h):
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return [
        [round(min_x / w, 4), round(min_y / h, 4)],
        [round(max_x / w, 4), round(min_y / h, 4)],
        [round(max_x / w, 4), round(max_y / h, 4)],
        [round(min_x / w, 4), round(max_y / h, 4)],
    ]


def mask_components(mask, w, h, step=2):
    visited = set()
    comps = []
    for y in range(0, h, step):
        for x in range(0, w, step):
            if not mask[y][x] or (x, y) in visited:
                continue
            q = deque([(x, y)])
            visited.add((x, y))
            xs, ys = [], []
            while q:
                cx, cy = q.popleft()
                xs.append(cx)
                ys.append(cy)
                for nx, ny in ((cx + step, cy), (cx - step, cy), (cx, cy + step), (cx, cy - step)):
                    if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        q.append((nx, ny))
            comps.append((len(xs), xs, ys))
    comps.sort(reverse=True, key=lambda item: item[0])
    return comps


def extract(default_path, organ_path):
    bw, bh, bc, base = read_png(default_path)
    ow, oh, oc, organ = read_png(organ_path)
    if (bw, bh) != (ow, oh):
        raise ValueError(f"Size mismatch: {default_path} vs {organ_path}")

    scores = []
    for y in range(bh):
        br = base[y]
        orow = organ[y]
        for x in range(bw):
            r0, g0, b0 = pixel(br, bc, x)
            r1, g1, b1 = pixel(orow, oc, x)
            l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0
            l1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1
            diff = math.sqrt((r1 - r0) ** 2 + (g1 - g0) ** 2 + (b1 - b0) ** 2)
            cyan_gain = max(0, g1 - g0) + max(0, b1 - b0)
            score = diff + max(0, l1 - l0) * 1.3 + cyan_gain * 0.45
            if score > 35:
                scores.append(score)

    if not scores:
        return None

    scores.sort()
    threshold = max(45, scores[int(len(scores) * 0.72)])
    mask = [[False] * bw for _ in range(bh)]
    all_x, all_y = [], []

    for y in range(bh):
        br = base[y]
        orow = organ[y]
        for x in range(bw):
            r0, g0, b0 = pixel(br, bc, x)
            r1, g1, b1 = pixel(orow, oc, x)
            l0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0
            l1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1
            diff = math.sqrt((r1 - r0) ** 2 + (g1 - g0) ** 2 + (b1 - b0) ** 2)
            cyan_gain = max(0, g1 - g0) + max(0, b1 - b0)
            score = diff + max(0, l1 - l0) * 1.3 + cyan_gain * 0.45
            if score >= threshold:
                mask[y][x] = True
                all_x.append(x)
                all_y.append(y)

    comps = mask_components(mask, bw, bh)
    keep = []
    if comps:
        max_area = comps[0][0]
        min_area = max(120, max_area * 0.12)
        keep = [c for c in comps if c[0] >= min_area][:4]

    xs = []
    ys = []
    component_boxes = []
    for area, cx, cy in keep:
        xs.extend(cx)
        ys.extend(cy)
        min_x, max_x = min(cx), max(cx)
        min_y, max_y = min(cy), max(cy)
        component_boxes.append({
            "center": {"x": round(((min_x + max_x) / 2) / bw, 4), "y": round(((min_y + max_y) / 2) / bh, 4)},
            "radius": {"x": round(((max_x - min_x) / 2) / bw, 4), "y": round(((max_y - min_y) / 2) / bh, 4)},
            "bbox": [round(min_x / bw, 4), round(min_y / bh, 4), round(max_x / bw, 4), round(max_y / bh, 4)],
            "areaSample": area,
        })

    if not xs:
        xs, ys = all_x, all_y

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    code, label = organ_label(organ_path.stem)
    return {
        "organ": code,
        "label": label,
        "source": organ_path.name,
        "imageSize": {"width": bw, "height": bh},
        "center": {"x": round(((min_x + max_x) / 2) / bw, 4), "y": round(((min_y + max_y) / 2) / bh, 4)},
        "radius": {"x": round(((max_x - min_x) / 2) / bw, 4), "y": round(((max_y - min_y) / 2) / bh, 4)},
        "bbox": [round(min_x / bw, 4), round(min_y / bh, 4), round(max_x / bw, 4), round(max_y / bh, 4)],
        "polygon": trace_box_polygon(xs, ys, bw, bh),
        "components": component_boxes,
        "confidence": "auto-diff-high",
        "notes": "Auto-extracted by comparing organ-highlight image with 默认底图.png. Review visually before final production.",
    }


def main():
    folder = Path(sys.argv[1])
    out = Path(sys.argv[2])
    default = folder / "默认底图.png"
    items = []
    for path in sorted(folder.glob("*.png")):
        if path.name == "默认底图.png":
            continue
        item = extract(default, path)
        if item:
            items.append(item)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "version": "organ-hotspots-v1",
        "baseImage": str(default),
        "coordinate": "normalized, origin top-left",
        "organs": items,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
