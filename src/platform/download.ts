import type { Download } from '../model';

/** Bietet eine Datei als Download an, über einen unsichtbaren Link. */
export const browserDownload: Download = {
  offer(fileName, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    // Erst später freigeben: Manche Browser lesen die Datei erst nach dem Klick.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
