//  Helper function for validate indian local phone numbers
const validatePhoneNumber = function (phoneNumber) {
  const regExLogic = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;

  return regExLogic.test(phoneNumber);
};

module.exports = validatePhoneNumber;
