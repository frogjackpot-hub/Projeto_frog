const crypto = require('crypto');

class RNGService {
  /**
   * Gera um número aleatório entre min e max (inclusive)
   */
  static randomInt(min, max) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(256, bytesNeeded);
    const threshold = maxValue - (maxValue % range);
    
    let randomBytes;
    let randomValue;
    
    do {
      randomBytes = crypto.randomBytes(bytesNeeded);
      randomValue = 0;
      
      for (let i = 0; i < bytesNeeded; i++) {
        randomValue = (randomValue << 8) + randomBytes[i];
      }
    } while (randomValue >= threshold);
    
    return min + (randomValue % range);
  }

  /**
   * Gera um número decimal aleatório entre 0 e 1
   */
  static randomFloat() {
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    return randomInt / 0xFFFFFFFF;
  }

  /**
   * Simula um jogo de slot machine
   */
  static slotMachine() {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    const reels = [];
    
    for (let i = 0; i < 3; i++) {
      const symbolIndex = this.randomInt(0, symbols.length - 1);
      reels.push(symbols[symbolIndex]);
    }
    
    return {
      reels,
      isWin: this.checkSlotWin(reels),
      multiplier: this.getSlotMultiplier(reels),
    };
  }

  /**
   * Verifica se houve vitória no slot
   */
  static checkSlotWin(reels) {
    // Três símbolos iguais
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      return true;
    }
    
    // Dois símbolos iguais (vitória menor)
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      return true;
    }
    
    return false;
  }

  /**
   * Calcula o multiplicador baseado nos símbolos
   */
  static getSlotMultiplier(reels) {
    const symbolValues = {
      '🍒': 1,
      '🍋': 1.5,
      '🍊': 2,
      '🍇': 2.5,
      '⭐': 5,
      '💎': 10,
      '7️⃣': 20,
    };

    // Três símbolos iguais
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      return symbolValues[reels[0]] * 3;
    }
    
    // Dois símbolos iguais
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      const symbol = reels[0] === reels[1] ? reels[0] : 
                   reels[1] === reels[2] ? reels[1] : reels[0];
      return symbolValues[symbol] * 0.5;
    }
    
    return 0;
  }

  /**
   * Simula um jogo de roleta
   */
  static roulette() {
    const number = this.randomInt(0, 36);
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number);
    const isBlack = number !== 0 && !isRed;
    const isEven = number !== 0 && number % 2 === 0;
    const isOdd = number !== 0 && number % 2 === 1;
    
    return {
      number,
      color: number === 0 ? 'green' : isRed ? 'red' : 'black',
      isRed,
      isBlack,
      isEven,
      isOdd,
      isLow: number >= 1 && number <= 18,
      isHigh: number >= 19 && number <= 36,
    };
  }
}

module.exports = RNGService;