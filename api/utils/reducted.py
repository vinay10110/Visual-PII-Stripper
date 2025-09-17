from PIL import Image, ImageDraw, ImageFilter
from io import BytesIO

def blur_entities(images, entities, return_pdf=False):
    """
    Blackout bounding boxes in given images and return either PIL images or PDF.

    Args:
        images (list): List of PIL.Image objects.
        entities (list): List of dicts containing 'page' and 'bbox'.
        return_pdf (bool): If True, return PDF bytes, else list of PIL images.

    Returns:
        list of PIL.Image OR PDF bytes
    """
    blurred_images = []

    for page_num, img in enumerate(images, start=1):
        img_copy = img.copy()
        draw = ImageDraw.Draw(img_copy)
        for ent in entities:
            if ent["page"] == page_num:  # match entity to page
                x1, y1, x2, y2 = ent["bbox"]
                # Draw black rectangle over the detected area
                draw.rectangle([x1, y1, x2, y2], fill="black")
        blurred_images.append(img_copy)

    if return_pdf:
        pdf_bytes = BytesIO()
        blurred_images[0].save(
            pdf_bytes, format="PDF", save_all=True, append_images=blurred_images[1:]
        )
        pdf_bytes.seek(0)
        return pdf_bytes.getvalue()
    else:
        return blurred_images
