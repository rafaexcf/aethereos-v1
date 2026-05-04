import type { Transport } from "../transport.js";
import type { FileEntry } from "../types.js";

export class DriveModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  list(path?: string): Promise<FileEntry[]> {
    return this.#t.request<FileEntry[]>(
      "drive.list",
      path !== undefined ? { path } : {},
    );
  }

  /**
   * Baixa o conteudo bruto do arquivo. Em modo bridge, retorna ArrayBuffer
   * (postMessage nao serializa Blob). Em modo direct, retorna Blob nativo.
   * Caller pode normalizar com `new Blob([buf])`.
   */
  async read(fileId: string): Promise<Blob> {
    const out = await this.#t.request<Blob | ArrayBuffer | Uint8Array>(
      "drive.read",
      { fileId },
    );
    if (out instanceof Blob) return out;
    if (out instanceof ArrayBuffer) return new Blob([out]);
    if (out instanceof Uint8Array) {
      // Copy into a fresh ArrayBuffer to satisfy strict BlobPart typing.
      const copy = new ArrayBuffer(out.byteLength);
      new Uint8Array(copy).set(out);
      return new Blob([copy]);
    }
    return new Blob([]);
  }

  write(
    path: string,
    data: Blob | ArrayBuffer | string,
  ): Promise<{ fileId: string }> {
    return this.#t.request<{ fileId: string }>("drive.write", { path, data });
  }

  delete(fileId: string): Promise<void> {
    return this.#t.request<void>("drive.delete", { fileId });
  }
}
