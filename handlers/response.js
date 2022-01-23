module.exports = new (class {
  _data = {};

  _message = "Ok";

  _statusCode = 200;

  _headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  };

  constructor(code = 200, message = "Ok") {
    this._statusCode = code;
    this._message = message;
  }

  /**
   * Set headers `obj`.
   *
   * @param {Object} obj
   * @return {Object}
   * @public
   */
  header(obj) {
    this._headers = obj;
    return this;
  }

  /**
   * Set status `code`.
   *
   * @param {Number} code
   * @return {Object}
   * @public
   */
  status(code) {
    this._statusCode = code;
    return this;
  }

  /**
   * Set message `msg`.
   *
   * @param {Number} msg
   * @return {Object}
   * @public
   */
  message(msg = "") {
    this._message = msg;
    return this;
  }

  /**
   * Set send `obj`.
   *
   * @param {Number} obj
   * @return {Object}
   * @public
   */
  send(obj = {}) {
    const response = {
      statusCode: 200,
      headers: this._headers,
    };

    let result = obj;
    if (typeof obj !== "object") {
      result = { data: obj };
    }

    if (this._statusCode === 200) {
      result.status = 1;
    } else {
      result.status = 0;
    }

    result.message = this._message;

    response.body = JSON.stringify(result);

    return response;
  }
})();
