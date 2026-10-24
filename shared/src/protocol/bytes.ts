export class ProtocolError extends Error {
  override name = "ProtocolError";
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export class ByteWriter {
  #view: DataView;
  #offset = 0;

  constructor(capacity: number) {
    this.#view = new DataView(new ArrayBuffer(capacity));
  }

  #reserve(size: number): number {
    const needed = this.#offset + size;
    if (needed > this.#view.byteLength) {
      const grown = new Uint8Array(Math.max(needed, this.#view.byteLength * 2));
      grown.set(new Uint8Array(this.#view.buffer, 0, this.#offset));
      this.#view = new DataView(grown.buffer);
    }
    const offset = this.#offset;
    this.#offset = needed;
    return offset;
  }

  uint8(value: number): this {
    this.#view.setUint8(this.#reserve(1), value);
    return this;
  }

  uint16(value: number): this {
    this.#view.setUint16(this.#reserve(2), value);
    return this;
  }

  uint32(value: number): this {
    this.#view.setUint32(this.#reserve(4), value);
    return this;
  }

  float32(value: number): this {
    this.#view.setFloat32(this.#reserve(4), value);
    return this;
  }

  bytes(value: Uint8Array): this {
    const offset = this.#reserve(value.byteLength);
    new Uint8Array(this.#view.buffer).set(value, offset);
    return this;
  }

  shortString(value: string): this {
    const encoded = encoder.encode(value);
    if (encoded.byteLength > 0xff) {
      throw new ProtocolError("String too long");
    }
    return this.uint8(encoded.byteLength).bytes(encoded);
  }

  longString(value: string): this {
    const encoded = encoder.encode(value);
    return this.uint32(encoded.byteLength).bytes(encoded);
  }

  finish(): ArrayBuffer {
    return this.#view.buffer.slice(0, this.#offset) as ArrayBuffer;
  }
}

export class ByteReader {
  readonly #view: DataView;
  #offset = 0;

  constructor(data: ArrayBuffer | Uint8Array) {
    this.#view =
      data instanceof Uint8Array
        ? new DataView(data.buffer, data.byteOffset, data.byteLength)
        : new DataView(data);
  }

  #take(size: number): number {
    if (this.#offset + size > this.#view.byteLength) {
      throw new ProtocolError("Message truncated");
    }
    const offset = this.#offset;
    this.#offset += size;
    return offset;
  }

  uint8(): number {
    return this.#view.getUint8(this.#take(1));
  }

  uint16(): number {
    return this.#view.getUint16(this.#take(2));
  }

  uint32(): number {
    return this.#view.getUint32(this.#take(4));
  }

  float32(): number {
    return this.#view.getFloat32(this.#take(4));
  }

  #string(length: number): string {
    const offset = this.#take(length);
    try {
      return decoder.decode(
        new Uint8Array(
          this.#view.buffer,
          this.#view.byteOffset + offset,
          length,
        ),
      );
    } catch {
      throw new ProtocolError("Invalid UTF-8 string");
    }
  }

  shortString(): string {
    return this.#string(this.uint8());
  }

  longString(): string {
    return this.#string(this.uint32());
  }

  end(): void {
    if (this.#offset !== this.#view.byteLength) {
      throw new ProtocolError("Unexpected trailing bytes");
    }
  }
}
