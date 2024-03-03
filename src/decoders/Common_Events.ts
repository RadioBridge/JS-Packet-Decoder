import {
  binaryToDecimal,
  hexToBinaryMessageDecoder,
  hexToDecimal,
} from '../lib/HexConvertor';
import { HexDecimal } from '../types';
import { binaryStateDecode } from '../lib/CommonDecodings';

export function supervisory(hexDecimal: [HexDecimal]) {
  // Below array defines what each bit represents in message if it is set to 1
  const supervisoryDecode = {};
  // removing zero byte because this represents sensor message type
  hexDecimal.splice(0, 1);

  if (0 in hexDecimal) {
    const bitsMsgs = [
      'BatteryLow',
      'ErrorWithLastDownlink',
      'TamperState',
      'TamperSinceLastReset',
    ];
    const commonDecoded = hexToBinaryMessageDecoder(
      hexDecimal[0]['hex'],
      bitsMsgs,
      'array',
    );
    if (typeof commonDecoded !== 'string') {
      bitsMsgs.forEach((item) => {
        supervisoryDecode[item] = commonDecoded.indexOf(item) > -1;
      });
    }
  }

  if (1 in hexDecimal) {
    const byteOne = hexDecimal[1];
    const bitMsgs = [
      'X-axis over threshold',
      'Y-axis over threshold',
      'Z-axis over threshold',
      'Settling window time expired',
    ];
    supervisoryDecode['threshold'] = hexToBinaryMessageDecoder(
      byteOne['hex'],
      bitMsgs,
      'string',
    );
  }

  const batteryLevelIndex = 2;
  if (batteryLevelIndex in hexDecimal) {
    supervisoryDecode['battery'] =
      Number(parseInt(hexDecimal[batteryLevelIndex]['hex']) / 10).toFixed(1) +
      'V';
  }

  /*
   * Event accumulation count, Byte 7-8
   */
  if (7 in hexDecimal && 8 in hexDecimal) {
    supervisoryDecode['accumulationCount'] = hexToDecimal(
      hexDecimal[7]['hex'] + hexDecimal[8]['hex'],
    );
  }

  return supervisoryDecode;
}

export function tamperDetect(hexDecimal: [HexDecimal]) {
  const byteZeroHex = hexDecimal[1];
  const dataMessage = {};
  const bitMsgs = {
    0: 'Open',
    nobit: 'Closed',
  };
  dataMessage['event'] = binaryStateDecode(byteZeroHex, bitMsgs);
  return dataMessage;
}

export function reset(hexDecimal: [HexDecimal]) {
  let hardwareVersion, firmwareVersion;
  if (hexDecimal.length >= 5) {
    const hardwareVersionByte = hexDecimal[2];
    const hardwareVersionMajorVer = hardwareVersionByte['hex'][0];
    const hardwareVersionMinorVer = hardwareVersionByte['hex'][1];

    const firmwareByteOne: string = hexDecimal[3]['binary'];
    const firmwareByteTwo: string = hexDecimal[4]['binary'];
    if (firmwareByteOne[0] == 1) {
      const finalString = firmwareByteOne.slice(1) + firmwareByteTwo;
      const decodedVersions = finalString.split(/(.{5})/).filter((O) => O);
      firmwareVersion =
        binaryToDecimal(decodedVersions[0]) +
        '.' +
        binaryToDecimal(decodedVersions[1]) +
        '.' +
        binaryToDecimal(decodedVersions[2]);
    } else {
      firmwareVersion =
        255 == hexDecimal[3]['decimal'] || 0 == hexDecimal[3]['decimal']
          ? '-'
          : hexDecimal[3]['decimal'] + '.' + hexDecimal[4]['decimal'];
    }

    hardwareVersion =
      255 == hardwareVersionByte['decimal'] ||
      0 == hardwareVersionByte['decimal']
        ? '-'
        : hexToDecimal(hardwareVersionMajorVer) +
          '.' +
          hexToDecimal(hardwareVersionMinorVer);
  }
  return {
    hardwareVersion: hardwareVersion,
    firmwareVersion: firmwareVersion,
  };
}
