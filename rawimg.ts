import { BinaryHandler } from "jsbinary";
import { PNG } from 'pngjs';
import * as fs from 'fs';

function uint8ArrayToPng(uint8Array: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {


    const reader = new BinaryHandler(uint8Array);
    reader.seek(0)
    const v = reader.readInt32(false);
    const width = reader.readInt32(false);
    const height = reader.readInt32(false);
    const data = reader.read()
    if (4 * width * height > 4294967295){
      reader.seek(0)
      console.log(4 * width * height, width, height, v)
      // console.log(reader)
      
    }
    const png = new PNG({ width, height });


    let i = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = data[i];        // Red
        png.data[idx + 1] = data[i + 1];    // Green
        png.data[idx + 2] = data[i + 2];    // Blue
        png.data[idx + 3] = data[i + 3];    // Alpha
        i += 4;
      }
    }

    const chunks: Uint8Array[] = [];
    png.pack().on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    }).on('end', () => {
      const result = Buffer.concat(chunks);
      resolve(result);
    }).on('error', (err: Error) => {
      reject(err);
    });
  });
}

export { uint8ArrayToPng };