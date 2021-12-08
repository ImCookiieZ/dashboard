function decode(message, codeword) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789+-.: "
    var result = ""
  
    if (!message || !codeword) {
      return null;
    }
  
    for (var i = 0; i < message.length; i++) {
      if (alphabet.indexOf(message[i]) === -1) {
        result += message[i];
      } else {
        const cipher = codeword[i % codeword.length];
        const x = alphabet.indexOf(cipher);
        const y = alphabet.indexOf(message[i]);
        result += alphabet[Math.abs(y - x) % alphabet.length];
      }
    }
  
    return result;
  };

  function encode(message, codeword) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789+-.: "
    var result = ""
  
    if (!message || !codeword) {
      return null;
    }
  
    for (var i = 0; i < message.length; i++) {
      if (alphabet.indexOf(message[i]) === -1) {
        result += message[i];
      } else {
        const cipher = codeword[i % codeword.length];
        const x = alphabet.indexOf(cipher);
        const y = alphabet.indexOf(message[i]);
        result += alphabet[(x + y) % alphabet.length];
      }
    }
  
    return result;
  };

  module.exports = {decode, encode}
