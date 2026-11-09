export async function prepareImage(file: File): Promise<File> {
  if (file.size > 5_000_000) throw new Error(`${file.name} is over 5 MB.`);
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      `${file.name}: use JPEG, PNG or WebP. HEIC/HEIF is not supported.`,
    );
  let source: ImageBitmap | HTMLImageElement;
  let fallbackUrl: string | undefined;
  try {
    try {
      if (typeof createImageBitmap !== "function")
        throw new Error("Bitmap API unavailable");
      source = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      fallbackUrl = URL.createObjectURL(file);
      source = new Image();
      source.src = fallbackUrl;
      await source.decode();
    }
  } catch {
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    throw new Error(`${file.name} could not be opened as an image.`);
  }
  const isBitmap =
    typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
  const width = isBitmap
    ? source.width
    : (source as HTMLImageElement).naturalWidth;
  const height = isBitmap
    ? source.height
    : (source as HTMLImageElement).naturalHeight;
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    if (isBitmap) (source as ImageBitmap).close();
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    throw new Error("Image processing is unavailable on this device.");
  }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (isBitmap) (source as ImageBitmap).close();
  if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.84),
  );
  if (!blob || blob.size > 5_000_000)
    throw new Error(`${file.name} could not be compressed below 5 MB.`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
    type: "image/jpeg",
  });
}

export function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and retry."));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Upload failed. Please retry."));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText).storageId);
      } catch {
        reject(new Error("Upload response was invalid."));
      }
    };
    xhr.send(file);
  });
}
