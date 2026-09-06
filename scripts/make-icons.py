"""產生擴充功能圖示。

以 8 倍尺寸繪製後降取樣，才能在 16px 這種小尺寸上得到乾淨的邊緣；
直接畫 16x16 會鋸齒嚴重。圖形是「複製」的通用意象：後方一個空心方框（來源），
前方一個實心方框（複製出來的那份），內含兩條代表網址的橫線。
"""
import pathlib
import sys

from PIL import Image, ImageDraw

BLUE = (26, 115, 232, 255)
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 8


def draw_icon(px: int) -> Image.Image:
    n = px * SUPERSAMPLE
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = n / 16.0  # 以 16 格為設計網格，所有座標都用格數表示

    d.rounded_rectangle(
        [u * 1.5, u * 1.5, u * 10.0, u * 10.0],
        radius=u * 1.6, outline=BLUE, width=max(1, int(u * 1.5)),
    )
    d.rounded_rectangle(
        [u * 5.0, u * 5.0, u * 14.5, u * 14.5],
        radius=u * 1.6, fill=BLUE,
    )
    for i, y in enumerate((8.6, 11.0)):
        d.rounded_rectangle(
            [u * 7.2, u * y, u * (12.3 - i * 1.6), u * (y + 1.1)],
            radius=u * 0.55, fill=WHITE,
        )
    return img.resize((px, px), Image.LANCZOS)


def main() -> None:
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "icons")
    out.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = out / f"icon{size}.png"
        draw_icon(size).save(path)
        print(f"{path} {size}x{size}")


if __name__ == "__main__":
    main()
