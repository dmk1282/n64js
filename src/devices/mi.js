import { Device } from './device.js';
import * as logger from '../logger.js';
import { toString32 } from '../format.js';

// MIPS Interface
export const MI_MODE_REG = 0x00;
export const MI_VERSION_REG = 0x04;
export const MI_INTR_REG = 0x08;
export const MI_INTR_MASK_REG = 0x0C;

export const MI_CLR_INIT = 0x0080;
export const MI_SET_INIT = 0x0100;
export const MI_CLR_EBUS = 0x0200;
export const MI_SET_EBUS = 0x0400;
export const MI_CLR_DP_INTR = 0x0800;
export const MI_CLR_RDRAM = 0x1000;
export const MI_SET_RDRAM = 0x2000;

export const MI_MODE_INIT = 0x0080;
export const MI_MODE_EBUS = 0x0100;
export const MI_MODE_RDRAM = 0x0200;

export const MI_INTR_MASK_CLR_SP = 0x0001;
export const MI_INTR_MASK_SET_SP = 0x0002;
export const MI_INTR_MASK_CLR_SI = 0x0004;
export const MI_INTR_MASK_SET_SI = 0x0008;
export const MI_INTR_MASK_CLR_AI = 0x0010;
export const MI_INTR_MASK_SET_AI = 0x0020;
export const MI_INTR_MASK_CLR_VI = 0x0040;
export const MI_INTR_MASK_SET_VI = 0x0080;
export const MI_INTR_MASK_CLR_PI = 0x0100;
export const MI_INTR_MASK_SET_PI = 0x0200;
export const MI_INTR_MASK_CLR_DP = 0x0400;
export const MI_INTR_MASK_SET_DP = 0x0800;

export const MI_INTR_MASK_SP = 0x01;
export const MI_INTR_MASK_SI = 0x02;
export const MI_INTR_MASK_AI = 0x04;
export const MI_INTR_MASK_VI = 0x08;
export const MI_INTR_MASK_PI = 0x10;
export const MI_INTR_MASK_DP = 0x20;

export const MI_INTR_SP = 0x01;
export const MI_INTR_SI = 0x02;
export const MI_INTR_AI = 0x04;
export const MI_INTR_VI = 0x08;
export const MI_INTR_PI = 0x10;
export const MI_INTR_DP = 0x20;

export class MIRegDevice extends Device {
  constructor(hardware, rangeStart, rangeEnd) {
    super("MIReg", hardware, hardware.mi_reg, rangeStart, rangeEnd);
  }

  reset() {
    this.mem.write32(MI_VERSION_REG, 0x02020102);
  }

  interruptsUnmasked() {
    return (this.mem.readU32(MI_INTR_MASK_REG) & this.mem.readU32(MI_INTR_REG)) !== 0;
  }

  intrReg() {
    return this.mem.readU32(MI_INTR_REG);
  }

  intrMaskReg() {
    return this.mem.readU32(MI_INTR_MASK_REG);
  }

  setInterruptBit(bit) {
    this.mem.setBits32(MI_INTR_REG, bit);
    n64js.cpu0.updateCause3();
  }

  interruptSP() {
    this.setInterruptBit(MI_INTR_SP);
  }

  interruptDP() {
    this.setInterruptBit(MI_INTR_DP);
  }

  write32(address, value) {
    var ea = this.calcEA(address);
    if (ea + 4 > this.u8.length) {
      throw 'Write is out of range';
    }

    switch (ea) {
      case MI_MODE_REG:
        if (!this.quiet) { logger.log('Wrote to MI mode register: ' + toString32(value)); }
        this.writeModeReg(value);
        break;
      case MI_INTR_MASK_REG:
        if (!this.quiet) { logger.log('Wrote to MI interrupt mask register: ' + toString32(value)); }
        this.writeIntrMaskReg(value);
        break;

      case MI_VERSION_REG:
      case MI_INTR_REG:
        // Read only
        break;

      default:
        logger.log('Unhandled write to MIReg: ' + toString32(value) + ' -> [' + toString32(address) + ']');
        this.mem.write32(ea, value);
        break;
    }
  }

  writeModeReg(value) {
    var mi_mode_reg = this.mem.readU32(MI_MODE_REG);

    if (value & MI_SET_RDRAM) { mi_mode_reg |= MI_MODE_RDRAM; }
    if (value & MI_CLR_RDRAM) { mi_mode_reg &= ~MI_MODE_RDRAM; }

    if (value & MI_SET_INIT) { mi_mode_reg |= MI_MODE_INIT; }
    if (value & MI_CLR_INIT) { mi_mode_reg &= ~MI_MODE_INIT; }

    if (value & MI_SET_EBUS) { mi_mode_reg |= MI_MODE_EBUS; }
    if (value & MI_CLR_EBUS) { mi_mode_reg &= ~MI_MODE_EBUS; }

    this.mem.write32(MI_MODE_REG, mi_mode_reg);

    if (value & MI_CLR_DP_INTR) {
      this.mem.clearBits32(MI_INTR_REG, MI_INTR_DP);
      n64js.cpu0.updateCause3();
    }
  }

  writeIntrMaskReg(value) {
    var mi_intr_mask_reg = this.mem.readU32(MI_INTR_MASK_REG);
    var mi_intr_reg = this.mem.readU32(MI_INTR_REG);

    var clr = 0;
    var set = 0;

    // From Corn - nicer way to avoid branching
    clr |= (value & MI_INTR_MASK_CLR_SP) >>> 0;
    clr |= (value & MI_INTR_MASK_CLR_SI) >>> 1;
    clr |= (value & MI_INTR_MASK_CLR_AI) >>> 2;
    clr |= (value & MI_INTR_MASK_CLR_VI) >>> 3;
    clr |= (value & MI_INTR_MASK_CLR_PI) >>> 4;
    clr |= (value & MI_INTR_MASK_CLR_DP) >>> 5;

    set |= (value & MI_INTR_MASK_SET_SP) >>> 1;
    set |= (value & MI_INTR_MASK_SET_SI) >>> 2;
    set |= (value & MI_INTR_MASK_SET_AI) >>> 3;
    set |= (value & MI_INTR_MASK_SET_VI) >>> 4;
    set |= (value & MI_INTR_MASK_SET_PI) >>> 5;
    set |= (value & MI_INTR_MASK_SET_DP) >>> 6;

    mi_intr_mask_reg &= ~clr;
    mi_intr_mask_reg |= set;

    this.mem.write32(MI_INTR_MASK_REG, mi_intr_mask_reg);

    // Check if any interrupts are enabled now, and immediately trigger an interrupt
    if (mi_intr_mask_reg & mi_intr_reg) {
      n64js.cpu0.updateCause3();
    }
  }
}
