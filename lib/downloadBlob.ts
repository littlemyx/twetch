export default function downloadBlob(
  data: Blob,
  fileName: string,
  mimeType: string
) {
  const blob = new Blob([data], {
    type: mimeType
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function () {
    return window.URL.revokeObjectURL(url);
  }, 1000);
}

function downloadURL(data: string, fileName: string) {
  const a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.setAttribute("style", "display: none");
  a.click();
  a.remove();
}
