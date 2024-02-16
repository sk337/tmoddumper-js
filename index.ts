import { BinaryHandler } from "jsbinary";
import fs from "fs";
import argparse from "argparse";
import crypto from "crypto";
import zlib from "zlib";
import path from "path";
import { uint8ArrayToPng } from "./rawimg"
import { stdout } from 'process'


const parser = new argparse.ArgumentParser({
  description: "Description of your program"
});

parser.add_argument('input', {
  help: "Input File to parse"
});

parser.add_argument('-o', {
  dest: "output",
  help: "Output directory to write",
  default: "out"
})


function MakePath(path: string): void{
  const pieces = path.split("/")
  fs.mkdirSync(pieces.splice(0,pieces.length-1).join("/"), {recursive: true})
}

function StringFromBuffer(buffer: Uint8Array): String {
  return new TextDecoder().decode(buffer);
}
function HexFromBuffer(buffer: Uint8Array): String {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}



const args = parser.parse_args();


fs.mkdirSync(args.output)

const content = fs.readFileSync(args.input);

const handler = new BinaryHandler(content);

function readString(): String {
  const strlen = handler.read7BitEncodedInt();
  return StringFromBuffer(handler.read(strlen));
}

const magic = handler.read(4);

if (StringFromBuffer(magic) != "TMOD") {
  throw Error("MagicBytes not matched")
}

const VersionLen = handler.read7BitEncodedInt();
const version = StringFromBuffer(handler.read(VersionLen))

console.log("Version:", version)

const hash = HexFromBuffer(handler.read(20))

console.log("Hash:", hash)

const sig = handler.read(256)

const fdLength = handler.readUint32();

const cur = handler.tell();

const cont = handler.read(fdLength);

const shasum = crypto.createHash('sha1')
let clacHash = shasum.update(cont).digest('hex')

handler.seek(cur);
if (clacHash != hash) {
  throw Error(`Hash not matched expected "${hash}" got "${clacHash}"`)
}

console.log("Claculated Hash:", clacHash)

const modName = readString();

console.log("Mod Name:", modName)

const modVersion = readString();

console.log("Mod Version:", modVersion)

const filecount = handler.readUint32();

console.log("File Count:", filecount)

const Files = [];

for (let i = 0; i < filecount; i++) {
  let fileName = readString();
  let uncompressLen = handler.readInt32();
  let compressLen = handler.readInt32();
  Files.push({
    fileName: fileName,
    length: {
      uncompressed: uncompressLen,
      compressed: compressLen
    }
  })
}

console.log(handler.tell())
for (let i = 0; i < filecount; i++){
  stdout.write(`\x1B[2K\x1B[0G[${"#".repeat(i/filecount*25)}${"-".repeat(25-(i/filecount*25))}] ${i}/${filecount}`)
  let file= Files[i];
  let cont = new Uint8Array();
  if (file.length.compressed == file.length.uncompressed){
    cont = handler.read(file.length.uncompressed)
  } else{
    cont = new Uint8Array(zlib.inflateRawSync(handler.read(file.length.compressed)))
  };
  if (file.fileName.endsWith(".rawimg")){
    console.log(file.fileName)
    cont = await uint8ArrayToPng(cont);
    file.fileName.replace("rawimg", "png");
    MakePath(path.join(args.output, file.fileName+""))
    fs.writeFileSync(path.join(args.output, file.fileName.replace("rawimg", "png")), cont)
  } else {
    MakePath(path.join(args.output, file.fileName+""))
    fs.writeFileSync(path.join(args.output, file.fileName+""), cont)
  }
}